const SellerProfile = require("../models/SellerProfile");

/**
 * Middleware to enforce that a seller has a VERIFIED bank account
 * before they can access payout/withdrawal endpoints.
 */
const requireVerifiedSellerBank = async (req, res, next) => {
  try {
    const userId = req.b2cSeller?.id || req.user?.id;

    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const profile = await SellerProfile.findOne({ user: userId });

    if (!profile) {
      return res.status(403).json({ success: false, message: "Seller profile not found." });
    }

    if (profile.bankDetails?.verificationStatus !== "VERIFIED") {
      return res.status(403).json({ 
        success: false, 
        message: "Forbidden: Bank account must be verified to access this resource." 
      });
    }

    // Attach profile to request for downstream handlers if needed
    req.sellerProfile = profile;
    
    next();
  } catch (error) {
    console.error("requireVerifiedSellerBank Middleware Error:", error);
    res.status(500).json({ success: false, message: "Internal server error verifying bank status" });
  }
};

module.exports = {
  requireVerifiedSellerBank,
};
