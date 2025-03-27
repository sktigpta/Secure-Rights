import {sendMail} from "./mailer.js"
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Get the current directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Helper function to read HTML templates
const readTemplate = (templateName) => {
    try {
        // Define the directory of the current module
        const __filename = fileURLToPath(import.meta.url);
        const __dirname = path.dirname(__filename);

        // Construct the path to the email template
        const templatePath = path.join(__dirname, './emailTemplates', templateName);

        // Read and return the template content
        const template = fs.readFileSync(templatePath, 'utf8');
        console.log(`Template ${templateName} read successfully.`);
        return template;
    } catch (error) {
        console.error("Error reading template:", error);
        throw new Error(`Could not read the email template: ${templateName}`);
    }
};

// Send verification email
 export const sendVerificationEmail = async (email, verificationCode,name) => {
    try {
        const emailTemplate = readTemplate('verificationEmail.html');
        const htmlContent = emailTemplate.replace('{{verificationCode}}', verificationCode).replace('{{name}}',name);
        const subject = "Verify Your Email Address";
        const text = `Your verification code is: ${verificationCode}`;
        console.log(`Sending verification email to: ${email}`);
        await sendMail(email, subject, text, htmlContent);
        console.log("Verification email sent to:", email);
    } catch (error) {
        console.error("Error sending verification email:", error);
        throw new Error("Could not send verification email");
    }
};

// Send OTP email
export const sendOTPEmail = async (email, otp) => {
    try {
        const emailTemplate = readTemplate('otpEmail.html');
        const htmlContent = emailTemplate.replace('{{otp}}', otp);
        const subject = "Your OTP Code";
        const text = `Your OTP is: ${otp}`;
        console.log(`Sending OTP email to: ${email}`);
        await sendMail(email, subject, text, htmlContent);
        console.log("OTP email sent to:", email);
    } catch (error) {
        console.error("Error sending OTP email:", error);
        throw new Error("Could not send OTP email");
    }
};

// Send password reset email
export const sendResetEmail = async (email,name, resetLink) => {
    try {
        const emailTemplate = readTemplate('resetEmail.html');
        const htmlContent = emailTemplate.replace('{{resetLink}}', resetLink).replace(`{{userName}}`,name);
        const subject = "Password Reset Request";
        const text = `Click on the following link to reset your password: ${resetLink}`;
        await sendMail(email, subject, text, htmlContent);
        console.log("Password reset email sent to:", email);
    } catch (error) {
        console.error("Error sending password reset email:", error);
        throw new Error("Could not send password reset email");
    }
};

// Send password reset success email
 export const sendResetSuccessEmail = async (email) => {
    try {
        const emailTemplate = readTemplate('resetSuccessEmail.html');
        const htmlContent = emailTemplate;
        const subject = "Password Reset Successful";
        const text = "Your password has been successfully reset.";
        console.log(`Sending password reset success email to: ${email}`);
        await sendMail(email, subject, text, htmlContent);
        console.log("Password reset success email sent to:", email);
    } catch (error) {
        console.error("Error sending reset success email:", error);
        throw new Error("Could not send reset success email");
    }
};

export const sendDMCAEmail = async (email, name, pdfFilePath) => {
    try {
        const emailTemplate = readTemplate('dmcaEmail.html');
        const htmlContent = emailTemplate.replace('{{name}}', name);

        const subject = "DMCA Notice - Copyright Infringement";
        const text = `Dear ${name},\n\nPlease find the attached DMCA notice regarding copyright infringement.`;

        // Ensure the file exists before sending
        if (!fs.existsSync(pdfFilePath)) {
            throw new Error("DMCA PDF file not found");
        }

        // Send email with attachment
        await sendMail(email, subject, text, htmlContent, [{
            filename: path.basename(pdfFilePath),
            path: pdfFilePath,
            contentType: "application/pdf"
        }]);

        console.log("DMCA notice email sent to:", email);
    } catch (error) {
        console.error("Error sending DMCA notice email:", error);
        throw new Error("Could not send DMCA notice email");
    }
};

