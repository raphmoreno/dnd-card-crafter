import { Monster, MonsterSearchResult } from "@/types/monster";
import { apiUrl } from "./api-config";

const MONSTERS_CACHE_KEY = "dnd_monsters_cache";
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

interface MonstersCache {
  monsters: Monster[];
  timestamp: number;
}

/**
 * Search monsters from the worker API (which uses D1 database)
 * Falls back to localStorage cache if API is unavailable
 */
export async function searchMonsters(query: string): Promise<Monster[]> {
  try {
    // Try to fetch from worker API
    const apiBase = apiUrl('/api/monsters');
    const searchParam = query.trim() ? `?search=${encodeURIComponent(query)}&limit=500` : '?limit=500';
    const response = await fetch(`${apiBase}${searchParam}`, {
      signal: AbortSignal.timeout(30000),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch monsters: ${response.status} ${response.statusText}`);
    }
    
    const monsters: Monster[] = await response.json();
    
    // Cache the results
    if (monsters.length > 0) {
      saveMonstersToCache(monsters);
    }
    
    return monsters;
  } catch (error) {
    console.error("Error fetching from worker API, trying cache:", error);
    
    // Fallback to cache
    const cached = getCachedMonsters();
    if (cached) {
      // Filter cached results if there's a query
      if (query.trim()) {
        const queryLower = query.toLowerCase();
        return cached.filter(m => 
          m.name.toLowerCase().includes(queryLower) ||
          m.type?.toLowerCase().includes(queryLower) ||
          m.subtype?.toLowerCase().includes(queryLower)
        );
      }
      return cached;
    }
    
    // If no cache and API failed, throw the error
    throw error;
  }
}

/**
 * Get cached monsters from localStorage
 */
function getCachedMonsters(): Monster[] | null {
  try {
    const cached = localStorage.getItem(MONSTERS_CACHE_KEY);
    if (!cached) return null;
    
    const cache: MonstersCache = JSON.parse(cached);
    const now = Date.now();
    
    // Check if cache is still valid (within 24 hours)
    if (now - cache.timestamp < CACHE_DURATION) {
      return cache.monsters;
    }
    
    // Cache expired, remove it
    localStorage.removeItem(MONSTERS_CACHE_KEY);
    return null;
  } catch (error) {
    console.error("Error reading monsters cache:", error);
    return null;
  }
}

/**
 * Save monsters to localStorage cache
 */
function saveMonstersToCache(monsters: Monster[]): void {
  try {
    const cache: MonstersCache = {
      monsters,
      timestamp: Date.now(),
    };
    localStorage.setItem(MONSTERS_CACHE_KEY, JSON.stringify(cache));
  } catch (error) {
    console.error("Error saving monsters cache:", error);
    // If localStorage is full, try to clear old cache
    try {
      localStorage.removeItem(MONSTERS_CACHE_KEY);
      localStorage.setItem(MONSTERS_CACHE_KEY, JSON.stringify({
        monsters,
        timestamp: Date.now(),
      }));
    } catch (e) {
      console.error("Failed to save cache even after clearing:", e);
    }
  }
}

/**
 * Get a single monster by slug from the worker API
 */
export async function getMonster(slug: string): Promise<Monster> {
  try {
    const apiBase = apiUrl(`/api/monsters/${slug}`);
    const response = await fetch(apiBase, {
      signal: AbortSignal.timeout(30000),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch monster: ${response.status} ${response.statusText}`);
    }
    
    return response.json();
  } catch (error) {
    console.error("Error fetching monster from worker API:", error);
    throw error;
  }
}

export function getModifier(score: number): string {
  const mod = Math.floor((score - 10) / 2);
  return mod >= 0 ? `+${mod}` : `${mod}`;
}

export function formatSpeed(speed: Monster["speed"]): string {
  const parts: string[] = [];
  if (speed.walk) parts.push(`${speed.walk} ft.`);
  if (speed.fly) parts.push(`fly ${speed.fly} ft.`);
  if (speed.swim) parts.push(`swim ${speed.swim} ft.`);
  if (speed.burrow) parts.push(`burrow ${speed.burrow} ft.`);
  if (speed.climb) parts.push(`climb ${speed.climb} ft.`);
  return parts.join(", ") || "0 ft.";
}

export function formatSavingThrows(monster: Monster): string {
  const saves: string[] = [];
  if (monster.strength_save) saves.push(`Str ${monster.strength_save >= 0 ? "+" : ""}${monster.strength_save}`);
  if (monster.dexterity_save) saves.push(`Dex ${monster.dexterity_save >= 0 ? "+" : ""}${monster.dexterity_save}`);
  if (monster.constitution_save) saves.push(`Con ${monster.constitution_save >= 0 ? "+" : ""}${monster.constitution_save}`);
  if (monster.intelligence_save) saves.push(`Int ${monster.intelligence_save >= 0 ? "+" : ""}${monster.intelligence_save}`);
  if (monster.wisdom_save) saves.push(`Wis ${monster.wisdom_save >= 0 ? "+" : ""}${monster.wisdom_save}`);
  if (monster.charisma_save) saves.push(`Cha ${monster.charisma_save >= 0 ? "+" : ""}${monster.charisma_save}`);
  return saves.join(", ");
}

export function formatSkills(skills: Record<string, number>): string {
  return Object.entries(skills)
    .map(([skill, bonus]) => `${skill} ${bonus >= 0 ? "+" : ""}${bonus}`)
    .join(", ");
}
