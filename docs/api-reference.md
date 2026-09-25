# Anevix API Reference

Below is a complete list of all the API endpoints currently available in the application, along with their expected payloads and authentication requirements.

---

## 🛡️ Admin Endpoints
Base URL: `/admin`

### 1. Admin Login
- **Method:** `POST`
- **Endpoint:** `/login`
- **Auth:** None
- **Payload:**
  ```json
  {
    "email": "admin@yopmail.com",
    "password": "admin123"
  }
  ```

### 2. Forgot Password
- **Method:** `POST`
- **Endpoint:** `/forgot-password`
- **Auth:** None
- **Payload:**
  ```json
  {
    "email": "admin@yopmail.com"
  }
  ```

### 3. Reset Password
- **Method:** `POST`
- **Endpoint:** `/reset-password/:token`
- **Auth:** None
- **Payload:**
  ```json
  {
    "password": "newpassword123"
  }
  ```

### 4. Get Admin Profile
- **Method:** `GET`
- **Endpoint:** `/profile`
- **Auth:** `Bearer <ADMIN_TOKEN>`
- **Payload:** None

---

## 📢 Campaign & Email Automation Management (Admin Only)
Base URL: `/admin/campaigns` or `/api/campaigns`
*All endpoints below require Admin Authentication (`Bearer <ADMIN_TOKEN>`)*

### 1. Get Campaign Metadata & Merge Tags
- **Method:** `GET`
- **Endpoint:** `/meta`
- **Auth:** `Bearer <ADMIN_TOKEN>`
- **Description:** Returns the catalog of available merge tags (User, Order, Seller, Support, System) with sample values, list of system trigger events, supported send types (`send_now`, `scheduled`, `triggered`), and target audience options.

### 2. Create Campaign
- **Method:** `POST`
- **Endpoint:** `/`
- **Auth:** `Bearer <ADMIN_TOKEN>`
- **Payload Examples:**

  **A. When Triggered Campaign (Event-driven):**
  ```json
  {
    "name": "Order Confirmation Email",
    "subject": "Thank you for your order #{{order_id}}!",
    "body": "<h1>Hi {{first_name}},</h1><p>Your order <strong>{{order_id}}</strong> for {{currency}} {{order_total}} has been placed successfully.</p><p>Delivery to: {{shipping_address}}</p>",
    "sendType": "triggered",
    "triggerEvent": "ORDER_PURCHASED",
    "isActive": true
  }
  ```

  **B. Scheduled Campaign:**
  ```json
  {
    "name": "Diwali Festival Flash Sale",
    "subject": "Mega Sale Starts Tonight, {{first_name}}!",
    "body": "<p>Exclusive discounts on all categories for our valued sellers and buyers!</p>",
    "sendType": "scheduled",
    "scheduledAt": "2026-10-24T18:00:00.000Z",
    "targetAudience": "customers"
  }
  ```

  **C. Send Now (Immediate Broadcast):**
  ```json
  {
    "name": "Platform Maintenance Notice",
    "subject": "Scheduled Platform Maintenance Tonight",
    "body": "<p>Dear {{username}}, our platform will undergo maintenance tonight from 2 AM to 4 AM.</p>",
    "sendType": "send_now",
    "targetAudience": "all_users"
  }
  ```

### 3. List All Campaigns
- **Method:** `GET`
- **Endpoint:** `/?page=1&limit=20&sendType=triggered&status=active`
- **Auth:** `Bearer <ADMIN_TOKEN>`

### 4. Get Campaign Details
- **Method:** `GET`
- **Endpoint:** `/:id`
- **Auth:** `Bearer <ADMIN_TOKEN>`

### 5. Update Campaign
- **Method:** `PUT`
- **Endpoint:** `/:id`
- **Auth:** `Bearer <ADMIN_TOKEN>`

### 6. Toggle Campaign Status (Active / Paused)
- **Method:** `PATCH`
- **Endpoint:** `/:id/toggle`
- **Auth:** `Bearer <ADMIN_TOKEN>`

### 7. Delete Campaign
- **Method:** `DELETE`
- **Endpoint:** `/:id`
- **Auth:** `Bearer <ADMIN_TOKEN>`

### 8. Live Preview Campaign with Sample Merge Tags
- **Method:** `POST`
- **Endpoint:** `/preview`
- **Auth:** `Bearer <ADMIN_TOKEN>`
- **Payload:**
  ```json
  {
    "subject": "Order #{{order_id}} Confirmed for {{first_name}}!",
    "body": "<p>Hi {{first_name}}, your order #{{order_id}} is {{order_status}}.</p>"
  }
  ```

