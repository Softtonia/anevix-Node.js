const app = require("./app");
const dotenv = require("dotenv");
const connectDB = require("./src/config/db.js");
const { initProductImageCleanup } = require("./src/utils/productImageCleanup.js");
const { initCampaignScheduler } = require("./src/services/campaignService.js");

dotenv.config();

connectDB();
initProductImageCleanup();
initCampaignScheduler();

app.listen(process.env.PORT || 5000, () => {
  console.log("Server is running on port 5000");
});
