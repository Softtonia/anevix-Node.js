const express = require("express");
const {
  getPlaceholders,
  getTemplates,
  createTemplate,
  getTemplateById,
  getTemplateByKey,
  updateTemplateById,
  deleteTemplateById,
  previewTemplate,
} = require("../controllers/emailTemplateController");
const adminAuth = require("../middleware/adminAuth"); // Assuming you want to protect these with adminAuth

const router = express.Router();

// Apply admin authentication to all email template routes
router.use(adminAuth);

// Define routes matching the specific structure
router.get("/placeholders", getPlaceholders);
router.get("/", getTemplates);
router.post("/", createTemplate);
router.post("/preview", previewTemplate);
router.get("/by-key/:key", getTemplateByKey);
router.get("/:id", getTemplateById);
router.put("/:id", updateTemplateById);
router.delete("/:id", deleteTemplateById);

module.exports = router;
