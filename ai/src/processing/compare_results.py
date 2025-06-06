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
# Enhanced Timeline Functions
# ======================

def generate_detailed_timestamps(copied_frames, fps=30, min_duration=1.0):
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
                    'start_time': frame_to_detailed_time(current_start, fps),
                    'end_time': frame_to_detailed_time(current_end, fps),
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
            'start_time': frame_to_detailed_time(current_start, fps),
            'end_time': frame_to_detailed_time(current_end, fps),
            'duration': format_duration(segment_duration),
            'duration_seconds': round(segment_duration, 2),
            'frame_count': current_end - current_start + 1
        })
    
    return timestamps

def frame_to_detailed_time(frame_number, fps):
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
        print(f"{i:<3} {ts['start_time']:<12} {ts['end_time']:<12} {ts['duration']:<10} "
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
                f.write(f"{i:<3} {ts['start_time']:<15} {ts['end_time']:<15} {ts['duration']:<12} "
                       f"{ts['frame_count']:<8} {percentage:.1f}%\n")
            
            f.write(f"\nSTATISTICS:\n")
            f.write(f"Average segment duration: {format_duration(total_copied_duration/len(timestamps))}\n")
            f.write(f"Longest segment: {format_duration(max(ts['duration_seconds'] for ts in timestamps))}\n")
            f.write(f"Shortest segment: {format_duration(min(ts['duration_seconds'] for ts in timestamps))}\n")
        else:
            f.write(f"No copied segments detected!\n")
    
    print(f"Timeline analysis saved to: {filename}")
    return filename

# ======================
# Enhanced Video Processing Function
# ======================

def process_video_with_detailed_timeline(firebase, video, reference_data, yolo):
    """Enhanced video processing with detailed timeline output"""
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
            from src.processing.frame_extractor import extract_frames
            target_frames = extract_frames(
                video_path,
                output_dir=f"assets/frames/{video_id}",
                frame_interval=1,  # Extract every frame for detailed analysis
                target_size=(640, 360)
            )
            
            if not target_frames:
                raise ValueError("No frames extracted from video")
                
            print(f"Extracted {len(target_frames)} frames")
        except Exception as extraction_error:
            raise Exception(f"Frame extraction failed: {extraction_error}")

        # Compare frames using YOLO
        try:
            from src.processing.compare_results import compare_frames
            copied_frames = compare_frames(
                target_frames,
                reference_data, 
                yolo,
                threshold=0.75,  # Your similarity threshold
                batch_size=8
            )
            
            if not copied_frames:
                raise ValueError("Frame comparison failed")
        except Exception as comparison_error:
            raise Exception(f"Comparison failed: {comparison_error}")

        # Calculate results
        matched_frames = sum(copied_frames)
        copy_percent = (matched_frames / len(target_frames)) * 100 if target_frames else 0
        
        print(f"\nYOLO Analysis Results:")
        print(f"Match percentage: {copy_percent:.2f}% ({matched_frames}/{len(target_frames)} frames)")
        
        # Generate detailed timestamps
        detailed_timestamps = generate_detailed_timestamps(copied_frames, fps, min_duration=0.5)
        
        # Print detailed timeline to console
        print_detailed_timeline(detailed_timestamps, video_id, copy_percent, len(target_frames), fps)
        
        # Save timeline to file
        timeline_file = save_timeline_to_file(detailed_timestamps, video_id, copy_percent, len(target_frames), fps)
        
        # Prepare simplified timestamps for Firebase (backward compatibility)
        simple_timestamps = [
            {
                'start': ts['start_time'].split('.')[0],  # Remove milliseconds for Firebase
                'end': ts['end_time'].split('.')[0]
            }
            for ts in detailed_timestamps
        ]

        # Save results to Firebase
        firebase.save_results(video_id, {
            'video_id': video_id,
            'status': 'completed',
            'copied': copy_percent >= 75,  # Your threshold
            'copy_percentage': round(copy_percent, 2),
            'timestamps': simple_timestamps,
            'detailed_analysis': {
                'total_segments': len(detailed_timestamps),
                'total_copied_duration': sum(ts['duration_seconds'] for ts in detailed_timestamps),
                'timeline_file': timeline_file
            },
            'model_used': "YOLOv8",
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

# Keep all your existing utility functions (cleanup, clear_gpu_memory, etc.)
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