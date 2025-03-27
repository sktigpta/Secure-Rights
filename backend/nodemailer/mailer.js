import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

// Create the transporter
const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.NODEMAILER_EMAIL,
        pass: process.env.NODEMAILER_PASS,
    },
    port: 465,
    secure: true,
});

// Verify transporter connection
transporter.verify((error, success) => {
    if (error) {
        console.error("Transporter verification failed:", error);
    } else {
        console.log("Transporter verified successfully");
    }
});

// Send email function
export const sendMail = async (to, subject, text, html, attachments = []) => {
    try {
        if (!to || !subject || (!text && !html)) {
            throw new Error("Missing required email fields.");
        }

        const mailOptions = {
            from: process.env.NODEMAILER_EMAIL, // Sender email
            to,
            subject,
            text,
            html,
            attachments, // Attachments now properly defined
        };

        const info = await transporter.sendMail(mailOptions);
        console.log("Email sent successfully:", info.messageId);

        return info;
    } catch (error) {
        console.error("Error sending email:", error);
        throw error;
    }
};
