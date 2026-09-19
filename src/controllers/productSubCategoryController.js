const ProductCategory = require("../models/ProductCategory");
const ProductSubCategory = require("../models/ProductSubCategory");
const ProductNestedSubCategory = require("../models/ProductNestedSubCategory");
const mongoose = require("mongoose");

const formatSubCategoryResponse = (subCategory) => {
  const sCat = subCategory.toObject ? subCategory.toObject() : subCategory;

  let catId = sCat.cat_id;
  let catName = null;

  if (sCat.cat_id && typeof sCat.cat_id === 'object' && sCat.cat_id._id) {
    catId = sCat.cat_id._id;
    catName = sCat.cat_id.cat_name;
  }

  return {
    id: sCat._id.toString(),
    cat_id: catId.toString(),
    cat_name: catName,
    sub_cat_name: sCat.sub_cat_name,
    slug: sCat.slug,
    description: sCat.description || "",
    display: sCat.display || "default",
    menu_order: sCat.menu_order || 0,
    count: sCat.count || 0,
    isActive: sCat.isActive,
    createdAt: sCat.createdAt,
    updatedAt: sCat.updatedAt,
  };
};

// @desc    Create new product sub category
// @route   POST /api/product-sub-categories
// @access  Private/Admin
const createProductSubCategory = async (req, res) => {
  try {
    const { cat_id, sub_cat_name, slug, isActive , description, display, menu_order } = req.body;

    if (!cat_id || !sub_cat_name || !slug) {
      return res.status(400).json({ message: "cat_id, sub_cat_name, and slug are required" });
    }

    if (!mongoose.Types.ObjectId.isValid(cat_id)) {
      return res.status(400).json({ message: "Invalid cat_id format" });
    }

    const parentCat = await ProductCategory.findById(cat_id);
    if (!parentCat) {
      return res.status(404).json({ message: "Parent ProductCategory not found" });
    }

    const existingSubCategory = await ProductSubCategory.findOne({ slug });
    if (existingSubCategory) {
      return res.status(400).json({ message: "SubCategory with this slug already exists" });
    }

    const subCategory = new ProductSubCategory({
      cat_id,
      sub_cat_name,
      slug,
      description,
      display,
      menu_order,
      isActive: isActive !== undefined ? isActive : true,
    });

    const createdSubCategory = await subCategory.save();
    await createdSubCategory.populate("cat_id", "cat_name");
    res.status(201).json(formatSubCategoryResponse(createdSubCategory));
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: "SubCategory with this slug already exists" });
    }
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(val => val.message);
      return res.status(400).json({ message: "Validation Error", errors: messages });
    }
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

// @desc    Get all product sub categories
// @route   GET /api/product-sub-categories
// @access  Public
const getProductSubCategories = async (req, res) => {
  try {
    const isAdmin = req.admin || req.user?.role === 'admin';
    const { cat_id } = req.query;
    const query = {};

    if (!isAdmin) {
      query.isActive = true;
    }
    if (cat_id) {
      if (mongoose.Types.ObjectId.isValid(cat_id)) {
        query.cat_id = cat_id;
      } else {
        return res.status(400).json({ message: "Invalid cat_id format" });
      }
    }

    const subCategories = await ProductSubCategory.find(query).populate("cat_id", "cat_name").sort({ createdAt: -1 });
    const response = subCategories.map(sub => formatSubCategoryResponse(sub));
    res.json(response);
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

// @desc    Get single product sub category
// @route   GET /api/product-sub-categories/:id
// @access  Public
const getProductSubCategoryById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid sub category ID format" });
    }

    const subCategory = await ProductSubCategory.findById(id).populate("cat_id", "cat_name");

    if (!subCategory) {
      return res.status(404).json({ message: "SubCategory not found" });
    }

    const isAdmin = req.admin || req.user?.role === 'admin';
    if (!isAdmin && !subCategory.isActive) {
      return res.status(404).json({ message: "SubCategory not found" });
    }

    res.json(formatSubCategoryResponse(subCategory));
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

// @desc    Update product sub category
// @route   PUT /api/product-sub-categories/:id
// @access  Private/Admin
const updateProductSubCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { cat_id, sub_cat_name, slug, isActive , description, display, menu_order } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid sub category ID format" });
    }

    const subCategory = await ProductSubCategory.findById(id).populate("cat_id", "cat_name");
    if (!subCategory) {
      return res.status(404).json({ message: "SubCategory not found" });
    }

    if (slug && slug !== subCategory.slug) {
      const existingSubCategory = await ProductSubCategory.findOne({ slug });
      if (existingSubCategory) {
        return res.status(400).json({ message: "SubCategory with this slug already exists" });
      }
    }

    if (cat_id && cat_id !== subCategory.cat_id.toString()) {
      if (!mongoose.Types.ObjectId.isValid(cat_id)) {
        return res.status(400).json({ message: "Invalid cat_id format" });
      }
      const parentCat = await ProductCategory.findById(cat_id);
      if (!parentCat) {
        return res.status(404).json({ message: "Parent ProductCategory not found" });
      }
      
      // Update any child nested categories if the parent changes to maintain hierarchy validity?
      // Wait, changing the cat_id of a SubCategory implies all its NestedCategories must also change their cat_id.
      // Let's enforce that the NestedCategories' cat_id is updated automatically to prevent mismatches.
      await ProductNestedSubCategory.updateMany({ sub_cat_id: id }, { $set: { cat_id: cat_id } });
    }

    if (isActive === false && subCategory.isActive === true) {
      const activeChildren = await ProductNestedSubCategory.find({ sub_cat_id: id, isActive: true });
      if (activeChildren.length > 0) {
        return res.status(400).json({ 
          message: "Cannot deactivate sub-category with active nested sub-categories. Deactivate nested sub-categories first." 
        });
      }
    }

    subCategory.cat_id = cat_id !== undefined ? cat_id : subCategory.cat_id;
    subCategory.sub_cat_name = sub_cat_name !== undefined ? sub_cat_name : subCategory.sub_cat_name;
    subCategory.slug = slug !== undefined ? slug : subCategory.slug;
    subCategory.isActive = isActive !== undefined ? isActive : subCategory.isActive;

    const updatedSubCategory = await subCategory.save();
    await updatedSubCategory.populate("cat_id", "cat_name");
    res.json(formatSubCategoryResponse(updatedSubCategory));
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: "SubCategory with this slug already exists" });
    }
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(val => val.message);
      return res.status(400).json({ message: "Validation Error", errors: messages });
    }
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

// @desc    Soft delete product sub category
// @route   DELETE /api/product-sub-categories/:id
// @access  Private/Admin
const deleteProductSubCategory = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid sub category ID format" });
    }

    const subCategory = await ProductSubCategory.findById(id).populate("cat_id", "cat_name");
    if (!subCategory) {
      return res.status(404).json({ message: "SubCategory not found" });
    }

    if (!subCategory.isActive) {
      return res.status(400).json({ message: "SubCategory is already inactive" });
    }

    const activeChildren = await ProductNestedSubCategory.find({ sub_cat_id: id, isActive: true });
    if (activeChildren.length > 0) {
      return res.status(400).json({ 
        message: "Cannot deactivate sub-category with active nested sub-categories. Deactivate nested sub-categories first." 
      });
    }

    subCategory.isActive = false;
    await subCategory.save();

    res.json({ message: "SubCategory deactivated successfully", subCategory: formatSubCategoryResponse(subCategory) });
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

module.exports = {
  createProductSubCategory,
  getProductSubCategories,
  getProductSubCategoryById,
  updateProductSubCategory,
  deleteProductSubCategory,
};
