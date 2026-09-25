const mongoose = require("mongoose");
const CategoryGuideline = require("../models/CategoryGuideline");
const CategoryResolver = require("../services/categoryResolver");

const formatGuidelineResponse = (guideline) => {
  const g = guideline.toObject ? guideline.toObject() : guideline;
  return {
    id: g._id.toString(),
    category_id: g.category_id.toString(),
    category_type: g.category_type,
    guideline_type: g.guideline_type,
    field_type: g.field_type || "text",
    title: g.title,
    description: g.description || "",
    content: g.content || {},
    menu_order: g.menu_order,
    is_active: g.is_active,
    createdAt: g.createdAt,
    updatedAt: g.updatedAt,
  };
};

// @desc    Create new CategoryGuideline
// @route   POST /api/category-guidelines
// @access  Private/Admin
const createCategoryGuideline = async (req, res) => {
  try {
    const {
      category_id,
      category_type,
      guideline_type,
      field_type,
      title,
      description,
      content,
      menu_order,
      is_active,
    } = req.body;

    if (!category_id || !category_type || !guideline_type || !title) {
      return res.status(400).json({
        message: "category_id, category_type, guideline_type, and title are required",
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

    const guideline = new CategoryGuideline({
      category_id,
      category_type,
      guideline_type,
      field_type: field_type || "text",
      title: title.trim(),
      description: description ? description.trim() : "",
      content: content || { items: [] },
      menu_order: menu_order !== undefined ? Number(menu_order) : 0,
      is_active: is_active !== undefined ? is_active : true,
    });

    const saved = await guideline.save();
    res.status(201).json(formatGuidelineResponse(saved));
  } catch (error) {
    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map((v) => v.message);
      return res.status(400).json({ message: "Validation Error", errors: messages });
    }
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

// @desc    Get all CategoryGuidelines (with optional category_id/category_type filters)
// @route   GET /api/category-guidelines
// @access  Public / Passive Admin
const getCategoryGuidelines = async (req, res) => {
  try {
    const { category_id, category_type, guideline_type } = req.query;
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
    if (guideline_type) {
      query.guideline_type = guideline_type;
    }

    const guidelines = await CategoryGuideline.find(query).sort({
      menu_order: 1,
      createdAt: 1,
    });

    res.json(guidelines.map((g) => formatGuidelineResponse(g)));
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Get single CategoryGuideline by ID
// @route   GET /api/category-guidelines/:id
// @access  Public / Passive Admin
const getCategoryGuidelineById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid guideline ID format" });
    }

    const guideline = await CategoryGuideline.findById(id);
    if (!guideline) {
      return res.status(404).json({ message: "CategoryGuideline not found" });
    }

    const isAdmin = !!req.admin;
    if (!isAdmin && !guideline.is_active) {
      return res.status(404).json({ message: "CategoryGuideline not found" });
    }

    res.json(formatGuidelineResponse(guideline));
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

// @desc    Update CategoryGuideline
// @route   PUT /api/category-guidelines/:id
// @access  Private/Admin
const updateCategoryGuideline = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid guideline ID format" });
    }

    const guideline = await CategoryGuideline.findById(id);
    if (!guideline) {
      return res.status(404).json({ message: "CategoryGuideline not found" });
    }

    const { guideline_type, field_type, title, description, content, menu_order, is_active } = req.body;

    if (guideline_type !== undefined) guideline.guideline_type = guideline_type;
    if (field_type !== undefined) guideline.field_type = field_type;
    if (title !== undefined) guideline.title = title.trim();
    if (description !== undefined) guideline.description = description.trim();
    if (content !== undefined) guideline.content = content;
    if (menu_order !== undefined) guideline.menu_order = Number(menu_order);
    if (is_active !== undefined) guideline.is_active = is_active;

    const saved = await guideline.save();
    res.json(formatGuidelineResponse(saved));
  } catch (error) {
    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map((v) => v.message);
      return res.status(400).json({ message: "Validation Error", errors: messages });
    }
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

// @desc    Delete CategoryGuideline
// @route   DELETE /api/category-guidelines/:id
// @access  Private/Admin
const deleteCategoryGuideline = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid guideline ID format" });
    }

    const deleted = await CategoryGuideline.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({ message: "CategoryGuideline not found" });
    }

    res.json({ message: "CategoryGuideline deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

module.exports = {
  createCategoryGuideline,
  getCategoryGuidelines,
  getCategoryGuidelineById,
  updateCategoryGuideline,
  deleteCategoryGuideline,
  formatGuidelineResponse,
};
