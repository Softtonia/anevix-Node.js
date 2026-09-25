const mongoose = require("mongoose");

const categoryCatalogConfigSchema = new mongoose.Schema(
  {
    category_id: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, "category_id is required"],
      index: true,
    },
    category_type: {
      type: String,
      required: [true, "category_type is required"],
      enum: {
        values: ["ProductCategory", "ProductSubCategory", "ProductNestedSubCategory", "Category"],
        message: "{VALUE} is not a valid category_type",
      },
      index: true,
    },
    measurement: {
      type: mongoose.Schema.Types.Mixed,
      default: () => ({
        enabled: false,
        image: null,
        title: "Size Guide",
      }),
    },
    product_image: {
      type: mongoose.Schema.Types.Mixed,
      default: () => ({
        min_images: 1,
        max_images: 9,
        primary_image_required: true,
        front_image_required: true,
      }),
    },
    catalogue: {
      type: mongoose.Schema.Types.Mixed,
      default: () => ({}),
    },
    quality: {
      type: mongoose.Schema.Types.Mixed,
      default: () => ({}),
    },
    additional_config: {
      type: mongoose.Schema.Types.Mixed,
      default: () => ({}),
    },
    is_active: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// One catalog config record per category node
categoryCatalogConfigSchema.index(
  { category_id: 1, category_type: 1 },
  { unique: true }
);

const CategoryCatalogConfig = mongoose.model(
  "CategoryCatalogConfig",
  categoryCatalogConfigSchema
);

module.exports = CategoryCatalogConfig;
