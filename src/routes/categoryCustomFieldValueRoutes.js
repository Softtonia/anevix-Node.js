const express = require("express");
const adminAuth = require("../middleware/adminAuth");
const {
  upsertCategoryCustomFieldValue,
  getCategoryCustomFieldValueByFieldId,
  deleteCategoryCustomFieldValue,
} = require("../controllers/categoryCustomFieldValueController");

const router = express.Router();

// Public/passive route to view values
router.get("/:fieldId", getCategoryCustomFieldValueByFieldId);

// Admin routes to mutate values
router.post("/", adminAuth, upsertCategoryCustomFieldValue);
router.delete("/:fieldId", adminAuth, deleteCategoryCustomFieldValue);

module.exports = router;
