import cv2
import os
import logging
import json
import sys

def extract_frames(video_path, output_dir="temp_frames", frame_interval=1):
    """Extracts frames from video with validation and error handling"""
    try:
        os.makedirs(output_dir, exist_ok=True)
        cap = cv2.VideoCapture(video_path)
        frames = []
        frame_count = 0
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))

        if not cap.isOpened():
            raise ValueError(f"Failed to open video: {video_path}")
            
        # Send initial progress report
        progress_json = {
            "type": "progress",
            "task": "extracting_frames",
            "current": 0,
            "total": total_frames,
            "percent": 0
        }
        print(f"PROGRESS_JSON:{json.dumps(progress_json)}", flush=True)

        while True:
            ret, frame = cap.read()
            if not ret:
                break

            if frame_count % frame_interval == 0:
                # Generate absolute path for clarity
                frame_path = os.path.abspath(
                    os.path.join(output_dir, f"frame_{frame_count:06d}.jpg")
                )

                # Validate frame before saving
                if frame is None or frame.size == 0:
                    logging.warning(f"Skipped empty frame at count {frame_count}")
                    continue

                # Save frame and verify success
                success = cv2.imwrite(frame_path, frame)
                if success:
                    frames.append(frame_path)
                else:
                    logging.error(f"Failed to save frame {frame_count} to {frame_path}")
            
            # Report progress every 30 frames or so
            if frame_count % 30 == 0 or frame_count == total_frames - 1:
                progress_percent = min(99, int((frame_count / total_frames) * 100))
                progress_json = {
                    "type": "progress",
                    "task": "extracting_frames",
                    "current": frame_count,
                    "total": total_frames,
                    "percent": progress_percent
                }
                print(f"PROGRESS_JSON:{json.dumps(progress_json)}", flush=True)

            frame_count += 1

        cap.release()
        
        # Send final progress update
        final_progress = {
            "type": "progress",
            "task": "extracting_frames",
            "current": total_frames,
            "total": total_frames,
            "percent": 100,
            "valid_frames": len(frames)
        }
        print(f"PROGRESS_JSON:{json.dumps(final_progress)}", flush=True)
        
        logging.info(f"Extracted {len(frames)} valid frames from {frame_count} total frames")
        return frames

    except Exception as e:
        logging.error(f"Frame extraction failed: {str(e)}")
        if 'cap' in locals() and cap.isOpened():
            cap.release()
        raise