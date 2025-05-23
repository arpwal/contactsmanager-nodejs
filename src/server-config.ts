/**
 * Server API configuration for ContactsManager SDK
 */

// Server API base URL
export const SERVER_BASE_URL = 'https://api.contactsmanager.io';

// Server API endpoints
export const SERVER_ENDPOINTS = {
  createUser: '/api/v1/server/users/{uid}',
  deleteUser: '/api/v1/server/users/{uid}',
} as const;

/**
 * Get the full server endpoint URL
 * 
 * @param endpointName Name of the endpoint from SERVER_ENDPOINTS
 * @param params URL parameters to format into the endpoint
 * @returns Full URL for the endpoint
 */
export function getServerEndpoint(
  endpointName: keyof typeof SERVER_ENDPOINTS,
  params: Record<string, string>
): string {
  const endpointPath: string = SERVER_ENDPOINTS[endpointName];
  
  // Replace URL parameters
  let formattedPath = endpointPath;
  for (const [key, value] of Object.entries(params)) {
    formattedPath = formattedPath.replace(`{${key}}`, value);
  }
  
  return `${SERVER_BASE_URL}${formattedPath}`;
} 