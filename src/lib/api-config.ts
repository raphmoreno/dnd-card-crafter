/**
 * API Configuration
 * Handles API base URL for both local development and Cloudflare Workers deployment
 */

/**
 * Get the API base URL
 * Uses VITE_API_URL environment variable if set, otherwise defaults to relative path
 */
export function getApiBaseUrl(): string {
  // In production with Cloudflare, use the environment variable
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  
  // In development or when no env var is set, use relative paths (works with proxy)
  return '';
}

/**
 * Build a full API URL
 */
export function apiUrl(path: string): string {
  const baseUrl = getApiBaseUrl();
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${baseUrl}${cleanPath}`;
}

