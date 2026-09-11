require("dotenv").config();
const mongoose = require("mongoose");
const User = require("../models/User");
const Role = require("../models/Role");
const RoleHasUser = require("../models/RoleHasUser");
const connectDB = require("../config/db");

const seedRoleHasUser = async () => {
  try {
    await connectDB();

    const adminUser = await User.findOne({ email: "admin@yopmail.com" });
    if (!adminUser) {
      console.log("Admin user not found! Please run adminSeeder first.");
      process.exit(1);
    }

    const adminRole = await Role.findOne({ slug: "admin" });
    if (!adminRole) {
      console.log("Admin role not found! Please run roleSeeder first.");
      process.exit(1);
    }

    const existingPivot = await RoleHasUser.findOne({
      user_id: adminUser._id,
      role_id: adminRole.id,
    });

    if (existingPivot) {
      console.log("RoleHasUser mapping already exists for Master Admin.");
      process.exit();
    }

    await RoleHasUser.create({
      id: 1,
      user_id: adminUser._id,
      role_id: adminRole.id,
    });

    console.log("RoleHasUser mapping seeded successfully!");
    process.exit();
  } catch (error) {
    console.error("Error seeding RoleHasUser:", error);
    process.exit(1);
  }
};

seedRoleHasUser();
