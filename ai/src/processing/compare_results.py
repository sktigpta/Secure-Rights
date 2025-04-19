import cv2
import numpy as np
import logging
import time
from tqdm import tqdm
import gc

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
    # Handle empty detections cases
    if not ref_detections:
        return 0.0
    if not target_detections:
        return 0.0
    
    # Extract classes with their confidence scores from reference frame
    ref_classes = {}
    for det in ref_detections:
        cls_name = det.get('class', '')
        confidence = det.get('confidence', 0.0)
        if confidence > weight_threshold:
            # Use maximum confidence if class appears multiple times
            ref_classes[cls_name] = max(confidence, ref_classes.get(cls_name, 0))
    
    # Extract classes with their confidence scores from target frame
    target_classes = {}
    for det in target_detections:
        cls_name = det.get('class', '')
        confidence = det.get('confidence', 0.0)
        if confidence > weight_threshold:
            # Use maximum confidence if class appears multiple times
            target_classes[cls_name] = max(confidence, target_classes.get(cls_name, 0))
    
    # If either has no valid classes after filtering, similarity is zero
    if not ref_classes or not target_classes:
        return 0.0
    
    # Calculate weighted intersection score
    intersection_score = 0
    for cls_name, ref_conf in ref_classes.items():
        if cls_name in target_classes:
            # Weight match by minimum confidence between reference and target
            match_weight = min(ref_conf, target_classes[cls_name])
            intersection_score += match_weight
    
    # Calculate union score (sum of reference confidence values)
    union_score = sum(ref_classes.values())
    
    # Return normalized similarity score
    return intersection_score / union_score if union_score > 0 else 0

def compare_frames(target_frames, reference_data, yolo, threshold=0.5, batch_size=4):
    """
    Compare target frames against reference frames with optimized GPU memory usage
    
    Args:
        target_frames (list): List of target frame images or paths
        reference_data (list): Detections from reference frames
        yolo (YOLODetector): YOLO detector instance
        threshold (float): Similarity threshold for match declaration
        batch_size (int): Batch size for processing frames
        
    Returns:
        list: Boolean flags indicating if each frame was copied
    """
    # Validate inputs
    if not target_frames:
        logging.warning("No target frames provided for comparison")
        return []
    
    if not reference_data:
        logging.warning("No reference data provided for comparison")
        return [False] * len(target_frames)
    
    # Initialize result array
    is_copied = []
    
    # Process frames in batches with progress tracking
    with tqdm(total=len(target_frames), desc="Comparing Frames", unit="frame") as pbar:
        for i in range(0, len(target_frames), batch_size):
            try:
                # Get current batch
                batch = target_frames[i:i+batch_size]
                batch_frames = []
                
                # Load frames if paths were provided
                for item in batch:
                    if isinstance(item, str):  # Path to image
                        frame = cv2.imread(item)
                        if frame is None:
                            logging.warning(f"Could not read frame: {item}")
                            is_copied.append(False)
                            pbar.update(1)
                            continue
                        batch_frames.append(frame)
                    else:  # Already a frame
                        batch_frames.append(item)
                
                # Skip empty batch
                if not batch_frames:
                    pbar.update(len(batch))
                    continue
                
                # Run detection on batch
                batch_detections = yolo.detect(batch_frames)
                
                # Compare each frame's detections with reference data
                for frame_idx, target_detections in enumerate(batch_detections):
                    try:
                        # Calculate similarities against all reference frames
                        similarities = [
                            calculate_similarity(ref, target_detections) 
                            for ref in reference_data
                        ]
                        
                        # Find maximum similarity
                        max_similarity = max(similarities) if similarities else 0
                        
                        # Determine if this frame matches any reference frame
                        is_copied.append(max_similarity >= threshold)
                        
                        # Update progress bar information
                        if frame_idx % 10 == 0 or frame_idx == len(batch_detections) - 1:
                            pbar.set_postfix({
                                "Max Sim": f"{max_similarity:.2f}", 
                                "Matched": f"{sum(is_copied)}/{len(is_copied)}"
                            })
                    except Exception as e:
                        is_copied.append(False)
                        logging.error(f"Error comparing frame {i + frame_idx}: {str(e)}")
                    
                    # Update progress bar
                    pbar.update(1)
                
                # Explicitly release memory before next batch
                del batch_frames
                del batch_detections
                gc.collect()
                
                # Force GPU memory cleanup if available
                if hasattr(yolo, 'gpu_available') and yolo.gpu_available:
                    if hasattr(torch, 'cuda') and torch.cuda.is_available():
                        import torch
                        torch.cuda.empty_cache()
            
            except Exception as e:
                # Mark remaining frames in batch as not copied
                for _ in range(len(batch)):
                    is_copied.append(False)
                    pbar.update(1)
                logging.error(f"Batch processing error: {str(e)}")
    
    # Log match statistics
    match_count = sum(is_copied)
    match_percent = (match_count / len(target_frames)) * 100 if target_frames else 0
    logging.info(f"Matched {match_count}/{len(target_frames)} frames ({match_percent:.2f}%)")
    
    return is_copied