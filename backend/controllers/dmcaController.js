const puppeteer = require("puppeteer");
const { admin } = require("../config/firebase");
const db = admin.firestore();

exports.submitDMCA = async (req, res) => {
    const { email, name, videoURL, contentTitle } = req.body;

    const data={
        "email":email,
        "name":name,
        "videoURL":videoURL,
        "contentTitle":contentTitle
    }

    if (!email || !name || !videoURL || !contentTitle) {
        return res.status(400).json({ error: "Missing required fields" });
    }

    try {
        const browser = await puppeteer.launch({ headless: false }); // Set to `true` for silent execution
        const page = await browser.newPage();

        await page.goto("https://support.google.com/youtube/answer/2807622");

        // Click "Submit a copyright complaint"
        await page.waitForSelector('a[href*="youtube.com/copyright_complaint_form"]');
        await page.click('a[href*="youtube.com/copyright_complaint_form"]');

        // Wait for the form to load
        await page.waitForSelector('input[name="full_name"]');

        // Fill in the form
        await page.type('input[name="full_name"]', name);
        await page.type('input[name="email"]', email);
        await page.type('textarea[name="work_description"]', `Title: ${contentTitle}`);
        await page.type('textarea[name="infringing_urls"]', videoURL);

        // Agree to terms (Modify selectors based on YouTube's form structure)
        await page.click('input[name="declaration_good_faith"]');
        await page.click('input[name="declaration_accuracy"]');

        // Click Submit
        await page.click('button[type="submit"]');

        await browser.close();

        res.json({ message: "DMCA request submitted successfully!" });
    } catch (error) {
        console.error("Error submitting DMCA:", error);
        res.status(500).json({ error: "Failed to submit DMCA request" });
    }
};

// Create DMCA report
exports.createReport = async (req, res) => {
  try {
    console.log('Received DMCA report request:', req.body);
    console.log('Files:', req.files);

    const {
      videoId,
      videoUrl,
      infringingContent,
      originalContent
    } = req.body;

    const userId = req.user.uid;

    // Validate required fields
    if (!videoId || !videoUrl || !infringingContent || !originalContent) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        details: {
          videoId: !videoId,
          videoUrl: !videoUrl,
          infringingContent: !infringingContent,
          originalContent: !originalContent
        }
      });
    }

    // Create a clean report object with only defined values
    const reportData = {
      userId,
      videoId: videoId.toString(),
      videoUrl: videoUrl.toString(),
      infringingContent: infringingContent.toString(),
      originalContent: originalContent.toString(),
      status: 'pending',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };

    // Handle file uploads if they exist
    if (req.files) {
      const documents = {};
      if (req.files['documents[proofOfOwnership]']) {
        documents.proofOfOwnership = req.files['documents[proofOfOwnership]'][0].path;
      }
      if (req.files['documents[identification]']) {
        documents.identification = req.files['documents[identification]'][0].path;
      }
      if (Object.keys(documents).length > 0) {
        reportData.documents = documents;
      }
    }

    console.log('Saving report data:', reportData);

    const reportRef = await db.collection('dmca_reports').add(reportData);
    
    res.status(201).json({
      message: 'DMCA report created successfully',
      reportId: reportRef.id
    });
  } catch (error) {
    console.error('Error creating DMCA report:', error);
    res.status(500).json({ 
      error: 'Failed to create DMCA report',
      details: error.message 
    });
  }
};

// Get DMCA report status
exports.getReportStatus = async (req, res) => {
  try {
    const { reportId } = req.params;
    const report = await db.collection('dmca_reports').doc(reportId).get();

    if (!report.exists) {
      return res.status(404).json({ error: 'Report not found' });
    }

    res.json(report.data());
  } catch (error) {
    console.error('Error fetching report status:', error);
    res.status(500).json({ error: 'Failed to fetch report status' });
  }
};

// Get user's DMCA reports
exports.getUserReports = async (req, res) => {
  try {
    const userId = req.user.uid;
    const reports = await db.collection('dmca_reports')
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc')
      .get();

    const reportsList = reports.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    res.json(reportsList);
  } catch (error) {
    console.error('Error fetching user reports:', error);
    res.status(500).json({ error: 'Failed to fetch reports' });
  }
};

