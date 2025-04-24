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
export declare class ContactsManagerClient {
    private apiKey;
    private apiSecret;
    private orgId;
    private defaultExpirationSeconds;
    /**
     * Create a new ContactsManagerClient
     *
     * @param config Client configuration
     */
    constructor(config: ContactsManagerConfig);
    /**
     * Generate a JWT token for a user
     *
     * @param params Token generation parameters
     * @returns Token response with the token and expiration date
     */
    generateToken(params: TokenParams): Promise<TokenResponse>;
}
export default ContactsManagerClient;
