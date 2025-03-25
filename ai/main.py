import os
import json
import cv2
import logging
import time
import traceback
import itertools
import numpy as np
import requests
import sys
import threading  # Add this import
from http.server import HTTPServer, SimpleHTTPRequestHandler  # Add this import
from datetime import datetime
from tqdm import tqdm
from firebase_admin import firestore
from src.firebase.firebase_handler import FirebaseHandler
from src.processing.downloader import download_video
from src.processing.frame_extractor import extract_frames
from src.processing.compare_results import compare_frames
from src.models.yolo_detector import YOLODetector

def start_health_check_server():
    """Start a simple HTTP server for Cloud Run health checks"""
    class HealthCheckHandler(SimpleHTTPRequestHandler):
        def do_GET(self):
            if self.path == '/healthz':
                self.send_response(200)
                self.send_header('Content-type', 'text/plain')
                self.end_headers()
                self.wfile.write(b'OK')
            else:
                self.send_error(404)

    port = int(os.environ.get('PORT', 8080))
    server = HTTPServer(('0.0.0.0', port), HealthCheckHandler)
    print(f"Health check server running on port {port}")
    server.serve_forever()

def loading_animation(duration=5):
    """Displays loading status as JSON for frontend visualization"""
    dots_cycle = itertools.cycle(["Loading.", "Loading..", "Loading..."])
    start_time = time.time()

    while time.time() - start_time < duration:
        progress = min(99, int((time.time() - start_time) / duration * 100))
        loading_json = {
            "type": "loading",
            "message": next(dots_cycle),
            "percent": progress
        }
        print(f"PROGRESS_JSON:{json.dumps(loading_json)}", flush=True)
        time.sleep(0.5)

    # Final completion message
    print(f"PROGRESS_JSON:{json.dumps({'type': 'loading', 'message': 'Done!', 'percent': 100})}", flush=True)

# ======================
# Configuration
# ======================
REFERENCE_VIDEO_PATH = "assets/videos/sample_video.mp4"
FRAME_EXTRACTION_INTERVAL = 1
PROCESSING_SLEEP_TIME = 30
MIN_SIMILARITY_THRESHOLD = 0.75

class UnicodeSafeStreamHandler(logging.StreamHandler):
    """Handler to safely output Unicode characters"""
    def __init__(self):
        super().__init__(stream=sys.stdout)  # Use stdout consistently
        
    def emit(self, record):
        try:
            msg = self.format(record)
            stream = self.stream
            msg += self.terminator
            stream.buffer.write(msg.encode('utf-8', errors='replace'))
            self.flush()  # Force immediate output
        except Exception:
            self.handleError(record)

# ======================
# Utility Functions
# ======================
def configure_logging():
    """Configure logging system"""
    log_dir = 'logs'
    os.makedirs(log_dir, exist_ok=True)
    
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(levelname)s - %(message)s',
        handlers=[
            logging.FileHandler(os.path.join(log_dir, 'processing.log')),
            UnicodeSafeStreamHandler()
        ],
        force=True
    )

def check_internet_connection():
    """Verify internet connectivity"""
    try:
        requests.get('https://www.google.com', timeout=5)
        logging.info("Connected to Web")
    except Exception as e:
        logging.error("No internet connection: %s", str(e))
        raise

def create_required_directories():
    """Create necessary directories"""
    required_dirs = [
        'assets/frames',
        'assets/videos',
        'processing/queue'
    ]
    
    for directory in required_dirs:
        os.makedirs(directory, exist_ok=True)

# ======================
# Core Functionality
# ======================
def load_reference_data(yolo):
    """Load and process reference video data with progress tracking"""
    try:
        if not os.path.exists(REFERENCE_VIDEO_PATH):
            raise FileNotFoundError(f"Reference video missing at {REFERENCE_VIDEO_PATH}")
        
        # The extract_frames function will now emit its own progress updates
        ref_frames = extract_frames(
            REFERENCE_VIDEO_PATH,
            output_dir="assets/frames",
            frame_interval=FRAME_EXTRACTION_INTERVAL
        )
        
        total_frames = len(ref_frames)
        
        # Send initial frame processing progress
        progress_json = {
            "type": "progress",
            "task": "processing_frames",
            "current": 0,
            "total": total_frames,
            "percent": 0
        }
        print(f"PROGRESS_JSON:{json.dumps(progress_json)}", flush=True)
        
        results = []
        
        # Process frames with JSON progress updates
        for i, frame_path in enumerate(ref_frames):
            frame = cv2.imread(frame_path)
            results.append(yolo.detect(frame))
            
            # Report progress every few frames
            if i % 5 == 0 or i == total_frames - 1:
                progress_json = {
                    "type": "progress",
                    "task": "processing_frames",
                    "current": i + 1,
                    "total": total_frames,
                    "percent": round((i + 1) / total_frames * 100, 1)
                }
                print(f"PROGRESS_JSON:{json.dumps(progress_json)}", flush=True)
            
        logging.info("Completed reference frame processing")
        return results
        
    except Exception as e:
        logging.error("Failed to load reference data: %s", str(e))
        raise

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
        logging.warning("Cleanup error: %s", str(e))

