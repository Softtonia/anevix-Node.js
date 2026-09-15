const Product = require("../models/Product");
const mongoose = require("mongoose");
const Category = require("../models/Category");
const Brand = require("../models/Brand");
const B2CSellerProfile = require("../models/B2CSellerProfile");

const validateAttributes = (attributes, productType) => {
  if (productType === "variable") {
    if (!attributes || !Array.isArray(attributes) || attributes.length === 0) {
      return "Variable products must have at least one attribute.";
    }
  }

  if (attributes && Array.isArray(attributes) && attributes.length > 0) {
    const names = new Set();
    for (const attr of attributes) {
      if (!attr.name || typeof attr.name !== 'string' || attr.name.trim() === "") {
        return "Attribute name is required.";
      }
      const lowerName = attr.name.trim().toLowerCase();
      if (names.has(lowerName)) {
        return `Duplicate attribute name: ${attr.name}`;
      }
      names.add(lowerName);

      if (!attr.options || !Array.isArray(attr.options) || attr.options.length === 0) {
        return `Attribute ${attr.name} must have at least one option.`;
      }

      const optionsSet = new Set();
      for (const opt of attr.options) {
        if (!opt || typeof opt !== 'string' || opt.trim() === "") {
          return `Options for attribute ${attr.name} cannot be empty.`;
        }
        const lowerOpt = opt.trim().toLowerCase();
        if (optionsSet.has(lowerOpt)) {
          return `Duplicate option '${opt}' in attribute ${attr.name}.`;
        }
        optionsSet.add(lowerOpt);
      }
    }
  }
  return null;
};

