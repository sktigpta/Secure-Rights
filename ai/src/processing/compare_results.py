import os
import cv2
import numpy as np
import logging
from tqdm.auto import tqdm
from typing import List, Dict, Any
import torch
import gc

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def compare_frames(target_frames: List[str], 
                  reference_data: List[List[Dict]], 
                  yolo_detector,
                  threshold: float = 0.75,
                  batch_size: int = 8) -> List[bool]:
    """
    Compare target video frames with reference data using YOLO detections
    
    Args:
        target_frames: List of paths to target frame images
        reference_data: List of reference detection results from YOLO
        yolo_detector: Initialized YOLO detector instance
        threshold: Similarity threshold (0.0 to 1.0)
        batch_size: Number of frames to process in each batch
        
    Returns:
        List of boolean values indicating if each frame is similar to reference
    """
    if not target_frames:
        logger.warning("No target frames provided")
        return []
    
    if not reference_data:
        logger.warning("No reference data provided")
        return [False] * len(target_frames)
    
    logger.info(f"Comparing {len(target_frames)} frames against {len(reference_data)} reference detection sets")
    logger.info(f"Using similarity threshold: {threshold}")
    logger.info(f"Batch size: {batch_size}")
    
    copied_frames = []
    
    # Process frames in batches for memory efficiency
    for batch_start in tqdm(range(0, len(target_frames), batch_size), 
                           desc="Comparing Frames"):
        batch_end = min(batch_start + batch_size, len(target_frames))
        batch_frames = target_frames[batch_start:batch_end]
        
        try:
            # Load batch images
            batch_images = []
            valid_indices = []
            
            for i, frame_path in enumerate(batch_frames):
                if not os.path.exists(frame_path):
                    logger.warning(f"Frame not found: {frame_path}")
                    continue
                    
                image = cv2.imread(frame_path)
                if image is None:
                    logger.warning(f"Could not read frame: {frame_path}")
                    continue
                    
                batch_images.append(image)
                valid_indices.append(i)
            
            if not batch_images:
                # If no valid images in batch, mark all as non-copied
                copied_frames.extend([False] * len(batch_frames))
                continue
            
            # Get YOLO detections for batch
            try:
                batch_detections = yolo_detector.detect(batch_images)
            except Exception as detection_error:
                logger.error(f"YOLO detection failed for batch: {detection_error}")
                copied_frames.extend([False] * len(batch_frames))
                continue
            
            # Compare each frame's detections with reference data
            batch_results = []
            for detection_idx, detections in enumerate(batch_detections):
                frame_idx = batch_start + valid_indices[detection_idx] if detection_idx < len(valid_indices) else batch_start + detection_idx
                
                try:
                    is_similar = compare_detections_with_reference(
                        detections, 
                        reference_data, 
                        threshold
                    )
                    batch_results.append(is_similar)
                    
                except Exception as comparison_error:
                    logger.error(f"Comparison failed for frame {frame_idx}: {comparison_error}")
                    batch_results.append(False)
            
            # Handle cases where we have fewer results than frames in batch
            while len(batch_results) < len(batch_frames):
                batch_results.append(False)
            
            copied_frames.extend(batch_results[:len(batch_frames)])
            
            # Clear memory after batch
            del batch_images
            del batch_detections
            if torch.cuda.is_available():
                torch.cuda.empty_cache()
            gc.collect()
            
        except Exception as batch_error:
            logger.error(f"Batch processing failed: {batch_error}")
            # Mark entire batch as non-copied on error
            copied_frames.extend([False] * len(batch_frames))
    
    # Ensure we have exactly the same number of results as input frames
    while len(copied_frames) < len(target_frames):
        copied_frames.append(False)
    
    copied_frames = copied_frames[:len(target_frames)]
    
    # Log results
    total_copied = sum(copied_frames)
    copy_percentage = (total_copied / len(copied_frames)) * 100 if copied_frames else 0
    
    logger.info(f"Comparison completed: {total_copied}/{len(copied_frames)} frames matched ({copy_percentage:.1f}%)")
    
    return copied_frames