### 9. Send Test Email
- **Method:** `POST`
- **Endpoint:** `/test-send`
- **Auth:** `Bearer <ADMIN_TOKEN>`
- **Payload:**
  ```json
  {
    "email": "admin@yopmail.com",
    "subject": "Test Order Confirmation",
    "body": "<p>Hi {{first_name}}, this is a live test email preview.</p>"
  }
  ```

### 10. Get Campaign Audit & Delivery Logs
- **Method:** `GET`
- **Endpoint:** `/:id/logs?page=1&limit=50&status=sent`
- **Auth:** `Bearer <ADMIN_TOKEN>`

---

## 👥 User Management (Admin Only)
Base URL: `/users`
*All endpoints below require Admin Authentication (`Bearer <ADMIN_TOKEN>`)*

### 1. Add User
- **Method:** `POST`
- **Endpoint:** `/add`
- **Payload:**
  ```json
  {
    "firstName": "John",
    "lastName": "Doe",
    "email": "user@example.com",
    "password": "password123"
  }
  ```

### 2. Edit User
- **Method:** `PUT`
- **Endpoint:** `/edit/:id`
- **Payload (all fields optional):**
  ```json
  {
    "firstName": "UpdatedFirstName",
    "lastName": "UpdatedLastName",
    "email": "updated@example.com",
    "phoneNumber": "9876543210",
    "status": "inactive",
    "password": "newpassword123"
  }
  ```

### 3. Delete User
- **Method:** `DELETE`
- **Endpoint:** `/delete/:id`
- **Payload:** None

---

## 🛍️ Customer Endpoints
Base URL: `/users`

### 1. Customer Signup
- **Method:** `POST`
- **Endpoint:** `/signup`
- **Auth:** None
- **Payload:**
  ```json
  {
    "firstName": "Jane",
    "lastName": "Doe",
    "email": "jane@example.com",
    "phoneNumber": "9876543210",
    "password": "password123"
  }
  ```

### 2. Verify Email OTP
- **Method:** `POST`
- **Endpoint:** `/verify-email`
- **Auth:** None
- **Payload:**
  ```json
  {
    "userId": "64abcdef1234567890",
    "otp": "123456"
  }
  ```

### 3. Verify Mobile OTP
- **Method:** `POST`
- **Endpoint:** `/verify-mobile`
- **Auth:** None
- **Payload:**
  ```json
  {
    "userId": "64abcdef1234567890",
    "otp": "123456"
  }
  ```

### 4. Resend Email OTP
- **Method:** `POST`
- **Endpoint:** `/resend-email-otp`
- **Auth:** None
- **Payload:**
  ```json
  {
    "userId": "64abcdef1234567890"
  }
  ```

### 5. Customer Login
- **Method:** `POST`
- **Endpoint:** `/login`
- **Auth:** None
- **Payload:**
  ```json
  {
    "email": "jane@example.com",
    "password": "password123"
  }
  ```

### 6. Customer Forgot Password
- **Method:** `POST`
- **Endpoint:** `/forgot-password`
- **Auth:** None
- **Payload:**
  ```json
  {
    "email": "jane@example.com"
  }
  ```

### 7. Customer Reset Password
- **Method:** `POST`
- **Endpoint:** `/reset-password/:token`
- **Auth:** None
- **Payload:**
  ```json
  {
    "password": "newpassword123"
  }
  ```

### 8. Get Customer Profile
- **Method:** `GET`
- **Endpoint:** `/profile`
- **Auth:** `Bearer <CUSTOMER_TOKEN>`
- **Payload:** None

### 9. Logout
- **Method:** `POST`
- **Endpoint:** `/logout`
- **Auth:** `Bearer <CUSTOMER_TOKEN>`
- **Payload:** None

---

---

## 📁 Product Categories Hierarchy API (Infinite Nesting)
The Product Categories API supports infinite nesting depths (Level 1, 2, 3, 4, 5, ... N) using a self-referencing `parent` hierarchy, with standard WooCommerce attributes (`description`, `display`, `menu_order`, `image`, `count`).

### 1. Unified Categories & Infinite Nesting
Base URL: `/api/product-categories`

