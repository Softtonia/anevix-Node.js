const mongoose = require("mongoose");
const CategoryCatalogConfig = require("../models/CategoryCatalogConfig");
const CategoryResolver = require("../services/categoryResolver");

const formatCatalogConfigResponse = (config) => {
  const c = config.toObject ? config.toObject() : config;
  return {
    id: c._id.toString(),
    category_id: c.category_id.toString(),
    category_type: c.category_type,
    measurement: c.measurement || {},
    product_image: c.product_image || {},
    catalogue: c.catalogue || {},
    quality: c.quality || {},
    additional_config: c.additional_config || {},
    is_active: c.is_active,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
  };
};

// @desc    Upsert CategoryCatalogConfig
// @route   POST /api/category-catalog-configs
// @access  Private/Admin
const upsertCategoryCatalogConfig = async (req, res) => {
  try {
    const {
      category_id,
      category_type,
      measurement,
      product_image,
      catalogue,
      quality,
      additional_config,
      is_active,
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

    const updateData = {};
    if (measurement !== undefined) updateData.measurement = measurement;
    if (product_image !== undefined) updateData.product_image = product_image;
    if (catalogue !== undefined) updateData.catalogue = catalogue;
    if (quality !== undefined) updateData.quality = quality;
    if (additional_config !== undefined) updateData.additional_config = additional_config;
    if (is_active !== undefined) updateData.is_active = is_active;

    const saved = await CategoryCatalogConfig.findOneAndUpdate(
      { category_id, category_type },
      { $set: updateData },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
    );

    res.status(200).json(formatCatalogConfigResponse(saved));
  } catch (error) {
    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map((v) => v.message);
      return res.status(400).json({ message: "Validation Error", errors: messages });
    }
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

// @desc    Get CategoryCatalogConfig for a specific category node
// @route   GET /api/category-catalog-configs/:categoryType/:categoryId
// @access  Public / Passive Admin
const getCategoryCatalogConfig = async (req, res) => {
  try {
    const { categoryType, categoryId } = req.params;

    CategoryResolver.validateType(categoryType);
    CategoryResolver.validateId(categoryId);

    const config = await CategoryCatalogConfig.findOne({
      category_id: categoryId,
      category_type: categoryType,
    });

    if (!config) {
      return res.status(404).json({ message: "Catalog configuration not found for this category" });
    }

    const isAdmin = !!req.admin;
    if (!isAdmin && !config.is_active) {
      return res.status(404).json({ message: "Catalog configuration not found for this category" });
    }

    res.json(formatCatalogConfigResponse(config));
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Delete CategoryCatalogConfig by ID
// @route   DELETE /api/category-catalog-configs/:id
// @access  Private/Admin
const deleteCategoryCatalogConfig = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid catalog config ID format" });
    }

    const deleted = await CategoryCatalogConfig.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({ message: "CategoryCatalogConfig not found" });
    }

    res.json({ message: "CategoryCatalogConfig deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

module.exports = {
  upsertCategoryCatalogConfig,
  getCategoryCatalogConfig,
  deleteCategoryCatalogConfig,
  formatCatalogConfigResponse,
};
