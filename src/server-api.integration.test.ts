/// <reference types="jest" />
import axios from 'axios';
import dotenv from 'dotenv';
import { ContactsManagerClient, UserInfo, DeviceInfo, ServerAPIError } from './index';

// Explicitly declare Jest types to avoid TypeScript errors
declare const describe: {
  (name: string, fn: () => void): void;
  skip: (name: string, fn: () => void) => void;
};
declare const beforeAll: (fn: () => void) => void;
declare const it: (name: string, fn: () => Promise<void> | void) => void;
declare const expect: any;

// Load environment variables
dotenv.config();

// Define the config for test
interface TestConfig {
  apiKey: string;
  apiSecret: string;
  orgId: string;
  serverUrl: string;
}

// Get configs from environment variables
const getTestConfig = (): TestConfig | null => {
  try {
    // Try to parse JSON config from environment variable
    const configJson = process.env.TEST_CONFIG;
    
    if (!configJson) {
      console.log('TEST_CONFIG environment variable not found');
      return null;
    }
    
    const config = JSON.parse(configJson);
    
    // Validate the config has the required fields
    if (!config.apiKey || !config.apiSecret || !config.orgId) {
      console.log('TEST_CONFIG missing required fields: apiKey, apiSecret, and orgId are required');
      return null;
    }
    
    // Provide default serverUrl if not specified
    return {
      apiKey: config.apiKey,
      apiSecret: config.apiSecret,
      orgId: config.orgId,
      serverUrl: config.serverUrl || 'https://api.contactsmanager.io'
    };
  } catch (error) {
    console.log('Failed to parse TEST_CONFIG', error);
    return null;
  }
};

// Get test config or null if not available
const testConfig = getTestConfig();
const describeOrSkip = testConfig ? describe : describe.skip;

