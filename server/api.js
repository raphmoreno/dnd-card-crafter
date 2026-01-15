import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { trackEvent, getAnalyticsSummary, getEvents } from './analytics.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config();

const app = express();
const PORT = process.env.API_PORT || 3001;
const NODE_ENV = process.env.NODE_ENV || 'development';

// CORS configuration
const corsOptions = {
  origin: NODE_ENV === 'production' 
    ? process.env.FRONTEND_URL || 'http://localhost:8080'
    : '*',
  credentials: true,
};
app.use(cors(corsOptions));
app.use(express.json());

// Request logging middleware (production)
if (NODE_ENV === 'production') {
  app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
  });
}

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

// Generate enhanced description for image generation
function buildImageDescription(monsterData) {
  const parts = [];
  
  // Add name
  parts.push(monsterData.name);
  
  // Add size and type/subtype
  const typeDesc = [monsterData.size, monsterData.type];
  if (monsterData.subtype) {
    typeDesc.push(`(${monsterData.subtype})`);
  }
  parts.push(typeDesc.join(' '));
  
  // Build a short description from key features
  const features = [];
  
  // Add special abilities that might be visually distinctive
  if (monsterData.special_abilities && monsterData.special_abilities.length > 0) {
    const visualAbilities = monsterData.special_abilities
      .filter(a => a.name && a.desc)
      .slice(0, 2) // Take first 2 special abilities
      .map(a => a.name.toLowerCase());
    if (visualAbilities.length > 0) {
      features.push(...visualAbilities);
    }
  }
  
  // Add actions that might be visually distinctive (like breath weapons, etc.)
  if (monsterData.actions && monsterData.actions.length > 0) {
    const visualActions = monsterData.actions
      .filter(a => a.name && a.desc)
      .slice(0, 2) // Take first 2 actions
      .map(a => {
        const name = a.name.toLowerCase();
        // Extract key visual elements from description
        if (a.desc.toLowerCase().includes('breath') || a.desc.toLowerCase().includes('fire')) {
          return 'fire-breathing';
        }
        if (a.desc.toLowerCase().includes('wings') || a.desc.toLowerCase().includes('fly')) {
          return 'winged';
        }
        return name;
      });
    features.push(...visualActions);
  }
  
  // Build final description
  let description = parts.join(', ');
  if (features.length > 0) {
    // Remove duplicates and join
    const uniqueFeatures = [...new Set(features)];
    description += `, ${uniqueFeatures.slice(0, 3).join(', ')}`;
  }
  
  return description;
}

// Generate image using OpenAI
async function generateMonsterImage(monsterName, additionalContext = null) {
  const apiKey = process.env.OPENAI_API_KEY;
  
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not set in environment variables');
  }

  // Build the prompt
  let creatureDescription;
  if (additionalContext) {
    // Use enhanced description from context
    creatureDescription = buildImageDescription(additionalContext);
    console.log(`Enhanced description: "${creatureDescription}"`);
  } else {
    // Fall back to just name
    const sanitizedName = sanitizeMonsterNameForPrompt(monsterName);
    creatureDescription = sanitizedName;
    console.log(`Original name: "${monsterName}", Sanitized for prompt: "${creatureDescription}"`);
  }

  // Prompt optimized for vertical portrait orientation to fit the card's top section
  const prompt = `Illustration semi‑réaliste d'un ${creatureDescription}, portrait vertical : la créature est entièrement visible, dans une pose dynamique, et remplit la hauteur de l'image. La lumière est douce et elle projette une ombre subtile sur un fond blanc uni. AUCUN texte, AUCUNE palette de couleurs, AUCUNE bordure, logo ou élément graphique supplémentaire : uniquement la créature sur fond blanc. Utiliser des couleurs naturelles et un rendu détaillé, sans décor ni ornement.`;

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

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    environment: NODE_ENV 
  });
});

