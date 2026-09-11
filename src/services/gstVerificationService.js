const { verifyGstinWithCashfree } = require("./providers/cashfreeGstProvider");

/**
 * Orchestrator service for GSTIN Verification.
 * Abstracts the specific provider away from the controller.
 */
const verifyGSTIN = async (gstinNumber, businessName) => {
  // We can switch providers easily here in the future
  const result = await verifyGstinWithCashfree(gstinNumber, businessName);

  return result;
};

module.exports = {
  verifyGSTIN,
};
