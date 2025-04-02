const express = require("express");
const router = express.Router();
const { authenticate, adminMiddleware } = require("../middleware/authMiddleware");
const {
  register,
  login,
  getMe,
  setUserRole
} = require("../controllers/authController");

// Public routes
router.post("/register", register);
router.post("/login", login);

// Authenticated routes
router.get("/me", authenticate, getMe);

// Admin-only routes
router.post("/set-role", authenticate, adminMiddleware, setUserRole);

module.exports = router;