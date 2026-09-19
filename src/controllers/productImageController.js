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
    
    let imageUrl = url;
    if (req.file) {
      const protocol = req.protocol;
      const host = req.get('host');
      imageUrl = `${protocol}://${host}/uploads/${req.file.filename}`;
    }

    if (!imageUrl || typeof imageUrl !== 'string' || imageUrl.trim() === '') {
      return res.status(400).json({ message: "URL or image file is required" });
    }
    
    // Check if valid URL string (basic check)
    try {
      new URL(imageUrl);
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

    const parsedSortOrder = sortOrder !== undefined ? parseInt(sortOrder, 10) : 0;
    const parsedIsPrimary = isPrimary === true || isPrimary === 'true';

    // Derive sellerId if uploader is a seller
    let sellerId = null;
    const B2CSellerProfile = require("../models/B2CSellerProfile");
    if (req.user?.id) {
      const sellerProfile = await B2CSellerProfile.findOne({ userId: req.user.id });
      if (sellerProfile) sellerId = sellerProfile._id;
    }

    const image = new ProductImage({
      productId,
      variantId: variantId || null,
      sellerId: sellerId || product.sellerId || null,
      url: imageUrl,
      altText,
      sortOrder: isNaN(parsedSortOrder) ? 0 : parsedSortOrder,
      isPrimary: false, // We handle primary logic safely below if requested
      status: "active", // Explicitly server-controlled: client cannot inject status
    });

    await image.save();

    // If requested to be primary, apply the atomic scope swap logic
    if (parsedIsPrimary) {
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

    // Only get active images for this product, sorted by sortOrder then createdAt
    const images = await ProductImage.find({ productId, status: "active" })
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

    let imageUrl = url;
    if (req.file) {
      const protocol = req.protocol;
      const host = req.get('host');
      imageUrl = `${protocol}://${host}/uploads/${req.file.filename}`;
    }

    if (imageUrl !== undefined) {
      if (!imageUrl || typeof imageUrl !== 'string' || imageUrl.trim() === '') {
        return res.status(400).json({ message: "URL cannot be empty" });
      }
      try {
        new URL(imageUrl);
      } catch (_) {
        return res.status(400).json({ message: "Invalid URL format" });
      }
      image.url = imageUrl;
    }

    if (altText !== undefined) image.altText = altText;
    
    if (sortOrder !== undefined) {
      const parsedSortOrder = parseInt(sortOrder, 10);
      if (parsedSortOrder < 0 || isNaN(parsedSortOrder)) return res.status(400).json({ message: "Sort order cannot be negative or invalid" });
      image.sortOrder = parsedSortOrder;
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

    // Try to safely clean up the physical file
    try {
      if (image.url && image.url.includes('/uploads/')) {
        const fsPromises = require('fs').promises;
        const path = require('path');
        const filename = image.url.split('/uploads/').pop();
        if (filename && !filename.includes('/') && !filename.includes('..')) {
          const filePath = path.join(process.cwd(), 'uploads', filename);
          await fsPromises.unlink(filePath).catch(e => {
            // Ignore ENOENT (file already deleted)
            if (e.code !== 'ENOENT') console.error('Failed to delete physical file:', e);
          });
        }
      }
    } catch (cleanupError) {
      console.error('File cleanup error during deletion:', cleanupError);
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


// @desc    Bulk upload product images
// @route   POST /api/products/images/bulk
// @access  Private/Admin
const bulkCreateProductImages = async (req, res) => {
  const fsPromises = require('fs').promises;
  const path = require('path');

  // Helper to safely delete a file
  const safelyDeleteFile = async (filePath) => {
    if (!filePath) return;
    try {
      await fsPromises.unlink(filePath);
    } catch (e) {
      if (e.code !== 'ENOENT') console.error('Failed to cleanup file:', e);
    }
  };

  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: "No image files uploaded" });
    }

    let items = [];
    if (req.body.items) {
      try {
        items = typeof req.body.items === 'string' ? JSON.parse(req.body.items) : req.body.items;
      } catch (e) {
        // Cleanup all uploaded files on bad request
        for (const file of req.files) await safelyDeleteFile(file.path);
        return res.status(400).json({ message: "Invalid JSON in items field" });
      }
    }

    // If items is not provided or empty, create default empty item metadata for each file
    if (!Array.isArray(items) || items.length === 0) {
      items = req.files.map(() => ({}));
    } else if (items.length !== req.files.length) {
      for (const file of req.files) await safelyDeleteFile(file.path);
      return res.status(400).json({ message: "When provided, the number of items metadata must match the number of uploaded files exactly" });
    }

    const summary = { total: req.files.length, successful: 0, failed: 0 };
    const results = [];

    // Protocol and host to build URL
    const protocol = req.protocol;
    const host = req.get('host');

    // Group items by SKU to check for duplicate primary images in the same batch
    const primaryCountPerSku = {};
    for (let i = 0; i < items.length; i++) {
      const item = items[i] || {};
      if (!item.sku) continue;
      if (item.isPrimary === true || item.isPrimary === 'true') {
        primaryCountPerSku[item.sku] = (primaryCountPerSku[item.sku] || 0) + 1;
      }
    }

    const B2CSellerProfile = require("../models/B2CSellerProfile");
    let authenticatedSellerId = null;
    if (req.user?.id) {
      const sellerProfile = await B2CSellerProfile.findOne({ userId: req.user.id });
      if (sellerProfile) authenticatedSellerId = sellerProfile._id;
    }

    for (let i = 0; i < req.files.length; i++) {
      const file = req.files[i];
      const item = items[i] || {};
      const sku = item.sku || null;

      // Reject if ambiguous primary images
      if (sku && primaryCountPerSku[sku] > 1 && (item.isPrimary === true || item.isPrimary === 'true')) {
        await safelyDeleteFile(file.path);
        results.push({ sku, success: false, error: "Ambiguous mapping: multiple images marked as primary for the same SKU in this batch" });
        summary.failed++;
        continue;
      }

      let imageRecord = null;
      try {
        const product = sku ? await Product.findOne({ sku }) : null;

        const isPrimary = item.isPrimary === true || item.isPrimary === 'true';
        const sortOrder = item.sortOrder !== undefined ? parseInt(item.sortOrder, 10) : 0;
        const altText = item.altText || null;
        const imageUrl = `${protocol}://${host}/uploads/${file.filename}`;

        // Derive sellerId from authenticated seller or product's sellerId
        const finalSellerId = authenticatedSellerId || product?.sellerId || null;

        // 1. Initial creation: status MUST be "temporary"
        imageRecord = new ProductImage({
          productId: product ? product._id : null,
          variantId: null,
          sellerId: finalSellerId,
          sku,
          fileName: file.filename,
          url: imageUrl,
          altText,
          sortOrder: isNaN(sortOrder) ? 0 : sortOrder,
          isPrimary: false,
          status: "temporary"
        });

        await imageRecord.save();

        // 2. Processing & verification step
        // Verify file exists on disk and final URL is valid
        await fsPromises.access(file.path);

        // 3. Successful processing confirmation: transition status to "active"
        imageRecord.status = "active";
        await imageRecord.save();

        if (isPrimary && product) {
          await ProductImage.updateMany({ productId: product._id, variantId: null }, { isPrimary: false });
          imageRecord.isPrimary = true;
          await imageRecord.save();
        }

        results.push({
          sku,
          fileName: file.filename,
          productId: product ? product._id : null,
          imageId: imageRecord._id,
          _id: imageRecord._id,
          url: imageUrl,
          status: "active",
          success: true
        });
        summary.successful++;

      } catch (err) {
        // Upload / processing failure: do NOT leave as active or leave lingering failed files
        await safelyDeleteFile(file.path);
        if (imageRecord && imageRecord._id) {
          try {
            await ProductImage.findByIdAndDelete(imageRecord._id);
          } catch (_) {}
        }
        results.push({ sku, fileName: file ? file.filename : null, success: false, status: "failed", error: err.message });
        summary.failed++;
      }
    }

    res.status(201).json({ success: true, summary, results });

  } catch (error) {
    // Top level catch: attempt to cleanup any remaining files if possible
    if (req.files && Array.isArray(req.files)) {
      for (const file of req.files) {
        try { await fsPromises.unlink(file.path); } catch(e){}
      }
    }
    res.status(500).json({ message: "Server Error during bulk upload", error: error.message });
  }
};

