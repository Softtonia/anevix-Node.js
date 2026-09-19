const ProductCategory = require("../models/ProductCategory");
const ProductSubCategory = require("../models/ProductSubCategory");
const ProductNestedSubCategory = require("../models/ProductNestedSubCategory");
const mongoose = require("mongoose");

const formatNestedCategoryResponse = (nestedCategory) => {
  const nCat = nestedCategory.toObject ? nestedCategory.toObject() : nestedCategory;
  
  let subCatId = nCat.sub_cat_id;
  let subCatName = null;
  
  if (nCat.sub_cat_id && typeof nCat.sub_cat_id === 'object' && nCat.sub_cat_id._id) {
    subCatId = nCat.sub_cat_id._id;
    subCatName = nCat.sub_cat_id.sub_cat_name;
  }

  return {
    id: nCat._id.toString(),
    sub_cat_id: subCatId.toString(),
    sub_cat_name: subCatName,
    name: nCat.name,
    slug: nCat.slug,
    description: nCat.description || "",
    display: nCat.display || "default",
    menu_order: nCat.menu_order || 0,
    count: nCat.count || 0,
    isActive: nCat.isActive,
    createdAt: nCat.createdAt,
    updatedAt: nCat.updatedAt,
  };
};

// @desc    Create new product nested sub category
// @route   POST /api/product-nested-sub-categories
// @access  Private/Admin
const createProductNestedSubCategory = async (req, res) => {
  try {
    const { sub_cat_id, name, slug, isActive, description, display, menu_order } = req.body;

    if (!sub_cat_id || !name || !slug) {
      return res.status(400).json({ message: "sub_cat_id, name, and slug are required" });
    }

    if (!mongoose.Types.ObjectId.isValid(sub_cat_id)) {
      return res.status(400).json({ message: "Invalid sub_cat_id format" });
    }

    const parentSubCat = await ProductSubCategory.findById(sub_cat_id);
    if (!parentSubCat) {
      return res.status(404).json({ message: "Parent ProductSubCategory not found" });
    }

    const existingNestedCategory = await ProductNestedSubCategory.findOne({ slug });
    if (existingNestedCategory) {
      return res.status(400).json({ message: "NestedSubCategory with this slug already exists" });
    }

    const nestedCategory = new ProductNestedSubCategory({
      sub_cat_id,
      name,
      slug,
      description,
      display,
      menu_order,
      isActive: isActive !== undefined ? isActive : true,
    });

    const createdNestedCategory = await nestedCategory.save();
    await createdNestedCategory.populate("sub_cat_id", "sub_cat_name");
    res.status(201).json(formatNestedCategoryResponse(createdNestedCategory));
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: "NestedSubCategory with this slug already exists" });
    }
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(val => val.message);
      return res.status(400).json({ message: "Validation Error", errors: messages });
    }
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

// @desc    Get all product nested sub categories
// @route   GET /api/product-nested-sub-categories
// @access  Public
const getProductNestedSubCategories = async (req, res) => {
  try {
    const isAdmin = req.admin || req.user?.role === 'admin';
    const { sub_cat_id } = req.query;
    const query = {};

    if (!isAdmin) {
      query.isActive = true;
    }
    if (sub_cat_id) {
      if (mongoose.Types.ObjectId.isValid(sub_cat_id)) {
        query.sub_cat_id = sub_cat_id;
      } else {
        return res.status(400).json({ message: "Invalid sub_cat_id format" });
      }
    }

    const nestedCategories = await ProductNestedSubCategory.find(query).populate("sub_cat_id", "sub_cat_name").sort({ createdAt: -1 });
    const response = nestedCategories.map(n => formatNestedCategoryResponse(n));
    res.json(response);
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

// @desc    Get single product nested sub category
// @route   GET /api/product-nested-sub-categories/:id
// @access  Public
const getProductNestedSubCategoryById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid nested sub category ID format" });
    }

    const nestedCategory = await ProductNestedSubCategory.findById(id).populate("sub_cat_id", "sub_cat_name");

    if (!nestedCategory) {
      return res.status(404).json({ message: "NestedSubCategory not found" });
    }

    const isAdmin = req.admin || req.user?.role === 'admin';
    if (!isAdmin && !nestedCategory.isActive) {
      return res.status(404).json({ message: "NestedSubCategory not found" });
    }

    res.json(formatNestedCategoryResponse(nestedCategory));
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

// @desc    Update product nested sub category
// @route   PUT /api/product-nested-sub-categories/:id
// @access  Private/Admin
const updateProductNestedSubCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { sub_cat_id, name, slug, isActive, description, display, menu_order } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid nested sub category ID format" });
    }

    const nestedCategory = await ProductNestedSubCategory.findById(id).populate("sub_cat_id", "sub_cat_name");
    if (!nestedCategory) {
      return res.status(404).json({ message: "NestedSubCategory not found" });
    }

    if (slug && slug !== nestedCategory.slug) {
      const existingNestedCategory = await ProductNestedSubCategory.findOne({ slug });
      if (existingNestedCategory) {
        return res.status(400).json({ message: "NestedSubCategory with this slug already exists" });
      }
    }

    const finalSubCatId = sub_cat_id !== undefined ? sub_cat_id : nestedCategory.sub_cat_id.toString();

    if (sub_cat_id !== undefined) {
      if (!mongoose.Types.ObjectId.isValid(finalSubCatId)) {
        return res.status(400).json({ message: "Invalid sub_cat_id format" });
      }
      
      const parentSubCat = await ProductSubCategory.findById(finalSubCatId);
      if (!parentSubCat) {
        return res.status(404).json({ message: "Parent ProductSubCategory not found" });
      }
    }

    nestedCategory.sub_cat_id = finalSubCatId;
    nestedCategory.name = name !== undefined ? name : nestedCategory.name;
    nestedCategory.slug = slug !== undefined ? slug : nestedCategory.slug;
    if (description !== undefined) nestedCategory.description = description;
    if (display !== undefined) nestedCategory.display = display;
    if (menu_order !== undefined) nestedCategory.menu_order = menu_order;
    nestedCategory.isActive = isActive !== undefined ? isActive : nestedCategory.isActive;

    const updatedNestedCategory = await nestedCategory.save();
    await updatedNestedCategory.populate("sub_cat_id", "sub_cat_name");
    res.json(formatNestedCategoryResponse(updatedNestedCategory));
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: "NestedSubCategory with this slug already exists" });
    }
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(val => val.message);
      return res.status(400).json({ message: "Validation Error", errors: messages });
    }
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

// @desc    Soft delete product nested sub category
// @route   DELETE /api/product-nested-sub-categories/:id
// @access  Private/Admin
const deleteProductNestedSubCategory = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid nested sub category ID format" });
    }

    const nestedCategory = await ProductNestedSubCategory.findById(id).populate("sub_cat_id", "sub_cat_name");
    if (!nestedCategory) {
      return res.status(404).json({ message: "NestedSubCategory not found" });
    }

    if (!nestedCategory.isActive) {
      return res.status(400).json({ message: "NestedSubCategory is already inactive" });
    }

    nestedCategory.isActive = false;
    await nestedCategory.save();

    res.json({ message: "NestedSubCategory deactivated successfully", nestedCategory: formatNestedCategoryResponse(nestedCategory) });
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

module.exports = {
  createProductNestedSubCategory,
  getProductNestedSubCategories,
  getProductNestedSubCategoryById,
  updateProductNestedSubCategory,
  deleteProductNestedSubCategory,
};
