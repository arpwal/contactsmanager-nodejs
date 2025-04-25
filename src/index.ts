import jwt from 'jsonwebtoken';
import crypto from 'crypto';

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
  private webhookSecret: string | null = null;
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

  /**
   * Set the webhook secret for verifying webhook signatures
   * 
   * @param secret The webhook secret from your dashboard
   */
  public setWebhookSecret(secret: string): void {
    if (!secret || typeof secret !== 'string') {
      throw new Error('Webhook secret is required and must be a string');
    }
    this.webhookSecret = secret;
  }

  /**
   * Verify the signature of a webhook request
   * 
   * @param payload The request body (object or string)
   * @param signature The X-Webhook-Signature header value
   * @returns boolean indicating if signature is valid
   */
  public verifyWebhookSignature(payload: any, signature: string): boolean {
    if (!this.webhookSecret) {
      throw new Error('Webhook secret not set. Call setWebhookSecret() first.');
    }

    try {
      // Parse the signature header
      const components: Record<string, string> = {};
      signature.split(',').forEach(part => {
        const [key, value] = part.split('=');
        components[key] = value;
      });
      
      if (!components.t || !components.v1) {
        return false;
      }
      
      const timestamp = components.t;
      const providedSignature = components.v1;
      
      // Check if timestamp is not too old (15 minute window)
      const currentTime = Math.floor(Date.now() / 1000);
      if (currentTime - parseInt(timestamp) > 900) {
        return false;
      }
      
      // Convert payload to string if it's an object
      const payloadString = typeof payload === 'string' 
        ? payload 
        : JSON.stringify(payload);
      
      // Create the signature
      const signedPayload = `${timestamp}.${payloadString}`;
      const expectedSignature = crypto
        .createHmac('sha256', this.webhookSecret)
        .update(signedPayload)
        .digest('hex');
      
      // Compare signatures using constant-time comparison
      return crypto.timingSafeEqual(
        Buffer.from(providedSignature),
        Buffer.from(expectedSignature)
      );
    } catch (error) {
      console.error('Error verifying webhook signature:', error);
      return false;
    }
  }
}

// Export default and named exports
export default ContactsManagerClient; 