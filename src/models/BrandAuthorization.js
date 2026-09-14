const mongoose = require("mongoose");

const brandAuthorizationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    brandName: {
      type: String,
      required: true,
    },
    authorizationType: {
      type: String,
      enum: ["BRAND_OWNER", "AUTHORIZED_RESELLER"],
      required: true,
    },
    documents: {
      type: [String], // Array of document URLs
    },
    approvalStatus: {
      type: String,
      enum: ["PENDING", "APPROVED", "REJECTED", "EXPIRED", "SUSPENDED"],
      default: "PENDING",
    },
    adminNotes: {
      type: String,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("BrandAuthorization", brandAuthorizationSchema);
