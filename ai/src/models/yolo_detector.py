import os
import cv2
import numpy as np
import logging

class YOLODetector:
    def __init__(self, 
                 cfg="src/models/pretrained/yolov4.cfg",
                 weights="src/models/pretrained/yolov4.weights",
                 names="src/models/pretrained/coco.names",
                 input_size=608,
                 conf_threshold=0.5,
                 nms_threshold=0.4):
        """Initialize YOLO Detector with extensive path and dependency validation"""
        
        # Configure logging
        logging.basicConfig(level=logging.INFO, 
                            format='%(asctime)s - %(levelname)s: %(message)s')
        
        # Validate file paths
        self._validate_files(cfg, weights, names)
        
        try:
            # Verify OpenCV DNN module availability
            if not hasattr(cv2, 'dnn'):
                raise ImportError("OpenCV DNN module is not available")
            
            # Load network
            self.net = cv2.dnn.readNetFromDarknet(cfg, weights)
            
            # Configure network
            self.net.setPreferableBackend(cv2.dnn.DNN_BACKEND_OPENCV)
            self.net.setPreferableTarget(cv2.dnn.DNN_TARGET_CPU)
            
            # Load class names
            with open(names, 'r') as f:
                self.classes = [line.strip() for line in f.readlines()]
            
            # Set detection parameters
            self.input_size = input_size
            self.conf_threshold = conf_threshold
            self.nms_threshold = nms_threshold
            
            logging.info("YOLO Detector initialized successfully")
        
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
                print(f"❌ File does not exist")
            else:
                print(f"✅ File exists")
                print(f"Size: {os.path.getsize(filepath)} bytes")
                print(f"Readable: {os.access(filepath, os.R_OK)}")

        # Check OpenCV version and DNN support
        print(f"\nOpenCV Version: {cv2.__version__}")
        print(f"DNN Module Available: {hasattr(cv2, 'dnn')}")

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
        
        all_detections = []
        
        for image in images:
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
                layer_names = self.net.getLayerNames()
                output_layers = [layer_names[i - 1] for i in self.net.getUnconnectedOutLayers()]
                
                detections = self.net.forward(output_layers)
                
                # Process detections
                image_detections = self._process_detections(detections, image.shape)
                all_detections.append(image_detections)
            
            except Exception as e:
                logging.error(f"Detection failed for image: {e}")
                all_detections.append([])
        
        return all_detections[0] if len(all_detections) == 1 else all_detections

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
        indices = cv2.dnn.NMSBoxes(
            [det['box'] for det in results], 
            [det['confidence'] for det in results], 
            self.conf_threshold, 
            self.nms_threshold
        )
        
        return [results[i] for i in indices]

    def __str__(self):
        """Provide a string representation of the detector"""
        return f"YOLO Detector (Classes: {len(self.classes)}, Conf: {self.conf_threshold})"