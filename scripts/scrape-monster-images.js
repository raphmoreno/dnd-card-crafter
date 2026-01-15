#!/usr/bin/env node

/**
 * Script to scrape monster images from Forgotten Realms Wiki
 * Generates a JSON mapping of monster names to image URLs
 */

import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import https from 'https';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const WIKI_URL = 'https://forgottenrealms.fandom.com/wiki/Category:Images_from_Monster_Manual_5th_edition';
const OUTPUT_FILE = join(__dirname, '../src/lib/monster-images.json');

// Helper to make HTTPS requests
function fetch(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const requestOptions = {
      hostname: urlObj.hostname,
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; MonsterImageScraper/1.0)',
        ...options.headers
      },
      rejectUnauthorized: false // Accept self-signed certificates for development
    };

    const req = https.request(requestOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        resolve({
          ok: res.statusCode >= 200 && res.statusCode < 300,
          status: res.statusCode,
          json: () => Promise.resolve(JSON.parse(data)),
          text: () => Promise.resolve(data)
        });
      });
    });

    req.on('error', reject);
    req.end();
  });
}

// Normalize monster name for matching (lowercase, remove special chars, handle variants)
function normalizeMonsterName(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '') // Remove special characters
    .replace(/\s+/g, ' ')         // Normalize whitespace
    .trim();
}

// Extract monster name from image filename
function extractMonsterName(filename) {
  // Remove file extension
  let name = filename.replace(/\.(jpg|jpeg|png|gif|webp)$/i, '');
  
  // Remove common prefixes/suffixes
  name = name
    .replace(/^monster manual 5e[_-]/i, '')
    .replace(/^mm5e[_-]/i, '')
    .replace(/[_-]5e$/i, '')
    .replace(/[_-]mm$/i, '')
    .replace(/^file:/i, '')
    .trim();
  
  // Handle compound names like "Demon, Balor" -> "Balor"
  if (name.includes(',')) {
    const parts = name.split(',');
    name = parts[parts.length - 1].trim();
  }
  
  // Handle specific patterns
  name = name.replace(/^demon[_\s]+/i, '');
  name = name.replace(/^devil[_\s]+/i, '');
  name = name.replace(/^dragon[_\s]+(black|blue|brass|bronze|copper|gold|green|red|silver|white|shadow)[_\s]*/i, (match, color) => {
    return `${color} dragon`;
  });
  
  return name;
}

