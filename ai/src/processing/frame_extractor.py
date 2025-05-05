import cv2
import os
import logging
import shutil
from tqdm import tqdm

def extract_frames(video_path, output_dir="temp_frames", frame_interval=1, target_size=None):
    """
    Extracts frames from video with tqdm progress tracking and improved error handling
    
    Args:
        video_path (str): Path to video file
        output_dir (str): Directory to save extracted frames
        frame_interval (int): Extract every nth frame
        target_size (tuple): Optional resize dimensions (width, height)
        
    Returns:
        list: Paths to successfully extracted frames
    """
    try:
        # Create output directory if it doesn't exist, or use existing one
        os.makedirs(output_dir, exist_ok=True)
        
        # Optional: Clear existing files in the directory if desired
        # Uncomment the following block to clean the directory before extraction
        # for file in os.listdir(output_dir):
        #     file_path = os.path.join(output_dir, file)
        #     if os.path.isfile(file_path):
        #         os.remove(file_path)

        # Open video file
        cap = cv2.VideoCapture(video_path)
        frames = []
        
        if not cap.isOpened():
            raise ValueError(f"Failed to open video: {video_path}")

        # Get video properties
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        base_name = os.path.splitext(os.path.basename(video_path))[0]

        # Validate target size format
        if target_size and not (isinstance(target_size, tuple) and len(target_size) == 2):
            raise ValueError("Target size must be a tuple of (width, height)")

        # Check if output directory is writable
        test_file = os.path.join(output_dir, "test_write.txt")
        try:
            with open(test_file, 'w') as f:
                f.write("test")
            os.remove(test_file)
        except Exception as e:
            raise PermissionError(f"Cannot write to output directory: {output_dir}. Error: {str(e)}")

        # Check available disk space
        free_space = shutil.disk_usage(output_dir).free
        if free_space < 1024 * 1024 * 100:  # 100MB minimum
            logging.warning(f"Low disk space: {free_space / (1024*1024):.2f} MB free")

        # Process frames
        with tqdm(total=total_frames, desc="Extracting Frames", unit="frame") as pbar:
            frame_count = 0
            save_errors = 0
            
            while True:
                ret, frame = cap.read()
                if not ret:
                    break

                if frame_count % frame_interval == 0:
                    try:
                        if frame is None or frame.size == 0:
                            logging.warning(f"Skipped empty frame at count {frame_count}")
                            frame_count += 1
                            pbar.update(1)
                            continue
                            
                        if target_size:
                            frame = cv2.resize(frame, target_size)
                            
                        frame_path = os.path.join(output_dir, f"{base_name}_frame{frame_count:06d}.jpg")
                        
                        # Save with quality parameter and error handling
                        success = cv2.imwrite(frame_path, frame, [cv2.IMWRITE_JPEG_QUALITY, 95])
                        
                        if success:
                            frames.append(frame_path)
                            pbar.set_postfix({"Saved": len(frames)}, refresh=True)
                        else:
                            save_errors += 1
                            
                            # Try with different format if JPEG fails
                            alt_path = os.path.join(output_dir, f"{base_name}_frame{frame_count:06d}.png")
                            alt_success = cv2.imwrite(alt_path, frame)
                            
                            if alt_success:
                                frames.append(alt_path)
                                logging.warning(f"Saved frame {frame_count} as PNG instead of JPEG")
                            else:
                                logging.error(f"Failed to save frame {frame_count} in any format")
                                
                                # If too many errors, check disk space again
                                if save_errors > 5:
                                    free_space = shutil.disk_usage(output_dir).free
                                    if free_space < 1024 * 1024 * 50:  # 50MB minimum
                                        logging.error(f"Critical low disk space: {free_space / (1024*1024):.2f} MB free")
                                        raise IOError("Disk space too low to continue")
                                        
                    except Exception as frame_error:
                        logging.error(f"Frame processing error at frame {frame_count}: {str(frame_error)}")
                        # Continue to next frame instead of raising exception

                frame_count += 1
                pbar.update(1)

        cap.release()
        logging.info(f"Extracted {len(frames)} valid frames from {total_frames} total frames")
        if save_errors > 0:
            logging.warning(f"Encountered {save_errors} frame saving errors")
            
        return frames

    except Exception as e:
        logging.error(f"Frame extraction failed: {str(e)}")
        if 'cap' in locals() and cap is not None and cap.isOpened():
            cap.release()
        raise