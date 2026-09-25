const mongoose = require("mongoose");
const Product = require("../models/Product");
const SimpleProduct = require("../models/SimpleProduct");
const ProductVariant = require("../models/ProductVariant");
const ProductImage = require("../models/ProductImage");
const Inventory = require("../models/Inventory");
const ProductCategory = require("../models/ProductCategory");

// Helper to validate product attributes
const validateProductAttributes = (attributes, productType) => {
  if (productType === "variable") {
    if (!attributes || !Array.isArray(attributes) || attributes.length === 0) {
      return "Variable products must have at least one attribute.";
    }
  }
  if (attributes && Array.isArray(attributes) && attributes.length > 0) {
    const names = new Set();
    for (const attr of attributes) {
      if (!attr.name || typeof attr.name !== 'string' || attr.name.trim() === "") return "Attribute name is required.";
      const lowerName = attr.name.trim().toLowerCase();
      if (names.has(lowerName)) return `Duplicate attribute name: ${attr.name}`;
      names.add(lowerName);
      if (!attr.options || !Array.isArray(attr.options) || attr.options.length === 0) return `Attribute ${attr.name} must have at least one option.`;
      const optionsSet = new Set();
      for (const opt of attr.options) {
        if (!opt || typeof opt !== 'string' || opt.trim() === "") return `Options for attribute ${attr.name} cannot be empty.`;
        const lowerOpt = opt.trim().toLowerCase();
        if (optionsSet.has(lowerOpt)) return `Duplicate option '${opt}' in attribute ${attr.name}.`;
        optionsSet.add(lowerOpt);
      }
    }
  }
  return null;
};

// Helper to validate variant attributes against parent
const validateVariantAttributes = (variantAttributes, parentProduct) => {
  if (!parentProduct.attributes || parentProduct.attributes.length === 0) return "Parent product has no attributes defined.";
  const parentAttrMap = new Map();
  parentProduct.attributes.forEach((attr) => {
    parentAttrMap.set(attr.name.toLowerCase(), attr.options.map((opt) => opt.toLowerCase()));
  });
  const providedAttrMap = new Map();
  for (const vAttr of variantAttributes) {
    if (!vAttr.name || (!vAttr.value && !vAttr.option)) return "Variant attribute name and option/value are required.";
    const val = vAttr.value || vAttr.option;
    providedAttrMap.set(vAttr.name.toLowerCase(), val.toLowerCase());
  }
  for (const [pName, pOptions] of parentAttrMap.entries()) {
    if (!providedAttrMap.has(pName)) return `Missing attribute: ${pName} is required for this product.`;
    const providedVal = providedAttrMap.get(pName);
    if (!pOptions.includes(providedVal)) return `Invalid option '${providedVal}' for attribute '${pName}'. Available options: ${pOptions.join(", ")}.`;
  }
  for (const vName of providedAttrMap.keys()) {
    if (!parentAttrMap.has(vName)) return `Invalid attribute: ${vName} is not defined on the parent product.`;
  }
  return null;
};

const mapApiToStatus = (status) => {
  if (status === "publish") return "active";
  if (status === "private") return "archived";
  return status;
};

const { formatVariantResponse } = require("./productVariantController");

const formatCompositeResponse = (product, productImgs, variantsData) => {
  const p = product.toObject ? product.toObject() : product;
  
  const pPrimary = productImgs.find(i => i.isPrimary) || productImgs[0] || null;
  const pGallery = productImgs.filter(i => i._id.toString() !== pPrimary?._id?.toString()).map(i => i._id.toString());

  return {
    id: p._id.toString(),
    name: p.name,
    productType: p.productType,
    sku: p.sku,
    price: p.price,
    image: pPrimary ? { src: pPrimary.url } : null,
    gallery_image_ids: pGallery,
    variants: variantsData.map(vd => {
      // Reuse the existing variant serializer precisely as requested
      return formatVariantResponse(vd.variant, vd.inventory, vd.images, p);
    })
  };
};

