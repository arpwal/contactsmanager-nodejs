import jwt from 'jsonwebtoken';
import { ContactsManagerClient, UserInfo, DeviceInfo, ServerAPIError } from './index';
import crypto from 'crypto';

// For TypeScript type checking
declare const jest: any;
declare namespace jest {
  interface Mock<T = any, Y extends any[] = any[]> {
    (...args: Y): T;
    mockImplementation: (fn: (...args: Y) => T) => Mock<T, Y>;
    mockReturnValue: (val: T) => Mock<T, Y>;
    mockReturnThis: () => Mock<T, Y>;
    mockClear: () => void;
    mockResolvedValueOnce: (val: T) => Mock<T, Y>;
    mockRejectedValueOnce: (val: any) => Mock<T, Y>;
  }
}
declare const describe: any;
declare const it: any;
declare const expect: any;
declare const beforeEach: any;

// Mock jsonwebtoken
jest.mock('jsonwebtoken');

// Mock fetch globally
global.fetch = jest.fn();

describe('ContactsManagerClient', () => {
  const mockConfig = {
    apiKey: 'test-api-key',
    apiSecret: 'test-api-secret',
    orgId: 'test-org-id'
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (jwt.sign as jest.Mock).mockReturnValue('mock-jwt-token');
    (global.fetch as jest.Mock).mockClear();
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

  describe('createUser', () => {
    const client = new ContactsManagerClient(mockConfig);

    const validUserInfo: UserInfo = {
      userId: 'test-user-123',
      fullName: 'Test User',
      email: 'test@example.com'
    };

    const validDeviceInfo: DeviceInfo = {
      deviceType: 'mobile',
      os: 'iOS',
      appVersion: '1.0.0'
    };

    it('should create user successfully with valid parameters', async () => {
      const mockResponse = {
        status: 'success',
        data: {
          token: {
            token: 'new-jwt-token',
            expires_at: 1234567890
          },
          user: {
            id: 'user-123',
            organizationId: 'org-456',
            organizationUserId: 'test-user-123',
            email: 'test@example.com',
            fullName: 'Test User',
            isActive: true
          },
          created: true
        }
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const result = await client.createUser(validUserInfo, validDeviceInfo);

      expect(result).toEqual(mockResponse);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/server/users/test-user-123'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': 'Bearer mock-jwt-token',
            'Content-Type': 'application/json'
          }),
          body: JSON.stringify({
            expiry_seconds: 86400,
            user_info: validUserInfo,
            device_info: validDeviceInfo
          })
        })
      );
    });

    it('should create user with custom expiry seconds', async () => {
      const mockResponse = {
        status: 'success',
        data: {
          token: { token: 'token', expires_at: 1234567890 },
          user: { id: 'user-123' },
          created: true
        }
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      await client.createUser(validUserInfo, validDeviceInfo, 3600);

      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: JSON.stringify({
            expiry_seconds: 3600,
            user_info: validUserInfo,
            device_info: validDeviceInfo
          })
        })
      );
    });

    it('should throw error for invalid userInfo', async () => {
      await expect(client.createUser(null as any)).rejects.toThrow(
        'userInfo is required and must be a UserInfo object'
      );

      await expect(client.createUser('invalid' as any)).rejects.toThrow(
        'userInfo is required and must be a UserInfo object'
      );
    });

    it('should handle server API errors', async () => {
      const errorResponse = {
        detail: 'User creation failed'
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => errorResponse
      });

      await expect(client.createUser(validUserInfo)).rejects.toThrow(
        'Failed to create user: 400'
      );
    });

    it('should handle network errors', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      await expect(client.createUser(validUserInfo)).rejects.toThrow(
        'Network error while creating user'
      );
    });
  });

  describe('deleteUser', () => {
    const client = new ContactsManagerClient(mockConfig);

    it('should delete user successfully', async () => {
      const mockResponse = {
        status: 'success',
        message: 'User deleted successfully',
        data: {
          deleted_contact_id: 'contact-123'
        }
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const result = await client.deleteUser('test-user-123');

      expect(result).toEqual(mockResponse);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/server/users/test-user-123'),
        expect.objectContaining({
          method: 'DELETE',
          headers: expect.objectContaining({
            'Authorization': 'Bearer mock-jwt-token'
          })
        })
      );
    });

    it('should throw error for invalid uid', async () => {
      await expect(client.deleteUser('')).rejects.toThrow(
        'User ID is required and must be a string'
      );

      await expect(client.deleteUser(null as any)).rejects.toThrow(
        'User ID is required and must be a string'
      );

      await expect(client.deleteUser(123 as any)).rejects.toThrow(
        'User ID is required and must be a string'
      );
    });

    it('should handle server API errors', async () => {
      const errorResponse = {
        detail: 'User not found'
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => errorResponse
      });

      await expect(client.deleteUser('test-user-123')).rejects.toThrow(
        'Failed to delete user: 404'
      );
    });

    it('should handle network errors', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      await expect(client.deleteUser('test-user-123')).rejects.toThrow(
        'Network error while deleting user'
      );
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
      expect(client.verifyWebhookSignature(validPayload, 'v1=signature')).toBe(false);
    });

    it('should return false if timestamp is too old', () => {
      // Mock current time to be more than 15 minutes after the timestamp
      jest.spyOn(Date, 'now').mockReturnValue((1609459200 + 901) * 1000);
      
      expect(client.verifyWebhookSignature(validPayload, 't=1609459200,v1=valid-signature')).toBe(false);
    });

    it('should verify signature correctly for object payload', () => {
      const result = client.verifyWebhookSignature(validPayload, 't=1609459200,v1=valid-signature');
      
      expect(result).toBe(true);
      expect(mockCreateHmac.update).toHaveBeenCalledWith('1609459200.' + JSON.stringify(validPayload));
      expect(mockTimingSafeEqual).toHaveBeenCalled();
    });

    it('should verify signature correctly for string payload', () => {
      const stringPayload = JSON.stringify(validPayload);
      const result = client.verifyWebhookSignature(stringPayload, 't=1609459200,v1=valid-signature');
      
      expect(result).toBe(true);
      expect(mockCreateHmac.update).toHaveBeenCalledWith('1609459200.' + stringPayload);
    });

    it('should return false for invalid signature', () => {
      mockTimingSafeEqual.mockReturnValue(false);
      
      const result = client.verifyWebhookSignature(validPayload, 't=1609459200,v1=invalid-signature');
      
      expect(result).toBe(false);
    });

    it('should handle errors gracefully', () => {
      jest.spyOn(crypto, 'createHmac').mockImplementation(() => {
        throw new Error('Crypto error');
      });
      
      const result = client.verifyWebhookSignature(validPayload, 't=1609459200,v1=signature');
      
      expect(result).toBe(false);
    });
  });
}); 