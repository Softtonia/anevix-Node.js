const mongoose = require("mongoose");
const Product = require("./Product");

const simpleProductSchema = new mongoose.Schema({
  // Note: sku, salePrice, weight, dimensions, attributes, etc. are currently inherited 
  // from the base Product schema for backward compatibility in Phase 1. 
  // They will be explicitly moved here in Phase 2 when Variable/External are refactored.
});

const SimpleProduct = Product.discriminator("simple", simpleProductSchema);

module.exports = SimpleProduct;
