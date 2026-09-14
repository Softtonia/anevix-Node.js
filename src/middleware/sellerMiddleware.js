const BankVerification = require("../models/BankVerification");

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

    const bankRecord = await BankVerification.findOne({ userId });

    if (!bankRecord) {
      return res.status(403).json({ success: false, message: "Bank verification record not found." });
    }

    if (bankRecord.verificationStatus !== "VERIFIED") {
      return res.status(403).json({ 
        success: false, 
        message: "Forbidden: Bank account must be verified to access this resource." 
      });
    }

    // Attach bank record to request for downstream handlers if needed
    req.bankVerification = bankRecord;
    
    next();
  } catch (error) {
    console.error("requireVerifiedSellerBank Middleware Error:", error);
    res.status(500).json({ success: false, message: "Internal server error verifying bank status" });
  }
};

module.exports = {
  requireVerifiedSellerBank,
};
