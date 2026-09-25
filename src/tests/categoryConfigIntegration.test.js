const mongoose = require("mongoose");
const dotenv = require("dotenv");
dotenv.config();

const ProductCategory = require("../models/ProductCategory");
const ProductSubCategory = require("../models/ProductSubCategory");
const ProductNestedSubCategory = require("../models/ProductNestedSubCategory");
const Category = require("../models/Category");
const CategoryCustomField = require("../models/CategoryCustomField");
const CategoryCustomFieldValue = require("../models/CategoryCustomFieldValue");
const CategoryGuideline = require("../models/CategoryGuideline");
const CategoryCatalogConfig = require("../models/CategoryCatalogConfig");
const CategoryResolver = require("../services/categoryResolver");
const CategoryConfigService = require("../services/categoryConfigService");

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

async function runTests() {
  console.log("\n=======================================================");
  console.log("  STARTING CATEGORY CONFIGURATION INTEGRATION TESTS");
  console.log("=======================================================\n");

  await mongoose.connect(process.env.MONGO_URL);

  const timestamp = Date.now();

  try {
    // ----------------------------------------------------
    // TEST 1: ProductCategory, ProductSubCategory, ProductNestedSubCategory resolution
    // ----------------------------------------------------
    console.log("1. Testing 3-tier CategoryResolver & Ancestry...");
    const cat1 = await ProductCategory.create({
      cat_name: `Test Cat ${timestamp}`,
      slug: `test-cat-${timestamp}`,
    });

    const subCat1 = await ProductSubCategory.create({
      cat_id: cat1._id,
      sub_cat_name: `Test SubCat ${timestamp}`,
      slug: `test-subcat-${timestamp}`,
    });

    const nestedCat1 = await ProductNestedSubCategory.create({
      sub_cat_id: subCat1._id,
      name: `Test NestedCat ${timestamp}`,
      slug: `test-nestedcat-${timestamp}`,
    });

    const ancestry3Tier = await CategoryResolver.resolveAncestry(
      "ProductNestedSubCategory",
      nestedCat1._id
    );

    assert(ancestry3Tier.length === 3, "Ancestry contains exactly 3 tiers");
    assert(ancestry3Tier[0].type === "ProductCategory" && ancestry3Tier[0].level === 1, "Level 1 is ProductCategory");
    assert(ancestry3Tier[1].type === "ProductSubCategory" && ancestry3Tier[1].level === 2, "Level 2 is ProductSubCategory");
    assert(ancestry3Tier[2].type === "ProductNestedSubCategory" && ancestry3Tier[2].level === 3, "Level 3 is ProductNestedSubCategory");

    const breadcrumb = CategoryResolver.buildBreadcrumb(ancestry3Tier);
    assert(breadcrumb[0].name === cat1.cat_name, "Breadcrumb correctly starts with Level 1");
    assert(breadcrumb[2].name === nestedCat1.name, "Breadcrumb correctly ends with Level 3");

    // ----------------------------------------------------
    // TEST 2: Generic Category model resolution (2-level, 3-level, 5-level)
    // ----------------------------------------------------
    console.log("\n2. Testing Generic Category Arbitrary-Depth Traversal (5 levels)...");
    const gL1 = await Category.create({ name: `G Root ${timestamp}`, slug: `g-root-${timestamp}`, parentId: null });
    const gL2 = await Category.create({ name: `G L2 ${timestamp}`, slug: `g-l2-${timestamp}`, parentId: gL1._id });
    const gL3 = await Category.create({ name: `G L3 ${timestamp}`, slug: `g-l3-${timestamp}`, parentId: gL2._id });
    const gL4 = await Category.create({ name: `G L4 ${timestamp}`, slug: `g-l4-${timestamp}`, parentId: gL3._id });
    const gL5 = await Category.create({ name: `G L5 ${timestamp}`, slug: `g-l5-${timestamp}`, parentId: gL4._id });

    const ancestry5Level = await CategoryResolver.resolveAncestry("Category", gL5._id);
    assert(ancestry5Level.length === 5, "Generic Category resolves 5 levels correctly");
    assert(ancestry5Level[0].id === gL1._id.toString() && ancestry5Level[0].level === 1, "Root has level 1");
    assert(ancestry5Level[4].id === gL5._id.toString() && ancestry5Level[4].level === 5, "Leaf has level 5");

    // ----------------------------------------------------
    // TEST 3: Cycle Protection in Generic Category
    // ----------------------------------------------------
    console.log("\n3. Testing Cycle Protection in Generic Category...");
    const cycleA = await Category.create({ name: `Cycle A ${timestamp}`, slug: `cycle-a-${timestamp}`, parentId: null });
    const cycleB = await Category.create({ name: `Cycle B ${timestamp}`, slug: `cycle-b-${timestamp}`, parentId: cycleA._id });
    cycleA.parentId = cycleB._id; // create circular reference
    await cycleA.save();

    let cycleCaught = false;
    try {
      await CategoryResolver.resolveAncestry("Category", cycleA._id);
    } catch (err) {
      if (err.message.includes("Cycle detected")) {
        cycleCaught = true;
      }
    }
    assert(cycleCaught, "Cycle detected error thrown on circular category hierarchy");

    // ----------------------------------------------------
    // TEST 4: Invalid category & category_type validation
    // ----------------------------------------------------
    console.log("\n4. Testing Category validation errors...");
    let invalidTypeCaught = false;
    try {
      await CategoryResolver.findNode("InvalidType", cat1._id);
    } catch (err) {
      invalidTypeCaught = true;
    }
    assert(invalidTypeCaught, "Invalid category_type rejected");

    let nonexistentCaught = false;
    try {
      await CategoryResolver.findNode("ProductCategory", new mongoose.Types.ObjectId());
    } catch (err) {
      nonexistentCaught = err.statusCode === 404;
    }
    assert(nonexistentCaught, "Nonexistent category node returns 404");

    // ----------------------------------------------------
    // TEST 5: CategoryCustomField creation & duplicate constraint
    // ----------------------------------------------------
    console.log("\n5. Testing Custom Field CRUD & Compound Unique Index...");
    const fieldL1 = await CategoryCustomField.create({
      category_id: cat1._id,
      category_type: "ProductCategory",
      field_key: "material",
      field_name: "Material",
      field_type: "select",
      is_required: true,
      menu_order: 1,
    });
    assert(fieldL1._id != null, "Created custom field on Level 1");

    let duplicateFieldCaught = false;
    try {
      await CategoryCustomField.create({
        category_id: cat1._id,
        category_type: "ProductCategory",
        field_key: "material", // Duplicate key on same node
        field_name: "Material Copy",
        field_type: "text",
      });
    } catch (err) {
      duplicateFieldCaught = err.code === 11000;
    }
    assert(duplicateFieldCaught, "Unique compound index prevented duplicate field_key on same category");

    // ----------------------------------------------------
    // TEST 6: CategoryCustomFieldValue
    // ----------------------------------------------------
    console.log("\n6. Testing Custom Field Values...");
    const valL1 = await CategoryCustomFieldValue.create({
      cat_custom_field_id: fieldL1._id,
      field_value: {
        options: [
          { value: "cotton", label: "Cotton" },
          { value: "silk", label: "Silk" },
        ],
      },
    });
    assert(valL1.field_value.options.length === 2, "Field values saved with JSON options");

    // ----------------------------------------------------
    // TEST 7: Field Override in Child Category
    // ----------------------------------------------------
    console.log("\n7. Testing Child Field Override Inheritance...");
    // Define 'material' at Nested Category level (child) to override Level 1
    const fieldL3Override = await CategoryCustomField.create({
      category_id: nestedCat1._id,
      category_type: "ProductNestedSubCategory",
      field_key: "material",
      field_name: "Fabric Material (Specialized)",
      field_type: "select",
      is_required: false,
      menu_order: 1,
    });
    await CategoryCustomFieldValue.create({
      cat_custom_field_id: fieldL3Override._id,
      field_value: {
        options: [
          { value: "pure_georgette", label: "Pure Georgette" },
          { value: "chiffon", label: "Chiffon" },
        ],
      },
    });

    // Also add a unique field on L2
    const fieldL2 = await CategoryCustomField.create({
      category_id: subCat1._id,
      category_type: "ProductSubCategory",
      field_key: "fit_type",
      field_name: "Fit Type",
      field_type: "radio",
      is_required: true,
      menu_order: 2,
    });

    // ----------------------------------------------------
    // TEST 8: Additive Guidelines across levels
    // ----------------------------------------------------
    console.log("\n8. Testing Additive Guidelines Inheritance...");
    await CategoryGuideline.create({
      category_id: cat1._id,
      category_type: "ProductCategory",
      guideline_type: "general",
      title: "Root General Guideline",
      content: { items: [{ text: "Root Rule 1", order: 1 }] },
    });
    await CategoryGuideline.create({
      category_id: nestedCat1._id,
      category_type: "ProductNestedSubCategory",
      guideline_type: "general",
      title: "Nested General Guideline",
      content: { items: [{ text: "Nested Rule 1", order: 1 }] },
    });
    await CategoryGuideline.create({
      category_id: subCat1._id,
      category_type: "ProductSubCategory",
      guideline_type: "image",
      title: "SubCat Image Guideline",
      content: { items: [{ text: "Front image on white background", order: 1 }] },
    });

    // ----------------------------------------------------
    // TEST 9: Catalog Configuration Deep Merge
    // ----------------------------------------------------
    console.log("\n9. Testing Catalog Configuration Deep Merge...");
    await CategoryCatalogConfig.create({
      category_id: cat1._id,
      category_type: "ProductCategory",
      measurement: {
        enabled: true,
        image: "https://cdn.example.com/root-guide.png",
        title: "Standard Size Guide",
      },
      product_image: {
        min_images: 2,
        max_images: 10,
        primary_image_required: true,
        front_image_required: true,
      },
    });

    // Child overrides max_images and measurement title
    await CategoryCatalogConfig.create({
      category_id: nestedCat1._id,
      category_type: "ProductNestedSubCategory",
      measurement: {
        title: "Gowns Specific Size Guide",
      },
      product_image: {
        max_images: 5,
      },
    });

    // ----------------------------------------------------
    // TEST 10: Aggregated Configuration Service Output Verification
    // ----------------------------------------------------
    console.log("\n10. Testing CategoryConfigService.getAggregatedConfig...");
    const fullConfig = await CategoryConfigService.getAggregatedConfig(
      "ProductNestedSubCategory",
      nestedCat1._id
    );

    assert(fullConfig.category.id === nestedCat1._id.toString(), "Target category matches leaf");
    assert(fullConfig.breadcrumb.length === 3, "Breadcrumb has 3 levels");
    assert(Array.isArray(fullConfig.custom_fields), "custom_fields array is returned in response");

    // Verify fields override
    const materialField = fullConfig.custom_fields.find((f) => f.field_key === "material");
    assert(materialField != null, "material field is present");
    assert(
      materialField.field_name === "Fabric Material (Specialized)",
      "Child field definition successfully overrode parent definition"
    );
    assert(
      materialField.inherited_from.type === "ProductNestedSubCategory",
      "Field inherited_from metadata points to child level"
    );
    assert(
      materialField.options[0].value === "pure_georgette",
      "Field options reflect overridden child options"
    );

    const fitField = fullConfig.custom_fields.find((f) => f.field_key === "fit_type");
    assert(fitField != null, "Parent fit_type field was inherited");
    assert(fitField.inherited_from.level === 2, "fit_type inherited_from Level 2");

    // Verify additive guidelines
    assert(
      fullConfig.guidelines.general.length === 2,
      "Both root and child general guidelines preserved (additive)"
    );
    assert(
      fullConfig.guidelines.image.length === 1,
      "Image guideline from subcategory preserved"
    );

    // Verify deep merged catalog configuration
    assert(
      fullConfig.catalogConfig.product_image.min_images === 2,
      "Parent min_images (2) preserved via deep merge"
    );
    assert(
      fullConfig.catalogConfig.product_image.max_images === 5,
      "Child max_images (5) overrode parent (10) via deep merge"
    );
    assert(
      fullConfig.catalogConfig.product_image.primary_image_required === true,
      "Parent primary_image_required (true) preserved via deep merge"
    );
    assert(
      fullConfig.catalogConfig.measurement.title === "Gowns Specific Size Guide",
      "Child measurement title overrode parent"
    );
    assert(
      fullConfig.catalogConfig.measurement.image === "https://cdn.example.com/root-guide.png",
      "Parent measurement image preserved via deep merge"
    );

    // ----------------------------------------------------
    // TEST 11: Text, Checkbox, and Repeater Field Types
    // ----------------------------------------------------
    console.log("\n11. Testing text, checkbox, and repeater creation...");
    const textField = await CategoryCustomField.create({
      category_id: nestedCat1._id,
      category_type: "ProductNestedSubCategory",
      field_key: "model_code",
      field_name: "Model Code",
      field_type: "text",
      is_required: true,
    });
    assert(textField.field_type === "text", "Text field created successfully");

    const checkboxField = await CategoryCustomField.create({
      category_id: nestedCat1._id,
      category_type: "ProductNestedSubCategory",
      field_key: "is_organic",
      field_name: "Organic Cotton Certified",
      field_type: "checkbox",
      is_required: false,
    });
    assert(checkboxField.field_type === "checkbox", "Checkbox field created successfully");

    const repeaterField = await CategoryCustomField.create({
      category_id: nestedCat1._id,
      category_type: "ProductNestedSubCategory",
      field_key: "key_features",
      field_name: "Key Features",
      field_type: "repeater",
      is_required: false,
    });
    assert(repeaterField.field_type === "repeater", "Repeater field created successfully");

    // Invalid field_type check
    let invalidFieldTypeCaught = false;
    try {
      await CategoryCustomField.create({
        category_id: nestedCat1._id,
        category_type: "ProductNestedSubCategory",
        field_key: "invalid_key",
        field_name: "Invalid Field",
        field_type: "unsupported_type",
      });
    } catch (err) {
      invalidFieldTypeCaught = true;
    }
    assert(invalidFieldTypeCaught, "Unsupported field_type is rejected by schema validator");

    // ----------------------------------------------------
    // TEST 12: Bulk custom_fields creation via controller
    // ----------------------------------------------------
    console.log("\n12. Testing bulk custom_fields creation...");
    const { createCategoryCustomField } = require("../controllers/categoryCustomFieldController");
    
    // Test bulk creation payload
    let bulkResponseStatus = null;
    let bulkResponseBody = null;
    const mockBulkReq = {
      body: {
        category_id: cat1._id.toString(),
        category_type: "ProductCategory",
        custom_fields: [
          {
            field_key: "bulk_text",
            field_name: "Bulk Text Field",
            field_type: "text",
            is_required: true,
            menu_order: 10,
          },
          {
            field_key: "bulk_checkbox",
            field_name: "Bulk Checkbox Field",
            field_type: "checkbox",
            is_required: false,
            menu_order: 20,
          },
          {
            field_key: "bulk_repeater",
            field_name: "Bulk Repeater Field",
            field_type: "repeater",
            is_required: false,
            menu_order: 30,
          },
        ],
      },
    };
    const mockBulkRes = {
      status(code) {
        bulkResponseStatus = code;
        return this;
      },
      json(body) {
        bulkResponseBody = body;
        return this;
      },
    };

    await createCategoryCustomField(mockBulkReq, mockBulkRes);
    assert(bulkResponseStatus === 201, "Bulk creation returned 201 status");
    assert(Array.isArray(bulkResponseBody.custom_fields), "Bulk response contains custom_fields array");
    assert(bulkResponseBody.custom_fields.length === 3, "All 3 fields created in bulk");
    assert(bulkResponseBody.custom_fields[0].field_type === "text", "Bulk item 1 is text");
    assert(bulkResponseBody.custom_fields[1].field_type === "checkbox", "Bulk item 2 is checkbox");
    assert(bulkResponseBody.custom_fields[2].field_type === "repeater", "Bulk item 3 is repeater");

    // Test single creation payload still works via controller
    let singleResponseStatus = null;
    let singleResponseBody = null;
    const mockSingleReq = {
      body: {
        category_id: cat1._id.toString(),
        category_type: "ProductCategory",
        field_key: "single_text",
        field_name: "Single Text Field",
        field_type: "text",
        is_required: false,
      },
    };
    const mockSingleRes = {
      status(code) {
        singleResponseStatus = code;
        return this;
      },
      json(body) {
        singleResponseBody = body;
        return this;
      },
    };
    await createCategoryCustomField(mockSingleReq, mockSingleRes);
    assert(singleResponseStatus === 201, "Single creation returned 201 status");
    assert(singleResponseBody.field_key === "single_text", "Single field created successfully");

    // ----------------------------------------------------
    // CLEANUP TEST DATA
    // ----------------------------------------------------
    console.log("\nCleaning up test artifacts...");
    await CategoryCustomField.deleteMany({
      category_id: { $in: [cat1._id, subCat1._id, nestedCat1._id] },
    });
    await CategoryCustomFieldValue.deleteMany({
      cat_custom_field_id: { $in: [fieldL1._id, fieldL2._id, fieldL3Override._id] },
    });
    await CategoryGuideline.deleteMany({
      category_id: { $in: [cat1._id, subCat1._id, nestedCat1._id] },
    });
    await CategoryCatalogConfig.deleteMany({
      category_id: { $in: [cat1._id, subCat1._id, nestedCat1._id] },
    });
    await ProductNestedSubCategory.findByIdAndDelete(nestedCat1._id);
    await ProductSubCategory.findByIdAndDelete(subCat1._id);
    await ProductCategory.findByIdAndDelete(cat1._id);
    await Category.deleteMany({
      _id: { $in: [gL1._id, gL2._id, gL3._id, gL4._id, gL5._id, cycleA._id, cycleB._id] },
    });

    console.log("\n=======================================================");
    console.log(`  INTEGRATION TESTS SUMMARY:`);
    console.log(`  Passed: ${passed}`);
    console.log(`  Failed: ${failed}`);
    console.log("=======================================================\n");

    if (failed > 0) {
      process.exit(1);
    }
  } catch (error) {
    console.error("Test execution threw an error:", error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

runTests();
