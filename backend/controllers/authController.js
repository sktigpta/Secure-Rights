const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/user.model.js");
const {sendVerificationEmail} = require("../nodemailer/sendEmail.js")
const generateTokenAndSetCookie = require("../utils/generateAndSetCookies.js")

const signUp = async (req, res) => {
    const { fullname, email, password } = req.body;

    
    try {
        let user = await User.findOne({ email });

        if (user) {
            return res.status(400).json({ message: 'User already exists' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const verificationToken = Math.floor(100000 + Math.random() * 900000).toString();

        user = new User({
            email,
            password: hashedPassword,
            fullname:fullname, 
            verificationToken,
            verificationTokenExpiresAt: Date.now() + 24 * 60 * 60 * 1000, // 24 hours expiration
        });

        await user.save();

        await sendVerificationEmail(user.email, verificationToken,user.name);
        generateTokenAndSetCookie(res, user._id);

        res.status(201).json({
            success: true,
            message: "User created successfully! Please verify your email.",
            user: {
                ...user._doc,
                password: undefined, 
            },
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

 const verifyEmail = async (req, res) => {
    const { code } = req.body;

    try {
        // Find the user with the provided verification code and check if the code is still valid
        const user = await User.findOne({
            verificationToken: code,
            verificationTokenExpiresAt: { $gt: Date.now() }, // Ensure the token is not expired
        });

        if (!user) {
            return res.status(400).json({
                success: false,
                message: "Verification code is invalid or expired!",
            });
        }

        // Update user properties to mark them as verified
        user.isVerified = true;
        user.verificationToken = undefined; // Remove verification token
        user.verificationTokenExpiresAt = undefined; // Remove token expiration date
        await user.save();

        // Respond with success
        res.status(200).json({
            success: true,
            message: "Email verified successfully!",
            user: {
                ...user._doc,
                password: undefined, // Exclude sensitive data
            },
        });

        console.log("Email verified successfully!");
    } catch (error) {
        console.error("Error in email verification:", error);
        res.status(500).json({
            success: false,
            message: "Error in verifying the user!",
            error: error.message,
        });
    }
};

// User Login
const logIn = async (req, res) => {
    const { email, password } = req.body;

    try {
        const user = await User.findOne({ email })
        if (!user) {
            return res.status(400).json({ success: false, message: "Invalid credientials!" })
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(400).json({ success: false, message: "Invalid credientials!" })

        }

        generateTokenAndSetCookie(res, user._id);
        user.lastLogin = new Date();
        await user.save();

        res.status(200).json({
            success: true,
            message: "successfully signed in!",
            user: {
                ...user._doc,
                password: undefined
            }
        })
        console.log("singed in!")
    } catch (error) {
        console.log("error in login!", error)
        res.status(400).json({ success: false, message: "error in singing you inn!" })
    }
}

// Reset Password
const resetPassword = async (req, res) => {
    try {
        const { email, newPassword } = req.body;

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        user.password = hashedPassword;
        await user.save();

        res.status(200).json({ message: "Password reset successful" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
};

// Logout 
 const logOut = async (req, res) => {
    try {
        res.clearCookie("token", {
            httpOnly: true,  
            secure: process.env.NODE_ENV === "production", 
            sameSite: "strict",  
        });

        // Respond with success
        res.status(200).json({
            success: true,
            message: "Logged out successfully",
        });

       
        console.log("User logged out successfully");
    } catch (error) {
        // Handle potential errors
        console.error("Logout error:", error);
        res.status(500).json({
            success: false,
            message: "Logout failed. Please try again.",
        });
    }
};

const checkAuth = async (req, res) => {
    try {
        // Fetch user by ID from the request object, excluding password
        const user = await User.findById(req.userId).select("-password");

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found!"
            });
        }

        // Respond with user data if found
        res.status(200).json({
            success: true,
            user
        });
    } catch (error) {
        console.error("Error in checkAuth:", error);
        res.status(500).json({
            success: false,
            message: "Error verifying user!",
            error: error.message
        });
    }
};

module.exports = { signUp, logIn, resetPassword, logOut,verifyEmail,checkAuth };
