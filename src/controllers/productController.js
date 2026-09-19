const Product = require("../models/Product");
const SimpleProduct = require("../models/SimpleProduct");
const GroupedProduct = require("../models/GroupedProduct");
const ExternalProduct = require("../models/ExternalProduct");
const VariableProduct = require("../models/VariableProduct");
const mongoose = require("mongoose");
const Category = require("../models/Category");
const ProductCategory = require("../models/ProductCategory");
const ProductSubCategory = require("../models/ProductSubCategory");
const ProductNestedSubCategory = require("../models/ProductNestedSubCategory");
const Brand = require("../models/Brand");
const B2CSellerProfile = require("../models/B2CSellerProfile");
const ProductImage = require("../models/ProductImage");
const Inventory = require("../models/Inventory");
const { getInventoryStatus } = require("./inventoryController");
const mapStatusToDb = (apiStatus) => {
  if (apiStatus === "publish") return "active";
  if (apiStatus === "private") return "archived";
  return apiStatus;
};

const formatProductResponse = (p, images, inventoryRecord = null) => {
  const isPlainObj = !p.$__;
  const prod = isPlainObj ? p : p.toObject();

  const primaryImage = images && images.length ? (images.find(i => i.isPrimary) || images[0]) : null;
  const thumbnail = primaryImage ? primaryImage.url : (prod.thumbnail || null);
  
  const otherImages = [];
  const otherVideos = [];
  
  if (images && images.length) {
    images.forEach(img => {
      // Don't duplicate the primary thumbnail in the other media arrays
      const isThisPrimary = primaryImage && img._id && img._id.toString() === primaryImage._id.toString();
      if (!isThisPrimary) {
        const url = img.url;
        if (url && (url.endsWith('.mp4') || url.endsWith('.webm') || url.endsWith('.mov') || url.endsWith('.mkv') || url.includes('/video/'))) {
          otherVideos.push(url);
        } else if (url) {
          otherImages.push(url);
        }
      }
    });
  }

  const gallery = images && images.length ? images.filter(i => i._id && i._id.toString() !== (primaryImage?._id?.toString())).map(i => i._id.toString()) : [];
  
  let apiStatus = prod.status;
  if (prod.status === "active") apiStatus = "publish";
  else if (prod.status === "archived") apiStatus = "private";

  const regularPrice = prod.regularPrice !== undefined ? prod.regularPrice : prod.price;
  const salePrice = prod.salePrice;
  let effectivePrice = regularPrice;
  let onSale = false;

  const now = new Date();
  if (salePrice !== null && salePrice !== undefined) {
    let validSale = true;
    if (prod.date_on_sale_from && new Date(prod.date_on_sale_from) > now) validSale = false;
    if (prod.date_on_sale_to && new Date(prod.date_on_sale_to) < now) validSale = false;
    if (validSale) {
      effectivePrice = salePrice;
      onSale = true;
    }
  }
  
  const purchasable = apiStatus === "publish";

  return {
    id: prod._id.toString(),
    date_created: prod.createdAt,
    date_created_gmt: prod.createdAt,
    date_modified: prod.updatedAt,
    date_modified_gmt: prod.updatedAt,
    name: prod.name,
    slug: prod.slug,
    description: prod.description || "",
    short_description: prod.shortDescription || "",
    sellerId: prod.sellerId?.toString(),
    cat_id: prod.cat_id?.toString() || prod.categoryId?.toString(),
    sub_cat_id: prod.sub_cat_id?.toString(),
    nested_sub_cat_id: prod.nested_sub_cat_id?.toString(),
    brands: prod.brandId ? (prod.brandId._id ? [{
      id: prod.brandId._id.toString(),
      name: prod.brandId.name,
      slug: prod.brandId.slug
    }] : [{ id: prod.brandId.toString() }]) : [],
    sku: prod.sku,
    price: effectivePrice?.toString(),
    regular_price: regularPrice?.toString(),
    sale_price: salePrice?.toString(),
    date_on_sale_from: prod.date_on_sale_from || null,
    date_on_sale_from_gmt: prod.date_on_sale_from || null,
    date_on_sale_to: prod.date_on_sale_to || null,
    date_on_sale_to_gmt: prod.date_on_sale_to || null,
    on_sale: onSale,
    status: apiStatus,
    purchasable,
    productType: prod.productType,
    virtual: !!prod.virtual,
    downloadable: !!prod.downloadable,
    downloads: prod.downloads || [],
    download_limit: prod.download_limit !== undefined ? prod.download_limit : -1,
    download_expiry: prod.download_expiry !== undefined ? prod.download_expiry : -1,
    tax_status: prod.tax_status || "taxable",
    tax_class: prod.tax_class || null,
    manage_stock: inventoryRecord ? !!inventoryRecord.manageStock : (prod.manage_stock !== undefined ? !!prod.manage_stock : false),
    stock_quantity: inventoryRecord ? inventoryRecord.quantity : null,
    backorders: inventoryRecord ? inventoryRecord.backorders : "no",
    low_stock_threshold: inventoryRecord ? inventoryRecord.lowStockThreshold : null,
    sold_individually: !!prod.sold_individually,
    weight: prod.weight?.toString() || null,
    dimensions: prod.dimensions || { length: "", width: "", height: "" },
    shipping_class: prod.shipping_class || null,
    shipping_class_id: null,
    reviews_allowed: prod.reviews_allowed !== undefined ? !!prod.reviews_allowed : true,
    enable_reviews: prod.reviews_allowed !== undefined ? !!prod.reviews_allowed : true,
    thumbnail: thumbnail,
    images: otherImages,
    videos: otherVideos,
    attributes: (prod.attributes || []).map(a => ({ name: a.name, options: a.options })),
    default_attributes: prod.default_attributes || [],
    menu_order: prod.menu_order !== undefined ? prod.menu_order : 0,
    catalog_visibility: prod.catalog_visibility || "visible",
    global_unique_id: prod.global_unique_id || null,
    total_sales: prod.total_sales || 0,
    related_ids: prod.related_ids || [],
    grouped_products: prod.grouped_products || [],
    upsell_ids: prod.upsell_ids || [],
    cross_sell_ids: prod.cross_sell_ids || [],
    purchase_note: (prod.productType === "grouped" || prod.productType === "external") ? null : (prod.purchase_note || ""),
    external_url: prod.externalUrl || null,
    button_text: prod.buttonText || (prod.productType === "external" ? "Buy product" : "Buy Now"),
    inventory: (prod.productType === "grouped" || prod.productType === "external" || prod.virtual || prod.downloadable) ? null : (inventoryRecord ? getInventoryStatus(inventoryRecord) : null)
  };
};

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
      sellerId, categoryId, cat_id, sub_cat_id, nested_sub_cat_id, brandId, sku,
      price, regular_price, salePrice, sale_price, currency,
      thumbnail, tags, attributes,
      productType, virtual, downloadable,
      status, isActive, isFeatured, metaTitle, metaDescription,
      externalUrl, external_url, buttonText, button_text,
      catalog_visibility, global_unique_id, date_on_sale_from, date_on_sale_to,
      total_sales, downloads, download_limit, download_expiry,
      tax_status, tax_class, sold_individually, manage_stock, manageStock, weight, dimensions,
      shipping_class, shipping_class_id, reviews_allowed, enable_reviews,
      grouped_products, related_ids, upsell_ids, cross_sell_ids, purchase_note,
      default_attributes, menu_order,
      inventory, // NEW: inventory payload for simple products
      quantity, stock_quantity, backorders, low_stock_threshold, lowStockThreshold,
      images, // images payload containing previously uploaded image metadata
      videos // videos payload containing previously uploaded video metadata
    } = req.body;

    const finalReviewsAllowed = reviews_allowed !== undefined ? !!reviews_allowed : (enable_reviews !== undefined ? !!enable_reviews : true);
    const finalMenuOrder = menu_order !== undefined ? (parseInt(menu_order, 10) || 0) : 0;
    const finalExternalUrl = externalUrl !== undefined ? externalUrl : external_url;
    const finalButtonText = buttonText !== undefined ? buttonText : button_text;
    const finalManageStock = manage_stock !== undefined ? !!manage_stock : (manageStock !== undefined ? !!manageStock : false);

    const pType = productType || "simple";
    const finalPrice = regular_price !== undefined ? regular_price : price;
    const finalSalePrice = sale_price !== undefined ? sale_price : salePrice;

    if (pType === "grouped" || pType === "external") {
      if (!name || !slug || !sellerId || !cat_id || !sub_cat_id || !nested_sub_cat_id || !sku) {
        return res.status(400).json({ message: "Name, slug, sellerId, cat_id, sub_cat_id, nested_sub_cat_id, and sku are required" });
      }
      if (inventory) {
        return res.status(400).json({ message: "Direct product inventory is only allowed for 'simple' products" });
      }
    } else {
      if (!name || !slug || !sellerId || !cat_id || !sub_cat_id || !nested_sub_cat_id || !sku || finalPrice === undefined) {
        return res.status(400).json({ message: "Name, slug, sellerId, cat_id, sub_cat_id, nested_sub_cat_id, sku, and price are required" });
      }
    }

    if (finalPrice !== undefined && finalPrice < 0) {
      return res.status(400).json({ message: "Price cannot be negative" });
    }
    if (finalSalePrice !== undefined && finalSalePrice !== null) {
      if (finalSalePrice < 0) {
        return res.status(400).json({ message: "Sale price cannot be negative" });
      }
      if (finalPrice !== undefined && finalSalePrice >= finalPrice) {
        return res.status(400).json({ message: "Sale price must be strictly less than the regular price" });
      }
    }

    // Allow attributes for simple, variable, grouped, and external products
    if (pType !== "variable" && pType !== "simple" && pType !== "grouped" && pType !== "external" && attributes && Array.isArray(attributes) && attributes.length > 0) {
      return res.status(400).json({ message: "attributes are only allowed for simple, variable, grouped, or external products" });
    }
    
    if (pType === "external") {
      if (!finalExternalUrl || typeof finalExternalUrl !== 'string' || !/^https?:\/\/.+/.test(finalExternalUrl)) {
        return res.status(400).json({ message: "A valid externalUrl is required for external products" });
      }
    } else {
      if (finalExternalUrl) {
        return res.status(400).json({ message: "externalUrl is only allowed for external products" });
      }
    }

    const attrError = validateAttributes(attributes, pType);
    if (attrError) {
      return res.status(400).json({ message: attrError });
    }

    // Validate ObjectIds
    if (!mongoose.Types.ObjectId.isValid(sellerId) || !mongoose.Types.ObjectId.isValid(cat_id) || !mongoose.Types.ObjectId.isValid(sub_cat_id) || !mongoose.Types.ObjectId.isValid(nested_sub_cat_id)) {
      return res.status(400).json({ message: "Invalid sellerId or category ID format" });
    }
    if (brandId && !mongoose.Types.ObjectId.isValid(brandId)) {
      return res.status(400).json({ message: "Invalid brandId format" });
    }

    // Validate relationships exist
    const seller = await B2CSellerProfile.findById(sellerId);
    if (!seller) return res.status(404).json({ message: "Seller profile not found" });

    const cat = await ProductCategory.findById(cat_id);
    if (!cat) return res.status(404).json({ message: "ProductCategory not found" });
    const subCat = await ProductSubCategory.findById(sub_cat_id);
    if (!subCat) return res.status(404).json({ message: "ProductSubCategory not found" });
    if (subCat.cat_id.toString() !== cat_id.toString()) return res.status(400).json({ message: "sub_cat_id does not belong to cat_id" });
    const nestedCat = await ProductNestedSubCategory.findById(nested_sub_cat_id);
    if (!nestedCat) return res.status(404).json({ message: "ProductNestedSubCategory not found" });
    if (nestedCat.sub_cat_id.toString() !== sub_cat_id.toString()) {
      return res.status(400).json({ message: "nested_sub_cat_id does not belong to the specified sub_cat_id" });
    }

    if (grouped_products && Array.isArray(grouped_products)) {
      for (const gpId of grouped_products) {
        if (!mongoose.Types.ObjectId.isValid(gpId)) {
          return res.status(400).json({ message: "Invalid ObjectId in grouped_products" });
        }
      }
    }

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

    const finalStatus = status ? mapStatusToDb(status) : "draft";

    const commonData = {
      name, slug, description, shortDescription,
      sellerId, categoryId, cat_id, sub_cat_id, nested_sub_cat_id, brandId: brandId || null, sku,
      salePrice: finalSalePrice, currency: currency || "INR",
      thumbnail, tags, attributes: attributes || [],
      productType: pType, virtual, downloadable,
      status: finalStatus,
      isActive: isActive !== undefined ? isActive : (finalStatus !== "archived"),
      isFeatured: isFeatured !== undefined ? isFeatured : false,
      metaTitle, metaDescription,
      externalUrl: pType === "external" ? finalExternalUrl : null,
      buttonText: pType === "external" ? (finalButtonText || "Buy product") : "Buy Now",
      catalog_visibility, global_unique_id, date_on_sale_from, date_on_sale_to,
      total_sales, downloads, download_limit, download_expiry,
      tax_status, tax_class, sold_individually, weight, dimensions,
      shipping_class, shipping_class_id,
      reviews_allowed: finalReviewsAllowed,
      grouped_products: grouped_products || [],
      related_ids, upsell_ids, cross_sell_ids,
      purchase_note: (pType === "grouped" || pType === "external") ? null : purchase_note,
      default_attributes,
      menu_order: finalMenuOrder,
      manage_stock: finalManageStock
    };

    let product;
    if (pType === "simple") {
      product = new SimpleProduct({
        ...commonData,
        regularPrice: finalPrice
      });
    } else if (pType === "grouped") {
      product = new GroupedProduct({
        ...commonData
      });
    } else if (pType === "external") {
      product = new ExternalProduct({
        ...commonData,
        regularPrice: finalPrice
      });
    } else if (pType === "variable") {
      product = new VariableProduct({
        ...commonData,
        price: finalPrice
      });
    } else {
      product = new Product({
        ...commonData,
        price: finalPrice
      });
    }

    let inventoryRecord = null;
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const createdProduct = await product.save({ session });
      
      const isVirtualOrDownloadable = !!(createdProduct.virtual || createdProduct.downloadable);
      const isManageStockEnabled = inventory?.manageStock === true || finalManageStock === true;
      if ((pType === "simple" || pType === "variable") && (inventory || isManageStockEnabled) && !isVirtualOrDownloadable) {
        const invQuantity = inventory?.quantity !== undefined ? inventory.quantity : (quantity !== undefined ? parseInt(quantity, 10) : (stock_quantity !== undefined ? parseInt(stock_quantity, 10) : 0));
        const invLowStock = inventory?.lowStockThreshold !== undefined ? inventory.lowStockThreshold : (low_stock_threshold !== undefined ? parseInt(low_stock_threshold, 10) : (lowStockThreshold !== undefined ? parseInt(lowStockThreshold, 10) : 2));
        const invBackorders = inventory?.backorders !== undefined ? inventory.backorders : (backorders || "no");

        inventoryRecord = new Inventory({
          productId: createdProduct._id,
          manageStock: isManageStockEnabled,
          quantity: isNaN(invQuantity) ? 0 : invQuantity,
          reservedQuantity: 0,
          lowStockThreshold: isNaN(invLowStock) ? 2 : invLowStock,
          backorders: ["no", "notify", "yes"].includes(invBackorders) ? invBackorders : "no"
        });
        await inventoryRecord.save({ session });
      }
      
      await session.commitTransaction();
      session.endSession();
      
      let productImgs = [];
      
      // 1. If thumbnail is explicitly passed, save it as the primary image
      if (thumbnail && typeof thumbnail === 'string') {
        const thumbImage = new ProductImage({
          productId: createdProduct._id,
          variantId: null,
          url: thumbnail,
          altText: 'Thumbnail',
          sortOrder: 0,
          isPrimary: true
        });
        await thumbImage.save();
        productImgs.push(thumbImage);
      }

      // 2. Combine images and videos lists
      const additionalMedia = [
        ...(Array.isArray(images) ? images : []),
        ...(Array.isArray(videos) ? videos : [])
      ];

      for (let i = 0; i < additionalMedia.length; i++) {
        const item = additionalMedia[i];
        const mediaData = typeof item === 'string' ? { url: item } : (item || {});
        if (!mediaData.url) continue;

        // If thumbnail wasn't provided, first item becomes primary
        const isPrimary = !thumbnail && i === 0;
        const sortOrder = mediaData.sortOrder !== undefined ? parseInt(mediaData.sortOrder, 10) : (i + 1);

        const newMedia = new ProductImage({
          productId: createdProduct._id,
          variantId: null,
          url: mediaData.url,
          altText: mediaData.altText || null,
          sortOrder: isNaN(sortOrder) ? (i + 1) : sortOrder,
          isPrimary: isPrimary
        });
        await newMedia.save();
        productImgs.push(newMedia);
      }
      
      res.status(201).json(formatProductResponse(createdProduct, productImgs, inventoryRecord));
    } catch (saveError) {
      await session.abortTransaction();
      session.endSession();
      throw saveError;
    }
  } catch (error) {
    if (error.code === 11000) {
      if (error.keyPattern?.slug) return res.status(400).json({ message: "Product with this slug already exists" });
      if (error.keyPattern?.sku) return res.status(400).json({ message: "Product with this SKU already exists" });
      return res.status(400).json({ message: "Duplicate key error" });
    }
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(val => val.message);
      return res.status(400).json({ message: "Validation Error", errors: messages });
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

    const products = await Product.find(query).populate('brandId', 'name slug').lean().sort({ createdAt: -1 });

    const ProductImage = require("../models/ProductImage");
    const productIds = products.map((p) => p._id);
    const allImages = await ProductImage.find({ productId: { $in: productIds } })
      .sort({ sortOrder: 1, createdAt: 1 })
      .lean();

    const formattedProducts = products.map(product => {
      const prodImages = allImages.filter((img) => img.productId.toString() === product._id.toString());
      return formatProductResponse(product, prodImages);
    });

    res.json(formattedProducts);
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

    const product = await Product.findById(id).populate('brandId', 'name slug').lean();

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    const isAdmin = req.admin;
    if (!isAdmin && (product.status !== "active" || !product.isActive)) {
      return res.status(404).json({ message: "Product not found" }); // Hide inactive from public
    }

    const images = await ProductImage.find({ productId: product._id })
      .sort({ sortOrder: 1, createdAt: 1 })
      .lean();
      
    let inventoryRecord = null;
    if ((product.productType === "simple" || product.productType === "variable") && !product.virtual && !product.downloadable) {
      inventoryRecord = await Inventory.findOne({ productId: product._id }).lean();
    }
      
    res.json(formatProductResponse(product, images, inventoryRecord));
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
      sellerId, categoryId, cat_id, sub_cat_id, nested_sub_cat_id, brandId, sku,
      price, regular_price, salePrice, sale_price, currency,
      thumbnail, images, tags, attributes,
      productType, virtual, downloadable,
      status, isActive, isFeatured, metaTitle, metaDescription,
      externalUrl, external_url, buttonText, button_text,
      catalog_visibility, global_unique_id, date_on_sale_from, date_on_sale_to,
      total_sales, downloads, download_limit, download_expiry,
      tax_status, tax_class, sold_individually, manage_stock, manageStock, weight, dimensions,
      shipping_class, shipping_class_id, reviews_allowed, enable_reviews,
      grouped_products, related_ids, upsell_ids, cross_sell_ids, purchase_note,
      default_attributes, menu_order,
      inventory, // NEW
      quantity, stock_quantity, backorders, low_stock_threshold, lowStockThreshold
    } = req.body;

    const finalExternalUrl = externalUrl !== undefined ? externalUrl : external_url;
    const finalButtonText = buttonText !== undefined ? buttonText : button_text;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid product ID format" });
    }

    const product = await Product.findById(id);

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    const finalPrice = regular_price !== undefined ? regular_price : price;
    const finalSalePrice = sale_price !== undefined ? sale_price : salePrice;

    // Price validation
    const checkPrice = finalPrice !== undefined ? finalPrice : product.price;
    const checkSalePrice = finalSalePrice !== undefined ? finalSalePrice : product.salePrice;

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
    
    if (checkProductType !== "variable" && checkProductType !== "simple" && checkProductType !== "grouped" && checkProductType !== "external" && attributes !== undefined && Array.isArray(attributes) && attributes.length > 0) {
      return res.status(400).json({ message: "attributes are only allowed for simple, variable, grouped, or external products" });
    }

    const checkExternalUrl = finalExternalUrl !== undefined ? finalExternalUrl : product.externalUrl;
    if (checkProductType === "external") {
      if (!checkExternalUrl || typeof checkExternalUrl !== 'string' || !/^https?:\/\/.+/.test(checkExternalUrl)) {
        return res.status(400).json({ message: "A valid externalUrl is required for external products" });
      }
    } else {
      if (finalExternalUrl !== undefined && finalExternalUrl !== null) {
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

    const finalCatId = cat_id !== undefined ? cat_id : product.cat_id?.toString();
    const finalSubCatId = sub_cat_id !== undefined ? sub_cat_id : product.sub_cat_id?.toString();
    const finalNestedSubCatId = nested_sub_cat_id !== undefined ? nested_sub_cat_id : product.nested_sub_cat_id?.toString();

    if (cat_id !== undefined || sub_cat_id !== undefined || nested_sub_cat_id !== undefined) {
      if (!finalCatId || !finalSubCatId || !finalNestedSubCatId) {
        return res.status(400).json({ message: "Complete category hierarchy (cat_id, sub_cat_id, nested_sub_cat_id) is required" });
      }
      if (!mongoose.Types.ObjectId.isValid(finalCatId) || !mongoose.Types.ObjectId.isValid(finalSubCatId) || !mongoose.Types.ObjectId.isValid(finalNestedSubCatId)) {
        return res.status(400).json({ message: "Invalid category ID format" });
      }
      const cat = await ProductCategory.findById(finalCatId);
      if (!cat) return res.status(404).json({ message: "ProductCategory not found" });
      const subCat = await ProductSubCategory.findById(finalSubCatId);
      if (!subCat) return res.status(404).json({ message: "ProductSubCategory not found" });
      if (subCat.cat_id.toString() !== finalCatId) return res.status(400).json({ message: "sub_cat_id does not belong to cat_id" });
      const nestedCat = await ProductNestedSubCategory.findById(finalNestedSubCatId);
      if (!nestedCat) return res.status(404).json({ message: "ProductNestedSubCategory not found" });
      if (nestedCat.sub_cat_id.toString() !== finalSubCatId) {
        return res.status(400).json({ message: "nested_sub_cat_id does not belong to the specified sub_cat_id" });
      }
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
    if (cat_id !== undefined || sub_cat_id !== undefined || nested_sub_cat_id !== undefined) {
      product.cat_id = finalCatId;
      product.sub_cat_id = finalSubCatId;
      product.nested_sub_cat_id = finalNestedSubCatId;
    }
    product.brandId = brandId !== undefined ? brandId : product.brandId;
    product.sku = sku !== undefined ? sku : product.sku;
    if (product.productType === "simple" || product.productType === "external") {
      product.regularPrice = finalPrice !== undefined ? finalPrice : product.regularPrice;
    } else {
      product.price = finalPrice !== undefined ? finalPrice : product.price;
    }
    product.salePrice = finalSalePrice !== undefined ? finalSalePrice : product.salePrice;
    product.currency = currency !== undefined ? currency : product.currency;
    product.thumbnail = thumbnail !== undefined ? thumbnail : product.thumbnail;
    product.tags = tags !== undefined ? tags : product.tags;
    product.attributes = attributes !== undefined ? attributes : product.attributes;
    product.productType = productType !== undefined ? productType : product.productType;
    product.virtual = virtual !== undefined ? virtual : product.virtual;
    product.downloadable = downloadable !== undefined ? downloadable : product.downloadable;
    
    if (status !== undefined) product.status = mapStatusToDb(status);
    
    product.isActive = isActive !== undefined ? isActive : product.isActive;
    if (status !== undefined && isActive === undefined) {
      product.isActive = product.status !== "archived";
    }
    
    product.isFeatured = isFeatured !== undefined ? isFeatured : product.isFeatured;
    product.metaTitle = metaTitle !== undefined ? metaTitle : product.metaTitle;
    product.metaDescription = metaDescription !== undefined ? metaDescription : product.metaDescription;

    if (catalog_visibility !== undefined) product.catalog_visibility = catalog_visibility;
    if (global_unique_id !== undefined) product.global_unique_id = global_unique_id;
    if (date_on_sale_from !== undefined) product.date_on_sale_from = date_on_sale_from;
    if (date_on_sale_to !== undefined) product.date_on_sale_to = date_on_sale_to;
    if (total_sales !== undefined) product.total_sales = total_sales;
    if (downloads !== undefined) product.downloads = downloads;
    if (download_limit !== undefined) product.download_limit = download_limit;
    if (download_expiry !== undefined) product.download_expiry = download_expiry;
    if (tax_status !== undefined) product.tax_status = tax_status;
    if (tax_class !== undefined) product.tax_class = tax_class;
    if (sold_individually !== undefined) product.sold_individually = sold_individually;
    const finalManageStock = manage_stock !== undefined ? manage_stock : manageStock;
    if (finalManageStock !== undefined) product.manage_stock = !!finalManageStock;
    if (weight !== undefined) product.weight = weight;
    if (dimensions !== undefined) product.dimensions = dimensions;
    if (shipping_class !== undefined) product.shipping_class = shipping_class;
    if (shipping_class_id !== undefined) product.shipping_class_id = shipping_class_id;
    const finalReviewsAllowed = reviews_allowed !== undefined ? reviews_allowed : enable_reviews;
    if (finalReviewsAllowed !== undefined) product.reviews_allowed = !!finalReviewsAllowed;
    if (related_ids !== undefined) product.related_ids = related_ids;
    if (grouped_products !== undefined) {
      if (Array.isArray(grouped_products)) {
        for (const gpId of grouped_products) {
          if (!mongoose.Types.ObjectId.isValid(gpId)) {
            return res.status(400).json({ message: "Invalid ObjectId in grouped_products" });
          }
        }
      }
      product.grouped_products = grouped_products;
    }
    if (upsell_ids !== undefined) product.upsell_ids = upsell_ids;
    if (cross_sell_ids !== undefined) product.cross_sell_ids = cross_sell_ids;
    if (purchase_note !== undefined) product.purchase_note = (checkProductType === "grouped" || checkProductType === "external") ? null : purchase_note;
    if (default_attributes !== undefined) product.default_attributes = default_attributes;
    if (menu_order !== undefined) product.menu_order = parseInt(menu_order, 10) || 0;

    if (checkProductType === "external") {
      product.externalUrl = finalExternalUrl !== undefined ? finalExternalUrl : product.externalUrl;
      product.buttonText = finalButtonText !== undefined ? finalButtonText : (product.buttonText || "Buy product");
    } else {
      product.externalUrl = null;
      product.buttonText = "Buy Now";
    }

    let inventoryRecord = null;
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const updatedProduct = await product.save({ session });
      
      const isVirtualOrDownloadable = !!(updatedProduct.virtual || updatedProduct.downloadable);
      if ((checkProductType === "simple" || checkProductType === "variable") && !isVirtualOrDownloadable) {
        inventoryRecord = await Inventory.findOne({ productId: id }).session(session);
        const isManageStockRequested = (inventory && inventory.manageStock !== undefined) ? inventory.manageStock : (finalManageStock !== undefined ? finalManageStock : undefined);
        if (inventory || isManageStockRequested !== undefined || quantity !== undefined || stock_quantity !== undefined || backorders !== undefined || low_stock_threshold !== undefined || lowStockThreshold !== undefined) {
          const invQuantity = inventory?.quantity !== undefined ? inventory.quantity : (quantity !== undefined ? parseInt(quantity, 10) : (stock_quantity !== undefined ? parseInt(stock_quantity, 10) : undefined));
          const invLowStock = inventory?.lowStockThreshold !== undefined ? inventory.lowStockThreshold : (low_stock_threshold !== undefined ? parseInt(low_stock_threshold, 10) : (lowStockThreshold !== undefined ? parseInt(lowStockThreshold, 10) : undefined));
          const invBackorders = inventory?.backorders !== undefined ? inventory.backorders : backorders;
          const invManageStock = (inventory?.manageStock !== undefined) ? inventory.manageStock : isManageStockRequested;

          if (inventoryRecord) {
            if (invManageStock !== undefined) inventoryRecord.manageStock = !!invManageStock;
            if (invQuantity !== undefined && !isNaN(invQuantity)) inventoryRecord.quantity = invQuantity;
            if (invLowStock !== undefined && !isNaN(invLowStock)) inventoryRecord.lowStockThreshold = invLowStock;
            if (invBackorders !== undefined && ["no", "notify", "yes"].includes(invBackorders)) inventoryRecord.backorders = invBackorders;
            await inventoryRecord.save({ session });
          } else if (invManageStock) {
            inventoryRecord = new Inventory({
              productId: id,
              manageStock: true,
              quantity: (!isNaN(invQuantity) && invQuantity !== undefined) ? invQuantity : 0,
              reservedQuantity: 0,
              lowStockThreshold: (!isNaN(invLowStock) && invLowStock !== undefined) ? invLowStock : 2,
              backorders: (invBackorders && ["no", "notify", "yes"].includes(invBackorders)) ? invBackorders : "no"
            });
            await inventoryRecord.save({ session });
          }
        }
      }
      
      await session.commitTransaction();
      session.endSession();
      
      if (images && Array.isArray(images) && images.length > 0) {
        for (let i = 0; i < images.length; i++) {
          const imgData = images[i];
          if (!imgData.url) continue;
          const isPrimary = imgData.isPrimary === true || imgData.isPrimary === 'true';
          const sortOrder = imgData.sortOrder !== undefined ? parseInt(imgData.sortOrder, 10) : i;
          
          if (isPrimary) {
             await ProductImage.updateMany({ productId: updatedProduct._id, variantId: null }, { isPrimary: false });
          }
          
          const newImage = new ProductImage({
            productId: updatedProduct._id,
            variantId: null,
            url: imgData.url,
            altText: imgData.altText || null,
            sortOrder: isNaN(sortOrder) ? i : sortOrder,
            isPrimary: isPrimary
          });
          await newImage.save();
        }
      }
      
      const productImgs = await ProductImage.find({ productId: updatedProduct._id })
        .sort({ sortOrder: 1, createdAt: 1 })
        .lean();

      res.json(formatProductResponse(updatedProduct, productImgs, inventoryRecord));
    } catch (saveError) {
      await session.abortTransaction();
      session.endSession();
      throw saveError;
    }
  } catch (error) {
    if (error.code === 11000) {
      if (error.keyPattern?.slug) return res.status(400).json({ message: "Product with this slug already exists" });
      if (error.keyPattern?.sku) return res.status(400).json({ message: "Product with this SKU already exists" });
      return res.status(400).json({ message: "Duplicate key error" });
    }
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(val => val.message);
      return res.status(400).json({ message: "Validation Error", errors: messages });
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
        await Inventory.deleteMany({ productId: id }); // Clean up simple product inventory
      } catch (e) {
        // Models might not be fully initialized
      }

      return res.json({ message: "Product, variants, and inventory permanently deleted from database" });
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
