const ProductVariant = require("../models/ProductVariant");
const Product = require("../models/Product");
const Inventory = require("../models/Inventory");
const ProductImage = require("../models/ProductImage");
const mongoose = require("mongoose");

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
    if (!vAttr.name || (!vAttr.value && !vAttr.option)) {
      return "Variant attribute name and option/value are required.";
    }
    const val = vAttr.value || vAttr.option;
    providedAttrMap.set(vAttr.name.toLowerCase(), val.toLowerCase());
  }

  for (const [pName, pOptions] of parentAttrMap.entries()) {
    if (!providedAttrMap.has(pName)) {
      return `Missing attribute: ${pName} is required for this product.`;
    }
    const providedVal = providedAttrMap.get(pName);
    if (!pOptions.includes(providedVal)) {
      return `Invalid option '${providedVal}' for attribute '${pName}'. Available options: ${pOptions.join(", ")}.`;
    }
  }

  for (const vName of providedAttrMap.keys()) {
    if (!parentAttrMap.has(vName)) {
      return `Invalid attribute: ${vName} is not defined on the parent product.`;
    }
  }

  return null;
};

const mapStatusToApi = (status) => {
  if (status === "active") return "publish";
  if (status === "archived") return "private";
  return status; 
};

const mapApiToStatus = (status) => {
  if (status === "publish") return "active";
  if (status === "private") return "archived";
  return status;
};

const formatVariantResponse = (variant, inventory, images, product) => {
  const v = variant.toObject ? variant.toObject() : variant;
  const p = product.toObject ? product.toObject() : product;
  const inv = inventory ? (inventory.toObject ? inventory.toObject() : inventory) : null;
  const imgs = images || [];

  const regularPrice = v.price;
  const salePrice = v.salePrice;
  let effectivePrice = regularPrice;
  let onSale = false;

  const now = new Date();
  if (salePrice !== null && salePrice !== undefined) {
    let validSale = true;
    if (v.dateOnSaleFrom && new Date(v.dateOnSaleFrom) > now) validSale = false;
    if (v.dateOnSaleTo && new Date(v.dateOnSaleTo) < now) validSale = false;
    if (validSale) {
      effectivePrice = salePrice;
      onSale = true;
    }
  }

  const stockQuantity = inv ? (inv.quantity || 0) : null;
  const reserved = inv ? (inv.reservedQuantity || 0) : 0;
  const manageStock = inv ? !!inv.manageStock : false;
  const backorders = inv ? (inv.backorders || "no") : "no";
  const available = stockQuantity !== null ? (stockQuantity - reserved) : 0;

  let stockStatus = "instock";
  if (!manageStock) {
    stockStatus = "instock";
  } else if (available > 0) {
    stockStatus = "instock";
  } else if (backorders === "yes" || backorders === "notify") {
    stockStatus = "onbackorder";
  } else {
    stockStatus = "outofstock";
  }

  const backordersAllowed = backorders !== "no";
  const backordered = available <= 0 && backordersAllowed;

  const apiStatus = mapStatusToApi(v.status);
  const purchasable = apiStatus === "publish" && (p.status === "active" || p.isActive === true);

  const primaryImage = imgs.find(i => i.isPrimary) || imgs[0] || (v.thumbnail ? { src: v.thumbnail } : null);
  const gallery = imgs.filter(i => i._id && i._id.toString() !== (primaryImage?._id?.toString())).map(i => i._id.toString());

  return {
    id: v._id.toString(),
    date_created: v.createdAt,
    date_created_gmt: v.createdAt,
    date_modified: v.updatedAt,
    date_modified_gmt: v.updatedAt,
    description: v.description || "",
    permalink: p.slug ? `/${p.slug}?variant=${v._id}` : null,
    sku: v.sku,
    global_unique_id: v.globalUniqueId,
    price: effectivePrice?.toString(),
    regular_price: regularPrice?.toString(),
    sale_price: salePrice?.toString(),
    date_on_sale_from: v.dateOnSaleFrom,
    date_on_sale_from_gmt: v.dateOnSaleFrom,
    date_on_sale_to: v.dateOnSaleTo,
    date_on_sale_to_gmt: v.dateOnSaleTo,
    on_sale: onSale,
    status: apiStatus,
    purchasable,
    virtual: !!v.virtual,
    downloadable: !!v.downloadable,
    downloads: v.downloads || [],
    download_limit: v.downloadLimit !== undefined ? v.downloadLimit : -1,
    download_expiry: v.downloadExpiry !== undefined ? v.downloadExpiry : -1,
    tax_status: v.taxStatus || "taxable",
    tax_class: v.taxClass || null,
    manage_stock: manageStock,
    stock_quantity: stockQuantity,
    stock_status: stockStatus,
    backorders: backorders,
    backorders_allowed: backordersAllowed,
    backordered: backordered,
    weight: v.weight || null,
    dimensions: v.dimensions || { length: "", width: "", height: "" },
    shipping_class: v.shippingClass || null,
    shipping_class_id: null,
    image: primaryImage ? { src: primaryImage.url || primaryImage.src } : null,
    gallery_image_ids: gallery,
    attributes: v.attributes.map(a => ({ name: a.name, option: a.value || a.option })),
    menu_order: v.menuOrder || 0,
    meta_data: v.metaData || []
  };
};

