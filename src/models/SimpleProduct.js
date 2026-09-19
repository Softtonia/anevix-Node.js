const mongoose = require("mongoose");
const Product = require("./Product");

const simpleProductSchema = new mongoose.Schema({
  regularPrice: {
    type: Number,
    // required: true,
    min: [0, "Regular price cannot be negative"],
  }
  // Note: sku, salePrice, weight, dimensions, attributes, etc. are currently inherited 
  // from the base Product schema for backward compatibility in Phase 1. 
  // They will be explicitly moved here in Phase 2 when Variable/External are refactored.
});

// Pre-validate hook to handle legacy price mapping for Simple Products
simpleProductSchema.pre("validate", function () {
  // If API/DB provided `price` but not `regularPrice`, map it
  if (this.price !== undefined && this.regularPrice === undefined) {
    this.regularPrice = this.price;
  }
  
  // Clear the base `price` field to enforce regularPrice as single source of truth
  this.price = undefined; 
});

const SimpleProduct = Product.discriminator("simple", simpleProductSchema);

module.exports = SimpleProduct;
