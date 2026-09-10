const express = require("express");

const {
  registerCustomer,
  loginCustomer,
  verifyEmailOTP,
  verifyMobileOTP,
  resendEmailOTP,
  forgotPassword,
  resetPassword,
  updateUnverifiedContact,
} = require("../controllers/userController");

const router = express.Router();

// B2C Customer Registration
router.post("/register", registerCustomer);

// B2C Customer Login
router.post("/login", loginCustomer);

// OTP Verification
router.post("/verify-email", verifyEmailOTP);
router.post("/verify-mobile", verifyMobileOTP);
router.post("/resend-email-otp", resendEmailOTP);

// Password Reset
router.post("/forgot-password", forgotPassword);
router.post("/reset-password/:token", resetPassword);

// Update unverified contact
router.post("/update-unverified-contact", updateUnverifiedContact);

module.exports = router;