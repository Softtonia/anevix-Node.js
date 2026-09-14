require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const connectDB = require("../config/db");

const seedAdmin = async () => {
  try {
    await connectDB();

    const email = "diya@yopmail.com";
    const password = "admin123";

    const Role = require("../models/Role");
    const RoleHasUser = require("../models/RoleHasUser");

    let adminUser = await User.findOne({ email });

    if (!adminUser) {
      const hashedPassword = await bcrypt.hash(password, 10);

      adminUser = await User.create({
        firstName: "Super",
        lastName: "Admin",
        email,
        password: hashedPassword,
        is_default: true,
        isAccountVerified: true,
        isEmailVerified: true,
        status: "active",
      });
      console.log("Master Admin user seeded successfully!");
    } else {
      console.log("Master Admin user already exists!");
    }

    // Ensure the admin role exists
    let adminRole = await Role.findOne({ slug: "admin" });
    if (!adminRole) {
      const maxRole = await Role.findOne().sort({ id: -1 });
      const nextRoleId = maxRole && maxRole.id ? maxRole.id + 1 : 1;
      adminRole = await Role.create({
        id: nextRoleId,
        name: "Admin",
        slug: "admin",
        description: "Master Admin",
        guard: "web",
      });
      console.log("Admin role created!");
    }

    // Ensure the role is assigned to the admin user
    const mapping = await RoleHasUser.findOne({
      user_id: adminUser._id,
      role_id: adminRole.id,
    });
    if (!mapping) {
      const maxMapping = await RoleHasUser.findOne().sort({ id: -1 });
      const nextMappingId = maxMapping && maxMapping.id ? maxMapping.id + 1 : 1;
      await RoleHasUser.create({
        id: nextMappingId,
        user_id: adminUser._id,
        role_id: adminRole.id,
      });
      console.log("Admin role successfully assigned to Master Admin!");
    }

    process.exit();
  } catch (error) {
    console.error("Error seeding master admin:", error);
    process.exit(1);
  }
};

seedAdmin();
