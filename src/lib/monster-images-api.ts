/**
 * API functions for generating and fetching monster images
 */

/**
 * Check if the API server is available
 */
async function isApiServerAvailable(): Promise<boolean> {
  try {
    // Try a simple health check - if we can't connect, server is down
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1000); // 1 second timeout
    
    await fetch('/api/generate-monster-image', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ monsterName: 'test' }),
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Generate a monster image using OpenAI API (checks cache first, saves if new)
 * @param monsterName - The name of the monster
 * @returns Promise resolving to the image URL
 */
export async function generateMonsterImageWithCache(monsterName: string): Promise<string | null> {
  try {
    const response = await fetch('/api/generate-monster-image', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ monsterName }),
    });

    if (!response.ok) {
      // If it's a connection error, return null instead of throwing
      if (response.status === 0 || response.status >= 500) {
        console.warn('API server appears to be unavailable. Start it with: npm run dev:api');
        return null;
      }
      
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(error.error || 'Failed to generate image');
    }

    const data = await response.json();
    return data.url;
  } catch (error) {
    // Handle network/connection errors gracefully
    if (error instanceof TypeError && error.message.includes('fetch')) {
      console.warn('API server is not running. Start it with: npm run dev:api');
      return null;
    }
    
    console.error('Error generating monster image:', error);
    throw error;
  }
}

/**
 * Generate a monster image using OpenAI API (regenerate without checking cache, doesn't save)
 * @param monsterName - The name of the monster
 * @returns Promise resolving to the image URL
 */
export async function generateMonsterImage(monsterName: string): Promise<string> {
  try {
    const response = await fetch('/api/regenerate-monster-image', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ monsterName }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(error.error || 'Failed to generate image');
    }

    const data = await response.json();
    return data.url;
  } catch (error) {
    console.error('Error generating monster image:', error);
    throw error;
  }
}

