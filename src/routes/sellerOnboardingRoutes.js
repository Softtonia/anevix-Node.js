const express = require("express");
const authenticateJWT = require("../middleware/authenticateJWT");
const requireRole = require("../middleware/roleMiddleware");
const { getSellerProfile, submitStep1, verifyPAN, verifyGSTIN, verifyBankAccount } = require("../controllers/sellerOnboardingController");

const router = express.Router();

router.get("/profile", authenticateJWT, requireRole("b2c-seller"), getSellerProfile);
router.post("/step1", authenticateJWT, requireRole("b2c-seller"), submitStep1);
router.post("/pan", authenticateJWT, requireRole("b2c-seller"), verifyPAN);
router.post("/gstin", authenticateJWT, requireRole("b2c-seller"), verifyGSTIN);
router.post("/bank", authenticateJWT, requireRole("b2c-seller"), verifyBankAccount);

module.exports = router;
