import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config();

const app = express();
const PORT = process.env.API_PORT || 3001;

app.use(cors());
app.use(express.json());

// Serve static files from public directory
app.use(express.static(join(__dirname, '../public')));

const IMAGES_FILE = join(__dirname, '../src/lib/monster-images.json');
const IMAGES_DIR = join(__dirname, '../public/images/monsters');

// Ensure images directory exists
if (!existsSync(IMAGES_DIR)) {
  mkdirSync(IMAGES_DIR, { recursive: true });
}

// Track in-progress generation requests to prevent duplicates
const pendingRequests = new Map();

// Normalize monster name for matching
function normalizeMonsterName(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// Sanitize monster name for use as filename
function sanitizeFilename(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '-')
    .trim();
}

// Save base64 image directly to file
function saveBase64Image(base64Data, monsterName, extension = 'png') {
  try {
    // Remove data URL prefix if present (e.g., "data:image/png;base64,")
    const base64 = base64Data.replace(/^data:image\/\w+;base64,/, '');
    
    // Create filename from monster name
    const filename = `${sanitizeFilename(monsterName)}.${extension}`;
    const filepath = join(IMAGES_DIR, filename);
    
    // Decode base64 and write to file
    const buffer = Buffer.from(base64, 'base64');
    writeFileSync(filepath, buffer);
    
    // Return the local path (relative to public directory for serving)
    const localPath = `/images/monsters/${filename}`;
    console.log(`Saved base64 image to ${filepath}, serving as ${localPath}`);
    
    return localPath;
  } catch (error) {
    console.error('Error saving base64 image:', error);
    throw error;
  }
}

// Download image from URL and save it locally
async function downloadAndSaveImage(imageUrl, monsterName) {
  try {
    // Validate URL
    if (!imageUrl || typeof imageUrl !== 'string') {
      throw new Error(`Invalid image URL: ${imageUrl}`);
    }

    if (!imageUrl.startsWith('http://') && !imageUrl.startsWith('https://')) {
      throw new Error(`Invalid image URL format: ${imageUrl}`);
    }

    // Fetch the image
    const response = await fetch(imageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; MonsterCardImageProxy/1.0)',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
    }

    const contentType = response.headers.get('content-type') || 'image/png';
    const extension = contentType.includes('png') ? 'png' : contentType.includes('jpeg') || contentType.includes('jpg') ? 'jpg' : 'png';
    
    // Create filename from monster name
    const filename = `${sanitizeFilename(monsterName)}.${extension}`;
    const filepath = join(IMAGES_DIR, filename);
    
    // Get image buffer
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    // Write to file
    writeFileSync(filepath, buffer);
    
    // Return the local path (relative to public directory for serving)
    const localPath = `/images/monsters/${filename}`;
    console.log(`Saved image to ${filepath}, serving as ${localPath}`);
    
    return localPath;
  } catch (error) {
    console.error('Error downloading and saving image:', error);
    throw error;
  }
}

// Sanitize monster name for OpenAI prompt (remove potentially problematic terms)
function sanitizeMonsterNameForPrompt(name) {
  // Remove titles/suffixes that might trigger safety system, but keep the base creature name
  let sanitized = name
    .replace(/\s+/g, ' ') // Normalize spaces
    .trim();
  
  // If we removed everything or result is too short, use the original
  if (!sanitized || sanitized.length < 3) {
    sanitized = name;
  }
  
  return sanitized;
}

