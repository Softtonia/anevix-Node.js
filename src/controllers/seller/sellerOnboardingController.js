const User = require("../../models/auth/User");
const SellerRegistration = require("../../models/seller/SellerRegistration");
const PanVerification = require("../../models/seller/PanVerification");
const GstinVerification = require("../../models/seller/GstinVerification");
const BankVerification = require("../../models/seller/BankVerification");
const RoleHasUser = require("../../models/auth/RoleHasUser");
const Role = require("../../models/auth/Role");
const B2CSellerProfile = require("../../models/seller/B2CSellerProfile");
const {
  verifyPAN: verifyPanService,
} = require("../../services/panVerificationService");
const {
  verifyGSTIN: verifyGstService,
} = require("../../services/gstVerificationService");
const {
  verifyBankAccount: verifyBankService,
} = require("../../services/bankVerificationService");
const { triggerCampaignEvent } = require("../../services/campaignService");

const getSellerProfile = async (req, res) => {
  try {
    const userId = req.b2cSeller?.id || req.user?.id; // Fallback to req.user if generic auth used

    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    // Ensure the user actually has a seller role
    const b2cRole = await Role.findOne({ slug: "b2c-seller" });
    const b2bRole = await Role.findOne({ slug: "b2b-seller" });
    
    const hasB2cRole = b2cRole ? await RoleHasUser.findOne({ role_id: b2cRole.id, user_id: userId }) : null;
    const hasB2bRole = b2bRole ? await RoleHasUser.findOne({ role_id: b2bRole.id, user_id: userId }) : null;

    if (!hasB2cRole && !hasB2bRole) {
      return res
        .status(403)
        .json({ success: false, message: "Forbidden: Not a Seller" });
    }

    // Retrieve the profile. It should have been created during OTP verification
    let profile = await SellerRegistration.findOne({ userId });

    if (!profile) {
      // Defensive fallback creation just in case
      profile = await SellerRegistration.findOneAndUpdate(
        { userId: userId },
        { userId: userId },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      );
    }

    const panDetails = await PanVerification.findOne({ userId }).select(
      "+panNumber",
    );
    const gstinDetails = await GstinVerification.findOne({ userId }).select(
      "+gstinNumber",
    );
    const bankDetails = await BankVerification.findOne({ userId }).select(
      "+accountNumber +ifscCode",
    );

    // Also fetch the B2CSellerProfile so the frontend has the correct ID for product uploads
    const B2CSellerProfile = require("../../models/seller/B2CSellerProfile");
    const b2cProfile = await B2CSellerProfile.findOne({ userId });

    // Fetch user details
    const user = await User.findById(userId).select(
      "firstName lastName email phoneNumber profileImage dateOfBirth lastLoginAt is_default createdAt updatedAt",
    );

    return res.status(200).json({
      success: true,
      profile: {
        ...profile.toObject(),
        b2cProfileId: b2cProfile ? b2cProfile._id : null,
        panDetails,
        gstinDetails,
        bankDetails,
        email: user?.email || null,
        phoneNumber: user?.phoneNumber || null,
        name: user
          ? `${user.firstName || ""} ${user.lastName || ""}`.trim()
          : null,
        profileImage: user?.profileImage || null,
        dateOfBirth: user?.dateOfBirth || null,
        lastLoginAt: user?.lastLoginAt || null,
        is_default: user?.is_default || false,
        userCreatedAt: user?.createdAt || null,
        userUpdatedAt: user?.updatedAt || null,
      },
      b2cProfile: b2cProfile ? b2cProfile.toObject() : null,
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

    const b2cRole = await Role.findOne({ slug: "b2c-seller" });
    const b2bRole = await Role.findOne({ slug: "b2b-seller" });
    const hasB2cRole = b2cRole
      ? await RoleHasUser.findOne({ role_id: b2cRole.id, user_id: userId })
      : null;
    const hasB2bRole = b2bRole
      ? await RoleHasUser.findOne({ role_id: b2bRole.id, user_id: userId })
      : null;

    if (!hasB2cRole && !hasB2bRole) {
      return res
        .status(403)
        .json({ success: false, message: "Forbidden: Not a Seller" });
    }

    // Support both flat payload (old) and nested payload (new frontend flow)
    const companyName =
      req.body.businessInfo?.businessName || req.body.companyName;
    const businessType =
      req.body.businessInfo?.businessType || req.body.businessType;
    const sellerType = req.body.businessInfo?.sellerType || req.body.sellerType;
    const businessAddress =
      req.body.businessInfo?.businessAddress || req.body.businessAddress;
    const residentialAddress = req.body.residentialAddress;

    if (!companyName || !businessType || !sellerType || !businessAddress) {
      return res
        .status(400)
        .json({ success: false, message: "Missing required fields" });
    }

    let profile = await SellerRegistration.findOne({ userId });
    if (!profile) {
      profile = new SellerRegistration({
        userId,
        companyName,
        businessType,
        sellerType,
        businessAddress,
      });
    }

    if (
      profile.currentStep !== "SELLER_PROFILE" &&
      profile.onboardingStatus !== "PENDING"
    ) {
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
    if (profile.onboardingStatus !== "REJECTED") {
      profile.onboardingStatus = "IN_PROGRESS";
    }
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

    const b2cRole = await Role.findOne({ slug: "b2c-seller" });
    const b2bRole = await Role.findOne({ slug: "b2b-seller" });
    const hasB2cRole = b2cRole
      ? await RoleHasUser.findOne({ role_id: b2cRole.id, user_id: userId })
      : null;
    const hasB2bRole = b2bRole
      ? await RoleHasUser.findOne({ role_id: b2bRole.id, user_id: userId })
      : null;
    if (!hasB2cRole && !hasB2bRole) {
      return res
        .status(403)
        .json({ success: false, message: "Forbidden: Not a Seller" });
    }

    const { panNumber, nameOnPan } = req.body;

    // Validate format (very basic regex for Indian PAN: 5 letters, 4 digits, 1 letter)
    const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
    if (!panNumber || !panRegex.test(panNumber.toUpperCase())) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid PAN format" });
    }
    if (!nameOnPan) {
      return res
        .status(400)
        .json({ success: false, message: "Name on PAN is required" });
    }

    let profile = await SellerRegistration.findOne({ userId });
    if (!profile) {
      // Auto-initialize profile if it doesn't exist
      profile = new SellerRegistration({
        userId,
        onboardingStatus: "IN_PROGRESS",
        currentStep: "PAN_VERIFICATION",
      });
      await profile.save();
    }

    let panRecord = await PanVerification.findOne({ userId });
    if (!panRecord) {
      panRecord = new PanVerification({ userId });
    }

    // Idempotency check: if exactly the same data and already verified, just return success
    if (
      (panRecord.verificationStatus === "VERIFIED" ||
        panRecord.verificationStatus === "UNDER_REVIEW") &&
      panRecord.panNumber === panNumber.toUpperCase() &&
      panRecord.nameOnPan === nameOnPan
    ) {
      return res.status(200).json({
        success: true,
        message: `PAN is already ${panRecord.verificationStatus}`,
        panDetails: {
          verificationStatus: panRecord.verificationStatus,
          nameOnPan: panRecord.nameOnPan,
          panNumber: panRecord.panNumber
            ? panRecord.panNumber.substring(0, 5) +
              "****" +
              panRecord.panNumber.substring(9)
            : null,
        },
      });
    }

    // Call service abstraction
    const result = await verifyPanService(
      panNumber.toUpperCase(),
      nameOnPan,
      userId.toString(),
    );

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
        panNumber: panNumber.substring(0, 5) + "****" + panNumber.substring(9),
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
const verifyGSTIN = async (req, res) => {
  try {
    const userId = req.b2cSeller?.id || req.user?.id;

    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const b2cRole = await Role.findOne({ slug: "b2c-seller" });
    const b2bRole = await Role.findOne({ slug: "b2b-seller" });
    const hasB2cRole = b2cRole
      ? await RoleHasUser.findOne({ role_id: b2cRole.id, user_id: userId })
      : null;
    const hasB2bRole = b2bRole
      ? await RoleHasUser.findOne({ role_id: b2bRole.id, user_id: userId })
      : null;
    if (!hasB2cRole && !hasB2bRole) {
      return res
        .status(403)
        .json({ success: false, message: "Forbidden: Not a Seller" });
    }

    const { gstinNumber, businessName } = req.body;

    if (!gstinNumber) {
      return res
        .status(400)
        .json({ success: false, message: "GSTIN number is required" });
    }

    const profile = await SellerRegistration.findOne({ userId });
    if (!profile) {
      return res
        .status(404)
        .json({
          success: false,
          message:
            "Seller registration not found. Please initialize onboarding first.",
        });
    }

    const panRecord = await PanVerification.findOne({ userId });
    if (!panRecord || panRecord.verificationStatus !== "VERIFIED") {
      return res
        .status(400)
        .json({
          success: false,
          message: "PAN verification must be completed first.",
        });
    }

    let gstinRecord = await GstinVerification.findOne({ userId });
    if (!gstinRecord) {
      gstinRecord = new GstinVerification({ userId });
    }

    // Idempotency check: if exactly the same data and already verified, just return success
    if (
      (gstinRecord.verificationStatus === "VERIFIED" ||
        gstinRecord.verificationStatus === "UNDER_REVIEW") &&
      gstinRecord.gstinNumber === gstinNumber
    ) {
      return res.status(200).json({
        success: true,
        message: `GSTIN is already ${gstinRecord.verificationStatus}`,
        gstinDetails: {
          verificationStatus: gstinRecord.verificationStatus,
          legalName: gstinRecord.legalName,
          gstinNumber: gstinRecord.gstinNumber
            ? gstinRecord.gstinNumber.substring(0, 5) + "**********"
            : null,
        },
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
        gstinNumber: gstinNumber.substring(0, 5) + "**********",
      },
    });
  } catch (error) {
    console.error("verifyGSTIN Controller Error:", error);
    return res
      .status(500)
      .json({
        success: false,
        message: "Internal server error during GSTIN verification",
      });
  }
};
const verifyBankAccount = async (req, res) => {
  try {
    const userId = req.b2cSeller?.id || req.user?.id;

    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const b2cRole = await Role.findOne({ slug: "b2c-seller" });
    const b2bRole = await Role.findOne({ slug: "b2b-seller" });
    const hasB2cRole = b2cRole
      ? await RoleHasUser.findOne({ role_id: b2cRole.id, user_id: userId })
      : null;
    const hasB2bRole = b2bRole
      ? await RoleHasUser.findOne({ role_id: b2bRole.id, user_id: userId })
      : null;
    if (!hasB2cRole && !hasB2bRole) {
      return res
        .status(403)
        .json({ success: false, message: "Forbidden: Not a Seller" });
    }

    const { accountNumber, ifscCode, accountHolderName } = req.body;

    if (!accountNumber || !ifscCode || !accountHolderName) {
      return res
        .status(400)
        .json({
          success: false,
          message:
            "Account number, IFSC code, and account holder name are required",
        });
    }

    // Need user for phone number
    const user = await User.findById(userId);
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    const profile = await SellerRegistration.findOne({ userId });
    if (!profile) {
      return res
        .status(404)
        .json({
          success: false,
          message:
            "Seller registration not found. Please initialize onboarding first.",
        });
    }

    const panRecord = await PanVerification.findOne({ userId });
    if (!panRecord || panRecord.verificationStatus !== "VERIFIED") {
      return res
        .status(400)
        .json({
          success: false,
          message: "PAN verification must be completed first.",
        });
    }

    const gstinRecord = await GstinVerification.findOne({ userId });
    if (!gstinRecord || gstinRecord.verificationStatus !== "VERIFIED") {
      // Future logic: unless GST applicability rules explicitly make GST not required
      return res
        .status(400)
        .json({
          success: false,
          message: "GSTIN verification must be completed first.",
        });
    }

    let bankRecord = await BankVerification.findOne({ userId });
    if (!bankRecord) {
      bankRecord = new BankVerification({ userId });
    }

    // Idempotency check: if exactly the same data and already verified, just return success
    if (
      (bankRecord.verificationStatus === "VERIFIED" ||
        bankRecord.verificationStatus === "MANUAL_REVIEW") &&
      bankRecord.accountNumber === accountNumber &&
      bankRecord.ifscCode === ifscCode
    ) {
      return res.status(200).json({
        success: true,
        message: `Bank account is already ${bankRecord.verificationStatus}`,
        bankDetails: {
          verificationStatus: bankRecord.verificationStatus,
          accountHolderName: bankRecord.accountHolderName,
          accountNumber: "XXXXXXXXXX",
        },
      });
    }

    // Call service abstraction
    const result = await verifyBankService(
      accountNumber,
      ifscCode,
      accountHolderName,
      user.phoneNumber,
    );

    // Update record
    bankRecord.accountNumber = accountNumber;
    bankRecord.ifscCode = ifscCode;
    bankRecord.accountHolderName =
      result.accountHolderName || accountHolderName;
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
        accountNumber: "XXXXXX" + accountNumber.slice(-4),
      },
    });
  } catch (error) {
    console.error("verifyBankAccount Controller Error:", error);
    return res
      .status(500)
      .json({
        success: false,
        message: "Internal server error during bank verification",
      });
  }
};

const registerCompleteB2CSeller = async (req, res) => {
  try {
    const userId = req.b2cSeller?.id || req.user?.id;

    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const b2cRole = await Role.findOne({ slug: "b2c-seller" });
    const b2bRole = await Role.findOne({ slug: "b2b-seller" });
    const hasB2cRole = b2cRole
      ? await RoleHasUser.findOne({ role_id: b2cRole.id, user_id: userId })
      : null;
    const hasB2bRole = b2bRole
      ? await RoleHasUser.findOne({ role_id: b2bRole.id, user_id: userId })
      : null;
    if (!hasB2cRole && !hasB2bRole) {
      return res
        .status(403)
        .json({ success: false, message: "Forbidden: Not a Seller" });
    }

    const { personalInfo, businessInfo, bankingInfo } = req.body;

    if (!personalInfo || !businessInfo || !bankingInfo) {
      return res
        .status(400)
        .json({
          success: false,
          message: "Missing personalInfo, businessInfo, or bankingInfo",
        });
    }

    let profile = await B2CSellerProfile.findOne({ userId });
    const sellerReg = await SellerRegistration.findOne({ userId });

    if (
      sellerReg &&
      ["UNDER_REVIEW", "APPROVED", "SUSPENDED"].includes(
        sellerReg.onboardingStatus,
      )
    ) {
      return res
        .status(400)
        .json({
          success: false,
          message: `Your application is already ${sellerReg.onboardingStatus}. You cannot submit it again.`,
        });
    }

    if (profile) {
      // Update existing profile
      if (personalInfo) {
        for (const key in personalInfo) {
          if (
            personalInfo[key] !== undefined &&
            personalInfo[key] !== null &&
            personalInfo[key] !== ""
          ) {
            profile.personalInfo[key] = personalInfo[key];
          }
        }
      }
      if (businessInfo) {
        for (const key in businessInfo) {
          if (
            businessInfo[key] !== undefined &&
            businessInfo[key] !== null &&
            businessInfo[key] !== ""
          ) {
            profile.businessInfo[key] = businessInfo[key];
          }
        }
      }
      if (bankingInfo) {
        for (const key in bankingInfo) {
          if (
            bankingInfo[key] !== undefined &&
            bankingInfo[key] !== null &&
            bankingInfo[key] !== ""
          ) {
            profile.bankingInfo[key] = bankingInfo[key];
          }
        }
      }
      profile.status = "UNDER_REVIEW";
      await profile.save();
    } else {
      // Create new profile
      profile = new B2CSellerProfile({
        userId,
        personalInfo,
        businessInfo,
        bankingInfo,
        status: "UNDER_REVIEW",
      });
      await profile.save();
    }

    if (sellerReg) {
      sellerReg.onboardingStatus = "UNDER_REVIEW";
      if (businessInfo) {
        sellerReg.companyName =
          businessInfo.businessName || sellerReg.companyName;
        sellerReg.businessType =
          businessInfo.businessType || sellerReg.businessType;
        sellerReg.sellerType = businessInfo.sellerType || sellerReg.sellerType;
        if (businessInfo.businessAddress) {
          sellerReg.businessAddress = businessInfo.businessAddress;
        }
      }
      await sellerReg.save();
    }

    // Optionally update user details (like Name, Phone) if needed
    const user = await User.findById(userId);
    if (user && personalInfo) {
      if (personalInfo.fullName) {
        const names = personalInfo.fullName.split(" ");
        user.firstName = names[0];
        user.lastName = names.slice(1).join(" ");
      }
      if (personalInfo.mobile) user.phoneNumber = personalInfo.mobile;
      if (personalInfo.email) user.email = personalInfo.email;
      if (personalInfo.dateOfBirth) user.dateOfBirth = personalInfo.dateOfBirth;
      await user.save();
    }

    // Determine the user to pass in event
    const finalUser = user ? user.toObject() : { _id: userId };
    triggerCampaignEvent("SELLER_ONBOARDING_COMPLETED", { user: finalUser });

    return res.status(200).json({
      success: true,
      message: "B2C Seller Registration submitted successfully",
      profile,
    });
  } catch (error) {
    console.error("registerCompleteB2CSeller Error:", error);
    return res.status(500).json({
      success: false,
      message: "Something went wrong",
      error: error.message,
    });
  }
};

const sendMobileOtp = async (req, res) => {
  try {
    const userId = req.b2cSeller?.id || req.user?.id;
    if (!userId)
      return res.status(401).json({ success: false, message: "Unauthorized" });

    const { mobile } = req.body;
    if (!mobile)
      return res
        .status(400)
        .json({ success: false, message: "Mobile number is required" });

    // Dummy OTP logic
    const dummyOtp = "123456";

    // In a real application, you would send the OTP via SMS here and hash it in DB
    const user = await User.findById(userId);
    if (user) {
      user.phoneNumber = mobile;
      // Storing plain for dummy, normally you hash this
      user.mobileOtpHash = dummyOtp;
      user.mobileOtpExpiresAt = new Date(Date.now() + 10 * 60000); // 10 mins
      await user.save();
    }

    return res.status(200).json({
      success: true,
      message: "OTP sent successfully (Dummy: 123456)",
      otp: dummyOtp, // Returning here only for testing
    });
  } catch (error) {
    return res
      .status(500)
      .json({ success: false, message: "Server error", error: error.message });
  }
};

const verifyMobileOtp = async (req, res) => {
  try {
    const userId = req.b2cSeller?.id || req.user?.id;
    if (!userId)
      return res.status(401).json({ success: false, message: "Unauthorized" });

    const { mobile, otp } = req.body;
    if (!mobile || !otp)
      return res
        .status(400)
        .json({ success: false, message: "Mobile and OTP are required" });

    const user = await User.findById(userId);
    if (!user)
      return res
        .status(404)
        .json({ success: false, message: "User not found" });

    if (user.phoneNumber !== mobile) {
      return res
        .status(400)
        .json({ success: false, message: "Mobile number mismatch" });
    }

    // Dummy verify logic
    if (otp !== "123456" && otp !== user.mobileOtpHash) {
      return res.status(400).json({ success: false, message: "Invalid OTP" });
    }

    user.isMobileVerified = true;
    user.mobileOtpHash = null;
    user.mobileOtpExpiresAt = null;
    await user.save();

    return res.status(200).json({
      success: true,
      message: "Mobile verified successfully",
    });
  } catch (error) {
    return res
      .status(500)
      .json({ success: false, message: "Server error", error: error.message });
  }
};

const updateSellerProfile = async (req, res) => {
  try {
    const userId = req.b2cSeller?.id || req.user?.id;
    if (!userId) return res.status(401).json({ success: false, message: "Unauthorized" });

    const { personalInfo, businessInfo, bankingInfo, profileImage } = req.body;

    let profile = await B2CSellerProfile.findOne({ userId });
    if (!profile) return res.status(404).json({ success: false, message: "Profile not found" });

    if (personalInfo) {
      for (const key in personalInfo) {
        if (personalInfo[key] !== undefined) profile.personalInfo[key] = personalInfo[key];
      }
    }
    if (businessInfo) {
      for (const key in businessInfo) {
        if (businessInfo[key] !== undefined) profile.businessInfo[key] = businessInfo[key];
      }
    }
    if (bankingInfo) {
      for (const key in bankingInfo) {
        if (bankingInfo[key] !== undefined) profile.bankingInfo[key] = bankingInfo[key];
      }
    }
    await profile.save();

    // Update SellerRegistration
    const sellerReg = await SellerRegistration.findOne({ userId });
    if (sellerReg && businessInfo) {
      if (businessInfo.businessName !== undefined) sellerReg.companyName = businessInfo.businessName;
      if (businessInfo.businessType !== undefined) sellerReg.businessType = businessInfo.businessType;
      if (businessInfo.sellerType !== undefined) sellerReg.sellerType = businessInfo.sellerType;
      if (businessInfo.businessAddress !== undefined) sellerReg.businessAddress = businessInfo.businessAddress;
      await sellerReg.save();
    }

    // Update User
    const user = await User.findById(userId);
    if (user) {
      if (personalInfo?.fullName) {
        const names = personalInfo.fullName.split(" ");
        user.firstName = names[0];
        user.lastName = names.slice(1).join(" ");
      }
      if (personalInfo?.mobile !== undefined) user.phoneNumber = personalInfo.mobile;
      if (personalInfo?.email !== undefined) user.email = personalInfo.email;
      if (personalInfo?.dateOfBirth !== undefined) user.dateOfBirth = personalInfo.dateOfBirth;
      if (profileImage !== undefined) user.profileImage = profileImage;
      await user.save();
    }

    return res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      profile,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

module.exports = {
  getSellerProfile,
  submitStep1,
  verifyPAN,
  verifyGSTIN,
  verifyBankAccount,
  registerCompleteB2CSeller,
  sendMobileOtp,
  verifyMobileOtp,
  updateSellerProfile,
};
