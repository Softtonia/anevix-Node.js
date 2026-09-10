const express = require("express");

const {
  registerBusiness,
  loginBusiness,
  verifyEmailOTP,
  verifyMobileOTP,
  resendEmailOTP,
  updateUnverifiedContact,
  forgotPassword,
  resetPassword,
} = require("../controllers/userController");

const router = express.Router();

// Business Registration & Login
router.post("/register", registerBusiness);
router.post("/login", loginBusiness);

// OTP Verification
router.post("/verify-email", verifyEmailOTP);
router.post("/verify-mobile", verifyMobileOTP);
router.post("/resend-email-otp", resendEmailOTP);

// Update Unverified Contact
router.post("/update-unverified-contact", updateUnverifiedContact);

// Password Management
router.post("/forgot-password", forgotPassword);
router.post("/reset-password/:token", resetPassword);

module.exports = router;