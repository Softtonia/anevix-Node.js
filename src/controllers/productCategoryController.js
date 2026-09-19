const ProductCategory = require("../models/ProductCategory");
const ProductSubCategory = require("../models/ProductSubCategory");
const mongoose = require("mongoose");

const formatCategoryResponse = (category) => {
  const cat = category.toObject ? category.toObject() : category;
  return {
    id: cat._id.toString(),
    cat_name: cat.cat_name,
    slug: cat.slug,
    image: cat.image ? { src: cat.image } : null,
    description: cat.description || "",
    display: cat.display || "default",
    menu_order: cat.menu_order || 0,
    count: cat.count || 0,
    isActive: cat.isActive,
    createdAt: cat.createdAt,
    updatedAt: cat.updatedAt,
  };
};

// @desc    Create new product category
// @route   POST /api/product-categories
// @access  Private/Admin
const createProductCategory = async (req, res) => {
  try {
    const { cat_name, slug, image, isActive , description, display, menu_order } = req.body;

    if (!cat_name || !slug) {
      return res.status(400).json({ message: "cat_name and slug are required" });
    }

    const existingCategory = await ProductCategory.findOne({ slug });
    if (existingCategory) {
      return res.status(400).json({ message: "Category with this slug already exists" });
    }

    const category = new ProductCategory({
      cat_name,
      slug,
      description,
      display,
      menu_order,
      image,
      isActive: isActive !== undefined ? isActive : true,
    });

    const createdCategory = await category.save();
    res.status(201).json(formatCategoryResponse(createdCategory));
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: "Category with this slug already exists" });
    }
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(val => val.message);
      return res.status(400).json({ message: "Validation Error", errors: messages });
    }
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

// @desc    Get all product categories
// @route   GET /api/product-categories
// @access  Public
const getProductCategories = async (req, res) => {
  try {
    const isAdmin = req.admin || req.user?.role === 'admin';
    const query = {};

    if (!isAdmin) {
      query.isActive = true;
    }

    const categories = await ProductCategory.find(query).sort({ createdAt: -1 });
    const response = categories.map(cat => formatCategoryResponse(cat));
    res.json(response);
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

// @desc    Get single product category
// @route   GET /api/product-categories/:id
// @access  Public
const getProductCategoryById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid category ID format" });
    }

    const category = await ProductCategory.findById(id);

    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }

    const isAdmin = req.admin || req.user?.role === 'admin';
    if (!isAdmin && !category.isActive) {
      return res.status(404).json({ message: "Category not found" });
    }

    res.json(formatCategoryResponse(category));
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

// @desc    Update product category
// @route   PUT /api/product-categories/:id
// @access  Private/Admin
const updateProductCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { cat_name, slug, image, isActive , description, display, menu_order } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid category ID format" });
    }

    const category = await ProductCategory.findById(id);
    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }

    if (slug && slug !== category.slug) {
      const existingCategory = await ProductCategory.findOne({ slug });
      if (existingCategory) {
        return res.status(400).json({ message: "Category with this slug already exists" });
      }
    }

    // Check children before deactivation
    if (isActive === false && category.isActive === true) {
      const activeChildren = await ProductSubCategory.find({ cat_id: id, isActive: true });
      if (activeChildren.length > 0) {
        return res.status(400).json({ 
          message: "Cannot deactivate category with active sub-categories. Deactivate sub-categories first." 
        });
      }
    }

    category.cat_name = cat_name !== undefined ? cat_name : category.cat_name;
    category.slug = slug !== undefined ? slug : category.slug;
    category.image = image !== undefined ? image : category.image;
    category.isActive = isActive !== undefined ? isActive : category.isActive;

    const updatedCategory = await category.save();
    res.json(formatCategoryResponse(updatedCategory));
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: "Category with this slug already exists" });
    }
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(val => val.message);
      return res.status(400).json({ message: "Validation Error", errors: messages });
    }
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

// @desc    Soft delete product category
// @route   DELETE /api/product-categories/:id
// @access  Private/Admin
const deleteProductCategory = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid category ID format" });
    }

    const category = await ProductCategory.findById(id);
    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }

    if (!category.isActive) {
      return res.status(400).json({ message: "Category is already inactive" });
    }

    const activeChildren = await ProductSubCategory.find({ cat_id: id, isActive: true });
    if (activeChildren.length > 0) {
      return res.status(400).json({ 
        message: "Cannot deactivate category with active sub-categories. Deactivate sub-categories first." 
      });
    }

    category.isActive = false;
    await category.save();

    res.json({ message: "Category deactivated successfully", category: formatCategoryResponse(category) });
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

module.exports = {
  createProductCategory,
  getProductCategories,
  getProductCategoryById,
  updateProductCategory,
  deleteProductCategory,
};
