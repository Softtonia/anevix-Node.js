const express = require("express");
const router = express.Router();
const {
  createProductInventory,
  createVariantInventory,
  getProductInventory,
  getInventoryById,
  updateInventory,
  adjustInventory,
  deleteInventory
} = require("../controllers/inventoryController");

const adminAuth = require("../middleware/adminAuth");

// For GET endpoints that could be passiveAdminAuth based on existing conventions,
// I am using the standard Express route pattern here. I'll use standard adminAuth
// for mutations and the passive approach (or public approach) if they exist.
// Based on instructions: Mutating endpoints must use existing adminAuth. 
// "GET endpoints should follow existing public/admin pattern"

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
        if (roles.some((role) => role.slug === "admin")) {
          req.admin = { id: user._id, firstName: user.firstName, lastName: user.lastName, email: user.email };
        }
      }
    } catch (err) {}
  }
  next();
};

// Nested Product/Variant routes (typically mounted via /api/products in server.js but here mounted directly or via /api)
// Wait, the instructions specify exact routes: 
// POST /api/products/:productId/inventory
// POST /api/products/:productId/variants/:variantId/inventory
// GET /api/products/:productId/inventory
// So these 3 should ideally be on a router mounted at /api/products. 
// But the instructions say "Create src/routes/inventoryRoutes.js" and lists all these routes.
// We can mount inventoryRoutes at `/api` in server.js so it can define BOTH `/products/...` AND `/inventory/...`.

router.post("/products/:productId/inventory", adminAuth, createProductInventory);
router.get("/products/:productId/inventory", passiveAdminAuth, getProductInventory);
router.post("/products/:productId/variants/:variantId/inventory", adminAuth, createVariantInventory);

router.get("/inventory/:inventoryId", passiveAdminAuth, getInventoryById);
router.put("/inventory/:inventoryId", adminAuth, updateInventory);
router.patch("/inventory/:inventoryId/adjust", adminAuth, adjustInventory);
router.delete("/inventory/:inventoryId", adminAuth, deleteInventory);

module.exports = router;
