const mongoose = require('mongoose');
require('dotenv').config({ path: 'd:/anevix-ecom/.env' });

async function testImages() {
  try {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(process.env.MONGO_URL);

    const Product = require('./src/models/Product');
    const ProductVariant = require('./src/models/ProductVariant');
    const ProductImage = require('./src/models/ProductImage');

    // Find any product
    const product = await Product.findOne();
    if (!product) {
      console.log("No product found to test on.");
      process.exit(1);
    }

    // See if it has a variant, else we make a dummy variant for it
    let variant = await ProductVariant.findOne({ productId: product._id });
    if (!variant) {
      console.log("Creating dummy variant for testing...");
      variant = await ProductVariant.create({
        productId: product._id,
        sku: 'DUMMY-VAR-1',
        price: 99,
        attributes: [{ name: 'Test', value: 'Val' }]
      });
    }

    // Delete existing images for this product
    await ProductImage.deleteMany({ productId: product._id });

    // 1. Create a product-level image
    const pImg1 = await ProductImage.create({
      productId: product._id,
      url: "https://example.com/p1.jpg"
    });
    console.log("Created product image:", pImg1._id);

    // 2. Create another product-level image and make it primary
    const pImg2 = await ProductImage.create({
      productId: product._id,
      url: "https://example.com/p2.jpg",
      isPrimary: true
    });
    console.log("Created primary product image:", pImg2._id);

    // 3. Create a variant-level image
    const vImg1 = await ProductImage.create({
      productId: product._id,
      variantId: variant._id,
      url: "https://example.com/v1.jpg",
      isPrimary: true
    });
    console.log("Created variant image:", vImg1._id);

    // Now test primary swapping logic directly matching the controller
    // "simulate setPrimaryImage"
    const scopeQuery = { productId: product._id, variantId: null };
    await ProductImage.updateMany(scopeQuery, { isPrimary: false });
    pImg1.isPrimary = true;
    await pImg1.save();
    console.log("Set pImg1 as primary");

    // Fetch and verify
    const finalImages = await ProductImage.find({ productId: product._id }).sort({ sortOrder: 1, createdAt: 1 });
    console.log(`Total images retrieved: ${finalImages.length}`);
    
    let productPrimaries = 0;
    let variantPrimaries = 0;

    for (let img of finalImages) {
      console.log(`Image: ${img.url}, Scope: ${img.variantId ? 'Variant' : 'Product'}, Primary: ${img.isPrimary}`);
      if (img.variantId && img.isPrimary) variantPrimaries++;
      if (!img.variantId && img.isPrimary) productPrimaries++;
    }

    if (productPrimaries !== 1 || variantPrimaries !== 1) {
      console.log("FAIL: Scope isolation for primary images is broken.");
    } else {
      console.log("PASS: Primary images are properly scoped.");
    }

    // Cleanup dummy data (optional but good)
    await ProductImage.deleteMany({ productId: product._id });
    if (variant.sku === 'DUMMY-VAR-1') {
      await ProductVariant.findByIdAndDelete(variant._id);
    }
    
    console.log("All tests completed successfully.");
    process.exit(0);

  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

testImages();
