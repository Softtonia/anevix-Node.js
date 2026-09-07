require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const Admin = require("../models/Admin");
const connectDB = require("../config/db");

const seedAdmin = async () => {
  try {
    await connectDB();
    
    const email = "admin@yopmail.com";
    const password = "admin123";
    
    const existingAdmin = await Admin.findOne({ email });
    if (existingAdmin) {
      console.log("Admin already exists!");
      process.exit();
    }
    
    const hashedPassword = await bcrypt.hash(password, 10);
    
    await Admin.create({
      name: "Admin",
      email,
      password: hashedPassword
    });
    
    console.log("Admin seeded successfully!");
    process.exit();
  } catch (error) {
    console.error("Error seeding admin:", error);
    process.exit(1);
  }
};

seedAdmin();
