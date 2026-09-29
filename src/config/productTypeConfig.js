/**
 * Product Type Schema & Field Definitions Configuration
 * 
 * Provides field variables, tabs, types, validation rules, and defaults
 * for each of the 4 supported product types: simple, grouped, external, variable.
 */

const COMMON_TABS = [
  { id: "general", label: "General" },
  { id: "pricing", label: "Pricing" },
  { id: "inventory", label: "Inventory" },
  { id: "shipping", label: "Shipping" },
  { id: "linked_products", label: "Linked Products" },
  { id: "media", label: "Images & Media" },
  { id: "seo", label: "SEO & Visibility" },
];

const BASE_FIELDS = [
  // General
  {
    key: "name",
    label: "Product Name",
    type: "text",
    required: true,
    tab: "general",
    placeholder: "e.g. Wireless Noise-Cancelling Headphones",
    defaultValue: "",
  },
  {
    key: "slug",
    label: "Slug (URL Key)",
    type: "text",
    required: true,
    tab: "general",
    placeholder: "e.g. wireless-noise-cancelling-headphones",
    defaultValue: "",
    description: "Unique URL-friendly slug",
  },
  {
    key: "sellerId",
    label: "Seller ID",
    type: "text",
    required: true,
    tab: "general",
    placeholder: "MongoDB ObjectId of the Seller Profile",
    defaultValue: "",
  },
  {
    key: "cat_id",
    label: "Main Category",
    type: "select",
    required: true,
    tab: "general",
    placeholder: "Select Category",
    endpoint: "/api/product-categories",
    description: "Category ID (Tier 1)",
  },
  {
    key: "sub_cat_id",
    label: "Sub Category",
    type: "select",
    required: true,
    tab: "general",
    placeholder: "Select Sub Category",
    endpoint: "/api/product-sub-categories?cat_id={cat_id}",
    description: "Sub Category ID (Tier 2)",
  },
  {
    key: "nested_sub_cat_id",
    label: "Nested Sub Category",
    type: "select",
    required: true,
    tab: "general",
    placeholder: "Select Nested Sub Category",
    endpoint: "/api/product-nested-sub-categories?sub_cat_id={sub_cat_id}",
    description: "Nested Sub Category ID (Tier 3)",
  },
  {
    key: "brandId",
    label: "Brand",
    type: "select",
    required: false,
    tab: "general",
    placeholder: "Select Brand",
    endpoint: "/api/brands",
    defaultValue: null,
  },
  {
    key: "description",
    label: "Full Description",
    type: "textarea",
    required: false,
    tab: "general",
    placeholder: "Detailed product description (HTML or Markdown supported)",
    defaultValue: "",
  },
  {
    key: "shortDescription",
    label: "Short Description",
    type: "textarea",
    required: false,
    tab: "general",
    placeholder: "Brief product summary displayed next to images",
    defaultValue: "",
  },
  {
    key: "status",
    label: "Status",
    type: "select",
    required: false,
    tab: "general",
    defaultValue: "draft",
    options: [
      { label: "Draft", value: "draft" },
      { label: "Pending Review", value: "pending" },
      { label: "Active / Published", value: "active" },
      { label: "Archived / Private", value: "archived" },
    ],
  },
  {
    key: "isActive",
    label: "Active Status",
    type: "boolean",
    required: false,
    tab: "general",
    defaultValue: true,
  },
  {
    key: "isFeatured",
    label: "Featured Product",
    type: "boolean",
    required: false,
    tab: "general",
    defaultValue: false,
  },

  // Media
  {
    key: "thumbnail",
    label: "Main Image / Thumbnail URL or ID",
    type: "image",
    required: false,
    tab: "media",
    placeholder: "Image URL or ProductImage ObjectId",
    defaultValue: null,
  },
  {
    key: "images",
    label: "Gallery Images",
    type: "array",
    itemType: "image",
    required: false,
    tab: "media",
    description: "List of secondary product image URLs or object definitions [{ url, isPrimary, altText }]",
    defaultValue: [],
  },
  {
    key: "videos",
    label: "Product Videos",
    type: "array",
    itemType: "video",
    required: false,
    tab: "media",
    description: "List of video URLs",
    defaultValue: [],
  },

  // SEO & Visibility
  {
    key: "catalog_visibility",
    label: "Catalog Visibility",
    type: "select",
    required: false,
    tab: "seo",
    defaultValue: "visible",
    options: [
      { label: "Shop and search results", value: "visible" },
      { label: "Shop only", value: "catalog" },
      { label: "Search results only", value: "search" },
      { label: "Hidden", value: "hidden" },
    ],
  },
  {
    key: "metaTitle",
    label: "Meta Title (SEO)",
    type: "text",
    required: false,
    tab: "seo",
    placeholder: "SEO Title Tag",
    defaultValue: "",
  },
  {
    key: "metaDescription",
    label: "Meta Description (SEO)",
    type: "textarea",
    required: false,
    tab: "seo",
    placeholder: "Search engine summary snippet",
    defaultValue: "",
  },
  {
    key: "tags",
    label: "Product Tags",
    type: "array",
    itemType: "text",
    required: false,
    tab: "seo",
    placeholder: "Add tags (e.g. bluetooth, wireless)",
    defaultValue: [],
  },

  // Linked Products
  {
    key: "upsell_ids",
    label: "Upsells",
    type: "array",
    itemType: "select",
    endpoint: "/api/products",
    required: false,
    tab: "linked_products",
    description: "Products recommended instead of the currently viewed product",
    defaultValue: [],
  },
  {
    key: "cross_sell_ids",
    label: "Cross-sells",
    type: "array",
    itemType: "select",
    endpoint: "/api/products",
    required: false,
    tab: "linked_products",
    description: "Products promoted in the cart, based on the current product",
    defaultValue: [],
  },
];

