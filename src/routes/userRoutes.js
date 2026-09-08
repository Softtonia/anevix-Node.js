const express = require("express");
const b2bCustomerAuth = require("../middleware/b2bCustomerAuth");
const adminAuth = require("../middleware/adminAuth");

const router = express.Router();

const {
  addUser,
  signupUser,
  verifyEmailOTP,
  verifyMobileOTP,
  loginUser,
  getUserProfile,
  logoutUser,
  resendEmailOTP,
  deleteUser,
  editUser,
  forgotPassword,
  resetPassword,
  updateUnverifiedContact,
  addOrder,
  addToWishlist,
  addSavedPaymentMethod,
} = require("../controllers/userController");

router.post("/add", adminAuth, addUser);
router.delete("/delete/:id", adminAuth, deleteUser);
router.put("/edit/:id", adminAuth, editUser);

// B2C Customer Signup
router.post("/signup", signupUser);

// Update Unverified Contact Details
router.post("/update-unverified-contact", updateUnverifiedContact);

// Verify Email OTP
router.post("/verify-email", verifyEmailOTP);

router.post("/forgot-password", forgotPassword);
router.post("/reset-password/:token", resetPassword);

router.post("/resend-email-otp", resendEmailOTP);

router.post("/verify-mobile", verifyMobileOTP);

// Login User
router.post("/login", loginUser);

router.get("/profile", b2bCustomerAuth, getUserProfile);

// Logout User
router.post("/logout", b2bCustomerAuth, logoutUser);

// Order and Wishlist
router.post("/order", b2bCustomerAuth, addOrder);
router.post("/wishlist", b2bCustomerAuth, addToWishlist);

// Saved Payment Methods
router.post("/payment-method", b2bCustomerAuth, addSavedPaymentMethod);

module.exports = router;
