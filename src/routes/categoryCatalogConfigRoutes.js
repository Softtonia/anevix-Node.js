const express = require("express");
const adminAuth = require("../middleware/adminAuth");
const {
  upsertCategoryCatalogConfig,
  getCategoryCatalogConfig,
  deleteCategoryCatalogConfig,
} = require("../controllers/categoryCatalogConfigController");

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
      // Ignore
    }
  }
  next();
};

// Public/passive route to fetch catalog configuration
router.get("/:categoryType/:categoryId", passiveAdminAuth, getCategoryCatalogConfig);

// Admin routes
router.post("/", adminAuth, upsertCategoryCatalogConfig);
router.delete("/:id", adminAuth, deleteCategoryCatalogConfig);

module.exports = router;
