import cv2
import os
import logging
from tqdm import tqdm

def extract_frames(video_path, output_dir="temp_frames", frame_interval=1, target_size=None):
    """Extracts frames from video with tqdm progress tracking"""
    try:
        os.makedirs(output_dir, exist_ok=True)
        cap = cv2.VideoCapture(video_path)
        frames = []
        
        if not cap.isOpened():
            raise ValueError(f"Failed to open video: {video_path}")

        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        base_name = os.path.splitext(os.path.basename(video_path))[0]

        # Validate target size format
        if target_size and not (isinstance(target_size, tuple) and len(target_size) == 2):
            raise ValueError("Target size must be a tuple of (width, height)")

        with tqdm(total=total_frames, desc="Extracting Frames", unit="frame") as pbar:
            frame_count = 0
            while True:
                ret, frame = cap.read()
                if not ret:
                    break

                if frame_count % frame_interval == 0:
                    try:
                        if target_size:
                            frame = cv2.resize(frame, target_size)
                            
                        frame_path = os.path.join(output_dir, f"{base_name}_frame{frame_count:06d}.jpg")
                        
                        if frame is None or frame.size == 0:
                            logging.warning(f"Skipped empty frame at count {frame_count}")
                            continue

                        if cv2.imwrite(frame_path, frame):
                            frames.append(frame_path)
                            pbar.set_postfix({"Saved": len(frames)}, refresh=False)
                        else:
                            logging.error(f"Failed to save frame {frame_count}")

                    except Exception as frame_error:
                        logging.error(f"Frame processing error: {str(frame_error)}")
                        continue

                frame_count += 1
                pbar.update(1)

        cap.release()
        logging.info(f"Extracted {len(frames)} valid frames from {total_frames} total frames")
        return frames

    except Exception as e:
        logging.error(f"Frame extraction failed: {str(e)}")
        if 'cap' in locals() and cap.isOpened():
            cap.release()
        raise