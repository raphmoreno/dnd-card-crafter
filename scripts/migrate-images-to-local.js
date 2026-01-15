/**
 * Migration script to download existing external URLs and save them locally
 * This converts the monster-images.json from external URLs to local paths
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const IMAGES_FILE = join(__dirname, '../src/lib/monster-images.json');
const IMAGES_DIR = join(__dirname, '../public/images/monsters');

// Normalize monster name for filename
function sanitizeFilename(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '-')
    .trim();
}

// Download image from URL and save it locally
async function downloadAndSaveImage(imageUrl, monsterName) {
  try {
    console.log(`Downloading ${monsterName} from ${imageUrl}...`);
    
    // Fetch the image
    const response = await fetch(imageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; MonsterCardImageMigrator/1.0)',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch: ${response.status} ${response.statusText}`);
    }

    const contentType = response.headers.get('content-type') || 'image/png';
    const extension = contentType.includes('png') ? 'png' 
                     : contentType.includes('jpeg') || contentType.includes('jpg') ? 'jpg' 
                     : 'png';
    
    // Create filename from monster name
    const filename = `${sanitizeFilename(monsterName)}.${extension}`;
    const filepath = join(IMAGES_DIR, filename);
    
    // Get image buffer
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    // Write to file
    writeFileSync(filepath, buffer);
    
    // Return the local path
    const localPath = `/images/monsters/${filename}`;
    console.log(`✓ Saved ${monsterName} to ${localPath}`);
    
    return localPath;
  } catch (error) {
    console.error(`✗ Failed to download ${monsterName}:`, error.message);
    return null;
  }
}

async function migrate() {
  console.log('Loading image map...');
  const imageMap = JSON.parse(readFileSync(IMAGES_FILE, 'utf-8'));
  
  const entries = Object.entries(imageMap);
  console.log(`Found ${entries.length} images to check...\n`);
  
  let migrated = 0;
  let skipped = 0;
  let failed = 0;
  
  for (const [monsterName, imageUrl] of entries) {
    // Skip if already a local path
    if (imageUrl && typeof imageUrl === 'string' && imageUrl.startsWith('/images/')) {
      console.log(`⏭  Skipping ${monsterName} (already local)`);
      skipped++;
      continue;
    }
    
    // Skip if not a URL
    if (!imageUrl || typeof imageUrl !== 'string' || (!imageUrl.startsWith('http://') && !imageUrl.startsWith('https://'))) {
      console.log(`⏭  Skipping ${monsterName} (not a URL)`);
      skipped++;
      continue;
    }
    
    // Download and save
    const localPath = await downloadAndSaveImage(imageUrl, monsterName);
    
    if (localPath) {
      imageMap[monsterName] = localPath;
      migrated++;
      
      // Save after each successful migration (in case of interruption)
      writeFileSync(IMAGES_FILE, JSON.stringify(imageMap, null, 2), 'utf-8');
      
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    } else {
      failed++;
    }
  }
  
  console.log(`\n✅ Migration complete!`);
  console.log(`   Migrated: ${migrated}`);
  console.log(`   Skipped: ${skipped}`);
  console.log(`   Failed: ${failed}`);
}

migrate().catch(console.error);


