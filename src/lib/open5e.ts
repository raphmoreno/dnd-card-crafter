import { Monster, MonsterSearchResult } from "@/types/monster";

const API_BASE = "https://api.open5e.com/v1";
const MONSTERS_CACHE_KEY = "dnd_monsters_cache";
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

interface MonstersCache {
  monsters: Monster[];
  timestamp: number;
}

export async function searchMonsters(query: string): Promise<Monster[]> {
  // If query is empty, fetch all monsters with pagination
  if (!query.trim()) {
    return getAllMonsters();
  }
  
  const response = await fetch(
    `${API_BASE}/monsters/?search=${encodeURIComponent(query)}&limit=500`
  );
  
  if (!response.ok) {
    throw new Error("Failed to fetch monsters");
  }
  
  const data: MonsterSearchResult = await response.json();
  return data.results;
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
 * Fetch remaining monsters in the background and update cache
 */
async function fetchRemainingMonstersInBackground(startUrl: string): Promise<void> {
  const allMonsters: Monster[] = [];
  let nextUrl: string | null = startUrl;
  const visitedUrls = new Set<string>();
  let pageCount = 0;
  const maxPages = 50;
  
  try {
    while (nextUrl && pageCount < maxPages) {
      if (visitedUrls.has(nextUrl)) {
        console.warn("Detected loop in pagination, stopping");
        break;
      }
      visitedUrls.add(nextUrl);
      pageCount++;
      
      const response = await fetch(nextUrl, {
        signal: AbortSignal.timeout(30000),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch monsters: ${response.status} ${response.statusText}`);
      }
      
      const data: MonsterSearchResult = await response.json();
      
      if (!data.results || data.results.length === 0) {
        break;
      }
      
      allMonsters.push(...data.results);
      
      if (data.next) {
        if (data.next.startsWith('http')) {
          nextUrl = data.next;
        } else if (data.next.startsWith('/')) {
          nextUrl = `https://api.open5e.com${data.next}`;
        } else {
          nextUrl = `${API_BASE}/${data.next}`;
        }
      } else {
        nextUrl = null;
      }
      
      if (allMonsters.length > 10000) {
        console.warn("Reached safety limit of 10000 monsters");
        break;
      }
    }
    
    if (allMonsters.length > 0) {
      // Get existing cache and merge
      const existingCache = getCachedMonsters() || [];
      const combined = [...existingCache, ...allMonsters];
      const sorted = combined.sort((a, b) => a.name.localeCompare(b.name));
      saveMonstersToCache(sorted);
      console.log(`Background fetch complete: ${sorted.length} total monsters cached`);
    }
  } catch (error) {
    console.error("Error in background fetch:", error);
    // Silently fail - we already have the first page
  }
}

/**
 * Fetch all monsters from Open5e API with pagination
 * Returns first page immediately, loads rest in background
 */
async function getAllMonsters(): Promise<Monster[]> {
  // Check cache first
  const cached = getCachedMonsters();
  if (cached) {
    console.log(`Using cached monsters (${cached.length} monsters)`);
    return cached;
  }
  
  console.log("Fetching first page of monsters...");
  
  try {
    // Fetch first page immediately
    const firstPageUrl = `${API_BASE}/monsters/?limit=500`;
    const response = await fetch(firstPageUrl, {
      signal: AbortSignal.timeout(30000),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch monsters: ${response.status} ${response.statusText}`);
    }
    
    const data: MonsterSearchResult = await response.json();
    
    if (!data.results || data.results.length === 0) {
      console.warn("No monsters in first page");
      return [];
    }
    
    // Sort and return first page immediately
    const firstPageMonsters = data.results.sort((a, b) => a.name.localeCompare(b.name));
    console.log(`Returning first ${firstPageMonsters.length} monsters immediately`);
    
    // Cache first page immediately so it's available
    saveMonstersToCache(firstPageMonsters);
    
    // Start background fetch for remaining pages if there are more
    if (data.next) {
      let nextUrl: string;
      if (data.next.startsWith('http')) {
        nextUrl = data.next;
      } else if (data.next.startsWith('/')) {
        nextUrl = `https://api.open5e.com${data.next}`;
      } else {
        nextUrl = `${API_BASE}/${data.next}`;
      }
      
      // Fetch remaining pages in background (don't await)
      fetchRemainingMonstersInBackground(nextUrl).catch(err => {
        console.error("Background fetch failed:", err);
      });
    }
    
    return firstPageMonsters;
  } catch (error) {
    console.error("Error fetching first page of monsters:", error);
    return [];
  }
}

export async function getMonster(slug: string): Promise<Monster> {
  const response = await fetch(`${API_BASE}/monsters/${slug}/`);
  
  if (!response.ok) {
    throw new Error("Failed to fetch monster");
  }
  
  return response.json();
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
