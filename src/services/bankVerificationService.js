const { verifyBankWithCashfree } = require("./providers/cashfreeBankProvider");

/**
 * Orchestrator service for Bank Account Verification.
 * Abstracts the specific provider away from the controller.
 */
const verifyBankAccount = async (accountNumber, ifscCode, accountHolderName, phoneNumber) => {
  // We can switch providers easily here in the future
  const result = await verifyBankWithCashfree(accountNumber, ifscCode, accountHolderName, phoneNumber);

  return result;
};

module.exports = {
  verifyBankAccount,
};
