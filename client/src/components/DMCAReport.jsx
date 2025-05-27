import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Shield, Upload, AlertCircle, ArrowLeft, Home } from 'lucide-react';
import axios from 'axios';

function DMCAReport() {
  const navigate = useNavigate();
  const location = useLocation();
  const [formData, setFormData] = useState({
    videoId: '',
    videoUrl: '',
    infringingContent: '',
    originalContent: '',
    documents: {
      proofOfOwnership: null,
      identification: null
    }
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Check if we have pre-filled data from the processed video section
    if (location.state?.videoData) {
      const { videoId, videoUrl, title, description } = location.state.videoData;
      setFormData(prev => ({
        ...prev,
        videoId,
        videoUrl,
        infringingContent: `Video titled "${title}" contains infringing content. ${description || ''}`,
        originalContent: 'Please describe your original content here...'
      }));
    }
  }, [location.state]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleFileChange = (e, type) => {
    const file = e.target.files[0];
    setFormData(prev => ({
      ...prev,
      documents: {
        ...prev.documents,
        [type]: file
      }
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Get the auth token
      const token = localStorage.getItem('authToken');
      if (!token) {
        throw new Error('Authentication token not found. Please log in again.');
      }

      // Validate required fields
      if (!formData.videoId || !formData.videoUrl || !formData.infringingContent || !formData.originalContent) {
        throw new Error('Please fill in all required fields');
      }

      const formDataToSend = new FormData();
      
      // Add text fields
      formDataToSend.append('videoId', formData.videoId);
      formDataToSend.append('videoUrl', formData.videoUrl);
      formDataToSend.append('infringingContent', formData.infringingContent);
      formDataToSend.append('originalContent', formData.originalContent);

      // Add documents if they exist
      if (formData.documents.proofOfOwnership) {
        formDataToSend.append('documents[proofOfOwnership]', formData.documents.proofOfOwnership);
      }
      if (formData.documents.identification) {
        formDataToSend.append('documents[identification]', formData.documents.identification);
      }

      // Log the FormData contents for debugging
      for (let pair of formDataToSend.entries()) {
        console.log(pair[0] + ': ' + pair[1]);
      }

      const response = await axios.post('http://localhost:5000/api/dmca/report', formDataToSend, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${token}`
        },
        transformRequest: [(data) => data] // Prevent axios from transforming FormData
      });

      if (response.data.reportId) {
        navigate(`/dmca/status/${response.data.reportId}`);
      } else {
        throw new Error('No report ID received from server');
      }
    } catch (err) {
      console.error('DMCA submission error:', err);
      if (err.response?.status === 401) {
        setError('Your session has expired. Please log in again.');
        // Optionally redirect to login page
        // navigate('/login');
      } else if (err.response?.data?.error) {
        setError(err.response.data.error);
      } else if (err.response?.data?.details) {
        setError(`Error: ${err.response.data.details}`);
      } else {
        setError(err.message || 'Failed to submit DMCA report');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#003366] to-[#001a33] py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white/5 backdrop-blur-lg rounded-2xl p-8 shadow-xl border border-white/10">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center">
              <Shield className="h-12 w-12 text-white" />
              <h1 className="text-2xl font-bold text-white ml-4">Submit DMCA Report</h1>
            </div>
            <div className="flex gap-4">
              <button
                onClick={() => navigate(-1)}
                className="flex items-center px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-white transition-colors"
              >
                <ArrowLeft className="h-5 w-5 mr-2" />
                Back
              </button>
              <button
                onClick={() => navigate('/dashboard')}
                className="flex items-center px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-white transition-colors"
              >
                <Home className="h-5 w-5 mr-2" />
                Dashboard
              </button>
            </div>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-500/20 rounded-lg flex items-center text-red-300">
              <AlertCircle className="h-5 w-5 mr-2" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">
                Video URL
              </label>
              <input
                type="url"
                name="videoUrl"
                value={formData.videoUrl}
                onChange={handleInputChange}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400/50 text-white placeholder-white/30"
                placeholder="https://youtube.com/watch?v=..."
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">
                Video ID
              </label>
              <input
                type="text"
                name="videoId"
                value={formData.videoId}
                onChange={handleInputChange}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400/50 text-white placeholder-white/30"
                placeholder="Video ID from YouTube URL"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">
                Description of Infringing Content
              </label>
              <textarea
                name="infringingContent"
                value={formData.infringingContent}
                onChange={handleInputChange}
                rows="4"
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400/50 text-white placeholder-white/30"
                placeholder="Describe the infringing content..."
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">
                Description of Original Content
              </label>
              <textarea
                name="originalContent"
                value={formData.originalContent}
                onChange={handleInputChange}
                rows="4"
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400/50 text-white placeholder-white/30"
                placeholder="Describe your original content..."
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">
                Proof of Ownership
              </label>
              <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-white/10 border-dashed rounded-lg">
                <div className="space-y-1 text-center">
                  <Upload className="mx-auto h-12 w-12 text-white/50" />
                  <div className="flex text-sm text-white/70">
                    <label className="relative cursor-pointer rounded-md font-medium text-blue-400 hover:text-blue-300">
                      <span>Upload a file</span>
                      <input
                        type="file"
                        className="sr-only"
                        onChange={(e) => handleFileChange(e, 'proofOfOwnership')}
                        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                      />
                    </label>
                  </div>
                  <p className="text-xs text-white/50">
                    PDF, DOC, or images up to 10MB
                  </p>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">
                Identification Document
              </label>
              <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-white/10 border-dashed rounded-lg">
                <div className="space-y-1 text-center">
                  <Upload className="mx-auto h-12 w-12 text-white/50" />
                  <div className="flex text-sm text-white/70">
                    <label className="relative cursor-pointer rounded-md font-medium text-blue-400 hover:text-blue-300">
                      <span>Upload a file</span>
                      <input
                        type="file"
                        className="sr-only"
                        onChange={(e) => handleFileChange(e, 'identification')}
                        accept=".pdf,.jpg,.jpeg,.png"
                      />
                    </label>
                  </div>
                  <p className="text-xs text-white/50">
                    PDF or images up to 10MB
                  </p>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-500 hover:bg-blue-400 text-white py-3 px-4 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Submitting...' : 'Submit DMCA Report'}
              <Shield className="h-4 w-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default DMCAReport; 