const createVariant = async (req, res) => {
  try {
    const { productId } = req.params;
    let { 
      sku, attributes, price, regular_price, salePrice, sale_price, thumbnail, status, isActive,
      global_unique_id, description, date_on_sale_from, date_on_sale_to,
      virtual, downloadable, downloads, download_limit, download_expiry,
      tax_status, tax_class, weight, dimensions, shipping_class, menu_order, meta_data,
      manage_stock, stock_quantity, backorders
    } = req.body;

    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({ message: "Invalid product ID format" });
    }

    const finalPrice = regular_price !== undefined ? regular_price : price;
    const finalSalePrice = sale_price !== undefined ? sale_price : salePrice;

    if (!sku || !attributes || finalPrice === undefined) {
      return res.status(400).json({ message: "sku, attributes, and regular_price are required" });
    }

    if (finalPrice < 0) return res.status(400).json({ message: "Price cannot be negative" });
    if (finalSalePrice !== undefined && finalSalePrice !== null) {
      if (finalSalePrice < 0) return res.status(400).json({ message: "Sale price cannot be negative" });
      if (finalSalePrice >= finalPrice) return res.status(400).json({ message: "Sale price must be strictly less than price" });
    }

    const parentProduct = await Product.findById(productId);
    if (!parentProduct) return res.status(404).json({ message: "Parent product not found" });
    if (parentProduct.productType !== "variable") return res.status(400).json({ message: "Cannot add variants to a non-variable product" });

    const attrError = validateVariantAttributes(attributes, parentProduct);
    if (attrError) return res.status(400).json({ message: attrError });

    const existingProductSku = await Product.findOne({ sku });
    if (existingProductSku) return res.status(400).json({ message: "This SKU is already used by a base product" });

    const normalizedAttributes = attributes.map(a => ({ name: a.name, value: a.value || a.option }));
    
    const existingVariants = await ProductVariant.find({ productId });
    for (const ev of existingVariants) {
      if (ev.attributes.length === normalizedAttributes.length) {
        let isMatch = true;
        for (const attr of normalizedAttributes) {
          const matched = ev.attributes.some(
            (ea) => ea.name.toLowerCase() === attr.name.toLowerCase() && ea.value.toLowerCase() === attr.value.toLowerCase()
          );
          if (!matched) {
            isMatch = false;
            break;
          }
        }
        if (isMatch) return res.status(400).json({ message: "A variant with this exact attribute combination already exists" });
      }
    }

    const finalStatus = status ? mapApiToStatus(status) : "active";

    const variant = new ProductVariant({
      productId,
      sku,
      attributes: normalizedAttributes,
      price: finalPrice,
      salePrice: finalSalePrice,
      thumbnail,
      status: finalStatus,
      isActive: isActive !== undefined ? isActive : (finalStatus !== "archived"),
      globalUniqueId: global_unique_id,
      description,
      dateOnSaleFrom: date_on_sale_from,
      dateOnSaleTo: date_on_sale_to,
      virtual, downloadable, downloads, 
      downloadLimit: download_limit, 
      downloadExpiry: download_expiry,
      taxStatus: tax_status, taxClass: tax_class,
      weight, dimensions, shippingClass: shipping_class,
      menuOrder: menu_order, metaData: meta_data
    });

    const createdVariant = await variant.save();

    let inventory = null;
    if (manage_stock !== undefined || stock_quantity !== undefined || backorders !== undefined) {
      inventory = new Inventory({
        variantId: createdVariant._id,
        manageStock: manage_stock !== undefined ? manage_stock : true,
        quantity: stock_quantity || 0,
        backorders: backorders || "no"
      });
      await inventory.save();
    }

    res.status(201).json(formatVariantResponse(createdVariant, inventory, [], parentProduct));
  } catch (error) {
    if (error.code === 11000) return res.status(400).json({ message: "A variant with this SKU already exists" });
    if (error.name === 'ValidationError') return res.status(400).json({ message: "Validation Error", errors: Object.values(error.errors).map(v => v.message) });
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

const getVariants = async (req, res) => {
  try {
    const { productId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(productId)) return res.status(400).json({ message: "Invalid product ID format" });

    const parentProduct = await Product.findById(productId);
    if (!parentProduct) return res.status(404).json({ message: "Product not found" });

    const isAdmin = req.admin || req.user?.role === "admin";
    const query = { productId };

    if (!isAdmin) {
      query.status = "active";
      query.isActive = true;
      if (parentProduct.status !== "active") return res.json([]);
    }

    const variants = await ProductVariant.find(query).sort({ menuOrder: 1, createdAt: -1 });
    const variantIds = variants.map(v => v._id);

    const inventories = await Inventory.find({ variantId: { $in: variantIds } });
    const images = await ProductImage.find({ variantId: { $in: variantIds }, status: "active" }).sort({ sortOrder: 1 });

    const invMap = {};
    inventories.forEach(i => invMap[i.variantId.toString()] = i);
    const imgMap = {};
    images.forEach(i => {
      const vid = i.variantId.toString();
      if (!imgMap[vid]) imgMap[vid] = [];
      imgMap[vid].push(i);
    });

    const response = variants.map(v => formatVariantResponse(v, invMap[v._id.toString()], imgMap[v._id.toString()], parentProduct));
    res.json(response);
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

const updateVariant = async (req, res) => {
  try {
    const { variantId } = req.params;
    let { 
      sku, attributes, price, regular_price, salePrice, sale_price, thumbnail, status, isActive,
      global_unique_id, description, date_on_sale_from, date_on_sale_to,
      virtual, downloadable, downloads, download_limit, download_expiry,
      tax_status, tax_class, weight, dimensions, shipping_class, menu_order, meta_data,
      manage_stock, stock_quantity, backorders
    } = req.body;

    if (!mongoose.Types.ObjectId.isValid(variantId)) return res.status(400).json({ message: "Invalid variant ID format" });

    const variant = await ProductVariant.findById(variantId);
    if (!variant) return res.status(404).json({ message: "Variant not found" });

    const parentProduct = await Product.findById(variant.productId);
    if (!parentProduct) return res.status(404).json({ message: "Parent product not found" });

    if (attributes) {
      const normalizedAttributes = attributes.map(a => ({ name: a.name, value: a.value || a.option }));
      const attrError = validateVariantAttributes(normalizedAttributes, parentProduct);
      if (attrError) return res.status(400).json({ message: attrError });

      const existingVariants = await ProductVariant.find({ productId: variant.productId, _id: { $ne: variant._id } });
      for (const ev of existingVariants) {
        if (ev.attributes.length === normalizedAttributes.length) {
          let isMatch = true;
          for (const attr of normalizedAttributes) {
            const matched = ev.attributes.some(
              (ea) => ea.name.toLowerCase() === attr.name.toLowerCase() && ea.value.toLowerCase() === attr.value.toLowerCase()
            );
            if (!matched) {
              isMatch = false;
              break;
            }
          }
          if (isMatch) return res.status(400).json({ message: "Another variant with this exact attribute combination already exists" });
        }
      }
      variant.attributes = normalizedAttributes;
    }

    if (sku && sku !== variant.sku) {
      const existingProductSku = await Product.findOne({ sku });
      if (existingProductSku) return res.status(400).json({ message: "This SKU is already used by a base product" });
      variant.sku = sku;
    }

    const finalPrice = regular_price !== undefined ? regular_price : (price !== undefined ? price : variant.price);
    const finalSalePrice = sale_price !== undefined ? sale_price : (salePrice !== undefined ? salePrice : variant.salePrice);

    if (finalPrice < 0) return res.status(400).json({ message: "Price cannot be negative" });
    if (finalSalePrice !== undefined && finalSalePrice !== null) {
      if (finalSalePrice < 0) return res.status(400).json({ message: "Sale price cannot be negative" });
      if (finalSalePrice >= finalPrice) return res.status(400).json({ message: "Sale price must be strictly less than price" });
    }

    variant.price = finalPrice;
    variant.salePrice = finalSalePrice;

    if (thumbnail !== undefined) variant.thumbnail = thumbnail;
    if (status !== undefined) {
      variant.status = mapApiToStatus(status);
      if (isActive === undefined) variant.isActive = variant.status !== "archived";
    }
    if (isActive !== undefined) variant.isActive = isActive;
    
    if (global_unique_id !== undefined) variant.globalUniqueId = global_unique_id;
    if (description !== undefined) variant.description = description;
    if (date_on_sale_from !== undefined) variant.dateOnSaleFrom = date_on_sale_from;
    if (date_on_sale_to !== undefined) variant.dateOnSaleTo = date_on_sale_to;
    if (virtual !== undefined) variant.virtual = virtual;
    if (downloadable !== undefined) variant.downloadable = downloadable;
    if (downloads !== undefined) variant.downloads = downloads;
    if (download_limit !== undefined) variant.downloadLimit = download_limit;
    if (download_expiry !== undefined) variant.downloadExpiry = download_expiry;
    if (tax_status !== undefined) variant.taxStatus = tax_status;
    if (tax_class !== undefined) variant.taxClass = tax_class;
    if (weight !== undefined) variant.weight = weight;
    if (dimensions !== undefined) variant.dimensions = dimensions;
    if (shipping_class !== undefined) variant.shippingClass = shipping_class;
    if (menu_order !== undefined) variant.menuOrder = menu_order;
    if (meta_data !== undefined) variant.metaData = meta_data;

    const updatedVariant = await variant.save();

    let inventory = await Inventory.findOne({ variantId: updatedVariant._id });
    if (manage_stock !== undefined || stock_quantity !== undefined || backorders !== undefined) {
      if (!inventory) inventory = new Inventory({ variantId: updatedVariant._id });
      if (manage_stock !== undefined) inventory.manageStock = manage_stock;
      if (stock_quantity !== undefined) inventory.quantity = stock_quantity;
      if (backorders !== undefined) inventory.backorders = backorders;
      await inventory.save();
    }

    const images = await ProductImage.find({ variantId: updatedVariant._id, status: "active" }).sort({ sortOrder: 1 });
    res.json(formatVariantResponse(updatedVariant, inventory, images, parentProduct));
  } catch (error) {
    if (error.code === 11000) return res.status(400).json({ message: "A variant with this SKU already exists" });
    if (error.name === 'ValidationError') return res.status(400).json({ message: "Validation Error", errors: Object.values(error.errors).map(v => v.message) });
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

const deleteVariant = async (req, res) => {
  try {
    const { variantId } = req.params;
    const { hard } = req.query;

    if (!mongoose.Types.ObjectId.isValid(variantId)) return res.status(400).json({ message: "Invalid variant ID format" });

    if (hard === "true") {
      const deletedVariant = await ProductVariant.findByIdAndDelete(variantId);
      if (!deletedVariant) return res.status(404).json({ message: "Variant not found" });
      await Inventory.deleteMany({ variantId });
      return res.json({ message: "Variant permanently deleted from database" });
    }

    const variant = await ProductVariant.findById(variantId);
    if (!variant) return res.status(404).json({ message: "Variant not found" });

    if (variant.status === "archived" || variant.isActive === false) {
      return res.status(400).json({ message: "Variant is already archived" });
    }

    variant.status = "archived";
    variant.isActive = false;
    await variant.save();

    res.json({ message: "Variant archived successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

module.exports = {
  createVariant,
  getVariants,
  updateVariant,
  deleteVariant,
  formatVariantResponse
};
