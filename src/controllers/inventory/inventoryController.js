const Inventory = require("../../models/inventory/Inventory");
const Product = require("../../models/product/Product");
const ProductVariant = require("../../models/product/ProductVariant");
const mongoose = require("mongoose");

// Helper to format calculated fields safely without saving them to DB
const getInventoryStatus = (inventoryDoc) => {
  const inv = inventoryDoc.toObject ? inventoryDoc.toObject() : inventoryDoc;
  inv.availableQuantity = Math.max(0, inv.quantity - inv.reservedQuantity);
  
  if (inv.manageStock) {
    inv.isLowStock = inv.availableQuantity <= inv.lowStockThreshold;
  } else {
    inv.isLowStock = false;
  }
  return inv;
};

// @desc    Create product inventory (Simple Products only)
// @route   POST /api/products/:productId/inventory
// @access  Private/Admin
const createProductInventory = async (req, res) => {
  try {
    const { productId } = req.params;
    const { quantity, reservedQuantity, manageStock, lowStockThreshold, backorders } = req.body;

    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({ message: "Invalid product ID format" });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    if (product.status === "archived" || !product.isActive) {
      return res.status(400).json({ message: "Cannot create inventory for archived or inactive product" });
    }

    if (product.productType !== "simple") {
      return res.status(400).json({ 
        message: `Direct product inventory is only allowed for 'simple' products. This is a '${product.productType}' product.`
      });
    }

    // Application-level duplicate check
    const existing = await Inventory.findOne({ productId });
    if (existing) {
      return res.status(400).json({ message: "Inventory already exists for this product" });
    }

    const inventory = new Inventory({
      productId,
      variantId: null, // explicit
      quantity: quantity || 0,
      reservedQuantity: reservedQuantity || 0,
      manageStock: manageStock !== undefined ? manageStock : true,
      lowStockThreshold: lowStockThreshold !== undefined ? lowStockThreshold : 5,
      backorders: backorders || "no"
    });

    await inventory.save();
    res.status(201).json(getInventoryStatus(inventory));
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: "Inventory already exists for this product" });
    }
    res.status(400).json({ message: error.message });
  }
};

// @desc    Create variant inventory (Variable Products only)
// @route   POST /api/products/:productId/variants/:variantId/inventory
// @access  Private/Admin
const createVariantInventory = async (req, res) => {
  try {
    const { productId, variantId } = req.params;
    const { quantity, reservedQuantity, manageStock, lowStockThreshold, backorders } = req.body;

    if (!mongoose.Types.ObjectId.isValid(productId) || !mongoose.Types.ObjectId.isValid(variantId)) {
      return res.status(400).json({ message: "Invalid product or variant ID format" });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: "Parent product not found" });
    }

    if (product.productType !== "variable") {
      return res.status(400).json({ message: "Variant inventory is only allowed on 'variable' products" });
    }

    const variant = await ProductVariant.findById(variantId);
    if (!variant) {
      return res.status(404).json({ message: "Variant not found" });
    }

    if (variant.productId.toString() !== productId) {
      return res.status(400).json({ message: "Variant does not belong to the specified product" });
    }

    if (variant.status === "archived") {
      return res.status(400).json({ message: "Cannot create inventory for archived variant" });
    }

    // Application-level duplicate check
    const existing = await Inventory.findOne({ variantId });
    if (existing) {
      return res.status(400).json({ message: "Inventory already exists for this variant" });
    }

    const inventory = new Inventory({
      productId: null, // explicit mutually exclusive
      variantId,
      quantity: quantity || 0,
      reservedQuantity: reservedQuantity || 0,
      manageStock: manageStock !== undefined ? manageStock : true,
      lowStockThreshold: lowStockThreshold !== undefined ? lowStockThreshold : 5,
      backorders: backorders || "no"
    });

    await inventory.save();
    res.status(201).json(getInventoryStatus(inventory));
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: "Inventory already exists for this variant" });
    }
    res.status(400).json({ message: error.message });
  }
};

