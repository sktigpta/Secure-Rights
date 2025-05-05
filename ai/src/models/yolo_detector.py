import torch
from ultralytics import YOLO
import cv2
import logging
import numpy as np
import os

class YOLODetector:
    def __init__(self,
                 model_path="src/models/pretrained/yolov8n.pt",
                 conf_threshold=0.5,
                 iou_threshold=0.4,
                 use_gpu=True):
        """Initialize YOLO Detector with PyTorch GPU support"""
        
        # Configure logging
        logging.basicConfig(level=logging.INFO, 
                          format='%(asctime)s - %(levelname)s: %(message)s')

        # Device configuration
        self.use_gpu = use_gpu
        self.device = self._select_device()
        self.gpu_available = self.device == 'cuda'

        try:
            # Load YOLO model
            self.model = YOLO(model_path).to(self.device)
            self.model.fuse()
            
            # Set detection parameters
            self.conf_threshold = conf_threshold
            self.iou_threshold = iou_threshold
            
            logging.info(f"YOLO Detector initialized on {self.device.upper()}")
            logging.info(f"Model architecture: {self.model.overrides['task']}")
            logging.info(f"Available classes: {len(self.model.names)}")

        except Exception as e:
            logging.error(f"YOLO Detector Initialization Failed: {e}")
            self._diagnostic_checks()
            raise

    def _select_device(self):
        """Select appropriate computation device"""
        if self.use_gpu and torch.cuda.is_available():
            torch.backends.cudnn.benchmark = True
            logging.info(f"CUDA GPU detected: {torch.cuda.get_device_name(0)}")
            return 'cuda'
        logging.warning("Using CPU for inference")
        return 'cpu'

    def _diagnostic_checks(self):
        """Provide diagnostic information"""
        print("\n--- DIAGNOSTIC INFORMATION ---")
        print(f"PyTorch version: {torch.__version__}")
        print(f"CUDA available: {torch.cuda.is_available()}")
        
        if torch.cuda.is_available():
            print(f"CUDA device count: {torch.cuda.device_count()}")
            print(f"Current CUDA device: {torch.cuda.current_device()}")
            print(f"Device name: {torch.cuda.get_device_name(0)}")
            print(f"CUDA version: {torch.version.cuda}")

    def detect(self, images):
        """
        Detect objects in images using GPU-accelerated inference
        
        Args:
            images (list/np.ndarray): Input images in BGR format (OpenCV default)
        
        Returns:
            list: List of detections for each image
        """
        if not isinstance(images, list):
            images = [images]

        # Convert BGR to RGB and validate input
        rgb_images = []
        for img in images:
            if isinstance(img, np.ndarray):
                rgb_images.append(cv2.cvtColor(img, cv2.COLOR_BGR2RGB))
            else:
                raise ValueError("Input must be numpy array or list of numpy arrays")

        # Run inference
        with torch.inference_mode():
            results = self.model.predict(
                source=rgb_images,
                conf=self.conf_threshold,
                iou=self.iou_threshold,
                device=self.device,
                verbose=False,
                stream=False  # Disable streaming for batch processing
            )

        return self._process_results(results)

    def _process_results(self, results):
        """Process model results into standardized format"""
        detections = []
        for result in results:
            frame_detections = []
            for box in result.boxes:
                frame_detections.append({
                    'class': result.names[int(box.cls)],
                    'confidence': float(box.conf),
                    'box': box.xyxy[0].cpu().numpy().tolist()  # [x1, y1, x2, y2]
                })
            detections.append(frame_detections)
        return detections

    def process_video(self, video_path, output_path=None, display=False):
        """
        Process video with GPU acceleration
        
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
            writer = cv2.VideoWriter(output_path, cv2.VideoWriter_fourcc(*'mp4v'), fps, (width, height)) if output_path else None

            # Batch processing parameters
            batch_size = 16 if self.gpu_available else 4
            frame_batch = []
            
            with tqdm(total=total_frames, desc="Processing Video") as pbar:
                while True:
                    ret, frame = cap.read()
                    if not ret:
                        break

                    frame_batch.append(frame)
                    if len(frame_batch) >= batch_size:
                        self._process_batch(frame_batch, writer, display)
                        pbar.update(len(frame_batch))
                        frame_batch = []

                # Process remaining frames
                if frame_batch:
                    self._process_batch(frame_batch, writer, display)
                    pbar.update(len(frame_batch))

            cap.release()
            if writer:
                writer.release()
            return True

        except Exception as e:
            logging.error(f"Video processing failed: {e}")
            return False

    def _process_batch(self, frames, writer, display):
        """Process batch of frames"""
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
            x1, y1, x2, y2 = map(int, det['box'])
            label = f"{det['class']} {det['confidence']:.2f}"
            
            cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 255, 0), 2)
            cv2.putText(frame, label, (x1, y1-10), 
                       cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 0), 2)

    def __str__(self):
        return (f"YOLO Detector (Device: {self.device.upper()}, "
                f"Classes: {len(self.model.names)}, "
                f"Conf: {self.conf_threshold}, "
                f"IoU: {self.iou_threshold})")