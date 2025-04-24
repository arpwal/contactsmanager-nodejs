"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContactsManagerClient = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
/**
 * ContactsManager Client for server-side token generation
 */
class ContactsManagerClient {
    /**
     * Create a new ContactsManagerClient
     *
     * @param config Client configuration
     */
    constructor(config) {
        this.defaultExpirationSeconds = 86400; // 24 hours
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
    async generateToken(params) {
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
            const token = jsonwebtoken_1.default.sign(payload, this.apiSecret);
            return {
                token,
                expiresAt: new Date(expiresAt * 1000)
            };
        }
        catch (error) {
            throw new Error(`Failed to generate token: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
}
exports.ContactsManagerClient = ContactsManagerClient;
// Export default and named exports
exports.default = ContactsManagerClient;
