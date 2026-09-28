const mongoose = require("mongoose");

const categoryGuidelineSchema = new mongoose.Schema(
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
    guideline_type: {
      type: String,
      required: [true, "guideline_type is required"],
      enum: {
        values: ["general", "image", "product", "quality", "measurement", "catalogue", "textEditor"],
        message: "{VALUE} is not a valid guideline_type",
      },
      index: true,
    },
    field_type: {
      type: String,
      enum: {
        values: ["text", "checkbox", "repeater", "textEditor"],
        message: "{VALUE} is not a valid field_type",
      },
      default: "text",
    },
    title: {
      type: String,
      required: [true, "title is required"],
      trim: true,
    },
    description: {
      type: String,
      default: "",
      trim: true,
    },
    content: {
      type: mongoose.Schema.Types.Mixed,
      default: () => ({ items: [] }),
    },
    menu_order: {
      type: Number,
      default: 0,
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

categoryGuidelineSchema.index({
  category_id: 1,
  category_type: 1,
  guideline_type: 1,
  is_active: 1,
  menu_order: 1,
});

const CategoryGuideline = mongoose.model("CategoryGuideline", categoryGuidelineSchema);

module.exports = CategoryGuideline;