// Product Type Specific Configurations
const PRODUCT_TYPE_SCHEMAS = {
  simple: {
    productType: "simple",
    title: "Simple Product",
    description: "A single, standalone physical or digital product with a unique SKU and price.",
    tabs: [
      { id: "general", label: "General" },
      { id: "pricing", label: "Pricing" },
      { id: "inventory", label: "Inventory" },
      { id: "shipping", label: "Shipping" },
      { id: "linked_products", label: "Linked Products" },
      { id: "media", label: "Images & Media" },
      { id: "seo", label: "SEO & Visibility" },
    ],
    fields: [
      ...BASE_FIELDS,

      // Flags
      {
        key: "virtual",
        label: "Virtual Product",
        type: "boolean",
        required: false,
        tab: "general",
        defaultValue: false,
        description: "Virtual products are intangible and aren't shipped",
      },
      {
        key: "downloadable",
        label: "Downloadable Product",
        type: "boolean",
        required: false,
        tab: "general",
        defaultValue: false,
        description: "Provides access to downloadable files upon purchase",
      },

      // Pricing
      {
        key: "anevixPrice",
        label: "Anevix Price",
        type: "number",
        required: true,
        tab: "pricing",
        placeholder: "0.00",
        min: 0,
        defaultValue: null,
      },
      {
        key: "mrpPrice",
        label: "MRP Price",
        type: "number",
        required: true,
        tab: "pricing",
        placeholder: "0.00",
        min: 0,
        defaultValue: null,
      },
      {
        key: "salePrice",
        label: "Sale Price",
        type: "number",
        required: false,
        tab: "pricing",
        placeholder: "0.00",
        min: 0,
        defaultValue: null,
      },
      {
        key: "prePaidDiscount",
        label: "Pre-paid Discount",
        type: "number",
        required: false,
        tab: "pricing",
        placeholder: "0",
        min: 0,
        defaultValue: 0,
      },
      {
        key: "hsnCode",
        label: "HSN Code",
        type: "text",
        required: false,
        tab: "pricing",
        placeholder: "e.g. 1001",
        defaultValue: null,
      },
      {
        key: "gstRate",
        label: "GST Rate (%)",
        type: "select",
        required: false,
        tab: "pricing",
        defaultValue: null,
        options: [
          { label: "0%", value: 0 },
          { label: "5%", value: 5 },
          { label: "12%", value: 12 },
          { label: "18%", value: 18 },
          { label: "28%", value: 28 },
        ]
      },

      // Inventory
      {
        key: "sku",
        label: "SKU (Stock Keeping Unit)",
        type: "text",
        required: true,
        tab: "inventory",
        placeholder: "e.g. PROD-SMPL-001",
        defaultValue: "",
        description: "Unique alphanumeric product identifier",
      },
      {
        key: "manage_stock",
        altKey: "manageStock",
        label: "Manage Stock?",
        type: "boolean",
        required: false,
        tab: "inventory",
        defaultValue: false,
        description: "Enable stock management at product level",
      },
      {
        key: "stockQuantity",
        label: "Stock Quantity",
        type: "number",
        required: false,
        tab: "inventory",
        placeholder: "0",
        defaultValue: 0,
        dependsOn: { field: "manage_stock", value: true },
      },
      {
        key: "backorders",
        label: "Allow Backorders?",
        type: "select",
        required: false,
        tab: "inventory",
        defaultValue: "no",
        options: [
          { label: "Do not allow", value: "no" },
          { label: "Allow, but notify customer", value: "notify" },
          { label: "Allow", value: "yes" },
        ],
        dependsOn: { field: "manage_stock", value: true },
      },


      // Shipping
      {
        key: "weight",
        label: "Weight",
        type: "number",
        required: false,
        tab: "shipping",
        placeholder: "0.0",
        min: 0,
        defaultValue: null,
      },
      {
        key: "weightUnit",
        label: "Weight Unit",
        type: "select",
        required: false,
        tab: "shipping",
        defaultValue: "kg",
        options: [
          { label: "Kilograms (kg)", value: "kg" },
          { label: "Grams (g)", value: "g" },
          { label: "Liters (l)", value: "l" },
        ]
      },
      {
        key: "dimensions",
        label: "Dimensions (cm)",
        type: "object",
        required: false,
        tab: "shipping",
        fields: [
          { key: "length", label: "Length", type: "number", placeholder: "Length" },
          { key: "width", label: "Width", type: "number", placeholder: "Width" },
          { key: "height", label: "Height", type: "number", placeholder: "Height" },
        ],
        defaultValue: { length: null, width: null, height: null },
      },

      // Attributes

    ],
  },

  grouped: {
    productType: "grouped",
    title: "Grouped Product",
    description: "A collection of related simple products that can be purchased together (e.g. a camera body + lens bundle). Grouped products do not have their own price or stock.",
    tabs: [
      { id: "general", label: "General" },
      { id: "inventory", label: "Inventory / SKU" },
      { id: "grouped_products", label: "Grouped Products" },
      { id: "attributes", label: "Attributes" },
      { id: "linked_products", label: "Linked Products" },
      { id: "media", label: "Images & Media" },
      { id: "seo", label: "SEO & Visibility" },
    ],
    fields: [
      ...BASE_FIELDS,

      // Inventory
      {
        key: "sku",
        label: "SKU (Stock Keeping Unit)",
        type: "text",
        required: true,
        tab: "inventory",
        placeholder: "e.g. GRP-BUNDLE-001",
        defaultValue: "",
      },

      // Grouped Products Linker
      {
        key: "grouped_products",
        label: "Grouped Products",
        type: "array",
        itemType: "select",
        endpoint: "/api/products?productType=simple",
        required: true,
        tab: "grouped_products",
        placeholder: "Search and add products to this group",
        description: "Select existing simple products that belong to this group package",
        defaultValue: [],
      },

      // Attributes
      {
        key: "attributes",
        label: "Product Attributes",
        type: "array",
        itemType: "object",
        required: false,
        tab: "attributes",
        fields: [
          { key: "name", label: "Attribute Name", type: "text", placeholder: "e.g. Bundle Inclusions" },
          { key: "options", label: "Values", type: "array", itemType: "text", placeholder: "Options" },
        ],
        defaultValue: [],
      },
    ],
  },

  external: {
    productType: "external",
    title: "External / Affiliate Product",
    description: "A product listed on your store that links to an external website for purchasing (affiliate model).",
    tabs: [
      { id: "general", label: "General" },
      { id: "external_affiliate", label: "External / Affiliate" },
      { id: "pricing", label: "Pricing" },
      { id: "inventory", label: "Inventory / SKU" },
      { id: "attributes", label: "Attributes" },
      { id: "linked_products", label: "Linked Products" },
      { id: "media", label: "Images & Media" },
      { id: "seo", label: "SEO & Visibility" },
    ],
    fields: [
      ...BASE_FIELDS,

      // External Link & Button
      {
        key: "external_url",
        altKey: "externalUrl",
        label: "Product URL",
        type: "url",
        required: true,
        tab: "external_affiliate",
        placeholder: "https://partner-store.com/products/item-123",
        description: "The external destination URL where customers can buy this product",
        defaultValue: "",
      },
      {
        key: "button_text",
        altKey: "buttonText",
        label: "Button Text",
        type: "text",
        required: false,
        tab: "external_affiliate",
        placeholder: "Buy product",
        defaultValue: "Buy product",
        description: "Text displayed on the call-to-action button linking externally",
      },

      // Pricing
      {
        key: "regular_price",
        altKey: "price",
        label: "Regular Price",
        type: "number",
        required: false,
        tab: "pricing",
        placeholder: "0.00",
        min: 0,
        defaultValue: null,
      },
      {
        key: "sale_price",
        altKey: "salePrice",
        label: "Sale Price",
        type: "number",
        required: false,
        tab: "pricing",
        placeholder: "0.00",
        min: 0,
        defaultValue: null,
      },

      // Inventory
      {
        key: "sku",
        label: "SKU (Stock Keeping Unit)",
        type: "text",
        required: true,
        tab: "inventory",
        placeholder: "e.g. EXT-PARTNER-001",
        defaultValue: "",
      },

      // Attributes
      {
        key: "attributes",
        label: "Product Attributes",
        type: "array",
        itemType: "object",
        required: false,
        tab: "attributes",
        fields: [
          { key: "name", label: "Attribute Name", type: "text", placeholder: "e.g. Brand Origin" },
          { key: "options", label: "Values", type: "array", itemType: "text", placeholder: "Options" },
        ],
        defaultValue: [],
      },
    ],
  },

  variable: {
    productType: "variable",
    title: "Variable Product",
    description: "A product with multiple variations (e.g. size, color). Each variation can have its own price, SKU, stock quantity, and images.",
    tabs: [
      { id: "general", label: "General" },
      { id: "inventory", label: "Inventory / SKU" },
      { id: "attributes", label: "Attributes (For Variations)" },
      { id: "variations", label: "Variations" },
      { id: "linked_products", label: "Linked Products" },
      { id: "media", label: "Parent Images & Media" },
      { id: "seo", label: "SEO & Visibility" },
    ],
    fields: [
      ...BASE_FIELDS,

      // Inventory
      {
        key: "sku",
        label: "SKU",
        type: "text",
        required: true,
        tab: "inventory",
        placeholder: "e.g. VAR-SHIRT-MAIN",
        defaultValue: "",
        description: "SKU identifying the parent variable product",
      },
      {
        key: "manage_stock",
        altKey: "manageStock",
        label: "Track stock quantity for this product",
        type: "boolean",
        required: false,
        tab: "inventory",
        defaultValue: false,
        description: "Settings below apply to all variations without manual stock management enabled."
      },
      {
        key: "stock_quantity",
        label: "Quantity",
        type: "number",
        required: false,
        tab: "inventory",
        defaultValue: 0,
        condition: { field: "manage_stock", value: true }
      },
      {
        key: "backorders",
        label: "Allow backorders?",
        type: "select",
        required: false,
        tab: "inventory",
        defaultValue: "no",
        options: [
          { label: "Do not allow", value: "no" },
          { label: "Allow, but notify customer", value: "notify" },
          { label: "Allow", value: "yes" }
        ],
        condition: { field: "manage_stock", value: true }
      },
      {
        key: "low_stock_threshold",
        label: "Low stock threshold",
        type: "number",
        required: false,
        tab: "inventory",
        defaultValue: 2,
        condition: { field: "manage_stock", value: true }
      },


      // Attributes Required for Variations
      {
        key: "attributes",
        label: "Attributes Used for Variations",
        type: "array",
        itemType: "object",
        required: true,
        tab: "attributes",
        fields: [
          { key: "name", label: "Attribute Name", type: "text", placeholder: "e.g. Color or Size" },
          { key: "options", label: "Attribute Options", type: "array", itemType: "text", placeholder: "e.g. Small, Medium, Large" },
        ],
        description: "Define attributes that will generate variations (e.g. Color: [Red, Blue], Size: [S, M, L])",
        defaultValue: [],
      },

      // Variations Matrix Definition
      {
        key: "variants",
        label: "Product Variations",
        type: "array",
        itemType: "object",
        required: true,
        tab: "variations",
        description: "List of variant objects with individual pricing, SKU, attributes, stock, and images",
        variantFields: [
          {
            key: "isActive",
            label: "Enabled",
            type: "boolean",
            required: false,
            defaultValue: true,
          },
          {
            key: "downloadable",
            label: "Downloadable",
            type: "boolean",
            required: false,
            defaultValue: false,
          },
          {
            key: "virtual",
            label: "Virtual",
            type: "boolean",
            required: false,
            defaultValue: false,
          },
          {
            key: "manage_stock",
            label: "Manage stock?",
            type: "boolean",
            required: false,
            defaultValue: false,
          },
          {
            key: "regular_price",
            altKey: "price",
            label: "Regular price (₹)",
            type: "number",
            required: true,
            placeholder: "Variation price (required)",
            min: 0,
          },
          {
            key: "sale_price",
            altKey: "salePrice",
            label: "Sale price (₹)",
            type: "number",
            required: false,
            min: 0,
          },
          {
            key: "stock_status",
            label: "Stock status",
            type: "select",
            required: false,
            defaultValue: "instock",
            options: [
              { label: "In stock", value: "instock" },
              { label: "Out of stock", value: "outofstock" },
              { label: "On backorder", value: "onbackorder" }
            ],
            condition: { field: "manage_stock", value: false }
          },
          {
            key: "stock_quantity",
            label: "Stock quantity",
            type: "number",
            required: false,
            defaultValue: 0,
            condition: { field: "manage_stock", value: true }
          },
          {
            key: "backorders",
            label: "Allow backorders?",
            type: "select",
            required: false,
            defaultValue: "no",
            options: [
              { label: "Do not allow", value: "no" },
              { label: "Allow, but notify customer", value: "notify" },
              { label: "Allow", value: "yes" }
            ],
            condition: { field: "manage_stock", value: true }
          },
          {
            key: "weight",
            label: "Weight (kg)",
            type: "number",
            required: false,
            min: 0,
          },
          {
            key: "dimensions",
            label: "Dimensions (L×W×H) (cm)",
            type: "object",
            required: false,
            fields: [
              { key: "length", label: "Length", type: "number", placeholder: "Length" },
              { key: "width", label: "Width", type: "number", placeholder: "Width" },
              { key: "height", label: "Height", type: "number", placeholder: "Height" },
            ],
            defaultValue: { length: null, width: null, height: null },
          },
          {
            key: "shipping_class",
            label: "Shipping class",
            type: "select",
            required: false,
            defaultValue: "Same as parent",
            options: [
              { label: "Same as parent", value: "Same as parent" }
            ]
          },
          {
            key: "description",
            label: "Description",
            type: "textarea",
            required: false,
            defaultValue: "",
          },
          {
            key: "sku",
            label: "Variation SKU",
            type: "text",
            required: true,
            placeholder: "e.g. VAR-SHIRT-RED-S",
          },
          {
            key: "attributes",
            label: "Variant Attributes",
            type: "array",
            itemType: "object",
            required: true,
            fields: [
              { key: "name", label: "Name", type: "text" },
              { key: "option", label: "Option / Value", type: "text" },
            ],
            description: "Attribute combination matching parent attributes (e.g. Color: Red, Size: S)",
          },
          {
            key: "images",
            label: "Variation Images",
            type: "array",
            itemType: "image",
            required: false,
            description: "List of variant images [{ url, isPrimary }]",
            defaultValue: [],
          },
        ],
        defaultValue: [],
      },
    ],
  },
};

const getSupportedProductTypes = () => {
  return [
    {
      type: "simple",
      name: "Simple product",
      description: "Covers the vast majority of any products you may sell. Simple products are shipped and have no options.",
      endpoint: "/api/products/schema/simple",
    },
    {
      type: "grouped",
      name: "Grouped product",
      description: "A collection of related products that can be purchased individually and only consist of simple products.",
      endpoint: "/api/products/schema/grouped",
    },
    {
      type: "external",
      name: "External/Affiliate product",
      description: "One that you list and describe on your web site, but is sold elsewhere.",
      endpoint: "/api/products/schema/external",
    },
    {
      type: "variable",
      name: "Variable product",
      description: "A product with variations, each of which may have a different SKU, price, stock level, etc.",
      endpoint: "/api/products/schema/variable",
    },
  ];
};

const getProductSchema = (productType) => {
  if (!productType) return null;
  const normalized = productType.toLowerCase().trim();
  return PRODUCT_TYPE_SCHEMAS[normalized] || null;
};

module.exports = {
  COMMON_TABS,
  PRODUCT_TYPE_SCHEMAS,
  getSupportedProductTypes,
  getProductSchema,
};
