const mongoose = require("mongoose");

const sellerProfileSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },

    // SELLER_PROFILE Step Data
    companyName: { type: String },
    businessType: {
      type: String,
      enum: ["SOLE_PROPRIETORSHIP", "LLP", "PRIVATE_LIMITED", "PUBLIC_LIMITED", "OTHER"],
    },
    sellerType: {
      type: String,
      enum: ["MANUFACTURER", "WHOLESALER", "RETAILER", "DISTRIBUTOR"],
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

    // PAN_VERIFICATION Step Data
    panDetails: {
      panNumber: { type: String, select: false },
      nameOnPan: String,
      verificationStatus: {
        type: String,
        enum: ["PENDING", "VERIFIED", "FAILED", "UNDER_REVIEW", "REJECTED"],
        default: "PENDING",
      },
      verifiedAt: Date,
      referenceId: String,
    },

    // GSTIN_VERIFICATION Step Data
    gstinDetails: {
      gstinNumber: { type: String, select: false },
      legalName: String,
      tradeName: String,
      registrationStatus: String,
      state: String,
      registrationDate: Date,
      verificationStatus: {
        type: String,
        enum: ["PENDING", "VERIFIED", "FAILED", "UNDER_REVIEW", "REJECTED"],
        default: "PENDING",
      },
      verifiedAt: Date,
      referenceId: String,
    },

    // BANK_VERIFICATION Step Data
    bankDetails: {
      accountNumber: { type: String, select: false },
      ifscCode: { type: String, select: false },
      accountHolderName: String,
      verificationStatus: {
        type: String,
        enum: ["PENDING", "VERIFIED", "FAILED", "MANUAL_REVIEW"],
        default: "PENDING",
      },
      verifiedAt: Date,
      referenceId: String,
    },

    // Lifecycle & State
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

    // Approval Info
    approvalDetails: {
      reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "Admin" },
      reviewNotes: String,
      approvedAt: Date,
    },

    // Tier starts unset until compliance assigns it later
    sellerTier: {
      type: String,
      enum: ["BRONZE", "SILVER", "GOLD", "PLATINUM", null],
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("SellerProfile", sellerProfileSchema);