def compare_detections_with_reference(target_detections: List[Dict],
                                    reference_data: List[List[Dict]],
                                    threshold: float) -> bool:
    """
    Compare target detections with reference detection sets
    
    Args:
        target_detections: List of detection dictionaries for target frame
        reference_data: List of reference detection sets
        threshold: Similarity threshold
        
    Returns:
        Boolean indicating if target is similar to any reference
    """
    if not target_detections:
        return False
    
    if not reference_data:
        return False
    
    max_similarity = 0.0
    
    # Compare with each reference detection set
    for ref_detections in reference_data:
        if not ref_detections:
            continue
            
        try:
            similarity = calculate_detection_similarity(target_detections, ref_detections)
            max_similarity = max(max_similarity, similarity)
            
            # Early exit if threshold is met
            if max_similarity >= threshold:
                return True
                
        except Exception as e:
            logger.debug(f"Similarity calculation failed: {e}")
            continue
    
    return max_similarity >= threshold

def calculate_detection_similarity(detections1: List[Dict], 
                                 detections2: List[Dict]) -> float:
    """
    Calculate similarity between two sets of YOLO detections
    
    Args:
        detections1: First set of detections
        detections2: Second set of detections
        
    Returns:
        Similarity score between 0.0 and 1.0
    """
    if not detections1 or not detections2:
        return 0.0
    
    # Extract class distributions
    classes1 = extract_class_distribution(detections1)
    classes2 = extract_class_distribution(detections2)
    
    # Calculate class similarity
    class_similarity = calculate_class_similarity(classes1, classes2)
    
    # Calculate spatial similarity
    spatial_similarity = calculate_spatial_similarity(detections1, detections2)
    
    # Calculate confidence similarity
    conf_similarity = calculate_confidence_similarity(detections1, detections2)
    
    # Weighted combination of similarities
    # Adjust weights based on your use case
    total_similarity = (
        0.5 * class_similarity +      # What objects are detected
        0.3 * spatial_similarity +    # Where objects are located
        0.2 * conf_similarity         # How confident the detections are
    )
    
    return min(1.0, max(0.0, total_similarity))

def extract_class_distribution(detections: List[Dict]) -> Dict[str, int]:
    """Extract class distribution from detections"""
    class_counts = {}
    for detection in detections:
        class_name = detection.get('class', 'unknown')
        class_counts[class_name] = class_counts.get(class_name, 0) + 1
    return class_counts

def calculate_class_similarity(classes1: Dict[str, int], 
                             classes2: Dict[str, int]) -> float:
    """Calculate similarity between class distributions"""
    if not classes1 or not classes2:
        return 0.0
    
    # Get all unique classes
    all_classes = set(classes1.keys()) | set(classes2.keys())
    
    if not all_classes:
        return 0.0
    
    # Calculate cosine similarity between class vectors
    vector1 = [classes1.get(cls, 0) for cls in all_classes]
    vector2 = [classes2.get(cls, 0) for cls in all_classes]
    
    # Normalize vectors
    norm1 = np.linalg.norm(vector1)
    norm2 = np.linalg.norm(vector2)
    
    if norm1 == 0 or norm2 == 0:
        return 0.0
    
    # Cosine similarity
    similarity = np.dot(vector1, vector2) / (norm1 * norm2)
    return max(0.0, similarity)

def calculate_spatial_similarity(detections1: List[Dict], 
                               detections2: List[Dict]) -> float:
    """Calculate spatial similarity between detections"""
    if not detections1 or not detections2:
        return 0.0
    
    # Extract bounding boxes
    boxes1 = [detection.get('box', [0, 0, 0, 0]) for detection in detections1]
    boxes2 = [detection.get('box', [0, 0, 0, 0]) for detection in detections2]
    
    # Calculate IoU for best matching pairs
    max_ious = []
    used_indices = set()
    
    for box1 in boxes1:
        best_iou = 0.0
        best_idx = -1
        
        for i, box2 in enumerate(boxes2):
            if i in used_indices:
                continue
                
            iou = calculate_iou(box1, box2)
            if iou > best_iou:
                best_iou = iou
                best_idx = i
        
        if best_idx >= 0:
            max_ious.append(best_iou)
            used_indices.add(best_idx)
        else:
            max_ious.append(0.0)
    
    # Average IoU of matched pairs
    return np.mean(max_ious) if max_ious else 0.0

