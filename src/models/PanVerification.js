const mongoose = require("mongoose");

const panVerificationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    panNumber: {
      type: String,
      required: true,
      select: false, // keep hidden by default for security
    },
    nameOnPan: {
      type: String,
      required: true,
    },
    verificationStatus: {
      type: String,
      enum: ["PENDING", "VERIFIED", "FAILED", "UNDER_REVIEW", "REJECTED"],
      default: "PENDING",
    },
    verificationTimestamp: {
      type: Date,
    },
    providerReferenceId: {
      type: String,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("PanVerification", panVerificationSchema);
