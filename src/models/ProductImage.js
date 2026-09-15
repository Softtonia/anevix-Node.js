const mongoose = require("mongoose");

const productImageSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
      index: true,
    },
    variantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ProductVariant",
      default: null,
      index: true,
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
  },
  {
    timestamps: true,
  }
);

// Compound index for efficient ordered retrieval by product
productImageSchema.index({ productId: 1, sortOrder: 1, createdAt: 1 });

const ProductImage = mongoose.model("ProductImage", productImageSchema);

module.exports = ProductImage;
