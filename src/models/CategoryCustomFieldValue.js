const mongoose = require("mongoose");

const categoryCustomFieldValueSchema = new mongoose.Schema(
  {
    cat_custom_field_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CategoryCustomField",
      required: [true, "cat_custom_field_id is required"],
      unique: true,
      index: true,
    },
    field_value: {
      type: mongoose.Schema.Types.Mixed,
      required: [true, "field_value is required"],
    },
  },
  {
    timestamps: true,
  }
);

const CategoryCustomFieldValue = mongoose.model(
  "CategoryCustomFieldValue",
  categoryCustomFieldValueSchema
);

module.exports = CategoryCustomFieldValue;