// Load current image map
function loadImageMap() {
  try {
    const content = readFileSync(IMAGES_FILE, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    console.error('Error loading image map:', error);
    return {};
  }
}

// Save image map
function saveImageMap(imageMap) {
  try {
    writeFileSync(IMAGES_FILE, JSON.stringify(imageMap, null, 2), 'utf-8');
    return true;
  } catch (error) {
    console.error('Error saving image map:', error);
    return false;
  }
}

// Generate image using OpenAI
async function generateMonsterImage(monsterName) {
  const apiKey = process.env.OPENAI_API_KEY;
  
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not set in environment variables');
  }

  // Sanitize the monster name for the prompt
  const sanitizedName = sanitizeMonsterNameForPrompt(monsterName);
  console.log(`Original name: "${monsterName}", Sanitized for prompt: "${sanitizedName}"`);

  // Prompt optimized for vertical portrait orientation to fit the card's top section
  const prompt = `Illustration semi‑réaliste d'un ${sanitizedName}, portrait vertical en pied : la créature est entièrement visible de la tête aux pieds, dans une pose dynamique, et remplit la hauteur de l'image. La lumière est douce et elle projette une ombre subtile sur un fond blanc uni. AUCUN texte, AUCUNE palette de couleurs, AUCUNE bordure, logo ou élément graphique supplémentaire : uniquement la créature sur fond blanc. Utiliser des couleurs naturelles et un rendu détaillé, sans décor ni ornement.`;

  try {
    const response = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-image-1-mini',
        prompt: prompt,
        n: 1,
        size: '1024x1536', // Vertical portrait format (approximately 2:3.5 ratio) to match card dimensions
        quality: 'auto',
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Failed to generate image');
    }

    const data = await response.json();
    
    // Validate response structure
    if (!data || !data.data || !Array.isArray(data.data) || data.data.length === 0) {
      console.error('Invalid API response structure:', JSON.stringify(data, null, 2));
      throw new Error('Invalid response from OpenAI API: missing image data');
    }
    
    const imageData = data.data[0];
    
    // Handle base64 encoded image (for models like gpt-image-1-mini)
    if (imageData.b64_json) {
      const outputFormat = data.output_format || 'png';
      const extension = outputFormat === 'png' ? 'png' : 'jpg';
      // We'll save it later when we have the monster name, so return the base64 data
      return { type: 'base64', data: imageData.b64_json, extension };
    }
    
    // Handle URL response (for DALL-E models)
    const imageUrl = imageData.url;
    if (!imageUrl) {
      console.error('No URL or base64 data in API response:', JSON.stringify(data, null, 2));
      throw new Error('No image URL or base64 data returned from OpenAI API');
    }
    
    return { type: 'url', url: imageUrl };
  } catch (error) {
    console.error('OpenAI API error:', error);
    throw error;
  }
}

// API endpoint to generate and save monster image
app.post('/api/generate-monster-image', async (req, res) => {
  try {
    const { monsterName } = req.body;

    if (!monsterName) {
      return res.status(400).json({ error: 'monsterName is required' });
    }

    // Check if image already exists
    const imageMap = loadImageMap();
    const normalizedName = normalizeMonsterName(monsterName);
    
    // Try variations to see if image exists
    const variations = [
      normalizedName,
      normalizedName.replace(/^the /, ''),
      normalizedName.endsWith('s') ? normalizedName.slice(0, -1) : normalizedName + 's',
    ];

    for (const variation of variations) {
      if (imageMap[variation]) {
        return res.json({ 
          url: imageMap[variation],
          cached: true 
        });
      }
    }

    // Check if there's already a pending request for this monster
    if (pendingRequests.has(normalizedName)) {
      console.log(`Request already in progress for: ${monsterName}, waiting for existing request...`);
      // Wait for the existing request to complete
      try {
        const imageUrl = await pendingRequests.get(normalizedName);
        return res.json({ 
          url: imageUrl,
          cached: false 
        });
      } catch (error) {
        // If the pending request failed, continue to generate a new one
        pendingRequests.delete(normalizedName);
      }
    }

    // Create a promise for this request and store it
    const generationPromise = (async () => {
      try {
        console.log(`Generating image for: ${monsterName} (normalized: ${normalizedName})`);
        const imageResult = await generateMonsterImage(monsterName);

        // Validate imageResult
        if (!imageResult) {
          throw new Error('Failed to generate image: no data returned from OpenAI API');
        }

        let localPath;
        
        // Handle base64 encoded image
        if (imageResult.type === 'base64') {
          console.log(`Saving base64 image for ${monsterName}...`);
          localPath = saveBase64Image(imageResult.data, normalizedName, imageResult.extension);
        } 
        // Handle URL response
        else if (imageResult.type === 'url') {
          // Download and save image locally
          console.log(`Downloading image from ${imageResult.url}...`);
          localPath = await downloadAndSaveImage(imageResult.url, normalizedName);
        } else {
          throw new Error('Unknown image result type from OpenAI API');
        }

        // Save local path to JSON file
        imageMap[normalizedName] = localPath;
        if (saveImageMap(imageMap)) {
          console.log(`Saved image path for ${monsterName} to database`);
        }

        return localPath;
      } finally {
        // Remove from pending requests when done
        pendingRequests.delete(normalizedName);
      }
    })();

    // Store the promise so other requests can wait for it
    pendingRequests.set(normalizedName, generationPromise);

    // Wait for generation and respond
    const imageUrl = await generationPromise;

    res.json({ 
      url: imageUrl,
      cached: false 
    });
  } catch (error) {
    console.error('Error generating monster image:', error);
    const normalizedName = normalizeMonsterName(req.body.monsterName || '');
    pendingRequests.delete(normalizedName); // Clean up on error
    res.status(500).json({ 
      error: error.message || 'Failed to generate monster image' 
    });
  }
});