// @desc    Create new product
// @route   POST /api/products
// @access  Private/Admin
const createProduct = async (req, res) => {
  try {
    const {
      name, slug, description, shortDescription,
      sellerId, categoryId, brandId, sku,
      price, salePrice, currency,
      thumbnail, tags, attributes,
      productType, virtual, downloadable,
      status, isActive, isFeatured, metaTitle, metaDescription,
      externalUrl, buttonText
    } = req.body;

    if (!name || !slug || !sellerId || !categoryId || !sku || price === undefined) {
      return res.status(400).json({ message: "Name, slug, sellerId, categoryId, sku, and price are required" });
    }

    if (price < 0) {
      return res.status(400).json({ message: "Price cannot be negative" });
    }
    if (salePrice !== undefined && salePrice !== null) {
      if (salePrice < 0) {
        return res.status(400).json({ message: "Sale price cannot be negative" });
      }
      if (salePrice >= price) {
        return res.status(400).json({ message: "Sale price must be strictly less than the regular price" });
      }
    }

    const pType = productType || "simple";
    if (pType !== "variable" && attributes && Array.isArray(attributes) && attributes.length > 0) {
      return res.status(400).json({ message: "attributes are only allowed for variable products" });
    }
    
    if (pType === "external") {
      if (!externalUrl || typeof externalUrl !== 'string' || !/^https?:\/\/.+/.test(externalUrl)) {
        return res.status(400).json({ message: "A valid externalUrl is required for external products" });
      }
    } else {
      if (externalUrl) {
        return res.status(400).json({ message: "externalUrl is only allowed for external products" });
      }
    }

    const attrError = validateAttributes(attributes, pType);
    if (attrError) {
      return res.status(400).json({ message: attrError });
    }

    // Validate ObjectIds
    if (!mongoose.Types.ObjectId.isValid(sellerId) || !mongoose.Types.ObjectId.isValid(categoryId)) {
      return res.status(400).json({ message: "Invalid sellerId or categoryId format" });
    }
    if (brandId && !mongoose.Types.ObjectId.isValid(brandId)) {
      return res.status(400).json({ message: "Invalid brandId format" });
    }

    // Validate relationships exist
    const seller = await B2CSellerProfile.findById(sellerId);
    if (!seller) return res.status(404).json({ message: "Seller profile not found" });

    const category = await Category.findById(categoryId);
    if (!category) return res.status(404).json({ message: "Category not found" });

    if (brandId) {
      const brand = await Brand.findById(brandId);
      if (!brand) return res.status(404).json({ message: "Brand not found" });
    }

    // Check for duplicate slug or sku manually
    const existingProduct = await Product.findOne({ $or: [{ slug }, { sku }] });
    if (existingProduct) {
      if (existingProduct.slug === slug) {
        return res.status(400).json({ message: "Product with this slug already exists" });
      }
      if (existingProduct.sku === sku) {
        return res.status(400).json({ message: "Product with this SKU already exists" });
      }
    }

    const product = new Product({
      name, slug, description, shortDescription,
      sellerId, categoryId, brandId: brandId || null, sku,
      price, salePrice, currency: currency || "INR",
      thumbnail, tags, attributes: attributes || [],
      productType: productType || "simple", virtual, downloadable,
      status: status || "draft",
      isActive: isActive !== undefined ? isActive : true,
      isFeatured: isFeatured !== undefined ? isFeatured : false,
      metaTitle, metaDescription,
      externalUrl: pType === "external" ? externalUrl : null,
      buttonText: pType === "external" ? (buttonText || "Buy Now") : "Buy Now"
    });

    const createdProduct = await product.save();
    res.status(201).json(createdProduct);
  } catch (error) {
    if (error.code === 11000) {
      if (error.keyPattern?.slug) return res.status(400).json({ message: "Product with this slug already exists" });
      if (error.keyPattern?.sku) return res.status(400).json({ message: "Product with this SKU already exists" });
      return res.status(400).json({ message: "Duplicate key error" });
    }
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

// @desc    Get all products
// @route   GET /api/products
// @access  Public
const getProducts = async (req, res) => {
  try {
    const isAdmin = req.admin || req.user?.role === 'admin';
    const query = {};

    // If not admin, only show active products
    if (!isAdmin) {
      query.status = "active";
      query.isActive = true;
    }

    const products = await Product.find(query).lean().sort({ createdAt: -1 });

    const ProductImage = require("../models/ProductImage");
    const productIds = products.map((p) => p._id);
    const allImages = await ProductImage.find({ productId: { $in: productIds } })
      .sort({ sortOrder: 1, createdAt: 1 })
      .lean();

    for (const product of products) {
      product.images = allImages
        .filter((img) => img.productId.toString() === product._id.toString())
        .map((img) => img.url);
    }

    res.json(products);
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

// @desc    Get single product
// @route   GET /api/products/:id
// @access  Public
const getProductById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid product ID format" });
    }

    const product = await Product.findById(id).lean();

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    const isAdmin = req.admin;
    if (!isAdmin && (product.status !== "active" || !product.isActive)) {
      return res.status(404).json({ message: "Product not found" }); // Hide inactive from public
    }

    const ProductImage = require("../models/ProductImage");
    const images = await ProductImage.find({ productId: product._id })
      .sort({ sortOrder: 1, createdAt: 1 })
      .lean();
      
    product.images = images.map((img) => img.url);

    res.json(product);
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

// @desc    Update product
// @route   PUT /api/products/:id
// @access  Private/Admin
const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name, slug, description, shortDescription,
      sellerId, categoryId, brandId, sku,
      price, salePrice, currency,
      thumbnail, images, tags, attributes,
      productType, virtual, downloadable,
      status, isActive, isFeatured, metaTitle, metaDescription,
      externalUrl, buttonText
    } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid product ID format" });
    }

    const product = await Product.findById(id);

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    // Price validation
    const checkPrice = price !== undefined ? price : product.price;
    const checkSalePrice = salePrice !== undefined ? salePrice : product.salePrice;

    if (checkPrice < 0) {
      return res.status(400).json({ message: "Price cannot be negative" });
    }
    if (checkSalePrice !== undefined && checkSalePrice !== null) {
      if (checkSalePrice < 0) {
        return res.status(400).json({ message: "Sale price cannot be negative" });
      }
      if (checkSalePrice >= checkPrice) {
        return res.status(400).json({ message: "Sale price must be strictly less than the regular price" });
      }
    }

    // If changing from variable to simple/other, prevent if active variants exist
    if (product.productType === "variable" && productType && productType !== "variable") {
      try {
        const ProductVariant = require("../models/ProductVariant");
        const activeVariants = await ProductVariant.findOne({ productId: id, status: { $ne: "archived" } });
        if (activeVariants) {
          return res.status(400).json({ message: "Cannot change product type from variable because it has active variants. Archive variants first." });
        }
      } catch (e) {
        // ProductVariant might not be fully initialized yet, ignore
      }
    }

    const checkProductType = productType !== undefined ? productType : product.productType;
    
    if (checkProductType !== "variable" && attributes !== undefined && Array.isArray(attributes) && attributes.length > 0) {
      return res.status(400).json({ message: "attributes are only allowed for variable products" });
    }

    const checkExternalUrl = externalUrl !== undefined ? externalUrl : product.externalUrl;
    if (checkProductType === "external") {
      if (!checkExternalUrl || typeof checkExternalUrl !== 'string' || !/^https?:\/\/.+/.test(checkExternalUrl)) {
        return res.status(400).json({ message: "A valid externalUrl is required for external products" });
      }
    } else {
      if (externalUrl !== undefined && externalUrl !== null) {
        return res.status(400).json({ message: "externalUrl is only allowed for external products" });
      }
    }

    const checkAttributes = attributes !== undefined ? attributes : product.attributes;
    const attrError = validateAttributes(checkAttributes, checkProductType);
    if (attrError) {
      return res.status(400).json({ message: attrError });
    }

    // Check duplicate slug/sku if changed
    if ((slug && slug !== product.slug) || (sku && sku !== product.sku)) {
      const orQuery = [];
      if (slug && slug !== product.slug) orQuery.push({ slug });
      if (sku && sku !== product.sku) orQuery.push({ sku });
      
      if (orQuery.length > 0) {
        const existingProduct = await Product.findOne({ $or: orQuery });
        if (existingProduct) {
          if (existingProduct.slug === slug) return res.status(400).json({ message: "Product with this slug already exists" });
          if (existingProduct.sku === sku) return res.status(400).json({ message: "Product with this SKU already exists" });
        }
      }
    }

    // Validate relationships if changed
    if (categoryId && categoryId !== product.categoryId?.toString()) {
      if (!mongoose.Types.ObjectId.isValid(categoryId)) return res.status(400).json({ message: "Invalid categoryId format" });
      const category = await Category.findById(categoryId);
      if (!category) return res.status(404).json({ message: "Category not found" });
    }
    
    if (brandId && brandId !== product.brandId?.toString()) {
      if (!mongoose.Types.ObjectId.isValid(brandId)) return res.status(400).json({ message: "Invalid brandId format" });
      const brand = await Brand.findById(brandId);
      if (!brand) return res.status(404).json({ message: "Brand not found" });
    }
    
    if (sellerId && sellerId !== product.sellerId?.toString()) {
      if (!mongoose.Types.ObjectId.isValid(sellerId)) return res.status(400).json({ message: "Invalid sellerId format" });
      const seller = await B2CSellerProfile.findById(sellerId);
      if (!seller) return res.status(404).json({ message: "Seller profile not found" });
    }

    product.name = name !== undefined ? name : product.name;
    product.slug = slug !== undefined ? slug : product.slug;
    product.description = description !== undefined ? description : product.description;
    product.shortDescription = shortDescription !== undefined ? shortDescription : product.shortDescription;
    product.sellerId = sellerId !== undefined ? sellerId : product.sellerId;
    product.categoryId = categoryId !== undefined ? categoryId : product.categoryId;
    product.brandId = brandId !== undefined ? brandId : product.brandId;
    product.sku = sku !== undefined ? sku : product.sku;
    product.price = price !== undefined ? price : product.price;
    product.salePrice = salePrice !== undefined ? salePrice : product.salePrice;
    product.currency = currency !== undefined ? currency : product.currency;
    product.thumbnail = thumbnail !== undefined ? thumbnail : product.thumbnail;
    product.tags = tags !== undefined ? tags : product.tags;
    product.attributes = attributes !== undefined ? attributes : product.attributes;
    product.productType = productType !== undefined ? productType : product.productType;
    product.virtual = virtual !== undefined ? virtual : product.virtual;
    product.downloadable = downloadable !== undefined ? downloadable : product.downloadable;
    product.status = status !== undefined ? status : product.status;
    product.isActive = isActive !== undefined ? isActive : product.isActive;
    product.isFeatured = isFeatured !== undefined ? isFeatured : product.isFeatured;
    product.metaTitle = metaTitle !== undefined ? metaTitle : product.metaTitle;
    product.metaDescription = metaDescription !== undefined ? metaDescription : product.metaDescription;

    if (checkProductType === "external") {
      product.externalUrl = externalUrl !== undefined ? externalUrl : product.externalUrl;
      product.buttonText = buttonText !== undefined ? buttonText : product.buttonText;
    } else {
      product.externalUrl = null;
      product.buttonText = "Buy Now";
    }

    const updatedProduct = await product.save();
    res.json(updatedProduct);
  } catch (error) {
    if (error.code === 11000) {
      if (error.keyPattern?.slug) return res.status(400).json({ message: "Product with this slug already exists" });
      if (error.keyPattern?.sku) return res.status(400).json({ message: "Product with this SKU already exists" });
      return res.status(400).json({ message: "Duplicate key error" });
    }
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

// @desc    Soft delete product (deactivate)
// @route   DELETE /api/products/:id
// @access  Private/Admin
const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const { hard } = req.query;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid product ID format" });
    }

    if (hard === "true") {
      const deletedProduct = await Product.findByIdAndDelete(id);
      if (!deletedProduct) {
        return res.status(404).json({ message: "Product not found" });
      }
      
      try {
        const ProductVariant = require("../models/ProductVariant");
        await ProductVariant.deleteMany({ productId: id });
      } catch (e) {
        // ProductVariant might not be initialized yet
      }

      return res.json({ message: "Product and its variants permanently deleted from database" });
    }

    const product = await Product.findById(id);

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    if (product.status === "archived" || product.isActive === false) {
      return res.status(400).json({ message: "Product is already archived" });
    }

    product.status = "archived";
    product.isActive = false;
    await product.save();

    res.json({ message: "Product deactivated successfully", product });
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

module.exports = {
  createProduct,
  getProducts,
  getProductById,
  updateProduct,
  deleteProduct,
};
