const express = require("express");
const authenticateJWT = require("../../middleware/authenticateJWT");
const requireRole = require("../../middleware/roleMiddleware");
const { getSellerProfile, submitStep1, verifyPAN, verifyGSTIN, verifyBankAccount, registerCompleteB2CSeller, sendMobileOtp, verifyMobileOtp, updateSellerProfile } = require("../../controllers/seller/sellerOnboardingController");

const router = express.Router();

router.get("/profile", authenticateJWT, requireRole("b2c-seller", "b2b-seller"), getSellerProfile);
router.put("/profile", authenticateJWT, requireRole("b2c-seller", "b2b-seller"), updateSellerProfile);
router.post("/step1", authenticateJWT, requireRole("b2c-seller", "b2b-seller"), submitStep1);
router.post("/pan", authenticateJWT, requireRole("b2c-seller", "b2b-seller"), verifyPAN);
router.post("/gstin", authenticateJWT, requireRole("b2c-seller", "b2b-seller"), verifyGSTIN);
router.post("/bank", authenticateJWT, requireRole("b2c-seller", "b2b-seller"), verifyBankAccount);
router.post("/register-complete", authenticateJWT, requireRole("b2c-seller", "b2b-seller"), registerCompleteB2CSeller);
router.post("/mobile/send-otp", authenticateJWT, requireRole("b2c-seller", "b2b-seller"), sendMobileOtp);
router.post("/mobile/verify-otp", authenticateJWT, requireRole("b2c-seller", "b2b-seller"), verifyMobileOtp);

module.exports = router;