// Analytics endpoints
app.post('/api/analytics/track', (req, res) => {
  try {
    const { eventType, metadata } = req.body;
    
    if (!eventType) {
      return res.status(400).json({ error: 'eventType is required' });
    }

    const validEventTypes = ['search', 'monster_added', 'pdf_download', 'image_regeneration'];
    if (!validEventTypes.includes(eventType)) {
      return res.status(400).json({ error: `Invalid eventType. Must be one of: ${validEventTypes.join(', ')}` });
    }

    trackEvent(eventType, metadata || {});
    res.json({ success: true });
  } catch (error) {
    console.error('Error tracking event:', error);
    res.status(500).json({ error: 'Failed to track event' });
  }
});

app.get('/api/analytics/summary', (req, res) => {
  try {
    const days = parseInt(req.query.days || '30', 10);
    const summary = getAnalyticsSummary(days);
    res.json(summary);
  } catch (error) {
    console.error('Error getting analytics summary:', error);
    res.status(500).json({ error: 'Failed to get analytics summary' });
  }
});

app.get('/api/analytics/events', (req, res) => {
  try {
    const limit = parseInt(req.query.limit || '100', 10);
    const eventType = req.query.eventType || null;
    const events = getEvents(limit, eventType);
    res.json({ events });
  } catch (error) {
    console.error('Error getting events:', error);
    res.status(500).json({ error: 'Failed to get events' });
  }
});

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

    // Track regeneration attempt
    trackEvent('image_regeneration', { monsterName });

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

