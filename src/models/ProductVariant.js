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
    globalUniqueId: {
      type: String,
      default: null,
    },
    description: {
      type: String,
      default: null,
    },
    dateOnSaleFrom: {
      type: Date,
      default: null,
    },
    dateOnSaleTo: {
      type: Date,
      default: null,
    },
    virtual: {
      type: Boolean,
      default: false,
    },
    downloadable: {
      type: Boolean,
      default: false,
    },
    downloads: [
      {
        id: { type: String, required: true },
        name: { type: String, required: true },
        file: { type: String, required: true },
      }
    ],
    downloadLimit: {
      type: Number,
      default: -1,
      min: [-1, "Download limit must be -1 or greater"],
      validate: {
        validator: Number.isInteger,
        message: "{VALUE} is not an integer value",
      },
    },
    downloadExpiry: {
      type: Number,
      default: -1,
      min: [-1, "Download expiry must be -1 or greater"],
      validate: {
        validator: Number.isInteger,
        message: "{VALUE} is not an integer value",
      },
    },
    taxStatus: {
      type: String,
      enum: ["taxable", "shipping", "none"],
      default: "taxable",
    },
    taxClass: {
      type: String,
      default: null,
    },
    weight: {
      type: String,
      default: null,
    },
    dimensions: {
      length: { type: String, default: null },
      width: { type: String, default: null },
      height: { type: String, default: null },
    },
    shippingClass: {
      type: String,
      default: null,
    },
    menuOrder: {
      type: Number,
      default: 0,
      validate: {
        validator: Number.isInteger,
        message: "{VALUE} is not an integer value",
      },
    },
    metaData: {
      type: Array,
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

productVariantSchema.pre("validate", function () {
  if (this.dateOnSaleFrom && this.dateOnSaleTo) {
    if (this.dateOnSaleFrom > this.dateOnSaleTo) {
      this.invalidate("dateOnSaleFrom", "dateOnSaleFrom must not be after dateOnSaleTo");
    }
  }
});

const ProductVariant = mongoose.model("ProductVariant", productVariantSchema);

module.exports = ProductVariant;
