const ProductVariant = require("../models/ProductVariant");
const Product = require("../models/Product");
const mongoose = require("mongoose");

// Helper: validate variant attributes against parent product
const validateVariantAttributes = (variantAttributes, parentProduct) => {
  if (!parentProduct.attributes || parentProduct.attributes.length === 0) {
    return "Parent product has no attributes defined.";
  }

  const parentAttrMap = new Map();
  parentProduct.attributes.forEach((attr) => {
    parentAttrMap.set(attr.name.toLowerCase(), attr.options.map((opt) => opt.toLowerCase()));
  });

  const providedAttrMap = new Map();
  for (const vAttr of variantAttributes) {
    if (!vAttr.name || !vAttr.value) {
      return "Variant attribute name and value are required.";
    }
    providedAttrMap.set(vAttr.name.toLowerCase(), vAttr.value.toLowerCase());
  }

  // 1. Check if all parent attributes are provided
  for (const [pName, pOptions] of parentAttrMap.entries()) {
    if (!providedAttrMap.has(pName)) {
      return `Missing attribute: ${pName} is required for this product.`;
    }
    const providedVal = providedAttrMap.get(pName);
    if (!pOptions.includes(providedVal)) {
      return `Invalid option '${providedVal}' for attribute '${pName}'. Available options: ${pOptions.join(", ")}.`;
    }
  }

  // 2. Check if variant provided any extra attributes not on parent
  for (const vName of providedAttrMap.keys()) {
    if (!parentAttrMap.has(vName)) {
      return `Invalid attribute: ${vName} is not defined on the parent product.`;
    }
  }

  return null; // Valid
};

// @desc    Create new product variant
// @route   POST /api/products/:productId/variants
// @access  Private/Admin
const createVariant = async (req, res) => {
  try {
    const { productId } = req.params;
    const { sku, attributes, price, salePrice, thumbnail, status, isActive } = req.body;

    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({ message: "Invalid product ID format" });
    }

    if (!sku || !attributes || price === undefined) {
      return res.status(400).json({ message: "sku, attributes, and price are required" });
    }

    if (price < 0) {
      return res.status(400).json({ message: "Price cannot be negative" });
    }
    if (salePrice !== undefined && salePrice !== null) {
      if (salePrice < 0) return res.status(400).json({ message: "Sale price cannot be negative" });
      if (salePrice >= price) return res.status(400).json({ message: "Sale price must be strictly less than price" });
    }

    const parentProduct = await Product.findById(productId);
    if (!parentProduct) {
      return res.status(404).json({ message: "Parent product not found" });
    }

    if (parentProduct.productType !== "variable") {
      return res.status(400).json({ message: "Cannot add variants to a non-variable product" });
    }

    const attrError = validateVariantAttributes(attributes, parentProduct);
    if (attrError) {
      return res.status(400).json({ message: attrError });
    }

    // Check SKU collision with base Products
    const existingProductSku = await Product.findOne({ sku });
    if (existingProductSku) {
      return res.status(400).json({ message: "This SKU is already used by a base product" });
    }

    // Check duplicate attribute combination for this product
    // We normalize the incoming attributes to sort them and compare reliably, or just use $all or build a specific query
    const existingVariants = await ProductVariant.find({ productId });
    for (const ev of existingVariants) {
      // Check if attributes match exactly
      if (ev.attributes.length === attributes.length) {
        let isMatch = true;
        for (const attr of attributes) {
          const matched = ev.attributes.some(
            (ea) => ea.name.toLowerCase() === attr.name.toLowerCase() && ea.value.toLowerCase() === attr.value.toLowerCase()
          );
          if (!matched) {
            isMatch = false;
            break;
          }
        }
        if (isMatch) {
          return res.status(400).json({ message: "A variant with this exact attribute combination already exists" });
        }
      }
    }

    const variant = new ProductVariant({
      productId,
      sku,
      attributes,
      price,
      salePrice,
      thumbnail,
      status: status || "draft",
      isActive: isActive !== undefined ? isActive : true,
    });

    const createdVariant = await variant.save();
    res.status(201).json(createdVariant);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: "A variant with this SKU already exists" });
    }
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

