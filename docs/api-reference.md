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
