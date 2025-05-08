import jwt from 'jsonwebtoken';
import { ContactsManagerClient } from './index';
import crypto from 'crypto';

// For TypeScript type checking
declare const jest: any;
declare namespace jest {
  interface Mock<T = any, Y extends any[] = any[]> {
    (...args: Y): T;
    mockImplementation: (fn: (...args: Y) => T) => Mock<T, Y>;
    mockReturnValue: (val: T) => Mock<T, Y>;
    mockReturnThis: () => Mock<T, Y>;
  }
}
declare const describe: any;
declare const it: any;
declare const expect: any;
declare const beforeEach: any;

// Mock jsonwebtoken
jest.mock('jsonwebtoken');

describe('ContactsManagerClient', () => {
  const mockConfig = {
    apiKey: 'test-api-key',
    apiSecret: 'test-api-secret',
    orgId: 'test-org-id'
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (jwt.sign as jest.Mock).mockReturnValue('mock-jwt-token');
  });

  describe('constructor', () => {
    it('should throw an error if apiKey is missing', () => {
      expect(() => {
        new ContactsManagerClient({
          ...mockConfig,
          apiKey: ''
        });
      }).toThrow('Missing required configuration');
    });

    it('should throw an error if apiSecret is missing', () => {
      expect(() => {
        new ContactsManagerClient({
          ...mockConfig,
          apiSecret: ''
        });
      }).toThrow('Missing required configuration');
    });

    it('should throw an error if orgId is missing', () => {
      expect(() => {
        new ContactsManagerClient({
          ...mockConfig,
          orgId: ''
        });
      }).toThrow('Missing required configuration');
    });

    it('should create instance successfully with valid config', () => {
      const client = new ContactsManagerClient(mockConfig);
      expect(client).toBeInstanceOf(ContactsManagerClient);
    });
  });

  describe('generateToken', () => {
    const client = new ContactsManagerClient(mockConfig);

    it('should throw error if userId is missing', async () => {
      await expect(client.generateToken({
        userId: ''
      })).rejects.toThrow('userId is required');
    });

    it('should generate a token with default expiration', async () => {
      const result = await client.generateToken({
        userId: 'test-user-id'
      });

      expect(result).toHaveProperty('token', 'mock-jwt-token');
      expect(result).toHaveProperty('expiresAt');
      expect(result.expiresAt).toBeInstanceOf(Date);

      expect(jwt.sign).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'test-user-id',
          api_key: 'test-api-key',
          org_id: 'test-org-id',
          device: {},
          jti: expect.any(String)
        }),
        'test-api-secret',
        { algorithm: 'HS256' }
      );
    });

    it('should generate a token with custom expiration', async () => {
      const result = await client.generateToken({
        userId: 'test-user-id',
        expirationSeconds: 3600
      });

      expect(result).toHaveProperty('token', 'mock-jwt-token');
      expect(jwt.sign).toHaveBeenCalledWith(
        expect.objectContaining({
          exp: expect.any(Number),
          jti: expect.any(String)
        }),
        'test-api-secret',
        { algorithm: 'HS256' }
      );
    });

    it('should include device info in the token payload', async () => {
      const deviceInfo = {
        deviceType: 'mobile',
        os: 'iOS',
        appVersion: '1.0.0'
      };

      await client.generateToken({
        userId: 'test-user-id',
        deviceInfo
      });

      expect(jwt.sign).toHaveBeenCalledWith(
        expect.objectContaining({
          device: deviceInfo,
          jti: expect.any(String)
        }),
        'test-api-secret',
        { algorithm: 'HS256' }
      );
    });

    it('should handle jwt sign errors', async () => {
      (jwt.sign as jest.Mock).mockImplementation(() => {
        throw new Error('JWT signing error');
      });

      await expect(client.generateToken({
        userId: 'test-user-id'
      })).rejects.toThrow('Failed to generate token: JWT signing error');
    });
  });

  describe('setWebhookSecret', () => {
    const client = new ContactsManagerClient(mockConfig);

    it('should throw an error if webhook secret is missing', () => {
      expect(() => {
        client.setWebhookSecret('');
      }).toThrow('Webhook secret is required and must be a string');
    });

    it('should throw an error if webhook secret is not a string', () => {
      expect(() => {
        client.setWebhookSecret(123 as any);
      }).toThrow('Webhook secret is required and must be a string');
    });

    it('should set webhook secret successfully', () => {
      client.setWebhookSecret('test-webhook-secret');
      // Successfully set if no error is thrown
      expect(true).toBe(true);
    });
  });

  describe('verifyWebhookSignature', () => {
    const client = new ContactsManagerClient(mockConfig);
    const testWebhookSecret = 'test-webhook-secret';
    const validPayload = { id: '123', event: 'user.new', payload: { userId: 'test-user' } };
    
    // Mock the crypto functions
    const mockTimingSafeEqual = jest.fn().mockReturnValue(true);
    const mockCreateHmac = {
      update: jest.fn().mockReturnThis(),
      digest: jest.fn().mockReturnValue('valid-signature')
    };
    
    beforeEach(() => {
      jest.spyOn(crypto, 'timingSafeEqual').mockImplementation(mockTimingSafeEqual);
      jest.spyOn(crypto, 'createHmac').mockReturnValue(mockCreateHmac as any);
      jest.spyOn(Date, 'now').mockReturnValue(1609459200000); // 2021-01-01T00:00:00.000Z
      client.setWebhookSecret(testWebhookSecret);
    });

    it('should throw an error if webhook secret is not set', () => {
      const clientWithoutSecret = new ContactsManagerClient(mockConfig);
      expect(() => {
        clientWithoutSecret.verifyWebhookSignature(validPayload, 't=1609459200,v1=valid-signature');
      }).toThrow('Webhook secret not set');
    });

    it('should return false if signature components are missing', () => {
      expect(client.verifyWebhookSignature(validPayload, 'invalid-signature')).toBe(false);
      expect(client.verifyWebhookSignature(validPayload, 't=1609459200')).toBe(false);
      expect(client.verifyWebhookSignature(validPayload, 'v1=valid-signature')).toBe(false);
    });

    it('should return false if timestamp is too old', () => {
      // Timestamp is more than 15 minutes old (900 seconds)
      const oldTimestamp = Math.floor(Date.now() / 1000) - 1000;
      expect(client.verifyWebhookSignature(validPayload, `t=${oldTimestamp},v1=valid-signature`)).toBe(false);
    });

    it('should return true for valid signature with object payload', () => {
      const timestamp = Math.floor(Date.now() / 1000);
      const signature = `t=${timestamp},v1=valid-signature`;
      
      expect(client.verifyWebhookSignature(validPayload, signature)).toBe(true);
      
      // Verify HMAC was called with correct parameters
      expect(crypto.createHmac).toHaveBeenCalledWith('sha256', testWebhookSecret);
      expect(mockCreateHmac.update).toHaveBeenCalledWith(`${timestamp}.${JSON.stringify(validPayload)}`);
    });

    it('should return true for valid signature with string payload', () => {
      const timestamp = Math.floor(Date.now() / 1000);
      const stringPayload = JSON.stringify(validPayload);
      const signature = `t=${timestamp},v1=valid-signature`;
      
      expect(client.verifyWebhookSignature(stringPayload, signature)).toBe(true);
      
      expect(crypto.createHmac).toHaveBeenCalledWith('sha256', testWebhookSecret);
      expect(mockCreateHmac.update).toHaveBeenCalledWith(`${timestamp}.${stringPayload}`);
    });

    it('should handle signature verification errors', () => {
      jest.spyOn(crypto, 'timingSafeEqual').mockImplementation(() => {
        throw new Error('Verification error');
      });
      
      const timestamp = Math.floor(Date.now() / 1000);
      const signature = `t=${timestamp},v1=valid-signature`;
      
      expect(client.verifyWebhookSignature(validPayload, signature)).toBe(false);
    });

    it('should compare signatures using constant-time comparison', () => {
      const timestamp = Math.floor(Date.now() / 1000);
      const signature = `t=${timestamp},v1=valid-signature`;
      
      client.verifyWebhookSignature(validPayload, signature);
      
      expect(crypto.timingSafeEqual).toHaveBeenCalledWith(
        Buffer.from('valid-signature'),
        Buffer.from('valid-signature')
      );
    });

    it('should return false if signature does not match', () => {
      mockTimingSafeEqual.mockReturnValueOnce(false);
      
      const timestamp = Math.floor(Date.now() / 1000);
      const signature = `t=${timestamp},v1=invalid-signature`;
      
      expect(client.verifyWebhookSignature(validPayload, signature)).toBe(false);
    });
  });
}); 