import yt_dlp
import os
from tqdm import tqdm

def download_video(url, video_id, output_dir="processing/queue"):
    """Download video with integrated tqdm progress tracking"""
    os.makedirs(output_dir, exist_ok=True)
    final_path = os.path.join(output_dir, f"{video_id}.mp4")
    
    class ProgressHook:
        def __init__(self):
            self.pbar = None
            
        def __call__(self, d):
            if d['status'] == 'downloading':
                if self.pbar is None:
                    self.pbar = tqdm(
                        desc="Downloading Video",
                        unit='B',
                        unit_scale=True,
                        unit_divisor=1024,
                        total=d.get('total_bytes') or d.get('total_bytes_estimate')
                    )
                self.pbar.update(d['downloaded_bytes'] - self.pbar.n)

    progress_hook = ProgressHook()
    
    ydl_opts = {
        'format': 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best',
        'outtmpl': final_path,
        'quiet': True,
        'progress_hooks': [progress_hook],  # Use class-based hook
    }

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            ydl.download([url])
            return final_path
    except Exception as e:
        if os.path.exists(final_path):
            os.remove(final_path)
        raise RuntimeError(f"Download failed: {str(e)}") from e
    finally:
        if progress_hook.pbar:
            progress_hook.pbar.close()