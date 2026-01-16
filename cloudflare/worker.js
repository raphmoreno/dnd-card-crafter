/**
 * Cloudflare Workers API for D&D Card Crafter
 * Uses R2 for image storage and KV for analytics
 */

// Track in-progress generation requests (ephemeral - resets on worker restart)
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

// Sanitize monster name for OpenAI prompt
function sanitizeMonsterNameForPrompt(name) {
  let sanitized = name
    .replace(/\s+/g, ' ')
    .trim();
  
  if (!sanitized || sanitized.length < 3) {
    sanitized = name;
  }
  
  return sanitized;
}

// Convert base64 to ArrayBuffer (Workers-compatible)
function base64ToArrayBuffer(base64) {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

// Save image to R2
async function saveImageToR2(r2Bucket, imageData, monsterName, extension = 'png') {
  const filename = `${sanitizeFilename(monsterName)}.${extension}`;
  const key = `monsters/${filename}`;
  
  let arrayBuffer;
  let contentType;
  
  if (typeof imageData === 'string') {
    // Base64 string
    const base64 = imageData.replace(/^data:image\/\w+;base64,/, '');
    arrayBuffer = base64ToArrayBuffer(base64);
    contentType = extension === 'png' ? 'image/png' : 'image/jpeg';
  } else {
    // Already an ArrayBuffer
    arrayBuffer = imageData;
    contentType = extension === 'png' ? 'image/png' : 'image/jpeg';
  }
  
  await r2Bucket.put(key, arrayBuffer, {
    httpMetadata: {
      contentType,
      cacheControl: 'public, max-age=31536000',
    },
  });
  
  return `/images/monsters/${filename}`;
}

// Download image from URL and save to R2
async function downloadAndSaveImage(r2Bucket, imageUrl, monsterName) {
  const response = await fetch(imageUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; MonsterCardImageProxy/1.0)',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
  }

  const contentType = response.headers.get('content-type') || 'image/png';
  const extension = contentType.includes('png') ? 'png' : 
                     contentType.includes('jpeg') || contentType.includes('jpg') ? 'jpg' : 'png';
  
  const arrayBuffer = await response.arrayBuffer();
  return await saveImageToR2(r2Bucket, arrayBuffer, monsterName, extension);
}

// Load image map from KV
async function loadImageMap(kv) {
  try {
    const data = await kv.get('monster-images', 'json');
    return data || {};
  } catch (error) {
    console.error('Error loading image map:', error);
    return {};
  }
}

// Save image map to KV
async function saveImageMap(kv, imageMap) {
  try {
    await kv.put('monster-images', JSON.stringify(imageMap));
    return true;
  } catch (error) {
    console.error('Error saving image map:', error);
    return false;
  }
}

// Generate image using OpenAI
async function generateMonsterImage(monsterName, env) {
  const apiKey = env.OPENAI_API_KEY;
  
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not set in environment variables');
  }

  const sanitizedName = sanitizeMonsterNameForPrompt(monsterName);
  const prompt = `Illustration semi‑réaliste d'un ${sanitizedName}, portrait vertical en pied : la créature est entièrement visible de la tête aux pieds, dans une pose dynamique, et remplit la hauteur de l'image. La lumière est douce et elle projette une ombre subtile sur un fond blanc uni. AUCUN texte, AUCUNE palette de couleurs, AUCUNE bordure, logo ou élément graphique supplémentaire : uniquement la créature sur fond blanc. Utiliser des couleurs naturelles et un rendu détaillé, sans décor ni ornement.`;

  const response = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'dall-e-3',
      prompt: prompt,
      n: 1,
      size: '1024x1024',
      quality: 'standard',
    }),
  });

  if (!response.ok) {
    // Check content type before parsing
    const contentType = response.headers.get('content-type') || '';
    let errorMessage = `Failed to generate image: ${response.status} ${response.statusText}`;
    
    if (contentType.includes('application/json')) {
      try {
        const error = await response.json();
        errorMessage = error.error?.message || error.message || errorMessage;
      } catch (e) {
        // If JSON parsing fails, use default message
        console.error('Failed to parse error response as JSON:', e);
      }
    } else {
      // Not JSON - might be HTML error page (Cloudflare error)
      const text = await response.text();
      console.error('Non-JSON error response:', text.substring(0, 200));
      
      // Check for Cloudflare errors
      if (text.includes('error code: 1015') || response.status === 1015) {
        errorMessage = 'Cloudflare rate limit: Too many requests. Please try again later.';
      } else if (response.status === 429) {
        errorMessage = 'OpenAI API rate limit exceeded. Please try again later.';
      } else if (response.status === 401) {
        errorMessage = 'OpenAI API authentication failed. Check API key.';
      }
    }
    
    throw new Error(errorMessage);
  }

  const data = await response.json();
  
  if (!data || !data.data || !Array.isArray(data.data) || data.data.length === 0) {
    throw new Error('Invalid response from OpenAI API: missing image data');
  }
  
  const imageData = data.data[0];
  
  // Handle base64 encoded image
  if (imageData.b64_json) {
    const outputFormat = data.output_format || 'png';
    const extension = outputFormat === 'png' ? 'png' : 'jpg';
    return { type: 'base64', data: imageData.b64_json, extension };
  }
  
  // Handle URL response
  const imageUrl = imageData.url;
  if (!imageUrl) {
    throw new Error('No image URL or base64 data returned from OpenAI API');
  }
  
  return { type: 'url', url: imageUrl };
}

