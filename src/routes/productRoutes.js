const express = require("express");
const adminAuth = require("../middleware/adminAuth");
const {
  createProduct,
  verifyProduct,
  rejectProduct,
  getAdminProducts,
  getProducts,
  getProductBatches,
  getProductById,
  updateProduct,
  deleteProduct,
  getProductTypeSchema,
  downloadProductTemplate,
  bulkUploadProducts,
} = require("../controllers/productController");

const {
  createVariant,
  getVariants,
} = require("../controllers/productVariantController");

const {
  createCompositeProduct
} = require("../controllers/productCompositeController");

const { upload } = require("./uploadRoutes");

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

const sellerOrAdminAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ message: "No token provided" });
  }

  const token = authHeader.split(" ")[1];
  try {
    const jwt = require("jsonwebtoken");
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const User = require("../models/User");
    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(401).json({ message: "User no longer exists" });
    }

    const RoleHasUser = require("../models/RoleHasUser");
    const Role = require("../models/Role");

    const roleMappings = await RoleHasUser.find({ user_id: user._id });
    const roleIds = roleMappings.map((m) => m.role_id);
    const roles = await Role.find({ id: { $in: roleIds } });
    const roleSlugs = roles.map((r) => r.slug);

    const isAdmin = roleSlugs.includes("admin");
    const isSeller = roleSlugs.includes("b2c-seller") || roleSlugs.includes("b2b-seller");

    if (!isAdmin && !isSeller) {
      return res.status(403).json({
        message: "Forbidden: Seller or Admin access required",
      });
    }

    req.user = {
      id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      roles: roleSlugs,
    };

    if (isAdmin) {
      req.admin = req.user;
    }
    if (isSeller) {
      req.seller = req.user;
    }

    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};

// Product type schema routes (must be placed before /:id)
router.get("/schema", passiveAdminAuth, getProductTypeSchema);
router.get("/schema/:productType", passiveAdminAuth, getProductTypeSchema);

router.get("/batches/list", passiveAdminAuth, getProductBatches);
router.get("/admin/all", adminAuth, getAdminProducts);
router.get("/template/download", downloadProductTemplate);
router.get("/", passiveAdminAuth, getProducts);
router.get("/:id", passiveAdminAuth, getProductById);

// Seller & Admin product routes
router.post("/composite", sellerOrAdminAuth, upload.any(), createCompositeProduct);
router.post("/bulk-upload", sellerOrAdminAuth, upload.single("file"), bulkUploadProducts);
router.post("/", sellerOrAdminAuth, createProduct);
router.post("/:productId/variants", sellerOrAdminAuth, createVariant);
router.get("/:productId/variants", passiveAdminAuth, getVariants);
router.put("/:id", sellerOrAdminAuth, updateProduct);
router.delete("/:id", sellerOrAdminAuth, deleteProduct);

// Admin specific routes
router.put("/admin/:id/verify", adminAuth, verifyProduct);
router.put("/admin/:id/reject", adminAuth, rejectProduct);

module.exports = router;
