const mongoose = require("mongoose");

const productVariantSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    sku: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
    },
    attributes: [
      {
        name: { type: String, required: true, trim: true },
        value: { type: String, required: true, trim: true },
      },
    ],
    price: {
      type: Number,
      required: true,
      min: [0, "Price cannot be negative"],
    },
    salePrice: {
      type: Number,
      default: null,
      min: [0, "Sale price cannot be negative"],
    },
    thumbnail: {
      type: String,
      default: null,
    },
    status: {
      type: String,
      enum: ["draft", "pending", "active", "rejected", "archived"],
      default: "draft",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

const ProductVariant = mongoose.model("ProductVariant", productVariantSchema);

module.exports = ProductVariant;
