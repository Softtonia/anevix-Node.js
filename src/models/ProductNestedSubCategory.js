const mongoose = require("mongoose");

const productNestedSubCategorySchema = new mongoose.Schema(
  {
    sub_cat_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ProductSubCategory",
      required: true,
    },
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

const ProductNestedSubCategory = mongoose.model("ProductNestedSubCategory", productNestedSubCategorySchema);

module.exports = ProductNestedSubCategory;
