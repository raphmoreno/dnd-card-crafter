import { Monster, MonsterSearchResult } from "@/types/monster";

const API_BASE = "https://api.open5e.com/v1";

export async function searchMonsters(query: string): Promise<Monster[]> {
  if (!query.trim()) return [];
  
  const response = await fetch(
    `${API_BASE}/monsters/?search=${encodeURIComponent(query)}&limit=20`
  );
  
  if (!response.ok) {
    throw new Error("Failed to fetch monsters");
  }
  
  const data: MonsterSearchResult = await response.json();
  return data.results;
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