// Analytics functions for KV
async function trackEvent(kv, eventType, metadata = {}) {
  const timestamp = new Date().toISOString();
  const today = new Date().toISOString().split('T')[0];
  
  // Load analytics
  let analytics = await kv.get('analytics', 'json') || {
    summary: {
      searches: 0,
      monstersAdded: 0,
      pdfDownloads: 0,
      imageRegenerations: 0,
      totalEvents: 0,
    },
    dailyStats: {},
    events: [],
  };
  
  // Create event
  const event = {
    type: eventType,
    timestamp,
    metadata,
  };
  
  // Add to events (keep last 10000)
  analytics.events.push(event);
  if (analytics.events.length > 10000) {
    analytics.events = analytics.events.slice(-10000);
  }
  
  // Update summary
  switch (eventType) {
    case 'search':
      analytics.summary.searches++;
      break;
    case 'monster_added':
      analytics.summary.monstersAdded++;
      break;
    case 'pdf_download':
      analytics.summary.pdfDownloads++;
      break;
    case 'image_regeneration':
      analytics.summary.imageRegenerations++;
      break;
  }
  analytics.summary.totalEvents++;
  
  // Update daily stats
  if (!analytics.dailyStats[today]) {
    analytics.dailyStats[today] = {
      searches: 0,
      monstersAdded: 0,
      pdfDownloads: 0,
      imageRegenerations: 0,
    };
  }
  switch (eventType) {
    case 'search':
      analytics.dailyStats[today].searches++;
      break;
    case 'monster_added':
      analytics.dailyStats[today].monstersAdded++;
      break;
    case 'pdf_download':
      analytics.dailyStats[today].pdfDownloads++;
      break;
    case 'image_regeneration':
      analytics.dailyStats[today].imageRegenerations++;
      break;
  }
  
  // Clean up old daily stats
  const dates = Object.keys(analytics.dailyStats).sort();
  if (dates.length > 365) {
    const toRemove = dates.slice(0, dates.length - 365);
    toRemove.forEach(date => delete analytics.dailyStats[date]);
  }
  
  analytics.lastUpdated = timestamp;
  
  // Save to KV
  await kv.put('analytics', JSON.stringify(analytics));
  return true;
}

async function getAnalyticsSummary(kv, days = 30) {
  const analytics = await kv.get('analytics', 'json') || {
    summary: { searches: 0, monstersAdded: 0, pdfDownloads: 0, imageRegenerations: 0, totalEvents: 0 },
    dailyStats: {},
    events: [],
  };
  
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);
  const cutoffString = cutoffDate.toISOString().split('T')[0];
  
  const recentDailyStats = Object.entries(analytics.dailyStats || {})
    .filter(([date]) => date >= cutoffString)
    .reduce((acc, [date, stats]) => {
      return {
        searches: acc.searches + (stats.searches || 0),
        monstersAdded: acc.monstersAdded + (stats.monstersAdded || 0),
        pdfDownloads: acc.pdfDownloads + (stats.pdfDownloads || 0),
        imageRegenerations: acc.imageRegenerations + (stats.imageRegenerations || 0),
      };
    }, { searches: 0, monstersAdded: 0, pdfDownloads: 0, imageRegenerations: 0 });
  
  return {
    allTime: analytics.summary,
    lastNDays: {
      days,
      ...recentDailyStats,
    },
    dailyStats: Object.entries(analytics.dailyStats || {})
      .filter(([date]) => date >= cutoffString)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, stats]) => ({ date, ...stats })),
    lastUpdated: analytics.lastUpdated || new Date().toISOString(),
  };
}

