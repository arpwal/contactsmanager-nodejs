/**
 * Server API implementation for ContactsManager SDK
 */

import { getServerEndpoint } from './server-config';

/**
 * Interface for user information
 */
export interface UserInfo {
  userId: string; // Required field
  fullName: string; // Required field, cannot be empty
  email?: string;
  phone?: string;
  avatarUrl?: string;
  metadata?: Record<string, any>;
}

/**
 * Interface for device information
 */
export interface DeviceInfo {
  deviceType?: string;
  os?: string;
  appVersion?: string;
  locale?: string;
  timezone?: string;
  [key: string]: any;
}

/**
 * Interface for ContactsManager User (user-facing representation of canonical organization contact)
 */
export interface CMUser {
  id: string;
  organizationId: string;
  organizationUserId?: string;
  email?: string;
  phone?: string;
  fullName?: string;
  avatarUrl?: string;
  contactMetadata?: Record<string, any>;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Interface for create user response
 */
export interface CreateUserResponse {
  status: string;
  data: {
    token: {
      token: string;
      expires_at: number;
    };
    user: CMUser;
    created: boolean;
  };
}

/**
 * Interface for delete user response
 */
export interface DeleteUserResponse {
  status: string;
  message: string;
  data: {
    deleted_contact_id: string;
  };
}

/**
 * Validate UserInfo object
 */
function validateUserInfo(userInfo: UserInfo): void {
  // Validate userId
  if (!userInfo.userId || typeof userInfo.userId !== 'string' || !userInfo.userId.trim()) {
    throw new Error('userId is required and must be a non-empty string');
  }

  // Validate fullName
  if (!userInfo.fullName || typeof userInfo.fullName !== 'string' || !userInfo.fullName.trim()) {
    throw new Error('fullName is required and must be a non-empty string');
  }

  // Validate that at least one of email or phone is provided
  if (!userInfo.email && !userInfo.phone) {
    throw new Error('At least one of email or phone must be provided');
  }

  // Validate email format if provided
  if (userInfo.email && typeof userInfo.email !== 'string') {
    throw new Error('email must be a string');
  }

  // Validate phone format if provided
  if (userInfo.phone && typeof userInfo.phone !== 'string') {
    throw new Error('phone must be a string');
  }
}

/**
 * Custom error class for server API errors
 */
export class ServerAPIError extends Error {
  public statusCode?: number;
  public responseData?: any;

  constructor(message: string, statusCode?: number, responseData?: any) {
    super(message);
    this.name = 'ServerAPIError';
    this.statusCode = statusCode;
    this.responseData = responseData;
  }
}

/**
 * Server API client for making requests to ContactsManager server endpoints
 */
export class ServerAPI {
  private token: string;
  private headers: Record<string, string>;

  /**
   * Initialize the server API client
   * 
   * @param token JWT token for authentication
   */
  constructor(token: string) {
    this.token = token;
    this.headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  }

  /**
   * Create or update a user on the server
   * 
   * @param uid Unique user identifier
   * @param userInfo User information (required)
   * @param deviceInfo Optional device information
   * @param expirySeconds Token validity in seconds (default: 24 hours)
   * @returns Promise with response data containing token and user information
   */
  async createUser(
    uid: string,
    userInfo: UserInfo,
    deviceInfo?: DeviceInfo,
    expirySeconds: number = 86400
  ): Promise<CreateUserResponse> {
    // Validate userInfo
    validateUserInfo(userInfo);

    const url = getServerEndpoint('createUser', { uid });
    
    const payload: any = {
      expiry_seconds: expirySeconds,
      user_info: userInfo,
    };
    
    if (deviceInfo) {
      payload.device_info = deviceInfo;
    }

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        return await response.json();
      } else {
        let errorData;
        try {
          errorData = await response.json();
        } catch {
          // Ignore JSON parsing errors
        }

        throw new ServerAPIError(
          `Failed to create user: ${response.status}`,
          response.status,
          errorData
        );
      }
    } catch (error) {
      if (error instanceof ServerAPIError) {
        throw error;
      }
      throw new ServerAPIError(`Network error while creating user: ${error}`);
    }
  }

  /**
   * Delete a user from the server
   * 
   * @param uid Unique user identifier
   * @returns Promise with response data containing deletion confirmation
   */
  async deleteUser(uid: string): Promise<DeleteUserResponse> {
    const url = getServerEndpoint('deleteUser', { uid });

    try {
      const response = await fetch(url, {
        method: 'DELETE',
        headers: this.headers,
      });

      if (response.ok) {
        return await response.json();
      } else {
        let errorData;
        try {
          errorData = await response.json();
        } catch {
          // Ignore JSON parsing errors
        }

        throw new ServerAPIError(
          `Failed to delete user: ${response.status}`,
          response.status,
          errorData
        );
      }
    } catch (error) {
      if (error instanceof ServerAPIError) {
        throw error;
      }
      throw new ServerAPIError(`Network error while deleting user: ${error}`);
    }
  }
} 