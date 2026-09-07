require('dotenv').config();
const mongoose = require('mongoose');
const RoleHasUser = require('../models/RoleHasUser');
const Admin = require('../models/Admin');
const connectDB = require('../config/db');

const seedRoleHasUser = async () => {
  try {
    await connectDB();

    // Find the admin user created by adminSeeder
    const admin = await Admin.findOne({ email: "admin@yopmail.com" });
    
    if (!admin) {
        console.log('Admin user not found! Please run adminSeeder first.');
        process.exit(1);
    }

    const existingPivot = await RoleHasUser.findOne({ id: 1 });
    
    if (!existingPivot) {
      await RoleHasUser.create({
        id: 1,
        role_id: 1, // Refers to the Admin role created in roleSeeder
        user_id: admin._id // Refers to the Admin user
      });
      console.log('RoleHasUser seeded successfully! Admin is now linked to Admin Role.');
    } else {
      console.log('RoleHasUser relation already exists!');
    }

    process.exit();
  } catch (error) {
    console.error('Error seeding RoleHasUser:', error);
    process.exit(1);
  }
};

seedRoleHasUser();
