import os
import cv2
import numpy as np
import logging
import torch
import gc
from tqdm.auto import tqdm

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
        Initialize YOLO Detector with improved GPU handling
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
        self.using_ultralytics = False
        
        # Run comprehensive GPU diagnostics first
        self._run_gpu_diagnostics()
        
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

    def _run_gpu_diagnostics(self):
        """Comprehensive GPU diagnostics to identify issues"""
        print("\n" + "="*50)
        print("GPU DIAGNOSTICS")
        print("="*50)
        
        # 1. Check PyTorch CUDA availability
        print(f"PyTorch version: {torch.__version__}")
        print(f"CUDA available in PyTorch: {torch.cuda.is_available()}")
        
        if torch.cuda.is_available():
            print(f"CUDA device count: {torch.cuda.device_count()}")
            print(f"Current CUDA device: {torch.cuda.current_device()}")
            print(f"Device name: {torch.cuda.get_device_name(0)}")
            print(f"CUDA version: {torch.version.cuda}")
            print(f"cuDNN version: {torch.backends.cudnn.version()}")
            
            # Test GPU memory
            try:
                device = torch.device('cuda')
                test_tensor = torch.randn(100, 100).to(device)
                print(f"GPU memory test: PASSED")
                print(f"GPU memory allocated: {torch.cuda.memory_allocated()/1024**2:.1f} MB")
                print(f"GPU memory cached: {torch.cuda.memory_reserved()/1024**2:.1f} MB")
                del test_tensor
                torch.cuda.empty_cache()
            except Exception as e:
                print(f"GPU memory test: FAILED - {e}")
        else:
            print("CUDA not available in PyTorch")
            # Check possible reasons
            try:
                import subprocess
                result = subprocess.run(['nvidia-smi'], capture_output=True, text=True)
                if result.returncode == 0:
                    print("nvidia-smi works - GPU driver is installed")
                    print("Issue might be PyTorch installation (CPU-only version)")
                else:
                    print("nvidia-smi failed - GPU driver issue")
            except:
                print("nvidia-smi not found - NVIDIA driver not installed")
        
        # 2. Check OpenCV DNN CUDA support
        print(f"\nOpenCV version: {cv2.__version__}")
        print(f"OpenCV DNN module available: {hasattr(cv2, 'dnn')}")
        
        # Check OpenCV build info for CUDA
        try:
            build_info = cv2.getBuildInformation()
            cuda_lines = []
            for line in build_info.split('\n'):
                if any(keyword.upper() in line.upper() for keyword in ['cuda', 'gpu', 'nvidia']):
                    cuda_lines.append(line.strip())
            
            if cuda_lines:
                print("OpenCV CUDA-related build info:")
                for line in cuda_lines:
                    print(f"  {line}")
            else:
                print("OpenCV built WITHOUT CUDA support")
                
        except Exception as e:
            print(f"Could not get OpenCV build info: {e}")
        
        # 3. Test OpenCV DNN CUDA backend
        if hasattr(cv2, 'dnn'):
            try:
                # Create a simple test network
                net = cv2.dnn.readNetFromDarknet(
                    self.legacy_cfg if os.path.exists(self.legacy_cfg or "") else None,
                    self.legacy_weights if os.path.exists(self.legacy_weights or "") else None
                ) if all(os.path.exists(f or "") for f in [self.legacy_cfg, self.legacy_weights]) else None
                
                if net is not None:
                    # Try to set CUDA backend
                    net.setPreferableBackend(cv2.dnn.DNN_BACKEND_CUDA)
                    net.setPreferableTarget(cv2.dnn.DNN_TARGET_CUDA)
                    
                    # Test with dummy input
                    dummy_input = np.random.randn(1, 3, 416, 416).astype(np.float32)
                    net.setInput(cv2.dnn.blobFromImage(dummy_input))
                    output = net.forward()
                    print("OpenCV DNN CUDA test: PASSED")
                else:
                    print("OpenCV DNN CUDA test: SKIPPED (no model files)")
                    
            except Exception as e:
                print(f"OpenCV DNN CUDA test: FAILED - {e}")
                print("This usually means OpenCV was built without CUDA support")
        
        print("="*50)

    def _init_ultralytics_model(self):
        """Initialize using ultralytics YOLO implementation with better error handling"""
        try:
            from ultralytics import YOLO
            
            # Device configuration with fallback
            self.device = self._select_device()
            self.gpu_available = self.device == 'cuda'
            
            # Validate model file
            if not os.path.exists(self.model_path):
                raise FileNotFoundError(f"Model not found: {self.model_path}")
            
            # Load YOLO model
            logging.info(f"Loading model from: {self.model_path}")
            self.model = YOLO(self.model_path)
            
            if self.gpu_available:
                try:
                    self.model.to(self.device)
                    # Test GPU functionality
                    dummy_image = np.random.randint(0, 255, (640, 640, 3), dtype=np.uint8)
                    _ = self.model(dummy_image, verbose=False)
                    logging.info("GPU test successful")
                    
                    # Fuse layers for optimized inference
                    self.model.fuse()
                except Exception as gpu_error:
                    logging.error(f"GPU initialization failed: {gpu_error}")
                    self.device = 'cpu'
                    self.gpu_available = False
                    self.model.to('cpu')
            
            # Store class names
            self.classes = list(self.model.names.values())
            
            device_info = "GPU (CUDA)" if self.gpu_available else "CPU"
            logging.info(f"Ultralytics YOLO initialized on {device_info}")
            logging.info(f"Model task: {self.model.task}")
            logging.info(f"Available classes: {len(self.classes)}")
            self.using_ultralytics = True
            
        except ImportError as e:
            logging.error(f"Ultralytics not installed: {e}")
            raise
        except Exception as e:
            logging.error(f"Ultralytics initialization failed: {e}")
            raise

    def _init_opencv_yolo(self):
        """Initialize OpenCV YOLO implementation with improved GPU handling"""
        # Validate file paths
        self._validate_files(self.legacy_cfg, self.legacy_weights, self.legacy_names)
        
        # Load network
        logging.info("Loading OpenCV DNN model...")
        self.legacy_model = cv2.dnn.readNetFromDarknet(self.legacy_cfg, self.legacy_weights)
        
        # GPU configuration with comprehensive testing
        self.gpu_available = False
        if self.use_gpu:
            try:
                # Check if OpenCV has CUDA support
                build_info = cv2.getBuildInformation()
                has_cuda = "CUDA" in build_info and "YES" in build_info
                
                if not has_cuda:
                    logging.warning("OpenCV built without CUDA support")
                    raise Exception("OpenCV CUDA not available")
                
                # Try setting CUDA backend
                self.legacy_model.setPreferableBackend(cv2.dnn.DNN_BACKEND_CUDA)
                self.legacy_model.setPreferableTarget(cv2.dnn.DNN_TARGET_CUDA)
                
                # Test with actual inference
                test_image = np.random.randint(0, 255, (416, 416, 3), dtype=np.uint8)
                blob = cv2.dnn.blobFromImage(test_image, 1/255.0, (416, 416), swapRB=True, crop=False)
                self.legacy_model.setInput(blob)
                
                # Get output layer names
                layer_names = self.legacy_model.getLayerNames()
                output_layers = [layer_names[i - 1] for i in self.legacy_model.getUnconnectedOutLayers()]
                
                # Test forward pass
                outputs = self.legacy_model.forward(output_layers)
                
                self.gpu_available = True
                logging.info("OpenCV CUDA backend test: PASSED")
                
            except Exception as e:
                logging.warning(f"CUDA backend failed: {e}")
                # Fallback to CPU
                self.legacy_model.setPreferableBackend(cv2.dnn.DNN_BACKEND_OPENCV)
                self.legacy_model.setPreferableTarget(cv2.dnn.DNN_TARGET_CPU)
                logging.info("Using CPU backend")
        else:
            self.legacy_model.setPreferableBackend(cv2.dnn.DNN_BACKEND_OPENCV)
            self.legacy_model.setPreferableTarget(cv2.dnn.DNN_TARGET_CPU)
            logging.info("CPU backend selected by user")
        
        # Load class names
        with open(self.legacy_names, 'r') as f:
            self.classes = [line.strip() for line in f.readlines()]
        
        # Get output layer names
        layer_names = self.legacy_model.getLayerNames()
        self.output_layers = [layer_names[i - 1] for i in self.legacy_model.getUnconnectedOutLayers()]
        
        backend_type = "GPU (CUDA)" if self.gpu_available else "CPU"
        logging.info(f"OpenCV YOLO initialized: {backend_type} backend, {len(self.classes)} classes")
        self.using_ultralytics = False

    def _select_device(self):
        """Select appropriate computation device with comprehensive checks"""
        if not self.use_gpu:
            logging.info("GPU disabled by user configuration")
            return 'cpu'
            
        if not torch.cuda.is_available():
            logging.warning("CUDA not available in PyTorch - using CPU")
            return 'cpu'
        
        try:
            # Test GPU functionality
            device = torch.device('cuda')
            test_tensor = torch.randn(10, 10).to(device)
            result = test_tensor @ test_tensor.T
            
            # Enable optimizations
            torch.backends.cudnn.benchmark = True
            torch.backends.cudnn.deterministic = False
            
            gpu_name = torch.cuda.get_device_name(0)
            memory_gb = torch.cuda.get_device_properties(0).total_memory / 1024**3
            logging.info(f"GPU selected: {gpu_name} ({memory_gb:.1f}GB)")
            
            return 'cuda'
            
        except Exception as e:
            logging.error(f"GPU test failed: {e}")
            return 'cpu'

    def clear_gpu_memory(self):
        """Clear GPU memory cache"""
        if torch.cuda.is_available():
            torch.cuda.empty_cache()
            gc.collect()
            if self.gpu_available:
                allocated = torch.cuda.memory_allocated() / 1024**2
                cached = torch.cuda.memory_reserved() / 1024**2
                logging.debug(f"GPU memory - Allocated: {allocated:.1f}MB, Cached: {cached:.1f}MB")

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

    def detect(self, images):
        """
        Detect objects in images with improved memory management
        """
        if not isinstance(images, list):
            images = [images]
        
        try:
            if self.using_ultralytics:
                return self._detect_ultralytics(images)
            else:
                return self._detect_opencv(images)
        except Exception as e:
            logging.error(f"Detection failed: {e}")
            # Clear memory and retry once
            self.clear_gpu_memory()
            try:
                if self.using_ultralytics:
                    return self._detect_ultralytics(images)
                else:
                    return self._detect_opencv(images)
            except Exception as retry_error:
                logging.error(f"Detection retry failed: {retry_error}")
                return [[] for _ in images]

    def _detect_ultralytics(self, images):
        """Detect using Ultralytics with better memory management"""
        results = []
        
        # Process in smaller batches for memory efficiency
        batch_size = min(4, len(images))
        
        for i in range(0, len(images), batch_size):
            batch = images[i:i + batch_size]
            
            try:
                # Run inference
                preds = self.model(batch, verbose=False, device=self.device)
                
                # Process results
                for pred in preds:
                    detections = []
                    if pred.boxes is not None:
                        for box in pred.boxes:
                            conf = float(box.conf.cpu().numpy())
                            if conf > self.conf_threshold:
                                cls_id = int(box.cls.cpu().numpy())
                                xyxy = box.xyxy.cpu().numpy()[0]
                                
                                # Convert to x,y,w,h format
                                x, y, x2, y2 = xyxy
                                w, h = x2 - x, y2 - y
                                
                                detections.append({
                                    'class': self.classes[cls_id] if cls_id < len(self.classes) else "unknown",
                                    'confidence': conf,
                                    'box': [int(x), int(y), int(w), int(h)]
                                })
                    
                    results.append(detections)
                
                # Clear batch from memory
                del preds
                if self.gpu_available:
                    torch.cuda.empty_cache()
                    
            except Exception as e:
                logging.error(f"Batch processing failed: {e}")
                # Add empty results for failed batch
                results.extend([[] for _ in batch])
        
        return results

    def _detect_opencv(self, images):
        """Detect objects using OpenCV DNN implementation"""
        results = []
        
        for image in images:
            try:
                result = self._process_single_image_opencv(image)
                results.append(result)
            except Exception as e:
                logging.error(f"OpenCV detection failed for image: {e}")
                results.append([])
                
        return results
    
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
            logging.error(f"OpenCV detection failed: {e}")
            return []
    
    def _process_opencv_detections(self, detections, image_shape):
        """Process raw OpenCV DNN detections"""
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
                        'class': self.classes[class_id] if class_id < len(self.classes) else "unknown",
                        'confidence': float(confidence),
                        'box': [x, y, w, h]
                    })
        
        # Non-maximum suppression
        if results:
            try:
                boxes = [det['box'] for det in results]
                confidences = [det['confidence'] for det in results]
                
                indices = cv2.dnn.NMSBoxes(
                    boxes, 
                    confidences, 
                    self.conf_threshold, 
                    self.iou_threshold
                )
                
                if len(indices) > 0:
                    if isinstance(indices, tuple):
                        indices = indices[0]
                    elif isinstance(indices, np.ndarray):
                        indices = indices.flatten()
                        
                    return [results[i] for i in indices]
                
            except Exception as e:
                logging.error(f"NMS processing error: {e}")
                results.sort(key=lambda x: x['confidence'], reverse=True)
                return results[:10]
        
        return []

    def _diagnostic_checks(self):
        """Provide comprehensive diagnostic information"""
        print("\n" + "="*50)
        print("DETAILED DIAGNOSTICS")
        print("="*50)
        
        # System info
        import platform
        print(f"Operating System: {platform.system()} {platform.release()}")
        print(f"Python version: {platform.python_version()}")
        
        # PyTorch diagnostics
        print(f"\nPyTorch version: {torch.__version__}")
        print(f"CUDA available: {torch.cuda.is_available()}")
        
        if torch.cuda.is_available():
            print(f"CUDA device count: {torch.cuda.device_count()}")
            print(f"Current CUDA device: {torch.cuda.current_device()}")
            print(f"Device name: {torch.cuda.get_device_name(0)}")
            print(f"CUDA version: {torch.version.cuda}")
            print(f"cuDNN version: {torch.backends.cudnn.version()}")
            
            # Memory info
            device_props = torch.cuda.get_device_properties(0)
            print(f"GPU memory: {device_props.total_memory / 1024**3:.1f} GB")
            print(f"GPU compute capability: {device_props.major}.{device_props.minor}")
        
        # OpenCV diagnostics
        print(f"\nOpenCV Version: {cv2.__version__}")
        print(f"DNN Module Available: {hasattr(cv2, 'dnn')}")
        
        # Model files check
        files_to_check = []
        if self.model_path:
            files_to_check.append(("PyTorch Model", self.model_path))
        if self.legacy_cfg:
            files_to_check.append(("YOLOv4 Config", self.legacy_cfg))
        if self.legacy_weights:
            files_to_check.append(("YOLOv4 Weights", self.legacy_weights))
        if self.legacy_names:
            files_to_check.append(("Class Names", self.legacy_names))
            
        print(f"\nModel Files:")
        for name, filepath in files_to_check:
            if filepath and os.path.exists(filepath):
                size_mb = os.path.getsize(filepath) / 1024**2
                print(f"  {name}: ✓ ({size_mb:.1f} MB)")
            else:
                print(f"  {name}: ✗ (missing)")
        
        print("="*50)

    def __str__(self):
        """String representation with implementation info"""
        impl = "Ultralytics" if self.using_ultralytics else "OpenCV DNN"
        device = self.device.upper() if self.using_ultralytics else ("GPU (CUDA)" if self.gpu_available else "CPU")
        
        return (f"YOLO Detector (Implementation: {impl}, Device: {device}, "
                f"Classes: {len(self.classes)}, Conf: {self.conf_threshold}, "
                f"IoU: {self.iou_threshold})")


