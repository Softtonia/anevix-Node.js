const mongoose = require("mongoose");

const categoryCustomFieldSchema = new mongoose.Schema(
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
    field_key: {
      type: String,
      required: [true, "field_key is required"],
      trim: true,
      lowercase: true,
      match: [/^[a-z0-9_]+$/, "field_key must only contain lowercase alphanumeric characters and underscores"],
    },
    field_name: {
      type: String,
      required: [true, "field_name is required"],
      trim: true,
    },
    field_type: {
      type: String,
      required: [true, "field_type is required"],
      enum: {
        values: [
          "text",
          "textarea",
          "number",
          "decimal",
          "select",
          "multiselect",
          "radio",
          "checkbox",
          "repeater",
          "boolean",
          "date",
          "url",
          "color",
          "image",
          "json",
        ],
        message: "{VALUE} is not a valid field_type",
      },
    },
    is_required: {
      type: Boolean,
      default: false,
    },
    is_active: {
      type: Boolean,
      default: true,
    },
    menu_order: {
      type: Number,
      default: 0,
    },
    field_config: {
      type: mongoose.Schema.Types.Mixed,
      default: () => ({}),
    },
    validation_config: {
      type: mongoose.Schema.Types.Mixed,
      default: () => ({}),
    },
  },
  {
    timestamps: true,
  }
);

// Compound unique index: prevents duplicate field_key on the same category node
categoryCustomFieldSchema.index(
  { category_id: 1, category_type: 1, field_key: 1 },
  { unique: true }
);

categoryCustomFieldSchema.index(
  { category_id: 1, category_type: 1, is_active: 1, menu_order: 1 }
);

const CategoryCustomField = mongoose.model("CategoryCustomField", categoryCustomFieldSchema);

module.exports = CategoryCustomField;
