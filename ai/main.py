import os
import cv2
import time
import traceback
import numpy as np
import sys
import gc
import torch
from datetime import datetime
from tqdm import tqdm
from firebase_admin import firestore
from src.firebase.firebase_handler import FirebaseHandler
from src.models.yolo_detector import YOLODetector

# ======================
# Configuration
# ======================
REFERENCE_VIDEO_PATH = "assets/videos/sample_video.mp4"
FRAME_EXTRACTION_INTERVAL = 1
PROCESSING_SLEEP_TIME = 30
MIN_SIMILARITY_THRESHOLD = 0.75
FRAME_TARGET_SIZE = (640, 360)  # Reduced resolution for memory optimization
BATCH_SIZE = 8  # Batch size for processing

# ======================
# Utility Functions
# ======================
def create_required_directories():
    """Create necessary directories"""
    required_dirs = [
        'assets/frames',
        'assets/videos',
        'processing/queue'
    ]
    
    for directory in required_dirs:
        os.makedirs(directory, exist_ok=True)
        print(f"Ensured directory exists: {directory}")

def generate_timestamps(copied_frames, fps=30):
    """Convert frame indices to time ranges with improved handling"""
    if not copied_frames:
        return []
    
    # Convert boolean array to frame indices if needed
    if all(isinstance(x, bool) for x in copied_frames):
        copied_frames = [i for i, is_copied in enumerate(copied_frames) if is_copied]
    
    if not copied_frames:  # Double-check after conversion
        return []
        
    # Sort and deduplicate frames
    copied_frames = sorted(set(copied_frames))
    
    timestamps = []
    current_start = current_end = copied_frames[0]
    
    for frame in copied_frames[1:]:
        if frame == current_end + 1:
            current_end = frame
        else:
            timestamps.append({
                'start': frame_to_time(current_start, fps),
                'end': frame_to_time(current_end, fps)
            })
            current_start = current_end = frame
    
    # Always add the final timestamp range
    timestamps.append({
        'start': frame_to_time(current_start, fps),
        'end': frame_to_time(current_end, fps)
    })
    
    return timestamps

