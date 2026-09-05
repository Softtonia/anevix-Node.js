const express = require("express");
const userAuthMiddleware = require("../middleware/userAuthMiddleware");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

const {
  addUser,
  signupUser,
  verifyEmailOTP,
  verifyMobileOTP,
  loginUser,
  getUserProfile,
  logoutUser,
  resendEmailOTP,
  deleteUser,
  editUser,
  forgotPassword,
  resetPassword,
} = require("../controllers/userController");

router.post("/add", authMiddleware, addUser);
router.delete("/delete/:id", authMiddleware, deleteUser);
router.put("/edit/:id", authMiddleware, editUser);

// B2C Customer Signup
router.post("/signup", signupUser);

// Verify Email OTP
router.post("/verify-email", verifyEmailOTP);

router.post("/forgot-password", forgotPassword);
router.post("/reset-password/:token", resetPassword);

router.post("/resend-email-otp", resendEmailOTP);

router.post("/verify-mobile", verifyMobileOTP);

// Login User
router.post("/login", loginUser);

router.get("/profile", userAuthMiddleware, getUserProfile);

// Logout User
router.post("/logout", userAuthMiddleware, logoutUser);

module.exports = router;
