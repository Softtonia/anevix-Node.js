const mongoose = require("mongoose");

const campaignSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Campaign name is required"],
      trim: true,
    },
    subject: {
      type: String,
      required: [true, "Email subject is required"],
      trim: true,
    },
    body: {
      type: String,
      required: [true, "Email template body is required"],
    },
    templateId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "EmailTemplate",
      default: null,
    },
    sendType: {
      type: String,
      enum: {
        values: ["send_now", "scheduled", "triggered"],
        message: "{VALUE} is not a valid sendType. Must be send_now, scheduled, or triggered",
      },
      required: [true, "sendType is required"],
      default: "send_now",
    },
    // Required when sendType === "scheduled"
    scheduledAt: {
      type: Date,
      default: null,
    },
    // Required when sendType === "triggered"
    triggerEvent: {
      type: String,
      default: null,
      trim: true,
      uppercase: true,
    },
    status: {
      type: String,
      enum: ["draft", "scheduled", "active", "completed", "cancelled", "failed"],
      default: "draft",
    },
    targetAudience: {
      type: String,
      enum: ["all_users", "customers", "sellers", "admins", "custom"],
      default: "all_users",
    },
    customRecipients: [
      {
        type: String,
        trim: true,
        lowercase: true,
      },
    ],
    mergeTags: [
      {
        type: String,
        trim: true,
      },
    ],
    stats: {
      totalSent: {
        type: Number,
        default: 0,
      },
      totalFailed: {
        type: Number,
        default: 0,
      },
      lastTriggeredAt: {
        type: Date,
        default: null,
      },
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for query performance
campaignSchema.index({ sendType: 1, status: 1 });
campaignSchema.index({ triggerEvent: 1, isActive: 1 });
campaignSchema.index({ scheduledAt: 1, status: 1 });

const Campaign = mongoose.model("Campaign", campaignSchema);

module.exports = Campaign;
