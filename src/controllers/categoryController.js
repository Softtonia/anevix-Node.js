const Category = require("../models/Category");
const mongoose = require("mongoose");
const Product = require("../models/Product");

const formatCategoryResponse = (category, count = 0) => {
  const cat = category.toObject ? category.toObject() : category;
  return {
    id: cat._id.toString(),
    name: cat.name,
    slug: cat.slug,
    parent: cat.parentId ? cat.parentId.toString() : null,
    description: cat.description,
    display: cat.display,
    image: cat.image ? { src: cat.image } : null,
    menu_order: cat.sortOrder,
    count: count
  };
};

// @desc    Create new category
// @route   POST /api/categories
// @access  Private/Admin
const createCategory = async (req, res) => {
  try {
    const { name, slug, description, parentId, parent, image, isActive, sortOrder, menu_order, display } = req.body;
    const finalParentId = parent !== undefined ? parent : parentId;
    const finalSortOrder = menu_order !== undefined ? menu_order : sortOrder;

    if (!name || !slug) {
      return res.status(400).json({ message: "Name and slug are required" });
    }

    // Check for duplicate slug
    const existingCategory = await Category.findOne({ slug });
    if (existingCategory) {
      return res.status(400).json({ message: "Category with this slug already exists" });
    }

    // Validate parentId if provided
    if (finalParentId) {
      if (!mongoose.Types.ObjectId.isValid(finalParentId)) {
        return res.status(400).json({ message: "Invalid parent format" });
      }
      const parentDoc = await Category.findById(finalParentId);
      if (!parentDoc) {
        return res.status(404).json({ message: "Parent category not found" });
      }
    }

    const category = new Category({
      name,
      slug,
      description,
      parentId: finalParentId || null,
      image,
      display,
      isActive: isActive !== undefined ? isActive : true,
      sortOrder: finalSortOrder || 0,
    });

    const createdCategory = await category.save();
    res.status(201).json(formatCategoryResponse(createdCategory, 0));
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

    const productQuery = isAdmin ? {} : { status: "active", isActive: true };
    const counts = await Product.aggregate([
      { $match: productQuery },
      { $group: { _id: "$categoryId", count: { $sum: 1 } } }
    ]);
    const countMap = {};
    counts.forEach(c => { countMap[c._id?.toString()] = c.count; });

    const response = categories.map(cat => formatCategoryResponse(cat, countMap[cat._id.toString()] || 0));
    res.json(response);
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

    const productQuery = isAdmin ? { categoryId: category._id } : { categoryId: category._id, status: "active", isActive: true };
    const count = await Product.countDocuments(productQuery);

    res.json(formatCategoryResponse(category, count));
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
    const { name, slug, description, parentId, parent, image, isActive, sortOrder, menu_order, display } = req.body;
    const finalParentId = parent !== undefined ? parent : parentId;
    const finalSortOrder = menu_order !== undefined ? menu_order : sortOrder;

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
    if (finalParentId && finalParentId !== category.parentId?.toString()) {
      if (!mongoose.Types.ObjectId.isValid(finalParentId)) {
        return res.status(400).json({ message: "Invalid parent format" });
      }
      if (finalParentId === id) {
        return res.status(400).json({ message: "Category cannot be its own parent" });
      }
      const parentDoc = await Category.findById(finalParentId);
      if (!parentDoc) {
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
    category.parentId = finalParentId !== undefined ? finalParentId : category.parentId;
    category.display = display !== undefined ? display : category.display;
    category.image = image !== undefined ? image : category.image;
    category.isActive = isActive !== undefined ? isActive : category.isActive;
    category.sortOrder = finalSortOrder !== undefined ? finalSortOrder : category.sortOrder;

    const updatedCategory = await category.save();
    
    // Using simple countDocuments for single update response
    const count = await Product.countDocuments({ categoryId: updatedCategory._id });
    res.json(formatCategoryResponse(updatedCategory, count));
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
