const User = require("../models/User");
const SellerRegistration = require("../models/SellerRegistration");
const PanVerification = require("../models/PanVerification");
const GstinVerification = require("../models/GstinVerification");
const BankVerification = require("../models/BankVerification");
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
    let profile = await SellerRegistration.findOne({ userId });

    if (!profile) {
      // Defensive fallback creation just in case
      profile = await SellerRegistration.findOneAndUpdate(
        { userId: userId },
        { userId: userId },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
    }

    const panDetails = await PanVerification.findOne({ userId });
    const gstinDetails = await GstinVerification.findOne({ userId });
    const bankDetails = await BankVerification.findOne({ userId });

    return res.status(200).json({
      success: true,
      profile: {
        ...profile.toObject(),
        panDetails,
        gstinDetails,
        bankDetails
      },
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

    const profile = await SellerRegistration.findOne({ userId });
    if (!profile) {
      return res.status(404).json({ success: false, message: "Seller registration not found. Please initialize onboarding first." });
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

    const profile = await SellerRegistration.findOne({ userId });
    if (!profile) {
      return res.status(404).json({ success: false, message: "Seller registration not found. Please initialize onboarding first." });
    }

    if (profile.currentStep !== "PAN_VERIFICATION") {
      return res.status(400).json({ success: false, message: "Invalid onboarding step" });
    }

    let panRecord = await PanVerification.findOne({ userId });
    if (!panRecord) {
      panRecord = new PanVerification({ userId });
    }

    // Idempotency check
    if (panRecord.verificationStatus === "VERIFIED" || panRecord.verificationStatus === "UNDER_REVIEW") {
      return res.status(400).json({ 
        success: false, 
        message: `PAN is already ${panRecord.verificationStatus}`,
        panDetails: {
          verificationStatus: panRecord.verificationStatus,
          nameOnPan: panRecord.nameOnPan,
          panNumber: panRecord.panNumber ? panRecord.panNumber.substring(0, 5) + "****" + panRecord.panNumber.substring(9) : null
        }
      });
    }

    // Call service abstraction
    const result = await verifyPanService(panNumber.toUpperCase(), nameOnPan, userId.toString());

    // Update pan record
    panRecord.panNumber = panNumber.toUpperCase();
    panRecord.nameOnPan = result.nameOnPan || nameOnPan;
    panRecord.verificationStatus = result.status;
    panRecord.verificationTimestamp = new Date();
    panRecord.providerReferenceId = result.referenceId;
    await panRecord.save();

    if (result.status === "VERIFIED") {
      profile.currentStep = "GSTIN_VERIFICATION";
      await profile.save();
    }

    return res.status(200).json({
      success: result.success,
      message: result.message,
      status: result.status,
      panDetails: {
        verificationStatus: panRecord.verificationStatus,
        nameOnPan: panRecord.nameOnPan,
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

    const profile = await SellerRegistration.findOne({ userId });
    if (!profile) {
      return res.status(404).json({ success: false, message: "Seller registration not found. Please initialize onboarding first." });
    }

    // State Enforcement
    if (profile.currentStep !== "GSTIN_VERIFICATION") {
      return res.status(400).json({ success: false, message: "Invalid onboarding step. Must be at GSTIN_VERIFICATION step." });
    }

    const panRecord = await PanVerification.findOne({ userId });
    if (!panRecord || panRecord.verificationStatus !== "VERIFIED") {
      return res.status(400).json({ success: false, message: "PAN verification must be completed first." });
    }

    let gstinRecord = await GstinVerification.findOne({ userId });
    if (!gstinRecord) {
      gstinRecord = new GstinVerification({ userId });
    }

    // Idempotency check
    if (gstinRecord.verificationStatus === "VERIFIED" || gstinRecord.verificationStatus === "UNDER_REVIEW") {
      return res.status(400).json({ 
        success: false, 
        message: `GSTIN is already ${gstinRecord.verificationStatus}`,
        gstinDetails: {
          verificationStatus: gstinRecord.verificationStatus,
          legalName: gstinRecord.legalName,
          gstinNumber: gstinRecord.gstinNumber ? gstinRecord.gstinNumber.substring(0, 5) + "**********" : null
        }
      });
    }

    // Call service abstraction
    const result = await verifyGstService(gstinNumber, businessName);

    // Update record
    gstinRecord.gstinNumber = gstinNumber;
    gstinRecord.legalName = result.legalName || businessName;
    gstinRecord.tradeName = result.tradeName;
    gstinRecord.registrationStatus = result.registrationStatus;
    gstinRecord.state = result.state;
    gstinRecord.registrationDate = result.registrationDate;
    gstinRecord.verificationStatus = result.status;
    await gstinRecord.save();

    if (result.status === "VERIFIED") {
      profile.currentStep = "BANK_VERIFICATION";
      await profile.save();
    }

    return res.status(200).json({
      success: result.success,
      message: result.message,
      status: result.status,
      gstinDetails: {
        verificationStatus: gstinRecord.verificationStatus,
        legalName: gstinRecord.legalName,
        tradeName: gstinRecord.tradeName,
        registrationStatus: gstinRecord.registrationStatus,
        state: gstinRecord.state,
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

    const profile = await SellerRegistration.findOne({ userId });
    if (!profile) {
      return res.status(404).json({ success: false, message: "Seller registration not found. Please initialize onboarding first." });
    }

    // State Enforcement
    if (profile.currentStep !== "BANK_VERIFICATION") {
      return res.status(400).json({ success: false, message: "Invalid onboarding step. Must be at BANK_VERIFICATION step." });
    }

    const panRecord = await PanVerification.findOne({ userId });
    if (!panRecord || panRecord.verificationStatus !== "VERIFIED") {
      return res.status(400).json({ success: false, message: "PAN verification must be completed first." });
    }

    const gstinRecord = await GstinVerification.findOne({ userId });
    if (!gstinRecord || gstinRecord.verificationStatus !== "VERIFIED") {
      // Future logic: unless GST applicability rules explicitly make GST not required
      return res.status(400).json({ success: false, message: "GSTIN verification must be completed first." });
    }

    let bankRecord = await BankVerification.findOne({ userId });
    if (!bankRecord) {
      bankRecord = new BankVerification({ userId });
    }

    // Idempotency check
    if (bankRecord.verificationStatus === "VERIFIED" || bankRecord.verificationStatus === "MANUAL_REVIEW") {
      return res.status(400).json({ 
        success: false, 
        message: `Bank account is already ${bankRecord.verificationStatus}`,
        bankDetails: {
          verificationStatus: bankRecord.verificationStatus,
          accountHolderName: bankRecord.accountHolderName,
          accountNumber: "XXXXXXXXXX"
        }
      });
    }

    // Call service abstraction
    const result = await verifyBankService(accountNumber, ifscCode, accountHolderName, user.phoneNumber);

    // Update record
    bankRecord.accountNumber = accountNumber;
    bankRecord.ifscCode = ifscCode;
    bankRecord.accountHolderName = result.accountHolderName || accountHolderName;
    bankRecord.bankName = result.bankName;
    bankRecord.verificationStatus = result.status;
    await bankRecord.save();

    if (result.status === "VERIFIED") {
      profile.currentStep = "PICKUP_ADDRESS";
      await profile.save();
    }

    return res.status(200).json({
      success: result.success,
      message: result.message,
      status: result.status,
      bankDetails: {
        verificationStatus: bankRecord.verificationStatus,
        accountHolderName: bankRecord.accountHolderName,
        bankName: bankRecord.bankName,
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
