import cv2
from tqdm import tqdm

def calculate_similarity(ref_detections, target_detections):
    """Calculate similarity based on class matches."""
    ref_classes = {d['class'] for d in ref_detections}
    target_classes = {d['class'] for d in target_detections}
    intersection = ref_classes.intersection(target_classes)
    return len(intersection) / len(ref_classes) if len(ref_classes) > 0 else 0

def compare_frames(target_frames, reference_data, yolo, threshold=0.5):
    """Compare frames with single progress bar"""
    is_copied = []
    
    # Remove nested tqdm from function call
    with tqdm(total=len(target_frames), desc="Comparing Frames", unit="frame") as pbar:
        for frame_path in target_frames:  # Remove tqdm() here
            try:
                frame = cv2.imread(frame_path)
                if frame is None:
                    is_copied.append(False)
                    pbar.write(f"Warning: Could not read frame {frame_path}")
                    continue
                
                target_detections = yolo.detect(frame)
                max_similarity = max(calculate_similarity(ref, target_detections) for ref in reference_data)
                is_copied.append(max_similarity >= threshold)
                
                del frame
                
            except Exception as e:
                is_copied.append(False)
                pbar.write(f"Error processing frame {frame_path}: {str(e)}")
                
            pbar.update(1)
    
    return is_copied