- **Create Category (`POST /`)**:
  - **Auth:** `Bearer <ADMIN_TOKEN>`
  - **Payload (Root / Level 1 Category):**
    ```json
    {
      "cat_name": "Clothing",
      "slug": "clothing",
      "parent": null,
      "description": "<p>All clothing and apparel</p>",
      "display": "both",
      "image": "https://example.com/clothing.jpg",
      "menu_order": 1
    }
    ```
  - **Payload (Any Sub-Category - Level 2, Level 3, Level 4+):**
    ```json
    {
      "cat_name": "Graphic Tees",
      "slug": "graphic-tees",
      "parent": "664fa7210e7b99214b621e25",
      "description": "<p>Graphic printed tees</p>",
      "display": "default",
      "menu_order": 1
    }
    ```
- **Get Full Categories Tree (`GET /tree`)**: Public. Returns the entire hierarchical nested JSON tree (`children: [...]`) from Root to Leaf.
- **Get All Categories (`GET /` or `GET /?parent=<id|null>`)**: Public. Returns categories, optionally filtered by parent ID (pass `parent=null` or `parent=0` for root categories).
- **Get Category by ID (`GET /:id`)**: Public.
- **Update Category (`PUT /:id`)**: Admin only. (Includes cycle detection preventing circular hierarchies).
- **Deactivate Category (`DELETE /:id`)**: Admin only. Requires child categories to be deactivated first.

### 2. Product Sub-Categories (Tier 2)
Base URL: `/api/product-sub-categories`

- **Create Sub-Category (`POST /`)**:
  - **Auth:** `Bearer <ADMIN_TOKEN>`
  - **Payload:**
    ```json
    {
      "cat_id": "664fa7210e7b99214b621e20",
      "sub_cat_name": "Men's Wear",
      "slug": "mens-wear",
      "description": "<p>Clothing and fashion wear for men</p>",
      "display": "products",
      "image": "https://example.com/mens-wear.jpg",
      "menu_order": 1
    }
    ```
- **Get Sub-Categories (`GET /` or `GET /?cat_id=...`)**: Public.
- **Update Sub-Category (`PUT /:id`)**: Admin only.
- **Deactivate Sub-Category (`DELETE /:id`)**: Admin only.

### 3. Product Nested Sub-Categories (Tier 3)
Base URL: `/api/product-nested-sub-categories`

- **Create Nested Sub-Category (`POST /`)**:
  - **Auth:** `Bearer <ADMIN_TOKEN>`
  - **Payload:**
    ```json
    {
      "sub_cat_id": "664fa7210e7b99214b621e25",
      "name": "T-Shirts",
      "slug": "mens-t-shirts",
      "description": "<p>Casual and graphic t-shirts</p>",
      "display": "default",
      "image": "https://example.com/t-shirts.jpg",
      "menu_order": 1
    }
    ```
- **Get Nested Sub-Categories (`GET /` or `GET /?cat_id=...&sub_cat_id=...`)**: Public.
- **Update Nested Sub-Category (`PUT /:id`)**: Admin only.
- **Deactivate Nested Sub-Category (`DELETE /:id`)**: Admin only.

---

## 📦 Products API
Base URL: `/api/products`

### 1. Get Product Type Schema & Form Variables
- **Method:** `GET`
- **Endpoint:** `/schema/:productType` (e.g. `/schema/simple`, `/schema/grouped`, `/schema/external`, `/schema/variable`) or `/schema` (returns index of all types)
- **Auth:** None (Public / Passive Admin)
- **Description:** Returns the UI form tabs, input fields, validation rules, default values, dropdown options, and dependencies for the selected product type so the frontend can render the dynamic product creation form.
- **Supported Types:** `simple`, `grouped`, `external`, `variable`
- **Response Structure:**
  ```json
  {
    "success": true,
    "data": {
      "productType": "simple",
      "title": "Simple Product",
      "description": "A single, standalone physical or digital product with a unique SKU and price.",
      "tabs": [
        { "id": "general", "label": "General" },
        { "id": "pricing", "label": "Pricing" },
        { "id": "inventory", "label": "Inventory" },
        { "id": "shipping", "label": "Shipping" },
        { "id": "attributes", "label": "Attributes" },
        { "id": "linked_products", "label": "Linked Products" },
        { "id": "media", "label": "Images & Media" },
        { "id": "seo", "label": "SEO & Visibility" }
      ],
      "fields": [
        {
          "key": "name",
          "label": "Product Name",
          "type": "text",
          "required": true,
          "tab": "general",
          "placeholder": "e.g. Wireless Headphones",
          "defaultValue": ""
        },
        {
          "key": "regular_price",
          "altKey": "price",
          "label": "Regular Price",
          "type": "number",
          "required": true,
          "tab": "pricing",
          "min": 0,
          "defaultValue": null
        }
      ]
    }
  }
  ```

