const ProductImage = require("../models/ProductImage");
const Product = require("../models/Product");
const ProductVariant = require("../models/ProductVariant");
const mongoose = require("mongoose");

// @desc    Create a new product image
// @route   POST /api/products/:productId/images
// @access  Private/Admin
const createProductImage = async (req, res) => {
  try {
    const { productId } = req.params;
    const { variantId, url, altText, isPrimary, sortOrder } = req.body;

    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({ message: "Invalid product ID format" });
    }
    
    if (!url || typeof url !== 'string' || url.trim() === '') {
      return res.status(400).json({ message: "URL is required" });
    }
    
    // Check if valid URL string (basic check)
    try {
      new URL(url);
    } catch (_) {
      return res.status(400).json({ message: "Invalid URL format" });
    }

    if (sortOrder !== undefined && sortOrder < 0) {
      return res.status(400).json({ message: "Sort order cannot be negative" });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    if (variantId) {
      if (!mongoose.Types.ObjectId.isValid(variantId)) {
        return res.status(400).json({ message: "Invalid variant ID format" });
      }
      
      const variant = await ProductVariant.findById(variantId);
      if (!variant) {
        return res.status(404).json({ message: "Variant not found" });
      }
      
      if (variant.productId.toString() !== productId) {
        return res.status(400).json({ message: "Variant does not belong to this product" });
      }
    }

    const image = new ProductImage({
      productId,
      variantId: variantId || null,
      url,
      altText,
      sortOrder: sortOrder || 0,
      isPrimary: false, // We handle primary logic safely below if requested
    });

    await image.save();

    // If requested to be primary, apply the atomic scope swap logic
    if (isPrimary) {
      // Unset any existing primary in this scope
      const scopeQuery = { productId };
      if (variantId) {
        scopeQuery.variantId = variantId;
      } else {
        scopeQuery.variantId = null;
      }
      
      await ProductImage.updateMany(scopeQuery, { isPrimary: false });
      
      // Set this one to true
      image.isPrimary = true;
      await image.save();
    }

    res.status(201).json(image);
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

// @desc    Get all images for a product (includes product-level AND variant-level images)
// @route   GET /api/products/:productId/images
// @access  Public
const getProductImages = async (req, res) => {
  try {
    const { productId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({ message: "Invalid product ID format" });
    }

    // Only get images for this product, sorted by sortOrder then createdAt
    const images = await ProductImage.find({ productId })
      .sort({ sortOrder: 1, createdAt: 1 })
      .populate('variantId', '_id sku attributes'); // Populate basic variant info

    res.json(images);
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

// @desc    Get single product image
// @route   GET /api/product-images/:imageId
// @access  Public
const getProductImageById = async (req, res) => {
  try {
    const { imageId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(imageId)) {
      return res.status(400).json({ message: "Invalid image ID format" });
    }

    const image = await ProductImage.findById(imageId).populate('variantId', '_id sku attributes');
    if (!image) {
      return res.status(404).json({ message: "Image not found" });
    }

    res.json(image);
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

// @desc    Update product image
// @route   PUT /api/product-images/:imageId
// @access  Private/Admin
const updateProductImage = async (req, res) => {
  try {
    const { imageId } = req.params;
    const { url, altText, sortOrder } = req.body;

    if (!mongoose.Types.ObjectId.isValid(imageId)) {
      return res.status(400).json({ message: "Invalid image ID format" });
    }

    const image = await ProductImage.findById(imageId);
    if (!image) {
      return res.status(404).json({ message: "Image not found" });
    }

    if (url !== undefined) {
      if (!url || typeof url !== 'string' || url.trim() === '') {
        return res.status(400).json({ message: "URL cannot be empty" });
      }
      try {
        new URL(url);
      } catch (_) {
        return res.status(400).json({ message: "Invalid URL format" });
      }
      image.url = url;
    }

    if (altText !== undefined) image.altText = altText;
    
    if (sortOrder !== undefined) {
      if (sortOrder < 0) return res.status(400).json({ message: "Sort order cannot be negative" });
      image.sortOrder = sortOrder;
    }

    const updatedImage = await image.save();
    res.json(updatedImage);
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

// @desc    Delete product image
// @route   DELETE /api/product-images/:imageId
// @access  Private/Admin
const deleteProductImage = async (req, res) => {
  try {
    const { imageId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(imageId)) {
      return res.status(400).json({ message: "Invalid image ID format" });
    }

    const image = await ProductImage.findByIdAndDelete(imageId);
    if (!image) {
      return res.status(404).json({ message: "Image not found" });
    }

    res.json({ message: "Image permanently deleted", imageId });
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

// @desc    Set primary image
// @route   PATCH /api/product-images/:imageId/primary
// @access  Private/Admin
const setPrimaryImage = async (req, res) => {
  try {
    const { imageId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(imageId)) {
      return res.status(400).json({ message: "Invalid image ID format" });
    }

    const targetImage = await ProductImage.findById(imageId);
    if (!targetImage) {
      return res.status(404).json({ message: "Image not found" });
    }

    // Determine scope based on whether this image belongs to a variant or the product base
    const scopeQuery = { productId: targetImage.productId };
    if (targetImage.variantId) {
      scopeQuery.variantId = targetImage.variantId;
    } else {
      scopeQuery.variantId = null;
    }

    // Sequential application-level enforcement
    // 1. Unset any existing primary in this specific scope
    await ProductImage.updateMany(scopeQuery, { isPrimary: false });
    
    // 2. Set this exact image to true
    targetImage.isPrimary = true;
    await targetImage.save();

    res.json({ message: "Primary image updated successfully", image: targetImage });
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

module.exports = {
  createProductImage,
  getProductImages,
  getProductImageById,
  updateProductImage,
  deleteProductImage,
  setPrimaryImage,
};