// API endpoint to regenerate monster image (always generates new, doesn't check cache)
app.post('/api/regenerate-monster-image', async (req, res) => {
  try {
    const { monsterName } = req.body;

    if (!monsterName) {
      return res.status(400).json({ error: 'monsterName is required' });
    }

    const normalizedName = normalizeMonsterName(monsterName);
    
    // Check if there's already a pending regeneration request for this monster
    const regenerateKey = `regenerate:${normalizedName}`;
    if (pendingRequests.has(regenerateKey)) {
      console.log(`Regeneration already in progress for: ${monsterName}, waiting for existing request...`);
      // Wait for the existing request to complete
      try {
        const imageUrl = await pendingRequests.get(regenerateKey);
        return res.json({ 
          url: imageUrl,
          cached: false 
        });
      } catch (error) {
        // If the pending request failed, continue to generate a new one
        pendingRequests.delete(regenerateKey);
      }
    }

    // Create a promise for this request and store it
    const regenerationPromise = (async () => {
      try {
        // Always generate a new image (don't check cache)
        console.log(`Regenerating image for: ${monsterName} (normalized: ${normalizedName})`);
        const imageResult = await generateMonsterImage(monsterName);
        
        // Validate imageResult
        if (!imageResult) {
          throw new Error('Failed to regenerate image: no data returned from OpenAI API');
        }
        
        let localPath;
        
        // Handle base64 encoded image
        if (imageResult.type === 'base64') {
          console.log(`Saving base64 regenerated image for ${monsterName}...`);
          localPath = saveBase64Image(imageResult.data, normalizedName, imageResult.extension);
        } 
        // Handle URL response
        else if (imageResult.type === 'url') {
          // Download and save image locally (will overwrite existing)
          console.log(`Downloading regenerated image from ${imageResult.url}...`);
          localPath = await downloadAndSaveImage(imageResult.url, normalizedName);
        } else {
          throw new Error('Unknown image result type from OpenAI API');
        }
        
        return localPath;
      } finally {
        // Remove from pending requests when done
        pendingRequests.delete(regenerateKey);
      }
    })();

    // Store the promise so other requests can wait for it
    pendingRequests.set(regenerateKey, regenerationPromise);

    // Wait for generation and respond
    const imageUrl = await regenerationPromise;

    res.json({ 
      url: imageUrl,
      cached: false 
    });
  } catch (error) {
    console.error('Error regenerating monster image:', error);
    const normalizedName = normalizeMonsterName(req.body.monsterName || '');
    const regenerateKey = `regenerate:${normalizedName}`;
    pendingRequests.delete(regenerateKey); // Clean up on error
    res.status(500).json({ 
      error: error.message || 'Failed to regenerate monster image' 
    });
  }
});

// API endpoint to save monster image (for regenerated images)
app.post('/api/save-monster-image', async (req, res) => {
  try {
    const { monsterName, imageUrl } = req.body;

    if (!monsterName || !imageUrl) {
      return res.status(400).json({ error: 'monsterName and imageUrl are required' });
    }

    const imageMap = loadImageMap();
    const normalizedName = normalizeMonsterName(monsterName);
    
    let localPath = imageUrl;
    
    // If it's an external URL, download and save it locally
    if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
      console.log(`Downloading image from external URL: ${imageUrl}`);
      localPath = await downloadAndSaveImage(imageUrl, normalizedName);
    }
    
    // Save the local path to JSON
    imageMap[normalizedName] = localPath;
    
    if (saveImageMap(imageMap)) {
      console.log(`Saved image for ${monsterName} (${normalizedName}) to database`);
      return res.json({ success: true, path: localPath });
    } else {
      return res.status(500).json({ error: 'Failed to save image map' });
    }
  } catch (error) {
    console.error('Error saving monster image:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to save monster image' 
    });
  }
});

// Proxy endpoint for images (legacy - now images are local, but keep for backward compatibility)
app.get('/api/proxy-image', async (req, res) => {
  try {
    const { url } = req.query;

    if (!url) {
      return res.status(400).json({ error: 'url parameter is required' });
    }

    const imageUrl = decodeURIComponent(url);
    
    // If it's already a local path, redirect to it
    if (imageUrl.startsWith('/images/')) {
      return res.redirect(imageUrl);
    }
    
    // Fetch the image (for backward compatibility with external URLs)
    const response = await fetch(imageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; MonsterCardImageProxy/1.0)',
      },
    });

    if (!response.ok) {
      return res.status(response.status).json({ error: 'Failed to fetch image' });
    }

    const contentType = response.headers.get('content-type') || 'image/jpeg';
    const imageBuffer = await response.arrayBuffer();

    // Set CORS headers to allow the frontend to use the image
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache for 1 day

    res.send(Buffer.from(imageBuffer));
  } catch (error) {
    console.error('Error proxying image:', error);
    res.status(500).json({ error: 'Failed to proxy image' });
  }
});

app.listen(PORT, () => {
  console.log(`API server running on http://localhost:${PORT}`);
});

