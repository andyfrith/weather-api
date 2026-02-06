import * as Sentry from "@sentry/bun";
import {
  AIQuery,
  AITextResponse,
  AITextResponseSchema,
} from "../schemas/ai.schema";
import { Ollama } from "ollama";
import { systemPrompt } from "../lib/prompt";

/**
 * Cache TTL in milliseconds (30 minutes)
 */
const CACHE_TTL = 30 * 60 * 1000;

/**
 * Maximum number of cache entries
 */
const MAX_CACHE_ENTRIES = 500;

/**
 * Cache entry structure for storing AI response data with expiration
 */
interface CacheEntry<T> {
  data: T;
  expires: number;
}

/**
 * In-memory TTL cache for AI responses
 * Key format: derived from the prompt
 */
const aiCache = new Map<string, CacheEntry<AITextResponse>>();

/**
 * Generates a cache key for AI data
 * @param prompt - Prompt
 * @param ollamaHost - Ollama host
 * @param ollamaModel - Ollama model
 * @returns Cache key string
 */
function getAICacheKey(
  prompt: string,
  ollamaHost: string,
  ollamaModel: string
): string {
  return `${ollamaHost}::${ollamaModel}::${prompt.trim()}`;
}

/**
 * Retrieves an item from cache if it exists and hasn't expired
 * @param cache - The cache Map to check
 * @param key - The cache key
 * @returns The cached data or null if not found/expired
 */
function getFromCache<T>(
  cache: Map<string, CacheEntry<T>>,
  key: string
): T | null {
  const entry = cache.get(key);
  if (entry && entry.expires > Date.now()) {
    return entry.data;
  }
  // Clean up expired entry
  if (entry) {
    cache.delete(key);
  }
  return null;
}

/**
 * Stores an item in cache with TTL
 * @param cache - The cache Map to store in
 * @param key - The cache key
 * @param data - The data to cache
 */
function setInCache<T>(
  cache: Map<string, CacheEntry<T>>,
  key: string,
  data: T
): void {
  if (cache.size >= MAX_CACHE_ENTRIES) {
    const oldestKey = cache.keys().next().value;
    if (oldestKey) {
      cache.delete(oldestKey);
    }
  }
  cache.set(key, {
    data,
    expires: Date.now() + CACHE_TTL,
  });
}

/**
 * Clears all cached AI data
 * Useful for testing or manual cache invalidation
 */
export function clearCache(): void {
  aiCache.clear();
}

/**
 * Gets current cache statistics
 * @returns Object with cache counts
 */
export function getCacheStats(): {
  aiEntries: number;
} {
  return {
    aiEntries: aiCache.size,
  };
}

/**
 * Fetches AI data from AI API
 * @param prompt - Prompt
 * @param apiKey - AI API key
 * @returns AI response text
 * @throws Error on any API errors
 */
export async function fetchAIText(
  prompt: string,
  ollamaHost: string,
  ollamaModel: string
): Promise<{ data: AITextResponse; cached: boolean }> {
  const cacheKey = getAICacheKey(prompt, ollamaHost, ollamaModel);
  const cached = getFromCache(aiCache, cacheKey);
  if (cached) {
    return { data: cached, cached: true };
  }

  const ollama = new Ollama({
    host: ollamaHost,
  });

  const result = await ollama.chat({
    model: ollamaModel,
    messages: [
      { role: "user", content: prompt },
      { role: "system", content: systemPrompt },
    ],
    format: "json",
    stream: false,
  });

  const parsed = AITextResponseSchema.safeParse({
    text: result.message.content ?? "",
  });
  if (!parsed.success) {
    const safePrompt =
      prompt.length > 200 ? `${prompt.slice(0, 200)}…` : prompt;
    Sentry.captureException(parsed.error, {
      extra: { responseData: result, prompt: safePrompt },
    });
    throw new Error("Invalid response from Ollama AI API");
  }
  // console.log("Ollama AI API result:", result);
  setInCache(aiCache, cacheKey, parsed.data);
  return { data: parsed.data, cached: false };
}

/**
 * Main service function to get AI model response text for a provided prompt
 * Handles caching, and response transformation
 * @param query - AI query parameters
 * @param apiKey - AI API key
 * @returns AI response text
 * @throws Error on any API errors
 */
export async function getText(
  query: AIQuery,
  ollamaHost: string,
  ollamaModel: string
): Promise<AITextResponse> {
  const { prompt } = query;
  if (!prompt) {
    throw new Error("Prompt is required");
  }

  const { data: aiData, cached } = await fetchAIText(
    prompt,
    ollamaHost,
    ollamaModel
  );
  return aiData;
}
