const express = require("express");
const authenticateJWT = require("../middleware/authenticateJWT");
const requireRole = require("../middleware/roleMiddleware");
const { getSellerProfile, submitStep1, verifyPAN, verifyGSTIN, verifyBankAccount, registerCompleteB2CSeller, sendMobileOtp, verifyMobileOtp } = require("../controllers/sellerOnboardingController");

const router = express.Router();

router.get("/profile", authenticateJWT, requireRole("b2c-seller"), getSellerProfile);
router.post("/step1", authenticateJWT, requireRole("b2c-seller"), submitStep1);
router.post("/pan", authenticateJWT, requireRole("b2c-seller"), verifyPAN);
router.post("/gstin", authenticateJWT, requireRole("b2c-seller"), verifyGSTIN);
router.post("/bank", authenticateJWT, requireRole("b2c-seller"), verifyBankAccount);
router.post("/register-complete", authenticateJWT, requireRole("b2c-seller"), registerCompleteB2CSeller);
router.post("/mobile/send-otp", authenticateJWT, requireRole("b2c-seller"), sendMobileOtp);
router.post("/mobile/verify-otp", authenticateJWT, requireRole("b2c-seller"), verifyMobileOtp);

module.exports = router;
