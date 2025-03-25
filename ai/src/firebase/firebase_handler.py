import os
import firebase_admin
from firebase_admin import credentials, firestore

class FirebaseHandler:
    def __init__(self):
         cred = credentials.Certificate("src/firebase/serviceAccountKey.json")
         firebase_admin.initialize_app(cred)
         self.db = firestore.client()
    
    def get_pending_videos(self):
        """Fetch videos with 'pending' status."""
        pending = []
        docs = self.db.collection('youtube_videos').stream()
        for doc in docs:
            video = doc.to_dict()
            video['id'] = doc.id
            pending.append(video)
        return pending
    
    def mark_as_processing(self, video_id):
        """Update video status to 'processing'."""
        ref = self.db.collection('youtube_videos').document(video_id)
        ref.update({'status': 'processing'})
    
    def save_results(self, video_id, results):
        """Save results to processed_video collection and delete from youtube_videos."""
        processed_ref = self.db.collection('processed_videos').document(video_id)
        processed_ref.set(results)
        self.db.collection('youtube_videos').document(video_id).delete()
    
    def mark_as_failed(self, video_id):
        """Mark video as 'failed' if processing errors occur."""
        ref = self.db.collection('youtube_videos').document(video_id)
        ref.update({'status': 'failed'})
