const express = require("express");
const adminAuth = require("../../middleware/adminAuth");

const { loginAdmin, forgotPassword, resetPassword, getAdminProfile } = require("../../controllers/auth/adminController.js");
const { getAllSellerOnboardings, verifySellerOnboarding } = require("../../controllers/auth/adminSellerVerificationController");

const router = express.Router();

router.post("/login", loginAdmin);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password/:token", resetPassword);

router.get("/profile", adminAuth, getAdminProfile);

// Seller Verification Routes
router.get("/seller-onboardings", adminAuth, getAllSellerOnboardings);
router.post("/seller-onboardings/:id/verify", adminAuth, verifySellerOnboarding);

module.exports = router;
