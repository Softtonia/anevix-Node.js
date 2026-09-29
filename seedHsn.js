require("dotenv").config();
const mongoose = require("mongoose");
const fs = require("fs");
const path = require("path");
const HsnCode = require("./src/models/tax/HsnCode");

// Update this URI to your actual MongoDB connection string if different
const MONGO_URI = process.env.MONGO_URL || "mongodb://localhost:27017/anevix"; 

async function seedHsnCodes() {
  try {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(MONGO_URI);
    console.log("Connected successfully.");

    // Path to the downloaded JSON file
    const jsonPath = path.join(__dirname, "hsn_all.json");
    
    if (!fs.existsSync(jsonPath)) {
      console.error("Error: hsn_all.json not found in the root directory!");
      console.log("Please download it from https://github.com/crusher95/hsn-sac-gst-json/blob/master/hsn_all.json and place it in the anevix-ecom folder.");
      process.exit(1);
    }

    console.log("Reading hsn_all.json...");
    const rawData = fs.readFileSync(jsonPath, "utf-8");
    const hsnList = JSON.parse(rawData);

    console.log(`Found ${hsnList.length} HSN codes. Formatting data...`);
    
    // Map the JSON structure to our Mongoose Schema
    const formattedCodes = hsnList.map(item => ({
      hsnCode: item.hsn.toString(),
      description: item.description || "No description provided",
    }));

    console.log("Clearing old HSN codes (if any)...");
    await HsnCode.deleteMany({});

    console.log("Inserting new HSN codes (this might take a few seconds)...");
    await HsnCode.insertMany(formattedCodes, { ordered: false });

    console.log("✅ Successfully seeded HSN codes into the database!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error seeding HSN codes:", error);
    process.exit(1);
  }
}

seedHsnCodes();
