const puppeteer = require("puppeteer");
const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");
const { sendDMCAEmail } = require("../nodemailer/sendEmail"); // Import sendDMCAEmail

exports.submitDMCA = async (req, res) => {
    const { email, name, videoURL, contentTitle } = req.body;

    if (!email || !name || !videoURL || !contentTitle) {
        return res.status(400).json({ error: "Missing required fields" });
    }

    console.log("DMCA data received:", { email, name, videoURL, contentTitle });

    try {
        // Ensure the attachments directory exists
        const attachmentsDir = path.join(__dirname, "attachments");
        if (!fs.existsSync(attachmentsDir)) {
            fs.mkdirSync(attachmentsDir, { recursive: true });
        }

        // Generate PDF file path
        const pdfPath = path.join(attachmentsDir, `DMCA_Notice_${Date.now()}.pdf`);

        // Create PDF
        const doc = new PDFDocument();
        const stream = fs.createWriteStream(pdfPath);
        doc.pipe(stream);

        doc.fontSize(16).text("DMCA Notice", { align: "center" }).moveDown();
        doc.fontSize(12).text(`Full Name: ${name}`).moveDown();
        doc.text(`Email: ${email}`).moveDown();
        doc.text(`Content Title: ${contentTitle}`).moveDown();
        doc.text(`Video URL: ${videoURL}`).moveDown();
        doc.text("I confirm that I am the rightful owner of the content mentioned above.").moveDown();
        doc.text("This DMCA notice is submitted in good faith under penalty of perjury.").moveDown();

        doc.end();

        // Handle PDF generation errors
        stream.on("error", (error) => {
            console.error("Error writing PDF file:", error);
            return res.status(500).json({ error: "Failed to generate DMCA PDF" });
        });

        stream.on("finish", async () => {
            try {
                // Send the DMCA notice via email
                await sendDMCAEmail(email, name, pdfPath);

                // Delete the generated PDF after sending
                fs.unlink(pdfPath, (err) => {
                    if (err) console.error("Error deleting PDF file:", err);
                });

                res.json({ message: "DMCA request submitted and email sent successfully!" });
            } catch (emailError) {
                console.error("Error sending DMCA email:", emailError);
                res.status(500).json({ error: "DMCA email sending failed" });
            }
        });

    } catch (error) {
        console.error("Error processing DMCA request:", error);
        res.status(500).json({ error: "Failed to process DMCA request" });
    }
};