// @desc    Get inventory for a product (or its variants)
// @route   GET /api/products/:productId/inventory
// @access  Public/Admin (Follows Anevix pattern)
const getProductInventory = async (req, res) => {
  try {
    const { productId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({ message: "Invalid product ID format" });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    if (product.productType === "simple") {
      const inventory = await Inventory.findOne({ productId });
      if (!inventory) {
        return res.status(404).json({ message: "No inventory found for this product" });
      }
      return res.json(getInventoryStatus(inventory));
    } 
    
    if (product.productType === "variable") {
      const variants = await ProductVariant.find({ productId }).select('_id sku attributes status');
      const variantIds = variants.map(v => v._id);
      
      const inventories = await Inventory.find({ variantId: { $in: variantIds } });
      
      const enrichedInventories = inventories.map(inv => {
        const doc = getInventoryStatus(inv);
        const variantMeta = variants.find(v => v._id.toString() === inv.variantId.toString());
        if (variantMeta) {
          doc.variant = {
            sku: variantMeta.sku,
            attributes: variantMeta.attributes,
            status: variantMeta.status
          };
          doc.productId = productId; // surface parent ID for context
        }
        return doc;
      });

      return res.json(enrichedInventories);
    }

    return res.status(400).json({ message: `Inventory not supported for ${product.productType} products in this phase` });
  } catch (error) {
    res.status(500).json({ message: "Server Error" });
  }
};

// @desc    Get a single inventory record by ID
// @route   GET /api/inventory/:inventoryId
// @access  Public/Admin
const getInventoryById = async (req, res) => {
  try {
    const { inventoryId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(inventoryId)) {
      return res.status(400).json({ message: "Invalid inventory ID format" });
    }

    const inventory = await Inventory.findById(inventoryId)
      .populate('productId', 'name slug productType')
      .populate('variantId', 'sku attributes productId');

    if (!inventory) {
      return res.status(404).json({ message: "Inventory record not found" });
    }

    res.json(getInventoryStatus(inventory));
  } catch (error) {
    res.status(500).json({ message: "Server Error" });
  }
};

// @desc    Update inventory fields completely (excluding identities)
// @route   PUT /api/inventory/:inventoryId
// @access  Private/Admin
const updateInventory = async (req, res) => {
  try {
    const { inventoryId } = req.params;
    const { quantity, reservedQuantity, manageStock, lowStockThreshold, backorders } = req.body;

    if (!mongoose.Types.ObjectId.isValid(inventoryId)) {
      return res.status(400).json({ message: "Invalid inventory ID format" });
    }

    const inventory = await Inventory.findById(inventoryId);
    if (!inventory) {
      return res.status(404).json({ message: "Inventory record not found" });
    }

    if (quantity !== undefined) inventory.quantity = quantity;
    if (reservedQuantity !== undefined) inventory.reservedQuantity = reservedQuantity;
    if (manageStock !== undefined) inventory.manageStock = manageStock;
    if (lowStockThreshold !== undefined) inventory.lowStockThreshold = lowStockThreshold;
    if (backorders !== undefined) inventory.backorders = backorders;

    await inventory.save();
    res.json(getInventoryStatus(inventory));
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Adjust inventory safely by integer amounts (+10, -3)
// @route   PATCH /api/inventory/:inventoryId/adjust
// @access  Private/Admin
const adjustInventory = async (req, res) => {
  try {
    const { inventoryId } = req.params;
    let { adjustment } = req.body;

    if (!mongoose.Types.ObjectId.isValid(inventoryId)) {
      return res.status(400).json({ message: "Invalid inventory ID format" });
    }

    if (typeof adjustment !== 'number' || !Number.isInteger(adjustment)) {
      return res.status(400).json({ message: "Adjustment must be an integer (e.g. 10 or -3)" });
    }

    if (adjustment === 0) {
      return res.status(400).json({ message: "Adjustment cannot be zero" });
    }

    const inventory = await Inventory.findById(inventoryId);
    if (!inventory) {
      return res.status(404).json({ message: "Inventory record not found" });
    }

    const oldQuantity = inventory.quantity;
    const newQuantity = oldQuantity + adjustment;

    if (newQuantity < 0) {
      return res.status(400).json({ 
        message: "Adjustment would result in negative inventory quantity",
        currentQuantity: oldQuantity,
        attemptedAdjustment: adjustment
      });
    }

    inventory.quantity = newQuantity;
    await inventory.save();

    res.json({
      oldQuantity,
      adjustment,
      newQuantity,
      inventory: getInventoryStatus(inventory)
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Delete an inventory record
// @route   DELETE /api/inventory/:inventoryId
// @access  Private/Admin
const deleteInventory = async (req, res) => {
  try {
    const { inventoryId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(inventoryId)) {
      return res.status(400).json({ message: "Invalid inventory ID format" });
    }

    const inventory = await Inventory.findByIdAndDelete(inventoryId);
    if (!inventory) {
      return res.status(404).json({ message: "Inventory record not found" });
    }

    res.json({ message: "Inventory permanently deleted" });
  } catch (error) {
    res.status(500).json({ message: "Server Error" });
  }
};

// @desc    Get all inventory for a seller
// @route   GET /api/inventory/seller
// @access  Private/Admin/Seller
const getSellerInventory = async (req, res) => {
  try {
    const isAdmin = req.admin || req.user?.role === "admin";
    let targetSellerId = req.query.sellerId;

    if (!isAdmin) {
      if (req.seller && req.seller.id) {
        if (!targetSellerId) {
          targetSellerId = req.seller.id;
        }
      } else {
        return res.status(403).json({ message: "Unauthorized. Seller access required." });
      }
    }

    if (!targetSellerId) {
       return res.status(400).json({ message: "sellerId is required" });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const total = await Product.countDocuments({ sellerId: targetSellerId });

    const products = await Product.find({ sellerId: targetSellerId })
      .select('name sku productType status isActive thumbnail cat_id categoryId')
      .populate("cat_id", "cat_name name")
      .populate("categoryId", "name")
      .skip(skip)
      .limit(limit)
      .lean();
    const productIds = products.map(p => p._id);
    
    const ProductVariant = require("../../models/product/ProductVariant");
    const variants = await ProductVariant.find({ productId: { $in: productIds } })
      .select('productId sku attributes price status isActive thumbnail')
      .lean();
    const variantIds = variants.map(v => v._id);

    const inventories = await Inventory.find({
      $or: [
        { productId: { $in: productIds } },
        { variantId: { $in: variantIds } }
      ]
    }).lean();

    const ProductImage = require("../../models/product/ProductImage");
    const images = await ProductImage.find({
      $or: [
        { productId: { $in: productIds }, variantId: null, isPrimary: true },
        { variantId: { $in: variantIds }, isPrimary: true }
      ],
      status: "active"
    }).lean();

    const formattedProducts = products.map(p => {
      const pInv = inventories.find(i => i.productId && i.productId.toString() === p._id.toString());
      const pVars = variants.filter(v => v.productId.toString() === p._id.toString());
      const pPrimaryImg = images.find(img => img.productId && img.productId.toString() === p._id.toString() && !img.variantId);
      
      let category_name = null;
      if (p.cat_id) {
        category_name = p.cat_id.cat_name || p.cat_id.name || null;
      } else if (p.categoryId) {
        category_name = p.categoryId.name || null;
      }

      const formattedVariants = pVars.map(v => {
        const vInv = inventories.find(i => i.variantId && i.variantId.toString() === v._id.toString());
        const vPrimaryImg = images.find(img => img.variantId && img.variantId.toString() === v._id.toString());
        return {
          ...v,
          thumbnail: v.thumbnail || vPrimaryImg?.url || p.thumbnail || pPrimaryImg?.url || null,
          inventory: vInv ? getInventoryStatus(vInv) : { stockQuantity: 0, reservedQuantity: 0, manageStock: false, isLowStock: false },
          stock: vInv ? vInv.quantity : 0
        };
      });

      return {
        ...p,
        category_name,
        thumbnail: p.thumbnail || pPrimaryImg?.url || null,
        inventory: pInv ? getInventoryStatus(pInv) : null,
        stock: pInv ? pInv.quantity : 0,
        variants: formattedVariants
      };
    });

    res.json({
      data: formattedProducts,
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

module.exports = {
  createProductInventory,
  createVariantInventory,
  getProductInventory,
  getInventoryById,
  updateInventory,
  adjustInventory,
  deleteInventory,
  getInventoryStatus,
  getSellerInventory
};
