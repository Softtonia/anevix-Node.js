require("dotenv").config();
const Role = require("../models/Role");
const connectDB = require("../config/db");

const seedRoles = async () => {
  try {
    await connectDB();

    const rolesData = [
      {
        id: 1,
        name: "Admin",
        slug: "admin",
        guard: "web",
        is_default: false,
      },
      {
        id: 2,
        name: "B2B Customer",
        slug: "b2b-customer",
        guard: "app",
        is_default: false,
      },
      {
        id: 3,
        name: "B2C Seller",
        slug: "b2c-seller",
        guard: "web",
        is_default: false,
      },
      {
        id: 4,
        name: "B2C Customer",
        slug: "b2c-customer",
        guard: "app",
        is_default: true,
      },
      {
        id: 5,
        name: "B2B Buyer",
        slug: "b2b-buyer",
        guard: "app",
        is_default: false,
      },
      {
        id: 6,
        name: "B2B Seller",
        slug: "b2b-seller",
        guard: "app",
        is_default: false,
      },
      {
        id: 7,
        name: "Marketplace Admin",
        slug: "marketplace-admin",
        guard: "web",
        is_default: false,
      },
      {
        id: 8,
        name: "Compliance Admin",
        slug: "compliance-admin",
        guard: "web",
        is_default: false,
      },
      {
        id: 9,
        name: "Account Manager",
        slug: "account-manager",
        guard: "web",
        is_default: false,
      },
    ];

    for (const roleData of rolesData) {
      const existingRole = await Role.findOne({ id: roleData.id });

      if (!existingRole) {
        await Role.create(roleData);
        console.log(`Role "${roleData.name}" seeded successfully!`);
      } else {
        await Role.updateOne(
          { id: roleData.id },
          {
            name: roleData.name,
            slug: roleData.slug,
            guard: roleData.guard,
            is_default: roleData.is_default,
          }
        );

        console.log(`Role "${roleData.name}" already exists, updated!`);
      }
    }

    console.log("Role seeding completed successfully.");

    process.exit(0);
  } catch (error) {
    console.error("Error seeding roles:", error);
    process.exit(1);
  }
};

seedRoles();