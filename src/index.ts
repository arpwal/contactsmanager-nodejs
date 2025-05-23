import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { ServerAPI, ServerAPIError, UserInfo, DeviceInfo, CreateUserResponse, DeleteUserResponse, CMUser } from './server-api';

/**
 * Interface for ContactsManagerClient configuration
 */
export interface ContactsManagerConfig {
  apiKey: string;
  apiSecret: string;
  orgId: string;
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
  private defaultExpirationSeconds = 86400; // 24 hours

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
      user_id: userId,
      api_key: this.apiKey,
      org_id: this.orgId,
      device: deviceInfo,
      jti: crypto.randomUUID(),
      iat: now,
      exp: expiresAt
    };

    try {
      const token = jwt.sign(payload, this.apiSecret, { algorithm: 'HS256' });
      
      return {
        token,
        expiresAt: new Date(expiresAt * 1000)
      };
    } catch (error) {
      throw new Error(`Failed to generate token: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Create or update a user on the server and return a token with user information
   * 
   * This method first generates a token for authentication, then calls the server API
   * to create or update the user.
   * 
   * @param userInfo User information (required)
   * @param deviceInfo Optional device information
   * @param expirySeconds Token validity in seconds (default: 24 hours)
   * @returns Promise with response data containing token and user information
   */
  public async createUser(
    userInfo: UserInfo,
    deviceInfo?: DeviceInfo,
    expirySeconds: number = 86400
  ): Promise<CreateUserResponse> {
    if (!userInfo || typeof userInfo !== 'object') {
      throw new Error('userInfo is required and must be a UserInfo object');
    }

    // Extract uid from userInfo
    const uid = userInfo.userId;

    // Generate a token for authentication
    const tokenData = await this.generateToken({
      userId: uid,
      deviceInfo,
      expirationSeconds: expirySeconds,
    });

    // Create server API client with the generated token
    const serverApi = new ServerAPI(tokenData.token);

    // Call the server API to create/update the user
    return serverApi.createUser(uid, userInfo, deviceInfo, expirySeconds);
  }

  /**
   * Delete a user from the server
   * 
   * This method first generates a token for authentication, then calls the server API
   * to delete the user.
   * 
   * @param uid Unique user identifier
   * @returns Promise with response data containing deletion confirmation
   */
  public async deleteUser(uid: string): Promise<DeleteUserResponse> {
    if (!uid || typeof uid !== 'string') {
      throw new Error('User ID is required and must be a string');
    }

    // Generate a token for authentication
    const tokenData = await this.generateToken({ userId: uid });

    // Create server API client with the generated token
    const serverApi = new ServerAPI(tokenData.token);

    // Call the server API to delete the user
    return serverApi.deleteUser(uid);
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

// Export types and classes
export {
  ServerAPI,
  ServerAPIError,
  UserInfo,
  DeviceInfo,
  CreateUserResponse,
  DeleteUserResponse,
  CMUser,
};

// Export default and named exports
export default ContactsManagerClient; 