async function getEvents(kv, limit = 100, eventType = null) {
  const analytics = await kv.get('analytics', 'json') || { events: [] };
  let events = [...(analytics.events || [])].reverse();
  
  if (eventType) {
    events = events.filter(e => e.type === eventType);
  }
  
  return events.slice(0, limit);
}

// CORS headers
function corsHeaders(origin) {
  return {
    'Access-Control-Allow-Origin': origin || '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
  };
}

// Main worker handler
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const origin = request.headers.get('Origin') || '*';
    
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: corsHeaders(origin),
      });
    }
    
    // Health check
    if (url.pathname === '/api/health') {
      return new Response(JSON.stringify({
        status: 'ok',
        timestamp: new Date().toISOString(),
        environment: 'cloudflare-workers',
      }), {
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders(origin),
        },
      });
    }
    
    // Analytics endpoints
    if (url.pathname === '/api/analytics/track' && request.method === 'POST') {
      try {
        const body = await request.json();
        const { eventType, metadata } = body;
        
        if (!eventType) {
          return new Response(JSON.stringify({ error: 'eventType is required' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) },
          });
        }
        
        const validEventTypes = ['search', 'monster_added', 'pdf_download', 'image_regeneration'];
        if (!validEventTypes.includes(eventType)) {
          return new Response(JSON.stringify({ 
            error: `Invalid eventType. Must be one of: ${validEventTypes.join(', ')}` 
          }), {
            status: 400,
            headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) },
          });
        }
        
        await trackEvent(env.ANALYTICS_KV, eventType, metadata || {});
        return new Response(JSON.stringify({ success: true }), {
          headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) },
        });
      } catch (error) {
        console.error('Error tracking event:', error);
        return new Response(JSON.stringify({ error: 'Failed to track event' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) },
        });
      }
    }
    
    if (url.pathname === '/api/analytics/summary' && request.method === 'GET') {
      try {
        const days = parseInt(url.searchParams.get('days') || '30', 10);
        const summary = await getAnalyticsSummary(env.ANALYTICS_KV, days);
        return new Response(JSON.stringify(summary), {
          headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) },
        });
      } catch (error) {
        console.error('Error getting analytics summary:', error);
        return new Response(JSON.stringify({ error: 'Failed to get analytics summary' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) },
        });
      }
    }
    
    if (url.pathname === '/api/analytics/events' && request.method === 'GET') {
      try {
        const limit = parseInt(url.searchParams.get('limit') || '100', 10);
        const eventType = url.searchParams.get('eventType') || null;
        const events = await getEvents(env.ANALYTICS_KV, limit, eventType);
        return new Response(JSON.stringify({ events }), {
          headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) },
        });
      } catch (error) {
        console.error('Error getting events:', error);
        return new Response(JSON.stringify({ error: 'Failed to get events' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) },
        });
      }
    }
    
    // Generate monster image
    if (url.pathname === '/api/generate-monster-image' && request.method === 'POST') {
      try {
        const { monsterName } = await request.json();
        
        if (!monsterName) {
          return new Response(JSON.stringify({ error: 'monsterName is required' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) },
          });
        }
        
        const normalizedName = normalizeMonsterName(monsterName);
        const imageMap = await loadImageMap(env.ANALYTICS_KV);
        
        // Check if image exists
        const variations = [
          normalizedName,
          normalizedName.replace(/^the /, ''),
          normalizedName.endsWith('s') ? normalizedName.slice(0, -1) : normalizedName + 's',
        ];
        
        for (const variation of variations) {
          if (imageMap[variation]) {
            return new Response(JSON.stringify({ 
              url: imageMap[variation],
              cached: true 
            }), {
              headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) },
            });
          }
        }
        
        // Check pending requests
        if (pendingRequests.has(normalizedName)) {
          try {
            const imageUrl = await pendingRequests.get(normalizedName);
            return new Response(JSON.stringify({ 
              url: imageUrl,
              cached: false 
            }), {
              headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) },
            });
          } catch (error) {
            pendingRequests.delete(normalizedName);
          }
        }
        
        // Generate image
        const generationPromise = (async () => {
          try {
            const imageResult = await generateMonsterImage(monsterName, env);
            
            if (!imageResult) {
              throw new Error('Failed to generate image');
            }
            
            let localPath;
            
            if (imageResult.type === 'base64') {
              localPath = await saveImageToR2(
                env.IMAGES_R2,
                imageResult.data,
                normalizedName,
                imageResult.extension
              );
            } else if (imageResult.type === 'url') {
              localPath = await downloadAndSaveImage(
                env.IMAGES_R2,
                imageResult.url,
                normalizedName
              );
            } else {
              throw new Error('Unknown image result type');
            }
            
            // Save to image map
            imageMap[normalizedName] = localPath;
            await saveImageMap(env.ANALYTICS_KV, imageMap);
            
            return localPath;
          } finally {
            pendingRequests.delete(normalizedName);
          }
        })();
        
        pendingRequests.set(normalizedName, generationPromise);
        const imageUrl = await generationPromise;
        
        return new Response(JSON.stringify({ 
          url: imageUrl,
          cached: false 
        }), {
          headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) },
        });
      } catch (error) {
        console.error('Error generating monster image:', error);
        return new Response(JSON.stringify({ 
          error: error.message || 'Failed to generate monster image' 
        }), {
          status: 500,
          headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) },
        });
      }
    }
    
    // Regenerate monster image
    if (url.pathname === '/api/regenerate-monster-image' && request.method === 'POST') {
      try {
        const { monsterName } = await request.json();
        
        if (!monsterName) {
          return new Response(JSON.stringify({ error: 'monsterName is required' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) },
          });
        }
        
        const normalizedName = normalizeMonsterName(monsterName);
        const regenerateKey = `regenerate:${normalizedName}`;
        
        // Track regeneration
        await trackEvent(env.ANALYTICS_KV, 'image_regeneration', { monsterName });
        
        if (pendingRequests.has(regenerateKey)) {
          try {
            const imageUrl = await pendingRequests.get(regenerateKey);
            return new Response(JSON.stringify({ 
              url: imageUrl,
              cached: false 
            }), {
              headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) },
            });
          } catch (error) {
            pendingRequests.delete(regenerateKey);
          }
        }
        
        const regenerationPromise = (async () => {
          try {
            const imageResult = await generateMonsterImage(monsterName, env);
            
            if (!imageResult) {
              throw new Error('Failed to regenerate image');
            }
            
            let localPath;
            
            if (imageResult.type === 'base64') {
              localPath = await saveImageToR2(
                env.IMAGES_R2,
                imageResult.data,
                normalizedName,
                imageResult.extension
              );
            } else if (imageResult.type === 'url') {
              localPath = await downloadAndSaveImage(
                env.IMAGES_R2,
                imageResult.url,
                normalizedName
              );
            } else {
              throw new Error('Unknown image result type');
            }
            
            return localPath;
          } finally {
            pendingRequests.delete(regenerateKey);
          }
        })();
        
        pendingRequests.set(regenerateKey, regenerationPromise);
        const imageUrl = await regenerationPromise;
        
        return new Response(JSON.stringify({ 
          url: imageUrl,
          cached: false 
        }), {
          headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) },
        });
      } catch (error) {
        console.error('Error regenerating monster image:', error);
        return new Response(JSON.stringify({ 
          error: error.message || 'Failed to regenerate monster image' 
        }), {
          status: 500,
          headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) },
        });
      }
    }
    
    // Save monster image
    if (url.pathname === '/api/save-monster-image' && request.method === 'POST') {
      try {
        const { monsterName, imageUrl } = await request.json();
        
        if (!monsterName || !imageUrl) {
          return new Response(JSON.stringify({ error: 'monsterName and imageUrl are required' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) },
          });
        }
        
        const normalizedName = normalizeMonsterName(monsterName);
        const imageMap = await loadImageMap(env.ANALYTICS_KV);
        
        let localPath = imageUrl;
        
        if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
          localPath = await downloadAndSaveImage(env.IMAGES_R2, imageUrl, normalizedName);
        }
        
        imageMap[normalizedName] = localPath;
        await saveImageMap(env.ANALYTICS_KV, imageMap);
        
        return new Response(JSON.stringify({ success: true, path: localPath }), {
          headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) },
        });
      } catch (error) {
        console.error('Error saving monster image:', error);
        return new Response(JSON.stringify({ 
          error: error.message || 'Failed to save monster image' 
        }), {
          status: 500,
          headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) },
        });
      }
    }
    
    // Serve images from R2
    if (url.pathname.startsWith('/images/monsters/')) {
      const key = `monsters/${url.pathname.split('/images/monsters/')[1]}`;
      const object = await env.IMAGES_R2.get(key);
      
      if (!object) {
        return new Response('Image not found', { status: 404 });
      }
      
      const headers = new Headers();
      object.writeHttpMetadata(headers);
      headers.set('etag', object.httpEtag);
      headers.set('Cache-Control', 'public, max-age=31536000');
      
      return new Response(object.body, { headers });
    }
    
    // 404
    return new Response(JSON.stringify({ error: 'Not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) },
    });
  },
};

