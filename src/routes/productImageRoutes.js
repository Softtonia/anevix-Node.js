const express = require("express");
const router = express.Router();
const {
  createProductImage,
  getProductImages,
  getProductImageById,
  updateProductImage,
  deleteProductImage,
  setPrimaryImage,
} = require("../controllers/productImageController");

const adminAuth = require("../middleware/adminAuth");

const passiveAdminAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (authHeader) {
    const token = authHeader.split(" ")[1];
    try {
      const jwt = require("jsonwebtoken");
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      const User = require("../models/User");
      const user = await User.findById(decoded.id);
      
      if (user) {
        const RoleHasUser = require("../models/RoleHasUser");
        const Role = require("../models/Role");
        const roleMappings = await RoleHasUser.find({ user_id: user._id });
        const roleIds = roleMappings.map(m => m.role_id);
        const roles = await Role.find({ id: { $in: roleIds } });
        const hasAdminRole = roles.some((role) => role.slug === "admin");
        
        if (hasAdminRole) {
          req.admin = {
            id: user._id,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
          };
        }
      }
    } catch (err) {
      return res.status(401).json({ message: "Invalid or expired token" });
    }
  }
  next();
};

// Nested routes starting with /api/products/:productId/images
router.post("/:productId/images", adminAuth, createProductImage);
router.get("/:productId/images", passiveAdminAuth, getProductImages);

// Flat routes starting with /api/product-images/:imageId
router.get("/:imageId", passiveAdminAuth, getProductImageById);
router.put("/:imageId", adminAuth, updateProductImage);
router.delete("/:imageId", adminAuth, deleteProductImage);
router.patch("/:imageId/primary", adminAuth, setPrimaryImage);

module.exports = router;
