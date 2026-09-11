const axios = require("axios");

/**
 * Provider-specific integration for Cashfree Secure ID GSTIN Verification
 */
const verifyGstinWithCashfree = async (gstinNumber, businessName) => {
  const baseUrl = (process.env.CASHFREE_BASE_URL || "https://sandbox.cashfree.com").trim();
  const endpointPath = "/verification/gstin";
  const clientId = (process.env.CASHFREE_CLIENT_ID || "").trim();
  const clientSecret = (process.env.CASHFREE_CLIENT_SECRET || "").trim();

  if (!clientId || !clientSecret) {
    throw new Error("Cashfree credentials are not configured");
  }

  try {
    const response = await axios.post(
      `${baseUrl}${endpointPath}`,
      {
        GSTIN: gstinNumber,
        business_name: businessName || "" // optional in some versions, but included
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
    console.log("=== CASHFREE GSTIN RESPONSE DEBUG LOGS ===");
    console.log("HTTP Status:", response.status);
    console.log("Provider Valid Flag:", responseBody.valid);
    console.log("Provider Status:", responseBody.status);
    console.log("Provider Message:", responseBody.message);
    console.log("Provider Reference ID:", responseBody.reference_id);
    console.log("========================================");

    // Normalize response
    let internalStatus = "FAILED";
    let message = responseBody.message || "GSTIN verification failed";
    
    const providerStatus = (responseBody.status || "").toUpperCase();

    // Map based on actual cashfree response fields
    if (responseBody.valid === true || providerStatus === "ACTIVE" || providerStatus === "VALID") {
      internalStatus = "VERIFIED";
      message = "GSTIN verified successfully";
    } else if (providerStatus === "PENDING") {
      internalStatus = "UNDER_REVIEW";
      message = "GSTIN verification is pending";
    } else if (providerStatus === "SUSPENDED" || providerStatus === "CANCELLED" || providerStatus === "INVALID") {
      internalStatus = "REJECTED";
      message = `GSTIN is ${providerStatus.toLowerCase()}`;
    } else {
      internalStatus = "FAILED";
    }

    return {
      success: internalStatus === "VERIFIED",
      status: internalStatus,
      gstin: gstinNumber,
      legalName: responseBody.legal_name || responseBody.business_name || null,
      tradeName: responseBody.trade_name || null,
      registrationStatus: responseBody.status || "UNKNOWN",
      state: responseBody.state || null,
      registrationDate: responseBody.registration_date || null,
      referenceId: responseBody.reference_id?.toString() || `cashfree_gst_${Date.now()}`,
      message,
      providerResponse: responseBody
    };

  } catch (error) {
    console.error("=== CASHFREE GSTIN ERROR DEBUG LOGS ===");
    console.error("HTTP Status:", error.response?.status || "Network/Timeout");
    console.error("Provider Error Message/Body:", error.response?.data?.message || error.message);
    console.error("=======================================");

    return {
      success: false,
      status: "FAILED",
      gstin: gstinNumber,
      legalName: null,
      tradeName: null,
      registrationStatus: null,
      state: null,
      registrationDate: null,
      referenceId: null,
      message: `Provider verification failed: ${error.response?.status || 'Network/Timeout'} - ${error.response?.data?.message || error.message}`,
    };
  }
};

module.exports = {
  verifyGstinWithCashfree,
};
