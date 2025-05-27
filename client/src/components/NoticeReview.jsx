import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Shield, Clock, CheckCircle, XCircle, AlertCircle, ArrowLeft, Home } from 'lucide-react';
import axios from 'axios';

function NoticeReview() {
  const { noticeId } = useParams();
  const navigate = useNavigate();
  const [notice, setNotice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updating, setUpdating] = useState(false);
  const [status, setStatus] = useState('');
  const [adminNotes, setAdminNotes] = useState('');

  const API_URL = import.meta.env.VITE_API_URL;

  useEffect(() => {
    fetchNotice();
  }, [noticeId]);

  const fetchNotice = async () => {
    try {
       const response = await axios.get(`${API_URL}/dmca/notice/${noticeId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });
      setNotice(response.data);
      setStatus(response.data.status);
      setAdminNotes(response.data.adminNotes || '');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch notice');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async () => {
    setUpdating(true);
    try {
      await axios.patch(`${API_URL}/dmca/notice/${noticeId}/status`, {
        status,
        adminNotes
      }, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });
      await fetchNotice(); // Refresh the notice data
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update notice status');
    } finally {
      setUpdating(false);
    }
  };

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
              <h1 className="text-2xl font-bold text-white ml-4">Review DMCA Notice</h1>
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
                {getStatusIcon(notice.status)}
                <span className="ml-3 text-white capitalize">{notice.status}</span>
              </div>
              <div className="text-white/70 text-sm">
                Notice ID: {noticeId}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-4 bg-white/5 rounded-lg">
                <h3 className="text-white/80 text-sm font-medium mb-2">Report Information</h3>
                <p className="text-white">Report ID: {notice.reportId}</p>
                <p className="text-white">Video ID: {notice.videoId}</p>
              </div>

              <div className="p-4 bg-white/5 rounded-lg">
                <h3 className="text-white/80 text-sm font-medium mb-2">Timeline</h3>
                <p className="text-white">Created: {new Date(notice.createdAt).toLocaleString()}</p>
                <p className="text-white">Last Updated: {new Date(notice.updatedAt).toLocaleString()}</p>
              </div>
            </div>

            <div className="p-4 bg-white/5 rounded-lg">
              <h3 className="text-white/80 text-sm font-medium mb-4">Update Status</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2">
                    Status
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-400/50 [&>option]:bg-[#003366] [&>option]:text-white"
                  >
                    <option value="pending">Pending</option>
                    <option value="processing">Processing</option>
                    <option value="completed">Completed</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2">
                    Admin Notes
                  </label>
                  <textarea
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    rows="4"
                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-400/50"
                    placeholder="Add notes about this notice..."
                  />
                </div>

                <button
                  onClick={handleStatusUpdate}
                  disabled={updating}
                  className="w-full bg-blue-500 hover:bg-blue-400 text-white py-2 px-4 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {updating ? 'Updating...' : 'Update Status'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default NoticeReview; 