const { verifyBankWithCashfree } = require("./providers/cashfreeBankProvider");

/**
 * Orchestrator service for Bank Account Verification.
 * Abstracts the specific provider away from the controller.
 */
const verifyBankAccount = async (accountNumber, ifscCode, accountHolderName, phoneNumber) => {
  // Fake data API
  return {
    success: true,
    status: "VERIFIED",
    accountHolderName: accountHolderName || "Fake Account Holder",
    bankName: "Fake State Bank",
    nameMatchScore: "100",
    nameMatchResult: "EXACT_MATCH",
    referenceId: `fake_bank_${Date.now()}`,
    message: "Bank account verified successfully (FAKE)",
  };
};

module.exports = {
  verifyBankAccount,
};
