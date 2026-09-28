const mongoose = require("mongoose");

const gstinVerificationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    gstinApplicability: {
      type: String,
      enum: ["REQUIRED", "OPTIONAL", "NOT_APPLICABLE"],
      default: "REQUIRED",
    },
    gstinNumber: {
      type: String,
      select: false,
    },
    legalName: {
      type: String,
    },
    tradeName: {
      type: String,
    },
    registrationStatus: {
      type: String,
    },
    state: {
      type: String,
    },
    registrationDate: {
      type: Date,
    },
    verificationStatus: {
      type: String,
      enum: ["PENDING", "VERIFIED", "FAILED", "UNDER_REVIEW", "REJECTED"],
      default: "PENDING",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("GstinVerification", gstinVerificationSchema);
