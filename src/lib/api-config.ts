/**
 * API Configuration
 * Handles API base URL for both local development and Cloudflare Workers deployment
 */

/**
 * Get the API base URL
 * Uses VITE_API_URL environment variable if set, otherwise defaults to relative path
 */
export function getApiBaseUrl(): string {
  // Debug: Log the environment variable (remove in production if needed)
  const apiUrl = import.meta.env.VITE_API_URL;
  console.log('[API Config] VITE_API_URL:', apiUrl || '(not set)');
  console.log('[API Config] All env vars:', Object.keys(import.meta.env).filter(k => k.startsWith('VITE_')));
  
  // In production with Cloudflare, use the environment variable
  if (apiUrl) {
    // Ensure it doesn't end with a slash
    return apiUrl.endsWith('/') ? apiUrl.slice(0, -1) : apiUrl;
  }
  
  // In development or when no env var is set, use relative paths (works with proxy)
  console.warn('[API Config] VITE_API_URL not set, using relative paths');
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

