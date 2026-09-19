const express = require("express");

const {
  registerCustomer,
  loginCustomer,
  verifyEmailOTP,
  verifyMobileOTP,
  resendEmailOTP,
  resendMobileOTP,
  forgotPassword,
  resetPassword,
  updateUnverifiedContact,
  sendRegistrationOtp,
  verifyRegistrationOtp,
  sendRegistrationEmailOtp,
  sendRegistrationMobileOtp,
  verifyRegistrationEmailOtp,
  verifyRegistrationMobileOtp,
  resendRegistrationEmailOtp,
  resendRegistrationMobileOtp,
} = require("../controllers/userController");

const router = express.Router();

// B2C Customer Registration
router.post("/register", registerCustomer);

// B2C Customer Login
router.post("/login", loginCustomer);

// Dedicated Registration OTP Endpoints for Email & Mobile
router.post("/send-email-otp", sendRegistrationEmailOtp);
router.post("/send-mobile-otp", sendRegistrationMobileOtp);
router.post("/verify-email-otp", verifyRegistrationEmailOtp);
router.post("/verify-mobile-otp", verifyRegistrationMobileOtp);
router.post("/resend-email-otp", resendRegistrationEmailOtp);
router.post("/resend-mobile-otp", resendRegistrationMobileOtp);

// General & Post-registration OTP Verification
router.post("/verify-email", verifyEmailOTP);
router.post("/verify-mobile", verifyMobileOTP);
router.post("/resend-email", resendEmailOTP);
router.post("/resend-mobile", resendMobileOTP);
router.post("/send-registration-otp", sendRegistrationOtp);
router.post("/verify-registration-otp", verifyRegistrationOtp);

// Password Reset
router.post("/forgot-password", forgotPassword);
router.post("/reset-password/:token", resetPassword);

// Update unverified contact
router.post("/update-unverified-contact", updateUnverifiedContact);

module.exports = router;