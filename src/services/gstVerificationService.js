const { verifyGstinWithCashfree } = require("./providers/cashfreeGstProvider");

/**
 * Orchestrator service for GSTIN Verification.
 * Abstracts the specific provider away from the controller.
 */
const verifyGSTIN = async (gstinNumber, businessName) => {
  // Fake data API
  return {
    success: true,
    status: "VERIFIED",
    gstin: gstinNumber,
    legalName: businessName || "Fake Legal Name",
    tradeName: "Fake Trade Name",
    registrationStatus: "ACTIVE",
    state: "Delhi",
    registrationDate: "2023-01-01",
    referenceId: `fake_gst_${Date.now()}`,
    message: "GSTIN verified successfully (FAKE)",
  };
};

module.exports = {
  verifyGSTIN,
};
