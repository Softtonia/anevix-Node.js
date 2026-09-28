const mongoose = require("mongoose");

const productCategorySchema = new mongoose.Schema(
  {
    cat_name: {
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
    parentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ProductCategory",
      default: null,
    },
    image: {
      type: String,
      default: null,
    },
    
    description: { type: String, trim: true, default: '' },
    display: { type: String, enum: ['default', 'products', 'subcategories', 'both'], default: 'default' },
    menu_order: { type: Number, default: 0 },
    count: { type: Number, default: 0 },
    isActive: {
      type: Boolean,
      default: true,
    }
  },
  {
    timestamps: true,
  }
);

const ProductCategory = mongoose.model("ProductCategory", productCategorySchema);

module.exports = ProductCategory;
