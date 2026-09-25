const Campaign = require("../models/Campaign");
const CampaignLog = require("../models/CampaignLog");
const User = require("../models/User");
const RoleHasUser = require("../models/RoleHasUser");
const Role = require("../models/Role");
const sendEmail = require("../utils/sendEmail");
const { MERGE_TAGS, getSampleContext } = require("../config/campaignConfig");

/**
 * Extract all unique {{merge_tags}} from subject and body strings
 */
const extractMergeTags = (subject = "", body = "") => {
  const content = `${subject} ${body}`;
  const regex = /\{\{\s*([^{}]+?)\s*\}\}/g;
  const tags = new Set();

  let match;
  while ((match = regex.exec(content)) !== null) {
    tags.add(`{{${match[1].trim()}}}`);
  }

  return Array.from(tags);
};

/**
 * Replace {{merge_tags}} in a template string with actual context data
 */
const renderTemplate = (templateString = "", contextData = {}) => {
  if (!templateString) return "";

  // Normalize context keys to lowercase without curly braces
  const normalizedContext = {};
  for (const [key, val] of Object.entries(contextData)) {
    const cleanKey = key.replace(/^\{\{\s*|\s*\}\}$/g, "").trim().toLowerCase();
    normalizedContext[cleanKey] = val !== undefined && val !== null ? String(val) : "";
  }

  // Inject standard fallbacks if not provided
  if (!normalizedContext.current_year) normalizedContext.current_year = new Date().getFullYear().toString();
  if (!normalizedContext.company_name) normalizedContext.company_name = process.env.COMPANY_NAME || "Anevix Ecommerce";
  if (!normalizedContext.support_email) normalizedContext.support_email = process.env.SUPPORT_EMAIL || "support@anevix.com";
  if (!normalizedContext.site_url) normalizedContext.site_url = process.env.FRONTEND_URL || "https://anevix.com";

  return templateString.replace(/\{\{\s*([^{}]+?)\s*\}\}/g, (fullMatch, tagKey) => {
    const cleanKey = tagKey.trim().toLowerCase();
    if (Object.prototype.hasOwnProperty.call(normalizedContext, cleanKey)) {
      return normalizedContext[cleanKey];
    }
    // Fallback: check if we have a default sample value
    const matchTag = MERGE_TAGS.find(
      (m) => m.tag.replace(/^\{\{\s*|\s*\}\}$/g, "").toLowerCase() === cleanKey
    );
    return matchTag ? matchTag.sampleValue : fullMatch;
  });
};

/**
 * Resolve recipient users based on audience selection
 */
const resolveAudienceRecipients = async (targetAudience, customRecipients = []) => {
  if (targetAudience === "custom") {
    return (customRecipients || []).map((email) => ({
      email: email.trim().toLowerCase(),
      firstName: email.split("@")[0],
      lastName: "",
    }));
  }

  let roleFilter = null;
  if (targetAudience === "customers") {
    roleFilter = "b2c-customer";
  } else if (targetAudience === "sellers") {
    roleFilter = ["b2c-seller", "b2b-seller"];
  } else if (targetAudience === "admins") {
    roleFilter = "admin";
  }

  let userIds = null;
  if (roleFilter) {
    const roles = await Role.find({ slug: Array.isArray(roleFilter) ? { $in: roleFilter } : roleFilter });
    const roleIds = roles.map((r) => r.id);
    const mappings = await RoleHasUser.find({ role_id: { $in: roleIds } });
    userIds = mappings.map((m) => m.user_id);
  }

  const query = {
    email: { $exists: true, $ne: null },
    status: { $ne: "inactive" },
  };

  if (userIds) {
    query._id = { $in: userIds };
  }

  const users = await User.find(query).select("firstName lastName email phoneNumber");
  return users.map((u) => ({
    userId: u._id,
    email: u.email,
    firstName: u.firstName || "",
    lastName: u.lastName || "",
    phoneNumber: u.phoneNumber || "",
    username: u.email ? u.email.split("@")[0] : "",
  }));
};

/**
 * Dispatch an individual campaign email to a recipient and log the result
 */
const sendSingleCampaignEmail = async (campaign, recipient, context = {}) => {
  const mergedContext = {
    ...getSampleContext(),
    ...context,
    user_email: recipient.email,
    first_name: recipient.firstName || context.first_name || "",
    last_name: recipient.lastName || context.last_name || "",
    username: recipient.username || context.username || recipient.firstName || "Customer",
    user_phone: recipient.phoneNumber || context.user_phone || "",
  };

  const renderedSubject = renderTemplate(campaign.subject, mergedContext);
  const renderedBody = renderTemplate(campaign.body, mergedContext);

  let status = "sent";
  let errorMessage = null;

  try {
    await sendEmail(recipient.email, renderedSubject, "Please view this email in an HTML compatible reader", renderedBody);
  } catch (err) {
    status = "failed";
    errorMessage = err.message || "Failed to deliver email";
    console.error(`[campaignService] Error sending to ${recipient.email}:`, err.message);
  }

  // Create log entry
  try {
    await CampaignLog.create({
      campaignId: campaign._id,
      campaignName: campaign.name,
      sendType: campaign.sendType,
      triggerEvent: campaign.triggerEvent || null,
      recipientEmail: recipient.email,
      recipientName: `${recipient.firstName} ${recipient.lastName}`.trim(),
      subject: renderedSubject,
      status,
      errorMessage,
      contextSnapshot: mergedContext,
    });
  } catch (logErr) {
    console.error("[campaignService] Error writing CampaignLog:", logErr.message);
  }

  return status === "sent";
};

