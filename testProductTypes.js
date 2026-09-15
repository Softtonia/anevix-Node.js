const mongoose = require('mongoose');
require('dotenv').config({ path: 'd:/anevix-ecom/.env' });

async function testProductTypes() {
  try {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(process.env.MONGO_URL);

    const Product = require('./src/models/Product');
    const ProductVariant = require('./src/models/ProductVariant');
    const Inventory = require('./src/models/Inventory');

    const B2CSellerProfile = require('./src/models/B2CSellerProfile');
    const Category = require('./src/models/Category');
    const seller = await B2CSellerProfile.findOne();
    const category = await Category.findOne();

    if (!seller || !category) {
      console.error("Missing seller or category in DB to run tests.");
      process.exit(1);
    }

    const sellerId = seller._id;
    const categoryId = category._id;
    const dummyBase = {
      name: "Test Type",
      description: "Desc",
      shortDescription: "Short",
      sellerId,
      categoryId,
      price: 100,
      sku: "DUMMY-SKU-TEST"
    };

    const cleanUp = async () => {
      await Product.deleteMany({ name: /Test Type/ });
    };
    await cleanUp();

    console.log("--- Starting Tests ---");
    let passed = 0;
    let failed = 0;

    const assertReject = async (promise, name, expectedMsgSubstring) => {
      try {
        await promise;
        console.error(`❌ FAIL: ${name} (Expected rejection but it passed)`);
        failed++;
      } catch (err) {
        if (!expectedMsgSubstring || err.response?.data?.message?.includes(expectedMsgSubstring) || err.message.includes(expectedMsgSubstring) || (err.response?.status === 400) || (err.message.includes('400'))) {
          console.log(`✅ PASS: ${name}`);
          passed++;
        } else {
          console.error(`❌ FAIL: ${name} (Rejected with wrong error: ${err.message})`);
          failed++;
        }
      }
    };

    const assertPass = async (promise, name) => {
      try {
        const res = await promise;
        console.log(`✅ PASS: ${name}`);
        passed++;
        return res;
      } catch (err) {
        console.error(`❌ FAIL: ${name} (Threw error: ${err.message})`);
        failed++;
      }
    };

    // We can test the controller directly by mocking req, res or by using axios/fetch against localhost.
    // Since server is running, we can just use fetch!
    
    // Login to get admin token
    // (Wait, the tests can just run against DB to test schema, but controller logic is requested. I'll use fetch).
    
    // Or I can just test using direct mongoose validation/saves where applicable? No, controller logic like "attributes are only allowed for variable products" is in the controller.
    
    const BASE_URL = 'http://localhost:5000/api/products';
    const reqOpts = (method, body) => ({
      method,
      headers: { 'Content-Type': 'application/json' }, // We skip adminAuth here by mocking or we just rely on the controller logic being exposed (Wait, POST /api/products requires adminAuth).
      body: JSON.stringify(body)
    });

    // Actually, getting an admin token is annoying in this standalone script. Let's just mock req/res and call the controller directly!
    const { createProduct, updateProduct } = require('./src/controllers/productController');
    const { createProductInventory } = require('./src/controllers/inventoryController');

    const executeCtrl = async (ctrl, body, params = {}) => {
      return new Promise((resolve, reject) => {
        const req = { body, params };
        const res = {
          status: (code) => {
            res.statusCode = code;
            return res;
          },
          json: (data) => {
            if (res.statusCode >= 400) reject(new Error(data.message));
            else resolve(data);
          }
        };
        ctrl(req, res).catch(reject);
      });
    };

    let slugCounter = 1;
    const getBase = () => ({ ...dummyBase, slug: `test-slug-${slugCounter}`, sku: `SKU-${slugCounter++}` });

    // 1. Create simple product -> PASS
    let p1 = await assertPass(executeCtrl(createProduct, { ...getBase(), productType: 'simple' }), "1. Create simple product");

    // 2. Create variable product with valid attributes -> PASS
    let p2 = await assertPass(executeCtrl(createProduct, { ...getBase(), productType: 'variable', attributes: [{ name: 'Color', options: ['Red'] }] }), "2. Create variable product with valid attributes");

    // 3. Variable product without attributes -> 400
    await assertReject(executeCtrl(createProduct, { ...getBase(), productType: 'variable' }), "3. Variable product without attributes", "Variable products must have at least one attribute");

    // 4. Variable product with duplicate attribute names -> 400
    await assertReject(executeCtrl(createProduct, { ...getBase(), productType: 'variable', attributes: [{ name: 'Color', options: ['Red'] }, { name: 'Color', options: ['Blue'] }] }), "4. Variable product with duplicate attribute names", "Duplicate attribute name");

    // 5. Variable product with empty options -> 400
    await assertReject(executeCtrl(createProduct, { ...getBase(), productType: 'variable', attributes: [{ name: 'Color', options: [] }] }), "5. Variable product with empty options", "must have at least one option");

    // 6. Create external product with valid externalUrl -> PASS
    let p3 = await assertPass(executeCtrl(createProduct, { ...getBase(), productType: 'external', externalUrl: 'https://test.com' }), "6. Create external product with valid externalUrl");

    // 7. External product without externalUrl -> 400
    await assertReject(executeCtrl(createProduct, { ...getBase(), productType: 'external' }), "7. External product without externalUrl", "A valid externalUrl is required");

    // 8. External product with invalid URL -> 400
    await assertReject(executeCtrl(createProduct, { ...getBase(), productType: 'external', externalUrl: 'not-a-url' }), "8. External product with invalid URL", "A valid externalUrl is required");

    // 9. Create grouped product -> PASS
    let p4 = await assertPass(executeCtrl(createProduct, { ...getBase(), productType: 'grouped' }), "9. Create grouped product");

    // 10. Invalid productType -> 400
    await assertReject(executeCtrl(createProduct, { ...getBase(), productType: 'invalid_type' }), "10. Invalid productType"); // Will be caught by mongoose enum validation

    // 11. Simple product with inappropriate variable data -> 400
    await assertReject(executeCtrl(createProduct, { ...getBase(), productType: 'simple', attributes: [{ name: 'Color', options: ['Red'] }] }), "11. Simple product with inappropriate variable data", "attributes are only allowed for variable products");

    // 12. Variable -> simple transition with active variants -> 400
    await ProductVariant.create({ productId: p2._id, sku: `V-${Date.now()}-${slugCounter}`, price: 100, attributes: [{ name: 'Color', value: 'Red' }] });
    await assertReject(executeCtrl(updateProduct, { productType: 'simple' }, { id: p2._id }), "12. Variable -> simple transition with active variants", "Cannot change product type from variable because it has active variants");

    // 13. Variable -> simple transition without active variants -> PASS
    let p5 = await assertPass(executeCtrl(createProduct, { ...getBase(), productType: 'variable', attributes: [{ name: 'Size', options: ['S'] }] }), "Create empty variable product");
    await assertPass(executeCtrl(updateProduct, { productType: 'simple' }, { id: p5._id }), "13. Variable -> simple transition without active variants");

    // 14. External -> simple transition -> PASS
    let extProd = await executeCtrl(updateProduct, { productType: 'simple' }, { id: p3._id });
    if (extProd.externalUrl === null && extProd.buttonText === 'Buy Now') {
      console.log("✅ PASS: 14. External -> simple transition"); passed++;
    } else {
      console.error("❌ FAIL: 14. External -> simple transition (Fields not cleared)", extProd); failed++;
    }

    // 17. Virtual=true works
    await assertPass(executeCtrl(updateProduct, { virtual: true }, { id: p1._id }), "17. Virtual=true works");

    // 18. Downloadable=true works
    await assertPass(executeCtrl(updateProduct, { downloadable: true }, { id: p1._id }), "18. Downloadable=true works");

    // 19. External/grouped products do not get Product-level inventory
    let pExt2 = await executeCtrl(createProduct, { ...getBase(), productType: 'external', externalUrl: 'https://test2.com' });
    await assertReject(executeCtrl(createProductInventory, {}, { productId: pExt2._id }), "19a. External products do not get Product-level inventory", "Direct product inventory is only allowed for 'simple' products");
    await assertReject(executeCtrl(createProductInventory, {}, { productId: p4._id }), "19b. Grouped products do not get Product-level inventory", "Direct product inventory is only allowed for 'simple' products");

    // Clean up
    await cleanUp();
    await ProductVariant.deleteMany({ productId: p2._id });

    console.log(`\nTests completed: ${passed} passed, ${failed} failed.`);
    process.exit(failed > 0 ? 1 : 0);

  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

testProductTypes();
