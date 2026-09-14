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
  sendRegistrationOtp,
  verifyRegistrationOtp,
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
router.post("/send-registration-otp", sendRegistrationOtp);
router.post("/verify-registration-otp", verifyRegistrationOtp);

// Password Reset
router.post("/forgot-password", forgotPassword);
router.post("/reset-password/:token", resetPassword);

// Update unverified contact
router.post("/update-unverified-contact", updateUnverifiedContact);

module.exports = router;