const mongoose = require("mongoose");

const sellerRegistrationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    companyName: {
      type: String,
      required: true,
    },
    businessType: {
      type: String,
      enum: ["SOLE_PROPRIETORSHIP", "LLP", "PRIVATE_LIMITED", "PUBLIC_LIMITED", "OTHER"],
      required: true,
    },
    sellerType: {
      type: String,
      enum: ["MANUFACTURER", "WHOLESALER", "RETAILER", "DISTRIBUTOR"],
      required: true,
    },
    dateOfBirth: {
      type: Date, // optional
    },
    businessAddress: {
      street: String,
      city: String,
      state: String,
      zipCode: String,
      country: String,
    },
    residentialAddress: {
      street: String,
      city: String,
      state: String,
      zipCode: String,
      country: String,
    },
    onboardingStatus: {
      type: String,
      enum: ["PENDING", "IN_PROGRESS", "UNDER_REVIEW", "APPROVED", "REJECTED", "SUSPENDED"],
      default: "PENDING",
    },
    currentStep: {
      type: String,
      enum: [
        "SELLER_PROFILE",
        "PAN_VERIFICATION",
        "GSTIN_VERIFICATION",
        "BANK_VERIFICATION",
        "PICKUP_ADDRESS",
        "CATEGORY_SELECTION",
        "BRAND_AUTHORIZATION",
        "SELLER_AGREEMENT",
        "COMPLETED",
      ],
      default: "SELLER_PROFILE",
    },
    approvalDetails: {
      reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "Admin" },
      reviewNotes: String,
      approvedAt: Date,
    },
    sellerTier: {
      type: String,
      enum: ["BRONZE", "SILVER", "GOLD", "PLATINUM", null],
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("SellerRegistration", sellerRegistrationSchema);
