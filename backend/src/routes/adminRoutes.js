const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");

const { registerAdmin, loginAdmin, forgotPassword } = require("../controllers/adminController.js");

const router = express.Router();

router.post("/register", registerAdmin);
router.post("/login", loginAdmin);
router.post("/forgot-password", forgotPassword);

router.get("/profile", authMiddleware, (req, res) => {
  res.json({
    message: "Admin is authenticated",
    admin: req.admin,
  });
});
module.exports = router;
