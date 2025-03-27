const express = require("express");
const { signUp, logIn, resetPassword, logOut,verifyEmail, checkAuth } = require("../controllers/authController");
const { verifyToken } = require("../middleware/verifyToken");
const router = express.Router();

router.get("/check-auth",verifyToken, checkAuth)
router.post("/signup",signUp);  
router.post("/verify",verifyEmail);
router.post("/login",logIn);
router.post("/reset-password",resetPassword);
router.post("/logout",logOut);

module.exports = router;

