const Brand = require("../models/Brand");
const mongoose = require("mongoose");
const Product = require("../models/Product");

// Helper to format the Brand response
const formatBrandResponse = async (brand) => {
  const b = brand.toObject ? brand.toObject() : brand;
  
  // Calculate count of products referencing this brand
  const count = await Product.countDocuments({ brandId: b._id });

  let imageObj = null;
  if (b.image && (b.image.src || b.image.id)) {
    imageObj = {
      id: b.image.id || null,
      src: b.image.src || null,
      alt: b.image.alt || b.name,
    };
  }

  return {
    id: b._id.toString(),
    name: b.name,
    slug: b.slug,
    description: b.description || "",
    image: imageObj,
    logo: b.logo || null, // Legacy support
    parent: b.parent ? b.parent.toString() : null,
    menu_order: b.sortOrder || 0,
    count: count,
    status: b.isActive ? "active" : "inactive",
    createdAt: b.createdAt,
    updatedAt: b.updatedAt,
  };
};

// @desc    Create new brand
// @route   POST /api/brands
// @access  Private/Admin
const createBrand = async (req, res) => {
  try {
    const { name, slug, description, image, logo, parent, isActive, menu_order, sortOrder } = req.body;

    if (!name || !slug) {
      return res.status(400).json({ message: "Name and slug are required" });
    }

    if (parent && !mongoose.Types.ObjectId.isValid(parent)) {
      return res.status(400).json({ message: "Invalid parent ID format" });
    }

    const existingBrand = await Brand.findOne({ slug });
    if (existingBrand) {
      return res.status(400).json({ message: "Brand with this slug already exists" });
    }

    const brand = new Brand({
      name,
      slug,
      description,
      image,
      logo,
      parent: parent || null,
      isActive: isActive !== undefined ? isActive : true,
      sortOrder: menu_order !== undefined ? menu_order : (sortOrder || 0),
    });

    const createdBrand = await brand.save();
    res.status(201).json(await formatBrandResponse(createdBrand));
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: "Brand with this slug already exists" });
    }
    res.status(400).json({ message: error.message || "Server Error", error: error.message });
  }
};

// @desc    Get all brands
// @route   GET /api/brands
// @access  Public
const getBrands = async (req, res) => {
  try {
    const isAdmin = req.admin || req.user?.role === 'admin';
    const query = {};

    if (!isAdmin) {
      query.isActive = true;
    }

    const brands = await Brand.find(query).sort({ sortOrder: 1, createdAt: -1 });
    const formattedBrands = await Promise.all(brands.map(b => formatBrandResponse(b)));
    res.json(formattedBrands);
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
      return res.status(404).json({ message: "Brand not found" });
    }

    res.json(await formatBrandResponse(brand));
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
    const { name, slug, description, image, logo, parent, isActive, menu_order, sortOrder } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid brand ID format" });
    }

    const brand = await Brand.findById(id);

    if (!brand) {
      return res.status(404).json({ message: "Brand not found" });
    }

    if (slug && slug !== brand.slug) {
      const existingBrand = await Brand.findOne({ slug });
      if (existingBrand) {
        return res.status(400).json({ message: "Brand with this slug already exists" });
      }
    }

    if (parent !== undefined) {
      if (parent && !mongoose.Types.ObjectId.isValid(parent)) {
        return res.status(400).json({ message: "Invalid parent ID format" });
      }
      brand.parent = parent || null;
    }

    brand.name = name !== undefined ? name : brand.name;
    brand.slug = slug !== undefined ? slug : brand.slug;
    brand.description = description !== undefined ? description : brand.description;
    if (image !== undefined) brand.image = image;
    if (logo !== undefined) brand.logo = logo;
    brand.isActive = isActive !== undefined ? isActive : brand.isActive;
    brand.sortOrder = menu_order !== undefined ? menu_order : (sortOrder !== undefined ? sortOrder : brand.sortOrder);

    const updatedBrand = await brand.save();
    res.json(await formatBrandResponse(updatedBrand));
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: "Brand with this slug already exists" });
    }
    res.status(400).json({ message: error.message || "Server Error", error: error.message });
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

    res.json({ message: "Brand deactivated successfully", brand: await formatBrandResponse(brand) });
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

// @desc    Get products by brand
// @route   GET /api/brands/:id/products
// @access  Public
const getProductsByBrand = async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid brand ID format" });
    }

    const brand = await Brand.findById(id);
    if (!brand || (!brand.isActive && !req.admin)) {
      return res.status(404).json({ message: "Brand not found" });
    }

    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const startIndex = (page - 1) * limit;

    const query = { brandId: id };
    if (!req.admin) {
      query.status = "active";
      query.isActive = true;
    }

    const total = await Product.countDocuments(query);
    const products = await Product.find(query).skip(startIndex).limit(limit).lean();

    let formattedProducts = products;
    try {
      const { formatProductResponse } = require("./productController");
      if (formatProductResponse) {
        const ProductImage = require("../models/ProductImage");
        const productIds = products.map(p => p._id);
        const allImages = await ProductImage.find({ productId: { $in: productIds }, variantId: null }).lean();
        
        formattedProducts = await Promise.all(products.map(async p => {
          const pImgs = allImages.filter(img => img.productId.toString() === p._id.toString());
          return await formatProductResponse(p, pImgs);
        }));
      }
    } catch(e) {
      console.error(e);
      // Fallback to raw products if formatter fails
    }

    res.json({
      success: true,
      count: products.length,
      total,
      page,
      pages: Math.ceil(total / limit),
      data: formattedProducts
    });
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
  getProductsByBrand,
  formatBrandResponse
};
