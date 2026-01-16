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
  console.log('[API Config] import.meta.env keys:', Object.keys(import.meta.env));
  console.log('[API Config] import.meta.env.MODE:', import.meta.env.MODE);
  console.log('[API Config] import.meta.env.PROD:', import.meta.env.PROD);
  
  // In production with Cloudflare, use the environment variable
  if (apiUrl && typeof apiUrl === 'string' && apiUrl.trim() !== '') {
    // Ensure it doesn't end with a slash
    const cleanUrl = apiUrl.trim().endsWith('/') ? apiUrl.trim().slice(0, -1) : apiUrl.trim();
    console.log('[API Config] Using API URL:', cleanUrl);
    return cleanUrl;
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

