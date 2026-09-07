require('dotenv').config();
const mongoose = require('mongoose');
const Role = require('../models/Role');
const connectDB = require('../config/db');

const seedRoles = async () => {
  try {
    await connectDB();

    const rolesData = [
      {
        id: 1,
        name: 'Admin',
        slug: 'admin',
        guard: 'web',
        is_default: false
      },
      {
        id: 2,
        name: 'B2B Customer',
        slug: 'b2b-customer',
        guard: 'app',
        is_default: true
      },
      {
        id: 3,
        name: 'B2C Seller',
        slug: 'b2c-seller',
        guard: 'web',
        is_default: false
      }
    ];

    for (const roleData of rolesData) {
      const existingRole = await Role.findOne({ id: roleData.id });
      if (!existingRole) {
        await Role.create(roleData);
        console.log(`Role ${roleData.name} seeded successfully!`);
      } else {
        // Update existing roles to make sure they match
        await Role.updateOne({ id: roleData.id }, roleData);
        console.log(`Role ${roleData.name} already exists, updated!`);
      }
    }

    process.exit();
  } catch (error) {
    console.error('Error seeding role:', error);
    process.exit(1);
  }
};

seedRoles();
