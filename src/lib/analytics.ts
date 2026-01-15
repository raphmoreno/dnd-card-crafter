/**
 * Analytics tracking utility
 * Tracks key user events for usage analytics
 */
import { apiUrl } from './api-config';

export type EventType = 'search' | 'monster_added' | 'pdf_download' | 'image_regeneration';

export interface AnalyticsMetadata {
  [key: string]: string | number | boolean | null | undefined;
}

/**
 * Track an analytics event
 */
export async function trackEvent(
  eventType: EventType,
  metadata: AnalyticsMetadata = {}
): Promise<void> {
  try {
    // Only track in production or if explicitly enabled
    const isProduction = import.meta.env.PROD;
    const analyticsEnabled = import.meta.env.VITE_ANALYTICS_ENABLED !== 'false';
    
    if (!isProduction && !analyticsEnabled) {
      return; // Skip tracking in development unless explicitly enabled
    }

    const response = await fetch(apiUrl('/api/analytics/track'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        eventType,
        metadata: {
          ...metadata,
          timestamp: new Date().toISOString(),
          userAgent: navigator.userAgent,
          url: window.location.href,
        },
      }),
    });

    if (!response.ok) {
      console.warn('Failed to track analytics event:', eventType);
    }
  } catch (error) {
    // Silently fail - analytics should never break the app
    console.warn('Analytics tracking error:', error);
  }
}

/**
 * Track a search event
 */
export function trackSearch(query: string, resultCount?: number): void {
  trackEvent('search', {
    query,
    resultCount,
    queryLength: query.length,
  });
}

/**
 * Track when a monster is added to preview
 */
export function trackMonsterAdded(monsterName: string, quantity: number = 1): void {
  trackEvent('monster_added', {
    monsterName,
    quantity,
  });
}

/**
 * Track PDF download
 */
export function trackPDFDownload(monsterCount: number, pageCount: number): void {
  trackEvent('pdf_download', {
    monsterCount,
    pageCount,
  });
}

/**
 * Track image regeneration attempt
 */
export function trackImageRegeneration(monsterName: string): void {
  trackEvent('image_regeneration', {
    monsterName,
  });
}