// @desc    Get all variants for a product
// @route   GET /api/products/:productId/variants
// @access  Public
const getVariants = async (req, res) => {
  try {
    const { productId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({ message: "Invalid product ID format" });
    }

    const isAdmin = req.admin || req.user?.role === "admin";
    const query = { productId };

    if (!isAdmin) {
      query.status = "active";
      query.isActive = true;
    }

    const variants = await ProductVariant.find(query).sort({ createdAt: -1 });
    res.json(variants);
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

// @desc    Update a variant
// @route   PUT /api/variants/:variantId
// @access  Private/Admin
const updateVariant = async (req, res) => {
  try {
    const { variantId } = req.params;
    const { sku, attributes, price, salePrice, thumbnail, status, isActive } = req.body;

    if (!mongoose.Types.ObjectId.isValid(variantId)) {
      return res.status(400).json({ message: "Invalid variant ID format" });
    }

    const variant = await ProductVariant.findById(variantId);
    if (!variant) {
      return res.status(404).json({ message: "Variant not found" });
    }

    const parentProduct = await Product.findById(variant.productId);
    if (!parentProduct) {
      return res.status(404).json({ message: "Parent product not found" });
    }

    if (attributes) {
      const attrError = validateVariantAttributes(attributes, parentProduct);
      if (attrError) {
        return res.status(400).json({ message: attrError });
      }

      // Check duplicate combination
      const existingVariants = await ProductVariant.find({ productId: variant.productId, _id: { $ne: variant._id } });
      for (const ev of existingVariants) {
        if (ev.attributes.length === attributes.length) {
          let isMatch = true;
          for (const attr of attributes) {
            const matched = ev.attributes.some(
              (ea) => ea.name.toLowerCase() === attr.name.toLowerCase() && ea.value.toLowerCase() === attr.value.toLowerCase()
            );
            if (!matched) {
              isMatch = false;
              break;
            }
          }
          if (isMatch) {
            return res.status(400).json({ message: "Another variant with this exact attribute combination already exists" });
          }
        }
      }
      variant.attributes = attributes;
    }

    if (sku && sku !== variant.sku) {
      const existingProductSku = await Product.findOne({ sku });
      if (existingProductSku) {
        return res.status(400).json({ message: "This SKU is already used by a base product" });
      }
      variant.sku = sku;
    }

    const checkPrice = price !== undefined ? price : variant.price;
    const checkSalePrice = salePrice !== undefined ? salePrice : variant.salePrice;

    if (checkPrice < 0) return res.status(400).json({ message: "Price cannot be negative" });
    if (checkSalePrice !== undefined && checkSalePrice !== null) {
      if (checkSalePrice < 0) return res.status(400).json({ message: "Sale price cannot be negative" });
      if (checkSalePrice >= checkPrice) return res.status(400).json({ message: "Sale price must be strictly less than price" });
    }

    variant.price = checkPrice;
    variant.salePrice = checkSalePrice;

    if (thumbnail !== undefined) variant.thumbnail = thumbnail;
    if (status !== undefined) variant.status = status;
    if (isActive !== undefined) variant.isActive = isActive;

    const updatedVariant = await variant.save();
    res.json(updatedVariant);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: "A variant with this SKU already exists" });
    }
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

// @desc    Archive (soft delete) a variant
// @route   DELETE /api/variants/:variantId
// @access  Private/Admin
const deleteVariant = async (req, res) => {
  try {
    const { variantId } = req.params;
    const { hard } = req.query;

    if (!mongoose.Types.ObjectId.isValid(variantId)) {
      return res.status(400).json({ message: "Invalid variant ID format" });
    }

    if (hard === "true") {
      const deletedVariant = await ProductVariant.findByIdAndDelete(variantId);
      if (!deletedVariant) {
        return res.status(404).json({ message: "Variant not found" });
      }
      return res.json({ message: "Variant permanently deleted from database" });
    }

    const variant = await ProductVariant.findById(variantId);
    if (!variant) {
      return res.status(404).json({ message: "Variant not found" });
    }

    if (variant.status === "archived" || variant.isActive === false) {
      return res.status(400).json({ message: "Variant is already archived" });
    }

    variant.status = "archived";
    variant.isActive = false;
    await variant.save();

    res.json({ message: "Variant archived successfully", variant });
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

module.exports = {
  createVariant,
  getVariants,
  updateVariant,
  deleteVariant,
};
