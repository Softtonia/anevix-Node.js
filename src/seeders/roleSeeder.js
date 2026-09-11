require("dotenv").config();
const Role = require("../models/Role");
const connectDB = require("../config/db");

const seedRoles = async () => {
  try {
    await connectDB();

    const rolesData = [
      {
        id: 1,
        name: "Marketplace Admin",
        slug: "admin", // Kept slug as admin for backend compatibility
        description: "Controls the complete marketplace.",
        guard: "web",
        is_default: false,
      },
      {
        id: 2,
        name: "B2C Customer / Buyer",
        slug: "b2c-customer",
        description: "Individual consumers purchasing products for personal use.",
        guard: "app",
        is_default: true,
      },
      {
        id: 3,
        name: "B2C Seller / Merchant",
        slug: "b2c-seller",
        description: "Individual or business sellers selling products directly to consumers.",
        guard: "web",
        is_default: false,
      },
      {
        id: 4,
        name: "B2B Buyer",
        slug: "b2b-buyer",
        description: "Business/customer purchasing products in bulk or for business requirements.",
        guard: "app",
        is_default: false,
      },
      {
        id: 5,
        name: "B2B Seller / Vendor",
        slug: "b2b-seller",
        description: "Registered businesses supplying products to other businesses.",
        guard: "web",
        is_default: false,
      },
      {
        id: 6,
        name: "Compliance/Admin Team",
        slug: "compliance-admin",
        description: "Handles KYC, GST, PAN, bank verification, category and brand approvals.",
        guard: "web",
        is_default: false,
      },
      {
        id: 7,
        name: "Account Manager",
        slug: "account-manager",
        description: "Assigned to selected B2B buyers/sellers.",
        guard: "web",
        is_default: false,
      },
    ];

    // Clear existing roles to avoid duplicate key errors from old ID mappings
    await Role.deleteMany({});

    for (const roleData of rolesData) {
      await Role.create(roleData);
      console.log(`Role "${roleData.name}" seeded successfully!`);
    }

    console.log("Role seeding completed successfully.");

    process.exit(0);
  } catch (error) {
    console.error("Error seeding roles:", error);
    process.exit(1);
  }
};

seedRoles();