# ======================
# Video Processing
# ======================
def process_video(firebase, video, reference_data, yolo):
    """Process single video with detailed progress tracking"""
    video_id = video.get('id')  # Get 'id' safely
    video_path = None
    target_frames = []

    # Construct YouTube URL
    video_url = f"https://www.youtube.com/watch?v={video_id}"

    try:
        logging.info("Starting processing for video %s", video_id)
        
        # Step 1: Download Video
        start_time = time.time()
        video_path = download_video(video_url, video_id)
        logging.info("Download completed in %.2fs", time.time() - start_time)

        # Step 2: Extract Frames
        start_time = time.time()
        target_frames = extract_frames(video_path)
        logging.info("Extracted %d frames in %.2fs", len(target_frames), time.time() - start_time)

        if not target_frames:
            raise ValueError("No frames extracted")

        # Step 3: Compare Frames
        logging.info("Starting frame comparison...")
        start_time = time.time()
        
        # Pass frame paths to compare_frames, which returns boolean values
        copied_frames = compare_frames(target_frames, reference_data, yolo)
        
        logging.info("Frame comparison completed in %.2fs", time.time() - start_time)

        # Step 4: Calculate Results
        matched_frames = sum(copied_frames)
        copy_percent = (matched_frames / len(target_frames)) * 100
        logging.info("Match percentage: %.2f%% (%d/%d frames)", 
                    copy_percent, matched_frames, len(target_frames))

        # Generate timestamps for matched frames
        timestamps = generate_timestamps([i for i, m in enumerate(copied_frames) if m])

        # Step 5: Save Results in Firebase
        firebase.save_results(video_id, {
            'video_id': video_id,
            'copied': copy_percent >= MIN_SIMILARITY_THRESHOLD,
            'copy_percentage': round(copy_percent, 2),
            'timestamps': timestamps,
            'processed_at': firestore.SERVER_TIMESTAMP
        })
        logging.info("Results saved for video %s", video_id)

    except Exception as e:
        logging.error("Processing failed for %s: %s", video_id, str(e))
        logging.debug(traceback.format_exc())
        firebase.mark_as_failed(video_id)
    finally:
        cleanup(video_path, target_frames)

# ======================
# Main Application
# ======================
def main():
    # Start health check server in a separate thread
    health_thread = threading.Thread(target=start_health_check_server, daemon=True)
    health_thread.start()

    try:
        # Rest of your existing main() function remains the same
        loading_animation()
        check_internet_connection()
        configure_logging()
        create_required_directories()
        
        firebase = FirebaseHandler()
        yolo = YOLODetector()
        reference_data = load_reference_data(yolo)
        while True:
            try:
                pending_videos = firebase.get_pending_videos()
                
                if not pending_videos:
                    logging.info("No pending videos - checking again in %ds", PROCESSING_SLEEP_TIME)
                    time.sleep(PROCESSING_SLEEP_TIME)
                    continue
                
                logging.info("Found %d video(s) to process", len(pending_videos))
                for idx, video in enumerate(pending_videos):
                    logging.info("Processing video %d/%d", idx+1, len(pending_videos))
                    process_video(firebase, video, reference_data, yolo)
                    
            except KeyboardInterrupt:
                logging.info("Shutting down gracefully")
                break
            except Exception as e:
                logging.error("Processing error: %s", str(e))
                time.sleep(10)
                
    except Exception as e:
        logging.critical("Critical failure: %s", str(e))
        logging.debug(traceback.format_exc())
    finally:
        logging.info("Service stopped")

if __name__ == "__main__":
    # Set UTF-8 encoding for Windows compatibility
    if sys.platform.startswith('win'):
        import io
        sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
        sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')
    
    main()