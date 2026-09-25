const mongoose = require("mongoose");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config({ path: path.join(__dirname, "../../.env") });

const ProductCategory = require("../models/ProductCategory");
// Note: We don't use ProductSubCategory or ProductNestedSubCategory because 
// the API (e.g., /api/product-categories?parent=ID) uses the unified ProductCategory tree.

const seedCategories = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URL);
    console.log("MongoDB Connected");

    console.log("Clearing existing ProductCategory tree...");
    await ProductCategory.deleteMany();

    // 1. LEVEL 1: Main Categories (parentId = null)
    const electronics = await ProductCategory.create({
      cat_name: "Electronics",
      slug: "electronics",
      description: "Electronic devices and accessories",
      parentId: null
    });

    const fashion = await ProductCategory.create({
      cat_name: "Fashion",
      slug: "fashion",
      description: "Clothing, shoes, and jewelry",
      parentId: null
    });

    console.log("Level 1 Categories Created");

    // 2. LEVEL 2: Sub Categories (parentId = Level 1)
    const mobiles = await ProductCategory.create({
      cat_name: "Mobiles & Accessories",
      slug: "mobiles-accessories",
      parentId: electronics._id
    });

    const laptops = await ProductCategory.create({
      cat_name: "Laptops & Computers",
      slug: "laptops-computers",
      parentId: electronics._id
    });

    const mensClothing = await ProductCategory.create({
      cat_name: "Men's Clothing",
      slug: "mens-clothing",
      parentId: fashion._id
    });

    console.log("Level 2 Categories Created");

    // 3. LEVEL 3: Nested Sub Categories (parentId = Level 2)
    const smartphones = await ProductCategory.create({
      cat_name: "Smartphones",
      slug: "smartphones",
      parentId: mobiles._id
    });

    const laptopBags = await ProductCategory.create({
      cat_name: "Laptop Bags",
      slug: "laptop-bags",
      parentId: laptops._id
    });

    const tshirts = await ProductCategory.create({
      cat_name: "T-Shirts",
      slug: "t-shirts",
      parentId: mensClothing._id
    });

    console.log("Level 3 Categories Created");

    // 4. LEVEL 4: Deep Nested Categories (parentId = Level 3)
    await ProductCategory.create({
      cat_name: "5G Smartphones",
      slug: "5g-smartphones",
      parentId: smartphones._id,
      description: "Latest 5G enabled smartphones",
    });

    await ProductCategory.create({
      cat_name: "Gaming Laptops",
      slug: "gaming-laptops",
      parentId: laptopBags._id, // Just as an example
    });

    await ProductCategory.create({
      cat_name: "Polo T-Shirts",
      slug: "polo-tshirts",
      parentId: tshirts._id,
    });

    console.log("Level 4 Deep Categories Created successfully!");
    console.log("Category Seeding Completed Successfully.");

    process.exit(0);
  } catch (error) {
    console.error("Seeding error:", error);
    process.exit(1);
  }
};

seedCategories();
