const express = require("express");
const adminAuth = require("../middleware/adminAuth");
const {
  createCategory,
  getCategories,
  getCategoryById,
  updateCategory,
  deleteCategory,
} = require("../controllers/categoryController");

const router = express.Router();

// Public routes
// We use a custom middleware to inject admin details without throwing an error if token is missing
// to allow the controller to check `req.admin` and determine whether to show inactive categories.
// Or we can just let `adminAuth` handle the POST/PUT/DELETE, and for GET, we can just optionally 
// extract the token. But for simplicity, we'll extract it manually in the controller or just use a passive auth middleware.
// Let's create a quick inline passive auth to populate req.admin if token is valid, but not block if not.
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

router.get("/", passiveAdminAuth, getCategories);
router.get("/:id", passiveAdminAuth, getCategoryById);

// Admin routes
router.post("/", adminAuth, createCategory);
router.put("/:id", adminAuth, updateCategory);
router.delete("/:id", adminAuth, deleteCategory);

module.exports = router;
