const axios = require("axios");

/**
 * Provider-specific integration for Cashfree Secure ID Bank Account Verification (Sync V2)
 */
const verifyBankWithCashfree = async (accountNumber, ifscCode, accountHolderName, phoneNumber) => {
  const baseUrl = (process.env.CASHFREE_BASE_URL || "https://sandbox.cashfree.com").trim();
  const endpointPath = "/verification/bank-account/sync";
  const clientId = (process.env.CASHFREE_CLIENT_ID || "").trim();
  const clientSecret = (process.env.CASHFREE_CLIENT_SECRET || "").trim();

  if (!clientId || !clientSecret) {
    throw new Error("Cashfree credentials are not configured");
  }

  const payload = {
    bank_account: accountNumber,
    bank_ifsc: ifscCode,
    name: accountHolderName
  };

  // Add phone if provided, as it is recommended/required by some BAV flows
  if (phoneNumber) {
    payload.phone = phoneNumber;
  }

  try {
    const response = await axios.post(
      `${baseUrl}${endpointPath}`,
      payload,
      {
        headers: {
          "x-client-id": clientId,
          "x-client-secret": clientSecret,
          "Content-Type": "application/json",
        },
        timeout: 10000,
      }
    );

    const responseBody = response.data;
    
    // Add safe debugging
    console.log("=== CASHFREE BANK VERIFICATION RESPONSE DEBUG LOGS ===");
    console.log("HTTP Status:", response.status);
    console.log("Provider Account Status:", responseBody.account_status);
    console.log("Provider Status Code:", responseBody.account_status_code);
    console.log("Provider Name Match Result:", responseBody.name_match_result);
    console.log("Provider Reference ID:", responseBody.reference_id);
    console.log("====================================================");

    // Normalize response
    let internalStatus = "FAILED";
    let message = "Bank account verification failed";
    
    const accountStatus = (responseBody.account_status || "").toUpperCase();

    // Map according to strict rules
    if (accountStatus === "VALID") {
      internalStatus = "VERIFIED";
      message = "Bank account verified successfully";
    } else if (accountStatus === "IN_PROCESS") {
      internalStatus = "MANUAL_REVIEW";
      message = "Bank account verification is under process";
    } else if (accountStatus === "INVALID" || accountStatus === "FAILED") {
      internalStatus = "FAILED";
      message = `Bank account is ${accountStatus.toLowerCase()}`;
    } else {
      internalStatus = "FAILED";
    }

    return {
      success: internalStatus === "VERIFIED",
      status: internalStatus,
      accountHolderName: responseBody.name_at_bank || accountHolderName,
      bankName: responseBody.bank_name || null,
      nameMatchScore: responseBody.name_match_score ? responseBody.name_match_score.toString() : null,
      nameMatchResult: responseBody.name_match_result || null,
      referenceId: responseBody.reference_id?.toString() || `cashfree_bank_${Date.now()}`,
      message,
      providerResponse: responseBody
    };

  } catch (error) {
    console.error("=== CASHFREE BANK VERIFICATION ERROR DEBUG LOGS ===");
    console.error("HTTP Status:", error.response?.status || "Network/Timeout");
    console.error("Provider Error Message/Body:", error.response?.data || error.message);
    console.error("===================================================");

    return {
      success: false,
      status: "FAILED",
      accountHolderName: null,
      bankName: null,
      nameMatchScore: null,
      nameMatchResult: null,
      referenceId: null,
      message: `Provider verification failed: ${error.response?.status || 'Network/Timeout'} - ${error.response?.data?.message || error.message}`,
    };
  }
};

module.exports = {
  verifyBankWithCashfree,
};
