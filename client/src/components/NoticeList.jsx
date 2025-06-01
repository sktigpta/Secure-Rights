import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Clock, CheckCircle, XCircle, AlertCircle, Search } from 'lucide-react';
import axios from 'axios';

function NoticeList() {
  const navigate = useNavigate();
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    fetchNotices();
  }, []);

  const fetchNotices = async () => {
    try {
      const API_URL = import.meta.env.VITE_API_URL;
      const response = await axios.get(`${API_URL}/dmca/notices`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });
      
     
      const noticesData = Array.isArray(response.data) ? response.data : [];
      console.log('Processed Notices:', noticesData);
      setNotices(noticesData);
    } catch (err) {
      console.error('Error fetching notices:', err);
      console.error('Error details:', {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status
      });
      setError(err.response?.data?.error || 'Failed to fetch notices');
      setNotices([]);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-5 w-5 text-yellow-500" />;
      case 'processing':
        return <AlertCircle className="h-5 w-5 text-blue-500" />;
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'rejected':
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Shield className="h-5 w-5 text-gray-500" />;
    }
  };

  const filteredNotices = Array.isArray(notices) ? notices.filter(notice => {
    if (!notice) return false;
    
    const searchLower = searchTerm.toLowerCase();
    const reportId = String(notice.reportId || '').toLowerCase();
    const videoId = String(notice.videoId || '').toLowerCase();
    const status = String(notice.status || '').toLowerCase();
    
    console.log('Filtering notice:', { notice, searchLower, reportId, videoId, status });
    
    const matchesSearch = searchTerm === '' || 
      reportId.includes(searchLower) || 
      videoId.includes(searchLower);
    const matchesStatus = statusFilter === 'all' || status === statusFilter.toLowerCase();
    
    console.log('Filter results:', { matchesSearch, matchesStatus });
    
    return matchesSearch && matchesStatus;
  }) : [];

  console.log('Filtered Notices:', filteredNotices);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#003366] to-[#001a33] flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#003366] to-[#001a33] py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white/5 backdrop-blur-lg rounded-2xl p-8 shadow-xl border border-white/10">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center">
              <Shield className="h-12 w-12 text-white" />
              <h1 className="text-2xl font-bold text-white ml-4">DMCA Notices</h1>
            </div>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-500/20 rounded-lg flex items-center text-red-300">
              <AlertCircle className="h-5 w-5 mr-2" />
              <span>{error}</span>
            </div>
          )}

          <div className="mb-6 flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-white/50" />
                <input
                  type="text"
                  placeholder="Search by Report ID or Video ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-blue-400/50"
                />
              </div>
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-400/50 [&>option]:bg-[#003366] [&>option]:text-white"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="processing">Processing</option>
              <option value="completed">Completed</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-white/70 text-sm">
                  <th className="pb-4">Status</th>
                  <th className="pb-4">Report ID</th>
                  <th className="pb-4">Video ID</th>
                  <th className="pb-4">Created</th>
                  <th className="pb-4">Last Updated</th>
                  <th className="pb-4">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {filteredNotices.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="py-8 text-center text-white/70">
                      {notices.length === 0 ? 'No notices available' : 'No notices match your search criteria'}
                    </td>
                  </tr>
                ) : (
                  filteredNotices.map((notice) => (
                    <tr key={notice.id} className="text-white">
                      <td className="py-4">
                        <div className="flex items-center">
                          {getStatusIcon(notice.status)}
                          <span className="ml-2 capitalize">{notice.status}</span>
                        </div>
                      </td>
                      <td className="py-4">{notice.id}</td>
                      <td className="py-4">{notice.videoId}</td>
                      <td className="py-4">{new Date(notice.createdAt._seconds * 1000).toLocaleString()}</td>
                      <td className="py-4">{new Date(notice.updatedAt._seconds * 1000).toLocaleString()}</td>
                      <td className="py-4">
                        <button
                          onClick={() => navigate(`/dmca/notice/${notice.id}`)}
                          className="px-4 py-2 bg-blue-500 hover:bg-blue-400 text-white rounded-lg transition-colors"
                        >
                          Review
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

export default NoticeList; 