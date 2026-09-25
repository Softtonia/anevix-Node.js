const mongoose = require("mongoose");
const CategoryCustomField = require("../models/CategoryCustomField");
const CategoryCustomFieldValue = require("../models/CategoryCustomFieldValue");
const CategoryResolver = require("../services/categoryResolver");

const formatCustomFieldResponse = (field, values = null) => {
  const f = field.toObject ? field.toObject() : field;
  return {
    id: f._id.toString(),
    category_id: f.category_id.toString(),
    category_type: f.category_type,
    field_key: f.field_key,
    field_name: f.field_name,
    field_type: f.field_type,
    is_required: f.is_required,
    is_active: f.is_active,
    menu_order: f.menu_order,
    field_config: f.field_config || {},
    validation_config: f.validation_config || {},
    options: values ? (values.options !== undefined ? values.options : values) : null,
    createdAt: f.createdAt,
    updatedAt: f.updatedAt,
  };
};

// @desc    Create new CategoryCustomField (supports both single field and bulk custom_fields array)
// @route   POST /api/category-custom-fields
// @access  Private/Admin
const createCategoryCustomField = async (req, res) => {
  try {
    const {
      category_id,
      category_type,
      custom_fields,
      field_key,
      field_name,
      field_type,
      is_required,
      is_active,
      menu_order,
      field_config,
      validation_config,
    } = req.body;

    if (!category_id || !category_type) {
      return res.status(400).json({
        message: "category_id and category_type are required",
      });
    }

    // Validate category existence via CategoryResolver
    try {
      await CategoryResolver.findNode(category_type, category_id);
    } catch (resolverErr) {
      return res.status(resolverErr.statusCode || 400).json({
        message: resolverErr.message,
      });
    }

    // -------------------------------------------------------------------
    // Case A: Bulk creation when `custom_fields` array is provided
    // -------------------------------------------------------------------
    if (custom_fields && Array.isArray(custom_fields)) {
      if (custom_fields.length === 0) {
        return res.status(400).json({
          message: "custom_fields array cannot be empty",
        });
      }

      const createdFields = [];
      const seenKeysInBatch = new Set();

      for (let i = 0; i < custom_fields.length; i++) {
        const item = custom_fields[i];
        if (!item.field_key || !item.field_name || !item.field_type) {
          return res.status(400).json({
            message: `Field at index ${i} is missing field_key, field_name, or field_type`,
          });
        }

        const normalizedKey = item.field_key.trim().toLowerCase();
        if (!/^[a-z0-9_]+$/.test(normalizedKey)) {
          return res.status(400).json({
            message: `field_key '${normalizedKey}' at index ${i} must only contain lowercase alphanumeric characters and underscores`,
          });
        }

        if (seenKeysInBatch.has(normalizedKey)) {
          return res.status(400).json({
            message: `Duplicate field_key '${normalizedKey}' in payload at index ${i}`,
          });
        }
        seenKeysInBatch.add(normalizedKey);

        const existing = await CategoryCustomField.findOne({
          category_id,
          category_type,
          field_key: normalizedKey,
        });

        if (existing) {
          return res.status(400).json({
            message: `Field '${normalizedKey}' already exists for this ${category_type}`,
          });
        }

        const field = new CategoryCustomField({
          category_id,
          category_type,
          field_key: normalizedKey,
          field_name: item.field_name.trim(),
          field_type: item.field_type,
          is_required: item.is_required !== undefined ? item.is_required : false,
          is_active: item.is_active !== undefined ? item.is_active : true,
          menu_order: item.menu_order !== undefined ? Number(item.menu_order) : i + 1,
          field_config: item.field_config || {},
          validation_config: item.validation_config || {},
        });

        const saved = await field.save();
        createdFields.push(formatCustomFieldResponse(saved));
      }

      return res.status(201).json({
        category_id,
        category_type,
        custom_fields: createdFields,
      });
    }

    // -------------------------------------------------------------------
    // Case B: Single field creation (existing behavior preserved)
    // -------------------------------------------------------------------
    if (!field_key || !field_name || !field_type) {
      return res.status(400).json({
        message: "field_key, field_name, and field_type are required",
      });
    }

    const normalizedKey = field_key.trim().toLowerCase();
    if (!/^[a-z0-9_]+$/.test(normalizedKey)) {
      return res.status(400).json({
        message: "field_key must only contain lowercase alphanumeric characters and underscores",
      });
    }

    // Check duplicate
    const existing = await CategoryCustomField.findOne({
      category_id,
      category_type,
      field_key: normalizedKey,
    });
    if (existing) {
      return res.status(400).json({
        message: `Field '${normalizedKey}' already exists for this ${category_type}`,
      });
    }

    const field = new CategoryCustomField({
      category_id,
      category_type,
      field_key: normalizedKey,
      field_name: field_name.trim(),
      field_type,
      is_required: is_required !== undefined ? is_required : false,
      is_active: is_active !== undefined ? is_active : true,
      menu_order: menu_order !== undefined ? Number(menu_order) : 0,
      field_config: field_config || {},
      validation_config: validation_config || {},
    });

    const saved = await field.save();
    res.status(201).json(formatCustomFieldResponse(saved));
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: "Duplicate custom field definition" });
    }
    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map((v) => v.message);
      return res.status(400).json({ message: "Validation Error", errors: messages });
    }
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

