const { ContactsManagerClient } = require("@contactsmanager/sdk");

// Initialize the client with your credentials
const client = new ContactsManagerClient({
  apiKey: process.env.CONTACTSMANAGER_API_KEY || "your_api_key",
  apiSecret: process.env.CONTACTSMANAGER_API_SECRET || "your_api_secret",
  orgId: process.env.CONTACTSMANAGER_ORG_ID || "your_org_id",
});

async function generateToken() {
  try {
    // Generate a token for a user
    const tokenResponse = await client.generateToken({
      userId: "user123",
      deviceInfo: {
        deviceType: "mobile",
        os: "iOS",
        appVersion: "1.0.0",
      },
    });

    console.log("Generated token:");
    console.log(`Token: ${tokenResponse.token}`);
    console.log(`Expires at: ${tokenResponse.expiresAt}`);

    // Example with custom expiration (1 hour)
    const shortLivedToken = await client.generateToken({
      userId: "user123",
      expirationSeconds: 3600, // 1 hour
    });

    console.log("\nGenerated short-lived token:");
    console.log(`Token: ${shortLivedToken.token}`);
    console.log(`Expires at: ${shortLivedToken.expiresAt}`);
  } catch (error) {
    console.error("Error generating token:", error);
  }
}

// Run the example
generateToken();
