const express = require("express");

const {
  registerBusiness,
  loginBusiness,
  verifyEmailOTP,
  verifyMobileOTP,
  resendEmailOTP,
  resendMobileOTP,
  updateUnverifiedContact,
  forgotPassword,
  resetPassword,
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

// Business Registration & Login
router.post("/register", registerBusiness);
router.post("/login", loginBusiness);

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

// Update Unverified Contact
router.post("/update-unverified-contact", updateUnverifiedContact);

// Password Management
router.post("/forgot-password", forgotPassword);
router.post("/reset-password/:token", resetPassword);

module.exports = router;