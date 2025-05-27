import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Shield, Clock, CheckCircle, XCircle, AlertCircle, ArrowLeft, Home } from 'lucide-react';
import axios from 'axios';

function DMCAStatus() {
  const { reportId } = useParams();
  const navigate = useNavigate();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchReport = async () => {
      try {
        const response = await axios.get(`/api/dmca/report/${reportId}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('authToken')}`
          }
        });
        setReport(response.data);
      } catch (err) {
        setError(err.response?.data?.error || 'Failed to fetch report status');
      } finally {
        setLoading(false);
      }
    };

    fetchReport();
  }, [reportId]);

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-6 w-6 text-yellow-500" />;
      case 'processing':
        return <AlertCircle className="h-6 w-6 text-blue-500" />;
      case 'completed':
        return <CheckCircle className="h-6 w-6 text-green-500" />;
      case 'rejected':
        return <XCircle className="h-6 w-6 text-red-500" />;
      default:
        return <Shield className="h-6 w-6 text-gray-500" />;
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'pending':
        return 'Pending Review';
      case 'processing':
        return 'Processing';
      case 'completed':
        return 'Completed';
      case 'rejected':
        return 'Rejected';
      default:
        return 'Unknown';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#003366] to-[#001a33] flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#003366] to-[#001a33] flex items-center justify-center">
        <div className="text-red-500">{error}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#003366] to-[#001a33] py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white/5 backdrop-blur-lg rounded-2xl p-8 shadow-xl border border-white/10">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center">
              <Shield className="h-12 w-12 text-white" />
              <h1 className="text-2xl font-bold text-white ml-4">DMCA Report Status</h1>
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

          <div className="space-y-6">
            <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
              <div className="flex items-center">
                {getStatusIcon(report.status)}
                <span className="ml-3 text-white">{getStatusText(report.status)}</span>
              </div>
              <div className="text-white/70 text-sm">
                Report ID: {reportId}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-4 bg-white/5 rounded-lg">
                <h3 className="text-white/80 text-sm font-medium mb-2">Video Information</h3>
                <p className="text-white">URL: {report.videoUrl}</p>
                <p className="text-white">ID: {report.videoId}</p>
              </div>

              <div className="p-4 bg-white/5 rounded-lg">
                <h3 className="text-white/80 text-sm font-medium mb-2">Timeline</h3>
                <p className="text-white">Created: {new Date(report.createdAt).toLocaleString()}</p>
                <p className="text-white">Last Updated: {new Date(report.updatedAt).toLocaleString()}</p>
              </div>
            </div>

            <div className="p-4 bg-white/5 rounded-lg">
              <h3 className="text-white/80 text-sm font-medium mb-2">Report Details</h3>
              <div className="space-y-4">
                <div>
                  <h4 className="text-white/70 text-sm">Infringing Content</h4>
                  <p className="text-white mt-1">{report.infringingContent}</p>
                </div>
                <div>
                  <h4 className="text-white/70 text-sm">Original Content</h4>
                  <p className="text-white mt-1">{report.originalContent}</p>
                </div>
              </div>
            </div>

            {report.noticeDetails && (
              <div className="p-4 bg-white/5 rounded-lg">
                <h3 className="text-white/80 text-sm font-medium mb-2">DMCA Notice</h3>
                <p className="text-white">Notice ID: {report.noticeDetails.noticeId}</p>
                <p className="text-white">Submitted: {new Date(report.noticeDetails.submittedAt).toLocaleString()}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default DMCAStatus; 