const express = require("express");
const authenticateJWT = require("../../middleware/authenticateJWT");
const requireRole = require("../../middleware/roleMiddleware");
const adminAuth = require("../../middleware/adminAuth");

const router = express.Router();

const {
  addUser,
  getUserProfile,
  logoutUser,
  deleteUser,
  editUser,
  getAllUsers,
  addOrder,
  addToWishlist,
  addSavedPaymentMethod,
  getUserById,
} = require("../../controllers/auth/userController");

router.get("/", adminAuth, getAllUsers);
router.get("/profile", authenticateJWT, getUserProfile);
router.get("/:id", adminAuth, getUserById);

router.post("/add", adminAuth, addUser);

// Logout User
router.post("/logout", authenticateJWT, logoutUser);

// Order and Wishlist
router.post("/order", authenticateJWT, requireRole("b2c-customer", "b2b-buyer"), addOrder);
router.post("/wishlist", authenticateJWT, requireRole("b2c-customer", "b2b-buyer"), addToWishlist);

// Saved Payment Methods
router.post("/payment-method", authenticateJWT, requireRole("b2c-customer", "b2b-buyer"), addSavedPaymentMethod);

module.exports = router;
