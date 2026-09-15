const express = require("express");
const adminAuth = require("../middleware/adminAuth");
const {
  createProduct,
  getProducts,
  getProductById,
  updateProduct,
  deleteProduct,
} = require("../controllers/productController");

const {
  createVariant,
  getVariants,
} = require("../controllers/productVariantController");

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
      return res.status(401).json({ message: "Invalid or expired token" });
    }
  }
  next();
};

router.get("/", passiveAdminAuth, getProducts);
router.get("/:id", passiveAdminAuth, getProductById);

// Admin routes
router.post("/", adminAuth, createProduct);
router.post("/:productId/variants", adminAuth, createVariant);
router.get("/:productId/variants", passiveAdminAuth, getVariants);
router.put("/:id", adminAuth, updateProduct);
router.delete("/:id", adminAuth, deleteProduct);

module.exports = router;
