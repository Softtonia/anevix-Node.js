const axios = require("axios");

/**
 * Provider-specific integration for Cashfree Secure ID PAN Verification
 * Official docs indicate:
 * - Method: POST
 * - Endpoint: /verification/pan
 * - Headers: x-client-id, x-client-secret
 * - Payload: { pan: "...", name: "..." }
 * - Response: { reference_id: 1234, valid: true/false, status: "VALID"|"INVALID", name_provided: "...", registered_name: "..." }
 */
const verifyPanWithCashfree = async (panNumber, nameOnPan, userId) => {
  const baseUrl = (process.env.CASHFREE_BASE_URL || "https://sandbox.cashfree.com").trim();
  const endpointPath = "/verification/pan";
  const clientId = (process.env.CASHFREE_CLIENT_ID || "").trim();
  const clientSecret = (process.env.CASHFREE_CLIENT_SECRET || "").trim();

  if (!clientId || !clientSecret) {
    throw new Error("Cashfree credentials are not configured. Please add CASHFREE_CLIENT_ID and CASHFREE_CLIENT_SECRET to .env");
  }

  try {
    const response = await axios.post(
      `${baseUrl}${endpointPath}`,
      {
        pan: panNumber,
        name: nameOnPan
      },
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
    
    // Add safe debugging as requested
    console.log("=== CASHFREE RESPONSE DEBUG LOGS ===");
    console.log("HTTP Status:", response.status);
    console.log("Provider Valid Flag:", responseBody.valid);
    console.log("Provider Status:", responseBody.status);
    console.log("Provider Message:", responseBody.message);
    console.log("Provider Reference ID:", responseBody.reference_id);
    console.log("====================================");

    // Normalize response
    let internalStatus = "FAILED";
    let message = responseBody.message || "Verification failed";
    
    const providerStatus = (responseBody.status || "").toUpperCase();

    if (responseBody.valid === true || providerStatus === "VALID") {
      internalStatus = "VERIFIED";
      message = "PAN verified successfully";
    } else if (providerStatus === "INVALID") {
      internalStatus = "FAILED";
    } else {
      // Generic fallback for any weird state
      internalStatus = "UNDER_REVIEW";
    }

    return {
      success: internalStatus === "VERIFIED",
      status: internalStatus,
      nameOnPan: responseBody.registered_name || responseBody.name_provided || null,
      referenceId: responseBody.reference_id?.toString() || `cashfree_${Date.now()}`,
      message,
      providerResponse: responseBody
    };

  } catch (error) {
    console.error("=== CASHFREE ERROR DEBUG LOGS ===");
    console.error("HTTP Status:", error.response?.status || "Network/Timeout");
    // Do not log full config/request since it contains the client secret
    console.error("Provider Error Message/Body:", error.response?.data?.message || error.message);
    console.error("=================================");

    return {
      success: false,
      status: "FAILED",
      nameOnPan: null,
      referenceId: null,
      message: `Provider verification failed: ${error.response?.status || 'Network/Timeout'} - ${error.response?.data?.message || error.message}`,
    };
  }
};

module.exports = {
  verifyPanWithCashfree,
};
