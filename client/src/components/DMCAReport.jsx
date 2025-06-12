import { useState, useEffect } from 'react';
import { Shield, Upload, AlertCircle, ArrowLeft, Home, Wand2, Loader2 } from 'lucide-react';

function DMCAReport() {
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

  const animateTextReveal = (text, fieldName, delay = 0) => {
    return new Promise((resolve) => {
      setTimeout(() => {
        setAnimatingText(prev => ({ ...prev, [fieldName]: true }));
        
        // Clear the field first
        setFormData(prev => ({
          ...prev,
          [fieldName === 'infringing' ? 'infringingContent' : 'originalContent']: ''
        }));

        // Start the reveal animation
        setTimeout(() => {
          setFormData(prev => ({
            ...prev,
            [fieldName === 'infringing' ? 'infringingContent' : 'originalContent']: text
          }));
          
          setTimeout(() => {
            setAnimatingText(prev => ({ ...prev, [fieldName]: false }));
            resolve();
          }, 2000);
        }, 500);
      }, delay);
    });
  };

  const generateDescriptionsWithAI = async (videoTitle, videoId, videoUrl) => {
    try {
      // Simulate AI generation with fallback descriptions
      await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate API call
      
      return {
        infringingContent: `The video titled "${videoTitle}" (ID: ${videoId}) appears to contain copyrighted material that may be used without proper authorization. This content may include protected audiovisual elements, music, or other intellectual property that infringes upon the original creator's rights.`,
        originalContent: `I am the rightful owner of the original copyrighted work that is being infringed upon in the above-mentioned video. My original content includes [please specify: music, video, images, text, or other creative work] created on [date] and first published or distributed on [platform/date]. I have not authorized the use of this content in the reported video.`
      };
    } catch (error) {
      console.error('Error generating descriptions:', error);
      
      return {
        infringingContent: `The video titled "${videoTitle}" (ID: ${videoId}) appears to contain copyrighted material that may be used without proper authorization. This content may include protected audiovisual elements, music, or other intellectual property that infringes upon the original creator's rights.`,
        originalContent: `I am the rightful owner of the original copyrighted work that is being infringed upon in the above-mentioned video. My original content includes [please specify: music, video, images, text, or other creative work] created on [date] and first published or distributed on [platform/date]. I have not authorized the use of this content in the reported video.`
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
      
      if (!videoId && formData.videoUrl) {
        videoId = extractVideoIdFromUrl(formData.videoUrl);
        if (videoId) {
          setFormData(prev => ({ ...prev, videoId }));
        }
      }

      if (!videoId) {
        throw new Error('Could not extract video ID from the provided URL');
      }

      const videoInfo = await fetchVideoInfo(videoId);
      
      const descriptions = await generateDescriptionsWithAI(
        videoInfo.title || formData.videoTitle || `Video ${videoId}`,
        videoId,
        formData.videoUrl
      );

      await Promise.all([
        animateTextReveal(descriptions.infringingContent, 'infringing', 0),
        animateTextReveal(descriptions.originalContent, 'original', 800)
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

    if (name === 'videoUrl' && value) {
      const extractedId = extractVideoIdFromUrl(value);
      if (extractedId && extractedId !== formData.videoId) {
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
      if (!formData.videoId || !formData.videoUrl || !formData.infringingContent || !formData.originalContent) {
        throw new Error('Please fill in all required fields');
      }

      // Simulate form submission
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Simulate success
      alert('DMCA report submitted successfully! Report ID: DMCA-' + Date.now());
      
    } catch (err) {
      console.error('DMCA submission error:', err);
      setError(err.message || 'Failed to submit DMCA report');
    } finally {
      setLoading(false);
    }
  };

  const handleGoBack = () => {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      // Fallback if no history
      window.location.href = '/';
    }
  };

  const handleGoHome = () => {
    window.location.href = '/';
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <style jsx>{`
        @keyframes siri-glow {
          0%, 100% { 
            box-shadow: 
              0 0 20px rgba(139, 92, 246, 0.4),
              0 0 40px rgba(14, 165, 233, 0.3),
              0 0 60px rgba(236, 72, 153, 0.2),
              inset 0 0 30px rgba(139, 92, 246, 0.1);
            border-color: rgba(139, 92, 246, 0.6);
          }
          25% { 
            box-shadow: 
              0 0 25px rgba(14, 165, 233, 0.5),
              0 0 50px rgba(236, 72, 153, 0.4),
              0 0 75px rgba(16, 185, 129, 0.3),
              inset 0 0 40px rgba(14, 165, 233, 0.1);
            border-color: rgba(14, 165, 233, 0.7);
          }
          50% { 
            box-shadow: 
              0 0 30px rgba(236, 72, 153, 0.6),
              0 0 60px rgba(16, 185, 129, 0.5),
              0 0 90px rgba(245, 158, 11, 0.4),
              inset 0 0 50px rgba(236, 72, 153, 0.1);
            border-color: rgba(236, 72, 153, 0.8);
          }
          75% { 
            box-shadow: 
              0 0 35px rgba(16, 185, 129, 0.7),
              0 0 70px rgba(245, 158, 11, 0.6),
              0 0 105px rgba(239, 68, 68, 0.5),
              inset 0 0 60px rgba(16, 185, 129, 0.1);
            border-color: rgba(16, 185, 129, 0.9);
          }
        }
        
        @keyframes text-reveal {
          0% { 
            background-position: -100% 0;
            color: transparent;
          }
          50% {
            background-position: 0% 0;
          }
          100% { 
            background-position: 100% 0;
            color: #374151;
          }
        }
        
        @keyframes gemini-glow {
          0%, 100% { 
            background: linear-gradient(135deg, 
              rgba(139, 92, 246, 0.15) 0%, 
              rgba(14, 165, 233, 0.15) 25%,
              rgba(236, 72, 153, 0.15) 50%,
              rgba(16, 185, 129, 0.15) 75%,
              rgba(139, 92, 246, 0.15) 100%
            );
            background-size: 400% 400%;
            background-position: 0% 50%;
          }
          50% { 
            background: linear-gradient(135deg, 
              rgba(14, 165, 233, 0.20) 0%, 
              rgba(236, 72, 153, 0.20) 25%,
              rgba(16, 185, 129, 0.20) 50%,
              rgba(245, 158, 11, 0.20) 75%,
              rgba(14, 165, 233, 0.20) 100%
            );
            background-size: 400% 400%;
            background-position: 100% 50%;
          }
        }
        
        @keyframes wipe-reveal {
          0% {
            background: linear-gradient(90deg, 
              transparent 0%, 
              rgba(139, 92, 246, 0.8) 50%, 
              rgba(14, 165, 233, 0.8) 100%
            );
            -webkit-background-clip: text;
            background-clip: text;
            background-size: 200% 100%;
            background-position: -100% 0;
            color: transparent;
          }
          50% {
            background: linear-gradient(90deg, 
              rgba(139, 92, 246, 0.8) 0%, 
              rgba(14, 165, 233, 0.8) 50%, 
              rgba(236, 72, 153, 0.8) 100%
            );
            -webkit-background-clip: text;
            background-clip: text;
            background-size: 200% 100%;
            background-position: 0% 0;
            color: transparent;
          }
          100% {
            background: linear-gradient(90deg, 
              rgba(14, 165, 233, 0.8) 0%, 
              rgba(236, 72, 153, 0.8) 50%, 
              transparent 100%
            );
            -webkit-background-clip: text;
            background-clip: text;
            background-size: 200% 100%;
            background-position: 100% 0;
            color: #374151;
          }
        }
        
        .siri-glow {
          animation: siri-glow 2s ease-in-out infinite;
          border: 2px solid transparent;
          position: relative;
          overflow: hidden;
        }
        
        .gemini-glow {
          animation: gemini-glow 3s ease-in-out infinite;
        }
        
        .text-wipe-reveal {
          animation: wipe-reveal 2s ease-out forwards;
        }
        
        .textarea-enhanced {
          background: linear-gradient(135deg, 
            rgba(255, 255, 255, 0.9) 0%, 
            rgba(249, 250, 251, 0.95) 100%
          );
          backdrop-filter: blur(10px);
          transition: all 0.3s ease;
        }
        
        .textarea-enhanced:focus {
          background: linear-gradient(135deg, 
            rgba(255, 255, 255, 0.95) 0%, 
            rgba(249, 250, 251, 1) 100%
          );
          backdrop-filter: blur(15px);
        }
      `}</style>
      
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
                  onClick={handleGoBack}
                  className="flex items-center px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-700 transition-colors duration-200"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </button>
                <button
                  onClick={handleGoHome}
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

            <div className="space-y-6">
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

              <div className="bg-gradient-to-r from-purple-50 via-blue-50 to-pink-50 p-4 rounded-lg border border-purple-200">
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
                    className="flex items-center px-4 py-2 bg-gradient-to-r from-purple-600 via-blue-600 to-pink-600 hover:from-purple-700 hover:via-blue-700 hover:to-pink-700 disabled:from-gray-400 disabled:to-gray-400 text-white text-sm font-medium rounded-lg transition-all duration-200 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
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
                    className={`w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 text-gray-900 placeholder-gray-400 text-sm resize-none textarea-enhanced transition-all duration-300 ${
                      animatingText.infringing 
                        ? 'siri-glow gemini-glow text-wipe-reveal' 
                        : ''
                    }`}
                    placeholder="Describe the infringing content... (or use AI generation above)"
                    required
                  />
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
                    className={`w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 text-gray-900 placeholder-gray-400 text-sm resize-none textarea-enhanced transition-all duration-300 ${
                      animatingText.original 
                        ? 'siri-glow gemini-glow text-wipe-reveal' 
                        : ''
                    }`}
                    placeholder="Describe your original content... (or use AI generation above)"
                    required
                  />
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
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DMCAReport;
