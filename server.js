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

app.get("/", (req, res) => {
  res.json({
    message: "Anevix Backend is running",
  });
});

app.listen(process.env.PORT || 5000, () => {
  console.log("Server is running on port 5000");
});
