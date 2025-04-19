import cv2
import numpy as np
from tqdm import tqdm
import logging

def calculate_similarity(ref_detections, target_detections, weight_threshold=0.3):
    """
    Calculate similarity between frames based on detected object classes
    with improved weighting by detection confidence
    
    Args:
        ref_detections (list): Reference frame detections
        target_detections (list): Target frame detections
        weight_threshold (float): Minimum confidence for inclusion in similarity
    
    Returns:
        float: Similarity score from 0.0 to 1.0
    """
    # Extract classes with their confidence scores from reference frame
    ref_classes = {}
    for det in ref_detections:
        cls_name = det['class']
        confidence = det['confidence']
        if confidence > weight_threshold:
            # Use maximum confidence if class appears multiple times
            ref_classes[cls_name] = max(confidence, ref_classes.get(cls_name, 0))
    
    # Extract classes with their confidence scores from target frame
    target_classes = {}
    for det in target_detections:
        cls_name = det['class']
        confidence = det['confidence']
        if confidence > weight_threshold:
            # Use maximum confidence if class appears multiple times
            target_classes[cls_name] = max(confidence, target_classes.get(cls_name, 0))
    
    # Calculate weighted intersection score
    intersection_score = 0
    for cls_name, ref_conf in ref_classes.items():
        if cls_name in target_classes:
            # Weight match by minimum confidence between reference and target
            match_weight = min(ref_conf, target_classes[cls_name])
            intersection_score += match_weight
    
    # Calculate union score
    union_score = sum(ref_classes.values())
    
    # Return normalized similarity score
    return intersection_score / union_score if union_score > 0 else 0

def compare_frames(target_frames, reference_data, yolo, threshold=0.5):
    """
    Compare target frames against reference frames with optimized memory usage
    
    Args:
        target_frames (list): Paths to target frame images
        reference_data (list): Detections from reference frames
        yolo (YOLODetector): YOLO detector instance
        threshold (float): Similarity threshold for match declaration
        
    Returns:
        list: Boolean flags indicating if each frame was copied
    """
    # Initialize result array
    is_copied = []
    
    # Process frames with single progress bar
    with tqdm(total=len(target_frames), desc="Comparing Frames", unit="frame") as pbar:
        for idx, frame_path in enumerate(target_frames):
            try:
                # Load and process each frame
                frame = cv2.imread(frame_path)
                if frame is None:
                    is_copied.append(False)
                    pbar.write(f"Warning: Could not read frame {frame_path}")
                    pbar.update(1)
                    continue
                
                # Detect objects in current frame
                target_detections = yolo.detect(frame)
                
                # Find maximum similarity against all reference frames
                similarities = [
                    calculate_similarity(ref, target_detections) 
                    for ref in reference_data
                ]
                
                max_similarity = max(similarities) if similarities else 0
                is_copied.append(max_similarity >= threshold)
                
                # Update progress bar with similarity info every 10 frames
                if idx % 10 == 0:
                    pbar.set_postfix({"Similarity": f"{max_similarity:.2f}"})
                
                # Explicitly release memory
                del frame
                
            except Exception as e:
                is_copied.append(False)
                pbar.write(f"Error processing frame {frame_path}: {str(e)}")
                logging.error(f"Frame comparison error: {str(e)}")
                
            pbar.update(1)
    
    # Log match statistics
    match_count = sum(is_copied)
    match_percent = (match_count / len(target_frames)) * 100 if target_frames else 0
    logging.info(f"Matched {match_count}/{len(target_frames)} frames ({match_percent:.2f}%)")
    
    return is_copied