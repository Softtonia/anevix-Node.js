const express = require("express");
const adminAuth = require("../middleware/adminAuth");
const {
  getCampaignMetadata,
  getCampaigns,
  getCampaignById,
  createCampaign,
  updateCampaign,
  deleteCampaign,
  toggleCampaignStatus,
  previewCampaign,
  testSendCampaign,
  getCampaignLogs,
} = require("../controllers/campaignController");

const router = express.Router();

// All campaign routes require Admin authentication
router.use(adminAuth);

// Metadata & Previews
router.get("/meta", getCampaignMetadata);
router.post("/preview", previewCampaign);
router.post("/test-send", testSendCampaign);

// Campaign CRUD
router.get("/", getCampaigns);
router.post("/", createCampaign);
router.get("/:id", getCampaignById);
router.put("/:id", updateCampaign);
router.delete("/:id", deleteCampaign);
router.patch("/:id/toggle", toggleCampaignStatus);
router.get("/:id/logs", getCampaignLogs);

module.exports = router;
