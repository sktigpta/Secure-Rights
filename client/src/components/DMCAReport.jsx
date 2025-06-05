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
      
      const API_URL = import.meta.env.VITE_API_URL
      const response = await axios.post(`${API_URL}/dmca/report`, formDataToSend, {
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
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-sky-100 rounded-lg">
                  <Shield className="h-6 w-6 text-sky-600" />
                </div>
                <div>
                  <h1 className="text-xl font-semibold text-gray-800">Submit DMCA Report</h1>
                  <p className="text-sm text-gray-500 mt-1">Report copyright infringement</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => navigate(-1)}
                  className="flex items-center px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-700 transition-colors duration-200"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </button>
                <button
                  onClick={() => navigate('/dashboard')}
                  className="flex items-center px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-700 transition-colors duration-200"
                >
                  <Home className="h-4 w-4 mr-2" />
                  Dashboard
                </button>
              </div>
            </div>
          </div>

          <div className="p-6">
            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center text-red-700">
                <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0" />
                <span className="text-sm">{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Video URL <span className="text-red-500">*</span>
                </label>
                <input
                  type="url"
                  name="videoUrl"
                  value={formData.videoUrl}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 text-gray-900 placeholder-gray-400 text-sm"
                  placeholder="https://youtube.com/watch?v=..."
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Video ID <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="videoId"
                  value={formData.videoId}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 text-gray-900 placeholder-gray-400 text-sm"
                  placeholder="Video ID from YouTube URL"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description of Infringing Content <span className="text-red-500">*</span>
                </label>
                <textarea
                  name="infringingContent"
                  value={formData.infringingContent}
                  onChange={handleInputChange}
                  rows="4"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 text-gray-900 placeholder-gray-400 text-sm resize-none"
                  placeholder="Describe the infringing content..."
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description of Original Content <span className="text-red-500">*</span>
                </label>
                <textarea
                  name="originalContent"
                  value={formData.originalContent}
                  onChange={handleInputChange}
                  rows="4"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 text-gray-900 placeholder-gray-400 text-sm resize-none"
                  placeholder="Describe your original content..."
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Proof of Ownership
                </label>
                <div className="border-2 border-dashed border-gray-200 rounded-lg p-6 text-center hover:border-gray-300 transition-colors duration-200">
                  <Upload className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                  <div className="text-sm text-gray-600">
                    <label className="relative cursor-pointer rounded-md font-medium text-sky-600 hover:text-sky-500">
                      <span>Upload a file</span>
                      <input
                        type="file"
                        className="sr-only"
                        onChange={(e) => handleFileChange(e, 'proofOfOwnership')}
                        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                      />
                    </label>
                    <span className="text-gray-500"> or drag and drop</span>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    PDF, DOC, or images up to 10MB
                  </p>
                  {formData.documents.proofOfOwnership && (
                    <p className="text-xs text-sky-600 mt-2 font-medium">
                      ✓ {formData.documents.proofOfOwnership.name}
                    </p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Identification Document
                </label>
                <div className="border-2 border-dashed border-gray-200 rounded-lg p-6 text-center hover:border-gray-300 transition-colors duration-200">
                  <Upload className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                  <div className="text-sm text-gray-600">
                    <label className="relative cursor-pointer rounded-md font-medium text-sky-600 hover:text-sky-500">
                      <span>Upload a file</span>
                      <input
                        type="file"
                        className="sr-only"
                        onChange={(e) => handleFileChange(e, 'identification')}
                        accept=".pdf,.jpg,.jpeg,.png"
                      />
                    </label>
                    <span className="text-gray-500"> or drag and drop</span>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    PDF or images up to 10MB
                  </p>
                  {formData.documents.identification && (
                    <p className="text-xs text-sky-600 mt-2 font-medium">
                      ✓ {formData.documents.identification.name}
                    </p>
                  )}
                </div>
              </div>

              <div className="pt-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-sky-600 hover:bg-sky-700 disabled:bg-sky-400 text-white py-3 px-4 rounded-lg font-medium transition-colors duration-200 flex items-center justify-center gap-2 disabled:cursor-not-allowed text-sm"
                >
                  {loading ? 'Submitting...' : 'Submit DMCA Report'}
                  <Shield className="h-4 w-4" />
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DMCAReport;