// Generate and submit DMCA notice
exports.submitNotice = async (req, res) => {
  try {
    const { reportId } = req.params;
    const reportRef = db.collection('dmca_reports').doc(reportId);
    const report = await reportRef.get();

    if (!report.exists) {
      return res.status(404).json({ error: 'Report not found' });
    }

    const reportData = report.data();

    // Generate DMCA notice content
    const noticeContent = generateDMCANotice(reportData);

    // Create notice document
    const noticeRef = await db.collection('dmca_reports').add({
      reportId,
      content: noticeContent,
      status: 'draft',
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    // Update report status
    await reportRef.update({
      status: 'processing',
      'noticeDetails.noticeId': noticeRef.id,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    res.json({
      message: 'DMCA notice generated successfully',
      noticeId: noticeRef.id
    });
  } catch (error) {
    console.error('Error submitting DMCA notice:', error);
    res.status(500).json({ error: 'Failed to submit DMCA notice' });
  }
};

// Helper function to generate DMCA notice
function generateDMCANotice(reportData) {
  return `
    DMCA Takedown Notice

    Date: ${new Date().toISOString()}
    
    To Whom It May Concern:

    I am writing to notify you of a copyright infringement on YouTube.

    Infringing Content:
    Video ID: ${reportData.videoId}
    URL: ${reportData.videoUrl}
    
    Original Content:
    ${reportData.originalContent}
    
    I have a good faith belief that the use of the material in the manner complained of is not authorized by the copyright owner, its agent, or the law.
    
    I swear, under penalty of perjury, that the information in this notification is accurate and that I am the copyright owner or am authorized to act on behalf of the owner of an exclusive right that is allegedly infringed.
    
    Sincerely,
    [User Name]
  `;
}

// Get all notices
exports.getNotices = async (req, res) => {
  try {
    const userId = req.user.uid;
    const noticesSnapshot = await db.collection('dmca_reports')
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc')
      .get();

    const notices = [];
    noticesSnapshot.forEach(doc => {
      notices.push({
        id: doc.id,
        ...doc.data()
      });
    });

    res.json(notices);
  } catch (error) {
    console.error('Error fetching notices:', error);
    res.status(500).json({ error: 'Failed to fetch notices' });
  }
};

// Get a single notice
exports.getNotice = async (req, res) => {
  try {
    const { noticeId } = req.params;
    const noticeDoc = await db.collection('dmca_reports').doc(noticeId).get();
    if (!noticeDoc.exists) {
      return res.status(404).json({ error: 'Notice not found' });
    }

    res.json({
      id: noticeDoc.id,
      ...noticeDoc.data()
    });
  } catch (error) {
    console.error('Error fetching notice:', error);
    res.status(500).json({ error: 'Failed to fetch notice' });
  }
};

// Update notice status
exports.updateNoticeStatus = async (req, res) => {
  try {
    const { noticeId } = req.params;
    const { status, adminNotes } = req.body;

    if (!['pending', 'processing', 'completed', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const noticeRef = db.collection('dmca_reports').doc(noticeId);
    const noticeDoc = await noticeRef.get();

    if (!noticeDoc.exists) {
      return res.status(404).json({ error: 'Notice not found' });
    }

    const updateData = {
      status,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };

    if (adminNotes) {
      updateData.adminNotes = adminNotes;
    }

    await noticeRef.update(updateData);

    // If notice is completed or rejected, update the associated report status
    if (status === 'completed' || status === 'rejected') {
      const reportId = noticeDoc.data().reportId;
      await db.collection('dmca_reports').doc(reportId).update({
        status: status === 'completed' ? 'completed' : 'rejected',
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    }

    res.json({ message: 'Notice status updated successfully' });
  } catch (error) {
    console.error('Error updating notice status:', error);
    res.status(500).json({ error: 'Failed to update notice status' });
  }
};

// Update report status
exports.updateReportStatus = async (req, res) => {
  try {
    const { reportId } = req.params;
    const { status, adminNotes } = req.body;

    if (!['pending', 'processing', 'completed', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const reportRef = db.collection('dmca_reports').doc(reportId);
    const reportDoc = await reportRef.get();

    if (!reportDoc.exists) {
      return res.status(404).json({ error: 'Report not found' });
    }

    const updateData = {
      status,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };

    if (adminNotes) {
      updateData.adminNotes = adminNotes;
    }

    await reportRef.update(updateData);

    res.json({ message: 'Report status updated successfully' });
  } catch (error) {
    console.error('Error updating report status:', error);
    res.status(500).json({ error: 'Failed to update report status' });
  }
};
