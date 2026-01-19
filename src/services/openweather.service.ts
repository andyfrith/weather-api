import * as Sentry from "@sentry/bun";
import {
  OpenWeatherCurrentResponseSchema,
  GeocodingResponseSchema,
  type OpenWeatherCurrentResponse,
  type GeocodingResult,
} from "../schemas/openweather.schema";
import type {
  CurrentWeatherResponse,
  WeatherQuery,
} from "../schemas/weather.schema";

/**
 * OpenWeather API base URLs
 */
const OPENWEATHER_API_BASE = "https://api.openweathermap.org/data/2.5";
const OPENWEATHER_GEO_BASE = "https://api.openweathermap.org/geo/1.0";

/**
 * Cache TTL in milliseconds (10 minutes as per OpenWeather recommendations)
 */
const CACHE_TTL = 10 * 60 * 1000;

/**
 * Fetch timeout in milliseconds
 */
const FETCH_TIMEOUT = 5000;

/**
 * Cache entry structure for storing weather data with expiration
 */
interface CacheEntry<T> {
  data: T;
  expires: number;
}

/**
 * In-memory TTL cache for weather data
 * Key format: `${lat},${lon},${units}`
 */
const weatherCache = new Map<string, CacheEntry<OpenWeatherCurrentResponse>>();

/**
 * In-memory TTL cache for geocoding results
 * Key format: city name (lowercase)
 */
const geoCache = new Map<string, CacheEntry<GeocodingResult>>();

/**
 * Custom error class for OpenWeather API errors
 */
export class OpenWeatherError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly errorMessage: string,
    public readonly originalError?: unknown
  ) {
    super(errorMessage);
    this.name = "OpenWeatherError";
  }
}

/**
 * Generates a cache key for weather data
 * @param lat - Latitude
 * @param lon - Longitude
 * @param units - Temperature units
 * @returns Cache key string
 */
function getWeatherCacheKey(lat: number, lon: number, units: string): string {
  return `${lat.toFixed(4)},${lon.toFixed(4)},${units}`;
}

/**
 * Generates a cache key for geocoding data
 * @param city - City name
 * @returns Cache key string
 */
function getGeoCacheKey(city: string): string {
  return city.toLowerCase().trim();
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
  cache.set(key, {
    data,
    expires: Date.now() + CACHE_TTL,
  });
}

/**
 * Maps OpenWeather error codes to appropriate HTTP status codes and messages
 * @param statusCode - HTTP status code from OpenWeather
 * @param message - Error message from OpenWeather
 * @returns OpenWeatherError with mapped status and message
 */
function mapOpenWeatherError(
  statusCode: number,
  message: string
): OpenWeatherError {
  switch (statusCode) {
    case 401:
      return new OpenWeatherError(401, "Invalid API key");
    case 404:
      return new OpenWeatherError(404, "City not found");
    case 429:
      // Log rate limit errors to Sentry with Warning level
      Sentry.captureMessage("OpenWeather API rate limit exceeded", {
        level: "warning",
        extra: { originalMessage: message },
      });
      return new OpenWeatherError(429, "Rate limit exceeded");
    default:
      return new OpenWeatherError(
        statusCode,
        message || "OpenWeather API error"
      );
  }
}

/**
 * Makes a fetch request with timeout handling
 * @param url - URL to fetch
 * @returns Response object
 * @throws OpenWeatherError on timeout or network errors
 */
async function fetchWithTimeout(url: string): Promise<Response> {
  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(FETCH_TIMEOUT),
    });
    return response;
  } catch (error) {
    if (error instanceof DOMException && error.name === "TimeoutError") {
      throw new OpenWeatherError(
        504,
        "Request timeout - OpenWeather API did not respond in time"
      );
    }
    throw new OpenWeatherError(
      503,
      "Failed to connect to OpenWeather API",
      error
    );
  }
}

/**
 * Converts a city name to geographic coordinates using OpenWeather Geocoding API
 * @param city - City name to geocode
 * @param apiKey - OpenWeather API key
 * @returns GeocodingResult with lat/lon coordinates
 * @throws OpenWeatherError if geocoding fails or city not found
 */
export async function geocodeCity(
  city: string,
  apiKey: string
): Promise<GeocodingResult> {
  const cacheKey = getGeoCacheKey(city);

  // Check cache first
  const cached = getFromCache(geoCache, cacheKey);
  if (cached) {
    return cached;
  }

  const url = `${OPENWEATHER_GEO_BASE}/direct?q=${encodeURIComponent(
    city
  )}&limit=1&appid=${apiKey}`;

  const response = await fetchWithTimeout(url);

  if (!response.ok) {
    const errorData = await response
      .json()
      .catch(() => ({ message: "Unknown error" }));
    throw mapOpenWeatherError(response.status, errorData.message);
  }

  const data = await response.json();
  const parsed = GeocodingResponseSchema.safeParse(data);

  if (!parsed.success) {
    Sentry.captureException(parsed.error, {
      extra: { responseData: data, city },
    });
    throw new OpenWeatherError(500, "Invalid response from geocoding API");
  }

  if (parsed.data.length === 0) {
    throw new OpenWeatherError(404, `City not found: ${city}`);
  }

  const result = parsed.data[0];

  // Cache the result
  setInCache(geoCache, cacheKey, result);

  return result;
}

/**
 * Fetches current weather data from OpenWeather API
 * @param lat - Latitude
 * @param lon - Longitude
 * @param units - Temperature units ('metric' or 'imperial')
 * @param lang - Language code for descriptions
 * @param apiKey - OpenWeather API key
 * @returns Raw OpenWeather current weather response
 * @throws OpenWeatherError on API errors
 */
