const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware.js');
const {
  createReport,
  getReportStatus,
  getUserReports,
  submitNotice,
  getNotices,
  getNotice,
  updateNoticeStatus,
  updateReportStatus
} = require('../controllers/dmcaController');

// All routes require authentication
router.use(authenticate);

// Create new DMCA report with file upload support
router.post('/report', upload.fields([
  { name: 'documents[proofOfOwnership]', maxCount: 1 },
  { name: 'documents[identification]', maxCount: 1 }
]), createReport);

// Get specific report status
router.get('/report/:reportId', getReportStatus);

// Get all reports for the authenticated user
router.get('/reports', getUserReports);

// Submit DMCA notice for a report
router.post('/notice/:reportId', submitNotice);

// Notice routes
router.get('/notices', getNotices);
router.get('/notice/:noticeId', getNotice);
router.patch('/notice/:noticeId/status', updateNoticeStatus);

// Update report status
router.patch('/report/:reportId/status', updateReportStatus);

module.exports = router;
 