// @desc    Bulk link pre-uploaded images to a product via JSON
// @route   POST /api/products/:productId/images/bulk-link
// @access  Private/Admin
const bulkLinkProductImages = async (req, res) => {
  const session = await mongoose.startSession();
  try {
    session.startTransaction();
    const { productId } = req.params;
    const { images } = req.body;

    if (!mongoose.Types.ObjectId.isValid(productId)) {
      throw new Error("Invalid product ID format");
    }

    if (!images || !Array.isArray(images) || images.length === 0) {
      throw new Error("An array of images is required");
    }

    const product = await Product.findById(productId).session(session);
    if (!product) {
      throw new Error("Product not found");
    }

    const results = [];
    for (let i = 0; i < images.length; i++) {
      const item = images[i];
      const imgData = typeof item === 'string' ? { url: item } : (item || {});
      if (!imgData.url || typeof imgData.url !== 'string') {
        throw new Error(`URL is required for image at index ${i}`);
      }

      const parsedSortOrder = imgData.sortOrder !== undefined ? parseInt(imgData.sortOrder, 10) : i;
      const isPrimary = imgData.isPrimary === true || imgData.isPrimary === 'true';

      const image = new ProductImage({
        productId,
        variantId: imgData.variantId || null,
        url: imgData.url,
        altText: imgData.altText || null,
        sortOrder: isNaN(parsedSortOrder) ? 0 : parsedSortOrder,
        isPrimary: false,
        status: "active"
      });

      await image.save({ session });

      if (isPrimary) {
        const scopeQuery = { productId };
        if (imgData.variantId) scopeQuery.variantId = imgData.variantId;
        else scopeQuery.variantId = null;
        
        await ProductImage.updateMany(scopeQuery, { isPrimary: false }, { session });
        image.isPrimary = true;
        await image.save({ session });
      }
      
      results.push(image);
    }

    await session.commitTransaction();
    session.endSession();

    res.status(201).json({ success: true, count: results.length, images: results });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    res.status(400).json({ message: error.message || "Failed to bulk link images" });
  }
};

module.exports = {
  createProductImage,
  getProductImages,
  getProductImageById,
  updateProductImage,
  deleteProductImage,
  setPrimaryImage,
  bulkCreateProductImages,
  bulkLinkProductImages,
};
