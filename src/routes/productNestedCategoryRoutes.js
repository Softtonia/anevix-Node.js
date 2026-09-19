const express = require("express");
const adminAuth = require("../middleware/adminAuth");
const {
  createProductNestedSubCategory,
  getProductNestedSubCategories,
  getProductNestedSubCategoryById,
  updateProductNestedSubCategory,
  deleteProductNestedSubCategory,
} = require("../controllers/productNestedSubCategoryController");

const router = express.Router();

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
      // Ignored for passive auth
    }
  }
  next();
};

// Public routes
router.get("/", passiveAdminAuth, getProductNestedSubCategories);
router.get("/:id", passiveAdminAuth, getProductNestedSubCategoryById);

// Admin routes
router.post("/", adminAuth, createProductNestedSubCategory);
router.put("/:id", adminAuth, updateProductNestedSubCategory);
router.delete("/:id", adminAuth, deleteProductNestedSubCategory);

module.exports = router;
