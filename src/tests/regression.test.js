const axios = require("axios");

const BASE_URL = "http://localhost:5000";

async function runRegressionTests() {
  console.log("\n=======================================================");
  console.log("  CHECKING RUNNING SERVER API REGRESSION");
  console.log("=======================================================\n");

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✓ ${message}`);
      passed++;
    } else {
      console.error(`  ✗ FAIL: ${message}`);
      failed++;
    }
  }

  try {
    // Check root
    const rootRes = await axios.get(`${BASE_URL}/`);
    assert(rootRes.status === 200 && rootRes.data.message === "Anevix Backend is running", "Server is running");

    // Check existing categories
    const catRes = await axios.get(`${BASE_URL}/api/product-categories`);
    assert(catRes.status === 200 && Array.isArray(catRes.data), "GET /api/product-categories responds 200 array");

    const subCatRes = await axios.get(`${BASE_URL}/api/product-sub-categories`);
    assert(subCatRes.status === 200 && Array.isArray(subCatRes.data), "GET /api/product-sub-categories responds 200 array");

    const nestedCatRes = await axios.get(`${BASE_URL}/api/product-nested-sub-categories`);
    assert(nestedCatRes.status === 200 && Array.isArray(nestedCatRes.data), "GET /api/product-nested-sub-categories responds 200 array");

    // Check existing products
    const prodRes = await axios.get(`${BASE_URL}/api/products`);
    assert(prodRes.status === 200 && Array.isArray(prodRes.data), "GET /api/products responds 200 array");

    // Check new config endpoints
    const customFieldsRes = await axios.get(`${BASE_URL}/api/category-custom-fields`);
    assert(customFieldsRes.status === 200 && Array.isArray(customFieldsRes.data), "GET /api/category-custom-fields responds 200 array");

    const guidelinesRes = await axios.get(`${BASE_URL}/api/category-guidelines`);
    assert(guidelinesRes.status === 200 && Array.isArray(guidelinesRes.data), "GET /api/category-guidelines responds 200 array");

    console.log("\n=======================================================");
    console.log(`  REGRESSION TESTS SUMMARY: Passed: ${passed}, Failed: ${failed}`);
    console.log("=======================================================\n");

    if (failed > 0) process.exit(1);
  } catch (error) {
    console.error("API error:", error.response ? error.response.data : error.message);
    process.exit(1);
  }
}

runRegressionTests();
