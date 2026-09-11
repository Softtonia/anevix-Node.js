const User = require("../models/User");
const RoleHasUser = require("../models/RoleHasUser");
const Role = require("../models/Role");
const { verifyPAN: verifyPanService } = require("../services/panVerificationService");
const { verifyGSTIN: verifyGstService } = require("../services/gstVerificationService");
const { verifyBankAccount: verifyBankService } = require("../services/bankVerificationService");

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

const verifyPAN = async (req, res) => {
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

    const { panNumber, nameOnPan } = req.body;

    // Validate format (very basic regex for Indian PAN: 5 letters, 4 digits, 1 letter)
    const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
    if (!panNumber || !panRegex.test(panNumber.toUpperCase())) {
      return res.status(400).json({ success: false, message: "Invalid PAN format" });
    }
    if (!nameOnPan) {
      return res.status(400).json({ success: false, message: "Name on PAN is required" });
    }

    const profile = await SellerProfile.findOne({ user: userId });
    if (!profile) {
      return res.status(404).json({ success: false, message: "Seller profile not found. Please initialize onboarding first." });
    }

    if (profile.currentStep !== "PAN_VERIFICATION") {
      return res.status(400).json({ success: false, message: "Invalid onboarding step" });
    }

    // Idempotency check
    if (profile.panDetails?.verificationStatus === "VERIFIED" || profile.panDetails?.verificationStatus === "UNDER_REVIEW") {
      return res.status(400).json({ 
        success: false, 
        message: `PAN is already ${profile.panDetails.verificationStatus}`,
        panDetails: {
          verificationStatus: profile.panDetails.verificationStatus,
          nameOnPan: profile.panDetails.nameOnPan,
          panNumber: profile.panDetails.panNumber ? profile.panDetails.panNumber.substring(0, 5) + "****" + profile.panDetails.panNumber.substring(9) : null
        }
      });
    }

    // Call service abstraction
    const result = await verifyPanService(panNumber.toUpperCase(), nameOnPan, userId.toString());

    // Update profile
    profile.panDetails = {
      panNumber: panNumber.toUpperCase(),
      nameOnPan: result.nameOnPan || nameOnPan, // Prefer provider's returned name if available
      verificationStatus: result.status,
      verifiedAt: new Date(),
      referenceId: result.referenceId
    };

    if (result.status === "VERIFIED") {
      profile.currentStep = "GSTIN_VERIFICATION";
    }

    await profile.save();

    return res.status(200).json({
      success: result.success,
      message: result.message,
      status: result.status,
      panDetails: {
        verificationStatus: profile.panDetails.verificationStatus,
        nameOnPan: profile.panDetails.nameOnPan,
        panNumber: panNumber.substring(0, 5) + "****" + panNumber.substring(9)
      }
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Something went wrong",
      error: error.message,
    });
  }
};
const verifyGSTIN = async (req, res) => {
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

    const { gstinNumber, businessName } = req.body;

    if (!gstinNumber) {
      return res.status(400).json({ success: false, message: "GSTIN number is required" });
    }

    const profile = await SellerProfile.findOne({ user: userId });
    if (!profile) {
      return res.status(404).json({ success: false, message: "Seller profile not found. Please initialize onboarding first." });
    }

    // State Enforcement
    if (profile.currentStep !== "GSTIN_VERIFICATION") {
      return res.status(400).json({ success: false, message: "Invalid onboarding step. Must be at GSTIN_VERIFICATION step." });
    }

    if (profile.panDetails?.verificationStatus !== "VERIFIED") {
      return res.status(400).json({ success: false, message: "PAN verification must be completed first." });
    }

    // Idempotency check
    if (profile.gstinDetails?.verificationStatus === "VERIFIED" || profile.gstinDetails?.verificationStatus === "UNDER_REVIEW") {
      return res.status(400).json({ 
        success: false, 
        message: `GSTIN is already ${profile.gstinDetails.verificationStatus}`,
        gstinDetails: {
          verificationStatus: profile.gstinDetails.verificationStatus,
          legalName: profile.gstinDetails.legalName,
          gstinNumber: profile.gstinDetails.gstinNumber ? profile.gstinDetails.gstinNumber.substring(0, 5) + "**********" : null
        }
      });
    }

    // Call service abstraction
    const result = await verifyGstService(gstinNumber, businessName);

    // Update profile
    profile.gstinDetails = {
      gstinNumber: gstinNumber,
      legalName: result.legalName || businessName,
      tradeName: result.tradeName,
      registrationStatus: result.registrationStatus,
      state: result.state,
      registrationDate: result.registrationDate,
      verificationStatus: result.status,
      verifiedAt: new Date(),
      referenceId: result.referenceId
    };

    if (result.status === "VERIFIED") {
      profile.currentStep = "BANK_VERIFICATION";
    }

    await profile.save();

    return res.status(200).json({
      success: result.success,
      message: result.message,
      status: result.status,
      gstinDetails: {
        verificationStatus: profile.gstinDetails.verificationStatus,
        legalName: profile.gstinDetails.legalName,
        tradeName: profile.gstinDetails.tradeName,
        registrationStatus: profile.gstinDetails.registrationStatus,
        state: profile.gstinDetails.state,
        gstinNumber: gstinNumber.substring(0, 5) + "**********"
      }
    });

  } catch (error) {
    console.error("verifyGSTIN Controller Error:", error);
    return res.status(500).json({ success: false, message: "Internal server error during GSTIN verification" });
  }
};
const verifyBankAccount = async (req, res) => {
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

    const { accountNumber, ifscCode, accountHolderName } = req.body;

    if (!accountNumber || !ifscCode || !accountHolderName) {
      return res.status(400).json({ success: false, message: "Account number, IFSC code, and account holder name are required" });
    }

    // Need user for phone number
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const profile = await SellerProfile.findOne({ user: userId });
    if (!profile) {
      return res.status(404).json({ success: false, message: "Seller profile not found. Please initialize onboarding first." });
    }

    // State Enforcement
    if (profile.currentStep !== "BANK_VERIFICATION") {
      return res.status(400).json({ success: false, message: "Invalid onboarding step. Must be at BANK_VERIFICATION step." });
    }

    if (profile.panDetails?.verificationStatus !== "VERIFIED") {
      return res.status(400).json({ success: false, message: "PAN verification must be completed first." });
    }

    if (profile.gstinDetails?.verificationStatus !== "VERIFIED") {
      // Future logic: unless GST applicability rules explicitly make GST not required
      return res.status(400).json({ success: false, message: "GSTIN verification must be completed first." });
    }

    // Idempotency check
    if (profile.bankDetails?.verificationStatus === "VERIFIED" || profile.bankDetails?.verificationStatus === "MANUAL_REVIEW") {
      return res.status(400).json({ 
        success: false, 
        message: `Bank account is already ${profile.bankDetails.verificationStatus}`,
        bankDetails: {
          verificationStatus: profile.bankDetails.verificationStatus,
          accountHolderName: profile.bankDetails.accountHolderName,
          accountNumber: "XXXXXXXXXX"
        }
      });
    }

    // Call service abstraction
    const result = await verifyBankService(accountNumber, ifscCode, accountHolderName, user.phoneNumber);

    // Update profile
    profile.bankDetails = {
      accountNumber: accountNumber,
      ifscCode: ifscCode,
      accountHolderName: result.accountHolderName || accountHolderName,
      bankName: result.bankName,
      nameMatchScore: result.nameMatchScore,
      nameMatchResult: result.nameMatchResult,
      verificationStatus: result.status,
      verifiedAt: new Date(),
      referenceId: result.referenceId
    };

    if (result.status === "VERIFIED") {
      profile.currentStep = "PICKUP_ADDRESS";
    }

    await profile.save();

    return res.status(200).json({
      success: result.success,
      message: result.message,
      status: result.status,
      bankDetails: {
        verificationStatus: profile.bankDetails.verificationStatus,
        accountHolderName: profile.bankDetails.accountHolderName,
        bankName: profile.bankDetails.bankName,
        accountNumber: "XXXXXX" + accountNumber.slice(-4)
      }
    });

  } catch (error) {
    console.error("verifyBankAccount Controller Error:", error);
    return res.status(500).json({ success: false, message: "Internal server error during bank verification" });
  }
};

module.exports = {
  getSellerProfile,
  submitStep1,
  verifyPAN,
  verifyGSTIN,
  verifyBankAccount,
};
