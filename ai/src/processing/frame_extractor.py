import cv2
import os
import logging
from tqdm import tqdm
import numpy as np

def extract_frames(video_path, output_dir="temp_frames", frame_interval=1, target_size=None):
    """
    Extracts frames from video with optimized memory management and error handling
    
    Args:
        video_path (str): Path to the video file
        output_dir (str): Directory to save extracted frames
        frame_interval (int): Extract every Nth frame
        target_size (tuple): Optional (width, height) to resize frames
        
    Returns:
        list: Paths to extracted frame images
    """
    try:
        # Create output directory if it doesn't exist
        os.makedirs(output_dir, exist_ok=True)
        
        # Open video capture
        cap = cv2.VideoCapture(video_path)
        frames = []
        
        if not cap.isOpened():
            raise ValueError(f"Failed to open video: {video_path}")

        # Get video properties
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        base_name = os.path.splitext(os.path.basename(video_path))[0]

        # Validate target size format
        if target_size and not (isinstance(target_size, tuple) and len(target_size) == 2):
            logging.warning("Invalid target_size format, using original size")
            target_size = None

        # Process frames with progress tracking
        with tqdm(total=total_frames, desc="Extracting Frames", unit="frame") as pbar:
            frame_count = 0
            frame_saved_count = 0
            
            while True:
                # Read frame
                ret, frame = cap.read()
                if not ret:
                    break

                # Process every Nth frame
                if frame_count % frame_interval == 0:
                    try:
                        # Skip empty frames
                        if frame is None or frame.size == 0:
                            logging.warning(f"Skipped empty frame at count {frame_count}")
                            continue
                            
                        # Resize if needed
                        if target_size:
                            frame = cv2.resize(frame, target_size)
                        
                        # Generate frame filename
                        frame_path = os.path.join(
                            output_dir, 
                            f"{base_name}_frame{frame_count:06d}.jpg"
                        )
                        
                        # Save frame with quality optimization
                        compression_params = [cv2.IMWRITE_JPEG_QUALITY, 90]
                        if cv2.imwrite(frame_path, frame, compression_params):
                            frames.append(frame_path)
                            frame_saved_count += 1
                            
                            # Update progress
                            if frame_saved_count % 10 == 0:
                                pbar.set_postfix({"Saved": frame_saved_count})
                        else:
                            logging.error(f"Failed to save frame {frame_count}")
                        
                        # Explicitly release memory
                        del frame

                    except Exception as frame_error:
                        logging.error(f"Frame processing error at frame {frame_count}: {str(frame_error)}")
                        continue

                # Update counters and progress
                frame_count += 1
                pbar.update(1)

        # Clean up
        cap.release()
        
        # Log results
        if frames:
            logging.info(f"Extracted {len(frames)} frames from video")
        else:
            logging.warning("No frames were extracted from video")
            
        return frames

    except Exception as e:
        logging.error(f"Frame extraction failed: {str(e)}")
        if 'cap' in locals() and cap is not None and cap.isOpened():
            cap.release()
        raise