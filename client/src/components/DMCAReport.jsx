import { useState, useEffect } from 'react';
import { Shield, Upload, AlertCircle, ArrowLeft, Home, Sparkles, Loader2 } from 'lucide-react';

function DMCAReport() {
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
  const [aiLoading, setAiLoading] = useState(false);

  useEffect(() => {
    // Check if we have pre-filled data from the processed video section
    // This would be replaced with actual routing logic in a real app
    const mockVideoData = {
      videoId: '-P3QD6Gu4wM',
      videoUrl: 'https://www.youtube.com/watch?v=-P3QD6Gu4wM',
      title: 'Poison Candy Challenge. #love #poisonapple #poison #challenge',
      description: 'This video has been identified as containing potentially infringing content with a copy percentage of 9.2%.'
    };
    
    setFormData(prev => ({
      ...prev,
      videoId: mockVideoData.videoId,
      videoUrl: mockVideoData.videoUrl,
      infringingContent: `Video titled "${mockVideoData.title}" contains infringing content. ${mockVideoData.description || ''}`,
      originalContent: 'Please describe your original content here...'
    }));
  }, []);

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

  const generateAIDescription = async () => {
    if (!formData.infringingContent.trim()) {
      setError('Please fill in the "Description of Infringing Content" field first to generate an AI description.');
      return;
    }

    setAiLoading(true);
    setError('');

    try {
      // In a real app, you would use: const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
      // For demo purposes, we'll simulate the API call
      const GEMINI_API_KEY = 'your-gemini-api-key-here';
      
      if (!GEMINI_API_KEY || GEMINI_API_KEY === 'your-gemini-api-key-here') {
        // Simulate AI response for demo
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const simulatedResponse = `Based on the infringing content described, the original content appears to be a creative video production featuring:

• Original choreographed content or performance art
• Unique visual storytelling elements and cinematography
• Custom music composition or licensed soundtrack
• Creative editing techniques and post-production effects
• Original character development or narrative structure
• Distinctive artistic style and visual presentation

The original work represents substantial creative effort in concept development, production planning, filming, and post-production editing. The content demonstrates originality in its artistic expression, visual composition, and overall creative execution that merits copyright protection under intellectual property law.`;

        setFormData(prev => ({
          ...prev,
          originalContent: simulatedResponse
        }));
        return;
      }

      const prompt = `Based on the following description of infringing content, generate a professional and detailed description of what the original content likely is. Focus on describing the creative elements, format, style, and characteristics that would make it original copyrightable content. Keep it professional and suitable for a DMCA report.

Infringing content description: "${formData.infringingContent}"

Generate a description of the original content that was infringed:`;

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            contents: [{
              parts: [{
                text: prompt
              }]
            }]
          })
        }
      );

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
      }

      const data = await response.json();

      if (data?.candidates?.[0]?.content?.parts?.[0]?.text) {
        const generatedDescription = data.candidates[0].content.parts[0].text.trim();
        setFormData(prev => ({
          ...prev,
          originalContent: generatedDescription
        }));
      } else {
        throw new Error('No response generated from AI');
      }
    } catch (err) {
      console.error('AI generation error:', err);
      if (err.message.includes('403')) {
        setError('AI service access denied. Please check your API key.');
      } else if (err.message.includes('400')) {
        setError('Invalid request to AI service. Please check your input.');
      } else if (err.message.includes('API key')) {
        setError('Gemini API key not found. Please add VITE_GEMINI_API_KEY to your environment variables.');
      } else {
        setError('Failed to generate AI description. Please try again or write manually.');
      }
    } finally {
      setAiLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Simulate form submission for demo
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Validate required fields
      if (!formData.videoId || !formData.videoUrl || !formData.infringingContent || !formData.originalContent) {
        throw new Error('Please fill in all required fields');
      }

      // In a real app, you would submit to your API:
      /*
      const token = localStorage.getItem('authToken');
      if (!token) {
        throw new Error('Authentication token not found. Please log in again.');
      }

      const formDataToSend = new FormData();
      formDataToSend.append('videoId', formData.videoId);
      formDataToSend.append('videoUrl', formData.videoUrl);
      formDataToSend.append('infringingContent', formData.infringingContent);
      formDataToSend.append('originalContent', formData.originalContent);

      if (formData.documents.proofOfOwnership) {
        formDataToSend.append('documents[proofOfOwnership]', formData.documents.proofOfOwnership);
      }
      if (formData.documents.identification) {
        formDataToSend.append('documents[identification]', formData.documents.identification);
      }
      
      const API_URL = import.meta.env.VITE_API_URL
      const response = await fetch(`${API_URL}/dmca/report`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formDataToSend
      });

      if (!response.ok) {
        throw new Error('Failed to submit report');
      }

      const data = await response.json();
      if (data.reportId) {
        // Navigate to status page
        console.log('Report submitted:', data.reportId);
      }
      */

      // Demo success message
      alert('DMCA report submitted successfully! (Demo mode)');
      
    } catch (err) {
      console.error('DMCA submission error:', err);
      setError(err.message || 'Failed to submit DMCA report');
    } finally {
      setLoading(false);
    }
  };[0] + ': ' + pair[1]);
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
                  onClick={() => window.history.back()}
                  className="flex items-center px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-700 transition-colors duration-200"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </button>
                <button
                  onClick={() => console.log('Navigate to dashboard')}
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

            <div onSubmit={handleSubmit} className="space-y-6">
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
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Description of Original Content <span className="text-red-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={generateAIDescription}
                    disabled={aiLoading || !formData.infringingContent.trim()}
                    className="flex items-center gap-2 px-3 py-1.5 text-xs bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 disabled:from-gray-400 disabled:to-gray-400 text-white rounded-lg font-medium transition-all duration-200 disabled:cursor-not-allowed shadow-sm hover:shadow-md"
                  >
                    {aiLoading ? (
                      <>
                        <Loader2 className="h-3 w-3 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-3 w-3" />
                        Generate with AI
                      </>
                    )}
                  </button>
                </div>
                <textarea
                  name="originalContent"
                  value={formData.originalContent}
                  onChange={handleInputChange}
                  rows="4"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 text-gray-900 placeholder-gray-400 text-sm resize-none"
                  placeholder="Describe your original content... (or use AI to generate based on infringing content description)"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  💡 Tip: Fill in the infringing content description first, then click "Generate with AI" for an automated description of your original content.
                </p>
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
