const express = require("express");
const b2bCustomerAuth = require("../middleware/b2bCustomerAuth");
const adminAuth = require("../middleware/adminAuth");

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

router.post("/add", adminAuth, addUser);
router.delete("/delete/:id", adminAuth, deleteUser);
router.put("/edit/:id", adminAuth, editUser);

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

router.get("/profile", b2bCustomerAuth, getUserProfile);

// Logout User
router.post("/logout", b2bCustomerAuth, logoutUser);

module.exports = router;
