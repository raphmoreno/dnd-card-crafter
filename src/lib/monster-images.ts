/**
 * Utility functions for looking up monster images
 */

import monsterImageMapStatic from './monster-images.json';

// Runtime cache that gets updated when new images are saved
// This overrides the static import which is cached at build time
let runtimeImageCache: Record<string, string> = { ...monsterImageMapStatic };
let cacheInitialized = false;

/**
 * Initialize or update the runtime cache
 * This should be called when images are saved or loaded
 */
export function updateImageCache(newImageMap?: Record<string, string>) {
  if (newImageMap) {
    runtimeImageCache = { ...newImageMap };
  } else {
    // Reload from the static import (which might have changed in dev mode with HMR)
    // IMPORTANT: Merge with existing runtime cache to preserve runtime additions
    // This prevents losing images that were added during the session
    runtimeImageCache = { ...monsterImageMapStatic, ...runtimeImageCache };
  }
  cacheInitialized = true;
}

/**
 * Get the current image cache (for debugging or inspection)
 */
export function getImageCache(): Record<string, string> {
  return { ...runtimeImageCache };
}

/**
 * Add an image to the runtime cache
 */
export function addImageToCache(monsterName: string, imageUrl: string) {
  const normalized = normalizeMonsterName(monsterName);
  runtimeImageCache[normalized] = imageUrl;
}

// Normalize monster name for matching (same logic as scraping script)
function normalizeMonsterName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '') // Remove special characters
    .replace(/\s+/g, ' ')         // Normalize whitespace
    .trim();
}

// Try multiple variations of the monster name to find a matching image
function findImageVariations(monsterName: string): string[] {
  const normalized = normalizeMonsterName(monsterName);
  const variations: string[] = [normalized];
  
  // Add variations:
  // - Remove common prefixes/suffixes
  // - Handle plural/singular
  // - Handle compound names
  
  // Remove "the" prefix
  if (normalized.startsWith('the ')) {
    variations.push(normalized.substring(4));
  }
  
  // Handle plural/singular
  if (normalized.endsWith('s') && normalized.length > 3) {
    variations.push(normalized.slice(0, -1)); // Remove 's'
  } else if (!normalized.endsWith('s')) {
    variations.push(normalized + 's'); // Add 's'
  }
  
  // Handle compound names (e.g., "fire elemental" -> "elemental")
  const words = normalized.split(' ');
  if (words.length > 1) {
    variations.push(words[words.length - 1]); // Last word
    variations.push(words.slice(1).join(' ')); // All but first word
  }
  
  // Handle specific patterns
  // "young [color] dragon" -> "[color] dragon"
  const dragonMatch = normalized.match(/young\s+(red|blue|green|black|white|brass|bronze|copper|silver|gold|shadow)\s+dragon/);
  if (dragonMatch) {
    variations.push(`${dragonMatch[1]} dragon`);
  }
  
  // "ancient [color] dragon" -> "[color] dragon"
  const ancientDragonMatch = normalized.match(/ancient\s+(red|blue|green|black|white|brass|bronze|copper|silver|gold|shadow)\s+dragon/);
  if (ancientDragonMatch) {
    variations.push(`${ancientDragonMatch[1]} dragon`);
  }
  
  // "adult [color] dragon" -> "[color] dragon"
  const adultDragonMatch = normalized.match(/adult\s+(red|blue|green|black|white|brass|bronze|copper|silver|gold|shadow)\s+dragon/);
  if (adultDragonMatch) {
    variations.push(`${adultDragonMatch[1]} dragon`);
  }
  
  return [...new Set(variations)]; // Remove duplicates
}

/**
 * Get the image URL for a monster by name
 * @param monsterName - The name of the monster
 * @returns The image URL if found, null otherwise
 */
export function getMonsterImageUrl(monsterName: string): string | null {
  if (!monsterName) return null;
  
  // Initialize cache on first use if not already done
  if (!cacheInitialized) {
    updateImageCache();
  }
  
  const variations = findImageVariations(monsterName);
  
  // Try each variation in the runtime cache
  for (const variation of variations) {
    if (runtimeImageCache[variation]) {
      return runtimeImageCache[variation];
    }
  }
  return null;
}

/**
 * Check if an image exists for a monster
 */
export function hasMonsterImage(monsterName: string): boolean {
  return getMonsterImageUrl(monsterName) !== null;
}

/**
 * Get or generate monster image URL (async)
 * Tries to find existing image first, then generates if not found
 */
export async function getOrGenerateMonsterImage(monsterName: string): Promise<string | null> {
  // First, try to get existing image
  const existingUrl = getMonsterImageUrl(monsterName);
  if (existingUrl) {
    return existingUrl;
  }

  // If not found, try to generate new image (this will save to database)
  try {
    const { generateMonsterImageWithCache } = await import('./monster-images-api');
    const generatedUrl = await generateMonsterImageWithCache(monsterName);
    
    // Return null if generation failed or server is unavailable (no error thrown)
    return generatedUrl;
  } catch (error) {
    // Only log if it's a real error (not just server unavailable)
    if (error instanceof Error && !error.message.includes('server')) {
      console.error('Failed to generate monster image:', error);
    }
    return null;
  }
}

