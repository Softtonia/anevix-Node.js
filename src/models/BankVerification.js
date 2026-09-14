const mongoose = require("mongoose");

const bankVerificationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    accountHolderName: {
      type: String,
      required: true,
    },
    bankName: {
      type: String,
      required: true,
    },
    accountNumber: {
      type: String,
      required: true,
      select: false,
    },
    ifscCode: {
      type: String,
      required: true,
      select: false,
    },
    cancelledChequeDocumentUrl: {
      type: String,
    },
    verificationStatus: {
      type: String,
      enum: ["PENDING", "VERIFIED", "FAILED", "MANUAL_REVIEW"],
      default: "PENDING",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("BankVerification", bankVerificationSchema);