def calculate_iou(box1: List[float], box2: List[float]) -> float:
    """Calculate Intersection over Union (IoU) between two bounding boxes"""
    try:
        x1_1, y1_1, w1, h1 = box1
        x1_2, y1_2, w2, h2 = box2
        
        x2_1, y2_1 = x1_1 + w1, y1_1 + h1
        x2_2, y2_2 = x1_2 + w2, y1_2 + h2
        
        # Calculate intersection
        x_left = max(x1_1, x1_2)
        y_top = max(y1_1, y1_2)
        x_right = min(x2_1, x2_2)
        y_bottom = min(y2_1, y2_2)
        
        if x_right <= x_left or y_bottom <= y_top:
            return 0.0
        
        intersection = (x_right - x_left) * (y_bottom - y_top)
        
        # Calculate union
        area1 = w1 * h1
        area2 = w2 * h2
        union = area1 + area2 - intersection
        
        return intersection / union if union > 0 else 0.0
        
    except (ValueError, ZeroDivisionError, IndexError):
        return 0.0

def calculate_confidence_similarity(detections1: List[Dict], 
                                  detections2: List[Dict]) -> float:
    """Calculate similarity between detection confidence scores"""
    if not detections1 or not detections2:
        return 0.0
    
    # Extract confidence scores
    confidences1 = [detection.get('confidence', 0.0) for detection in detections1]
    confidences2 = [detection.get('confidence', 0.0) for detection in detections2]
    
    # Calculate average confidences
    avg_conf1 = np.mean(confidences1)
    avg_conf2 = np.mean(confidences2)
    
    # Similarity based on confidence difference
    conf_diff = abs(avg_conf1 - avg_conf2)
    similarity = max(0.0, 1.0 - conf_diff)
    
    return similarity

# Utility functions for debugging and analysis
def analyze_detections(detections: List[Dict]) -> Dict[str, Any]:
    """Analyze detection results for debugging"""
    if not detections:
        return {'total': 0, 'classes': {}, 'avg_confidence': 0.0}
    
    classes = {}
    confidences = []
    
    for detection in detections:
        class_name = detection.get('class', 'unknown')
        classes[class_name] = classes.get(class_name, 0) + 1
        confidences.append(detection.get('confidence', 0.0))
    
    return {
        'total': len(detections),
        'classes': classes,
        'avg_confidence': np.mean(confidences) if confidences else 0.0,
        'max_confidence': max(confidences) if confidences else 0.0,
        'min_confidence': min(confidences) if confidences else 0.0
    }

def print_comparison_stats(target_frames: List[str], 
                          copied_frames: List[bool],
                          threshold: float):
    """Print comparison statistics"""
    total_frames = len(target_frames)
    copied_count = sum(copied_frames)
    copy_percentage = (copied_count / total_frames) * 100 if total_frames > 0 else 0
    
    print(f"\n{'='*50}")
    print(f"FRAME COMPARISON RESULTS")
    print(f"{'='*50}")
    print(f"Total frames analyzed: {total_frames}")
    print(f"Frames marked as copied: {copied_count}")
    print(f"Copy percentage: {copy_percentage:.2f}%")
    print(f"Similarity threshold: {threshold}")
    print(f"{'='*50}\n")

# Test function
def test_compare_frames():
    """Test function for frame comparison"""
    print("Testing frame comparison functionality...")
    
    # This would normally be called with real data
    # Just showing the interface
    target_frames = ["frame1.jpg", "frame2.jpg"]  # Example paths
    reference_data = [[]]  # Example reference data
    threshold = 0.75
    
    # Simulated result
    copied_frames = [False, False]
    
    print_comparison_stats(target_frames, copied_frames, threshold)
    
    return copied_frames

if __name__ == "__main__":
    test_compare_frames()