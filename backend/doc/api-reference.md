# Anevix API Reference

This document provides a reference for the Anevix Backend APIs.

## Base URL

**Local Environment:** `http://localhost:5000/api`

## Authentication

Some endpoints require authentication via a Bearer token.
Pass the token in the `Authorization` header:

```http
Authorization: Bearer <your_jwt_token>
```

---

## Admin Endpoints

### 1. Register Admin
**URL:** `/admin/register`
**Method:** `POST`
**Description:** Registers a new admin user.
**Request Body:**
```json
{
  "email": "admin@example.com",
  "password": "password123"
}
```

### 2. Login Admin
**URL:** `/admin/login`
**Method:** `POST`
**Description:** Authenticates an admin and returns a token.
**Request Body:**
```json
{
  "email": "admin@example.com",
  "password": "password123"
}
```

### 3. Forgot Password
**URL:** `/admin/forgot-password`
**Method:** `POST`
**Description:** Initiates the password reset process for an admin.
**Request Body:**
```json
{
  "email": "admin@example.com"
}
```

### 4. Admin Profile
**URL:** `/admin/profile`
**Method:** `GET`
**Description:** Retrieves the authenticated admin's profile.
**Headers:**
- `Authorization: Bearer <token>`

---

## User Endpoints

### 1. Add User
**URL:** `/users/add`
**Method:** `POST`
**Description:** Adds a new user to the system.
**Request Body:**
```json
{
  "name": "Test User",
  "email": "user@example.com"
}
```
