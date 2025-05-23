/// <reference types="jest" />
import axios from 'axios';
import dotenv from 'dotenv';
import { ContactsManagerClient } from './index';

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

// Utility function for generating unique IDs
const generateUniqueId = (prefix: string = ''): string => {
  const timestamp = Date.now();
  const uniquePart = crypto.randomUUID().substring(0, 8); // Use first 8 chars of UUID
  return prefix ? `${prefix}_${timestamp}_${uniquePart}` : `${timestamp}_${uniquePart}`;
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

describeOrSkip('Integration tests - ContactsManagerClient', () => {
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

  describe('validate-key endpoint', () => {
    it('should successfully validate a valid API key', async () => {
      if (!testConfig) return;

      // Generate a token first
      const tokenResponse = await client.generateToken({
        userId: generateUniqueId('test-user'),
        deviceInfo: {
          deviceType: 'test',
          os: 'integration-test',
          appVersion: '1.0.0'
        }
      });

      // Create an axios instance with the token
      const api = axios.create({
        baseURL: testConfig.serverUrl,
        headers: {
          Authorization: `Bearer ${tokenResponse.token}`,
          'Content-Type': 'application/json'
        }
      });

      // Call the validate-key endpoint
      const response = await api.post('/api/v1/client/validate-key', {
        api_key: testConfig.apiKey,
        user_info: {
          userId: generateUniqueId('test-user'),
          email: 'test@example.com',
          fullName: 'Test User'
        },
        device_info: {
          deviceType: 'test',
          os: 'integration-test',
          appVersion: '1.0.0'
        }
      });

      // Assertions
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('status', 'success');
      expect(response.data.data).toHaveProperty('valid', true);
    });

    it('should reject an invalid API key', async () => {
      if (!testConfig) return;

      // Generate a token first
      const tokenResponse = await client.generateToken({
        userId: generateUniqueId('test-user'),
        deviceInfo: {
          deviceType: 'test',
          os: 'integration-test',
          appVersion: '1.0.0'
        }
      });

      // Create an axios instance with the token
      const api = axios.create({
        baseURL: testConfig.serverUrl,
        headers: {
          Authorization: `Bearer ${tokenResponse.token}`,
          'Content-Type': 'application/json'
        }
      });

      // Call the validate-key endpoint with invalid API key
      try {
        await api.post('/api/v1/client/validate-key', {
          api_key: 'invalid-api-key',
          user_info: {
            userId: generateUniqueId('test-user')
          }
        });
        // If we reach here, the test should fail
        expect(true).toBe(false); // Force fail if we reach here
      } catch (error) {
        if (axios.isAxiosError(error)) {
          expect(error.response?.status).toBe(401);
          expect(error.response?.data).toHaveProperty('detail', 'Invalid API key');
        } else {
          throw error; // Re-throw if it's not an Axios error
        }
      }
    });
  });
}); 