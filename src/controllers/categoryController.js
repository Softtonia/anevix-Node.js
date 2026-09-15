const Category = require("../models/Category");
const mongoose = require("mongoose");
// TODO: Import Product model once implemented
// const Product = require("../models/Product");

// @desc    Create new category
// @route   POST /api/categories
// @access  Private/Admin
const createCategory = async (req, res) => {
  try {
    const { name, slug, description, parentId, image, isActive, sortOrder } = req.body;

    if (!name || !slug) {
      return res.status(400).json({ message: "Name and slug are required" });
    }

    // Check for duplicate slug
    const existingCategory = await Category.findOne({ slug });
    if (existingCategory) {
      return res.status(400).json({ message: "Category with this slug already exists" });
    }

    // Validate parentId if provided
    if (parentId) {
      if (!mongoose.Types.ObjectId.isValid(parentId)) {
        return res.status(400).json({ message: "Invalid parentId format" });
      }
      const parent = await Category.findById(parentId);
      if (!parent) {
        return res.status(404).json({ message: "Parent category not found" });
      }
    }

    const category = new Category({
      name,
      slug,
      description,
      parentId: parentId || null,
      image,
      isActive: isActive !== undefined ? isActive : true,
      sortOrder: sortOrder || 0,
    });

    const createdCategory = await category.save();
    res.status(201).json(createdCategory);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: "Category with this slug already exists" });
    }
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

// @desc    Get all categories
// @route   GET /api/categories
// @access  Public
const getCategories = async (req, res) => {
  try {
    const isAdmin = req.admin || req.user?.role === 'admin'; // Based on adminAuth middleware adding req.admin
    const query = {};

    // If not admin, only show active categories
    if (!isAdmin) {
      query.isActive = true;
    }

    const categories = await Category.find(query).sort({ sortOrder: 1, createdAt: -1 });
    res.json(categories);
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

// @desc    Get single category
// @route   GET /api/categories/:id
// @access  Public
const getCategoryById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid category ID format" });
    }

    const category = await Category.findById(id);

    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }

    const isAdmin = req.admin;
    if (!isAdmin && !category.isActive) {
      return res.status(404).json({ message: "Category not found" }); // Hide inactive from public
    }

    res.json(category);
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

// @desc    Update category
// @route   PUT /api/categories/:id
// @access  Private/Admin
const updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, slug, description, parentId, image, isActive, sortOrder } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid category ID format" });
    }

    const category = await Category.findById(id);

    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }

    // Check duplicate slug if slug is changed
    if (slug && slug !== category.slug) {
      const existingCategory = await Category.findOne({ slug });
      if (existingCategory) {
        return res.status(400).json({ message: "Category with this slug already exists" });
      }
    }

    // Validate parentId if provided
    if (parentId && parentId !== category.parentId?.toString()) {
      if (!mongoose.Types.ObjectId.isValid(parentId)) {
        return res.status(400).json({ message: "Invalid parentId format" });
      }
      if (parentId === id) {
        return res.status(400).json({ message: "Category cannot be its own parent" });
      }
      const parent = await Category.findById(parentId);
      if (!parent) {
        return res.status(404).json({ message: "Parent category not found" });
      }
    }

    // If attempting to deactivate, check constraints
    if (isActive === false && category.isActive === true) {
      // 1. Check for active child categories
      const activeChildren = await Category.find({ parentId: id, isActive: true });
      if (activeChildren.length > 0) {
        return res.status(400).json({ 
          message: "Cannot deactivate category with active child categories. Deactivate children first." 
        });
      }

      // 2. Check for assigned products (Mocked for Phase 1)
      // const productsCount = await Product.countDocuments({ category: id, isActive: true });
      // if (productsCount > 0) {
      //   return res.status(400).json({ 
      //     message: "Cannot deactivate category with assigned active products." 
      //   });
      // }
    }

    category.name = name !== undefined ? name : category.name;
    category.slug = slug !== undefined ? slug : category.slug;
    category.description = description !== undefined ? description : category.description;
    category.parentId = parentId !== undefined ? parentId : category.parentId;
    category.image = image !== undefined ? image : category.image;
    category.isActive = isActive !== undefined ? isActive : category.isActive;
    category.sortOrder = sortOrder !== undefined ? sortOrder : category.sortOrder;

    const updatedCategory = await category.save();
    res.json(updatedCategory);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: "Category with this slug already exists" });
    }
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

// @desc    Soft delete category (deactivate)
// @route   DELETE /api/categories/:id
// @access  Private/Admin
const deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid category ID format" });
    }

    const category = await Category.findById(id);

    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }

    if (!category.isActive) {
      return res.status(400).json({ message: "Category is already inactive" });
    }

    // 1. Check for active child categories
    const activeChildren = await Category.find({ parentId: id, isActive: true });
    if (activeChildren.length > 0) {
      return res.status(400).json({ 
        message: "Cannot deactivate category with active child categories. Deactivate children first." 
      });
    }

    // 2. Check for assigned products (Mocked for Phase 1)
    // const productsCount = await Product.countDocuments({ category: id, isActive: true });
    // if (productsCount > 0) {
    //   return res.status(400).json({ 
    //     message: "Cannot deactivate category with assigned active products." 
    //   });
    // }

    category.isActive = false;
    await category.save();

    res.json({ message: "Category deactivated successfully", category });
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

module.exports = {
  createCategory,
  getCategories,
  getCategoryById,
  updateCategory,
  deleteCategory,
};
