const Brand = require("../models/Brand");
const mongoose = require("mongoose");

// @desc    Create new brand
// @route   POST /api/brands
// @access  Private/Admin
const createBrand = async (req, res) => {
  try {
    const { name, slug, description, logo, isActive, sortOrder } = req.body;

    if (!name || !slug) {
      return res.status(400).json({ message: "Name and slug are required" });
    }

    // Check for duplicate slug manually (in addition to DB index)
    const existingBrand = await Brand.findOne({ slug });
    if (existingBrand) {
      return res.status(400).json({ message: "Brand with this slug already exists" });
    }

    const brand = new Brand({
      name,
      slug,
      description,
      logo,
      isActive: isActive !== undefined ? isActive : true,
      sortOrder: sortOrder || 0,
    });

    const createdBrand = await brand.save();
    res.status(201).json(createdBrand);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: "Brand with this slug already exists" });
    }
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

// @desc    Get all brands
// @route   GET /api/brands
// @access  Public
const getBrands = async (req, res) => {
  try {
    const isAdmin = req.admin || req.user?.role === 'admin';
    const query = {};

    // If not admin, only show active brands
    if (!isAdmin) {
      query.isActive = true;
    }

    const brands = await Brand.find(query).sort({ sortOrder: 1, createdAt: -1 });
    res.json(brands);
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

// @desc    Get single brand
// @route   GET /api/brands/:id
// @access  Public
const getBrandById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid brand ID format" });
    }

    const brand = await Brand.findById(id);

    if (!brand) {
      return res.status(404).json({ message: "Brand not found" });
    }

    const isAdmin = req.admin;
    if (!isAdmin && !brand.isActive) {
      return res.status(404).json({ message: "Brand not found" }); // Hide inactive from public
    }

    res.json(brand);
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

// @desc    Update brand
// @route   PUT /api/brands/:id
// @access  Private/Admin
const updateBrand = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, slug, description, logo, isActive, sortOrder } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid brand ID format" });
    }

    const brand = await Brand.findById(id);

    if (!brand) {
      return res.status(404).json({ message: "Brand not found" });
    }

    // Check duplicate slug if slug is changed
    if (slug && slug !== brand.slug) {
      const existingBrand = await Brand.findOne({ slug });
      if (existingBrand) {
        return res.status(400).json({ message: "Brand with this slug already exists" });
      }
    }

    brand.name = name !== undefined ? name : brand.name;
    brand.slug = slug !== undefined ? slug : brand.slug;
    brand.description = description !== undefined ? description : brand.description;
    brand.logo = logo !== undefined ? logo : brand.logo;
    brand.isActive = isActive !== undefined ? isActive : brand.isActive;
    brand.sortOrder = sortOrder !== undefined ? sortOrder : brand.sortOrder;

    const updatedBrand = await brand.save();
    res.json(updatedBrand);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: "Brand with this slug already exists" });
    }
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

// @desc    Soft delete brand (deactivate)
// @route   DELETE /api/brands/:id
// @access  Private/Admin
const deleteBrand = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid brand ID format" });
    }

    const brand = await Brand.findById(id);

    if (!brand) {
      return res.status(404).json({ message: "Brand not found" });
    }

    if (!brand.isActive) {
      return res.status(400).json({ message: "Brand is already inactive" });
    }

    brand.isActive = false;
    await brand.save();

    res.json({ message: "Brand deactivated successfully", brand });
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

module.exports = {
  createBrand,
  getBrands,
  getBrandById,
  updateBrand,
  deleteBrand,
};
