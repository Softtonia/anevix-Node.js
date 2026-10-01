const { verifyPanWithCashfree } = require("./providers/cashfreeProvider");

/**
 * Orchestrator service for PAN Verification.
 * Abstracts the specific provider away from the controller.
 */
const verifyPAN = async (panNumber, nameOnPan, userId) => {
  // Fake data API
  return {
    success: true,
    status: "VERIFIED",
    nameOnPan: nameOnPan || "Fake Name",
    referenceId: `fake_pan_${Date.now()}`,
    message: "PAN verified successfully (FAKE)",
  };
};

module.exports = {
  verifyPAN,
};
