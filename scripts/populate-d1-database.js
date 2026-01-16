/**
 * Script to populate D1 database with monsters from Open5e API
 * 
 * Prerequisites:
 *   1. Create the database: wrangler d1 create monsters-db
 *   2. Update wrangler.toml with the database_id from step 1
 *   3. Run schema: wrangler d1 execute monsters-db --file=./cloudflare/schema.sql --remote
 * 
 * Usage:
 *   node scripts/populate-d1-database.js
 * 
 * Or for local development:
 *   wrangler d1 execute monsters-db --file=./cloudflare/schema.sql --local
 *   node scripts/populate-d1-database.js --local
 */

const API_BASE = "https://api.open5e.com/v1";
const MAX_PAGES = 100; // Safety limit

// Helper to convert monster data to SQL insert format
function monsterToRow(monster) {
  return {
    slug: monster.slug || '',
    name: monster.name || '',
    size: monster.size || null,
    type: monster.type || null,
    subtype: monster.subtype || null,
    alignment: monster.alignment || null,
    armor_class: monster.armor_class || null,
    armor_desc: monster.armor_desc || null,
    hit_points: monster.hit_points || null,
    hit_dice: monster.hit_dice || null,
    speed_walk: monster.speed?.walk || null,
    speed_fly: monster.speed?.fly || null,
    speed_swim: monster.speed?.swim || null,
    speed_burrow: monster.speed?.burrow || null,
    speed_climb: monster.speed?.climb || null,
    strength: monster.strength || null,
    dexterity: monster.dexterity || null,
    constitution: monster.constitution || null,
    intelligence: monster.intelligence || null,
    wisdom: monster.wisdom || null,
    charisma: monster.charisma || null,
    strength_save: monster.strength_save || null,
    dexterity_save: monster.dexterity_save || null,
    constitution_save: monster.constitution_save || null,
    intelligence_save: monster.intelligence_save || null,
    wisdom_save: monster.wisdom_save || null,
    charisma_save: monster.charisma_save || null,
    perception: monster.perception || null,
    skills: monster.skills ? JSON.stringify(monster.skills) : null,
    damage_vulnerabilities: monster.damage_vulnerabilities || null,
    damage_resistances: monster.damage_resistances || null,
    damage_immunities: monster.damage_immunities || null,
    condition_immunities: monster.condition_immunities || null,
    senses: monster.senses || null,
    languages: monster.languages || null,
    challenge_rating: monster.challenge_rating || null,
    cr: monster.cr || null,
    actions: monster.actions ? JSON.stringify(monster.actions) : null,
    bonus_actions: monster.bonus_actions ? JSON.stringify(monster.bonus_actions) : null,
    reactions: monster.reactions ? JSON.stringify(monster.reactions) : null,
    legendary_desc: monster.legendary_desc || null,
    legendary_actions: monster.legendary_actions ? JSON.stringify(monster.legendary_actions) : null,
    special_abilities: monster.special_abilities ? JSON.stringify(monster.special_abilities) : null,
    spell_list: monster.spell_list ? JSON.stringify(monster.spell_list) : null,
    img_main: monster.img_main || null,
    document_slug: monster.document__slug || null,
    document_title: monster.document__title || null,
  };
}

