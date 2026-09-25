const Campaign = require("../models/Campaign");
const CampaignLog = require("../models/CampaignLog");
const EmailTemplate = require("../models/EmailTemplate");
const {
  MERGE_TAGS,
  TRIGGER_EVENTS,
  getSampleContext,
} = require("../config/campaignConfig");
const {
  extractMergeTags,
  renderTemplate,
  broadcastCampaign,
  sendSingleCampaignEmail,
} = require("../services/campaignService");

// @desc    Get all available merge tags and trigger events metadata
// @route   GET /admin/campaigns/meta or /api/campaigns/meta
// @access  Private / Admin
const getCampaignMetadata = async (req, res) => {
  try {
    res.json({
      success: true,
      mergeTags: MERGE_TAGS,
      triggerEvents: TRIGGER_EVENTS,
      sendTypes: [
        {
          id: "send_now",
          label: "Send Now",
          description: "Immediately broadcast this campaign to the selected target audience upon saving.",
        },
        {
          id: "scheduled",
          label: "Schedule",
          description: "Schedule this campaign to be sent automatically at a future date and time.",
        },
        {
          id: "triggered",
          label: "When Triggered",
          description: "Automatically send this campaign whenever a specified system event occurs.",
        },
      ],
      targetAudiences: [
        { id: "all_users", label: "All Registered Users" },
        { id: "customers", label: "Customers Only (B2C Customers)" },
        { id: "sellers", label: "Sellers Only (B2C & B2B Sellers)" },
        { id: "admins", label: "Store Administrators" },
        { id: "custom", label: "Custom Email List" },
      ],
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to retrieve campaign metadata", error: error.message });
  }
};

// @desc    Get all campaigns with filtering and pagination
// @route   GET /admin/campaigns or /api/campaigns
// @access  Private / Admin
const getCampaigns = async (req, res) => {
  try {
    const { page = 1, limit = 20, sendType, triggerEvent, status, search } = req.query;
    const query = {};

    if (sendType) query.sendType = sendType;
    if (triggerEvent) query.triggerEvent = triggerEvent.toUpperCase();
    if (status) query.status = status;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { subject: { $regex: search, $options: "i" } },
      ];
    }

    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 20;
    const skip = (pageNum - 1) * limitNum;

    const [campaigns, total] = await Promise.all([
      Campaign.find(query)
        .populate("createdBy", "firstName lastName email")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Campaign.countDocuments(query),
    ]);

    res.json({
      success: true,
      campaigns,
      pagination: {
        currentPage: pageNum,
        totalPages: Math.ceil(total / limitNum) || 1,
        totalCampaigns: total,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch campaigns", error: error.message });
  }
};

// @desc    Get single campaign by ID
// @route   GET /admin/campaigns/:id or /api/campaigns/:id
// @access  Private / Admin
const getCampaignById = async (req, res) => {
  try {
    const campaign = await Campaign.findById(req.params.id).populate("createdBy", "firstName lastName email");
    if (!campaign) {
      return res.status(404).json({ success: false, message: "Campaign not found" });
    }
    res.json({ success: true, campaign });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch campaign", error: error.message });
  }
};

// @desc    Create new campaign (Send Now, Scheduled, or Triggered)
// @route   POST /admin/campaigns or /api/campaigns
// @access  Private / Admin
const createCampaign = async (req, res) => {
  try {
    const {
      name,
      templateId,
      subject,
      body,
      sendType = "send_now",
      scheduledAt,
      triggerEvent,
      targetAudience = "all_users",
      customRecipients,
      isActive = true,
    } = req.body;

    let finalSubject = subject;
    let finalBody = body;

    // If templateId is provided, fetch content from the template
    if (templateId) {
      const template = await EmailTemplate.findById(templateId);
      if (!template) {
        return res.status(404).json({ success: false, message: "Selected EmailTemplate not found" });
      }
      finalSubject = finalSubject || template.subject;
      finalBody = finalBody || template.body;
    }

    if (!name || !finalSubject || !finalBody) {
      return res.status(400).json({
        success: false,
        message: "name, subject, and body (or valid templateId) are required",
      });
    }

    if (sendType === "scheduled") {
      if (!scheduledAt) {
        return res.status(400).json({ success: false, message: "scheduledAt date is required for scheduled campaigns" });
      }
      const scheduleDate = new Date(scheduledAt);
      if (isNaN(scheduleDate.getTime()) || scheduleDate <= new Date()) {
        return res.status(400).json({ success: false, message: "scheduledAt must be a valid date in the future" });
      }
    }

    if (sendType === "triggered") {
      if (!triggerEvent) {
        return res.status(400).json({ success: false, message: "triggerEvent is required when sendType is 'triggered'" });
      }
      const eventExists = TRIGGER_EVENTS.some((e) => e.id === triggerEvent.toUpperCase());
      if (!eventExists) {
        return res.status(400).json({
          success: false,
          message: `Invalid triggerEvent: '${triggerEvent}'. Check /meta for list of valid events.`,
        });
      }
    }

    // Auto-detect merge tags used in subject and body
    const detectedMergeTags = extractMergeTags(finalSubject, finalBody);

    let initialStatus = "draft";
    if (sendType === "send_now") initialStatus = "active";
    else if (sendType === "scheduled") initialStatus = "scheduled";
    else if (sendType === "triggered") initialStatus = "active";

    const campaign = new Campaign({
      name,
      templateId: templateId || null,
      subject: finalSubject,
      body: finalBody,
      sendType,
      scheduledAt: sendType === "scheduled" ? new Date(scheduledAt) : null,
      triggerEvent: sendType === "triggered" ? triggerEvent.toUpperCase() : null,
      status: initialStatus,
      targetAudience,
      customRecipients: Array.isArray(customRecipients) ? customRecipients : [],
      mergeTags: detectedMergeTags,
      isActive,
      createdBy: req.admin?.id || req.user?.id || null,
    });

    await campaign.save();

    // If Send Now, trigger broadcast immediately
    if (sendType === "send_now") {
      broadcastCampaign(campaign._id).catch((err) => {
        console.error("[createCampaign] Background broadcast error:", err);
      });
    }

    res.status(201).json({
      success: true,
      message: sendType === "send_now" ? "Campaign created and broadcast started" : "Campaign created successfully",
      campaign,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to create campaign", error: error.message });
  }
};

// @desc    Update existing campaign
// @route   PUT /admin/campaigns/:id or /api/campaigns/:id
// @access  Private / Admin
const updateCampaign = async (req, res) => {
  try {
    const campaign = await Campaign.findById(req.params.id);
    if (!campaign) {
      return res.status(404).json({ success: false, message: "Campaign not found" });
    }

    const {
      name,
      templateId,
      subject,
      body,
      sendType,
      scheduledAt,
      triggerEvent,
      targetAudience,
      customRecipients,
      isActive,
    } = req.body;

    let finalSubject = subject;
    let finalBody = body;

    if (templateId) {
      const template = await EmailTemplate.findById(templateId);
      if (!template) {
        return res.status(404).json({ success: false, message: "Selected EmailTemplate not found" });
      }
      finalSubject = finalSubject || template.subject;
      finalBody = finalBody || template.body;
      campaign.templateId = templateId;
    }

    if (name !== undefined) campaign.name = name;
    if (finalSubject !== undefined) campaign.subject = finalSubject;
    if (finalBody !== undefined) campaign.body = finalBody;
    if (targetAudience !== undefined) campaign.targetAudience = targetAudience;
    if (customRecipients !== undefined) campaign.customRecipients = customRecipients;
    if (isActive !== undefined) campaign.isActive = isActive;

    if (sendType !== undefined) {
      campaign.sendType = sendType;
      if (sendType === "scheduled") {
        if (!scheduledAt && !campaign.scheduledAt) {
          return res.status(400).json({ success: false, message: "scheduledAt date is required for scheduled campaigns" });
        }
        campaign.status = "scheduled";
      } else if (sendType === "triggered") {
        campaign.status = "active";
      }
    }

    if (scheduledAt !== undefined) {
      campaign.scheduledAt = new Date(scheduledAt);
      if (campaign.sendType === "scheduled") campaign.status = "scheduled";
    }

    if (triggerEvent !== undefined) {
      campaign.triggerEvent = triggerEvent ? triggerEvent.toUpperCase() : null;
    }

    // Refresh detected merge tags
    campaign.mergeTags = extractMergeTags(campaign.subject, campaign.body);

    await campaign.save();

    res.json({
      success: true,
      message: "Campaign updated successfully",
      campaign,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to update campaign", error: error.message });
  }
};

// @desc    Delete campaign
// @route   DELETE /admin/campaigns/:id or /api/campaigns/:id
// @access  Private / Admin
const deleteCampaign = async (req, res) => {
  try {
    const campaign = await Campaign.findByIdAndDelete(req.params.id);
    if (!campaign) {
      return res.status(404).json({ success: false, message: "Campaign not found" });
    }
    // Clean up logs associated
    await CampaignLog.deleteMany({ campaignId: req.params.id });

    res.json({ success: true, message: "Campaign and its logs deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to delete campaign", error: error.message });
  }
};

// @desc    Toggle campaign active/paused status
// @route   PATCH /admin/campaigns/:id/toggle or /api/campaigns/:id/toggle
// @access  Private / Admin
const toggleCampaignStatus = async (req, res) => {
  try {
    const campaign = await Campaign.findById(req.params.id);
    if (!campaign) {
      return res.status(404).json({ success: false, message: "Campaign not found" });
    }

    campaign.isActive = !campaign.isActive;
    await campaign.save();

    res.json({
      success: true,
      message: `Campaign is now ${campaign.isActive ? "active" : "paused"}`,
      isActive: campaign.isActive,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to toggle status", error: error.message });
  }
};

// @desc    Preview campaign with real-time merge tag substitution using sample context
// @route   POST /admin/campaigns/preview or /api/campaigns/preview
// @access  Private / Admin
const previewCampaign = async (req, res) => {
  try {
    const { subject, body, customContext } = req.body;

    const sampleContext = {
      ...getSampleContext(),
      ...(customContext || {}),
    };

    const renderedSubject = renderTemplate(subject || "", sampleContext);
    const renderedBody = renderTemplate(body || "", sampleContext);
    const detectedTags = extractMergeTags(subject, body);

    res.json({
      success: true,
      preview: {
        originalSubject: subject,
        renderedSubject,
        originalBody: body,
        renderedBody,
        detectedTags,
        usedContext: sampleContext,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to generate preview", error: error.message });
  }
};

// @desc    Send a test email to admin's inbox
// @route   POST /admin/campaigns/test-send or /api/campaigns/test-send
// @access  Private / Admin
const testSendCampaign = async (req, res) => {
  try {
    const { email, subject, body, campaignId } = req.body;
    const recipientEmail = email || req.admin?.email || req.user?.email;

    if (!recipientEmail) {
      return res.status(400).json({ success: false, message: "Recipient email is required for test send" });
    }

    let finalSubject = subject;
    let finalBody = body;

    if (campaignId) {
      const camp = await Campaign.findById(campaignId);
      if (camp) {
        finalSubject = camp.subject;
        finalBody = camp.body;
      }
    }

    if (!finalSubject || !finalBody) {
      return res.status(400).json({ success: false, message: "Subject and body are required" });
    }

    const dummyRecipient = {
      email: recipientEmail,
      firstName: "Test",
      lastName: "User",
    };

    const dummyCampaign = {
      _id: campaignId || null,
      name: "[TEST] Campaign Preview",
      sendType: "send_now",
      subject: `[TEST] ${finalSubject}`,
      body: finalBody,
    };

    const isSent = await sendSingleCampaignEmail(dummyCampaign, dummyRecipient, getSampleContext());

    if (!isSent) {
      return res.status(500).json({ success: false, message: "Test email sending failed. Check SMTP credentials." });
    }

    res.json({
      success: true,
      message: `Test email sent successfully to ${recipientEmail}`,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Test send failed", error: error.message });
  }
};

// @desc    Get execution audit logs for a campaign
// @route   GET /admin/campaigns/:id/logs or /api/campaigns/:id/logs
// @access  Private / Admin
const getCampaignLogs = async (req, res) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 50, status } = req.query;

    const query = { campaignId: id };
    if (status) query.status = status;

    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 50;
    const skip = (pageNum - 1) * limitNum;

    const [logs, total] = await Promise.all([
      CampaignLog.find(query).sort({ createdAt: -1 }).skip(skip).limit(limitNum).lean(),
      CampaignLog.countDocuments(query),
    ]);

    res.json({
      success: true,
      logs,
      pagination: {
        currentPage: pageNum,
        totalPages: Math.ceil(total / limitNum) || 1,
        totalLogs: total,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch logs", error: error.message });
  }
};

module.exports = {
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
};
