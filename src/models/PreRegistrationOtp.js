const mongoose = require("mongoose");

const preRegistrationOtpSchema = new mongoose.Schema(
  {
    contactValue: {
      type: String,
      required: true,
      unique: true, // Only one active OTP session per email/mobile
      lowercase: true,
      trim: true,
    },
    contactType: {
      type: String,
      enum: ["email", "mobile"],
      required: true,
    },
    otpHash: {
      type: String,
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

// TTL index to automatically delete unverified or stale OTPs after a while (e.g., 30 mins)
// 1800 seconds = 30 minutes
preRegistrationOtpSchema.index({ createdAt: 1 }, { expireAfterSeconds: 1800 });

module.exports = mongoose.model("PreRegistrationOtp", preRegistrationOtpSchema);
