import os
import firebase_admin
from firebase_admin import credentials, firestore

class FirebaseHandler:
    def __init__(self):
        cred = credentials.Certificate("src/firebase/serviceAccountKey.json")
        firebase_admin.initialize_app(cred)
        self.db = firestore.client()
    
    def get_pending_videos(self):
        """Fetch all videos regardless of status"""
        try:
            # Remove the 'where' filter to get all documents
            docs = self.db.collection('youtube_videos').stream()
            return [{
                **doc.to_dict(),
                'id': doc.id,
                'videoId': doc.id
            } for doc in docs]
        except Exception as e:
            print(f"Error fetching videos: {str(e)}")
        return []

    def mark_as_processing(self, video_id):
        """Update processing status with timestamp"""
        try:
            ref = self.db.collection('youtube_videos').document(video_id)
            ref.update({
                'status': 'processing',
                'processing_start': firestore.SERVER_TIMESTAMP
            })
            return True
        except Exception as e:
            print(f"Failed to mark processing: {str(e)}")
            return False

    def save_results(self, video_id, results):
        """Save results to processed collection"""
        try:
            batch = self.db.batch()
            source_ref = self.db.collection('youtube_videos').document(video_id)
            dest_ref = self.db.collection('processed_videos').document(video_id)
            
            batch.set(dest_ref, results)
            batch.delete(source_ref)
            batch.commit()
            return True
        except Exception as e:
            print(f"Failed to save results: {str(e)}")
            return False

    def mark_as_failed(self, video_id, error_message):
        """Mark video as failed with error details"""
        try:
            ref = self.db.collection('youtube_videos').document(video_id)
            ref.update({
                'status': 'failed',
                'error': str(error_message)[:500],  # Truncate long errors
                'failed_at': firestore.SERVER_TIMESTAMP
            })
            return True
        except Exception as e:
            print(f"Failed to mark failed: {str(e)}")
            return False