const express = require("express");
const dotenv = require("dotenv");
const connectDB = require("./src/config/db.js");
const adminRoutes = require("./src/routes/adminRoutes.js");
const userRoutes = require("./src/routes/userRoutes.js");
const roleRoutes = require("./src/routes/roleRoutes.js");
const addressRoutes = require("./src/routes/addressRoutes.js");
const notificationRoutes = require("./src/routes/notificationRoutes.js");
const customerAuthRoutes = require("./src/routes/customerAuthRoutes.js");
const businessAuthRoutes = require("./src/routes/businessAuthRoutes.js");
const sellerOnboardingRoutes = require("./src/routes/sellerOnboardingRoutes.js");
const emailTemplateRoutes = require("./src/routes/emailTemplateRoutes.js");
const categoryRoutes = require("./src/routes/categoryRoutes.js");
const productCategoryRoutes = require("./src/routes/productCategoryRoutes.js");
const productSubCategoryRoutes = require("./src/routes/productSubCategoryRoutes.js");
const productNestedCategoryRoutes = require("./src/routes/productNestedCategoryRoutes.js");
const brandRoutes = require("./src/routes/brandRoutes.js");
const productRoutes = require("./src/routes/productRoutes.js");
const productVariantRoutes = require("./src/routes/productVariantRoutes.js");
const productImageRoutes = require("./src/routes/productImageRoutes.js");
const inventoryRoutes = require("./src/routes/inventoryRoutes.js");
const { router: uploadRoutes } = require("./src/routes/uploadRoutes.js");
const path = require("path");
dotenv.config();

const app = express();
app.use(express.json({ strict: false }));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

 connectDB();

app.use("/admin/email-templates", emailTemplateRoutes);
app.use("/admin", adminRoutes);
app.use("/users", userRoutes);
app.use("/roles", roleRoutes);
app.use("/addresses", addressRoutes);
app.use("/notifications", notificationRoutes);
app.use("/auth/customer", customerAuthRoutes);
app.use("/auth/business", businessAuthRoutes);
app.use("/seller/onboarding", sellerOnboardingRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/product-categories", productCategoryRoutes);
app.use("/api/product-sub-categories", productSubCategoryRoutes);
app.use("/api/product-nested-sub-categories", productNestedCategoryRoutes);
app.use("/api/brands", brandRoutes);
app.use("/api/products", productRoutes);
app.use("/api/variants", productVariantRoutes);
app.use("/", productImageRoutes);
app.use("/api", inventoryRoutes);
app.use("/api/upload", uploadRoutes);
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

app.listen(process.env.PORT || 5000, () => {

  console.log("Server is running on port 5000");
});
