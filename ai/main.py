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

# YOLOv8 Model Selection
YOLO_MODEL = "src/models/pretrained/yolov8n.pt"

# ======================
# Utility Functions
# ======================
def create_required_directories():
    """Create necessary directories including results directory"""
    required_dirs = [
        'assets/frames',
        'assets/videos',
        'processing/queue',
        'results'  # For timeline files
    ]
    
    for directory in required_dirs:
        os.makedirs(directory, exist_ok=True)
        print(f"Ensured directory exists: {directory}")

def generate_timestamps(copied_frames, fps=30, min_duration=0.5):
    """
    Generate detailed timestamps with enhanced formatting and filtering
    
    Args:
        copied_frames (list): Boolean array or frame indices of copied frames
        fps (float): Frames per second of the video
        min_duration (float): Minimum duration in seconds to include a segment
    
    Returns:
        list: Detailed timestamp information
    """
    if not copied_frames:
        return []
    
    # Convert boolean array to frame indices if needed
    if all(isinstance(x, bool) for x in copied_frames):
        copied_frame_indices = [i for i, is_copied in enumerate(copied_frames) if is_copied]
    else:
        copied_frame_indices = copied_frames
    
    if not copied_frame_indices:
        return []
        
    # Sort and deduplicate frames
    copied_frame_indices = sorted(set(copied_frame_indices))
    
    timestamps = []
    current_start = current_end = copied_frame_indices[0]
    
    # Group consecutive frames into segments
    for frame in copied_frame_indices[1:]:
        if frame == current_end + 1:
            current_end = frame
        else:
            # End of current segment
            segment_duration = (current_end - current_start + 1) / fps
            if segment_duration >= min_duration:  # Only include segments longer than min_duration
                timestamps.append({
                    'start_frame': current_start,
                    'end_frame': current_end,
                    'start': frame_to_time(current_start, fps),
                    'end': frame_to_time(current_end, fps),
                    'duration': format_duration(segment_duration),
                    'duration_seconds': round(segment_duration, 2),
                    'frame_count': current_end - current_start + 1
                })
            current_start = current_end = frame
    
    # Always add the final segment
    segment_duration = (current_end - current_start + 1) / fps
    if segment_duration >= min_duration:
        timestamps.append({
            'start_frame': current_start,
            'end_frame': current_end,
            'start': frame_to_time(current_start, fps),
            'end': frame_to_time(current_end, fps),
            'duration': format_duration(segment_duration),
            'duration_seconds': round(segment_duration, 2),
            'frame_count': current_end - current_start + 1
        })
    
    return timestamps