def frame_to_time(frame_number, fps):
    """Convert frame index to timestamp with proper formatting"""
    total_seconds = frame_number / fps
    hours = int(total_seconds // 3600)
    minutes = int((total_seconds % 3600) // 60)
    seconds = int(total_seconds % 60)
    return f"{hours:02d}:{minutes:02d}:{seconds:02d}"

def cleanup(video_path=None, frames=None):
    """Clean temporary files with improved error handling"""
    try:
        if video_path and os.path.exists(video_path):
            os.remove(video_path)
            print(f"Removed temporary video: {video_path}")
            
        if frames:
            removed_count = 0
            for frame in frames:
                if frame and os.path.exists(frame):
                    os.remove(frame)
                    removed_count += 1
            if removed_count > 0:
                print(f"Removed {removed_count} temporary frame files")
    except Exception as e:
        print(f"Cleanup error: {e}")

def clear_gpu_memory():
    """Clear GPU memory if available"""
    if torch.cuda.is_available():
        torch.cuda.empty_cache()
        gc.collect()

# ======================
# Core Functionality
# ======================
def load_reference_data(yolo):
    """Load and process reference video with improved error handling"""
    try:
        if not os.path.exists(REFERENCE_VIDEO_PATH):
            raise FileNotFoundError(f"Reference video missing at {REFERENCE_VIDEO_PATH}")
        
        print(f"Loading reference video: {REFERENCE_VIDEO_PATH}")
        
        # Extract frames from reference video
        ref_frames = extract_frames(
            REFERENCE_VIDEO_PATH,
            output_dir="assets/frames",
            frame_interval=FRAME_EXTRACTION_INTERVAL,
            target_size=FRAME_TARGET_SIZE
        )
        
        if not ref_frames:
            raise ValueError("No frames extracted from reference video")
            
        print(f"Extracted {len(ref_frames)} reference frames")
        
        # Process reference frames
        results = []
        for batch_start in tqdm(range(0, len(ref_frames), BATCH_SIZE), desc="Processing Reference Frames"):
            try:
                # Process frames in batches to optimize memory
                batch_frames = ref_frames[batch_start:batch_start + BATCH_SIZE]
                batch_images = []
                
                # Load images in batch
                for frame_path in batch_frames:
                    frame = cv2.imread(frame_path)
                    if frame is None:
                        print(f"Warning: Could not read frame {frame_path}")
                        continue
                    batch_images.append(frame)
                
                # Process batch
                if batch_images:
                    batch_detections = yolo.detect(batch_images)
                    results.extend(batch_detections)
                
                # Clear memory after batch
                del batch_images
                clear_gpu_memory()
                
            except Exception as batch_error:
                print(f"Error processing batch starting at frame {batch_start}: {batch_error}")
        
        if not results:
            raise ValueError("No valid detections found in reference video")
            
        print(f"Reference data prepared: {len(results)} detection sets")
        return results
        
    except Exception as e:
        print(f"Failed to load reference data: {e}")
        traceback.print_exc()
        return []

def extract_frames(video_path, output_dir, frame_interval=1, target_size=None):
    """Extract frames from video with compatibility handling"""
    # Create output directory
    os.makedirs(output_dir, exist_ok=True)
    
    # Check if GPU-accelerated version is available
    try:
        from src.processing.frame_extractor import extract_frames_gpu
        return extract_frames_gpu(
            video_path, 
            output_dir=output_dir,
            frame_interval=frame_interval,
            target_size=target_size
        )
    except (ImportError, AttributeError):
        # Fall back to standard frame extraction
        from src.processing.frame_extractor import extract_frames as extract_frames_cpu
        return extract_frames_cpu(
            video_path,
            output_dir=output_dir,
            frame_interval=frame_interval,
            target_size=target_size
        )

# ======================
# Video Processing
# ======================
def process_video(firebase, video, reference_data, yolo):
    """Process single video with detailed progress tracking and improved error handling"""
    video_id = video.get('id')
    video_path = None
    target_frames = []

    try:
        # Update status to processing
        firebase.mark_as_processing(video_id)
        print(f"\n{'='*40}\nProcessing video: {video_id}\n{'='*40}")

        # Download video with progress
        try:
            from src.processing.downloader import download_video
            video_path = download_video(
                f"https://www.youtube.com/watch?v={video_id}",
                video_id
            )
            
            if not video_path or not os.path.exists(video_path):
                raise FileNotFoundError(f"Failed to download video {video_id}")
                
            print(f"Downloaded video to {video_path}")
        except Exception as download_error:
            raise Exception(f"Download failed: {download_error}")

        # Get video info
        try:
            cap = cv2.VideoCapture(video_path)
            if not cap.isOpened():
                raise ValueError(f"Could not open video file: {video_path}")
                
            fps = cap.get(cv2.CAP_PROP_FPS)
            total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
            cap.release()
            
            print(f"Video info: {total_frames} frames at {fps} FPS")
        except Exception as video_info_error:
            raise Exception(f"Failed to read video info: {video_info_error}")

        # Extract frames with progress
        try:
            target_frames = extract_frames(
                video_path,
                output_dir=f"assets/frames/{video_id}",
                frame_interval=FRAME_EXTRACTION_INTERVAL,
                target_size=FRAME_TARGET_SIZE
            )
            
            if not target_frames:
                raise ValueError("No frames extracted from video")
                
            print(f"Extracted {len(target_frames)} frames")
        except Exception as extraction_error:
            raise Exception(f"Frame extraction failed: {extraction_error}")

        # Compare frames with progress
        try:
            from src.processing.compare_results import compare_frames
            copied_frames = compare_frames(
                target_frames,
                reference_data, 
                yolo,
                threshold=MIN_SIMILARITY_THRESHOLD,
                batch_size=BATCH_SIZE
            )
            
            if not copied_frames:
                raise ValueError("Frame comparison failed")
        except Exception as comparison_error:
            raise Exception(f"Comparison failed: {comparison_error}")

        # Calculate results
        matched_frames = sum(copied_frames)
        copy_percent = (matched_frames / len(target_frames)) * 100 if target_frames else 0
        print(f"\nMatch percentage: {copy_percent:.2f}% ({matched_frames}/{len(target_frames)} frames)")

        # Generate timestamps
        timestamps = generate_timestamps([i for i, m in enumerate(copied_frames) if m], fps)
        print(f"Generated {len(timestamps)} timestamp ranges")

        # Save results
        firebase.save_results(video_id, {
            'video_id': video_id,
            'status': 'completed',
            'copied': copy_percent >= MIN_SIMILARITY_THRESHOLD,
            'copy_percentage': round(copy_percent, 2),
            'timestamps': timestamps,
            'processed_at': firestore.SERVER_TIMESTAMP
        })
        print(f"\n✅ Successfully processed {video_id}")

    except Exception as e:
        print(f"\nProcessing failed: {e}")
        firebase.mark_as_failed(video_id, str(e))
        traceback.print_exc()
    finally:
        cleanup(video_path, target_frames)
        clear_gpu_memory()
        print(f"\n{'='*40}\n")

# ======================
# Main Application
# ======================
def main():
    """Application entry point with improved error handling and resource management"""
    try:
        print(f"Starting video similarity detection service at {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        create_required_directories()
        
        firebase = FirebaseHandler()
        yolo = YOLODetector()
        
        # Display system information
        gpu_info = "GPU available" if torch.cuda.is_available() else "GPU not available"
        print(f"System info: Python {sys.version.split()[0]}, OpenCV {cv2.__version__}, {gpu_info}")
        if torch.cuda.is_available():
            print(f"GPU: {torch.cuda.get_device_name(0)}")
        
        # Load reference data
        print("\nLoading reference data...")
        reference_data = load_reference_data(yolo)
        
        if not reference_data:
            print("ERROR: Failed to load reference data. Exiting.")
            return
            
        print("\nService is now running. Looking for pending videos...")
        
        while True:
            try:
                pending_videos = firebase.get_pending_videos()
                
                if not pending_videos:
                    print(f"No pending videos - checking again in {PROCESSING_SLEEP_TIME}s")
                    time.sleep(PROCESSING_SLEEP_TIME)
                    continue
                
                print(f"Found {len(pending_videos)} video(s) to process")
                for idx, video in enumerate(pending_videos, 1):
                    print(f"Processing video {idx}/{len(pending_videos)}")
                    process_video(firebase, video, reference_data, yolo)
                    clear_gpu_memory()  # Clean up memory between videos
                    
            except KeyboardInterrupt:
                print("\nReceived interrupt signal. Shutting down gracefully...")
                break
            except Exception as loop_error:
                print(f"Processing cycle error: {loop_error}")
                traceback.print_exc()
                print(f"Waiting {PROCESSING_SLEEP_TIME}s before retry...")
                time.sleep(PROCESSING_SLEEP_TIME)
                
    except Exception as e:
        print(f"Critical failure: {e}")
        traceback.print_exc()
    finally:
        print(f"Service stopped at {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")

if __name__ == "__main__":
    # Set UTF-8 encoding for Windows compatibility
    if sys.platform.startswith('win'):
        import io
        sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
        sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')
    
    main()