const mongoose = require("mongoose");
const Product = require("./Product");

const groupedProductSchema = new mongoose.Schema({
  grouped_products: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
    },
  ],
});

// Pre-validate hook to enforce grouped product constraints
groupedProductSchema.pre("validate", function () {
  // Grouped products do not have their own direct price
  this.price = undefined;
  this.regularPrice = undefined;
  this.salePrice = null;

  // Grouped products cannot be virtual or downloadable directly
  this.virtual = false;
  this.downloadable = false;
});

const GroupedProduct = Product.discriminator("grouped", groupedProductSchema);

module.exports = GroupedProduct;
