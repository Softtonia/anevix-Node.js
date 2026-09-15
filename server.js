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
const brandRoutes = require("./src/routes/brandRoutes.js");
const productRoutes = require("./src/routes/productRoutes.js");
const productVariantRoutes = require("./src/routes/productVariantRoutes.js");
const productImageRoutes = require("./src/routes/productImageRoutes.js");
const inventoryRoutes = require("./src/routes/inventoryRoutes.js");
dotenv.config();

const app = express();
app.use(express.json({ strict: false }));

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
app.use("/api/brands", brandRoutes);
app.use("/api/products", productRoutes);
app.use("/api/variants", productVariantRoutes);
app.use("/api/products", productImageRoutes); // Nested routes like /api/products/:productId/images
app.use("/api/product-images", productImageRoutes); // Flat routes like /api/product-images/:imageId
app.use("/api", inventoryRoutes); // Handles both /api/products/.../inventory and /api/inventory/...
app.get("/", (req, res) => {
  res.json({
    message: "Anevix Backend is running",
  });
});

app.listen(process.env.PORT || 5000, () => {
  console.log("Server is running on port 5000");
});
