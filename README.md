# ContactsManager Node.js SDK

[![npm version](https://img.shields.io/npm/v/@contactsmanager/server.svg)](https://www.npmjs.com/package/@contactsmanager/server)
[![Build Status](https://github.com/arpwal/contactsmanager-nodejs/actions/workflows/publish.yml/badge.svg)](https://github.com/arpwal/contactsmanager-nodejs/actions/workflows/publish.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-4.9.0-blue)](https://www.typescriptlang.org/)
[![Test Coverage](https://img.shields.io/badge/coverage-100%25-brightgreen)](https://github.com/arpwal/contactsmanager-nodejs)

A Node.js SDK for the ContactsManager API that handles user management, authentication, and token generation for [contactsmanager.io](https://www.contactsmanager.io) integration.

## Overview

The ContactsManager SDK enables developers to easily integrate social features into their applications. It provides secure user management and token generation, helping you build features like activity feeds, follow/unfollow functionality, and contact management while ensuring user data privacy and security.

## Installation

```bash
npm install @contactsmanager/server
```

## Quick Start

```javascript
const { ContactsManagerClient } = require("@contactsmanager/server");

// Initialize the client
const client = new ContactsManagerClient({
  apiKey: "your_api_key",
  apiSecret: "your_api_secret",
  orgId: "your_org_id",
});

// Create a user on the server and get a token
async function createUserExample() {
  try {
    const userInfo = {
      userId: "user123",
      fullName: "John Doe",
      email: "john@example.com",
      phone: "+1234567890", // Optional
    };

    const deviceInfo = {
      deviceType: "mobile",
      os: "iOS",
      appVersion: "1.0.0",
    };

    // Create user and get token in one call
    const response = await client.createUser(userInfo, deviceInfo);

    console.log(`User created: ${response.data.created}`);
    console.log(`Token: ${response.data.token.token}`);
    console.log(`Expires at: ${response.data.token.expires_at}`);
    console.log(`User ID: ${response.data.user.organization_user_id}`);
  } catch (error) {
    console.error("Error creating user:", error);
  }
}

createUserExample();
```

## Core Features

### 1. User Management

Create or update users on the ContactsManager server:

```javascript
// Create user with email only
const userInfo = {
  userId: "user123",
  fullName: "John Doe",
  email: "john@example.com",
};

const response = await client.createUser(userInfo);

// Create user with phone only
const userInfo2 = {
  userId: "user456",
  fullName: "Jane Smith",
  phone: "+1234567890",
};

const response2 = await client.createUser(userInfo2);

// Create user with both email and phone
const userInfo3 = {
  userId: "user789",
  fullName: "Bob Wilson",
  email: "bob@example.com",
  phone: "+1234567890",
  avatarUrl: "https://example.com/avatar.jpg",
  metadata: { role: "admin", department: "engineering" },
};

const response3 = await client.createUser(userInfo3);
```

### 2. Delete Users

Remove users from the ContactsManager server:

```javascript
// Delete a user
const response = await client.deleteUser("user123");

console.log(`Status: ${response.status}`);
console.log(`Message: ${response.message}`);
console.log(`Deleted contact ID: ${response.data.deleted_contact_id}`);
```

### 3. Token Generation Only

Generate tokens without creating users (for existing users):

```javascript
// Generate a token for an existing user
const tokenResponse = await client.generateToken({
  userId: "user123",
  deviceInfo: {
    deviceType: "mobile",
    os: "Android",
    appVersion: "1.0.0",
  },
});

console.log(`Token: ${tokenResponse.token}`);
console.log(`Expires at: ${tokenResponse.expiresAt}`);
```

### 4. Custom Token Expiration

Control how long tokens remain valid:

```javascript
// Create user with 1-hour token expiration
const response = await client.createUser(
  userInfo,
  deviceInfo,
  3600 // 1 hour instead of default 24 hours
);

// Generate token with custom expiration
const tokenResponse = await client.generateToken({
  userId: "user123",
  expirationSeconds: 7200, // 2 hours
});
```

## Implementation Flow

Here's how to integrate ContactsManager into your application:

### Server-Side Implementation

```javascript
const { ContactsManagerClient } = require("@contactsmanager/server");

// 1. Initialize the client (do this once, typically in your app setup)
const client = new ContactsManagerClient({
  apiKey: process.env.CONTACTSMANAGER_API_KEY,
  apiSecret: process.env.CONTACTSMANAGER_API_SECRET,
  orgId: process.env.CONTACTSMANAGER_ORG_ID,
});

// 2. When a user signs up or logs in, create/update them on ContactsManager
async function handleUserLogin(userData) {
  const userInfo = {
    userId: userData.id, // Your internal user ID
    fullName: userData.name,
    email: userData.email,
    phone: userData.phone,
  };

  const deviceInfo = {
    deviceType: userData.deviceType || "web",
    os: userData.os,
    appVersion: userData.appVersion,
  };

  try {
    // Create/update user and get token
    const response = await client.createUser(userInfo, deviceInfo);

    // Return the token to your client app
    return {
      contactsmanager_token: response.data.token.token,
      expires_at: response.data.token.expires_at,
      user_created: response.data.created,
    };
  } catch (error) {
    console.error("Error creating user:", error);
    throw error;
  }
}

// 3. When a user deletes their account, remove them from ContactsManager
async function handleUserDeletion(userId) {
  try {
    const response = await client.deleteUser(userId);
    return response.status === "success";
  } catch (error) {
    console.error("Error deleting user:", error);
    return false;
  }
}

// Express.js example
app.post("/api/login", async (req, res) => {
  try {
    const userData = req.body;
    const tokenData = await handleUserLogin(userData);
    res.json(tokenData);
  } catch (error) {
    res.status(500).json({ error: "Failed to create user" });
  }
});

app.delete("/api/users/:userId", async (req, res) => {
  try {
    const success = await handleUserDeletion(req.params.userId);
    res.json({ success });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete user" });
  }
});
```

### Client-Side Usage

Once you have the token from your server, use it in your client application:

```javascript
// In your mobile app or web frontend
const contactsManagerToken = "token_from_your_server";

// Use this token with ContactsManager client SDKs
// to access social features, contact sync, etc.
```

## Data Types

### UserInfo Interface

```typescript
interface UserInfo {
  userId: string; // Required: Your internal user ID
  fullName: string; // Required: User's display name
  email?: string; // Optional: User's email
  phone?: string; // Optional: User's phone number
  avatarUrl?: string; // Optional: URL to user's avatar image
  metadata?: Record<string, any>; // Optional: Additional user data
}
```

### DeviceInfo Interface

```typescript
interface DeviceInfo {
  deviceType?: string; // Optional: "mobile", "web", "desktop"
  os?: string; // Optional: "iOS", "Android", "Windows"
  appVersion?: string; // Optional: Your app version
  locale?: string; // Optional: User's locale
  timezone?: string; // Optional: User's timezone
  [key: string]: any; // Additional device properties
}
```

### Response Types

```typescript
interface CreateUserResponse {
  status: string;
  data: {
    token: {
      token: string;
      expires_at: number;
    };
    user: CMUser;
    created: boolean;
  };
}

interface DeleteUserResponse {
  status: string;
  message: string;
  data: {
    deleted_contact_id: string;
  };
}
```

## Error Handling

```javascript
const { ServerAPIError } = require("@contactsmanager/server");

try {
  const response = await client.createUser(userInfo);
  console.log("User created successfully!");
} catch (error) {
  if (error instanceof ServerAPIError) {
    console.error(`Server error: ${error.message}`);
    console.error(`Status code: ${error.statusCode}`);
    console.error(`Response data:`, error.responseData);
  } else {
    console.error(`Unexpected error: ${error.message}`);
  }
}
```

## Webhook Verification

Verify webhooks from ContactsManager:

```javascript
// Set your webhook secret (get this from ContactsManager dashboard)
client.setWebhookSecret("your_webhook_secret");

// Express.js webhook handler example
app.post("/webhooks/contactsmanager", (req, res) => {
  const payload = req.body;
  const signature = req.headers["x-contactsmanager-signature"];

  if (client.verifyWebhookSignature(payload, signature)) {
    // Process the webhook
    console.log("Webhook verified!");
    res.json({ status: "success" });
  } else {
    console.log("Invalid webhook signature");
    res.status(401).json({ error: "Invalid signature" });
  }
});
```

## Token Structure

The tokens generated by the SDK have the following structure:

```javascript
{
  "user_id": "user123",          // User identifier
  "api_key": "your_api_key",     // Your API key
  "org_id": "your_org_id",       // Your organization ID
  "device": { /* device info */ },  // Device information (optional)
  "jti": "unique-uuid",          // JWT ID for token uniqueness
  "iat": 1617184430,             // Issued at timestamp
  "exp": 1617270830              // Expiration timestamp
}
```

## Requirements

- Node.js 14+
- jsonwebtoken >= 9.0.0

## Development

### Setting up development environment

```bash
# Clone the repository
git clone https://github.com/arpwal/contactmanager.git
cd contactmanager/sdk/nodejs

# Install dependencies
npm install

# Run tests
npm test
```

### Running integration tests

The SDK includes integration tests that verify the functionality against an actual ContactsManager API server.

To run the integration tests locally:

1. Create a `.env` file in the root directory with the following environment variable:

```
TEST_CONFIG={"apiKey":"your_api_key","apiSecret":"your_api_secret","orgId":"your_org_id","serverUrl":"https://api.contactsmanager.io"}
```

The `TEST_CONFIG` environment variable should be a JSON string containing all the required credentials:

- `apiKey`: Your ContactsManager API key
- `apiSecret`: Your ContactsManager API secret
- `orgId`: Your organization ID
- `serverUrl`: Optional server URL (defaults to https://api.contactsmanager.io)

2. Run the integration tests:

```bash
npm run test:integration
```

Note: Integration tests are also run automatically in the CI pipeline if the required environment variables are configured as GitHub secrets. In GitHub Actions, set a secret named `TEST_CONFIG` with the JSON string value as shown above.

### Releasing new versions

The SDK uses an automated process for releases:

1. Update the version in `package.json` using npm:

   ```bash
   npm version patch # or minor, or major
   ```

2. Commit and push the change to the main branch:

   ```bash
   git push origin main --follow-tags
   ```

3. The GitHub Actions workflow will automatically:
   - Run all tests
   - Build the package
   - Publish to npm (using the NPM_TOKEN stored in GitHub secrets)
   - Create a new GitHub release with the version tag

Alternatively, you can manually trigger the workflow by going to the "Actions" tab in the GitHub repository and using the "Run workflow" button on the "Build and Publish" workflow.

## License

MIT License

## About ContactsManager.io

[ContactsManager.io](https://www.contactsmanager.io) provides a platform for app developers to integrate social features into their applications. Our SDK ensures that contact information stays with users only, with multi-layer encryption and military-grade security to prevent spam and data misuse.

For more information and documentation, visit [contactsmanager.io](https://www.contactsmanager.io).
