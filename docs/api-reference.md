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

## 📁 Categories API
Base URL: `/api/categories`

### 1. Create Category
- **Method:** `POST`
- **Endpoint:** `/`
- **Auth:** `Bearer <ADMIN_TOKEN>`
- **Payload:**
  ```json
  {
    "name": "Electronics",
    "slug": "electronics",
    "description": "Electronic gadgets",
    "parent": null,
    "display": "products",
    "menu_order": 0,
    "image": "https://example.com/image.jpg"
  }
  ```

### 2. Get All Categories
- **Method:** `GET`
- **Endpoint:** `/`
- **Auth:** None (Public)
- **Response Format:** Reference schema including dynamically calculated `count` (active products inside category).

### 3. Get Category by ID
- **Method:** `GET`
- **Endpoint:** `/:id`
- **Auth:** None (Public)

### 4. Update Category
- **Method:** `PUT`
- **Endpoint:** `/:id`
- **Auth:** `Bearer <ADMIN_TOKEN>`
- **Payload:** Same fields as Create Category.

### 5. Delete/Archive Category
- **Method:** `DELETE`
- **Endpoint:** `/:id`
- **Auth:** `Bearer <ADMIN_TOKEN>`

---

## 📦 Products API
Base URL: `/api/products`

### 1. Create Product
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