# Additional utility functions for troubleshooting
def check_gpu_setup():
    """Standalone function to check GPU setup"""
    print("GPU SETUP CHECKER")
    print("="*50)
    
    # Check NVIDIA driver
    try:
        import subprocess
        result = subprocess.run(['nvidia-smi'], capture_output=True, text=True, timeout=10)
        if result.returncode == 0:
            print("✓ NVIDIA driver installed")
            print("GPU Information:")
            lines = result.stdout.split('\n')
            for line in lines:
                if 'NVIDIA-SMI' in line or 'Driver Version' in line:
                    print(f"  {line.strip()}")
        else:
            print("✗ nvidia-smi failed")
    except Exception as e:
        print(f"✗ nvidia-smi not available: {e}")
    
    # Check PyTorch CUDA
    try:
        import torch
        print(f"\n✓ PyTorch {torch.__version__} installed")
        if torch.cuda.is_available():
            print(f"✓ PyTorch CUDA support: {torch.version.cuda}")
            print(f"✓ GPU available: {torch.cuda.get_device_name(0)}")
        else:
            print("✗ PyTorch CUDA not available")
            print("  Install PyTorch with CUDA: pip install torch torchvision --index-url https://download.pytorch.org/whl/cu118")
    except ImportError:
        print("✗ PyTorch not installed")
    
    # Check OpenCV
    try:
        import cv2
        print(f"\n✓ OpenCV {cv2.__version__} installed")
        build_info = cv2.getBuildInformation()
        if "CUDA" in build_info and "YES" in build_info:
            print("✓ OpenCV built with CUDA support")
        else:
            print("✗ OpenCV built without CUDA support")
            print("  Install OpenCV with CUDA: pip install opencv-contrib-python")
    except ImportError:
        print("✗ OpenCV not installed")

if __name__ == "__main__":
    # Run diagnostics
    check_gpu_setup()
    
    # Test YOLO detector
    try:
        detector = YOLODetector()
        print(f"\nYOLO Detector initialized successfully:")
        print(detector)
    except Exception as e:
        print(f"\nYOLO Detector initialization failed: {e}")