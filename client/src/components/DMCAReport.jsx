import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Shield, Upload, AlertCircle, ArrowLeft, Home, Wand2, Loader2 } from 'lucide-react';
import axios from 'axios';

function DMCAReport() {
  const navigate = useNavigate();
  const location = useLocation();
  const [formData, setFormData] = useState({
    videoId: '',
    videoUrl: '',
    videoTitle: '',
    infringingContent: '',
    originalContent: '',
    documents: {
      proofOfOwnership: null,
      identification: null
    }
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [generatingDescriptions, setGeneratingDescriptions] = useState(false);
  const [animatingText, setAnimatingText] = useState({ infringing: false, original: false });

  useEffect(() => {
    // Check if we have pre-filled data from the processed video section
    if (location.state?.videoData) {
      const { videoId, videoUrl, title, description } = location.state.videoData;
      setFormData(prev => ({
        ...prev,
        videoId,
        videoUrl,
        videoTitle: title || '',
        infringingContent: `Video titled "${title}" contains infringing content. ${description || ''}`,
        originalContent: 'Please describe your original content here...'
      }));
    }
  }, [location.state]);

  const extractVideoIdFromUrl = (url) => {
    if (!url) return '';
    
    // YouTube URL patterns
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
      /^([a-zA-Z0-9_-]{11})$/ // Direct video ID
    ];
    
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }
    
    return '';
  };

  const fetchVideoInfo = async (videoId) => {
    try {
      // You can implement YouTube API call here to get video title and description
      // For now, we'll use the videoId to generate descriptions
      return {
        title: formData.videoTitle || `Video ${videoId}`,
        description: ''
      };
    } catch (error) {
      console.error('Failed to fetch video info:', error);
      return {
        title: formData.videoTitle || `Video ${videoId}`,
        description: ''
      };
    }
  };

  const animateTextGeneration = (text, fieldName, delay = 0) => {
    return new Promise((resolve) => {
      setTimeout(() => {
        setAnimatingText(prev => ({ ...prev, [fieldName]: true }));
        
        // Start with empty text
        setFormData(prev => ({
          ...prev,
          [fieldName === 'infringing' ? 'infringingContent' : 'originalContent']: ''
        }));

        // Animate text character by character
        let currentIndex = 0;
        const animateChar = () => {
          if (currentIndex <= text.length) {
            const currentText = text.substring(0, currentIndex);
            setFormData(prev => ({
              ...prev,
              [fieldName === 'infringing' ? 'infringingContent' : 'originalContent']: currentText
            }));
            currentIndex++;
            setTimeout(animateChar, 30 + Math.random() * 20); // Vary speed slightly
          } else {
            // Animation complete
            setTimeout(() => {
              setAnimatingText(prev => ({ ...prev, [fieldName]: false }));
              resolve();
            }, 500);
          }
        };
        animateChar();
      }, delay);
    });
  };
  const generateDescriptionsWithGemini = async (videoTitle, videoId, videoUrl) => {
    try {
      const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
      
      if (!GEMINI_API_KEY) {
        throw new Error('Gemini API key not found in environment variables');
      }

      const prompt = `
        As a legal assistant, help generate professional DMCA takedown descriptions for the following video:
        
        Video Title: "${videoTitle}"
        Video ID: ${videoId}
        Video URL: ${videoUrl}
        
        Please provide two separate descriptions:
        
        1. INFRINGING_CONTENT_DESCRIPTION: A professional description of the allegedly infringing content. Focus on what copyrighted material appears to be used without permission. Keep it factual and specific. (2-3 sentences)
        
        2. ORIGINAL_CONTENT_DESCRIPTION: A template description for the original content that the user can customize. Make it professional and suitable for legal documentation. Include placeholders where the user should add specific details about their original work. (2-3 sentences)
        
        Format your response as JSON:
        {
          "infringingContent": "description here",
          "originalContent": "description here"
        }
        
        Keep descriptions professional, factual, and appropriate for legal documentation.
      `;

      const response = await axios.post(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${GEMINI_API_KEY}`,
        {
          contents: [{
            parts: [{
              text: prompt
            }]
          }]
        },
        {
          headers: {
            'Content-Type': 'application/json',
          }
        }
      );

      const generatedText = response.data.candidates[0].content.parts[0].text;
      
      // Extract JSON from the response
      const jsonMatch = generatedText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsedResponse = JSON.parse(jsonMatch[0]);
        return parsedResponse;
      } else {
        // Fallback if JSON parsing fails
        return {
          infringingContent: `The video titled "${videoTitle}" (ID: ${videoId}) appears to contain copyrighted material that may be used without proper authorization. This content may include protected audiovisual elements, music, or other intellectual property.`,
          originalContent: `I am the rightful owner of the original copyrighted work that is being infringed upon in the above-mentioned video. My original content includes [please specify: music, video, images, text, or other creative work] created on [date] and first published/distributed on [platform/date]. I have not authorized the use of this content in the reported video.`
        };
      }
    } catch (error) {
      console.error('Error generating descriptions with Gemini:', error);
      
      // Fallback descriptions
      return {
        infringingContent: `The video titled "${videoTitle}" (ID: ${videoId}) appears to contain copyrighted material that may be used without proper authorization. This content may include protected audiovisual elements, music, or other intellectual property.`,
        originalContent: `I am the rightful owner of the original copyrighted work that is being infringed upon in the above-mentioned video. My original content includes [please specify: music, video, images, text, or other creative work] created on [date] and first published/distributed on [platform/date]. I have not authorized the use of this content in the reported video.`
      };
    }
  };

  const handleAutoGenerate = async () => {
    if (!formData.videoUrl && !formData.videoId) {
      setError('Please provide either a video URL or video ID to generate descriptions');
      return;
    }

    setGeneratingDescriptions(true);
    setError('');

    try {
      let videoId = formData.videoId;
      
      // Extract video ID from URL if not provided
      if (!videoId && formData.videoUrl) {
        videoId = extractVideoIdFromUrl(formData.videoUrl);
        if (videoId) {
          setFormData(prev => ({ ...prev, videoId }));
        }
      }

      if (!videoId) {
        throw new Error('Could not extract video ID from the provided URL');
      }

      // Fetch video info (you might want to implement YouTube API here)
      const videoInfo = await fetchVideoInfo(videoId);
      
      // Generate descriptions using Gemini
      const descriptions = await generateDescriptionsWithGemini(
        videoInfo.title || formData.videoTitle || `Video ${videoId}`,
        videoId,
        formData.videoUrl
      );

      // Animate the text generation with cool effects
      await Promise.all([
        animateTextGeneration(descriptions.infringingContent, 'infringing', 0),
        animateTextGeneration(descriptions.originalContent, 'original', 800)
      ]);

      setFormData(prev => ({
        ...prev,
        videoId,
        videoTitle: videoInfo.title || prev.videoTitle
      }));

    } catch (err) {
      console.error('Auto-generation error:', err);
      setError(err.message || 'Failed to generate descriptions automatically');
    } finally {
      setGeneratingDescriptions(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Auto-extract video ID when URL changes
    if (name === 'videoUrl' && value) {
      const extractedId = extractVideoIdFromUrl(value);
      if (extractedId && extractedId !== prev.videoId) {
        setFormData(prevState => ({
          ...prevState,
          videoId: extractedId,
          [name]: value
        }));
      }
    }
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
      <style jsx>{`
        @keyframes gradient-wipe {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        
        @keyframes text-glow {
          0%, 100% { text-shadow: 0 0 10px rgba(139, 92, 246, 0.3), 0 0 20px rgba(14, 165, 233, 0.2); }
          50% { text-shadow: 0 0 20px rgba(139, 92, 246, 0.6), 0 0 30px rgba(14, 165, 233, 0.4), 0 0 40px rgba(139, 92, 246, 0.2); }
        }
        
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        
        .gradient-text-animate {
          background: linear-gradient(90deg, #8b5cf6, #0ea5e9, #8b5cf6);
          background-size: 200% 100%;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          animation: gradient-wipe 2s ease-in-out infinite;
        }
        
        .shimmer-overlay {
          animation: shimmer 2s ease-in-out infinite;
        }
      `}</style>
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
                  Video Title (Optional)
                </label>
                <input
                  type="text"
                  name="videoTitle"
                  value={formData.videoTitle}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 text-gray-900 placeholder-gray-400 text-sm"
                  placeholder="Enter video title for better AI generation"
                />
              </div>

              {/* Auto-generate button */}
              <div className="bg-gradient-to-r from-purple-50 to-sky-50 p-4 rounded-lg border border-purple-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-medium text-gray-800">AI-Powered Description Generation</h3>
                    <p className="text-xs text-gray-600 mt-1">
                      Automatically generate professional DMCA descriptions using AI
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleAutoGenerate}
                    disabled={generatingDescriptions || (!formData.videoUrl && !formData.videoId)}
                    className="flex items-center px-4 py-2 bg-gradient-to-r from-purple-600 to-sky-600 hover:from-purple-700 hover:to-sky-700 disabled:from-gray-400 disabled:to-gray-400 text-white text-sm font-medium rounded-lg transition-all duration-200 disabled:cursor-not-allowed"
                  >
                    {generatingDescriptions ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Wand2 className="h-4 w-4 mr-2" />
                        Generate AI Descriptions
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description of Infringing Content <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <textarea
                    name="infringingContent"
                    value={formData.infringingContent}
                    onChange={handleInputChange}
                    rows="4"
                    className={`w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 text-gray-900 placeholder-gray-400 text-sm resize-none transition-all duration-300 ${
                      animatingText.infringing 
                        ? 'bg-gradient-to-r from-purple-50 via-sky-50 to-purple-50 text-transparent bg-clip-text animate-pulse shadow-lg ring-2 ring-purple-200' 
                        : ''
                    }`}
                    style={animatingText.infringing ? {
                      background: 'linear-gradient(90deg, #8b5cf6, #0ea5e9, #8b5cf6)',
                      backgroundSize: '200% 100%',
                      animation: 'gradient-wipe 2s ease-in-out infinite, text-glow 1.5s ease-in-out infinite',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      textShadow: '0 0 20px rgba(139, 92, 246, 0.5)',
                    } : {}}
                    placeholder="Describe the infringing content... (or use AI generation above)"
                    required
                  />
                  {animatingText.infringing && (
                    <div className="absolute inset-0 pointer-events-none">
                      <div className="h-full w-full bg-gradient-to-r from-transparent via-white/30 to-transparent animate-pulse rounded-lg"></div>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description of Original Content <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <textarea
                    name="originalContent"
                    value={formData.originalContent}
                    onChange={handleInputChange}
                    rows="4"
                    className={`w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 text-gray-900 placeholder-gray-400 text-sm resize-none transition-all duration-300 ${
                      animatingText.original 
                        ? 'bg-gradient-to-r from-purple-50 via-sky-50 to-purple-50 text-transparent bg-clip-text animate-pulse shadow-lg ring-2 ring-purple-200' 
                        : ''
                    }`}
                    style={animatingText.original ? {
                      background: 'linear-gradient(90deg, #8b5cf6, #0ea5e9, #8b5cf6)',
                      backgroundSize: '200% 100%',
                      animation: 'gradient-wipe 2s ease-in-out infinite, text-glow 1.5s ease-in-out infinite',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      textShadow: '0 0 20px rgba(139, 92, 246, 0.5)',
                    } : {}}
                    placeholder="Describe your original content... (or use AI generation above)"
                    required
                  />
                  {animatingText.original && (
                    <div className="absolute inset-0 pointer-events-none">
                      <div className="h-full w-full bg-gradient-to-r from-transparent via-white/30 to-transparent animate-pulse rounded-lg"></div>
                    </div>
                  )}
                </div>
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