### 2. Create Product
- **Method:** `POST`
- **Endpoint:** `/`
- **Auth:** `Bearer <SELLER_OR_ADMIN_TOKEN>`
- **Payload Example:**
  ```json
  {
    "name": "Wireless Headphones",
    "slug": "wireless-headphones",
    "sku": "HEADPHONE-WL-01",
    "price": 299.99,
    "productType": "variable",
    "status": "active",
    "catalog_visibility": "visible",
    "tax_status": "taxable",
    "sellerId": "...",
    "categoryId": "...",
    "attributes": [
      {
        "name": "Color",
        "options": ["Black", "White"]
      }
    ]
  }
  ```
  *Note: Includes 20+ reference schema fields (dates, dimensions, digital downloads, etc).*

### 2. Create Composite Product (All-in-One)
- **Method:** `POST`
- **Endpoint:** `/composite`
- **Auth:** `Bearer <SELLER_OR_ADMIN_TOKEN>`
- **Description:** Intended for creating a complete product, product images, variants, variant images, and inventory in ONE atomic request.
- **Payload Example:**
  ```json
  {
    "productData": {
      "name": "Wireless Headphones",
      "slug": "wireless-headphones",
      "sku": "HEADPHONE-WL-01",
      "productType": "variable",
      "price": 299.99,
      "sellerId": "6aa90f8ce2fd080f95e4666d",
      "categoryId": "6aa8e0e85df1ad146ba015fe",
      "attributes": [
        { "name": "Color", "options": ["Black", "White"] }
      ]
    },
    "images": [
      { "url": "https://example.com/base-headphone.jpg", "isPrimary": true }
    ],
    "variants": [
      {
        "sku": "HEADPHONE-WL-BLACK",
        "regular_price": 349.99,
        "sale_price": 329.99,
        "manage_stock": true,
        "stock_quantity": 25,
        "attributes": [
          { "name": "Color", "option": "Black" }
        ],
        "images": [
          { "url": "https://example.com/black.jpg", "isPrimary": true }
        ]
      }
    ]
  }
  ```

### 3. Get All Products
- **Method:** `GET`
- **Endpoint:** `/`
- **Auth:** None (Public)

### 3. Get Product by ID
- **Method:** `GET`
- **Endpoint:** `/:id`
- **Auth:** None (Public)

### 4. Update Product
- **Method:** `PUT`
- **Endpoint:** `/:id`
- **Auth:** `Bearer <SELLER_OR_ADMIN_TOKEN>`

### 5. Delete Product
- **Method:** `DELETE`
- **Endpoint:** `/:id`
- **Auth:** `Bearer <SELLER_OR_ADMIN_TOKEN>`

---

## 🔀 Product Variants API
Base URL: `/api/products/:productId/variants` and `/api/variants/:variantId`

### 1. Create Product Variant
- **Method:** `POST`
- **Endpoint:** `/api/products/:productId/variants`
- **Auth:** `Bearer <SELLER_OR_ADMIN_TOKEN>`
- **Payload Example:**
  ```json
  {
    "sku": "HEADPHONE-WL-BLACK",
    "regular_price": 349.99,
    "sale_price": 329.99,
    "status": "publish",
    "manage_stock": true,
    "stock_quantity": 25,
    "backorders": "no",
    "attributes": [
      {
        "name": "Color",
        "option": "Black"
      }
    ]
  }
  ```

### 2. Get Variants for Product
- **Method:** `GET`
- **Endpoint:** `/api/products/:productId/variants`
- **Auth:** None (Public - only returns published variants if public)

### 3. Update Product Variant
- **Method:** `PUT`
- **Endpoint:** `/api/variants/:variantId`
- **Auth:** `Bearer <SELLER_OR_ADMIN_TOKEN>`
- **Payload Example:** Same fields as Create Variant.

### 4. Delete/Archive Variant
- **Method:** `DELETE`
- **Endpoint:** `/api/variants/:variantId`
- **Auth:** `Bearer <SELLER_OR_ADMIN_TOKEN>`
