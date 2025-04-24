# ContactsManager Node.js SDK

A Node.js SDK for the ContactsManager API that handles authentication and token generation.

## Installation

```bash
npm install @contactsmanager/sdk
```

## Usage

```javascript
const { ContactsManagerClient } = require("@contactsmanager/sdk");

// Initialize the client
const client = new ContactsManagerClient({
  apiKey: "your_api_key",
  apiSecret: "your_api_secret",
  orgId: "your_org_id",
});

// Generate a token for a user
async function generateUserToken() {
  try {
    const tokenResponse = await client.generateToken({
      userId: "user123",
      deviceInfo: {
        // Optional
        deviceType: "mobile",
        os: "Android",
        appVersion: "1.0.0",
      },
    });

    console.log(`Token: ${tokenResponse.token}`);
    console.log(`Expires at: ${tokenResponse.expiresAt}`);
  } catch (error) {
    console.error("Error generating token:", error);
  }
}

generateUserToken();
```

## Features

- Simple API for generating JWT tokens
- TypeScript support with type definitions
- Comprehensive test coverage
- Support for custom token expiration
- Promise-based API

## Advanced Usage

### Custom Token Expiration

By default, tokens expire after 24 hours (86400 seconds). You can customize this:

```javascript
// Generate a token that expires in 1 hour
const tokenResponse = await client.generateToken({
  userId: "user123",
  expirationSeconds: 3600, // 1 hour
});
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

3. The GitHub Actions workflow will:
   - Run all tests
   - Create a new GitHub release with the version tag
   - Build and publish the package to npm

## License

MIT License
