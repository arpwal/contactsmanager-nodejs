import jwt from 'jsonwebtoken';
import { ContactsManagerClient } from './index';

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
          sub: 'test-user-id',
          iss: 'test-api-key',
          org: 'test-org-id',
          device: {},
        }),
        'test-api-secret'
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
        }),
        'test-api-secret'
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
          device: deviceInfo
        }),
        'test-api-secret'
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
}); 