/// <reference types="jest" />
import axios from 'axios';
import dotenv from 'dotenv';
import { randomUUID } from 'crypto';
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

// Utility functions for generating unique IDs
const generateUniqueId = (prefix: string = ''): string => {
  const timestamp = Date.now();
  const uniquePart = randomUUID().substring(0, 8); // Use first 8 chars of UUID
  return prefix ? `${prefix}_${timestamp}_${uniquePart}` : `${timestamp}_${uniquePart}`;
};

const generateUniqueEmail = (prefix: string = 'test'): string => {
  const uniqueId = generateUniqueId();
  return `${prefix}_${uniqueId}@example.com`;
};

const generateUniquePhone = (): string => {
  const timestamp = Date.now();
  return `+1555${timestamp % 10000}`;
};

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

      const userId = generateUniqueId('test_user_email');
      const userInfo: UserInfo = {
        userId,
        fullName: 'Test User Email',
        email: generateUniqueEmail('test')
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
        expect(response.data.user.organization_user_id).toBe(userId);
        expect(response.data.user.email).toBe(userInfo.email);
        expect(response.data.user.full_name).toBe(userInfo.fullName);
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

      const userId = generateUniqueId('test_user_phone');
      const userInfo: UserInfo = {
        userId,
        fullName: 'Test User Phone',
        phone: generateUniquePhone()
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
        expect(response.data.user.organization_user_id).toBe(userId);
        expect(response.data.user.phone).toBe(userInfo.phone);
        expect(response.data.user.full_name).toBe(userInfo.fullName);
      } catch (error) {
        if (error instanceof ServerAPIError) {
          throw new Error(`Server API error: ${error.message} (Status: ${error.statusCode})`);
        }
        throw error;
      }
    });

    it('should create user with both email and phone', async () => {
      if (!testConfig) return;

      const userId = generateUniqueId('test_user_both');
      const userInfo: UserInfo = {
        userId,
        fullName: 'Test User Both',
        email: generateUniqueEmail('test_both'),
        phone: generateUniquePhone(),
        avatarUrl: 'https://example.com/avatar.jpg',
        metadata: { testType: 'integration', timestamp: Date.now() }
      };

      try {
        const response = await client.createUser(userInfo);

        // Verify response structure
        expect(response.status).toBe('success');
        expect(response.data.user).toBeDefined();
        expect(response.data.user.organization_user_id).toBe(userId);
        expect(response.data.user.email).toBe(userInfo.email);
        expect(response.data.user.phone).toBe(userInfo.phone);
        expect(response.data.user.full_name).toBe(userInfo.fullName);
        expect(response.data.user.avatar_url).toBe(userInfo.avatarUrl);
        expect(response.data.user.contact_metadata).toBeDefined();
      } catch (error) {
        if (error instanceof ServerAPIError) {
          throw new Error(`Server API error: ${error.message} (Status: ${error.statusCode})`);
        }
        throw error;
      }
    });

    it('should update existing user', async () => {
      if (!testConfig) return;

      const userId = generateUniqueId('test_user_update');

      // First, create a user
      const userInfoCreate: UserInfo = {
        userId,
        fullName: 'Original Name',
        email: generateUniqueEmail('original')
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
          email: generateUniqueEmail('updated'),
          phone: generateUniquePhone()
        };

        // Update user (should not create a new one)
        const updateResponse = await client.createUser(userInfoUpdate);
        expect(updateResponse.status).toBe('success');
        // Note: created flag might be False for updates, depending on server implementation
        expect(updateResponse.data.user.organization_user_id).toBe(userId);
        expect(updateResponse.data.user.full_name).toBe('Updated Name');
      } catch (error) {
        if (error instanceof ServerAPIError) {
          throw new Error(`Server API error: ${error.message} (Status: ${error.statusCode})`);
        }
        throw error;
      }
    });

    it('should create user with custom expiry', async () => {
      if (!testConfig) return;

      const userId = generateUniqueId('test_user_expiry');
      const userInfo: UserInfo = {
        userId,
        fullName: 'Test User Expiry',
        email: generateUniqueEmail('expiry')
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

      const userId = generateUniqueId('test_user_delete');

      // First, create a user to delete
      const userInfo: UserInfo = {
        userId,
        fullName: 'User To Delete',
        email: generateUniqueEmail('delete')
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

    it('should handle deleting non-existent user', async () => {
      if (!testConfig) return;

      const userId = generateUniqueId('nonexistent_user');

      try {
        // Attempt to delete non-existent user
        const deleteResponse = await client.deleteUser(userId);
        // This might succeed with a message indicating no user was found
        // or it might raise an error - both are valid depending on implementation
      } catch (error) {
        if (error instanceof ServerAPIError) {
          // If it raises an error, it should be a 404 or similar
          expect([404, 400].includes(error.statusCode || 0)).toBe(true);
        } else {
          throw error;
        }
      }
    });
  });

  describe('direct API calls', () => {
    it('should make direct calls to server API endpoints', async () => {
      if (!testConfig || !testConfig.serverUrl) return;

      const userId = generateUniqueId('test_direct_api');

      // Generate a token for authentication
      const tokenData = await client.generateToken({ userId });
      const token = tokenData.token;

      // Test the server create-user endpoint directly
      const headers = { 'Authorization': `Bearer ${token}` };
      const createUrl = `${testConfig.serverUrl}/api/v1/server/users/${userId}`;

      const userInfoDict = {
        userId,
        fullName: 'Direct API Test User',
        email: generateUniqueEmail('direct')
      };

      try {
        // Test create user endpoint
        const response = await axios.post(createUrl, {
          expiry_seconds: 86400,
          user_info: userInfoDict,
          device_info: { deviceType: 'test', os: 'integration-test' }
        }, { headers });

        expect(response.status).toBe(200);
        expect(response.data.status).toBe('success');
        expect(response.data.data.token).toBeDefined();
        expect(response.data.data.user).toBeDefined();

        // Test delete user endpoint
        const deleteUrl = `${testConfig.serverUrl}/api/v1/server/users/${userId}`;
        const deleteResponse = await axios.delete(deleteUrl, { headers });

        expect(deleteResponse.status).toBe(200);
        expect(deleteResponse.data.status).toBe('success');
      } catch (error) {
        if (axios.isAxiosError(error)) {
          throw new Error(`HTTP error: ${error.response?.status} - ${error.response?.data}`);
        }
        throw error;
      }
    });
  });
}); 