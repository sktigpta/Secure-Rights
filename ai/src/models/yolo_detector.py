import os
import cv2
import numpy as np
import logging
import torch
from tqdm import tqdm
import concurrent.futures

class YOLODetector:
    def __init__(self,
                 model_path=None,
                 legacy_cfg="src/models/pretrained/yolov4.cfg",
                 legacy_weights="src/models/pretrained/yolov4.weights",
                 legacy_names="src/models/pretrained/coco.names",
                 input_size=640,
                 conf_threshold=0.5,
                 iou_threshold=0.4,
                 use_gpu=True,
                 num_threads=4):
        """
        Initialize YOLO Detector with OpenCV fallback for YOLOv4
        
        Args:
            model_path (str): Path to PyTorch YOLO model (can be None)
            legacy_cfg (str): Path to YOLOv4 config
            legacy_weights (str): Path to YOLOv4 weights
            legacy_names (str): Path to class names file
            input_size (int): Input size for the model
            conf_threshold (float): Confidence threshold for detections
            iou_threshold (float): IoU threshold for NMS
            use_gpu (bool): Whether to use GPU acceleration
            num_threads (int): Number of threads for parallel processing
        """
        # Configure logging
        logging.basicConfig(level=logging.INFO, 
                          format='%(asctime)s - %(levelname)s: %(message)s')
        
        # Store configuration parameters
        self.input_size = input_size
        self.conf_threshold = conf_threshold
        self.iou_threshold = iou_threshold
        self.use_gpu = use_gpu
        self.num_threads = num_threads
        self.model_path = model_path
        self.legacy_cfg = legacy_cfg
        self.legacy_weights = legacy_weights
        self.legacy_names = legacy_names
        
        # Initialize state variables
        self.model = None
        self.legacy_model = None
        self.classes = []
        self.device = 'cpu'
        self.gpu_available = False
        self.using_ultralytics = False  # We'll start with OpenCV implementation
        
        try:
            # Skip ultralytics init if model_path is None
            if self.model_path and os.path.exists(self.model_path):
                self._init_ultralytics_model()
            else:
                # Initialize OpenCV YOLO directly
                logging.info("Initializing OpenCV YOLO implementation...")
                self._init_opencv_yolo()
        except Exception as e:
            logging.error(f"YOLO initialization failed: {e}")
            self._diagnostic_checks()
            raise

    def _init_ultralytics_model(self):
        """Initialize using ultralytics YOLO implementation"""
        try:
            from ultralytics import YOLO
            
            # Device configuration
            self.device = self._select_device()
            self.gpu_available = self.device == 'cuda'
            
            # Validate model file
            if not os.path.exists(self.model_path):
                raise FileNotFoundError(f"Model not found: {self.model_path}")
            
            # Load YOLO model
            self.model = YOLO(self.model_path)
            if self.gpu_available:
                self.model.to(self.device)
                self.model.fuse()  # Fuse layers for optimized inference
            
            # Store class names for compatibility with both implementations
            self.classes = list(self.model.names.values())
            
            logging.info(f"Ultralytics YOLO initialized on {self.device.upper()}")
            logging.info(f"Model architecture: {self.model.task}")
            logging.info(f"Available classes: {len(self.classes)}")
            self.using_ultralytics = True
        except Exception as e:
            logging.error(f"Ultralytics initialization failed: {e}")
            raise

    def _init_opencv_yolo(self):
        """Initialize OpenCV YOLO implementation"""
        # Validate file paths
        self._validate_files(self.legacy_cfg, self.legacy_weights, self.legacy_names)
        
        # Load network
        self.legacy_model = cv2.dnn.readNetFromDarknet(self.legacy_cfg, self.legacy_weights)
        
        # Configure network backend based on GPU availability
        if self.use_gpu:
            # Check if CUDA is actually available in this OpenCV build
            cv_build_info = cv2.getBuildInformation()
            if "CUDA" in cv_build_info and "Version" in cv_build_info:
                try:
                    # Try to use CUDA backend but be prepared to catch failures
                    self.legacy_model.setPreferableBackend(cv2.dnn.DNN_BACKEND_CUDA)
                    self.legacy_model.setPreferableTarget(cv2.dnn.DNN_TARGET_CUDA)
                    
                    # Test if CUDA is actually working
                    dummy_input = np.zeros((1, 3, self.input_size, self.input_size), dtype=np.float32)
                    self.legacy_model.setInput(dummy_input)
                    self.legacy_model.forward(self.legacy_model.getUnconnectedOutLayersNames())
                    
                    self.gpu_available = True
                    logging.info("Successfully initialized CUDA backend for NVIDIA GPU")
                except Exception as e:
                    logging.warning(f"Failed to use CUDA backend: {e}")
                    self.legacy_model.setPreferableBackend(cv2.dnn.DNN_BACKEND_OPENCV)
                    self.legacy_model.setPreferableTarget(cv2.dnn.DNN_TARGET_CPU)
                    logging.info("Falling back to CPU backend")
            else:
                logging.warning("OpenCV built without CUDA support, using CPU")
                self.legacy_model.setPreferableBackend(cv2.dnn.DNN_BACKEND_OPENCV)
                self.legacy_model.setPreferableTarget(cv2.dnn.DNN_TARGET_CPU)
        else:
            self.legacy_model.setPreferableBackend(cv2.dnn.DNN_BACKEND_OPENCV)
            self.legacy_model.setPreferableTarget(cv2.dnn.DNN_TARGET_CPU)
            logging.info("Using CPU backend as requested")
        
        # Load class names
        with open(self.legacy_names, 'r') as f:
            self.classes = [line.strip() for line in f.readlines()]
        
        # Get output layer names
        layer_names = self.legacy_model.getLayerNames()
        self.output_layers = [layer_names[i - 1] for i in self.legacy_model.getUnconnectedOutLayers()]
        
        backend_type = "GPU (CUDA)" if self.gpu_available else "CPU"
        logging.info(f"OpenCV YOLO Detector initialized with {self.num_threads} threads using {backend_type} backend")
        self.using_ultralytics = False

    def _select_device(self):
        """Select appropriate computation device for ultralytics implementation"""
        if self.use_gpu and torch.cuda.is_available():
            torch.backends.cudnn.benchmark = True
            logging.info(f"CUDA GPU detected: {torch.cuda.get_device_name(0)}")
            return 'cuda'
        logging.warning("Using CPU for inference - GPU not available or not requested")
        return 'cpu'

    def _validate_files(self, cfg, weights, names):
        """Validate existence and readability of configuration files"""
        files = {
            "Configuration File": cfg,
            "Weights File": weights,
            "Names File": names
        }
        
        for file_type, filepath in files.items():
            if filepath is None:
                continue
                
            if not os.path.exists(filepath):
                raise FileNotFoundError(f"{file_type} not found: {filepath}")
            
            if not os.access(filepath, os.R_OK):
                raise PermissionError(f"Cannot read {file_type}: {filepath}")
            
            if os.path.getsize(filepath) == 0:
                raise ValueError(f"{file_type} is empty: {filepath}")

    def _diagnostic_checks(self):
        """Provide diagnostic information"""
        print("\n--- DIAGNOSTIC INFORMATION ---")
        
        # PyTorch diagnostics
        print(f"PyTorch version: {torch.__version__}")
        print(f"CUDA available: {torch.cuda.is_available()}")
        
        if torch.cuda.is_available():
            print(f"CUDA device count: {torch.cuda.device_count()}")
            print(f"Current CUDA device: {torch.cuda.current_device()}")
            print(f"Device name: {torch.cuda.get_device_name(0)}")
            print(f"CUDA version: {torch.version.cuda}")
        
        # OpenCV diagnostics
        print(f"\nOpenCV Version: {cv2.__version__}")
        print(f"DNN Module Available: {hasattr(cv2, 'dnn')}")
        
        try:
            cv_build_info = cv2.getBuildInformation()
            print("\nOpenCV Build Information (CUDA-related):")
            
            for line in cv_build_info.split('\n'):
                if any(keyword in line for keyword in ['CUDA', 'GPU', 'nvidia', 'NVIDIA']):
                    print(f"  {line.strip()}")
        except:
            print("Could not get OpenCV build information")
            
        # Check model files
        files_to_check = [self.model_path] if self.model_path else []
        if self.legacy_cfg:
            files_to_check.append(self.legacy_cfg)
        if self.legacy_weights:
            files_to_check.append(self.legacy_weights)
        if self.legacy_names:
            files_to_check.append(self.legacy_names)
            
        print("\nFile diagnostics:")
        for filepath in files_to_check:
            if filepath is None:
                continue
                
            print(f"\nFile: {filepath}")
            if not os.path.exists(filepath):
                print(" File does not exist")
            else:
                print(" File exists")
                print(f" Size: {os.path.getsize(filepath)} bytes")
                print(f" Readable: {os.access(filepath, os.R_OK)}")

    def detect(self, images):
        """
        Detect objects in images
        
        Args:
            images (list/np.ndarray): Input images in BGR format (OpenCV default)
        
        Returns:
            list: List of detections for each image
        """
        if not isinstance(images, list):
            images = [images]
            
        # Always use OpenCV implementation since we're skipping ultralytics
        return self._detect_opencv(images)

    def _detect_ultralytics(self, images):
        """Detect objects using ultralytics implementation"""
        # This function is kept for compatibility
        raise NotImplementedError("Ultralytics implementation not initialized")

    def _detect_opencv(self, images):
        """Detect objects using OpenCV DNN implementation"""
        if len(images) == 1:
            # For single image, just process directly
            return [self._process_single_image_opencv(images[0])]
        else:
            # For multiple images, use multi-threading
            return self._process_multi_images_opencv(images)
    
    def _process_single_image_opencv(self, image):
        """Process a single image for detection using OpenCV DNN"""
        try:
            # Preprocess image
            blob = cv2.dnn.blobFromImage(
                image, 
                1/255.0, 
                (self.input_size, self.input_size), 
                swapRB=True, 
                crop=False
            )
            
            # Set input and perform detection
            self.legacy_model.setInput(blob)
            detections = self.legacy_model.forward(self.output_layers)
            
            # Process detections
            return self._process_opencv_detections(detections, image.shape)
        
        except Exception as e:
            logging.error(f"OpenCV detection failed for image: {e}")
            return []
    
    def _process_multi_images_opencv(self, images):
        """Process multiple images using thread pool with OpenCV DNN"""
        all_detections = [[] for _ in range(len(images))]
        
        # Use ThreadPoolExecutor for better thread management
        with concurrent.futures.ThreadPoolExecutor(max_workers=self.num_threads) as executor:
            future_to_index = {
                executor.submit(self._process_single_image_opencv, img): idx 
                for idx, img in enumerate(images)
            }
            
            for future in concurrent.futures.as_completed(future_to_index):
                idx = future_to_index[future]
                try:
                    result = future.result()
                    all_detections[idx] = result
                except Exception as e:
                    logging.error(f"Image processing failed: {e}")
        
        return all_detections

    def _process_opencv_detections(self, detections, image_shape):
        """
        Process raw OpenCV DNN detections
        
        Args:
            detections (list): Raw network detections
            image_shape (tuple): Original image shape
        
        Returns:
            list: Processed detections with filtering
        """
        height, width = image_shape[:2]
        results = []

        for detection in detections:
            for obj in detection:
                scores = obj[5:]
                class_id = np.argmax(scores)
                confidence = scores[class_id]
                
                if confidence > self.conf_threshold:
                    center_x = int(obj[0] * width)
                    center_y = int(obj[1] * height)
                    w = int(obj[2] * width)
                    h = int(obj[3] * height)
                    
                    x = int(center_x - w / 2)
                    y = int(center_y - h / 2)
                    
                    results.append({
                        'class': self.classes[class_id],
                        'confidence': float(confidence),
                        'box': [x, y, w, h]
                    })
        
        # Non-maximum suppression
        if results:
            boxes = [det['box'] for det in results]
            confidences = [det['confidence'] for det in results]
            
            indices = cv2.dnn.NMSBoxes(
                boxes, 
                confidences, 
                self.conf_threshold, 
                self.iou_threshold
            )
            
            # Handle OpenCV 4.x vs 3.x differences in NMSBoxes return format
            if len(indices) > 0 and isinstance(indices, tuple):
                indices = indices[0]
            elif len(indices) > 0 and isinstance(indices, np.ndarray):
                indices = indices.flatten()
                
            return [results[i] for i in indices]
        
        return []

    def process_video(self, video_path, output_path=None, display=False):
        """
        Process video with GPU acceleration and batch processing
        
        Args:
            video_path (str): Path to input video
            output_path (str): Optional output path
            display (bool): Show real-time preview
            
        Returns:
            bool: Processing success status
        """
        try:
            cap = cv2.VideoCapture(video_path)
            if not cap.isOpened():
                raise ValueError(f"Could not open video: {video_path}")

            # Get video properties
            width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
            height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
            fps = cap.get(cv2.CAP_PROP_FPS)
            total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))

            # Video writer setup
            writer = None
            if output_path:
                fourcc = cv2.VideoWriter_fourcc(*'mp4v')
                writer = cv2.VideoWriter(output_path, fourcc, fps, (width, height))

            # Batch processing parameters - larger batch for GPU, smaller for CPU
            batch_size = 16 if self.gpu_available else 4
            frame_batch = []
            
            with tqdm(total=total_frames, desc="Processing Video") as pbar:
                while True:
                    ret, frame = cap.read()
                    if not ret:
                        break

                    frame_batch.append(frame)
                    if len(frame_batch) >= batch_size:
                        self._process_frame_batch(frame_batch, writer, display)
                        pbar.update(len(frame_batch))
                        frame_batch = []

                # Process remaining frames
                if frame_batch:
                    self._process_frame_batch(frame_batch, writer, display)
                    pbar.update(len(frame_batch))

            cap.release()
            if writer:
                writer.release()
            if display:
                cv2.destroyAllWindows()
                
            logging.info(f"Video processing completed successfully")
            return True

        except Exception as e:
            logging.error(f"Video processing failed: {e}")
            return False

    def _process_frame_batch(self, frames, writer, display):
        """Process batch of video frames"""
        detections = self.detect(frames)
        for frame, frame_detections in zip(frames, detections):
            self._draw_detections(frame, frame_detections)
            if writer:
                writer.write(frame)
            if display:
                cv2.imshow('YOLO Detection', frame)
                cv2.waitKey(1)

    def _draw_detections(self, frame, detections):
        """Draw detections on frame"""
        for det in detections:
            x, y, w, h = det['box']
            label = f"{det['class']} {det['confidence']:.2f}"
            
            # Draw rectangle (using x,y,w,h format)
            cv2.rectangle(frame, (x, y), (x + w, y + h), (0, 255, 0), 2)
            
            # Add label text
            cv2.putText(frame, label, (x, y-10), 
                       cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 0), 2)

    def __str__(self):
        """String representation with implementation info"""
        impl = "Ultralytics" if self.using_ultralytics else "OpenCV DNN"
        device = self.device.upper() if self.using_ultralytics else ("GPU (CUDA)" if self.gpu_available else "CPU")
        
        return (f"YOLO Detector (Implementation: {impl}, Device: {device}, "
                f"Classes: {len(self.classes)}, Conf: {self.conf_threshold}, "
                f"IoU: {self.iou_threshold}, Threads: {self.num_threads})")