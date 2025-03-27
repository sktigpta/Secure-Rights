import os
import cv2
import time
import traceback
import numpy as np
import sys
from datetime import datetime
from tqdm import tqdm
from firebase_admin import firestore
from src.firebase.firebase_handler import FirebaseHandler
from src.processing.downloader import download_video
from src.processing.frame_extractor import extract_frames
from src.processing.compare_results import compare_frames
from src.models.yolo_detector import YOLODetector

# ======================
# Configuration
# ======================
REFERENCE_VIDEO_PATH = "assets/videos/sample_video.mp4"
FRAME_EXTRACTION_INTERVAL = 1
PROCESSING_SLEEP_TIME = 30
MIN_SIMILARITY_THRESHOLD = 0.75
FRAME_TARGET_SIZE = (640, 360)  # Reduced resolution for memory optimization

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

def generate_timestamps(copied_frames, fps=30):
    """Convert frame indices to time ranges"""
    if not copied_frames:
        return []
    
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
    
    timestamps.append({
        'start': frame_to_time(current_start, fps),
        'end': frame_to_time(current_end, fps)
    })
    
    return timestamps

def frame_to_time(frame_number, fps):
    """Convert frame index to timestamp"""
    total_seconds = frame_number / fps
    return datetime.utcfromtimestamp(total_seconds).strftime('%H:%M:%S')

def cleanup(video_path, frames):
    """Clean temporary files"""
    try:
        if video_path and os.path.exists(video_path):
            os.remove(video_path)
        for frame in frames or []:
            if os.path.exists(frame):
                os.remove(frame)
    except Exception as e:
        print(f"Cleanup error: {e}")

# ======================
# Core Functionality
# ======================
def load_reference_data(yolo):
    try:
        if not os.path.exists(REFERENCE_VIDEO_PATH):
            raise FileNotFoundError(f"Reference video missing at {REFERENCE_VIDEO_PATH}")
        
        ref_frames = extract_frames(
            REFERENCE_VIDEO_PATH,
            output_dir="assets/frames",
            frame_interval=FRAME_EXTRACTION_INTERVAL,
            target_size=FRAME_TARGET_SIZE
        )
        
        results = []
        for frame_path in tqdm(ref_frames, desc="Processing Reference Frames"):
            try:
                frame = cv2.imread(frame_path)
                if frame is None:
                    print(f"Warning: Could not read frame {frame_path}")
                    continue
                
                detections = yolo.detect(frame)
                results.append(detections)
                del frame  # Explicit memory release
            except Exception as frame_error:
                print(f"Error processing frame {frame_path}: {frame_error}")
        
        return results
        
    except Exception as e:
        print(f"Failed to load reference data: {e}")
        traceback.print_exc()
        return []

# ======================
# Video Processing
# ======================
def process_video(firebase, video, reference_data, yolo):
    """Process single video with detailed progress tracking"""
    video_id = video.get('id')
    video_path = None
    target_frames = []

    try:
        # Update status to processing
        firebase.mark_as_processing(video_id)
        print(f"\n{'='*40}\nProcessing video: {video_id}\n{'='*40}")

        # Download video with progress
        video_path = download_video(
            f"https://www.youtube.com/watch?v={video_id}",
            video_id
        )

        # Extract frames with progress
        target_frames = extract_frames(
            video_path,
            frame_interval=FRAME_EXTRACTION_INTERVAL,
            target_size=FRAME_TARGET_SIZE
        )
        print(f"Extracted {len(target_frames)} frames")

        if not target_frames:
            raise ValueError("No frames extracted")

        # Compare frames with progress
        copied_frames = compare_frames(
            target_frames,
            reference_data, 
            yolo
        )

        # Calculate results
        matched_frames = sum(copied_frames)
        copy_percent = (matched_frames / len(target_frames)) * 100
        print(f"\nMatch percentage: {copy_percent:.2f}% ({matched_frames}/{len(target_frames)} frames)")

        # Generate timestamps
        timestamps = generate_timestamps([i for i, m in enumerate(copied_frames) if m])

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
        print(f"\n{'='*40}\n")

# ======================
# Main Application
# ======================
def main():
    """Application entry point"""
    try:
        create_required_directories()
        
        firebase = FirebaseHandler()
        yolo = YOLODetector()
        
        # Load reference data
        print("Loading reference data...")
        reference_data = load_reference_data(yolo)
        
        while True:
            try:
                pending_videos = firebase.get_pending_videos()
                
                if not pending_videos:
                    print(f"No pending videos - checking again in {PROCESSING_SLEEP_TIME}s")
                    time.sleep(PROCESSING_SLEEP_TIME)
                    continue
                
                print(f"Found {len(pending_videos)} video(s) to process")
                for idx, video in enumerate(pending_videos, 1):
                    process_video(firebase, video, reference_data, yolo)
                    
            except KeyboardInterrupt:
                print("Shutting down gracefully")
                break
            except Exception as e:
                print(f"Processing error: {e}")
                time.sleep(10)
                
    except Exception as e:
        print(f"Critical failure: {e}")
    finally:
        print("Service stopped")

if __name__ == "__main__":
    # Set UTF-8 encoding for Windows compatibility
    if sys.platform.startswith('win'):
        import io
        sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
        sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')
    
    main()