describeOrSkip('Integration tests - Server API', () => {
  let client: ContactsManagerClient;

  beforeAll(() => {
    if (testConfig) {
      client = new ContactsManagerClient({
        apiKey: testConfig.apiKey,
        apiSecret: testConfig.apiSecret,
        orgId: testConfig.orgId
      });
    }
  });

  describe('createUser', () => {
    it('should create user with email successfully', async () => {
      if (!testConfig) return;

      const userId = `test_user_email_${Date.now()}`;
      const userInfo: UserInfo = {
        userId,
        fullName: 'Test User Email',
        email: `test_${Date.now()}@example.com`
      };

      const deviceInfo: DeviceInfo = {
        deviceType: 'test',
        os: 'integration-test',
        appVersion: '1.0.0'
      };

      try {
        const response = await client.createUser(userInfo, deviceInfo);

        // Verify response structure
        expect(response.status).toBe('success');
        expect(response.data.token).toBeDefined();
        expect(response.data.token.token).toBeDefined();
        expect(typeof response.data.token.expires_at).toBe('number');
        expect(response.data.user).toBeDefined();
        expect(response.data.user.organizationUserId).toBe(userId);
        expect(response.data.user.email).toBe(userInfo.email);
        expect(response.data.user.fullName).toBe(userInfo.fullName);
        expect(typeof response.data.created).toBe('boolean');
      } catch (error) {
        if (error instanceof ServerAPIError) {
          throw new Error(`Server API error: ${error.message} (Status: ${error.statusCode})`);
        }
        throw error;
      }
    });

    it('should create user with phone successfully', async () => {
      if (!testConfig) return;

      const userId = `test_user_phone_${Date.now()}`;
      const userInfo: UserInfo = {
        userId,
        fullName: 'Test User Phone',
        phone: `+1555${Date.now() % 10000}`
      };

      const deviceInfo: DeviceInfo = {
        deviceType: 'mobile',
        os: 'iOS',
        appVersion: '2.0.0'
      };

      try {
        const response = await client.createUser(userInfo, deviceInfo);

        // Verify response structure
        expect(response.status).toBe('success');
        expect(response.data.token).toBeDefined();
        expect(response.data.user).toBeDefined();
        expect(response.data.user.organizationUserId).toBe(userId);
        expect(response.data.user.phone).toBe(userInfo.phone);
        expect(response.data.user.fullName).toBe(userInfo.fullName);
      } catch (error) {
        if (error instanceof ServerAPIError) {
          throw new Error(`Server API error: ${error.message} (Status: ${error.statusCode})`);
        }
        throw error;
      }
    });

    it('should create user with both email and phone', async () => {
      if (!testConfig) return;

      const userId = `test_user_both_${Date.now()}`;
      const userInfo: UserInfo = {
        userId,
        fullName: 'Test User Both',
        email: `test_both_${Date.now()}@example.com`,
        phone: `+1555${Date.now() % 10000}`,
        avatarUrl: 'https://example.com/avatar.jpg',
        metadata: { testType: 'integration', timestamp: Date.now() }
      };

      try {
        const response = await client.createUser(userInfo);

        // Verify response structure
        expect(response.status).toBe('success');
        expect(response.data.user).toBeDefined();
        expect(response.data.user.organizationUserId).toBe(userId);
        expect(response.data.user.email).toBe(userInfo.email);
        expect(response.data.user.phone).toBe(userInfo.phone);
        expect(response.data.user.fullName).toBe(userInfo.fullName);
        expect(response.data.user.avatarUrl).toBe(userInfo.avatarUrl);
        expect(response.data.user.contactMetadata).toBeDefined();
      } catch (error) {
        if (error instanceof ServerAPIError) {
          throw new Error(`Server API error: ${error.message} (Status: ${error.statusCode})`);
        }
        throw error;
      }
    });

    it('should update existing user', async () => {
      if (!testConfig) return;

      const userId = `test_user_update_${Date.now()}`;

      // First, create a user
      const userInfoCreate: UserInfo = {
        userId,
        fullName: 'Original Name',
        email: `original_${Date.now()}@example.com`
      };

      try {
        // Create user
        const createResponse = await client.createUser(userInfoCreate);
        expect(createResponse.status).toBe('success');
        expect(createResponse.data.created).toBe(true);

        // Now update the same user
        const userInfoUpdate: UserInfo = {
          userId,
          fullName: 'Updated Name',
          email: `updated_${Date.now()}@example.com`,
          phone: `+1555${Date.now() % 10000}`
        };

        // Update user (should not create a new one)
        const updateResponse = await client.createUser(userInfoUpdate);
        expect(updateResponse.status).toBe('success');
        expect(updateResponse.data.user.organizationUserId).toBe(userId);
        expect(updateResponse.data.user.fullName).toBe('Updated Name');
      } catch (error) {
        if (error instanceof ServerAPIError) {
          throw new Error(`Server API error: ${error.message} (Status: ${error.statusCode})`);
        }
        throw error;
      }
    });

    it('should create user with custom expiry', async () => {
      if (!testConfig) return;

      const userId = `test_user_expiry_${Date.now()}`;
      const userInfo: UserInfo = {
        userId,
        fullName: 'Test User Expiry',
        email: `expiry_${Date.now()}@example.com`
      };

      // Use 1 hour expiry instead of default 24 hours
      const expirySeconds = 3600;

      try {
        const response = await client.createUser(userInfo, undefined, expirySeconds);

        // Verify response
        expect(response.status).toBe('success');
        expect(response.data.token).toBeDefined();

        // Verify token expiry is approximately correct (within 60 seconds tolerance)
        const expectedExpiry = Math.floor(Date.now() / 1000) + expirySeconds;
        const actualExpiry = response.data.token.expires_at;
        expect(Math.abs(actualExpiry - expectedExpiry)).toBeLessThan(60);
      } catch (error) {
        if (error instanceof ServerAPIError) {
          throw new Error(`Server API error: ${error.message} (Status: ${error.statusCode})`);
        }
        throw error;
      }
    });
  });

  describe('deleteUser', () => {
    it('should delete user successfully', async () => {
      if (!testConfig) return;

      const userId = `test_user_delete_${Date.now()}`;

      // First, create a user to delete
      const userInfo: UserInfo = {
        userId,
        fullName: 'User To Delete',
        email: `delete_${Date.now()}@example.com`
      };

      try {
        // Create user
        const createResponse = await client.createUser(userInfo);
        expect(createResponse.status).toBe('success');

        // Now delete the user
        const deleteResponse = await client.deleteUser(userId);

        // Verify delete response
        expect(deleteResponse.status).toBe('success');
        expect(deleteResponse.message.toLowerCase()).toContain('deleted');
        expect(deleteResponse.data.deleted_contact_id).toBeDefined();
      } catch (error) {
        if (error instanceof ServerAPIError) {
          throw new Error(`Server API error: ${error.message} (Status: ${error.statusCode})`);
        }
        throw error;
      }
    });

    it('should handle deleting nonexistent user', async () => {
      if (!testConfig) return;

      const userId = `nonexistent_user_${Date.now()}`;

      try {
        // Attempt to delete non-existent user
        await client.deleteUser(userId);
        // This might succeed with a message indicating no user was found
        // or it might raise an error - both are valid depending on implementation
      } catch (error) {
        if (error instanceof ServerAPIError) {
          // If it raises an error, it should be a 404 or similar
          expect([404, 400]).toContain(error.statusCode);
        } else {
          throw error;
        }
      }
    });
  });

  describe('direct API calls', () => {
    it('should make direct calls to server API endpoints', async () => {
      if (!testConfig) return;

      const userId = `test_direct_api_${Date.now()}`;

      // Generate a token for authentication
      const tokenData = await client.generateToken({ userId });
      const token = tokenData.token;

      // Test the server create-user endpoint directly
      const headers = { Authorization: `Bearer ${token}` };
      const createUrl = `${testConfig.serverUrl}/api/v1/server/users/${userId}`;

      const userInfoDict = {
        userId,
        fullName: 'Direct API Test User',
        email: `direct_${Date.now()}@example.com`
      };

      try {
        // Test create user endpoint
        const response = await axios.post(
          createUrl,
          {
            expiry_seconds: 86400,
            user_info: userInfoDict,
            device_info: {
              deviceType: 'test',
              os: 'integration-test'
            }
          },
          { headers }
        );

        expect(response.status).toBe(200);
        const data = response.data;
        expect(data.status).toBe('success');
        expect(data.data.token).toBeDefined();
        expect(data.data.user).toBeDefined();

        // Test delete user endpoint
        const deleteUrl = `${testConfig.serverUrl}/api/v1/server/users/${userId}`;
        const deleteResponse = await axios.delete(deleteUrl, { headers });

        expect(deleteResponse.status).toBe(200);
        const deleteData = deleteResponse.data;
        expect(deleteData.status).toBe('success');
      } catch (error) {
        if (axios.isAxiosError(error)) {
          throw new Error(`API error: ${error.response?.status} - ${error.response?.data?.detail || error.message}`);
        }
        throw error;
      }
    });
  });
}); 