export async function fetchCurrentWeather(
  lat: number,
  lon: number,
  units: string,
  lang: string,
  apiKey: string
): Promise<{ data: OpenWeatherCurrentResponse; cached: boolean }> {
  const cacheKey = getWeatherCacheKey(lat, lon, units);

  // Check cache first
  const cached = getFromCache(weatherCache, cacheKey);
  if (cached) {
    return { data: cached, cached: true };
  }

  const url = `${OPENWEATHER_API_BASE}/weather?lat=${lat}&lon=${lon}&units=${units}&lang=${lang}&appid=${apiKey}`;

  const response = await fetchWithTimeout(url);

  if (!response.ok) {
    const errorData = await response
      .json()
      .catch(() => ({ message: "Unknown error" }));
    throw mapOpenWeatherError(response.status, errorData.message);
  }

  const data = await response.json();
  const parsed = OpenWeatherCurrentResponseSchema.safeParse(data);

  if (!parsed.success) {
    Sentry.captureException(parsed.error, {
      extra: { responseData: data, lat, lon, units },
    });
    throw new OpenWeatherError(500, "Invalid response from weather API");
  }

  // Cache the result
  setInCache(weatherCache, cacheKey, parsed.data);

  return { data: parsed.data, cached: false };
}

/**
 * Converts Unix timestamp to ISO datetime string
 * @param timestamp - Unix timestamp in seconds
 * @param timezoneOffset - Timezone offset in seconds from UTC
 * @returns ISO datetime string
 */
function unixToISOString(timestamp: number, timezoneOffset: number): string {
  // Convert to milliseconds and create Date object
  const date = new Date((timestamp + timezoneOffset) * 1000);
  return new Date(timestamp * 1000).toISOString();
}

/**
 * Transforms OpenWeather API response to our API response format
 * @param owResponse - Raw OpenWeather response
 * @param units - Temperature units used in request
 * @param cached - Whether the response was from cache
 * @returns Transformed current weather response
 */
export function transformWeatherResponse(
  owResponse: OpenWeatherCurrentResponse,
  units: string,
  cached: boolean
): CurrentWeatherResponse {
  const tempUnit = units === "metric" ? "°C" : "°F";
  const windUnit = units === "metric" ? "m/s" : "mph";

  return {
    location: {
      name: owResponse.name,
      country: owResponse.sys.country,
      coordinates: {
        lat: owResponse.coord.lat,
        lon: owResponse.coord.lon,
      },
      timezone: owResponse.timezone,
      sunrise: unixToISOString(owResponse.sys.sunrise, 0),
      sunset: unixToISOString(owResponse.sys.sunset, 0),
    },
    weather: {
      id: owResponse.weather[0].id,
      main: owResponse.weather[0].main,
      description: owResponse.weather[0].description,
      icon: owResponse.weather[0].icon,
    },
    temperature: {
      current: owResponse.main.temp,
      feels_like: owResponse.main.feels_like,
      min: owResponse.main.temp_min,
      max: owResponse.main.temp_max,
      unit: tempUnit,
    },
    wind: {
      speed: owResponse.wind.speed,
      direction: owResponse.wind.deg,
      gust: owResponse.wind.gust,
      unit: windUnit,
    },
    atmosphere: {
      humidity: owResponse.main.humidity,
      pressure: owResponse.main.pressure,
      visibility: owResponse.visibility,
      cloudiness: owResponse.clouds.all,
    },
    precipitation:
      owResponse.rain || owResponse.snow
        ? {
            rain: owResponse.rain
              ? {
                  "1h": owResponse.rain["1h"],
                  "3h": owResponse.rain["3h"],
                }
              : undefined,
            snow: owResponse.snow
              ? {
                  "1h": owResponse.snow["1h"],
                  "3h": owResponse.snow["3h"],
                }
              : undefined,
          }
        : undefined,
    timestamp: unixToISOString(owResponse.dt, 0),
    cached,
  };
}

/**
 * Main service function to get current weather for a city
 * Handles geocoding, caching, and response transformation
 * @param query - Weather query parameters
 * @param apiKey - OpenWeather API key
 * @returns Current weather response
 * @throws OpenWeatherError on any API errors
 */
export async function getCurrentWeather(
  query: WeatherQuery,
  apiKey: string
): Promise<CurrentWeatherResponse> {
  const { city, units, lang, lat, lon } = query;
  const language = lang ?? "en";

  // Step 1: Geocode the city name to coordinates if necessary
  let geoResult: GeocodingResult | undefined;
  if (city) {
    geoResult = await geocodeCity(city, apiKey);
  }

  // Step 2: Fetch current weather using coordinates
  const { data: weatherData, cached } = await fetchCurrentWeather(
    geoResult?.lat ?? lat ?? 0,
    geoResult?.lon ?? lon ?? 0,
    units,
    language,
    apiKey
  );

  // Step 3: Transform to API response format
  return transformWeatherResponse(weatherData, units, cached);
}

/**
 * Clears all cached weather and geocoding data
 * Useful for testing or manual cache invalidation
 */
export function clearCache(): void {
  weatherCache.clear();
  geoCache.clear();
}

/**
 * Gets current cache statistics
 * @returns Object with cache counts
 */
export function getCacheStats(): {
  weatherEntries: number;
  geoEntries: number;
} {
  return {
    weatherEntries: weatherCache.size,
    geoEntries: geoCache.size,
  };
}
