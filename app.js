const express = require("express");
const path = require("path");
const cors = require("cors");

const adminRoutes = require("./src/routes/auth/adminRoutes.js");
const userRoutes = require("./src/routes/auth/userRoutes.js");
const roleRoutes = require("./src/routes/auth/roleRoutes.js");
const addressRoutes = require("./src/routes/address/addressRoutes.js");
const notificationRoutes = require("./src/routes/notification/notificationRoutes.js");
const customerAuthRoutes = require("./src/routes/auth/customerAuthRoutes.js");
const businessAuthRoutes = require("./src/routes/auth/businessAuthRoutes.js");
const sellerOnboardingRoutes = require("./src/routes/seller/sellerOnboardingRoutes.js");
const emailTemplateRoutes = require("./src/routes/notification/emailTemplateRoutes.js");
const productCategoryRoutes = require("./src/routes/category/productCategoryRoutes.js");
const brandRoutes = require("./src/routes/brand/brandRoutes.js");
const productRoutes = require("./src/routes/product/productRoutes.js");
const productVariantRoutes = require("./src/routes/product/productVariantRoutes.js");
const productImageRoutes = require("./src/routes/product/productImageRoutes.js");
const inventoryRoutes = require("./src/routes/inventory/inventoryRoutes.js");
const { router: uploadRoutes } = require("./src/routes/upload/uploadRoutes.js");
const categoryCustomFieldRoutes = require("./src/routes/category/categoryCustomFieldRoutes.js");
const categoryCustomFieldValueRoutes = require("./src/routes/category/categoryCustomFieldValueRoutes.js");
const categoryGuidelineRoutes = require("./src/routes/category/categoryGuidelineRoutes.js");
const categoryCatalogConfigRoutes = require("./src/routes/category/categoryCatalogConfigRoutes.js");
const categoryConfigurationRoutes = require("./src/routes/category/categoryConfigurationRoutes.js");
const campaignRoutes = require("./src/routes/campaign/campaignRoutes.js");
const hsnRoutes = require("./src/routes/tax/hsnRoutes.js");

const app = express();
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ strict: false }));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.use("/admin/campaigns", campaignRoutes);
app.use("/api/campaigns", campaignRoutes);
app.use("/admin/email-templates", emailTemplateRoutes);
app.use("/admin", adminRoutes);
app.use("/users", userRoutes);
app.use("/roles", roleRoutes);
app.use("/addresses", addressRoutes);
app.use("/notifications", notificationRoutes);
app.use("/auth/customer", customerAuthRoutes);
app.use("/auth/business", businessAuthRoutes);
app.use("/business/onboarding", sellerOnboardingRoutes);
app.use("/api/product-categories", productCategoryRoutes);
app.use("/api/brands", brandRoutes);
app.use("/api/products", productRoutes);
app.use("/products", productRoutes);
app.use("/api/variants", productVariantRoutes);
app.use("/variants", productVariantRoutes);
app.use("/", productImageRoutes);
app.use("/api", inventoryRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/upload", uploadRoutes);

// Category configuration system routes
app.use("/api/category-custom-fields", categoryCustomFieldRoutes);
app.use("/api/category-custom-field-values", categoryCustomFieldValueRoutes);
app.use("/api/category-guidelines", categoryGuidelineRoutes);
app.use("/api/category-catalog-configs", categoryCatalogConfigRoutes);
app.use("/api/category-configs", categoryConfigurationRoutes);
app.use("/api/hsn-codes", hsnRoutes);

app.get("/", (req, res) => {
  res.json({
    message: "Anevix Backend is running",
  });
});

// Centralized error handler (handles Multer errors gracefully)
app.use((err, req, res, next) => {
  if (err.name === 'MulterError') {
    return res.status(400).json({
      message: `File upload error: ${err.message}`,
      code: err.code,
      field: err.field
    });
  }
  if (err) {
    return res.status(500).json({
      message: err.message || 'Internal Server Error'
    });
  }
  next();
});

module.exports = app;
