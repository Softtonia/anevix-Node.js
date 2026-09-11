const { verifyPanWithCashfree } = require("./providers/cashfreeProvider");

/**
 * Orchestrator service for PAN Verification.
 * Abstracts the specific provider away from the controller.
 */
const verifyPAN = async (panNumber, nameOnPan, userId) => {
  // We can switch providers easily here in the future
  const result = await verifyPanWithCashfree(panNumber, nameOnPan, userId);

  return result;
};

module.exports = {
  verifyPAN,
};
