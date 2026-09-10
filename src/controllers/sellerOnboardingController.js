const SellerProfile = require("../models/SellerProfile");
const User = require("../models/User");
const RoleHasUser = require("../models/RoleHasUser");
const Role = require("../models/Role");

const getSellerProfile = async (req, res) => {
  try {
    const userId = req.b2cSeller?.id || req.user?.id; // Fallback to req.user if generic auth used

    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    // Ensure the user actually has the b2c-seller role
    const sellerRole = await Role.findOne({ slug: "b2c-seller" });
    if (!sellerRole) {
      return res.status(500).json({ success: false, message: "Role configuration error" });
    }

    const hasRole = await RoleHasUser.findOne({ role_id: sellerRole.id, user_id: userId });
    if (!hasRole) {
      return res.status(403).json({ success: false, message: "Forbidden: Not a B2C Seller" });
    }

    // Retrieve the profile. It should have been created during OTP verification
    let profile = await SellerProfile.findOne({ user: userId });

    if (!profile) {
      // Defensive fallback creation just in case
      profile = await SellerProfile.findOneAndUpdate(
        { user: userId },
        { user: userId },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
    }

    return res.status(200).json({
      success: true,
      profile,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Something went wrong",
      error: error.message,
    });
  }
};

const submitStep1 = async (req, res) => {
  try {
    const userId = req.b2cSeller?.id || req.user?.id;

    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const sellerRole = await Role.findOne({ slug: "b2c-seller" });
    const hasRole = await RoleHasUser.findOne({ role_id: sellerRole.id, user_id: userId });
    if (!hasRole) {
      return res.status(403).json({ success: false, message: "Forbidden: Not a B2C Seller" });
    }

    const { companyName, businessType, sellerType, businessAddress, residentialAddress } = req.body;

    if (!companyName || !businessType || !sellerType || !businessAddress) {
      return res.status(400).json({ success: false, message: "Missing required fields" });
    }

    const profile = await SellerProfile.findOne({ user: userId });
    if (!profile) {
      return res.status(404).json({ success: false, message: "Seller profile not found. Please initialize onboarding first." });
    }

    if (profile.currentStep !== "SELLER_PROFILE" && profile.onboardingStatus !== "PENDING") {
      // Allow updates if they are rejected or suspended, but normally they shouldn't just arbitrary change this.
      // For now, allow simple updates to Step 1 data if they are still IN_PROGRESS or PENDING
    }

    profile.companyName = companyName;
    profile.businessType = businessType;
    profile.sellerType = sellerType;
    profile.businessAddress = businessAddress;
    if (residentialAddress) {
      profile.residentialAddress = residentialAddress;
    }

    // State transition
    profile.onboardingStatus = "IN_PROGRESS";
    profile.currentStep = "PAN_VERIFICATION";

    await profile.save();

    return res.status(200).json({
      success: true,
      message: "Step 1 completed successfully",
      profile,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Something went wrong",
      error: error.message,
    });
  }
};

module.exports = {
  getSellerProfile,
  submitStep1,
};
