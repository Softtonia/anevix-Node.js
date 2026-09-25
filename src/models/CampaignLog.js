const mongoose = require("mongoose");

const campaignLogSchema = new mongoose.Schema(
  {
    campaignId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Campaign",
      required: true,
      index: true,
    },
    campaignName: {
      type: String,
      default: "",
    },
    sendType: {
      type: String,
      enum: ["send_now", "scheduled", "triggered"],
      required: true,
    },
    triggerEvent: {
      type: String,
      default: null,
      index: true,
    },
    recipientEmail: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    recipientName: {
      type: String,
      default: "",
    },
    subject: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ["sent", "failed", "pending"],
      default: "sent",
      index: true,
    },
    errorMessage: {
      type: String,
      default: null,
    },
    contextSnapshot: {
      type: mongoose.Schema.Types.Mixed,
      default: () => ({}),
    },
  },
  {
    timestamps: true,
  }
);

campaignLogSchema.index({ campaignId: 1, createdAt: -1 });

const CampaignLog = mongoose.model("CampaignLog", campaignLogSchema);

module.exports = CampaignLog;