// @desc    Create composite product (product + images + variants + inventory)
// @route   POST /api/products/composite
// @access  Private/Admin/Seller
const createCompositeProduct = async (req, res) => {
  const session = await mongoose.startSession();
  try {
    session.startTransaction();

    // Parse form-data if multipart, or fallback to raw json
    console.log("req.body:", req.body);
    console.log("req.files:", req.files);
    
    const rawData = req.body.data ? JSON.parse(req.body.data) : req.body;
    const { productData, images, variants } = rawData;

    if (!productData) {
      throw new Error("productData is required in payload");
    }

    // Merge uploaded files into the JSON payload
    let pImages = images ? [...images] : [];
    let pVariants = variants ? JSON.parse(JSON.stringify(variants)) : [];

    if (req.files && Array.isArray(req.files)) {
      const protocol = req.protocol;
      const host = req.get('host');
      const baseUrl = `${protocol}://${host}/uploads/`;

      req.files.forEach(file => {
        const fileUrl = baseUrl + file.filename;
        if (file.fieldname === 'product_images') {
          pImages.push({ url: fileUrl });
        } else if (file.fieldname.startsWith('variant_images_')) {
          const index = parseInt(file.fieldname.replace('variant_images_', ''), 10);
          if (!isNaN(index) && pVariants[index]) {
            if (!pVariants[index].images) pVariants[index].images = [];
            pVariants[index].images.push({ url: fileUrl });
          }
        }
      });
    }

    // 1. Validate Product Data
    let { name, slug, description, shortDescription, sellerId, cat_id, sku,
      price, salePrice, productType, attributes, status, isActive
    } = productData;

    if (!name || !slug || !sellerId || !cat_id || !sku || price === undefined) {
      throw new Error("Name, slug, sellerId, cat_id, sku, and price are required in productData");
    }

    
    if (!mongoose.Types.ObjectId.isValid(cat_id) || !mongoose.Types.ObjectId.isValid(sub_cat_id) || !mongoose.Types.ObjectId.isValid(nested_sub_cat_id)) {
      throw new Error("Invalid category ID format");
    }
    const cat = await ProductCategory.findById(cat_id).session(session);
    if (!cat) throw new Error("ProductCategory not found");
    const subCat = await ProductCategory.findById(sub_cat_id).session(session);
    if (!subCat) throw new Error("ProductCategory not found");
    if (subCat.cat_id.toString() !== cat_id.toString()) throw new Error("sub_cat_id does not belong to cat_id");
    const nestedCat = await ProductCategory.findById(nested_sub_cat_id).session(session);
    if (!nestedCat) throw new Error("ProductCategory not found");
    if (nestedCat.sub_cat_id.toString() !== sub_cat_id.toString()) {
      return res.status(400).json({ message: "nested_sub_cat_id does not belong to the specified sub_cat_id" });
    }

    const pType = productType || "simple";
    const attrError = validateProductAttributes(attributes, pType);
    if (attrError) throw new Error(attrError);

    const existingProductSku = await Product.findOne({ sku }).session(session);
    if (existingProductSku) throw new Error("A product with this SKU already exists");

    const existingSlug = await Product.findOne({ slug }).session(session);
    if (existingSlug) throw new Error("A product with this slug already exists");

    // 2. Create Product
    let product;
    if (pType === "simple") {
      const { price: legacyPrice, ...rest } = productData;
      product = new SimpleProduct({
        ...rest,
        regularPrice: legacyPrice,
        productType: pType,
      });
    } else {
      product = new Product({
        ...productData,
        productType: pType,
      });
    }
    await product.save({ session });

    // Create Simple Product Inventory if provided
    if (pType === "simple" && productData.inventory) {
      const invData = productData.inventory;
      const inventory = new Inventory({
        productId: product._id,
        manageStock: invData.manageStock !== undefined ? invData.manageStock : true,
        quantity: invData.quantity || 0,
        reservedQuantity: 0,
        lowStockThreshold: invData.lowStockThreshold !== undefined ? invData.lowStockThreshold : 5,
        backorders: invData.backorders || "no"
      });
      await inventory.save({ session });
    }

    // 3. Create / Link Product Images
    const isAdmin = !!(req.admin || req.user?.role === 'admin');
    const createdProductImages = [];
    if (pImages && pImages.length > 0) {
      for (let i = 0; i < pImages.length; i++) {
        const imgData = pImages[i];
        const imageId = imgData.imageId || imgData._id;

        if (imageId && mongoose.Types.ObjectId.isValid(imageId)) {
          const existingImg = await ProductImage.findById(imageId).session(session);
          if (!existingImg) throw new Error(`Referenced imageId '${imageId}' not found`);
          if (existingImg.status === "failed") {
            throw new Error(`Image '${imageId}' failed processing and cannot be attached to a product.`);
          }
          if (!isAdmin && existingImg.sellerId && existingImg.sellerId.toString() !== sellerId.toString()) {
            throw new Error(`Unauthorized: image '${imageId}' belongs to another seller.`);
          }
          existingImg.productId = product._id;
          existingImg.sellerId = sellerId;
          existingImg.status = "active"; // Promoted to active upon attachment!
          if (imgData.isPrimary !== undefined) existingImg.isPrimary = imgData.isPrimary || false;
          existingImg.sortOrder = imgData.sortOrder !== undefined ? imgData.sortOrder : i;
          await existingImg.save({ session });
          createdProductImages.push(existingImg);
          continue;
        }

        if (!imgData.url) throw new Error("Image url or imageId is required");

        const existingByUrl = await ProductImage.findOne({ url: imgData.url }).session(session);
        if (existingByUrl) {
          if (existingByUrl.status === "failed") {
            throw new Error(`Image with URL '${imgData.url}' failed processing and cannot be attached to a product.`);
          }
          if (!isAdmin && existingByUrl.sellerId && existingByUrl.sellerId.toString() !== sellerId.toString()) {
            throw new Error(`Unauthorized: image with URL '${imgData.url}' belongs to another seller.`);
          }
          existingByUrl.productId = product._id;
          existingByUrl.sellerId = sellerId;
          existingByUrl.status = "active"; // Promoted to active upon attachment!
          if (imgData.isPrimary !== undefined) existingByUrl.isPrimary = imgData.isPrimary || false;
          existingByUrl.sortOrder = imgData.sortOrder !== undefined ? imgData.sortOrder : i;
          await existingByUrl.save({ session });
          createdProductImages.push(existingByUrl);
          continue;
        }

        const prodImg = new ProductImage({
          productId: product._id,
          sellerId,
          url: imgData.url,
          isPrimary: imgData.isPrimary || false,
          sortOrder: imgData.sortOrder !== undefined ? imgData.sortOrder : i,
          status: "active"
        });
        await prodImg.save({ session });
        createdProductImages.push(prodImg);
      }
    }

    // 4. Create Variants
    const variantsData = [];
    if (pVariants && pVariants.length > 0) {
      if (pType !== "variable") throw new Error("Cannot add variants to a non-variable product");

      for (let i = 0; i < pVariants.length; i++) {
        const vData = pVariants[i];
        
        // Variant Validation
        if (!vData.sku || !vData.attributes || (vData.regular_price === undefined && vData.price === undefined)) {
          throw new Error(`Variant at index ${i} is missing sku, attributes, or regular_price`);
        }

        const vAttrError = validateVariantAttributes(vData.attributes, product);
        if (vAttrError) throw new Error(`Variant ${vData.sku}: ` + vAttrError);

        const normalizedAttributes = vData.attributes.map(a => ({ name: a.name, value: a.value || a.option }));
        
        const finalPrice = vData.regular_price !== undefined ? vData.regular_price : vData.price;
        const finalSalePrice = vData.sale_price !== undefined ? vData.sale_price : vData.salePrice;
        const finalStatus = vData.status ? mapApiToStatus(vData.status) : "active";

        const variantSkuExists = await ProductVariant.findOne({ sku: vData.sku }).session(session);
        if (variantSkuExists) throw new Error(`Variant SKU already exists: ${vData.sku}`);

        const variant = new ProductVariant({
          productId: product._id,
          sku: vData.sku,
          attributes: normalizedAttributes,
          price: finalPrice,
          salePrice: finalSalePrice,
          status: finalStatus,
          isActive: vData.isActive !== undefined ? vData.isActive : (finalStatus !== "archived"),
        });

        await variant.save({ session });

        // 5. Create Inventory
        let inventory = null;
        if (vData.manage_stock !== undefined || vData.stock_quantity !== undefined || vData.backorders !== undefined) {
          inventory = new Inventory({
            variantId: variant._id,
            manageStock: vData.manage_stock !== undefined ? vData.manage_stock : true,
            quantity: vData.stock_quantity || 0,
            backorders: vData.backorders || "no"
          });
          await inventory.save({ session });
        }

        // 6. Create / Link Variant Images
        const createdVariantImages = [];
        if (vData.images && Array.isArray(vData.images)) {
          for (let j = 0; j < vData.images.length; j++) {
            const vImgData = vData.images[j];
            const vImageId = vImgData.imageId || vImgData._id;

            if (vImageId && mongoose.Types.ObjectId.isValid(vImageId)) {
              const existingVImg = await ProductImage.findById(vImageId).session(session);
              if (!existingVImg) throw new Error(`Referenced variant imageId '${vImageId}' not found`);
              if (existingVImg.status === "failed") {
                throw new Error(`Variant image '${vImageId}' failed processing and cannot be attached.`);
              }
              if (!isAdmin && existingVImg.sellerId && existingVImg.sellerId.toString() !== sellerId.toString()) {
                throw new Error(`Unauthorized: variant image '${vImageId}' belongs to another seller.`);
              }
              existingVImg.productId = product._id;
              existingVImg.variantId = variant._id;
              existingVImg.sellerId = sellerId;
              existingVImg.status = "active"; // Promoted to active upon attachment!
              if (vImgData.isPrimary !== undefined) existingVImg.isPrimary = vImgData.isPrimary || false;
              existingVImg.sortOrder = vImgData.sortOrder !== undefined ? vImgData.sortOrder : j;
              await existingVImg.save({ session });
              createdVariantImages.push(existingVImg);
              continue;
            }

            if (!vImgData.url) throw new Error(`Variant image url or imageId missing for sku ${vData.sku}`);

            const existingByUrl = await ProductImage.findOne({ url: vImgData.url }).session(session);
            if (existingByUrl) {
              if (existingByUrl.status === "failed") {
                throw new Error(`Variant image with URL '${vImgData.url}' failed processing and cannot be attached.`);
              }
              if (!isAdmin && existingByUrl.sellerId && existingByUrl.sellerId.toString() !== sellerId.toString()) {
                throw new Error(`Unauthorized: variant image with URL '${vImgData.url}' belongs to another seller.`);
              }
              existingByUrl.productId = product._id;
              existingByUrl.variantId = variant._id;
              existingByUrl.sellerId = sellerId;
              existingByUrl.status = "active"; // Promoted to active upon attachment!
              if (vImgData.isPrimary !== undefined) existingByUrl.isPrimary = vImgData.isPrimary || false;
              existingByUrl.sortOrder = vImgData.sortOrder !== undefined ? vImgData.sortOrder : j;
              await existingByUrl.save({ session });
              createdVariantImages.push(existingByUrl);
              continue;
            }

            const vImg = new ProductImage({
              productId: product._id,
              variantId: variant._id,
              sellerId,
              url: vImgData.url,
              isPrimary: vImgData.isPrimary || false,
              sortOrder: vImgData.sortOrder !== undefined ? vImgData.sortOrder : j,
              status: "active"
            });
            await vImg.save({ session });
            createdVariantImages.push(vImg);
          }
        }

        variantsData.push({ variant, inventory, images: createdVariantImages });
      }
    }

    // 7. Commit Transaction
    await session.commitTransaction();
    session.endSession();

    // 8. Return Response
    res.status(201).json(formatCompositeResponse(product, createdProductImages, variantsData));

  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    res.status(400).json({ message: error.message || "Failed to create composite product" });
  }
};

module.exports = {
  createCompositeProduct
};