def frame_to_time(frame_number, fps):
    """Convert frame index to detailed timestamp with milliseconds"""
    total_seconds = frame_number / fps
    hours = int(total_seconds // 3600)
    minutes = int((total_seconds % 3600) // 60)
    seconds = int(total_seconds % 60)
    milliseconds = int((total_seconds % 1) * 1000)
    
    if hours > 0:
        return f"{hours:02d}:{minutes:02d}:{seconds:02d}.{milliseconds:03d}"
    else:
        return f"{minutes:02d}:{seconds:02d}.{milliseconds:03d}"

def format_duration(duration_seconds):
    """Format duration in a human-readable way"""
    if duration_seconds < 60:
        return f"{duration_seconds:.1f}s"
    elif duration_seconds < 3600:
        minutes = int(duration_seconds // 60)
        seconds = duration_seconds % 60
        return f"{minutes}m {seconds:.1f}s"
    else:
        hours = int(duration_seconds // 3600)
        minutes = int((duration_seconds % 3600) // 60)
        seconds = duration_seconds % 60
        return f"{hours}h {minutes}m {seconds:.1f}s"

def print_detailed_timeline(timestamps, video_id, copy_percent, total_frames, fps):
    """Print detailed timeline information to console"""
    print(f"\n{'='*80}")
    print(f"DETAILED TIMELINE ANALYSIS FOR VIDEO: {video_id}")
    print(f"{'='*80}")
    print(f"Overall Copy Percentage: {copy_percent:.2f}%")
    print(f"Total Frames: {total_frames}")
    print(f"Video FPS: {fps:.2f}")
    print(f"Detected Segments: {len(timestamps)}")
    
    if not timestamps:
        print("No copied segments detected!")
        return
    
    # Calculate total copied duration
    total_copied_duration = sum(ts['duration_seconds'] for ts in timestamps)
    total_video_duration = total_frames / fps
    
    print(f"Total Copied Duration: {format_duration(total_copied_duration)}")
    print(f"Total Video Duration: {format_duration(total_video_duration)}")
    print(f"Duration Percentage: {(total_copied_duration/total_video_duration)*100:.1f}%")
    
    print(f"\n{'='*80}")
    print(f"COPIED SEGMENTS TIMELINE:")
    print(f"{'='*80}")
    print(f"{'#':<3} {'Start Time':<12} {'End Time':<12} {'Duration':<10} {'Frames':<8} {'%':<6}")
    print(f"{'-'*80}")
    
    for i, ts in enumerate(timestamps, 1):
        percentage = (ts['frame_count'] / total_frames) * 100
        print(f"{i:<3} {ts['start']:<12} {ts['end']:<12} {ts['duration']:<10} "
              f"{ts['frame_count']:<8} {percentage:.1f}%")
    
    print(f"{'-'*80}")
    print(f"Total segments: {len(timestamps)}")
    print(f"Average segment duration: {format_duration(total_copied_duration/len(timestamps))}")
    print(f"Longest segment: {format_duration(max(ts['duration_seconds'] for ts in timestamps))}")
    print(f"Shortest segment: {format_duration(min(ts['duration_seconds'] for ts in timestamps))}")
    print(f"{'='*80}\n")

def save_timeline_to_file(timestamps, video_id, copy_percent, total_frames, fps, output_dir="results"):
    """Save detailed timeline to a text file"""
    os.makedirs(output_dir, exist_ok=True)
    
    filename = f"{output_dir}/{video_id}_timeline_analysis.txt"
    
    with open(filename, 'w') as f:
        f.write(f"DETAILED TIMELINE ANALYSIS\n")
        f.write(f"Video ID: {video_id}\n")
        f.write(f"Analysis Date: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
        f.write(f"="*80 + "\n\n")
        
        f.write(f"SUMMARY:\n")
        f.write(f"Overall Copy Percentage: {copy_percent:.2f}%\n")
        f.write(f"Total Frames: {total_frames}\n")
        f.write(f"Video FPS: {fps:.2f}\n")
        f.write(f"Detected Segments: {len(timestamps)}\n")
        
        if timestamps:
            total_copied_duration = sum(ts['duration_seconds'] for ts in timestamps)
            total_video_duration = total_frames / fps
            
            f.write(f"Total Copied Duration: {format_duration(total_copied_duration)}\n")
            f.write(f"Total Video Duration: {format_duration(total_video_duration)}\n")
            f.write(f"Duration Percentage: {(total_copied_duration/total_video_duration)*100:.1f}%\n\n")
            
            f.write(f"COPIED SEGMENTS:\n")
            f.write(f"{'#':<3} {'Start Time':<15} {'End Time':<15} {'Duration':<12} {'Frames':<8} {'%':<6}\n")
            f.write(f"{'-'*80}\n")
            
            for i, ts in enumerate(timestamps, 1):
                percentage = (ts['frame_count'] / total_frames) * 100
                f.write(f"{i:<3} {ts['start']:<15} {ts['end']:<15} {ts['duration']:<12} "
                       f"{ts['frame_count']:<8} {percentage:.1f}%\n")
            
            f.write(f"\nSTATISTICS:\n")
            f.write(f"Average segment duration: {format_duration(total_copied_duration/len(timestamps))}\n")
            f.write(f"Longest segment: {format_duration(max(ts['duration_seconds'] for ts in timestamps))}\n")
            f.write(f"Shortest segment: {format_duration(min(ts['duration_seconds'] for ts in timestamps))}\n")
        else:
            f.write(f"No copied segments detected!\n")
    
    print(f"Timeline analysis saved to: {filename}")
    return filename

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
    """Load and process reference video with YOLOv8"""
    try:
        if not os.path.exists(REFERENCE_VIDEO_PATH):
            raise FileNotFoundError(f"Reference video missing at {REFERENCE_VIDEO_PATH}")
        
        print(f"Loading reference video: {REFERENCE_VIDEO_PATH}")
        
        # Extract frames from reference video
        ref_frames = extract_frames(
            REFERENCE_VIDEO_PATH,
            output_dir="assets/frames/reference",
            frame_interval=FRAME_EXTRACTION_INTERVAL,
            target_size=FRAME_TARGET_SIZE
        )
        
        if not ref_frames:
            raise ValueError("No frames extracted from reference video")
            
        print(f"Extracted {len(ref_frames)} reference frames")
        
        # Process reference frames with YOLOv8
        results = []
        print("Processing reference frames with YOLOv8...")
        
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
                
                # Process batch with YOLOv8
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
    """Extract frames from video with improved error handling"""
    # Create output directory
    os.makedirs(output_dir, exist_ok=True)
    
    try:
        # Try GPU-accelerated version first
        from src.processing.frame_extractor import extract_frames_gpu
        return extract_frames_gpu(
            video_path, 
            output_dir=output_dir,
            frame_interval=frame_interval,
            target_size=target_size
        )
    except (ImportError, AttributeError, Exception) as e:
        print(f"GPU frame extraction not available, using CPU: {e}")
        # Fall back to standard frame extraction
        return extract_frames_cpu(video_path, output_dir, frame_interval, target_size)

def extract_frames_cpu(video_path, output_dir, frame_interval=1, target_size=None):
    """CPU-based frame extraction fallback"""
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        raise ValueError(f"Could not open video: {video_path}")
    
    frame_paths = []
    frame_count = 0
    saved_count = 0
    
    while True:
        ret, frame = cap.read()
        if not ret:
            break
        
        if frame_count % frame_interval == 0:
            # Resize if target size specified
            if target_size:
                frame = cv2.resize(frame, target_size)
            
            # Save frame
            frame_filename = f"frame_{saved_count:06d}.jpg"
            frame_path = os.path.join(output_dir, frame_filename)
            
            if cv2.imwrite(frame_path, frame):
                frame_paths.append(frame_path)
                saved_count += 1
        
        frame_count += 1
    
    cap.release()
    print(f"Extracted {saved_count} frames from {frame_count} total frames")
    return frame_paths

# ======================
# Video Processing
# ======================
def process_video(firebase, video, reference_data, yolo):
    """Process single video with YOLOv8 and detailed timeline output"""
    video_id = video.get('id')
    video_path = None
    target_frames = []

    try:
        # Update status to processing
        firebase.mark_as_processing(video_id)
        print(f"\n{'='*40}\nProcessing video: {video_id}\n{'='*40}")

        # Download video
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
            duration = total_frames / fps if fps > 0 else 0
            cap.release()
            
            print(f"Video info: {total_frames} frames at {fps:.2f} FPS ({duration:.1f}s)")
        except Exception as video_info_error:
            raise Exception(f"Failed to read video info: {video_info_error}")

        # Extract frames
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

        # Compare frames using YOLOv8
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
        
        print(f"\nYOLOv8 Analysis Results:")
        print(f"Match percentage: {copy_percent:.2f}% ({matched_frames}/{len(target_frames)} frames)")
        print(f"Threshold: {MIN_SIMILARITY_THRESHOLD}")
        print(f"Model used: {YOLO_MODEL}")

        # Generate detailed timestamps
        timestamps = generate_timestamps(copied_frames, fps, min_duration=0.5)
        
        # Print detailed timeline to console
        print_detailed_timeline(timestamps, video_id, copy_percent, len(target_frames), fps)
        
        # Save timeline to file
        timeline_file = save_timeline_to_file(timestamps, video_id, copy_percent, len(target_frames), fps)
        
        # Prepare simplified timestamps for Firebase (backward compatibility)
        simple_timestamps = [
            {
                'start': ts['start'].split('.')[0],  # Remove milliseconds for Firebase
                'end': ts['end'].split('.')[0]
            }
            for ts in timestamps
        ]

        # Save results to Firebase
        firebase.save_results(video_id, {
            'video_id': video_id,
            'status': 'completed',
            'copied': copy_percent >= (MIN_SIMILARITY_THRESHOLD * 100),
            'copy_percentage': round(copy_percent, 2),
            'timestamps': simple_timestamps,
            'detailed_analysis': {
                'total_segments': len(timestamps),
                'total_copied_duration': sum(ts['duration_seconds'] for ts in timestamps),
                'timeline_file': timeline_file
            },
            'model_used': YOLO_MODEL,
            'processed_at': firestore.SERVER_TIMESTAMP
        })
        
        print(f"\nSuccessfully processed {video_id}")
        print(f"Results saved to Firebase and timeline file: {timeline_file}")

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
    """Application entry point with YOLOv8 support and detailed timeline"""
    try:
        print(f"Starting YOLOv8 Video Similarity Detection Service")
        print(f"Started at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print(f"Using model: {YOLO_MODEL}")
        print("="*60)
        
        create_required_directories()
        
        # Initialize Firebase
        firebase = FirebaseHandler()
        print("Firebase initialized")
        
        # Initialize YOLOv8 detector
        print(f"\nInitializing YOLOv8 detector ({YOLO_MODEL})...")
        yolo = YOLODetector(
            model_path=YOLO_MODEL,
            conf_threshold=0.5,  # Confidence threshold
            iou_threshold=0.4,   # IoU threshold for NMS
            use_gpu=True
        )
        print(f"YOLOv8 detector initialized successfully")
        print(f"Detector info: {yolo}")
        
        # Load reference data
        print("\nLoading reference data...")
        reference_data = load_reference_data(yolo)
        
        if not reference_data:
            print("CRITICAL: No reference data loaded. Cannot proceed.")
            return
            
        print(f"Reference data loaded: {len(reference_data)} detection sets")
        
        # Main processing loop
        print("\nStarting main processing loop...")
        while True:
            try:
                # Get pending videos
                pending_videos = firebase.get_pending_videos()
                
                if not pending_videos:
                    print(f"No pending videos. Sleeping for {PROCESSING_SLEEP_TIME}s...")
                    time.sleep(PROCESSING_SLEEP_TIME)
                    continue
                
                print(f"Found {len(pending_videos)} pending videos")
                
                # Process each video
                for video in pending_videos:
                    try:
                        process_video(firebase, video, reference_data, yolo)
                    except Exception as video_error:
                        print(f"Failed to process video {video.get('id', 'unknown')}: {video_error}")
                        continue
                
                # Clear GPU memory after processing batch
                clear_gpu_memory()
                
            except KeyboardInterrupt:
                print("\nShutdown requested by user")
                break
            except Exception as loop_error:
                print(f"Main loop error: {loop_error}")
                traceback.print_exc()
                print(f"Sleeping {PROCESSING_SLEEP_TIME}s before retry...")
                time.sleep(PROCESSING_SLEEP_TIME)
                
    except Exception as main_error:
        print(f"CRITICAL ERROR: {main_error}")
        traceback.print_exc()
    finally:
        print("Service shutdown completed")

if __name__ == "__main__":
    # Print system info
    print("System Information:")
    print(f"Python version: {sys.version}")
    print(f"OpenCV version: {cv2.__version__}")
    print(f"PyTorch version: {torch.__version__}")
    print(f"CUDA available: {torch.cuda.is_available()}")
    if torch.cuda.is_available():
        print(f"GPU: {torch.cuda.get_device_name(0)}")
    print("="*60)
    
    main()