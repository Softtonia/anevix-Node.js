const mongoose = require('mongoose');
require('dotenv').config({ path: 'd:/anevix-ecom/.env' });

async function testInventory() {
  try {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(process.env.MONGO_URL);

    const Product = require('./src/models/Product');
    const ProductVariant = require('./src/models/ProductVariant');
    const Inventory = require('./src/models/Inventory');

    // Setup: Find some existing products or create them
    let simpleProduct = await Product.findOne({ productType: 'simple' });
    if (!simpleProduct) {
      simpleProduct = await Product.create({
        name: 'Simple Inv Test', slug: 'simple-inv-test', sku: 'S-INV-1',
        price: 100, sellerId: new mongoose.Types.ObjectId(), categoryId: new mongoose.Types.ObjectId(),
        productType: 'simple'
      });
    }

    let variableProduct = await Product.findOne({ productType: 'variable' });
    if (!variableProduct) {
      variableProduct = await Product.create({
        name: 'Var Inv Test', slug: 'var-inv-test', sku: 'V-INV-1',
        price: 100, sellerId: new mongoose.Types.ObjectId(), categoryId: new mongoose.Types.ObjectId(),
        productType: 'variable', attributes: [{ name: 'Color', options: ['Red'] }]
      });
    }

    let variant = await ProductVariant.findOne({ productId: variableProduct._id });
    if (!variant) {
      variant = await ProductVariant.create({
        productId: variableProduct._id,
        sku: 'V-INV-1-RED', price: 100, attributes: [{ name: 'Color', value: 'Red' }]
      });
    }

    // Cleanup existing inventory for clean tests
    await Inventory.deleteMany({});

    console.log("--- Starting Tests ---");

    // 1. Create simple product inventory -> success
    let sInv = await Inventory.create({ productId: simpleProduct._id, quantity: 50 });
    console.log("1. Simple product inventory success");

    // 2. Duplicate product inventory -> reject
    try {
      await Inventory.create({ productId: simpleProduct._id, quantity: 10 });
      throw new Error("FAIL: Allowed duplicate product inventory");
    } catch(e) {
      if (e.code === 11000) console.log("2. Duplicate product inventory rejected");
      else throw e;
    }

    // 3. Negative quantity -> reject
    try {
      await Inventory.create({ productId: new mongoose.Types.ObjectId(), quantity: -5 });
      throw new Error("FAIL: Allowed negative quantity");
    } catch(e) {
      if (e.name === 'ValidationError') console.log("3. Negative quantity rejected");
      else throw e;
    }

    // 4. reservedQuantity > quantity -> reject
    try {
      await Inventory.create({ productId: new mongoose.Types.ObjectId(), quantity: 5, reservedQuantity: 10 });
      throw new Error("FAIL: Allowed reserved > quantity");
    } catch(e) {
      if (e.name === 'ValidationError') console.log("4. reservedQuantity > quantity rejected");
      else throw e;
    }

    // 5. Variant inventory -> success
    let vInv = await Inventory.create({ variantId: variant._id, quantity: 100 });
    console.log("5. Variant inventory success");

    // 6. Duplicate variant inventory -> reject
    try {
      await Inventory.create({ variantId: variant._id, quantity: 50 });
      throw new Error("FAIL: Allowed duplicate variant inventory");
    } catch(e) {
      if (e.code === 11000) console.log("6. Duplicate variant inventory rejected");
      else throw e;
    }

    // 7. Both productId and variantId -> reject
    try {
      await Inventory.create({ productId: simpleProduct._id, variantId: variant._id, quantity: 10 });
      throw new Error("FAIL: Allowed both productId and variantId");
    } catch(e) {
      if (e.name === 'ValidationError') console.log("7. Mutually exclusive validation works");
      else throw e;
    }

    console.log("All direct DB tests passed.");
    process.exit(0);

  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

testInventory();
