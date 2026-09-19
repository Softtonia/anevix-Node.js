const mongoose = require("mongoose");

const productOptions = {
  timestamps: true,
  discriminatorKey: "productType",
};

const productSchema = new mongoose.Schema(
  {
    // ==========================================
    // TRULY COMMON FIELDS (Stay here permanently)
    // ==========================================
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
      default: null, // Legacy field
    },
    cat_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ProductCategory",
    },
    sub_cat_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ProductSubCategory",
    },
    nested_sub_cat_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ProductNestedSubCategory",
    },
    brandId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Brand",
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
    metaTitle: {
      type: String,
      default: null,
    },
    metaDescription: {
      type: String,
      default: null,
      trim: true,
    },
    catalog_visibility: {
      type: String,
      enum: ["visible", "catalog", "search", "hidden"],
      default: "visible",
    },
    global_unique_id: {
      type: String,
      default: null,
    },
    related_ids: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
    }],
    grouped_products: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
    }],

    // ==========================================
    // LEGACY FIELDS FOR PHASE 2 MIGRATION
    // (Will be moved to Variable/External discriminators later)
    // ==========================================
    sku: {
      type: String,
      // required: true, // Cannot be strictly required here if some types don't have it
      unique: true,
      sparse: true, // Allow multiple products to have null SKU if they are parent variables
      trim: true,
      uppercase: true,
    },
    price: {
      type: Number,
      // required: true,
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
    virtual: {
      type: Boolean,
      default: false,
    },
    downloadable: {
      type: Boolean,
      default: false,
    },
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
    date_on_sale_from: {
      type: Date,
      default: null,
    },
    date_on_sale_to: {
      type: Date,
      default: null,
    },
    total_sales: {
      type: Number,
      default: 0,
      min: [0, "Total sales cannot be negative"],
      validate: {
        validator: Number.isInteger,
        message: "{VALUE} is not an integer value",
      },
    },
    downloads: [
      {
        id: { type: String, required: true },
        name: { type: String, required: true },
        file: { type: String, required: true },
      }
    ],
    download_limit: {
      type: Number,
      default: -1,
      min: [-1, "Download limit must be -1 or greater"],
      validate: {
        validator: Number.isInteger,
        message: "{VALUE} is not an integer value",
      },
    },
    download_expiry: {
      type: Number,
      default: -1,
      min: [-1, "Download expiry must be -1 or greater"],
      validate: {
        validator: Number.isInteger,
        message: "{VALUE} is not an integer value",
      },
    },
    tax_status: {
      type: String,
      enum: ["taxable", "shipping", "none"],
      default: "taxable",
    },
    tax_class: {
      type: String,
      default: null,
    },
    sold_individually: {
      type: Boolean,
      default: false,
    },
    weight: {
      type: Number,
      default: null,
      min: [0, "Weight cannot be negative"],
    },
    dimensions: {
      length: { type: Number, default: null, min: [0, "Length cannot be negative"] },
      width: { type: Number, default: null, min: [0, "Width cannot be negative"] },
      height: { type: Number, default: null, min: [0, "Height cannot be negative"] },
    },
    shipping_class: {
      type: String,
      default: null,
    },
    shipping_class_id: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    reviews_allowed: {
      type: Boolean,
      default: true,
    },
    upsell_ids: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
    }],
    cross_sell_ids: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
    }],
    purchase_note: {
      type: String,
      default: null,
    },
    default_attributes: [{
      name: { type: String, required: true, trim: true },
      option: { type: String, required: true, trim: true },
    }],
    menu_order: {
      type: Number,
      default: 0,
      validate: {
        validator: Number.isInteger,
        message: "{VALUE} is not an integer value",
      },
    },
  },
  productOptions
);

productSchema.pre("validate", function () {
  if (this.date_on_sale_from && this.date_on_sale_to) {
    if (this.date_on_sale_from > this.date_on_sale_to) {
      this.invalidate("date_on_sale_from", "date_on_sale_from must not be after date_on_sale_to");
    }
  }
  
  if (this.isNew || this.isModified('cat_id') || this.isModified('sub_cat_id') || this.isModified('nested_sub_cat_id')) {
    if (!this.categoryId) { // New product logic
      if (!this.cat_id) this.invalidate("cat_id", "cat_id is required");
      if (!this.sub_cat_id) this.invalidate("sub_cat_id", "sub_cat_id is required");
      if (!this.nested_sub_cat_id) this.invalidate("nested_sub_cat_id", "nested_sub_cat_id is required");
    }
  }
});

const Product = mongoose.model("Product", productSchema);

module.exports = Product;
