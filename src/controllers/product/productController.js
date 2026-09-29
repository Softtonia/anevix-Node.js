const Product = require("../../models/product/Product");
const SimpleProduct = require("../../models/product/SimpleProduct");
const GroupedProduct = require("../../models/product/GroupedProduct");
const ExternalProduct = require("../../models/product/ExternalProduct");
const VariableProduct = require("../../models/product/VariableProduct");
const ProductVariant = require("../../models/product/ProductVariant");
const mongoose = require("mongoose");
const Category = require("../../models/category/Category");
const ProductCategory = require("../../models/category/ProductCategory");

const Brand = require("../../models/brand/Brand");
const B2CSellerProfile = require("../../models/seller/B2CSellerProfile");
const SellerRegistration = require("../../models/seller/SellerRegistration");
const ProductImage = require("../../models/product/ProductImage");
const Inventory = require("../../models/inventory/Inventory");
const { getInventoryStatus } = require("../inventory/inventoryController");
const mapStatusToDb = (apiStatus) => {
  if (apiStatus === "publish") return "active";
  if (apiStatus === "private") return "archived";
  return apiStatus;
};

const formatProductResponse = (p, images, inventoryRecord = null) => {
  const isPlainObj = !p.$__;
  const prod = isPlainObj ? p : p.toObject();

  const primaryImage =
    images && images.length
      ? images.find((i) => i.isPrimary) || images[0]
      : null;
  const thumbnail = primaryImage ? primaryImage.url : prod.thumbnail || null;

  const otherImages = [];
  const otherVideos = [];

  if (images && images.length) {
    images.forEach((img) => {
      // Don't duplicate the primary thumbnail in the other media arrays
      const isThisPrimary =
        primaryImage &&
        img._id &&
        img._id.toString() === primaryImage._id.toString();
      if (!isThisPrimary) {
        const url = img.url;
        if (
          url &&
          (url.endsWith(".mp4") ||
            url.endsWith(".webm") ||
            url.endsWith(".mov") ||
            url.endsWith(".mkv") ||
            url.includes("/video/"))
        ) {
          otherVideos.push(url);
        } else if (url) {
          otherImages.push(url);
        }
      }
    });
  }

  const gallery =
    images && images.length
      ? images
          .filter(
            (i) => i._id && i._id.toString() !== primaryImage?._id?.toString(),
          )
          .map((i) => i._id.toString())
      : [];

  let apiStatus = prod.status;
  if (prod.status === "active") apiStatus = "publish";
  else if (prod.status === "archived") apiStatus = "private";

  const regularPrice =
    prod.anevixPrice !== undefined
      ? prod.anevixPrice
      : prod.regularPrice !== undefined 
        ? prod.regularPrice 
        : prod.price;
  const salePrice = prod.salePrice;
  let effectivePrice = regularPrice;
  let onSale = false;

  const now = new Date();
  if (salePrice !== null && salePrice !== undefined) {
    let validSale = true;
    if (prod.date_on_sale_from && new Date(prod.date_on_sale_from) > now)
      validSale = false;
    if (prod.date_on_sale_to && new Date(prod.date_on_sale_to) < now)
      validSale = false;
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
    cat_id: prod.cat_id
      ? prod.cat_id._id
        ? prod.cat_id._id.toString()
        : prod.cat_id.toString()
      : prod.categoryId
        ? prod.categoryId._id
          ? prod.categoryId._id.toString()
          : prod.categoryId.toString()
        : null,
    category_name: prod.cat_id
      ? prod.cat_id.cat_name || prod.cat_id.name || null
      : prod.categoryId
        ? prod.categoryId.cat_name || prod.categoryId.name || null
        : null,
    sub_cat_id: prod.sub_cat_id
      ? prod.sub_cat_id._id
        ? prod.sub_cat_id._id.toString()
        : prod.sub_cat_id.toString()
      : null,
    sub_category_name: prod.sub_cat_id
      ? prod.sub_cat_id.sub_cat_name ||
        prod.sub_cat_id.cat_name ||
        prod.sub_cat_id.name ||
        null
      : null,
    nested_sub_cat_id: prod.nested_sub_cat_id
      ? prod.nested_sub_cat_id._id
        ? prod.nested_sub_cat_id._id.toString()
        : prod.nested_sub_cat_id.toString()
      : null,
    nested_sub_category_name: prod.nested_sub_cat_id
      ? prod.nested_sub_cat_id.name || prod.nested_sub_cat_id.cat_name || null
      : null,
    brands: prod.brandId
      ? prod.brandId._id
        ? [
            {
              id: prod.brandId._id.toString(),
              name: prod.brandId.name,
              slug: prod.brandId.slug,
            },
          ]
        : [{ id: prod.brandId.toString() }]
      : [],
    sku: prod.sku,
    anevixPrice: prod.anevixPrice?.toString(),
    mrpPrice: prod.mrpPrice?.toString(),
    prePaidDiscount: prod.prePaidDiscount?.toString(),
    salePrice: prod.salePrice?.toString(),
    hsnCode: prod.hsnCode,
    gstRate: prod.gstRate,
    status: apiStatus,
    purchasable,
    productType: prod.productType,
    virtual: !!prod.virtual,
    downloadable: !!prod.downloadable,
    downloads: prod.downloads || [],
    download_limit:
      prod.download_limit !== undefined ? prod.download_limit : -1,
    download_expiry:
      prod.download_expiry !== undefined ? prod.download_expiry : -1,
    manage_stock: inventoryRecord
      ? !!inventoryRecord.manageStock
      : prod.manage_stock !== undefined
        ? !!prod.manage_stock
        : false,
    stock_quantity: inventoryRecord ? inventoryRecord.quantity : null,
    backorders: inventoryRecord ? inventoryRecord.backorders : "no",
    weight: prod.weight?.toString() || null,
    weightUnit: prod.weightUnit || "kg",
    dimensions: prod.dimensions || { length: "", width: "", height: "" },
    reviews_allowed:
      prod.reviews_allowed !== undefined ? !!prod.reviews_allowed : true,
    enable_reviews:
      prod.reviews_allowed !== undefined ? !!prod.reviews_allowed : true,
    thumbnail: thumbnail,
    images: otherImages,
    videos: otherVideos,
    attributes: (prod.attributes || []).map((a) => ({
      name: a.name,
      options: a.options,
    })),
    default_attributes: prod.default_attributes || [],
    menu_order: prod.menu_order !== undefined ? prod.menu_order : 0,
    catalog_visibility: prod.catalog_visibility || "visible",
    global_unique_id: prod.global_unique_id || null,
    total_sales: prod.total_sales || 0,
    related_ids: prod.related_ids || [],
    grouped_products: prod.grouped_products || [],
    upsell_ids: prod.upsell_ids || [],
    cross_sell_ids: prod.cross_sell_ids || [],
    purchase_note:
      prod.productType === "grouped" || prod.productType === "external"
        ? null
        : prod.purchase_note || "",
    external_url: prod.externalUrl || null,
    button_text:
      prod.buttonText ||
      (prod.productType === "external" ? "Buy product" : "Buy Now"),
    inventory:
      prod.productType === "grouped" ||
      prod.productType === "external" ||
      prod.virtual ||
      prod.downloadable
        ? null
        : inventoryRecord
          ? getInventoryStatus(inventoryRecord)
          : null,
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
      if (
        !attr.name ||
        typeof attr.name !== "string" ||
        attr.name.trim() === ""
      ) {
        return "Attribute name is required.";
      }
      const lowerName = attr.name.trim().toLowerCase();
      if (names.has(lowerName)) {
        return `Duplicate attribute name: ${attr.name}`;
      }
      names.add(lowerName);

      if (
        !attr.options ||
        !Array.isArray(attr.options) ||
        attr.options.length === 0
      ) {
        return `Attribute ${attr.name} must have at least one option.`;
      }

      const optionsSet = new Set();
      for (const opt of attr.options) {
        if (!opt || typeof opt !== "string" || opt.trim() === "") {
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
    let {
      name,
      slug,
      description,
      shortDescription,
      sellerId,
      categoryId,
      cat_id,
      sub_cat_id,
      nested_sub_cat_id,
      brandId,
      sku,
      batchId, // NEW: Support bulk upload batch ID or auto-generate for single uploads
      price,
      regular_price,
      salePrice,
      sale_price,
      currency,
      thumbnail,
      tags,
      attributes,
      productType,
      virtual,
      downloadable,
      status,
      isActive,
      isFeatured,
      metaTitle,
      metaDescription,
      externalUrl,
      external_url,
      buttonText,
      button_text,
      catalog_visibility,
      global_unique_id,
      date_on_sale_from,
      date_on_sale_to,
      total_sales,
      downloads,
      download_limit,
      download_expiry,
      tax_status,
      tax_class,
      sold_individually,
      manage_stock,
      manageStock,
      weight,
      dimensions,
      shipping_class,
      shipping_class_id,
      reviews_allowed,
      enable_reviews,
      grouped_products,
      related_ids,
      upsell_ids,
      cross_sell_ids,
      purchase_note,
      default_attributes,
      menu_order,
      inventory, // NEW: inventory payload for simple products
      quantity,
      stock_quantity,
      backorders,
      low_stock_threshold,
      lowStockThreshold,
      images, // images payload containing previously uploaded image metadata
      videos, // videos payload containing previously uploaded video metadata
      variants, // array of variants to process
    } = req.body;

    if (cat_id === "") cat_id = null;
    if (sub_cat_id === "") sub_cat_id = null;
    if (nested_sub_cat_id === "") nested_sub_cat_id = null;

    const finalReviewsAllowed =
      reviews_allowed !== undefined
        ? !!reviews_allowed
        : enable_reviews !== undefined
          ? !!enable_reviews
          : true;
    const finalMenuOrder =
      menu_order !== undefined ? parseInt(menu_order, 10) || 0 : 0;
    const finalExternalUrl =
      externalUrl !== undefined ? externalUrl : external_url;
    const finalButtonText = buttonText !== undefined ? buttonText : button_text;
    const finalManageStock =
      manage_stock !== undefined
        ? !!manage_stock
        : manageStock !== undefined
          ? !!manageStock
          : false;

    const pType = productType || "simple";
    const finalPrice = req.body.anevixPrice !== undefined ? req.body.anevixPrice : price;
    const finalSalePrice = req.body.salePrice !== undefined ? req.body.salePrice : salePrice;

    if (pType === "grouped" || pType === "external") {
      if (!name || !slug || !sellerId || !cat_id || !sku) {
        return res
          .status(400)
          .json({
            message: "Name, slug, sellerId, cat_id, and sku are required",
          });
      }
      if (inventory) {
        return res
          .status(400)
          .json({
            message:
              "Direct product inventory is only allowed for 'simple' products",
          });
      }
    } else if (pType === "variable") {
      if (!name || !slug || !sellerId || !cat_id || !sku) {
        return res
          .status(400)
          .json({
            message: "Name, slug, sellerId, cat_id, and sku are required",
          });
      }
    } else {
      if (
        !name ||
        !slug ||
        !sellerId ||
        !cat_id ||
        !sku ||
        finalPrice === undefined
      ) {
        return res
          .status(400)
          .json({
            message:
              "Name, slug, sellerId, cat_id, sku, and price are required",
          });
      }
    }

    if (finalPrice !== undefined && Number(finalPrice) < 0) {
      return res.status(400).json({ message: "Price cannot be negative" });
    }
    if (finalSalePrice !== undefined && finalSalePrice !== null && finalSalePrice !== "") {
      if (Number(finalSalePrice) < 0) {
        return res
          .status(400)
          .json({ message: "Sale price cannot be negative" });
      }
      if (
        finalPrice !== undefined &&
        finalPrice !== null &&
        finalPrice !== "" &&
        Number(finalSalePrice) >= Number(finalPrice)
      ) {
        return res
          .status(400)
          .json({
            message: "Sale price must be strictly less than the regular price",
          });
      }
    }

    // Allow attributes for simple, variable, grouped, and external products
    if (
      pType !== "variable" &&
      pType !== "simple" &&
      pType !== "grouped" &&
      pType !== "external" &&
      attributes &&
      Array.isArray(attributes) &&
      attributes.length > 0
    ) {
      return res
        .status(400)
        .json({
          message:
            "attributes are only allowed for simple, variable, grouped, or external products",
        });
    }

    if (pType === "external") {
      if (
        !finalExternalUrl ||
        typeof finalExternalUrl !== "string" ||
        !/^https?:\/\/.+/.test(finalExternalUrl)
      ) {
        return res
          .status(400)
          .json({
            message: "A valid externalUrl is required for external products",
          });
      }
    } else {
      if (finalExternalUrl) {
        return res
          .status(400)
          .json({
            message: "externalUrl is only allowed for external products",
          });
      }
    }

    const attrError = validateAttributes(attributes, pType);
    if (attrError) {
      return res.status(400).json({ message: attrError });
    }

    // Validate ObjectIds
    if (
      !mongoose.Types.ObjectId.isValid(sellerId) ||
      !mongoose.Types.ObjectId.isValid(cat_id) ||
      !mongoose.Types.ObjectId.isValid(sub_cat_id) ||
      (nested_sub_cat_id && !mongoose.Types.ObjectId.isValid(nested_sub_cat_id))
    ) {
      return res
        .status(400)
        .json({ message: "Invalid sellerId or category ID format" });
    }
    if (brandId && !mongoose.Types.ObjectId.isValid(brandId)) {
      return res.status(400).json({ message: "Invalid brandId format" });
    }

    // Validate relationships exist
    let seller = await B2CSellerProfile.findById(sellerId);
    if (!seller) {
      seller = await SellerRegistration.findById(sellerId);
      if (!seller)
        return res.status(404).json({ message: "Seller profile not found" });
    }

    const cat = await ProductCategory.findById(cat_id);
    if (!cat)
      return res.status(404).json({ message: "ProductCategory not found" });

    let subCat = null;
    if (sub_cat_id) {
      subCat = await ProductCategory.findById(sub_cat_id);
      if (!subCat)
        return res.status(404).json({ message: "ProductCategory not found" });
      if (subCat.parentId?.toString() !== cat_id.toString())
        return res
          .status(400)
          .json({ message: "sub_cat_id does not belong to cat_id" });
    }

    let nestedCat = null;
    if (nested_sub_cat_id) {
      nestedCat = await ProductCategory.findById(nested_sub_cat_id);
      if (!nestedCat)
        return res.status(404).json({ message: "ProductCategory not found" });
      if (nestedCat.parentId?.toString() !== sub_cat_id.toString())
        return res
          .status(400)
          .json({
            message:
              "nested_sub_cat_id does not belong to the specified sub_cat_id",
          });
    }

    if (grouped_products && Array.isArray(grouped_products)) {
      for (const gpId of grouped_products) {
        if (!mongoose.Types.ObjectId.isValid(gpId)) {
          return res
            .status(400)
            .json({ message: "Invalid ObjectId in grouped_products" });
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
        return res
          .status(400)
          .json({ message: "Product with this slug already exists" });
      }
      if (existingProduct.sku === sku) {
        return res
          .status(400)
          .json({ message: "Product with this SKU already exists" });
      }
    }

    const isAdmin = req.admin || req.user?.role === "admin";

    // Default to pending for sellers, active for admins, unless explicitly specified
    let defaultStatus = isAdmin ? "active" : "pending";
    let finalStatus = status ? mapStatusToDb(status) : defaultStatus;

    // Force pending for sellers unless they explicitly request draft
    if (!isAdmin && finalStatus !== "draft") {
      finalStatus = "pending";
    }

    const commonData = {
      name,
      slug,
      description,
      shortDescription,
      sellerId,
      categoryId,
      cat_id,
      sub_cat_id,
      nested_sub_cat_id,
      brandId: brandId || null,
      sku,
      batchId: batchId || `SINGLE-${Date.now()}`,
      anevixPrice: finalPrice,
      mrpPrice: req.body.mrpPrice,
      salePrice: finalSalePrice,
      prePaidDiscount: req.body.prePaidDiscount || 0,
      hsnCode: req.body.hsnCode,
      gstRate: req.body.gstRate,
      thumbnail,
      tags,
      attributes: attributes || [],
      productType: pType,
      virtual,
      downloadable,
      status: finalStatus,
      isActive: finalStatus === "active",
      isFeatured: isFeatured !== undefined ? isFeatured : false,
      metaTitle,
      metaDescription,
      externalUrl: pType === "external" ? finalExternalUrl : null,
      buttonText:
        pType === "external" ? finalButtonText || "Buy product" : "Buy Now",
      catalog_visibility,
      global_unique_id,
      total_sales,
      downloads,
      download_limit,
      download_expiry,
      weight,
      weightUnit: req.body.weightUnit || "kg",
      dimensions,
      reviews_allowed: finalReviewsAllowed,
      grouped_products: grouped_products || [],
      related_ids,
      upsell_ids,
      cross_sell_ids,
      purchase_note:
        pType === "grouped" || pType === "external" ? null : purchase_note,
      default_attributes,
      menu_order: finalMenuOrder,
      manage_stock: finalManageStock,
    };

    let product;
    if (pType === "simple") {
      product = new SimpleProduct({
        ...commonData,
      });
    } else if (pType === "grouped") {
      product = new GroupedProduct({
        ...commonData,
      });
    } else if (pType === "external") {
      product = new ExternalProduct({
        ...commonData,
      });
    } else if (pType === "variable") {
      product = new VariableProduct({
        ...commonData,
      });
    } else {
      product = new Product({
        ...commonData,
      });
    }

    let inventoryRecord = null;
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const createdProduct = await product.save({ session });

      const isVirtualOrDownloadable = !!(
        createdProduct.virtual || createdProduct.downloadable
      );
      const isManageStockEnabled =
        inventory?.manageStock === true || finalManageStock === true;
      if (
        (pType === "simple" || pType === "variable") &&
        (inventory || isManageStockEnabled) &&
        !isVirtualOrDownloadable
      ) {
        const invQuantity =
          inventory?.stockQuantity !== undefined
            ? inventory.stockQuantity
            : req.body.stockQuantity !== undefined
              ? parseInt(req.body.stockQuantity, 10)
              : req.body.quantity !== undefined
                ? parseInt(req.body.quantity, 10)
                : 0;
        const invBackorders =
          inventory?.backorders !== undefined
            ? inventory.backorders
            : req.body.backorders || "no";

        inventoryRecord = new Inventory({
          productId: createdProduct._id,
          manageStock: isManageStockEnabled,
          stockQuantity: isNaN(invQuantity) ? 0 : invQuantity,
          reservedQuantity: 0,
          backorders: ["no", "notify", "yes"].includes(invBackorders)
            ? invBackorders
            : "no",
        });
        await inventoryRecord.save({ session });
      }

      const isAdmin = !!(req.admin || req.user?.role === "admin");
      let productImgs = [];

      // 1. If thumbnail is explicitly passed
      if (thumbnail) {
        let thumbUrl = null;
        if (typeof thumbnail === "string") {
          // Check if thumbnail matches an existing ProductImage by ID or URL
          if (mongoose.Types.ObjectId.isValid(thumbnail)) {
            const existingThumb =
              await ProductImage.findById(thumbnail).session(session);
            if (existingThumb) {
              if (existingThumb.status === "failed") {
                throw new Error(
                  `Thumbnail image failed processing and cannot be attached to a product.`,
                );
              }
              // Validate seller ownership
              if (
                !isAdmin &&
                existingThumb.sellerId &&
                existingThumb.sellerId.toString() !== sellerId.toString()
              ) {
                throw new Error(
                  `Unauthorized: thumbnail image belongs to another seller.`,
                );
              }
              existingThumb.productId = createdProduct._id;
              existingThumb.sellerId = sellerId;
              existingThumb.status = "active"; // Promoted to active upon attachment!
              existingThumb.isPrimary = true;
              existingThumb.sortOrder = 0;
              await existingThumb.save({ session });
              productImgs.push(existingThumb);
              thumbUrl = existingThumb.url;
            }
          }
          if (!thumbUrl) {
            // Check by URL
            const existingByUrl = await ProductImage.findOne({
              url: thumbnail,
            }).session(session);
            if (existingByUrl) {
              if (existingByUrl.status === "failed") {
                throw new Error(
                  `Thumbnail image failed processing and cannot be attached to a product.`,
                );
              }
              if (
                !isAdmin &&
                existingByUrl.sellerId &&
                existingByUrl.sellerId.toString() !== sellerId.toString()
              ) {
                throw new Error(
                  `Unauthorized: thumbnail image belongs to another seller.`,
                );
              }
              existingByUrl.productId = createdProduct._id;
              existingByUrl.sellerId = sellerId;
              existingByUrl.status = "active"; // Promoted to active upon attachment!
              existingByUrl.isPrimary = true;
              existingByUrl.sortOrder = 0;
              await existingByUrl.save({ session });
              productImgs.push(existingByUrl);
            } else {
              const thumbImage = new ProductImage({
                productId: createdProduct._id,
                variantId: null,
                sellerId,
                url: thumbnail,
                altText: "Thumbnail",
                sortOrder: 0,
                isPrimary: true,
                status: "active",
              });
              await thumbImage.save({ session });
              productImgs.push(thumbImage);
            }
          }
        }
      }

      // 2. Combine images and videos lists
      const additionalMedia = [
        ...(Array.isArray(images) ? images : []),
        ...(Array.isArray(videos) ? videos : []),
      ];

      for (let i = 0; i < additionalMedia.length; i++) {
        const item = additionalMedia[i];
        const mediaData = typeof item === "string" ? { url: item } : item || {};
        const imageId = mediaData.imageId || mediaData._id;

        // If imageId is provided, validate ProductImage._id, ownership, and promote to active
        if (imageId && mongoose.Types.ObjectId.isValid(imageId)) {
          const existingImg =
            await ProductImage.findById(imageId).session(session);
          if (!existingImg) {
            throw new Error(`Referenced imageId '${imageId}' not found`);
          }
          if (existingImg.status === "failed") {
            throw new Error(
              `Image '${imageId}' failed processing and cannot be attached to a product.`,
            );
          }
          if (
            !isAdmin &&
            existingImg.sellerId &&
            existingImg.sellerId.toString() !== sellerId.toString()
          ) {
            throw new Error(
              `Unauthorized: image '${imageId}' belongs to another seller.`,
            );
          }

          existingImg.productId = createdProduct._id;
          existingImg.sellerId = sellerId;
          existingImg.status = "active"; // Promoted to active upon attachment!
          if (mediaData.altText !== undefined)
            existingImg.altText = mediaData.altText;
          if (mediaData.sortOrder !== undefined) {
            const so = parseInt(mediaData.sortOrder, 10);
            if (!isNaN(so)) existingImg.sortOrder = so;
          }
          if (mediaData.isPrimary !== undefined) {
            existingImg.isPrimary =
              mediaData.isPrimary === true || mediaData.isPrimary === "true";
          }
          await existingImg.save({ session });
          productImgs.push(existingImg);
          continue;
        }

        if (!mediaData.url) continue;

        // Check if an existing ProductImage matches this URL
        const existingByUrl = await ProductImage.findOne({
          url: mediaData.url,
        }).session(session);
        if (existingByUrl) {
          if (existingByUrl.status === "failed") {
            throw new Error(
              `Image with URL '${mediaData.url}' failed processing and cannot be attached to a product.`,
            );
          }
          if (
            !isAdmin &&
            existingByUrl.sellerId &&
            existingByUrl.sellerId.toString() !== sellerId.toString()
          ) {
            throw new Error(
              `Unauthorized: image with URL '${mediaData.url}' belongs to another seller.`,
            );
          }
          // If already bound to another product, do not hijack it; create a new record
          if (
            existingByUrl.productId &&
            existingByUrl.productId.toString() !== createdProduct._id.toString()
          ) {
            const sharedImg = new ProductImage({
              productId: createdProduct._id,
              variantId: null,
              sellerId,
              url: mediaData.url,
              altText: mediaData.altText || existingByUrl.altText || null,
              sortOrder:
                mediaData.sortOrder !== undefined
                  ? parseInt(mediaData.sortOrder, 10)
                  : i + 1,
              isPrimary: !thumbnail && i === 0,
              status: "active",
            });
            await sharedImg.save({ session });
            productImgs.push(sharedImg);
          } else {
            existingByUrl.productId = createdProduct._id;
            existingByUrl.sellerId = sellerId;
            existingByUrl.status = "active"; // Promoted to active upon attachment!
            if (mediaData.altText !== undefined)
              existingByUrl.altText = mediaData.altText;
            await existingByUrl.save({ session });
            productImgs.push(existingByUrl);
          }
          continue;
        }

        // Backward compatibility: Create active image record for direct URL
        const isPrimary = !thumbnail && i === 0;
        const sortOrder =
          mediaData.sortOrder !== undefined
            ? parseInt(mediaData.sortOrder, 10)
            : i + 1;

        const newMedia = new ProductImage({
          productId: createdProduct._id,
          variantId: null,
          sellerId,
          url: mediaData.url,
          altText: mediaData.altText || null,
          sortOrder: isNaN(sortOrder) ? i + 1 : sortOrder,
          isPrimary: isPrimary,
          status: "active",
        });
        await newMedia.save({ session });
        productImgs.push(newMedia);
      }

      let savedVariants = [];
      // Process variants if this is a variable product and variants are provided
      if (pType === "variable" && variants && Array.isArray(variants)) {
        for (const variantData of variants) {
          const {
            sku: vSku,
            attributes: vAttr,
            anevixPrice,
            anevix_price,
            mrpPrice,
            mrp_price,
            salePrice,
            sale_price,
            prePaidDiscount: vPrePaidDiscount,
            hsnCode: vHsnCode,
            gstRate: vGstRate,
            manage_stock: vManageStock,
            stockQuantity: vStockQuantity,
            backorders: vBackorders,
            thumbnail: vThumbnail,
            status: vStatus,
            isActive: vIsActive,
            description: vDescription,
            weight: vWeight,
            dimensions: vDimensions,
            images: vImages,
          } = variantData;

          const vPriceExtracted = anevixPrice !== undefined ? anevixPrice : anevix_price;
          const vMrpExtracted = mrpPrice !== undefined ? mrpPrice : mrp_price;
          const vSaleExtracted = salePrice !== undefined ? salePrice : sale_price;

          const normalizedAttributes = vAttr ? vAttr.map(a => ({ name: a.name, value: a.value || a.option })) : [];
          
          let resolvedPrice = undefined;
          if (vPriceExtracted !== undefined && vPriceExtracted !== "") resolvedPrice = Number(vPriceExtracted);
          else if (vMrpExtracted !== undefined && vMrpExtracted !== "") resolvedPrice = Number(vMrpExtracted);
          else if (finalPrice) resolvedPrice = Number(finalPrice);
          
          const vFinalSalePrice = vSaleExtracted !== undefined && vSaleExtracted !== "" ? Number(vSaleExtracted) : undefined;
          const vFinalStatus = vStatus ? mapStatusToDb(vStatus) : finalStatus;

          const variant = new ProductVariant({
            productId: createdProduct._id,
            sku: vSku || `VAR-${createdProduct._id}-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
            attributes: normalizedAttributes,
            price: resolvedPrice,
            salePrice: vFinalSalePrice,
            prePaidDiscount: vPrePaidDiscount !== undefined ? Number(vPrePaidDiscount) : 0,
            hsnCode: vHsnCode,
            gstRate: vGstRate,
            thumbnail: vThumbnail,
            status: vFinalStatus,
            isActive: vIsActive !== undefined ? vIsActive : (vFinalStatus !== "archived"),
            description: vDescription,
            weight: vWeight,
            dimensions: vDimensions,
          });

          const createdVariant = await variant.save({ session });
          
          let vInventoryDetails = null;
          if (vManageStock !== undefined || vStockQuantity !== undefined || vBackorders !== undefined) {
            const vInventory = new Inventory({
              variantId: createdVariant._id,
              manageStock: vManageStock !== undefined ? vManageStock : true,
              stockQuantity: vStockQuantity || 0,
              backorders: vBackorders || "no"
            });
            vInventoryDetails = await vInventory.save({ session });
          }

          const createdVariantImages = [];
          if (vImages && Array.isArray(vImages)) {
            for (let j = 0; j < vImages.length; j++) {
              const imgVal = vImages[j];
              const imgUrl = typeof imgVal === 'string' ? imgVal : imgVal.url;
              if (!imgUrl) continue;

              const vImg = new ProductImage({
                productId: createdProduct._id,
                variantId: createdVariant._id,
                sellerId,
                url: imgUrl,
                isPrimary: j === 0,
                sortOrder: j,
                status: "active"
              });
              await vImg.save({ session });
              createdVariantImages.push(vImg);
            }
          }

          // Format variant response immediately for returning
          const vObj = createdVariant.toObject();
          if (vInventoryDetails) {
            vObj.inventory = vInventoryDetails;
            vObj.stockQuantity = vInventoryDetails.stockQuantity;
            vObj.manage_stock = vInventoryDetails.manageStock;
            vObj.backorders = vInventoryDetails.backorders;
          }
          if (createdVariantImages.length > 0) {
            vObj.images = createdVariantImages.map(img => ({ url: img.url, isPrimary: img.isPrimary, _id: img._id }));
          }
          savedVariants.push(vObj);
        }
      }

      // COMMIT TRANSACTION ONLY AFTER ALL IMAGES AND PRODUCTS SUCCEED
      await session.commitTransaction();
      session.endSession();

      const finalResponse = formatProductResponse(createdProduct, productImgs, inventoryRecord);
      if (savedVariants.length > 0) {
        finalResponse.variants = savedVariants;
      }

      res.status(201).json(finalResponse);
    } catch (saveError) {
      await session.abortTransaction();
      session.endSession();
      throw saveError;
    }
  } catch (error) {
    if (error.code === 11000) {
      if (error.keyPattern?.slug)
        return res
          .status(400)
          .json({ message: "Product with this slug already exists" });
      if (error.keyPattern?.sku)
        return res
          .status(400)
          .json({ message: "Product with this SKU already exists" });
      return res.status(400).json({ message: "Duplicate key error" });
    }
    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map((val) => val.message);
      return res
        .status(400)
        .json({ message: "Validation Error", errors: messages });
    }
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

// @desc    Get all products
// @route   GET /api/products
// @access  Public
const getProducts = async (req, res) => {
  try {
    const isAdmin = req.admin || req.user?.role === "admin";
    const query = {};

    // If not admin, check if it's a seller request (from Seller Portal)
    const isOwner = !!req.seller;
    
    if (!isAdmin && !isOwner) {
      query.status = "active";
      query.isActive = true;
    } else {
      // If admin or owner, they can filter by status
      if (req.query.status) {
        query.status = req.query.status;
      }
    }

    // Filter by seller if provided
    if (
      req.query.sellerId &&
      mongoose.Types.ObjectId.isValid(req.query.sellerId)
    ) {
      query.sellerId = req.query.sellerId;
    } else if (
      req.query.seller &&
      mongoose.Types.ObjectId.isValid(req.query.seller)
    ) {
      query.sellerId = req.query.seller;
    }

    if (req.query.batchId) {
      query.batchId = req.query.batchId;
    }

    // Force sellerId to the logged-in seller if they are a seller and no sellerId is explicitly queried
    // If batchId is provided, we trust the batchId to scope the query.
    if (isOwner && !isAdmin && !query.sellerId && !query.batchId) {
      query.sellerId = req.seller.id;
    }

    const products = await Product.find(query)
      .populate("brandId", "name slug")
      .populate("cat_id", "cat_name name")
      .populate("categoryId", "name")
      .lean()
      .sort({ createdAt: -1 });

    const ProductImage = require("../../models/product/ProductImage");
    const productIds = products.map((p) => p._id);
    const allImages = await ProductImage.find({
      productId: { $in: productIds },
      status: "active",
    })
      .sort({ sortOrder: 1, createdAt: 1 })
      .lean();

    const Inventory = require("../../models/inventory/Inventory");
    const allInventories = await Inventory.find({
      productId: { $in: productIds },
    }).lean();

    const formattedProducts = [];
    for (const product of products) {
      const prodImages = allImages.filter(
        (img) => img.productId.toString() === product._id.toString(),
      );
      const prodInventory =
        allInventories.find(
          (inv) => inv.productId.toString() === product._id.toString(),
        ) || null;
      const formatted = formatProductResponse(
        product,
        prodImages,
        prodInventory,
      );

      // Manually fetch missing category names
      if (formatted.sub_cat_id && !formatted.sub_category_name) {
        let subCat = await mongoose
          .model("ProductCategory")
          .findById(formatted.sub_cat_id)
          .lean()
          .catch(() => null);
        if (!subCat)
          subCat = await mongoose
            .model("ProductCategory")
            .findById(formatted.sub_cat_id)
            .lean()
            .catch(() => null);
        formatted.sub_category_name = subCat
          ? subCat.sub_cat_name || subCat.cat_name || subCat.name
          : null;
      }

      if (formatted.nested_sub_cat_id && !formatted.nested_sub_category_name) {
        let nestedCat = await mongoose
          .model("ProductCategory")
          .findById(formatted.nested_sub_cat_id)
          .lean()
          .catch(() => null);
        if (!nestedCat)
          nestedCat = await mongoose
            .model("ProductCategory")
            .findById(formatted.nested_sub_cat_id)
            .lean()
            .catch(() => null);
        formatted.nested_sub_category_name = nestedCat
          ? nestedCat.name || nestedCat.cat_name
          : null;
      }

      if (product.productType === "variable") {
        const ProductVariant = require("../../models/product/ProductVariant");
        const variants = await ProductVariant.find({ productId: product._id }).lean();
        
        const variantIds = variants.map(v => v._id);
        const variantInventories = await Inventory.find({ variantId: { $in: variantIds } }).lean();
        
        for (const v of variants) {
          const vInventory = variantInventories.find(inv => inv.variantId && inv.variantId.toString() === v._id.toString());
          if (vInventory) {
            v.inventory = vInventory;
            v.stock_quantity = vInventory.quantity;
            v.manage_stock = vInventory.manageStock;
            v.backorders = vInventory.backorders;
          }
        }
        
        formatted.variants = variants;
      }

      formattedProducts.push(formatted);
    }

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

    const product = await Product.findById(id)
      .populate("brandId", "name slug")
      .populate("cat_id", "cat_name name")
      .populate("categoryId", "name")
      .lean();

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    const isAdmin = req.admin;
    if (!isAdmin && (product.status !== "active" || !product.isActive)) {
      if (product.status === "pending") {
        return res.status(403).json({ message: "Product is pending admin approval" });
      } else if (product.status === "draft") {
        return res.status(403).json({ message: "Product is currently a draft" });
      }
      return res.status(404).json({ message: "Product not found" }); // Hide inactive from public
    }

    const images = await ProductImage.find({
      productId: product._id,
      status: "active",
    })
      .sort({ sortOrder: 1, createdAt: 1 })
      .lean();

    let inventoryRecord = null;
    if (
      (product.productType === "simple" ||
        product.productType === "variable") &&
      !product.virtual &&
      !product.downloadable
    ) {
      inventoryRecord = await Inventory.findOne({
        productId: product._id,
      }).lean();
    }

    const formattedProduct = formatProductResponse(
      product,
      images,
      inventoryRecord,
    );

    if (formattedProduct.sub_cat_id && !formattedProduct.sub_category_name) {
      let subCat = await mongoose
        .model("ProductCategory")
        .findById(formattedProduct.sub_cat_id)
        .lean()
        .catch(() => null);
      if (!subCat)
        subCat = await mongoose
          .model("ProductCategory")
          .findById(formattedProduct.sub_cat_id)
          .lean()
          .catch(() => null);
      formattedProduct.sub_category_name = subCat
        ? subCat.sub_cat_name || subCat.cat_name || subCat.name
        : null;
    }

    if (
      formattedProduct.nested_sub_cat_id &&
      !formattedProduct.nested_sub_category_name
    ) {
      let nestedCat = await mongoose
        .model("ProductCategory")
        .findById(formattedProduct.nested_sub_cat_id)
        .lean()
        .catch(() => null);
      if (!nestedCat)
        nestedCat = await mongoose
          .model("ProductCategory")
          .findById(formattedProduct.nested_sub_cat_id)
          .lean()
          .catch(() => null);
      formattedProduct.nested_sub_category_name = nestedCat
        ? nestedCat.name || nestedCat.cat_name
        : null;
    }

    res.json(formattedProduct);
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
    let {
      name,
      slug,
      description,
      shortDescription,
      sellerId,
      categoryId,
      cat_id,
      sub_cat_id,
      nested_sub_cat_id,
      brandId,
      sku,
      price,
      regular_price,
      salePrice,
      sale_price,
      currency,
      thumbnail,
      images,
      tags,
      attributes,
      productType,
      virtual,
      downloadable,
      status,
      isActive,
      isFeatured,
      metaTitle,
      metaDescription,
      externalUrl,
      external_url,
      buttonText,
      button_text,
      catalog_visibility,
      global_unique_id,
      date_on_sale_from,
      date_on_sale_to,
      total_sales,
      downloads,
      download_limit,
      download_expiry,
      tax_status,
      tax_class,
      sold_individually,
      manage_stock,
      manageStock,
      weight,
      dimensions,
      shipping_class,
      shipping_class_id,
      reviews_allowed,
      enable_reviews,
      grouped_products,
      related_ids,
      upsell_ids,
      cross_sell_ids,
      purchase_note,
      default_attributes,
      menu_order,
      inventory, // NEW
      quantity,
      stock_quantity,
      backorders,
      low_stock_threshold,
      lowStockThreshold,
    } = req.body;

    const finalExternalUrl =
      externalUrl !== undefined ? externalUrl : external_url;
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
    const checkSalePrice =
      finalSalePrice !== undefined ? finalSalePrice : product.salePrice;

    if (Number(checkPrice) < 0) {
      return res.status(400).json({ message: "Price cannot be negative" });
    }
    if (checkSalePrice !== undefined && checkSalePrice !== null && checkSalePrice !== "") {
      if (Number(checkSalePrice) < 0) {
        return res
          .status(400)
          .json({ message: "Sale price cannot be negative" });
      }
      if (
        checkPrice !== undefined &&
        checkPrice !== null &&
        checkPrice !== "" &&
        Number(checkSalePrice) >= Number(checkPrice)
      ) {
        return res
          .status(400)
          .json({
            message: "Sale price must be strictly less than the regular price",
          });
      }
    }

    // If changing from variable to simple/other, prevent if active variants exist
    if (
      product.productType === "variable" &&
      productType &&
      productType !== "variable"
    ) {
      try {
        const ProductVariant = require("../../models/product/ProductVariant");
        const activeVariants = await ProductVariant.findOne({
          productId: id,
          status: { $ne: "archived" },
        });
        if (activeVariants) {
          return res
            .status(400)
            .json({
              message:
                "Cannot change product type from variable because it has active variants. Archive variants first.",
            });
        }
      } catch (e) {
        // ProductVariant might not be fully initialized yet, ignore
      }
    }

    const checkProductType =
      productType !== undefined ? productType : product.productType;

    if (
      checkProductType !== "variable" &&
      checkProductType !== "simple" &&
      checkProductType !== "grouped" &&
      checkProductType !== "external" &&
      attributes !== undefined &&
      Array.isArray(attributes) &&
      attributes.length > 0
    ) {
      return res
        .status(400)
        .json({
          message:
            "attributes are only allowed for simple, variable, grouped, or external products",
        });
    }

    const checkExternalUrl =
      finalExternalUrl !== undefined ? finalExternalUrl : product.externalUrl;
    if (checkProductType === "external") {
      if (
        !checkExternalUrl ||
        typeof checkExternalUrl !== "string" ||
        !/^https?:\/\/.+/.test(checkExternalUrl)
      ) {
        return res
          .status(400)
          .json({
            message: "A valid externalUrl is required for external products",
          });
      }
    } else {
      if (finalExternalUrl !== undefined && finalExternalUrl !== null) {
        return res
          .status(400)
          .json({
            message: "externalUrl is only allowed for external products",
          });
      }
    }

    const checkAttributes =
      attributes !== undefined ? attributes : product.attributes;
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
          if (existingProduct.slug === slug)
            return res
              .status(400)
              .json({ message: "Product with this slug already exists" });
          if (existingProduct.sku === sku)
            return res
              .status(400)
              .json({ message: "Product with this SKU already exists" });
        }
      }
    }

    // Validate relationships if changed

    if (categoryId && categoryId !== product.categoryId?.toString()) {
      if (!mongoose.Types.ObjectId.isValid(categoryId))
        return res.status(400).json({ message: "Invalid categoryId format" });
      const category = await Category.findById(categoryId);
      if (!category)
        return res.status(404).json({ message: "Category not found" });
    }

    const finalCatId =
      cat_id !== undefined ? cat_id : product.cat_id?.toString();
    const finalSubCatId =
      sub_cat_id !== undefined ? sub_cat_id : product.sub_cat_id?.toString();
    const finalNestedSubCatId =
      nested_sub_cat_id !== undefined
        ? nested_sub_cat_id
        : product.nested_sub_cat_id?.toString();

    if (
      cat_id !== undefined ||
      sub_cat_id !== undefined ||
      nested_sub_cat_id !== undefined
    ) {
      if (!finalCatId || !finalSubCatId) {
        return res
          .status(400)
          .json({
            message: "Category hierarchy (cat_id, sub_cat_id) is required",
          });
      }
      if (
        !mongoose.Types.ObjectId.isValid(finalCatId) ||
        !mongoose.Types.ObjectId.isValid(finalSubCatId) ||
        (finalNestedSubCatId &&
          !mongoose.Types.ObjectId.isValid(finalNestedSubCatId))
      ) {
        return res.status(400).json({ message: "Invalid category ID format" });
      }
      const cat = await ProductCategory.findById(finalCatId);
      if (!cat)
        return res.status(404).json({ message: "ProductCategory not found" });

      let subCat = null;
      if (finalSubCatId) {
        subCat = await ProductCategory.findById(finalSubCatId);
        if (!subCat)
          return res.status(404).json({ message: "ProductCategory not found" });
        if (subCat.parentId?.toString() !== finalCatId)
          return res
            .status(400)
            .json({ message: "sub_cat_id does not belong to cat_id" });
      }

      let nestedCat = null;
      if (finalNestedSubCatId) {
        nestedCat = await ProductCategory.findById(finalNestedSubCatId);
        if (!nestedCat)
          return res.status(404).json({ message: "ProductCategory not found" });
        if (nestedCat.parentId?.toString() !== finalSubCatId)
          return res
            .status(400)
            .json({
              message:
                "nested_sub_cat_id does not belong to the specified sub_cat_id",
            });
      }
    }

    if (brandId && brandId !== product.brandId?.toString()) {
      if (!mongoose.Types.ObjectId.isValid(brandId))
        return res.status(400).json({ message: "Invalid brandId format" });
      const brand = await Brand.findById(brandId);
      if (!brand) return res.status(404).json({ message: "Brand not found" });
    }

    if (sellerId && sellerId !== product.sellerId?.toString()) {
      if (!mongoose.Types.ObjectId.isValid(sellerId))
        return res.status(400).json({ message: "Invalid sellerId format" });
      let seller = await B2CSellerProfile.findById(sellerId);
      if (!seller) {
        seller = await SellerRegistration.findById(sellerId);
        if (!seller)
          return res.status(404).json({ message: "Seller profile not found" });
      }
    }

    product.name = name !== undefined ? name : product.name;
    product.slug = slug !== undefined ? slug : product.slug;
    product.description =
      description !== undefined ? description : product.description;
    product.shortDescription =
      shortDescription !== undefined
        ? shortDescription
        : product.shortDescription;
    product.sellerId = sellerId !== undefined ? sellerId : product.sellerId;
    product.categoryId =
      categoryId !== undefined ? categoryId : product.categoryId;
    if (
      cat_id !== undefined ||
      sub_cat_id !== undefined ||
      nested_sub_cat_id !== undefined
    ) {
      product.cat_id = finalCatId;
      product.sub_cat_id = finalSubCatId;
      product.nested_sub_cat_id = finalNestedSubCatId;
    }
    product.brandId = brandId !== undefined ? (brandId === "" ? null : brandId) : product.brandId;
    product.sku = sku !== undefined ? sku : product.sku;
    if (
      product.productType === "simple" ||
      product.productType === "external"
    ) {
      product.regularPrice =
        finalPrice !== undefined ? finalPrice : product.regularPrice;
    } else {
      product.price = finalPrice !== undefined ? finalPrice : product.price;
    }
    product.salePrice =
      finalSalePrice !== undefined ? finalSalePrice : product.salePrice;
    product.currency = currency !== undefined ? currency : product.currency;
    product.thumbnail = thumbnail !== undefined ? thumbnail : product.thumbnail;
    product.tags = tags !== undefined ? tags : product.tags;
    product.attributes =
      attributes !== undefined ? attributes : product.attributes;
    product.productType =
      productType !== undefined ? productType : product.productType;
    product.virtual = virtual !== undefined ? virtual : product.virtual;
    product.downloadable =
      downloadable !== undefined ? downloadable : product.downloadable;

    const isAdmin = req.admin || req.user?.role === "admin";

    if (!isAdmin) {
      let finalStatus = status !== undefined ? mapStatusToDb(status) : product.status;
      if (finalStatus !== "draft") {
        finalStatus = "pending";
      }
      product.status = finalStatus;
      product.isActive = false;
    } else {
      if (status !== undefined) {
        let finalStatus = mapStatusToDb(status);
        product.status = finalStatus;
        product.isActive = finalStatus === "active";
      } else {
        product.isActive = isActive !== undefined ? isActive : product.isActive;
      }
    }

    product.isFeatured =
      isFeatured !== undefined ? isFeatured : product.isFeatured;
    product.metaTitle = metaTitle !== undefined ? metaTitle : product.metaTitle;
    product.metaDescription =
      metaDescription !== undefined ? metaDescription : product.metaDescription;

    if (catalog_visibility !== undefined)
      product.catalog_visibility = catalog_visibility;
    if (global_unique_id !== undefined)
      product.global_unique_id = global_unique_id;
    if (date_on_sale_from !== undefined)
      product.date_on_sale_from = date_on_sale_from;
    if (date_on_sale_to !== undefined)
      product.date_on_sale_to = date_on_sale_to;
    if (total_sales !== undefined) product.total_sales = total_sales;
    if (downloads !== undefined) product.downloads = downloads;
    if (download_limit !== undefined) product.download_limit = download_limit;
    if (download_expiry !== undefined)
      product.download_expiry = download_expiry;
    if (tax_status !== undefined) product.tax_status = tax_status;
    if (tax_class !== undefined) product.tax_class = tax_class;
    if (sold_individually !== undefined)
      product.sold_individually = sold_individually;
    const finalManageStock =
      manage_stock !== undefined ? manage_stock : manageStock;
    if (finalManageStock !== undefined)
      product.manage_stock = !!finalManageStock;
    if (weight !== undefined) product.weight = weight;
    if (dimensions !== undefined) product.dimensions = dimensions;
    if (shipping_class !== undefined) product.shipping_class = shipping_class;
    if (shipping_class_id !== undefined)
      product.shipping_class_id = shipping_class_id;
    const finalReviewsAllowed =
      reviews_allowed !== undefined ? reviews_allowed : enable_reviews;
    if (finalReviewsAllowed !== undefined)
      product.reviews_allowed = !!finalReviewsAllowed;
    if (related_ids !== undefined) product.related_ids = related_ids;
    if (grouped_products !== undefined) {
      if (Array.isArray(grouped_products)) {
        for (const gpId of grouped_products) {
          if (!mongoose.Types.ObjectId.isValid(gpId)) {
            return res
              .status(400)
              .json({ message: "Invalid ObjectId in grouped_products" });
          }
        }
      }
      product.grouped_products = grouped_products;
    }
    if (upsell_ids !== undefined) product.upsell_ids = upsell_ids;
    if (cross_sell_ids !== undefined) product.cross_sell_ids = cross_sell_ids;
    if (purchase_note !== undefined)
      product.purchase_note =
        checkProductType === "grouped" || checkProductType === "external"
          ? null
          : purchase_note;
    if (default_attributes !== undefined)
      product.default_attributes = default_attributes;
    if (menu_order !== undefined)
      product.menu_order = parseInt(menu_order, 10) || 0;

    if (checkProductType === "external") {
      product.externalUrl =
        finalExternalUrl !== undefined ? finalExternalUrl : product.externalUrl;
      product.buttonText =
        finalButtonText !== undefined
          ? finalButtonText
          : product.buttonText || "Buy product";
    } else {
      product.externalUrl = null;
      product.buttonText = "Buy Now";
    }

    let inventoryRecord = null;
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const updatedProduct = await product.save({ session });

      const isVirtualOrDownloadable = !!(
        updatedProduct.virtual || updatedProduct.downloadable
      );
      if (
        (checkProductType === "simple" || checkProductType === "variable") &&
        !isVirtualOrDownloadable
      ) {
        inventoryRecord = await Inventory.findOne({ productId: id }).session(
          session,
        );
        const isManageStockRequested =
          inventory && inventory.manageStock !== undefined
            ? inventory.manageStock
            : finalManageStock !== undefined
              ? finalManageStock
              : undefined;
        if (
          inventory ||
          isManageStockRequested !== undefined ||
          quantity !== undefined ||
          stock_quantity !== undefined ||
          backorders !== undefined ||
          low_stock_threshold !== undefined ||
          lowStockThreshold !== undefined
        ) {
          const invQuantity =
            inventory?.quantity !== undefined
              ? inventory.quantity
              : quantity !== undefined
                ? parseInt(quantity, 10)
                : stock_quantity !== undefined
                  ? parseInt(stock_quantity, 10)
                  : undefined;
          const invLowStock =
            inventory?.lowStockThreshold !== undefined
              ? inventory.lowStockThreshold
              : low_stock_threshold !== undefined
                ? parseInt(low_stock_threshold, 10)
                : lowStockThreshold !== undefined
                  ? parseInt(lowStockThreshold, 10)
                  : undefined;
          const invBackorders =
            inventory?.backorders !== undefined
              ? inventory.backorders
              : backorders;
          const invManageStock =
            inventory?.manageStock !== undefined
              ? inventory.manageStock
              : isManageStockRequested;

          if (inventoryRecord) {
            if (invManageStock !== undefined)
              inventoryRecord.manageStock = !!invManageStock;
            if (invQuantity !== undefined && !isNaN(invQuantity))
              inventoryRecord.quantity = invQuantity;
            if (invLowStock !== undefined && !isNaN(invLowStock))
              inventoryRecord.lowStockThreshold = invLowStock;
            if (
              invBackorders !== undefined &&
              ["no", "notify", "yes"].includes(invBackorders)
            )
              inventoryRecord.backorders = invBackorders;
            await inventoryRecord.save({ session });
          } else if (invManageStock) {
            inventoryRecord = new Inventory({
              productId: id,
              manageStock: true,
              quantity:
                !isNaN(invQuantity) && invQuantity !== undefined
                  ? invQuantity
                  : 0,
              reservedQuantity: 0,
              lowStockThreshold:
                !isNaN(invLowStock) && invLowStock !== undefined
                  ? invLowStock
                  : 2,
              backorders:
                invBackorders && ["no", "notify", "yes"].includes(invBackorders)
                  ? invBackorders
                  : "no",
            });
            await inventoryRecord.save({ session });
          }
        }
      }

      await session.commitTransaction();
      session.endSession();

      if (images && Array.isArray(images)) {
        const isAdmin = !!(req.admin || req.user?.role === "admin");
        const activeRetainedImageIds = [];

        for (let i = 0; i < images.length; i++) {
          const item = images[i];
          const imgData = typeof item === "string" ? { url: item } : item || {};
          const imageId = imgData.imageId || imgData._id;
          const isPrimary =
            imgData.isPrimary === true || imgData.isPrimary === "true";
          const sortOrder =
            imgData.sortOrder !== undefined
              ? parseInt(imgData.sortOrder, 10)
              : i;

          if (isPrimary) {
            await ProductImage.updateMany(
              { productId: updatedProduct._id, variantId: null },
              { isPrimary: false },
            );
          }

          // If imageId is provided, validate ProductImage._id, ownership, and promote to active
          if (imageId && mongoose.Types.ObjectId.isValid(imageId)) {
            const existingImg = await ProductImage.findById(imageId);
            if (!existingImg) {
              return res
                .status(404)
                .json({ message: `Referenced imageId '${imageId}' not found` });
            }
            if (existingImg.status === "failed") {
              return res
                .status(400)
                .json({
                  message: `Image '${imageId}' failed processing and cannot be attached to a product.`,
                });
            }
            if (
              !isAdmin &&
              existingImg.sellerId &&
              existingImg.sellerId.toString() !==
                updatedProduct.sellerId.toString()
            ) {
              return res
                .status(403)
                .json({
                  message: `Unauthorized: image '${imageId}' belongs to another seller.`,
                });
            }

            existingImg.productId = updatedProduct._id;
            existingImg.sellerId = updatedProduct.sellerId;
            existingImg.status = "active"; // Promoted to active upon attachment!
            if (imgData.altText !== undefined)
              existingImg.altText = imgData.altText;
            existingImg.sortOrder = isNaN(sortOrder) ? i : sortOrder;
            existingImg.isPrimary = isPrimary;
            await existingImg.save();
            activeRetainedImageIds.push(existingImg._id);
            continue;
          }

          if (!imgData.url) continue;

          // Check if an existing ProductImage matches this URL
          const existingByUrl = await ProductImage.findOne({
            url: imgData.url,
          });
          if (existingByUrl) {
            if (existingByUrl.status === "failed") {
              return res
                .status(400)
                .json({
                  message: `Image with URL '${imgData.url}' failed processing and cannot be attached to a product.`,
                });
            }
            if (
              !isAdmin &&
              existingByUrl.sellerId &&
              existingByUrl.sellerId.toString() !==
                updatedProduct.sellerId.toString()
            ) {
              return res
                .status(403)
                .json({
                  message: `Unauthorized: image with URL '${imgData.url}' belongs to another seller.`,
                });
            }
            existingByUrl.productId = updatedProduct._id;
            existingByUrl.sellerId = updatedProduct.sellerId;
            existingByUrl.status = "active"; // Promoted to active upon attachment!
            if (imgData.altText !== undefined)
              existingByUrl.altText = imgData.altText;
            existingByUrl.sortOrder = isNaN(sortOrder) ? i : sortOrder;
            existingByUrl.isPrimary = isPrimary;
            await existingByUrl.save();
            activeRetainedImageIds.push(existingByUrl._id);
            continue;
          }

          const newImage = new ProductImage({
            productId: updatedProduct._id,
            variantId: null,
            sellerId: updatedProduct.sellerId,
            url: imgData.url,
            altText: imgData.altText || null,
            sortOrder: isNaN(sortOrder) ? i : sortOrder,
            isPrimary: isPrimary,
            status: "active",
          });
          await newImage.save();
          activeRetainedImageIds.push(newImage._id);
        }

        // Safe detach of omitted images:
        // ProductImages previously attached to this product (at base level, variantId: null)
        // that are not in the new activeRetainedImageIds are detached (productId: null, status: "temporary")
        // so they don't remain attached to the gallery and can be safely cleaned up after 7 days
        await ProductImage.updateMany(
          {
            productId: updatedProduct._id,
            variantId: null,
            _id: { $nin: activeRetainedImageIds },
          },
          {
            $set: {
              productId: null,
              status: "temporary",
              isPrimary: false,
            },
          },
        );
      }

      const productImgs = await ProductImage.find({
        productId: updatedProduct._id,
      })
        .sort({ sortOrder: 1, createdAt: 1 })
        .lean();

      res.json(
        formatProductResponse(updatedProduct, productImgs, inventoryRecord),
      );
    } catch (saveError) {
      await session.abortTransaction();
      session.endSession();
      throw saveError;
    }
  } catch (error) {
    if (error.code === 11000) {
      if (error.keyPattern?.slug)
        return res
          .status(400)
          .json({ message: "Product with this slug already exists" });
      if (error.keyPattern?.sku)
        return res
          .status(400)
          .json({ message: "Product with this SKU already exists" });
      return res.status(400).json({ message: "Duplicate key error" });
    }
    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map((val) => val.message);
      return res
        .status(400)
        .json({ message: "Validation Error", errors: messages });
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
        const ProductVariant = require("../../models/product/ProductVariant");
        const path = require("path");
        const {
          safelyDeleteDiskFile,
        } = require("../../utils/productImageCleanup");

        // 1. Delete associated variants and simple inventory
        await ProductVariant.deleteMany({ productId: id });
        await Inventory.deleteMany({ productId: id });

        // 2. Cascade delete all ProductImage records associated with this product
        const associatedImages = await ProductImage.find({
          productId: id,
        }).lean();
        if (associatedImages.length > 0) {
          const imageIds = associatedImages.map((img) => img._id);
          await ProductImage.deleteMany({ _id: { $in: imageIds } });

          // 3. Safely delete physical files from uploads/ if not referenced by any other record
          const uploadDir = path.resolve(process.cwd(), "uploads");
          for (const imgDoc of associatedImages) {
            let filename = imgDoc.fileName;
            if (!filename && imgDoc.url && imgDoc.url.includes("/uploads/")) {
              try {
                const parsed = new URL(imgDoc.url);
                filename = path.basename(parsed.pathname);
              } catch (_) {
                filename = path.basename(
                  imgDoc.url.split("/uploads/").pop().split("?")[0],
                );
              }
            }

            if (filename && typeof filename === "string") {
              const sanitizedFilename = path.basename(filename);
              const resolvedPath = path.resolve(uploadDir, sanitizedFilename);

              if (resolvedPath.startsWith(uploadDir + path.sep)) {
                // Ensure no other record references this file or URL
                const isStillReferenced = await ProductImage.exists({
                  _id: { $nin: imageIds },
                  $or: [{ fileName: sanitizedFilename }, { url: imgDoc.url }],
                });

                if (!isStillReferenced) {
                  await safelyDeleteDiskFile(resolvedPath);
                }
              }
            }
          }
        }
      } catch (e) {
        console.error("[deleteProduct] Error during cascading cleanup:", e);
      }

      return res.json({
        message:
          "Product, variants, inventory, and images permanently deleted from database",
      });
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

// @desc    Get form fields, schema and variables by product type
// @route   GET /api/products/schema/:productType OR GET /api/products/schema
// @access  Public / Passive Admin
const {
  getSupportedProductTypes,
  getProductSchema,
  PRODUCT_TYPE_SCHEMAS,
} = require("../../config/productTypeConfig");

const getProductTypeSchema = async (req, res) => {
  try {
    const requestedType =
      req.params.productType || req.query.type || req.query.productType;

    // If no type specified, return only the list of supported product types (no variables)
    if (!requestedType) {
      return res.json({
        success: true,
        productTypes: getSupportedProductTypes(),
      });
    }

    const schema = getProductSchema(requestedType);
    if (!schema) {
      return res.status(400).json({
        message: `Invalid productType: '${requestedType}'. Supported types are: simple, grouped, external, variable`,
        availableTypes: ["simple", "grouped", "external", "variable"],
      });
    }

    res.json({
      success: true,
      data: schema,
    });
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

// @desc    Get all products for Admin (Includes full seller details & approval status)
// @route   GET /api/products/admin/all
// @access  Admin
const getAdminProducts = async (req, res) => {
  try {
    const query = {};
    if (req.query.status) {
      query.status = req.query.status;
    }
    if (req.query.productId) {
      if (!mongoose.Types.ObjectId.isValid(req.query.productId)) {
        return res.status(400).json({ success: false, message: "Invalid product ID" });
      }
      query._id = req.query.productId;
    }

    const products = await Product.find(query)
      .populate("brandId", "name slug")
      .lean()
      .sort({ createdAt: -1 });

    const ProductImage = require("../../models/product/ProductImage");
    const productIds = products.map((p) => p._id);
    const allImages = await ProductImage.find({
      productId: { $in: productIds },
      status: "active",
    })
      .sort({ sortOrder: 1, createdAt: 1 })
      .lean();

    const Inventory = require("../../models/inventory/Inventory");
    const allInventories = await Inventory.find({
      productId: { $in: productIds },
    }).lean();

    const formattedProducts = [];
    for (const product of products) {
      const prodImages = allImages.filter(
        (img) => img.productId.toString() === product._id.toString(),
      );
      const prodInventory =
        allInventories.find(
          (inv) => inv.productId.toString() === product._id.toString(),
        ) || null;
      const formatted = formatProductResponse(
        product,
        prodImages,
        prodInventory,
      );

      // Manually fetch missing category names
      if (formatted.cat_id && !formatted.category_name) {
        let cat = await mongoose
          .model("ProductCategory")
          .findById(formatted.cat_id)
          .lean()
          .catch(() => null);
        if (!cat)
          cat = await mongoose
            .model("Category")
            .findById(formatted.cat_id)
            .lean()
            .catch(() => null);
        formatted.category_name = cat ? cat.cat_name || cat.name : null;
      }

      if (formatted.sub_cat_id && !formatted.sub_category_name) {
        let subCat = await mongoose
          .model("ProductCategory")
          .findById(formatted.sub_cat_id)
          .lean()
          .catch(() => null);
        if (!subCat)
          subCat = await mongoose
            .model("ProductCategory")
            .findById(formatted.sub_cat_id)
            .lean()
            .catch(() => null);
        formatted.sub_category_name = subCat
          ? subCat.sub_cat_name || subCat.cat_name || subCat.name
          : null;
      }

      if (formatted.nested_sub_cat_id && !formatted.nested_sub_category_name) {
        let nestedCat = await mongoose
          .model("ProductCategory")
          .findById(formatted.nested_sub_cat_id)
          .lean()
          .catch(() => null);
        if (!nestedCat)
          nestedCat = await mongoose
            .model("ProductCategory")
            .findById(formatted.nested_sub_cat_id)
            .lean()
            .catch(() => null);
        formatted.nested_sub_category_name = nestedCat
          ? nestedCat.name || nestedCat.cat_name
          : null;
      }

      // Admin specific fields
      formatted.approval_status = product.approval?.status || product.status;
      formatted.approval = product.approval || {
        status: product.status,
        submitted_at: product.createdAt,
        reviewed_by: null,
        reviewed_at: null,
        rejection_reason: null,
        review_note: null,
      };

      // Manually resolve sellerId against B2CSellerProfile and SellerRegistration
      if (product.sellerId) {
        let seller = await mongoose
          .model("B2CSellerProfile")
          .findById(product.sellerId)
          .lean()
          .catch(() => null);
        if (!seller)
          seller = await mongoose
            .model("SellerRegistration")
            .findById(product.sellerId)
            .lean()
            .catch(() => null);

        if (seller) {
          let user = null;
          if (seller.userId) {
            user = await mongoose
              .model("User")
              .findById(seller.userId)
              .lean()
              .catch(() => null);
          }

          const sellerName =
            seller.storeName ||
            seller.companyName ||
            (user
              ? `${user.firstName || ""} ${user.lastName || ""}`.trim()
              : "Unknown Seller");
          const sellerEmail =
            user && user.email ? user.email : seller.email || "N/A";
          const sellerPhone =
            user && user.phone ? user.phone : seller.phone || "N/A";

          formatted.seller = {
            id: seller._id?.toString(),
            name: sellerName || "Unknown Seller",
            email: sellerEmail,
            phone: sellerPhone,
            status: seller.status || seller.onboardingStatus || "unknown",
          };
        } else {
          formatted.seller = {
            id: product.sellerId.toString(),
            name: "Unknown Seller",
            email: "N/A",
            status: "unknown",
          };
        }
      } else {
        formatted.seller = {
          id: null,
          name: "Unknown Seller",
          email: "N/A",
          status: "unknown",
        };
      }

      if (product.productType === "variable") {
        const ProductVariant = require("../../models/product/ProductVariant");
        const variants = await ProductVariant.find({ productId: product._id }).lean();
        
        const variantIds = variants.map(v => v._id);
        const variantInventories = await Inventory.find({ variantId: { $in: variantIds } }).lean();
        
        // Include variant inventory
        for (const v of variants) {
          const vInventory = variantInventories.find(inv => inv.variantId && inv.variantId.toString() === v._id.toString());
          if (vInventory) {
            v.inventory = vInventory;
            v.stock_quantity = vInventory.quantity;
            v.manage_stock = vInventory.manageStock;
            v.backorders = vInventory.backorders;
          }
        }
        
        formatted.variants = variants;
      }

      formattedProducts.push(formatted);
    }

    res.json(formattedProducts);
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

// @desc    Get product upload batches (for QC UI)
// @route   GET /api/products/batches/list
// @access  Public/Seller
const getProductBatches = async (req, res) => {
  try {
    const { sellerId, seller } = req.query;
    const finalSellerId = sellerId || seller;

    if (!finalSellerId) {
      return res.status(400).json({ message: "sellerId is required" });
    }

    const mongoose = require("mongoose");
    const Product = require("../../models/product/Product");
    const ProductImage = require("../../models/product/ProductImage");

    // Aggregate products by batchId
    const matchCondition = { sellerId: new mongoose.Types.ObjectId(finalSellerId) };
    
    if (req.query.uploadType === 'bulk') {
      matchCondition.batchId = { $regex: /^BULK-/ };
    } else if (req.query.uploadType === 'single') {
      matchCondition.$or = [
        { batchId: { $exists: false } },
        { batchId: null },
        { batchId: { $not: /^BULK-/ } }
      ];
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const pipeline = [
      { $match: matchCondition },
      {
        $group: {
          _id: {
            $cond: [{ $ifNull: ["$batchId", false] }, "$batchId", "$sku"],
          },
          productsCount: { $sum: 1 },
          createdAt: { $max: "$createdAt" },
          firstProductId: { $first: "$_id" },
          category: { $first: "$categoryId" },
          cat_id: { $first: "$cat_id" },
          status: { $first: "$status" },
          rejection_reason: { $first: "$approval.rejection_reason" },
          isActive: { $min: "$isActive" },
          activeCount: { $sum: { $cond: [{ $eq: ["$status", "active"] }, 1, 0] } },
          rejectedCount: { $sum: { $cond: [{ $eq: ["$status", "rejected"] }, 1, 0] } },
          pendingCount: { $sum: { $cond: [{ $eq: ["$status", "pending"] }, 1, 0] } },
        },
      },
      { $sort: { createdAt: -1 } },
    ];

    const batches = await Product.aggregate([
      ...pipeline,
      { $skip: skip },
      { $limit: limit }
    ]);

    const countResult = await Product.aggregate([...pipeline, { $count: "total" }]);
    const total = countResult.length > 0 ? countResult[0].total : 0;

    const ProductCategory = require("../../models/category/ProductCategory");
    const Category = require("../../models/category/Category");

    // Format for frontend
    const result = await Promise.all(
      batches.map(async (b) => {
        // Find one image for thumbnail
        const img = await ProductImage.findOne({
          productId: b.firstProductId,
        }).lean();

        // Resolve category name
        let catName = "Uncategorized";
        const catId = b.cat_id || b.category;
        if (catId) {
          try {
            const cat =
              (await ProductCategory.findById(catId).lean()) ||
              (await Category.findById(catId).lean());
            if (cat) catName = cat.cat_name || cat.name || "Uncategorized";
          } catch (err) {}
        }

        let computedStatus = b.status;
        if (b.rejectedCount > 0) {
          computedStatus = "rejected";
        } else if (b.activeCount === b.productsCount) {
          computedStatus = "active";
        } else if (b.pendingCount > 0) {
          computedStatus = "pending";
        }

        return {
          id: b.firstProductId,
          fileId: b._id,
          productsCount: b.productsCount,
          activeCount: b.activeCount,
          rejectedCount: b.rejectedCount,
          pendingCount: b.pendingCount,
          createdDateRaw: b.createdAt,
          isActive: b.isActive,
          status: computedStatus,
          rejection_reason: b.rejection_reason || null,
          category: catName,
          image: img ? img.url : "https://via.placeholder.com/150",
          imageCount: img ? 1 : 0,
        };
      }),
    );

    res.json({
      data: result,
      pagination: {
        totalItems: total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

// @desc    Admin API to verify and approve/reject a product
// @route   PUT /api/products/admin/:id/verify
// @access  Admin
const verifyProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, reason } = req.body;

    if (!["active", "rejected"].includes(status)) {
      return res
        .status(400)
        .json({ message: "Status must be active or rejected" });
    }

    const Product = require("../../models/product/Product");
    const product = await Product.findById(id);

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    product.status = status;
    product.isActive = status === "active";

    if (status === "rejected" && reason) {
      // Could log or store reason
      console.log(`Product ${id} rejected. Reason: ${reason}`);
    }

    await product.save();

    res.json({
      success: true,
      message: `Product successfully ${status}`,
      product,
    });
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

// @desc    Reject product
// @route   PUT /api/products/admin/:id/reject
// @access  Private/Admin
const rejectProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const { rejection_reason, reason } = req.body;

    const finalReason = rejection_reason || reason;

    if (!finalReason) {
      return res.status(400).json({ message: "rejection_reason is required" });
    }

    const Product = require("../../models/product/Product");
    const product = await Product.findById(id);

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    product.status = "rejected";
    product.isActive = false;

    if (!product.approval) {
      product.approval = {};
    }
    product.approval.status = "rejected";
    product.approval.rejection_reason = finalReason;
    product.approval.reviewed_by = req.admin?.id || req.user?.id || null;
    product.approval.reviewed_at = new Date();

    await product.save();

    res.json({
      success: true,
      message: "Product successfully rejected",
      product,
    });
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

// @desc    Download Excel template for bulk upload
// @route   GET /api/products/template/download
// @access  Public
const downloadProductTemplate = async (req, res) => {
  try {
    const xlsx = require("xlsx");

    const headings = [
      "Name*",
      "Product Type (simple/variable/grouped)*",
      "Short Description",
      "Full Description",
      "Category*",
      "Sub Category",
      "Nested Sub Category",
      "Brand",
      "SKU*",
      "Regular Price*",
      "Sale Price",
      "Sale Start Date (YYYY-MM-DD)",
      "Sale End Date (YYYY-MM-DD)",
      "Manage Stock (Yes/No)",
      "Stock Quantity",
      "Low Stock Threshold",
      "Backorders (no/notify/yes)",
      "Sold Individually (Yes/No)",
      "Weight (g)",
      "Length (cm)",
      "Width (cm)",
      "Height (cm)",
      "Shipping Class",
      "Tax Status (taxable/none)",
      "Tax Class",
      "Virtual (Yes/No)",
      "Downloadable (Yes/No)",
      "Download Limit",
      "Download Expiry (days)",
      "Enable Reviews (Yes/No)",
      "Purchase Note",
      "Tags (comma separated)",
      "Image URLs (comma separated)",
      "Video URLs (comma separated)",
      "Attributes (Format: Name1:Value1,Value2|Name2:Value1)",
    ];

    const ws = xlsx.utils.aoa_to_sheet([headings]);
    const csvStr = xlsx.utils.sheet_to_csv(ws);

    res.setHeader(
      "Content-Disposition",
      'attachment; filename="product_upload_template.csv"',
    );
    res.setHeader("Content-Type", "text/csv");

    res.send(csvStr);
  } catch (error) {
    console.error("Template generation error:", error);
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

// @desc    Upload bulk products via Excel
// @route   POST /api/products/bulk-upload
// @access  Seller / Admin
const bulkUploadProducts = async (req, res) => {
  try {
    if (!req.file && !req.files) {
      return res.status(400).json({ message: "Please upload an excel file" });
    }

    const file =
      req.file || (req.files && req.files.length > 0 ? req.files[0] : null);
    if (!file) {
      return res.status(400).json({ message: "No file found in request" });
    }

    const xlsx = require("xlsx");
    let workbook;
    if (file.path) {
      workbook = xlsx.readFile(file.path);
    } else if (file.buffer) {
      workbook = xlsx.read(file.buffer, { type: "buffer" });
    } else {
      return res.status(400).json({ message: "Invalid file format uploaded" });
    }

    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(sheet);

    if (!data || data.length === 0) {
      return res.status(400).json({ message: "Uploaded file is empty" });
    }

    const Product = require("../../models/product/Product");
    const sellerId = req.seller
      ? req.seller.id
      : req.admin
        ? req.admin.id
        : req.body.sellerId;

    // Create a batch ID
    const batchId = "BULK-" + Date.now();

    const errors = [];
    const parsedProducts = [];
    const extractedSkus = new Set();
    const duplicateSkusInSheet = new Set();

    const mongoose = require("mongoose");
    const ProductCategory = require("../../models/category/ProductCategory");
    const Brand = require("../../models/brand/Brand");

    const getVal = (row, keyPattern) => {
      const normalize = (str) => str.toLowerCase().replace(/[\*\s_\-]/g, "");
      const normalizedPattern = normalize(keyPattern);

      const key = Object.keys(row).find((k) => {
        const normalizedKey = normalize(k);

        if (normalizedKey === normalizedPattern) return true;

        // Fallbacks for common aliases
        if (normalizedPattern === "category") {
          if (["catid", "categoryid", "categories"].includes(normalizedKey))
            return true;
          return (
            normalizedKey.includes("category") &&
            !normalizedKey.includes("sub") &&
            !normalizedKey.includes("nested")
          );
        }

        if (normalizedPattern === "subcategory") {
          if (["subcatid", "subcat"].includes(normalizedKey)) return true;
        }

        return false;
      });
      return key ? row[key] : null;
    };

    // PASS 1: Parse and validate all rows
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      try {
        const name = getVal(row, "Name");
        const sku = getVal(row, "SKU");
        let price = getVal(row, "Regular Price");
        if (!price && getVal(row, "Price")) price = getVal(row, "Price");

        if (!name) {
          errors.push(`Row ${i + 2}: Missing required field (Name)`);
          continue;
        }

        const skuStr = sku ? String(sku) : "SKU-" + Date.now() + "-" + i;
        if (sku) {
          if (extractedSkus.has(skuStr)) {
            duplicateSkusInSheet.add(skuStr);
          } else {
            extractedSkus.add(skuStr);
          }
        }

        let catIdStr = getVal(row, "Category");
        let subCatIdStr = getVal(row, "Sub Category");
        let nestedSubCatIdStr = getVal(row, "Nested Sub Category");
        let brandIdStr = getVal(row, "Brand");

        if (!catIdStr) {
          const availableCols = Object.keys(row).join(", ");
          errors.push(
            `Row ${i + 2}: Missing required field (Category). Found columns: [${availableCols}]`,
          );
          continue;
        }

        let cat_id = null;
        if (mongoose.Types.ObjectId.isValid(catIdStr)) {
          cat_id = catIdStr;
        } else {
          const cat = await ProductCategory.findOne({
            cat_name: new RegExp("^" + catIdStr + "$", "i"),
          });
          if (cat) cat_id = cat._id;
        }

        if (!cat_id) {
          errors.push(
            `Row ${i + 2}: Invalid Category ID or Name (${catIdStr})`,
          );
          continue;
        }

        let sub_cat_id = null;
        if (subCatIdStr) {
          if (mongoose.Types.ObjectId.isValid(subCatIdStr)) {
            sub_cat_id = subCatIdStr;
          } else {
            const subCat = await ProductCategory.findOne({
              cat_name: new RegExp("^" + subCatIdStr + "$", "i"),
              parentId: cat_id,
            });
            if (subCat) sub_cat_id = subCat._id;
          }
        }

        let nested_sub_cat_id = null;
        if (nestedSubCatIdStr) {
          if (mongoose.Types.ObjectId.isValid(nestedSubCatIdStr)) {
            nested_sub_cat_id = nestedSubCatIdStr;
          } else {
            const nestedCat = await ProductCategory.findOne({
              cat_name: new RegExp("^" + nestedSubCatIdStr + "$", "i"),
              parentId: sub_cat_id,
            });
            if (nestedCat) nested_sub_cat_id = nestedCat._id;
          }
        }

        let brandId = null;
        if (brandIdStr) {
          if (mongoose.Types.ObjectId.isValid(brandIdStr)) {
            brandId = brandIdStr;
          } else {
            const brand = await Brand.findOne({
              name: new RegExp("^" + brandIdStr + "$", "i"),
            });
            if (brand) brandId = brand._id;
          }
        }

        const newProductData = {
          name: String(name),
          slug:
            String(name)
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, "-") +
            "-" +
            Date.now() +
            "-" +
            i,
          sku: skuStr,
          price: price ? Number(price) : 0,
          regularPrice: price ? Number(price) : 0,
          salePrice: getVal(row, "Sale Price")
            ? Number(getVal(row, "Sale Price"))
            : null,
          shortDescription: getVal(row, "Short Description")
            ? String(getVal(row, "Short Description"))
            : "",
          description: getVal(row, "Full Description")
            ? String(getVal(row, "Full Description"))
            : "",
          sellerId: sellerId,
          batchId: batchId,
          status: "pending",
          approval: { status: "pending" },
          isActive: false,
          productType: getVal(row, "Product Type")
            ? String(getVal(row, "Product Type"))
                .split("/")[0]
                .trim()
                .toLowerCase()
            : "simple",
          manage_stock: getVal(row, "Manage Stock")
            ? String(getVal(row, "Manage Stock")).toLowerCase() === "yes"
            : false,
          weight: getVal(row, "Weight") ? Number(getVal(row, "Weight")) : null,
          cat_id: cat_id,
          sub_cat_id: sub_cat_id,
          nested_sub_cat_id: nested_sub_cat_id,
          categoryId: cat_id,
          brandId: brandId,
          tags: getVal(row, "Tags")
            ? String(getVal(row, "Tags"))
                .split(",")
                .map((t) => t.trim())
            : [],
        };

        // Create an instance to run mongoose schema validation, but don't save yet
        const tempProduct = new Product(newProductData);
        const validationError = tempProduct.validateSync();
        if (validationError) {
          errors.push(
            `Row ${i + 2}: Validation failed - ${validationError.message}`,
          );
          continue;
        }

        parsedProducts.push(newProductData);
      } catch (err) {
        errors.push(`Row ${i + 2}: Failed to process - ${err.message}`);
      }
    }

    if (duplicateSkusInSheet.size > 0) {
      errors.push(
        `Duplicate SKUs found within the uploaded file: ${[...duplicateSkusInSheet].join(", ")}`,
      );
    }

    if (extractedSkus.size > 0) {
      const existingProducts = await Product.find({
        sku: { $in: [...extractedSkus] },
      })
        .select("sku")
        .lean();
      if (existingProducts.length > 0) {
        const existingSkus = existingProducts.map((p) => p.sku);
        errors.push(
          `The following SKUs already exist in the database: ${existingSkus.join(", ")}`,
        );
      }
    }

    const fs = require("fs");

    // If any error exists, do not upload anything
    if (errors.length > 0) {
      if (file.path && fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }
      return res.status(400).json({
        message: "Bulk upload failed validation. No products were uploaded.",
        successCount: 0,
        errorCount: errors.length,
        errors: errors,
        batchId: batchId,
      });
    }

    // PASS 2: Save all products
    const createdProducts = [];
    for (let i = 0; i < parsedProducts.length; i++) {
      const newProduct = new Product(parsedProducts[i]);
      await newProduct.save();
      createdProducts.push(newProduct);
    }

    // Optionally delete temp file
    if (file.path && fs.existsSync(file.path)) {
      fs.unlinkSync(file.path);
    }

    res.status(200).json({
      message: "Bulk upload processed successfully",
      successCount: createdProducts.length,
      errorCount: 0,
      errors: [],
      batchId: batchId,
    });
  } catch (error) {
    console.error("Bulk upload error:", error);
    res
      .status(500)
      .json({ message: "Server Error processing file", error: error.message });
  }
};

module.exports = {
  rejectProduct,
  createProduct,
  verifyProduct,
  getAdminProducts,
  getProducts,
  getProductBatches,
  getProductById,
  updateProduct,
  deleteProduct,
  getProductTypeSchema,
  downloadProductTemplate,
  bulkUploadProducts,
};