/**
 * Broadcast an immediate or scheduled campaign to its resolved audience
 */
const broadcastCampaign = async (campaignId) => {
  const campaign = await Campaign.findById(campaignId);
  if (!campaign || !campaign.isActive) return false;

  const recipients = await resolveAudienceRecipients(campaign.targetAudience, campaign.customRecipients);

  let successCount = 0;
  let failCount = 0;

  for (const recipient of recipients) {
    const success = await sendSingleCampaignEmail(campaign, recipient);
    if (success) successCount++;
    else failCount++;
  }

  campaign.status = "completed";
  campaign.stats.totalSent = (campaign.stats.totalSent || 0) + successCount;
  campaign.stats.totalFailed = (campaign.stats.totalFailed || 0) + failCount;
  campaign.stats.lastTriggeredAt = new Date();
  await campaign.save();

  return { successCount, failCount, totalRecipients: recipients.length };
};

/**
 * Trigger active campaigns subscribed to a system event
 * Called from auth, user, order, and seller lifecycle handlers
 * 
 * @param {string} eventName - e.g. "USER_REGISTRATION", "ORDER_PURCHASED"
 * @param {object} payload - { user: { email, firstName, ... }, order: { ... }, extraContext: { ... } }
 */
const triggerCampaignEvent = async (eventName, payload = {}) => {
  try {
    if (!eventName) return;
    const normalizedEvent = eventName.toUpperCase().trim();

    // Find all active campaigns configured for this trigger event
    const campaigns = await Campaign.find({
      sendType: "triggered",
      triggerEvent: normalizedEvent,
      isActive: true,
      status: { $in: ["active", "draft"] }, // active triggered campaigns
    });

    if (!campaigns || campaigns.length === 0) return;

    // Build recipient from payload
    const recipientUser = payload.user || payload.recipient || {};
    const recipientEmail = recipientUser.email || payload.email || payload.user_email;

    if (!recipientEmail) {
      console.warn(`[campaignService] Trigger ${normalizedEvent} called without recipient email.`);
      return;
    }

    const recipient = {
      email: recipientEmail,
      firstName: recipientUser.firstName || payload.first_name || "",
      lastName: recipientUser.lastName || payload.last_name || "",
      username: recipientUser.username || payload.username || recipientUser.firstName || "",
      phoneNumber: recipientUser.phoneNumber || payload.user_phone || "",
    };

    // Flatten payload into context dictionary
    const context = {
      ...payload,
      ...recipientUser,
      ...(payload.order || {}),
      ...(payload.seller || {}),
      ...(payload.ticket || {}),
      ...(payload.extraContext || {}),
    };

    for (const campaign of campaigns) {
      const isSent = await sendSingleCampaignEmail(campaign, recipient, context);
      if (isSent) {
        campaign.stats.totalSent = (campaign.stats.totalSent || 0) + 1;
      } else {
        campaign.stats.totalFailed = (campaign.stats.totalFailed || 0) + 1;
      }
      campaign.stats.lastTriggeredAt = new Date();
      campaign.status = "active";
      await campaign.save();
    }
  } catch (error) {
    console.error(`[campaignService] Error processing trigger ${eventName}:`, error);
  }
};

/**
 * Process scheduled campaigns whose target dispatch time has arrived
 */
const processScheduledCampaigns = async () => {
  try {
    const now = new Date();
    const pendingCampaigns = await Campaign.find({
      sendType: "scheduled",
      status: "scheduled",
      isActive: true,
      scheduledAt: { $lte: now },
    });

    for (const campaign of pendingCampaigns) {
      console.log(`[campaignScheduler] Dispatching scheduled campaign "${campaign.name}" (${campaign._id})`);
      await broadcastCampaign(campaign._id);
    }
  } catch (error) {
    console.error("[campaignScheduler] Error checking scheduled campaigns:", error);
  }
};

/**
 * Initialize background scheduler polling for scheduled campaigns
 */
let schedulerInterval = null;
const initCampaignScheduler = (intervalMs = 60000) => {
  if (schedulerInterval) return;
  console.log(`[campaignScheduler] Scheduler started. Checking every ${intervalMs / 1000}s`);
  // Run initial check
  processScheduledCampaigns();
  schedulerInterval = setInterval(processScheduledCampaigns, intervalMs);
};

module.exports = {
  extractMergeTags,
  renderTemplate,
  resolveAudienceRecipients,
  sendSingleCampaignEmail,
  broadcastCampaign,
  triggerCampaignEvent,
  processScheduledCampaigns,
  initCampaignScheduler,
};
