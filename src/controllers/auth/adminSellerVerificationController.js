const SellerRegistration = require("../../models/seller/SellerRegistration");
const PanVerification = require("../../models/seller/PanVerification");
const GstinVerification = require("../../models/seller/GstinVerification");
const BankVerification = require("../../models/seller/BankVerification");
const B2CSellerProfile = require("../../models/seller/B2CSellerProfile");
const User = require("../../models/auth/User");

const getAllSellerOnboardings = async (req, res) => {
  try {
    const status = req.query.status;
    let query = {};
    if (status) {
      query.onboardingStatus = status;
    }

    const registrations = await SellerRegistration.find(query)
      .populate("userId", "firstName lastName email phoneNumber")
      .lean();

    // Attach verifications
    for (let reg of registrations) {
      if (!reg.userId) continue;
      const pan = await PanVerification.findOne({ userId: reg.userId._id }).lean();
      const gstin = await GstinVerification.findOne({ userId: reg.userId._id }).lean();
      const bank = await BankVerification.findOne({ userId: reg.userId._id }).lean();
      const b2cProfile = await B2CSellerProfile.findOne({ userId: reg.userId._id }).lean();
      
      reg.panDetails = pan;
      reg.gstinDetails = gstin;
      reg.bankDetails = bank;
      reg.b2cProfile = b2cProfile;
    }

    return res.status(200).json({
      success: true,
      data: registrations
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Error fetching onboardings", error: error.message });
  }
};

const verifySellerOnboarding = async (req, res) => {
  try {
    const { id } = req.params; // SellerRegistration ID
    const { status, reviewNotes } = req.body; // APPROVED or REJECTED

    if (!["APPROVED", "REJECTED"].includes(status)) {
       return res.status(400).json({ success: false, message: "Invalid status. Must be APPROVED or REJECTED" });
    }

    const registration = await SellerRegistration.findById(id);
    if (!registration) {
       return res.status(404).json({ success: false, message: "Registration not found" });
    }

    registration.onboardingStatus = status;
    registration.approvalDetails = {
      reviewedBy: req.admin ? req.admin.id : null,
      reviewNotes: reviewNotes || "",
      approvedAt: status === "APPROVED" ? new Date() : null
    };
    
    if (status === "APPROVED") {
        registration.currentStep = "COMPLETED";
    }

    await registration.save();

    // Also update B2CSellerProfile if it exists
    const b2cProfile = await B2CSellerProfile.findOne({ userId: registration.userId });
    if (b2cProfile) {
        b2cProfile.status = status;
        await b2cProfile.save();
    }

    return res.status(200).json({
      success: true,
      message: `Seller onboarding successfully marked as ${status}`,
      registration
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Error verifying onboarding", error: error.message });
  }
};

module.exports = { getAllSellerOnboardings, verifySellerOnboarding };
