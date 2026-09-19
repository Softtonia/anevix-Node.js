const mongoose = require("mongoose");
const Product = require("./Product");

const externalProductSchema = new mongoose.Schema({
  externalUrl: {
    type: String,
    required: [true, "A valid externalUrl is required for external products"],
    trim: true,
  },
  buttonText: {
    type: String,
    default: "Buy product",
    trim: true,
  },
  regularPrice: {
    type: Number,
    min: [0, "Regular price cannot be negative"],
  },
});

// Pre-validate hook for External / Affiliate Products
externalProductSchema.pre("validate", function () {
  // If API/DB provided `price` but not `regularPrice`, map it
  if (this.price !== undefined && this.regularPrice === undefined) {
    this.regularPrice = this.price;
  }
  // Clear the base `price` field to enforce regularPrice as single source of truth
  this.price = undefined;

  // Ensure default buttonText if empty
  if (!this.buttonText || this.buttonText.trim() === "") {
    this.buttonText = "Buy product";
  }

  // External products cannot be virtual or downloadable directly
  this.virtual = false;
  this.downloadable = false;
});

const ExternalProduct = Product.discriminator("external", externalProductSchema);

module.exports = ExternalProduct;
