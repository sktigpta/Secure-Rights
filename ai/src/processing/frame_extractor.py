import cv2
import os
import logging
import time
import numpy as np
from tqdm.auto import tqdm
import gc

def extract_frames_gpu(video_path, output_dir="temp_frames", frame_interval=1, target_size=None, position=0, 
                       use_gpu=True, gpu_id=0, batch_process=True):
    """
    Extract frames from video with GPU acceleration, batch processing and improved memory management
    
    Args:
        video_path (str): Path to the video file
        output_dir (str): Directory to save extracted frames
        frame_interval (int): Extract every Nth frame
        target_size (tuple): Optional (width, height) to resize frames
        position (int): Position for the progress bar (to avoid nesting)
        use_gpu (bool): Whether to use GPU acceleration
        gpu_id (int): GPU device ID to use
        batch_process (bool): Whether to use batch processing for GPU operations
        
    Returns:
        list: Paths to extracted frame images or None if process fails
    """
    try:
        # Validate inputs
        if not os.path.exists(video_path):
            raise FileNotFoundError(f"Video file does not exist: {video_path}")
        
        if frame_interval < 1:
            logging.warning("Invalid frame interval, using 1 instead")
            frame_interval = 1
        
        # Create output directory with error handling
        try:
            os.makedirs(output_dir, exist_ok=True)
        except Exception as e:
            raise IOError(f"Failed to create output directory: {e}")
        
        # Configure GPU usage
        if use_gpu:
            try:
                # Check if CUDA is available in this OpenCV build
                if cv2.cuda.getCudaEnabledDeviceCount() == 0:
                    logging.warning("No CUDA-capable devices found, falling back to CPU")
                    use_gpu = False
                else:
                    cv2.cuda.setDevice(gpu_id)
                    logging.info(f"Using GPU device ID: {gpu_id}")
                    
                    # Create GPU mat objects for reuse (optimization)
                    gpu_frame = cv2.cuda_GpuMat()
                    if target_size:
                        gpu_resized = cv2.cuda_GpuMat()
            except Exception as e:
                logging.warning(f"Failed to initialize GPU: {e}. Falling back to CPU.")
                use_gpu = False
        
        # Open video capture
        cap = cv2.VideoCapture(video_path)
        
        if not cap.isOpened():
            raise ValueError(f"Failed to open video: {video_path}")
        
        # Get video properties
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        fps = cap.get(cv2.CAP_PROP_FPS)
        width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        
        # Generate base filename from video path
        base_name = os.path.splitext(os.path.basename(video_path))[0]
        
        # Log video information
        logging.info(f"Video info: {width}x{height}, {fps} FPS, {total_frames} total frames")
        logging.info(f"Processing mode: {'GPU' if use_gpu else 'CPU'}")
        
        # Validate target size format if provided
        if target_size:
            if not (isinstance(target_size, tuple) and len(target_size) == 2):
                logging.warning("Invalid target_size format, using original size")
                target_size = None
            else:
                logging.info(f"Resizing frames to {target_size[0]}x{target_size[1]}")
        
        # Configure resize parameters
        if use_gpu and target_size:
            # For GPU resizing
            resize_fn = cv2.cuda.resize
            interpolation = cv2.INTER_AREA
        elif target_size:
            # For CPU resizing
            resize_fn = cv2.resize
            interpolation = cv2.INTER_AREA
        
        # Process frames with progress tracking
        frames = []
        processed_frames = 0
        
        # Limit batch size for memory conservation
        batch_size = min(100, total_frames)
        
        with tqdm(total=total_frames, desc="Extracting Frames", unit="frame", position=position, leave=True) as pbar:
            frame_count = 0
            
            while processed_frames < total_frames:
                # Track batch start time for performance monitoring
                batch_start = time.time()
                batch_saved = 0
                
                # Process frames in current batch
                for _ in range(batch_size):
                    if processed_frames >= total_frames:
                        break
                        
                    ret, frame = cap.read()
                    
                    if not ret:
                        logging.warning(f"Failed to read frame at position {processed_frames}")
                        break
                    
                    processed_frames += 1
                    pbar.update(1)
                    
                    # Only process frames at the specified interval
                    if frame_count % frame_interval == 0:
                        try:
                            # GPU processing path
                            if use_gpu:
                                # Upload frame to GPU
                                gpu_frame.upload(frame)
                                
                                # Resize if requested
                                if target_size:
                                    resize_fn(gpu_frame, target_size, gpu_resized, interpolation=interpolation)
                                    processed_frame = gpu_resized.download()
                                else:
                                    processed_frame = gpu_frame.download()
                            
                            # CPU processing path
                            else:
                                # Resize if requested
                                if target_size:
                                    processed_frame = resize_fn(frame, target_size, interpolation=interpolation)
                                else:
                                    processed_frame = frame
                                    
                            # Generate unique filename
                            frame_filename = f"{base_name}_frame_{frame_count:06d}.jpg"
                            frame_path = os.path.join(output_dir, frame_filename)
                            
                            # Save the frame
                            cv2.imwrite(frame_path, processed_frame)
                            frames.append(frame_path)
                            batch_saved += 1
                            
                        except cv2.error as e:
                            logging.error(f"OpenCV error processing frame {frame_count}: {e}")
                        except Exception as e:
                            logging.error(f"Failed to process frame {frame_count}: {e}")
                    
                    frame_count += 1
                
                # Log batch performance
                batch_end = time.time()
                batch_time = batch_end - batch_start
                if batch_saved > 0:
                    logging.debug(f"Batch: Saved {batch_saved} frames in {batch_time:.2f}s ({batch_saved/batch_time:.2f} frames/s)")
                
                # Force garbage collection to free memory
                gc.collect()
            
        # Release resources
        cap.release()
        if use_gpu:
            # Explicitly release GPU resources
            try:
                gpu_frame.release()
                if target_size:
                    gpu_resized.release()
                cv2.cuda.deviceReset()
            except:
                pass
        
        logging.info(f"Successfully extracted {len(frames)} frames from {video_path}")
        return frames
        
    except Exception as e:
        logging.error(f"Frame extraction failed: {str(e)}")
        
        # Clean up resources in case of failure
        if 'cap' in locals() and cap is not None:
            cap.release()
            
        if use_gpu and 'gpu_frame' in locals():
            try:
                gpu_frame.release()
                if 'gpu_resized' in locals():
                    gpu_resized.release()
                cv2.cuda.deviceReset()
            except:
                pass
            
        return None

# Helper function to check GPU capabilities
def check_gpu_capabilities():
    """
    Check and report OpenCV GPU capabilities
    
    Returns:
        dict: Information about GPU capabilities
    """
    info = {
        "cuda_enabled": False,
        "device_count": 0,
        "devices": []
    }
    
    try:
        info["cuda_enabled"] = cv2.cuda.getCudaEnabledDeviceCount() > 0
        info["device_count"] = cv2.cuda.getCudaEnabledDeviceCount()
        
        for i in range(info["device_count"]):
            cv2.cuda.setDevice(i)
            device_info = {
                "id": i,
                "name": cv2.cuda.getDeviceName(i),
                "memory_total": cv2.cuda.DeviceInfo().totalGlobalMem(),
                "compute_capability": cv2.cuda.DeviceInfo().majorVersion()
            }
            info["devices"].append(device_info)
            
        return info
    except Exception as e:
        logging.error(f"Error checking GPU capabilities: {e}")
        return info