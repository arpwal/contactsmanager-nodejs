import jwt from 'jsonwebtoken';

/**
 * Interface for ContactsManagerClient configuration
 */
export interface ContactsManagerConfig {
  apiKey: string;
  apiSecret: string;
  orgId: string;
}

/**
 * Interface for device information
 */
export interface DeviceInfo {
  deviceType?: string;
  os?: string;
  appVersion?: string;
  [key: string]: any;
}

/**
 * Interface for token generation parameters
 */
export interface TokenParams {
  userId: string;
  deviceInfo?: DeviceInfo;
  expirationSeconds?: number;
}

/**
 * Interface for token response
 */
export interface TokenResponse {
  token: string;
  expiresAt: Date;
}

/**
 * ContactsManager Client for server-side token generation
 */
export class ContactsManagerClient {
  private apiKey: string;
  private apiSecret: string;
  private orgId: string;
  private defaultExpirationSeconds: number = 86400; // 24 hours

  /**
   * Create a new ContactsManagerClient
   * 
   * @param config Client configuration
   */
  constructor(config: ContactsManagerConfig) {
    this.apiKey = config.apiKey;
    this.apiSecret = config.apiSecret;
    this.orgId = config.orgId;

    // Validate configuration
    if (!this.apiKey || !this.apiSecret || !this.orgId) {
      throw new Error('Missing required configuration: apiKey, apiSecret, and orgId are required');
    }
  }

  /**
   * Generate a JWT token for a user
   * 
   * @param params Token generation parameters
   * @returns Token response with the token and expiration date
   */
  public async generateToken(params: TokenParams): Promise<TokenResponse> {
    const { userId, deviceInfo = {}, expirationSeconds = this.defaultExpirationSeconds } = params;

    if (!userId) {
      throw new Error('userId is required');
    }

    const now = Math.floor(Date.now() / 1000);
    const expiresAt = now + expirationSeconds;

    const payload = {
      sub: userId,
      iss: this.apiKey,
      org: this.orgId,
      device: deviceInfo,
      iat: now,
      exp: expiresAt
    };

    try {
      const token = jwt.sign(payload, this.apiSecret);
      
      return {
        token,
        expiresAt: new Date(expiresAt * 1000)
      };
    } catch (error) {
      throw new Error(`Failed to generate token: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

// Export default and named exports
export default ContactsManagerClient; 