// API endpoint to generate card via AI
app.post('/api/generate-card', async (req, res) => {
  try {
    const { description, cardType } = req.body;

    if (!description || !cardType) {
      return res.status(400).json({ error: 'description and cardType are required' });
    }

    if (cardType !== 'monster' && cardType !== 'npc') {
      return res.status(400).json({ error: 'cardType must be either "monster" or "npc"' });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'OPENAI_API_KEY is not set in environment variables' });
    }

    // Create prompt for GPT-4o mini to generate Monster JSON
    const systemPrompt = cardType === 'monster'
      ? `You are a D&D 5e expert. Generate a complete monster stat block as JSON based on the user's description. Return ONLY valid JSON matching this exact structure (all fields required):
{
  "name": "string",
  "size": "Tiny|Small|Medium|Large|Huge|Gargantuan",
  "type": "string (e.g., beast, humanoid, dragon)",
  "subtype": "string (optional, can be empty)",
  "alignment": "lawful good|neutral good|chaotic good|lawful neutral|neutral|chaotic neutral|lawful evil|neutral evil|chaotic evil|unaligned",
  "armor_class": number,
  "armor_desc": "string (can be empty)",
  "hit_points": number,
  "hit_dice": "string (e.g., 5d8+10)",
  "challenge_rating": "string (e.g., 2, 1/2, 1/4)",
  "cr": number,
  "strength": number (1-30),
  "dexterity": number (1-30),
  "constitution": number (1-30),
  "intelligence": number (1-30),
  "wisdom": number (1-30),
  "charisma": number (1-30),
  "speed": {
    "walk": number (optional),
    "fly": number (optional),
    "swim": number (optional),
    "burrow": number (optional),
    "climb": number (optional)
  },
  "languages": "string",
  "senses": "string (e.g., darkvision 60 ft., passive Perception 14)",
  "damage_resistances": "string (can be empty)",
  "damage_immunities": "string (can be empty)",
  "damage_vulnerabilities": "string (can be empty)",
  "condition_immunities": "string (can be empty)",
  "actions": [
    {
      "name": "string",
      "desc": "string"
    }
  ],
  "special_abilities": [
    {
      "name": "string",
      "desc": "string"
    }
  ]
}

Make it interesting and balanced for the specified CR. Include at least 1-2 actions and 0-2 special abilities.`
      : `You are a D&D 5e expert. Generate a complete NPC stat block as JSON based on the user's description. NPCs are typically humanoid creatures with class levels or NPC stat blocks. Return ONLY valid JSON matching this exact structure (all fields required):
{
  "name": "string",
  "size": "Tiny|Small|Medium|Large|Huge|Gargantuan (usually Medium for NPCs)",
  "type": "humanoid",
  "subtype": "string (race, e.g., human, elf, dragonborn)",
  "alignment": "lawful good|neutral good|chaotic good|lawful neutral|neutral|chaotic neutral|lawful evil|neutral evil|chaotic evil|unaligned",
  "armor_class": number,
  "armor_desc": "string (can be empty)",
  "hit_points": number,
  "hit_dice": "string (e.g., 3d8+3 for level 3)",
  "challenge_rating": "string (e.g., 1, 1/2, based on level)",
  "cr": number,
  "strength": number (1-30),
  "dexterity": number (1-30),
  "constitution": number (1-30),
  "intelligence": number (1-30),
  "wisdom": number (1-30),
  "charisma": number (1-30),
  "speed": {
    "walk": number (usually 30 for humanoids)
  },
  "languages": "string",
  "senses": "string (e.g., passive Perception 12)",
  "damage_resistances": "string (can be empty)",
  "damage_immunities": "string (can be empty)",
  "damage_vulnerabilities": "string (can be empty)",
  "condition_immunities": "string (can be empty)",
  "actions": [
    {
      "name": "string",
      "desc": "string"
    }
  ],
  "special_abilities": [
    {
      "name": "string",
      "desc": "string"
    }
  ]
}

Make it appropriate for the described character. Include class features as special abilities if mentioned. Include at least 1-2 actions.`;

    const userPrompt = `Create a ${cardType} stat block for: ${description}`;

    // Call GPT-4o mini to generate the monster JSON
    console.log(`Generating ${cardType} card for: ${description}`);
    const chatResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.7,
      }),
    });

    if (!chatResponse.ok) {
      const error = await chatResponse.json();
      throw new Error(error.error?.message || 'Failed to generate card data');
    }

    const chatData = await chatResponse.json();
    const content = chatData.choices[0]?.message?.content;
    
    if (!content) {
      throw new Error('No content returned from GPT');
    }

    // Parse the JSON response
    let monsterData;
    try {
      monsterData = JSON.parse(content);
    } catch (parseError) {
      console.error('Failed to parse GPT response:', content);
      throw new Error('Invalid JSON returned from AI');
    }

    // Validate required fields
    if (!monsterData.name) {
      throw new Error('Generated monster data missing required field: name');
    }

    // Generate image based on the monster name with enhanced context
    let imageDataUrl = null;
    try {
      const imageResult = await generateMonsterImage(monsterData.name, monsterData);
      
      if (imageResult) {
        // Convert to data URL for frontend (don't save to database)
        if (imageResult.type === 'base64') {
          const mimeType = imageResult.extension === 'png' ? 'image/png' : 'image/jpeg';
          imageDataUrl = `data:${mimeType};base64,${imageResult.data}`;
        } else if (imageResult.type === 'url') {
          // Download the image and convert to base64 data URL
          try {
            const imageResponse = await fetch(imageResult.url, {
              headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; MonsterCardImageProxy/1.0)',
              },
            });
            
            if (imageResponse.ok) {
              const arrayBuffer = await imageResponse.arrayBuffer();
              const buffer = Buffer.from(arrayBuffer);
              const base64 = buffer.toString('base64');
              const contentType = imageResponse.headers.get('content-type') || 'image/png';
              imageDataUrl = `data:${contentType};base64,${base64}`;
            } else {
              console.warn('Failed to download image from URL:', imageResult.url);
            }
          } catch (downloadError) {
            console.error('Error downloading image:', downloadError);
            // Fall back to URL if download fails
            imageDataUrl = imageResult.url;
          }
        }
      }
    } catch (imageError) {
      console.error('Failed to generate image (non-fatal):', imageError);
      // Don't fail the whole request if image generation fails
    }

    // Return the monster data and image
    res.json({
      monster: monsterData,
      image: imageDataUrl,
    });
  } catch (error) {
    console.error('Error generating card:', error);
    res.status(500).json({
      error: error.message || 'Failed to generate card',
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

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ 
    error: NODE_ENV === 'production' 
      ? 'Internal server error' 
      : err.message 
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

app.listen(PORT, () => {
  console.log(`API server running on http://localhost:${PORT}`);
  console.log(`Environment: ${NODE_ENV}`);
});

