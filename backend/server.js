const express = require("express");
const dotenv = require("dotenv");
const connectDB = require("./src/config/db.js");
const adminRoutes = require("./src/routes/adminRoutes.js");
const userRoutes = require("./src/routes/userRoutes.js");

dotenv.config();

const app = express();
app.use(express.json());

 connectDB();

app.use("/api/admin", adminRoutes);
app.use("/api/users", userRoutes);

app.get("/", (req, res) => {
  res.json({
    message: "Anevix Backend is running",
  });
});

app.listen(process.env.PORT || 5000, () => {
  console.log("Server is running on port 5000");
});
