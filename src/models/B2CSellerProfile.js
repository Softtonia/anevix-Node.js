const mongoose = require("mongoose");

const b2cSellerProfileSchema = new mongoose.Schema(
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
    // Personal Information
    personalInfo: {
      fullName: { type: String, required: true },
      mobile: { type: String, required: true },
      email: { type: String, required: true },
      dateOfBirth: { type: Date }, // optional
      residentialAddress: {
        street: String,
        city: String,
        state: String,
        zipCode: String,
        country: String,
      },
      pan: { type: String, required: true },
    },
    // Business Information
    businessInfo: {
      businessName: { type: String, required: true },
      businessType: {
        type: String,
        enum: ["SOLE_PROPRIETORSHIP", "LLP", "PRIVATE_LIMITED", "PUBLIC_LIMITED", "OTHER"],
        required: true,
      },
      gstin: { type: String },
      businessAddress: {
        street: String,
        city: String,
        state: String,
        zipCode: String,
        country: String,
      },
      pickupAddress: {
        street: String,
        city: String,
        state: String,
        zipCode: String,
        country: String,
      },
      categories: [{ type: String }],
      brands: [{ type: String }],
      sellerType: {
        type: String,
        enum: ["MANUFACTURER", "WHOLESALER", "RETAILER", "DISTRIBUTOR"],
        required: true,
      },
    },
    // Banking Information
    bankingInfo: {
      accountHolderName: { type: String, required: true },
      bankName: { type: String, required: true },
      accountNumber: { type: String, required: true },
      ifsc: { type: String, required: true },
      bankDocumentUrl: { type: String }, // URL or path to cancelled cheque/bank document
    },
    status: {
      type: String,
      enum: ["PENDING", "UNDER_REVIEW", "APPROVED", "REJECTED", "SUSPENDED"],
      default: "PENDING",
    },
  },
  { timestamps: true }
);

b2cSellerProfileSchema.pre('save', function(next) {
  if (!this.sellerId) {
    const timestamp = Date.now().toString().slice(-5);
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    this.sellerId = `SEL-${timestamp}${random}`;
  }
  next();
});

module.exports = mongoose.model("B2CSellerProfile", b2cSellerProfileSchema);
