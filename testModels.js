const mongoose = require('mongoose');

async function test() {
  try {
    await mongoose.connect('mongodb://localhost:27017/anevix');
    console.log("Connected to MongoDB for testing.");

    const Product = require('./src/models/Product');
    const ProductVariant = require('./src/models/ProductVariant');
    const B2CSellerProfile = require('./src/models/B2CSellerProfile');
    const Category = require('./src/models/Category');

    const seller = await B2CSellerProfile.findOne();
    const category = await Category.findOne();

    if (!seller || !category) {
      console.log("Missing seller or category.");
      process.exit(1);
    }

    // Test 1: Invalid negative price
    try {
      const p1 = new Product({
        name: "Test", slug: "test-neg-price", sku: "TEST-1",
        price: -10, sellerId: seller._id, categoryId: category._id
      });
      await p1.validate();
      console.log("FAIL: Negative price accepted");
    } catch (e) {
      if (e.errors && e.errors.price) console.log("PASS: Negative price rejected");
      else console.log("FAIL: Expected validation error on price, got:", e.message);
    }

    // Test 2: Invalid negative salePrice
    try {
      const p2 = new Product({
        name: "Test", slug: "test-neg-sale", sku: "TEST-2",
        price: 100, salePrice: -10, sellerId: seller._id, categoryId: category._id
      });
      await p2.validate();
      console.log("FAIL: Negative salePrice accepted");
    } catch (e) {
      if (e.errors && e.errors.salePrice) console.log("PASS: Negative salePrice rejected");
      else console.log("FAIL: Expected validation error on salePrice, got:", e.message);
    }

    // Test 3: Invalid currency format
    try {
      const p3 = new Product({
        name: "Test", slug: "test-curr", sku: "TEST-3",
        price: 100, currency: "inr", sellerId: seller._id, categoryId: category._id
      });
      await p3.validate();
      console.log("FAIL: Lowercase currency accepted");
    } catch (e) {
      if (e.errors && e.errors.currency) console.log("PASS: Lowercase currency rejected");
      else console.log("FAIL: Expected validation error on currency, got:", e.message);
    }

    // Test 4: Valid currency INR
    try {
      const p4 = new Product({
        name: "Test", slug: "test-curr-valid", sku: "TEST-4",
        price: 100, currency: "INR", sellerId: seller._id, categoryId: category._id
      });
      await p4.validate();
      console.log("PASS: Valid currency INR accepted");
    } catch (e) {
      console.log("FAIL: INR currency rejected", e.message);
    }

    console.log("All model tests completed.");
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

test();
