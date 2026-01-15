/**
 * Centralized monster image generation hook
 * Coordinates image generation across all card instances
 * Only preview cards (forPrint=false) can trigger generation
 * Print cards just listen and display results
 */

import { useState, useEffect, useCallback } from 'react';
import { getMonsterImageUrl, addImageToCache, updateImageCache } from '@/lib/monster-images';
import { generateMonsterImageWithCache } from '@/lib/monster-images-api';
import { generateMonsterImage } from '@/lib/monster-images-api';

// Global state for tracking generations across all instances
const generationState = new Map<string, {
  promise: Promise<string | null>;
  subscribers: Set<(url: string | null) => void>;
  isGenerating: boolean;
  completed: boolean; // Track if generation completed successfully
}>();

/**
 * Hook to manage monster image generation and sharing across components
 * @param monsterName - Name of the monster
 * @param forPrint - Whether this is a print card (should not trigger generation)
 * @param shouldGenerate - Whether this instance should trigger generation (default: !forPrint)
 */
export function useMonsterImage(
  monsterName: string,
  forPrint: boolean = false,
  shouldGenerate: boolean = !forPrint
) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState(false);

  // Subscribe to generation updates
  useEffect(() => {
    // First check if image already exists
    const existingUrl = getMonsterImageUrl(monsterName);
    if (existingUrl) {
      setImageUrl(existingUrl);
      setIsGenerating(false);
      setError(false);
      return;
    }

    // Check if there's already a generation in progress or completed
    const existingState = generationState.get(monsterName);
    
    if (existingState) {
      // Subscribe to the existing generation (whether in progress or completed)
      setIsGenerating(existingState.isGenerating);
      setError(false);
      
      const subscriber = (url: string | null) => {
        if (url) {
          setImageUrl(url);
          setIsGenerating(false);
          setError(false);
        } else {
          setError(true);
          setIsGenerating(false);
        }
      };
      
      existingState.subscribers.add(subscriber);
      
      // Check if promise is already resolved/rejected by accessing it
      existingState.promise
        .then((url) => {
          // This will fire immediately if promise is already resolved
          subscriber(url);
        })
        .catch(() => {
          subscriber(null);
        });

      // If already completed, set the image URL immediately from cache
      if (existingState.completed) {
        const cachedUrl = getMonsterImageUrl(monsterName);
        if (cachedUrl) {
          setImageUrl(cachedUrl);
          setIsGenerating(false);
          setError(false);
        }
      }

      return () => {
        const currentState = generationState.get(monsterName);
        if (currentState) {
          currentState.subscribers.delete(subscriber);
          
          // CRITICAL: Never delete generationState if:
          // 1. Generation is still in progress (isGenerating === true) - wait for it to complete
          // 2. Generation completed successfully (completed === true) - keep as permanent record
          // Only delete if generation failed/cancelled AND no subscribers AND not generating
          if (currentState.isGenerating) {
            // Don't delete - generation is still in progress
            return;
          }
          
          if (currentState.completed) {
            // Never delete successful completions - keep as permanent record
            return;
          }
          
          // Only delete if generation failed/cancelled AND no subscribers remain
          if (currentState.subscribers.size === 0) {
            generationState.delete(monsterName);
          }
        }
      };
    }

    // Only generate if this instance should trigger generation
    if (!shouldGenerate) {
      return;
    }

    // Start new generation
    setIsGenerating(true);
    setError(false);

    const generationPromise = generateMonsterImageWithCache(monsterName)
      .then((url) => {
        const state = generationState.get(monsterName);
        if (state) {
          // Add to cache FIRST before notifying subscribers
          // This ensures the cache is updated before any cleanup can happen
          if (url) {
            addImageToCache(monsterName, url);
            // Mark as completed - this image was successfully generated and cached
            state.completed = true;
          }
          
          // Mark as no longer generating AFTER cache is updated
          state.isGenerating = false;
          
          // Notify all subscribers AFTER cache is updated and state is marked complete
          state.subscribers.forEach((sub) => sub(url));
          
          // Don't delete generationState here - let it persist until all subscribers are gone
          // The cleanup in useEffect will handle deletion when subscribers.size === 0
          // IMPORTANT: If generation completed successfully, we NEVER delete the state
          // This prevents re-generation when React re-renders after cleanup
        }
        return url;
      })
      .catch((error) => {
        console.error('Failed to generate image:', error);
        const state = generationState.get(monsterName);
        if (state) {
          // Mark as no longer generating
          state.isGenerating = false;
          
          state.subscribers.forEach((sub) => sub(null));
          // Don't delete generationState here - let it persist until all subscribers are gone
        }
        return null;
      });

    // Store the generation state
    const state = {
      promise: generationPromise,
      subscribers: new Set<(url: string | null) => void>(),
      isGenerating: true,
      completed: false, // Not yet completed
    };
    
    const subscriber = (url: string | null) => {
      if (url) {
        setImageUrl(url);
        setIsGenerating(false);
        setError(false);
      } else {
        setError(true);
        setIsGenerating(false);
      }
    };
    
    state.subscribers.add(subscriber);
    generationState.set(monsterName, state);

    // Cleanup
    return () => {
      const currentState = generationState.get(monsterName);
      if (currentState) {
        currentState.subscribers.delete(subscriber);
        
        // CRITICAL: Never delete generationState if:
        // 1. Generation is still in progress (isGenerating === true) - wait for it to complete
        // 2. Generation completed successfully (completed === true) - keep as permanent record
        // Only delete if generation failed/cancelled AND no subscribers AND not generating
        // This prevents race conditions where cleanup runs before completion state is set
        if (currentState.isGenerating) {
          // Don't delete - generation is still in progress
          return;
        }
        
        if (currentState.completed) {
          // Never delete successful completions - keep as permanent record
          return;
        }
        
        // Only delete if generation failed/cancelled AND no subscribers remain
        if (currentState.subscribers.size === 0) {
          generationState.delete(monsterName);
        }
      }
    };
  }, [monsterName, shouldGenerate]);

  // Regenerate function (only for preview cards)
  const regenerate = useCallback(async (): Promise<string | null> => {
    if (forPrint || isGenerating) {
      return null;
    }

    setIsGenerating(true);
    setError(false);

    try {
      const newUrl = await generateMonsterImage(monsterName);
      
      if (newUrl) {
        // Add cache-busting query parameter to force browser to fetch the new image
        // even though the file path is the same (regenerate overwrites the file)
        const cacheBustedUrl = newUrl + (newUrl.includes('?') ? '&' : '?') + `t=${Date.now()}`;
        setImageUrl(cacheBustedUrl);
        setIsGenerating(false);
        setError(false);
        return cacheBustedUrl;
      } else {
        setError(true);
        setIsGenerating(false);
        return null;
      }
    } catch (error) {
      console.error('Failed to regenerate image:', error);
      setError(true);
      setIsGenerating(false);
      return null;
    }
  }, [monsterName, forPrint, isGenerating]);

  return {
    imageUrl,
    isGenerating,
    error,
    regenerate,
  };
}

