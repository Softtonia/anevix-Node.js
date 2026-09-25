const mongoose = require("mongoose");
const CategoryCustomField = require("../models/CategoryCustomField");
const CategoryCustomFieldValue = require("../models/CategoryCustomFieldValue");

// @desc    Upsert CategoryCustomFieldValue
// @route   POST /api/category-custom-field-values
// @access  Private/Admin
const upsertCategoryCustomFieldValue = async (req, res) => {
  try {
    const { cat_custom_field_id, field_value } = req.body;

    if (!cat_custom_field_id || field_value === undefined) {
      return res.status(400).json({
        message: "cat_custom_field_id and field_value are required",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(cat_custom_field_id)) {
      return res.status(400).json({ message: "Invalid cat_custom_field_id format" });
    }

    const field = await CategoryCustomField.findById(cat_custom_field_id);
    if (!field) {
      return res.status(404).json({ message: "Referenced CategoryCustomField not found" });
    }

    const updated = await CategoryCustomFieldValue.findOneAndUpdate(
      { cat_custom_field_id },
      { field_value },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
    );

    res.status(200).json({
      id: updated._id.toString(),
      cat_custom_field_id: updated.cat_custom_field_id.toString(),
      field_value: updated.field_value,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    });
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

// @desc    Get values for a CategoryCustomField
// @route   GET /api/category-custom-field-values/:fieldId
// @access  Public / Passive Admin
const getCategoryCustomFieldValueByFieldId = async (req, res) => {
  try {
    const { fieldId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(fieldId)) {
      return res.status(400).json({ message: "Invalid field ID format" });
    }

    const value = await CategoryCustomFieldValue.findOne({ cat_custom_field_id: fieldId });
    if (!value) {
      return res.status(404).json({ message: "Values for this custom field not found" });
    }

    res.json({
      id: value._id.toString(),
      cat_custom_field_id: value.cat_custom_field_id.toString(),
      field_value: value.field_value,
      createdAt: value.createdAt,
      updatedAt: value.updatedAt,
    });
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

// @desc    Delete CategoryCustomFieldValue
// @route   DELETE /api/category-custom-field-values/:fieldId
// @access  Private/Admin
const deleteCategoryCustomFieldValue = async (req, res) => {
  try {
    const { fieldId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(fieldId)) {
      return res.status(400).json({ message: "Invalid field ID format" });
    }

    const deleted = await CategoryCustomFieldValue.findOneAndDelete({ cat_custom_field_id: fieldId });
    if (!deleted) {
      return res.status(404).json({ message: "Values for this custom field not found" });
    }

    res.json({ message: "Custom field values deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

module.exports = {
  upsertCategoryCustomFieldValue,
  getCategoryCustomFieldValueByFieldId,
  deleteCategoryCustomFieldValue,
};
