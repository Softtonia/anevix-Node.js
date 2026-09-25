const express = require("express");
const adminAuth = require("../middleware/adminAuth");

const { loginAdmin, forgotPassword, resetPassword, getAdminProfile } = require("../controllers/adminController.js");

const router = express.Router();

router.post("/login", loginAdmin);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password/:token", resetPassword);

router.get("/profile", adminAuth, getAdminProfile);
module.exports = router;
