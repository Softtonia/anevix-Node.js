const axios = require("axios");

/**
 * Provider-specific integration for SignCare PAN Verification
 * Official docs indicate:
 * - Method: POST
 * - Endpoint: /api/v1/kyc/pan/verify
 * - Headers: X-API-KEY, X-API-APP-ID
 * - Payload: { pan: "...", consent: "Y" }
 * - Response: { status: "verified" | "failed" | "review", name: "...", dob: "...", last_updated: "..." }
 */
const verifyPanWithSignCare = async (panNumber, nameOnPan, userId) => {
  const baseUrl = process.env.SIGNCARE_BASE_URL || "https://uat-ext.signcare.io";
  const endpointPath = "/api/v1/pan/verify";
  const apiKey = (process.env.SIGNCARE_API_KEY || "").trim();
  const appId = (process.env.SIGNCARE_APP_ID || "").trim();

  if (!apiKey || !appId) {
    throw new Error("SignCare credentials are not configured");
  }

  // Idempotency request_id: reuse same ID for same user + PAN retry
  const requestId = userId ? `${userId}_${panNumber}` : `req_${Date.now()}`;

  try {
    const response = await axios.post(
      `${baseUrl}${endpointPath}`,
      {
        request_id: requestId,
        pan_number: panNumber,
        pan_holder_name: nameOnPan,
        pan: panNumber, // Documented field requested by user
        consent: "Y",
        consent_text: "I hear by declare my consent agreement for fetching my information via SignCare API",
      },
      {
        headers: {
          "X-API-KEY": apiKey,
          "X-API-APP-ID": appId,
          "Content-Type": "application/json",
        },
        timeout: 10000,
      }
    );

    const responseBody = response.data;
    const providerData = responseBody.data || {};
    
    // Add safe debugging as requested
    console.log("=== SIGNCARE RESPONSE DEBUG LOGS ===");
    console.log("HTTP Status:", response.status);
    console.log("Provider Success:", responseBody.success);
    console.log("Provider Status:", providerData.status);
    console.log("Provider Message:", responseBody.message);
    console.log("Provider Request ID:", responseBody.request_id);
    console.log("====================================");

    // Normalize response
    let internalStatus = "FAILED";
    let message = responseBody.message || "Verification failed";
    
    // Some providers return status in different cases or use 'verified' instead of 'VALID'
    const providerStatus = (providerData.status || "").toLowerCase();

    if (responseBody.success && (providerStatus === "verified" || providerStatus === "valid")) {
      internalStatus = "VERIFIED";
      message = "PAN verified successfully";
    } else if (providerStatus === "review" || providerStatus === "manual") {
      internalStatus = "UNDER_REVIEW";
      message = "PAN verification requires manual review";
    } else if (providerStatus === "rejected") {
      internalStatus = "REJECTED";
      message = "PAN verification was rejected by provider";
    }

    return {
      success: internalStatus === "VERIFIED",
      status: internalStatus,
      nameOnPan: providerData.name || null,
      referenceId: responseBody.request_id || `signcare_${Date.now()}`,
      message,
      providerResponse: responseBody
    };

  } catch (error) {
    console.error("=== SIGNCARE ERROR DEBUG LOGS ===");
    console.error("HTTP Status:", error.response?.status || "Network/Timeout");
    console.error("Provider Error Message/Body:", error.response?.data || error.message);
    console.error("=================================");

    return {
      success: false,
      status: "FAILED",
      nameOnPan: null,
      referenceId: null,
      message: `Provider verification failed: ${error.response?.status || 'Network/Timeout'} - ${JSON.stringify(error.response?.data || error.message)}`,
    };
  }
};

module.exports = {
  verifyPanWithSignCare,
};
