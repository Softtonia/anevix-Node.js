const mongoose = require("mongoose");

const productImageSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: false,
      default: null,
      index: true,
    },
    variantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ProductVariant",
      default: null,
      index: true,
    },
    sku: {
      type: String,
      trim: true,
      default: null,
      index: true,
    },
    fileName: {
      type: String,
      trim: true,
      default: null,
    },
    url: {
      type: String,
      required: true,
      trim: true,
    },
    altText: {
      type: String,
      default: null,
      trim: true,
    },
    isPrimary: {
      type: Boolean,
      default: false,
    },
    sortOrder: {
      type: Number,
      default: 0,
      min: [0, "Sort order cannot be negative"],
    },
    sellerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "B2CSellerProfile",
      default: null,
      index: true,
    },
    status: {
      type: String,
      enum: ["temporary", "active", "failed"],
      default: "active",
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for efficient ordered retrieval by product and cleanup
productImageSchema.index({ productId: 1, sortOrder: 1, createdAt: 1 });
productImageSchema.index({ status: 1, createdAt: 1 });

const ProductImage = mongoose.model("ProductImage", productImageSchema);

module.exports = ProductImage;
