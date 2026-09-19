const mongoose = require("mongoose");

const productSubCategorySchema = new mongoose.Schema(
  {
    cat_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ProductCategory",
      required: true,
    },
    sub_cat_name: {
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

const ProductSubCategory = mongoose.model("ProductSubCategory", productSubCategorySchema);

module.exports = ProductSubCategory;
