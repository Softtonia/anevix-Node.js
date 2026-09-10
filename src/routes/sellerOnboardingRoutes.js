const express = require("express");
const authenticateJWT = require("../middleware/authenticateJWT");
const requireRole = require("../middleware/roleMiddleware");
const { getSellerProfile, submitStep1 } = require("../controllers/sellerOnboardingController");

const router = express.Router();

router.get("/profile", authenticateJWT, requireRole("b2c-seller"), getSellerProfile);
router.post("/step1", authenticateJWT, requireRole("b2c-seller"), submitStep1);

module.exports = router;
