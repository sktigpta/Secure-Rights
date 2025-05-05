import cv2
from tqdm import tqdm

def calculate_similarity(ref_detections, target_detections):
    """
    Calculate similarity based on class matches.
    
    Args:
        ref_detections (list): Reference detections
        target_detections (list): Target detections to compare against
        
    Returns:
        float: Similarity score between 0.0 and 1.0
    """
    # Extract class names from reference detections
    if not ref_detections:
        return 0.0
    
    # Handle nested list structure if needed
    if isinstance(ref_detections, list) and len(ref_detections) > 0 and isinstance(ref_detections[0], list):
        ref_detections = ref_detections[0]
    
    # Handle nested list structure from batch processing for target detections
    if isinstance(target_detections, list) and len(target_detections) > 0:
        # If target_detections is a list of lists (batch result), take first frame's detections
        if isinstance(target_detections[0], list):
            target_detections = target_detections[0]
    
    # Extract class names from both detection sets
    ref_classes = {d['class'] for d in ref_detections if isinstance(d, dict) and 'class' in d}
    target_classes = {d['class'] for d in target_detections if isinstance(d, dict) and 'class' in d}
    
    if not ref_classes:
        return 0.0
    
    # Calculate IOU-like metric for bounding boxes
    class_matches = 0
    for ref_class in ref_classes:
        if ref_class in target_classes:
            class_matches += 1
    
    # Return similarity score
    return class_matches / len(ref_classes) if ref_classes else 0.0


def compare_frames(target_frames, reference_data, yolo, threshold=0.5):
    """
    Compare frames with reference data using YOLO detector
    
    Args:
        target_frames (list): List of paths to frames
        reference_data (list): List of reference detections to compare against
        yolo (YOLODetector): Initialized detector object
        threshold (float): Similarity threshold (0.0-1.0)
        
    Returns:
        list: Boolean values indicating if each frame matches reference content
    """
    is_copied = []
    matches_count = 0
    
    with tqdm(total=len(target_frames), desc="Comparing Frames", unit="frame") as pbar:
        for i, frame_path in enumerate(target_frames):
            try:
                frame = cv2.imread(frame_path)
                if frame is None:
                    is_copied.append(False)
                    pbar.write(f"Warning: Could not read frame {frame_path}")
                    pbar.update(1)
                    continue
                
                # Get detections for this frame
                results = yolo.detect(frame)
                
                # For single frame processing, YOLO detector returns a list containing one list of detections
                # We need to extract that inner list
                frame_detections = results[0] if results and isinstance(results, list) else []
                
                # Calculate max similarity with any reference
                max_similarity = 0
                for ref in reference_data:
                    similarity = calculate_similarity(ref, frame_detections)
                    max_similarity = max(max_similarity, similarity)
                
                is_match = max_similarity >= threshold
                is_copied.append(is_match)
                
                if is_match:
                    matches_count += 1
                
                # Update progress bar with match info
                if i % 100 == 0 or i == len(target_frames) - 1:
                    match_percent = (matches_count / (i + 1)) * 100
                    pbar.set_postfix({"Matches": f"{matches_count}/{i+1} ({match_percent:.2f}%)"}, refresh=True)
                
                # Clean up to free memory
                del frame
                
            except Exception as e:
                is_copied.append(False)
                pbar.write(f"Error processing frame {frame_path}: {str(e)}")
                import traceback
                pbar.write(traceback.format_exc())
                
            pbar.update(1)
    
    return is_copied


def print_match_stats(is_copied, target_frames):
    """
    Print match statistics
    
    Args:
        is_copied (list): List of boolean values indicating matches
        target_frames (list): List of frame paths
    """
    match_count = sum(is_copied)
    total_frames = len(target_frames)
    match_percent = (match_count / total_frames) * 100 if total_frames > 0 else 0
    
    print(f"Match percentage: {match_percent:.2f}% ({match_count}/{total_frames} frames)")
    
    # Print sample matches if available
    if match_count > 0:
        print("Sample matches:")
        samples = min(5, match_count)
        sample_indices = [i for i, matched in enumerate(is_copied) if matched][:samples]
        for idx in sample_indices:
            print(f"  - {os.path.basename(target_frames[idx])}")