const express = require("express");
const adminAuth = require("../middleware/adminAuth");
const {
  createCategoryCustomField,
  getCategoryCustomFields,
  getCategoryCustomFieldById,
  updateCategoryCustomField,
  deleteCategoryCustomField,
} = require("../controllers/categoryCustomFieldController");

const router = express.Router();

// Passive admin auth to populate req.admin without blocking unauthenticated requests
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
        const roleIds = roleMappings.map((m) => m.role_id);
        const roles = await Role.find({ id: { $in: roleIds } });
        if (roles.some((role) => role.slug === "admin")) {
          req.admin = {
            id: user._id,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
          };
          req.user = req.admin;
        }
      }
    } catch (err) {
      // Ignore invalid/expired token for passive routes
    }
  }
  next();
};

// Public/passive routes
router.get("/", passiveAdminAuth, getCategoryCustomFields);
router.get("/:id", passiveAdminAuth, getCategoryCustomFieldById);

// Protected admin routes
router.post("/", adminAuth, createCategoryCustomField);
router.put("/:id", adminAuth, updateCategoryCustomField);
router.delete("/:id", adminAuth, deleteCategoryCustomField);

module.exports = router;
