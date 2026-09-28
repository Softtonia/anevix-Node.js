const mongoose = require("mongoose");

const categoryApprovalSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    category: {
      type: String,
      required: true,
    },
    approvalStatus: {
      type: String,
      enum: ["PENDING", "APPROVED", "REJECTED", "SUSPENDED"],
      default: "PENDING",
    },
    adminNotes: {
      type: String,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("CategoryApproval", categoryApprovalSchema);