// @desc    Get all CategoryCustomFields (optional query filters)
// @route   GET /api/category-custom-fields
// @access  Public / Passive Admin
const getCategoryCustomFields = async (req, res) => {
  try {
    const { category_id, category_type } = req.query;
    const query = {};

    const isAdmin = !!req.admin;
    if (!isAdmin) {
      query.is_active = true;
    }

    if (category_type) {
      CategoryResolver.validateType(category_type);
      query.category_type = category_type;
    }
    if (category_id) {
      CategoryResolver.validateId(category_id);
      query.category_id = category_id;
    }

    const fields = await CategoryCustomField.find(query).sort({ menu_order: 1, createdAt: 1 });

    const fieldIds = fields.map((f) => f._id);
    const values = await CategoryCustomFieldValue.find({ cat_custom_field_id: { $in: fieldIds } }).lean();
    const valuesMap = new Map(values.map((v) => [v.cat_custom_field_id.toString(), v.field_value]));

    const response = fields.map((f) =>
      formatCustomFieldResponse(f, valuesMap.get(f._id.toString()))
    );

    res.json(response);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Get single CategoryCustomField by ID
// @route   GET /api/category-custom-fields/:id
// @access  Public / Passive Admin
const getCategoryCustomFieldById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid custom field ID format" });
    }

    const field = await CategoryCustomField.findById(id);
    if (!field) {
      return res.status(404).json({ message: "CategoryCustomField not found" });
    }

    const isAdmin = !!req.admin;
    if (!isAdmin && !field.is_active) {
      return res.status(404).json({ message: "CategoryCustomField not found" });
    }

    const values = await CategoryCustomFieldValue.findOne({ cat_custom_field_id: field._id }).lean();
    res.json(formatCustomFieldResponse(field, values ? values.field_value : null));
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

// @desc    Update CategoryCustomField
// @route   PUT /api/category-custom-fields/:id
// @access  Private/Admin
const updateCategoryCustomField = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid custom field ID format" });
    }

    const field = await CategoryCustomField.findById(id);
    if (!field) {
      return res.status(404).json({ message: "CategoryCustomField not found" });
    }

    const {
      field_key,
      field_name,
      field_type,
      is_required,
      is_active,
      menu_order,
      field_config,
      validation_config,
    } = req.body;

    if (field_key && field_key !== field.field_key) {
      const normalizedKey = field_key.trim().toLowerCase();
      if (!/^[a-z0-9_]+$/.test(normalizedKey)) {
        return res.status(400).json({
          message: "field_key must only contain lowercase alphanumeric characters and underscores",
        });
      }
      const existing = await CategoryCustomField.findOne({
        category_id: field.category_id,
        category_type: field.category_type,
        field_key: normalizedKey,
      });
      if (existing && existing._id.toString() !== field._id.toString()) {
        return res.status(400).json({
          message: `Field '${normalizedKey}' already exists for this ${field.category_type}`,
        });
      }
      field.field_key = normalizedKey;
    }

    if (field_name !== undefined) field.field_name = field_name.trim();
    if (field_type !== undefined) field.field_type = field_type;
    if (is_required !== undefined) field.is_required = is_required;
    if (is_active !== undefined) field.is_active = is_active;
    if (menu_order !== undefined) field.menu_order = Number(menu_order);
    if (field_config !== undefined) field.field_config = field_config;
    if (validation_config !== undefined) field.validation_config = validation_config;

    const saved = await field.save();
    const values = await CategoryCustomFieldValue.findOne({ cat_custom_field_id: saved._id }).lean();
    res.json(formatCustomFieldResponse(saved, values ? values.field_value : null));
  } catch (error) {
    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map((v) => v.message);
      return res.status(400).json({ message: "Validation Error", errors: messages });
    }
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

// @desc    Delete CategoryCustomField
// @route   DELETE /api/category-custom-fields/:id
// @access  Private/Admin
const deleteCategoryCustomField = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid custom field ID format" });
    }

    const field = await CategoryCustomField.findById(id);
    if (!field) {
      return res.status(404).json({ message: "CategoryCustomField not found" });
    }

    // Cascade delete any values for this field
    await CategoryCustomFieldValue.deleteMany({ cat_custom_field_id: field._id });
    await CategoryCustomField.findByIdAndDelete(id);

    res.json({ message: "CategoryCustomField and its values deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

module.exports = {
  createCategoryCustomField,
  getCategoryCustomFields,
  getCategoryCustomFieldById,
  updateCategoryCustomField,
  deleteCategoryCustomField,
  formatCustomFieldResponse,
};
