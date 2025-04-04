import os
import cv2
import numpy as np
import logging
import threading
from queue import Queue
import concurrent.futures

class YOLODetector:
    def __init__(self, 
                 cfg="src/models/pretrained/yolov4.cfg",
                 weights="src/models/pretrained/yolov4.weights",
                 names="src/models/pretrained/coco.names",
                 input_size=608,
                 conf_threshold=0.5,
                 nms_threshold=0.4,
                 use_gpu=True,
                 num_threads=4):
        """Initialize YOLO Detector with extensive path and dependency validation"""
        
        # Configure logging
        logging.basicConfig(level=logging.INFO, 
                            format='%(asctime)s - %(levelname)s: %(message)s')
        
        # Validate file paths
        self._validate_files(cfg, weights, names)
        
        # Store threading parameters
        self.num_threads = num_threads
        self.use_gpu = use_gpu
        self.gpu_available = False
        
        try:
            # Verify OpenCV DNN module availability
            if not hasattr(cv2, 'dnn'):
                raise ImportError("OpenCV DNN module is not available")
            
            # Load network
            self.net = cv2.dnn.readNetFromDarknet(cfg, weights)
            
            # Configure network backend based on GPU availability
            if use_gpu:
                # Check if CUDA is actually available in this OpenCV build
                cv_build_info = cv2.getBuildInformation()
                if "CUDA" in cv_build_info and "Version" in cv_build_info:
                    try:
                        # Try to use CUDA backend but be prepared to catch failures
                        self.net.setPreferableBackend(cv2.dnn.DNN_BACKEND_CUDA)
                        self.net.setPreferableTarget(cv2.dnn.DNN_TARGET_CUDA)
                        
                        # Test if CUDA is actually working
                        dummy_input = np.zeros((1, 3, input_size, input_size), dtype=np.float32)
                        self.net.setInput(dummy_input)
                        self.net.forward(self.net.getUnconnectedOutLayersNames())
                        
                        self.gpu_available = True
                        logging.info("Successfully initialized CUDA backend for NVIDIA GPU")
                    except Exception as e:
                        logging.warning(f"Failed to use CUDA backend: {e}")
                        self.net.setPreferableBackend(cv2.dnn.DNN_BACKEND_OPENCV)
                        self.net.setPreferableTarget(cv2.dnn.DNN_TARGET_CPU)
                        logging.info("Falling back to CPU backend")
                else:
                    logging.warning("OpenCV built without CUDA support, using CPU")
                    self.net.setPreferableBackend(cv2.dnn.DNN_BACKEND_OPENCV)
                    self.net.setPreferableTarget(cv2.dnn.DNN_TARGET_CPU)
            else:
                self.net.setPreferableBackend(cv2.dnn.DNN_BACKEND_OPENCV)
                self.net.setPreferableTarget(cv2.dnn.DNN_TARGET_CPU)
                logging.info("Using CPU backend as requested")
            
            # Load class names
            with open(names, 'r') as f:
                self.classes = [line.strip() for line in f.readlines()]
            
            # Set detection parameters
            self.input_size = input_size
            self.conf_threshold = conf_threshold
            self.nms_threshold = nms_threshold
            
            # Get output layer names
            layer_names = self.net.getLayerNames()
            self.output_layers = [layer_names[i - 1] for i in self.net.getUnconnectedOutLayers()]
            
            backend_type = "GPU (CUDA)" if self.gpu_available else "CPU"
            logging.info(f"YOLO Detector initialized successfully with {num_threads} threads using {backend_type} backend")
        
        except Exception as e:
            logging.error(f"YOLO Detector Initialization Failed: {e}")
            self._diagnostic_checks(cfg, weights, names)
            raise

    def _validate_files(self, cfg, weights, names):
        """Validate existence and readability of configuration files"""
        files = {
            "Configuration File": cfg,
            "Weights File": weights,
            "Names File": names
        }
        
        for file_type, filepath in files.items():
            if not os.path.exists(filepath):
                raise FileNotFoundError(f"{file_type} not found: {filepath}")
            
            if not os.access(filepath, os.R_OK):
                raise PermissionError(f"Cannot read {file_type}: {filepath}")
            
            if os.path.getsize(filepath) == 0:
                raise ValueError(f"{file_type} is empty: {filepath}")

    def _diagnostic_checks(self, cfg, weights, names):
        """Provide detailed diagnostic information"""
        print("\n--- YOLO DETECTOR DIAGNOSTIC INFORMATION ---")
        files = [cfg, weights, names]
        
        for filepath in files:
            print(f"\nFile: {filepath}")
            if not os.path.exists(filepath):
                print(f" File does not exist")
            else:
                print(f"File exists")
                print(f"Size: {os.path.getsize(filepath)} bytes")
                print(f"Readable: {os.access(filepath, os.R_OK)}")

        # Check OpenCV version and DNN support
        print(f"\nOpenCV Version: {cv2.__version__}")
        print(f"DNN Module Available: {hasattr(cv2, 'dnn')}")
        
        # Check GPU availability in more detail
        try:
            cv_build_info = cv2.getBuildInformation()
            print("\nOpenCV Build Information (CUDA-related):")
            
            for line in cv_build_info.split('\n'):
                if any(keyword in line for keyword in ['CUDA', 'GPU', 'nvidia', 'NVIDIA']):
                    print(f"  {line.strip()}")
            
            if "CUDA" in cv_build_info:
                print("CUDA mentioned in OpenCV build")
            else:
                print(" CUDA not mentioned in OpenCV build")
                
            # Try to determine if OpenCV can actually use CUDA
            try:
                net = cv2.dnn.Net()
                net.setPreferableBackend(cv2.dnn.DNN_BACKEND_CUDA)
                print("OpenCV accepted CUDA backend setting")
            except:
                print(" OpenCV rejected CUDA backend setting")
                
        except Exception as e:
            print(f" Couldn't determine CUDA support: {e}")
            
        # Print information about available GPUs
        try:
            import subprocess
            try:
                nvidia_output = subprocess.check_output(['nvidia-smi'], stderr=subprocess.STDOUT).decode('utf-8')
                print("\nNVIDIA GPU Information:")
                print(nvidia_output)
            except:
                print("\n nvidia-smi command failed. NVIDIA drivers may not be installed or GPU not detected.")
        except:
            print("\n Could not check GPU status")

    def detect(self, images):
        """
        Detect objects in images
        
        Args:
            images (list or np.ndarray): Input images for detection
        
        Returns:
            list: Detected objects with class, confidence, and bounding box
        """
        if not isinstance(images, list):
            images = [images]
        
        if len(images) == 1:
            # For single image, just process directly
            return self._process_single_image(images[0])
        else:
            # For multiple images, use multi-threading
            return self._process_multi_images(images)
    
    def _process_single_image(self, image):
        """Process a single image for detection"""
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
            self.net.setInput(blob)
            
            detections = self.net.forward(self.output_layers)
            
            # Process detections
            return self._process_detections(detections, image.shape)
        
        except Exception as e:
            logging.error(f"Detection failed for image: {e}")
            return []
    
    def _process_image_worker(self, image, result_queue, image_index):
        """Worker function for processing images in threads"""
        try:
            results = self._process_single_image(image)
            result_queue.put((image_index, results))
        except Exception as e:
            logging.error(f"Thread processing error: {e}")
            result_queue.put((image_index, []))
    
    def _process_multi_images(self, images):
        """Process multiple images using thread pool"""
        all_detections = [[] for _ in range(len(images))]
        
        # Use ThreadPoolExecutor for better thread management
        with concurrent.futures.ThreadPoolExecutor(max_workers=self.num_threads) as executor:
            future_to_index = {
                executor.submit(self._process_single_image, img): idx 
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

    def _process_detections(self, detections, image_shape):
        """
        Process raw network detections
        
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
            indices = cv2.dnn.NMSBoxes(
                [det['box'] for det in results], 
                [det['confidence'] for det in results], 
                self.conf_threshold, 
                self.nms_threshold
            )
            
            return [results[i] for i in indices]
        
        return []

    def process_video(self, video_path, output_path=None, display=False):
        """
        Process a video file with multi-threading
        
        Args:
            video_path (str): Path to input video
            output_path (str, optional): Path to save processed video
            display (bool): Whether to display video during processing
        
        Returns:
            bool: Success status
        """
        try:
            cap = cv2.VideoCapture(video_path)
            if not cap.isOpened():
                logging.error(f"Cannot open video: {video_path}")
                return False
                
            # Get video properties
            width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
            height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
            fps = cap.get(cv2.CAP_PROP_FPS)
            total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
            
            # Create video writer if output path is provided
            writer = None
            if output_path:
                fourcc = cv2.VideoWriter_fourcc(*'mp4v')
                writer = cv2.VideoWriter(output_path, fourcc, fps, (width, height))
            
            # Create frame buffer and result buffer
            frame_buffer = []
            result_buffer = {}
            frames_processed = 0
            
            logging.info(f"Starting video processing: {video_path}")
            
            while True:
                # Read frames until buffer is filled or video ends
                while len(frame_buffer) < self.num_threads * 3:  # Triple buffer size for smooth processing
                    ret, frame = cap.read()
                    if not ret:
                        break
                    frame_buffer.append((frames_processed, frame))
                    frames_processed += 1
                
                if not frame_buffer:
                    break  # No more frames to process
                
                # Process batch of frames
                batch_frames = [frame for _, frame in frame_buffer]
                batch_indices = [idx for idx, _ in frame_buffer]
                batch_results = self.detect(batch_frames)
                
                # Store results
                for idx, result in zip(batch_indices, batch_results):
                    result_buffer[idx] = result
                
                # Draw and write frames in order
                next_frame_idx = frames_processed - len(frame_buffer)
                while next_frame_idx in result_buffer:
                    idx, frame = frame_buffer.pop(0)
                    detections = result_buffer.pop(next_frame_idx)
                    
                    # Draw detections
                    for det in detections:
                        x, y, w, h = det['box']
                        label = f"{det['class']}: {det['confidence']:.2f}"
                        
                        # Draw rectangle and label
                        cv2.rectangle(frame, (x, y), (x + w, y + h), (0, 255, 0), 2)
                        cv2.putText(frame, label, (x, y - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 0), 2)
                    
                    if writer:
                        writer.write(frame)
                    
                    if display:
                        cv2.imshow('YOLO Detection', frame)
                        if cv2.waitKey(1) & 0xFF == ord('q'):
                            return False
                    
                    next_frame_idx += 1
                
                # Progress update
                if frames_processed % 30 == 0:
                    progress = (frames_processed / total_frames) * 100 if total_frames > 0 else 0
                    logging.info(f"Processing progress: {progress:.1f}% ({frames_processed}/{total_frames})")
            
            # Clean up
            if writer:
                writer.release()
            cap.release()
            cv2.destroyAllWindows()
            
            logging.info(f"Video processing completed: {frames_processed} frames processed")
            return True
            
        except Exception as e:
            logging.error(f"Video processing failed: {e}")
            return False

    def __str__(self):
        """Provide a string representation of the detector"""
        backend = "GPU (CUDA)" if self.gpu_available else "CPU"
        return f"YOLO Detector (Classes: {len(self.classes)}, Conf: {self.conf_threshold}, Backend: {backend}, Threads: {self.num_threads})"