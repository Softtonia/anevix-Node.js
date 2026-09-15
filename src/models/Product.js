const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    description: {
      type: String,
      default: null,
    },
    shortDescription: {
      type: String,
      default: null,
    },
    sellerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "B2CSellerProfile",
      required: true,
    },
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
    },
    brandId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Brand",
      default: null,
    },
    sku: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
    },
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
    currency: {
      type: String,
      default: "INR",
      trim: true,
      minlength: [3, "Currency code must be exactly 3 characters"],
      maxlength: [3, "Currency code must be exactly 3 characters"],
      match: [/^[A-Z]{3}$/, "Currency code must be a 3-letter uppercase string"],
    },
    thumbnail: {
      type: String,
      default: null,
    },
    productType: {
      type: String,
      enum: ["simple", "variable", "grouped", "external"],
      default: "simple",
    },
    virtual: {
      type: Boolean,
      default: false,
    },
    downloadable: {
      type: Boolean,
      default: false,
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
    isFeatured: {
      type: Boolean,
      default: false,
    },
    tags: [
      {
        type: String,
        trim: true,
      },
    ],
    attributes: [
      {
        name: {
          type: String,
          required: true,
          trim: true,
        },
        options: [
          {
            type: String,
            required: true,
            trim: true,
          },
        ],
      },
    ],
    metaTitle: {
      type: String,
      default: null,
    },
    metaDescription: {
      type: String,
      default: null,
      trim: true,
    },
    externalUrl: {
      type: String,
      default: null,
      trim: true,
    },
    buttonText: {
      type: String,
      default: "Buy Now",
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

const Product = mongoose.model("Product", productSchema);

module.exports = Product;
