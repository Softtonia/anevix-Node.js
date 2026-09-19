const mongoose = require("mongoose");
const Product = require("./Product");

const variableProductSchema = new mongoose.Schema({
  // Stock management toggle for the variable product (Inventory tab)
  manage_stock: {
    type: Boolean,
    default: false,
  },
});

// Pre-validate hook for Variable Products
variableProductSchema.pre("validate", function () {
  // If API/DB provided `price` but not `regularPrice`, keep consistency
  if (this.price !== undefined && this.regularPrice === undefined) {
    this.regularPrice = this.price;
  }
});

// Virtual populate for product variations
variableProductSchema.virtual("variations", {
  ref: "ProductVariant",
  localField: "_id",
  foreignField: "productId",
});

const VariableProduct = Product.discriminator("variable", variableProductSchema);

module.exports = VariableProduct;