async function scrapeMonsterImages() {
  try {
    console.log('Fetching wiki page...');
    const response = await fetch(WIKI_URL);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch wiki page: ${response.status}`);
    }
    
    const html = await response.text();
    
    // Extract image URLs from the HTML
    // Images are in links like: <a href="/wiki/File:Monster-5e.jpg" class="image">
    const imageRegex = /<a[^>]+href="\/wiki\/File:([^"]+)"[^>]*class="[^"]*image[^"]*"[^>]*>/gi;
    const matches = [...html.matchAll(imageRegex)];
    
    console.log(`Found ${matches.length} image links`);
    
    // Extract filenames and build image URLs
    const imageMap = {};
    const processedFilenames = new Set();
    
    for (const match of matches) {
      const filename = decodeURIComponent(match[1]);
      
      // Skip duplicates
      if (processedFilenames.has(filename.toLowerCase())) {
        continue;
      }
      processedFilenames.add(filename.toLowerCase());
      
      // Extract monster name from filename
      const monsterName = extractMonsterName(filename);
      const normalizedName = normalizeMonsterName(monsterName);
      
      // Build image URL (will be updated with API call)
      const imageUrl = `https://forgottenrealms.fandom.com/wiki/Special:FilePath/${encodeURIComponent(filename)}`;
      
      // Store multiple variations of the name for better matching
      if (normalizedName && normalizedName.length > 1) {
        if (!imageMap[normalizedName]) {
          imageMap[normalizedName] = [];
        }
        imageMap[normalizedName].push({
          url: imageUrl,
          filename: filename,
          originalName: monsterName
        });
      }
    }
    
    // Use MediaWiki API for more reliable image URLs
    console.log('Fetching image URLs from MediaWiki API...');
    const categoryMembers = await fetch(
      `https://forgottenrealms.fandom.com/api.php?action=query&list=categorymembers&cmtitle=Category:Images_from_Monster_Manual_5th_edition&cmlimit=500&format=json`
    );
    
    if (categoryMembers.ok) {
      const categoryData = await categoryMembers.json();
      const pages = categoryData.query?.categorymembers || [];
      
      // Get image URLs for each file
      const fileTitles = pages
        .filter(p => p.title.startsWith('File:'))
        .map(p => p.title);
      
      console.log(`Found ${fileTitles.length} files in category`);
      
      // Process in batches to avoid URL length limits
      const batchSize = 50;
      for (let i = 0; i < fileTitles.length; i += batchSize) {
        const batch = fileTitles.slice(i, i + batchSize);
        const titlesParam = batch.map(t => encodeURIComponent(t)).join('|');
        
        console.log(`Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(fileTitles.length / batchSize)}...`);
        
        const imageInfoResponse = await fetch(
          `https://forgottenrealms.fandom.com/api.php?action=query&titles=${titlesParam}&prop=imageinfo&iiprop=url&format=json`
        );
        
        if (imageInfoResponse.ok) {
          const imageInfoData = await imageInfoResponse.json();
          const pages = imageInfoData.query?.pages || {};
          
          for (const pageId in pages) {
            const page = pages[pageId];
            const filename = page.title.replace(/^File:/, '');
            const imageUrl = page.imageinfo?.[0]?.url;
            
            if (imageUrl) {
              const monsterName = extractMonsterName(filename);
              const normalizedName = normalizeMonsterName(monsterName);
              
              if (normalizedName && normalizedName.length > 1) {
                if (!imageMap[normalizedName]) {
                  imageMap[normalizedName] = [];
                }
                // Use API URL if we have it (it's more reliable)
                const existing = imageMap[normalizedName].find(img => img.filename === filename);
                if (existing) {
                  existing.url = imageUrl;
                } else {
                  imageMap[normalizedName].push({
                    url: imageUrl,
                    filename: filename,
                    originalName: monsterName
                  });
                }
              }
            }
          }
        }
        
        // Small delay to be respectful
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }
    
    // Clean up: remove duplicates, keep best URL
    const cleanedMap = {};
    for (const [name, images] of Object.entries(imageMap)) {
      // Deduplicate by filename
      const uniqueImages = [];
      const seenFilenames = new Set();
      
      for (const img of images) {
        const key = img.filename.toLowerCase();
        if (!seenFilenames.has(key)) {
          seenFilenames.add(key);
          uniqueImages.push(img);
        }
      }
      
      // Prefer URLs that look more reliable (not Special:FilePath redirects)
      uniqueImages.sort((a, b) => {
        const aScore = a.url.includes('static.wikia') || a.url.includes('vignette.wikia') ? 1 : 0;
        const bScore = b.url.includes('static.wikia') || b.url.includes('vignette.wikia') ? 1 : 0;
        return bScore - aScore;
      });
      
      if (uniqueImages.length > 0) {
        cleanedMap[name] = uniqueImages[0].url; // Use best image
      }
    }
    
    console.log(`Generated mapping for ${Object.keys(cleanedMap).length} monsters`);
    
    // Write to file
    writeFileSync(OUTPUT_FILE, JSON.stringify(cleanedMap, null, 2), 'utf-8');
    console.log(`✅ Monster image mapping saved to ${OUTPUT_FILE}`);
    
  } catch (error) {
    console.error('Error scraping monster images:', error);
    process.exit(1);
  }
}

scrapeMonsterImages();
