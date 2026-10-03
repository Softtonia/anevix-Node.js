const mongoose = require("mongoose");

const sellerRegistrationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    sellerId: {
      type: String,
      unique: true,
      sparse: true,
    },
    companyName: {
      type: String,
      default: "",
    },
    businessType: {
      type: String,
      enum: ["SOLE_PROPRIETORSHIP", "LLP", "PRIVATE_LIMITED", "PUBLIC_LIMITED", "OTHER", ""],
      default: "",
    },
    sellerType: {
      type: String,
      enum: ["MANUFACTURER", "WHOLESALER", "RETAILER", "DISTRIBUTOR", ""],
      default: "",
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
      rejectedFields: [
        {
          field: String, // e.g., 'panNumber', 'bankDocument', 'companyName'
          reason: String // e.g., 'Image is too blurry', 'Name mismatch'
        }
      ]
    },
    sellerTier: {
      type: String,
      enum: ["BRONZE", "SILVER", "GOLD", "PLATINUM", null],
      default: null,
    },
    statusHistory: [
      {
        status: String,
        timestamp: { type: Date, default: Date.now },
        notes: String,
        actionBy: { type: mongoose.Schema.Types.ObjectId, ref: "Admin" }
      }
    ],
  },
  { timestamps: true }
);

sellerRegistrationSchema.pre('save', function(next) {
  if (!this.sellerId) {
    const timestamp = Date.now().toString().slice(-5);
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    this.sellerId = `SEL-${timestamp}${random}`;
  }
  
  if (this.isModified('onboardingStatus')) {
    this.statusHistory.push({
      status: this.onboardingStatus,
      timestamp: new Date(),
      notes: this.approvalDetails?.reviewNotes || "",
      actionBy: this.approvalDetails?.reviewedBy || null
    });
  }
  
  next();
});

module.exports = mongoose.model("SellerRegistration", sellerRegistrationSchema);