// Fetch all monsters from Open5e
async function fetchAllMonsters() {
  const allMonsters = [];
  let nextUrl = `${API_BASE}/monsters/?limit=500`;
  let pageCount = 0;
  const visitedUrls = new Set();

  console.log('Starting to fetch monsters from Open5e...');

  while (nextUrl && pageCount < MAX_PAGES) {
    if (visitedUrls.has(nextUrl)) {
      console.warn('Detected loop in pagination, stopping');
      break;
    }
    visitedUrls.add(nextUrl);
    pageCount++;

    try {
      console.log(`Fetching page ${pageCount}...`);
      const response = await fetch(nextUrl, {
        signal: AbortSignal.timeout(30000),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      if (!data.results || data.results.length === 0) {
        console.log('No more results');
        break;
      }

      allMonsters.push(...data.results);
      console.log(`Fetched ${data.results.length} monsters (total: ${allMonsters.length})`);

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

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (error) {
      console.error(`Error fetching page ${pageCount}:`, error);
      break;
    }
  }

  console.log(`\nTotal monsters fetched: ${allMonsters.length}`);
  return allMonsters;
}

// Escape SQL string value
function escapeSqlString(value) {
  if (value === null || value === undefined) return 'NULL';
  if (typeof value === 'number') return value.toString();
  if (typeof value === 'boolean') return value ? '1' : '0';
  // Escape single quotes and wrap in quotes
  return `'${String(value).replace(/'/g, "''")}'`;
}

// Insert monsters into D1 using wrangler d1 execute
async function insertMonsters(monsters, isLocal = false) {
  console.log(`\nPreparing to insert ${monsters.length} monsters into D1...`);
  
  // Batch insert in chunks of 50 (smaller batches for reliability)
  const batchSize = 50;
  let inserted = 0;
  const fs = await import('fs/promises');
  const { execSync } = await import('child_process');
  const env = isLocal ? '--local' : '--remote';

  for (let i = 0; i < monsters.length; i += batchSize) {
    const batch = monsters.slice(i, i + batchSize);
    const sqlStatements = [];

    for (const monster of batch) {
      const row = monsterToRow(monster);
      
      // Build INSERT OR REPLACE statement with proper escaping
      const columns = Object.keys(row).join(', ');
      const values = Object.keys(row).map(key => escapeSqlString(row[key])).join(', ');
      
      const sql = `INSERT OR REPLACE INTO monsters (${columns}, updated_at) VALUES (${values}, unixepoch());`;
      sqlStatements.push(sql);
    }

    // Write SQL file for this batch
    const sqlContent = sqlStatements.join('\n');
    const tempFile = `./cloudflare/temp-batch-${Math.floor(i / batchSize)}.sql`;
    
    try {
      await fs.writeFile(tempFile, sqlContent);
      
      console.log(`Inserting batch ${Math.floor(i / batchSize) + 1} (${batch.length} monsters)...`);
      execSync(`wrangler d1 execute monsters-db ${env} --file=${tempFile}`, {
        stdio: 'inherit',
      });
      inserted += batch.length;
      console.log(`✓ Inserted ${inserted}/${monsters.length} monsters`);
    } catch (error) {
      console.error(`Error inserting batch ${Math.floor(i / batchSize) + 1}:`, error.message);
      // Continue with next batch
    } finally {
      // Clean up temp file
      try {
        await fs.unlink(tempFile);
      } catch (e) {
        // Ignore cleanup errors
      }
    }
  }

  // Update FTS index
  console.log('\nUpdating full-text search index...');
  const ftsUpdate = `DELETE FROM monsters_fts;
INSERT INTO monsters_fts(slug, name, type, subtype, alignment) 
  SELECT slug, name, type, subtype, alignment FROM monsters;`;
  
  const ftsFile = './cloudflare/temp-fts-update.sql';
  
  try {
    await fs.writeFile(ftsFile, ftsUpdate);
    execSync(`wrangler d1 execute monsters-db ${env} --file=${ftsFile}`, {
      stdio: 'inherit',
    });
    console.log('✓ FTS index updated');
  } catch (error) {
    console.error('Error updating FTS index:', error.message);
  } finally {
    try {
      await fs.unlink(ftsFile);
    } catch (e) {
      // Ignore cleanup errors
    }
  }

  console.log(`\n✓ Successfully inserted ${inserted} monsters into D1 database`);
}

// Main function
async function main() {
  const args = process.argv.slice(2);
  const isLocal = args.includes('--local');

  try {
    console.log('=== D1 Monster Database Population Script ===\n');
    console.log(`Mode: ${isLocal ? 'LOCAL' : 'REMOTE'}\n`);

    // Fetch all monsters
    const monsters = await fetchAllMonsters();

    if (monsters.length === 0) {
      console.error('No monsters fetched. Exiting.');
      process.exit(1);
    }

    // Insert into D1
    await insertMonsters(monsters, isLocal);

    console.log('\n=== Done ===');
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

main();

