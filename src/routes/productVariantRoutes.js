const express = require("express");
const adminAuth = require("../middleware/adminAuth");
const {
  updateVariant,
  deleteVariant,
} = require("../controllers/productVariantController");

const router = express.Router();

// Admin routes for updating/archiving specific variants
router.put("/:variantId", adminAuth, updateVariant);
router.delete("/:variantId", adminAuth, deleteVariant);

module.exports = router;
