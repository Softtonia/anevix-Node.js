require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const connectDB = require("../config/db");

const seedAdmin = async () => {
  try {
    await connectDB();
    
    const email = "admin@yopmail.com";
    const password = "admin123";

    const existingAdmin = await User.findOne({ email });
    if (existingAdmin) {
      console.log("Master Admin user already exists!");
      process.exit();
    }
    
    const hashedPassword = await bcrypt.hash(password, 10);
    
    await User.create({
      firstName: "Super",
      lastName: "Admin",
      email,
      password: hashedPassword,
      is_default: true,
      isAccountVerified: true,
      isEmailVerified: true,
      status: "active"
    });
    
    console.log("Master Admin user seeded successfully!");
    process.exit();
  } catch (error) {
    console.error("Error seeding master admin:", error);
    process.exit(1);
  }
};

seedAdmin();
