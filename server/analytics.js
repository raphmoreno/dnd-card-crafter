import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const ANALYTICS_FILE = join(__dirname, '../data/analytics.json');

// Ensure data directory exists
const dataDir = join(__dirname, '../data');
if (!existsSync(dataDir)) {
  mkdirSync(dataDir, { recursive: true });
}

// Initialize analytics structure
function initializeAnalytics() {
  return {
    events: [],
    summary: {
      searches: 0,
      monstersAdded: 0,
      pdfDownloads: 0,
      imageRegenerations: 0,
      totalEvents: 0,
    },
    dailyStats: {}, // Format: { "2024-01-01": { searches: 10, ... } }
    lastUpdated: new Date().toISOString(),
  };
}

// Load analytics data
function loadAnalytics() {
  try {
    if (existsSync(ANALYTICS_FILE)) {
      const content = readFileSync(ANALYTICS_FILE, 'utf-8');
      return JSON.parse(content);
    }
  } catch (error) {
    console.error('Error loading analytics:', error);
  }
  return initializeAnalytics();
}

// Save analytics data
function saveAnalytics(analytics) {
  try {
    analytics.lastUpdated = new Date().toISOString();
    writeFileSync(ANALYTICS_FILE, JSON.stringify(analytics, null, 2), 'utf-8');
    return true;
  } catch (error) {
    console.error('Error saving analytics:', error);
    return false;
  }
}

// Get today's date string (YYYY-MM-DD)
function getTodayString() {
  return new Date().toISOString().split('T')[0];
}

// Track an event
export function trackEvent(eventType, metadata = {}) {
  const analytics = loadAnalytics();
  const timestamp = new Date().toISOString();
  const today = getTodayString();

  // Create event object
  const event = {
    type: eventType,
    timestamp,
    metadata,
  };

  // Add to events array (keep last 10000 events for detailed analysis)
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

  // Clean up old daily stats (keep last 365 days)
  const dates = Object.keys(analytics.dailyStats).sort();
  if (dates.length > 365) {
    const toRemove = dates.slice(0, dates.length - 365);
    toRemove.forEach(date => delete analytics.dailyStats[date]);
  }

  saveAnalytics(analytics);
  return true;
}

// Get analytics summary
export function getAnalyticsSummary(days = 30) {
  const analytics = loadAnalytics();
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);
  const cutoffString = cutoffDate.toISOString().split('T')[0];

  // Calculate stats for the last N days
  const recentDailyStats = Object.entries(analytics.dailyStats)
    .filter(([date]) => date >= cutoffString)
    .reduce((acc, [date, stats]) => {
      return {
        searches: acc.searches + stats.searches,
        monstersAdded: acc.monstersAdded + stats.monstersAdded,
        pdfDownloads: acc.pdfDownloads + stats.pdfDownloads,
        imageRegenerations: acc.imageRegenerations + stats.imageRegenerations,
      };
    }, { searches: 0, monstersAdded: 0, pdfDownloads: 0, imageRegenerations: 0 });

  return {
    allTime: analytics.summary,
    lastNDays: {
      days,
      ...recentDailyStats,
    },
    dailyStats: Object.entries(analytics.dailyStats)
      .filter(([date]) => date >= cutoffString)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, stats]) => ({ date, ...stats })),
    lastUpdated: analytics.lastUpdated,
  };
}

// Get raw events (for detailed analysis)
export function getEvents(limit = 100, eventType = null) {
  const analytics = loadAnalytics();
  let events = [...analytics.events].reverse(); // Most recent first

  if (eventType) {
    events = events.filter(e => e.type === eventType);
  }

  return events.slice(0, limit);
}

