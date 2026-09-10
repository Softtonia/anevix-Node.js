const express = require("express");
const authenticateJWT = require("../middleware/authenticateJWT");
const requireRole = require("../middleware/roleMiddleware");
const adminAuth = require("../middleware/adminAuth");

const router = express.Router();

const {
  addUser,
  getUserProfile,
  logoutUser,
  deleteUser,
  editUser,
  addOrder,
  addToWishlist,
  addSavedPaymentMethod,
} = require("../controllers/userController");

router.post("/add", adminAuth, addUser);
router.delete("/delete/:id", adminAuth, deleteUser);
router.put("/edit/:id", adminAuth, editUser);



router.get("/profile", authenticateJWT, requireRole("b2c-customer", "b2b-buyer", "b2b-seller"), getUserProfile);

// Logout User
router.post("/logout", authenticateJWT, requireRole("b2c-customer", "b2b-buyer", "b2b-seller"), logoutUser);

// Order and Wishlist
router.post("/order", authenticateJWT, requireRole("b2c-customer", "b2b-buyer"), addOrder);
router.post("/wishlist", authenticateJWT, requireRole("b2c-customer", "b2b-buyer"), addToWishlist);

// Saved Payment Methods
router.post("/payment-method", authenticateJWT, requireRole("b2c-customer", "b2b-buyer"), addSavedPaymentMethod);

module.exports = router;
