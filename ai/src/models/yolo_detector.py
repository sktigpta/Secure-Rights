import os
import cv2
import numpy as np
import logging
import torch
import gc
from tqdm.auto import tqdm

class YOLODetector:
    def __init__(self,
                 model_path="src/models/pretrained/yolov8n.pt",
                 input_size=640,
                 conf_threshold=0.5,
                 iou_threshold=0.4,
                 use_gpu=True,
                 num_threads=4):
        """
        Initialize YOLO Detector with YOLOv8 support
        Available YOLOv8 models:
        - yolov8n.pt (nano - fastest, least accurate)
        - yolov8s.pt (small)
        - yolov8m.pt (medium)
        - yolov8l.pt (large)
        - yolov8x.pt (extra large - slowest, most accurate)
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
        
        # Initialize state variables
        self.model = None
        self.classes = []
        self.device = 'cpu'
        self.gpu_available = False
        
        # Run GPU diagnostics
        self._run_gpu_diagnostics()
        
        try:
            self._init_yolov8_model()
        except Exception as e:
            logging.error(f"YOLO initialization failed: {e}")
            self._diagnostic_checks()
            raise

    def _run_gpu_diagnostics(self):
        """Comprehensive GPU diagnostics"""
        print("\n" + "="*50)
        print("GPU DIAGNOSTICS")
        print("="*50)
        
        # Check PyTorch CUDA availability
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
        
        print("="*50)

    def _init_yolov8_model(self):
        """Initialize YOLOv8 model using ultralytics"""
        try:
            from ultralytics import YOLO
            
            # Device configuration
            self.device = self._select_device()
            self.gpu_available = self.device == 'cuda'
            
            # Load YOLOv8 model
            logging.info(f"Loading YOLOv8 model: {self.model_path}")
            
            # If model doesn't exist locally, ultralytics will download it automatically
            if not os.path.exists(self.model_path):
                logging.info(f"Model file not found locally. Ultralytics will download {self.model_path}")
            
            self.model = YOLO(self.model_path)
            
            # Move to appropriate device
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
            
            # Store class names (COCO dataset classes by default)
            self.classes = list(self.model.names.values())
            
            device_info = "GPU (CUDA)" if self.gpu_available else "CPU"
            logging.info(f"YOLOv8 initialized successfully on {device_info}")
            logging.info(f"Model task: {self.model.task}")
            logging.info(f"Available classes: {len(self.classes)}")
            
            # Print model info
            print(f"\nModel Information:")
            print(f"  Architecture: {self.model_path}")
            print(f"  Classes: {len(self.classes)}")
            print(f"  Device: {device_info}")
            print(f"  Input size: {self.input_size}")
            
        except ImportError as e:
            logging.error(f"Ultralytics not installed. Install with: pip install ultralytics")
            raise
        except Exception as e:
            logging.error(f"YOLOv8 initialization failed: {e}")
            raise

    def _select_device(self):
        """Select appropriate computation device"""
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

    def detect(self, images):
        """
        Detect objects in images using YOLOv8
        """
        if not isinstance(images, list):
            images = [images]
        
        try:
            return self._detect_yolov8(images)
        except Exception as e:
            logging.error(f"Detection failed: {e}")
            # Clear memory and retry once
            self.clear_gpu_memory()
            try:
                return self._detect_yolov8(images)
            except Exception as retry_error:
                logging.error(f"Detection retry failed: {retry_error}")
                return [[] for _ in images]

    def _detect_yolov8(self, images):
        """Detect using YOLOv8 with optimized batch processing"""
        results = []
        
        # Process in batches for memory efficiency
        batch_size = min(8, len(images))  # Increased batch size for YOLOv8
        
        for i in range(0, len(images), batch_size):
            batch = images[i:i + batch_size]
            
            try:
                # Run inference with optimized parameters
                preds = self.model(
                    batch, 
                    verbose=False, 
                    device=self.device,
                    conf=self.conf_threshold,
                    iou=self.iou_threshold,
                    imgsz=self.input_size
                )
                
                # Process results
                for pred in preds:
                    detections = []
                    if pred.boxes is not None and len(pred.boxes) > 0:
                        # Extract detection data
                        boxes = pred.boxes.xyxy.cpu().numpy()  # x1, y1, x2, y2
                        confidences = pred.boxes.conf.cpu().numpy()
                        class_ids = pred.boxes.cls.cpu().numpy().astype(int)
                        
                        for box, conf, cls_id in zip(boxes, confidences, class_ids):
                            if conf > self.conf_threshold:
                                # Convert to x, y, w, h format
                                x1, y1, x2, y2 = box
                                x, y, w, h = x1, y1, x2 - x1, y2 - y1
                                
                                detections.append({
                                    'class': self.classes[cls_id] if cls_id < len(self.classes) else "unknown",
                                    'confidence': float(conf),
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
        
        # Ultralytics check
        try:
            from ultralytics import YOLO
            print(f"\n✓ Ultralytics available")
        except ImportError:
            print(f"\n✗ Ultralytics not installed")
            print("  Install with: pip install ultralytics")
        
        # Model file check
        print(f"\nModel File:")
        if os.path.exists(self.model_path):
            size_mb = os.path.getsize(self.model_path) / 1024**2
            print(f"  {self.model_path}: ✓ ({size_mb:.1f} MB)")
        else:
            print(f"  {self.model_path}: Will be downloaded automatically")
        
        print("="*50)

    def __str__(self):
        """String representation"""
        device = self.device.upper() if hasattr(self, 'device') else "CPU"
        return (f"YOLOv8 Detector (Model: {self.model_path}, Device: {device}, "
                f"Classes: {len(self.classes)}, Conf: {self.conf_threshold}, "
                f"IoU: {self.iou_threshold})")


# Utility function for model selection
def get_yolov8_model_info():
    """Get information about available YOLOv8 models"""
    models = {
        'yolov8n.pt': {'size': '6.2MB', 'speed': 'Fastest', 'accuracy': 'Lowest', 'use_case': 'Real-time applications'},
        'yolov8s.pt': {'size': '21.5MB', 'speed': 'Fast', 'accuracy': 'Good', 'use_case': 'Balanced performance'},
        'yolov8m.pt': {'size': '49.7MB', 'speed': 'Medium', 'accuracy': 'Better', 'use_case': 'High accuracy needed'},
        'yolov8l.pt': {'size': '83.7MB', 'speed': 'Slow', 'accuracy': 'High', 'use_case': 'Production systems'},
        'yolov8x.pt': {'size': '130.5MB', 'speed': 'Slowest', 'accuracy': 'Highest', 'use_case': 'Maximum accuracy'}
    }
    
    print("Available YOLOv8 Models:")
    print("="*60)
    for model, info in models.items():
        print(f"{model:12} | {info['size']:8} | {info['speed']:8} | {info['accuracy']:8} | {info['use_case']}")
    print("="*60)
    
    return models


# Standalone GPU checker
def check_gpu_setup():
    """Check GPU setup for YOLOv8"""
    print("YOLOv8 GPU SETUP CHECKER")
    print("="*50)
    
    # Check NVIDIA driver
    try:
        import subprocess
        result = subprocess.run(['nvidia-smi'], capture_output=True, text=True, timeout=10)
        if result.returncode == 0:
            print("✓ NVIDIA driver installed")
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
    except ImportError:
        print("✗ PyTorch not installed")
    
    # Check Ultralytics
    try:
        from ultralytics import YOLO
        print(f"\n✓ Ultralytics installed")
        print("✓ Ready for YOLOv8")
    except ImportError:
        print("\n✗ Ultralytics not installed")
        print("  Install with: pip install ultralytics")


if __name__ == "__main__":
    # Show available models
    get_yolov8_model_info()
    
    # Run diagnostics
    check_gpu_setup()
    
    # Test YOLOv8 detector
    try:
        # You can choose different models here
        detector = YOLODetector(model_path="yolov8n.pt")  # Start with nano for testing
        print(f"\nYOLOv8 Detector initialized successfully:")
        print(detector)
    except Exception as e:
        print(f"\nYOLOv8 Detector initialization failed: {e}")