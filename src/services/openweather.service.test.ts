// @ts-nocheck - Test file uses fetch mocks that don't fully implement Bun's fetch type
import { describe, it, expect, beforeEach, afterEach, mock, spyOn } from "bun:test";
import * as Sentry from "@sentry/bun";
import {
  geocodeCity,
  fetchCurrentWeather,
  transformWeatherResponse,
  getCurrentWeather,
  clearCache,
  getCacheStats,
  OpenWeatherError,
} from "./openweather.service";
import type { OpenWeatherCurrentResponse } from "../schemas/openweather.schema";

/**
 * Mock OpenWeather API responses for testing
 */
const mockGeocodingResponse = [
  {
    name: "London",
    lat: 51.5074,
    lon: -0.1278,
    country: "GB",
    state: "England",
  },
];

const mockWeatherResponse: OpenWeatherCurrentResponse = {
  coord: { lat: 51.5074, lon: -0.1278 },
  weather: [
    {
      id: 800,
      main: "Clear",
      description: "clear sky",
      icon: "01d",
    },
  ],
  base: "stations",
  main: {
    temp: 15.5,
    feels_like: 14.8,
    temp_min: 13.0,
    temp_max: 18.0,
    pressure: 1013,
    humidity: 65,
  },
  visibility: 10000,
  wind: {
    speed: 5.2,
    deg: 180,
    gust: 7.8,
  },
  clouds: { all: 20 },
  dt: 1705320000,
  sys: {
    type: 2,
    id: 2019646,
    country: "GB",
    sunrise: 1705304700,
    sunset: 1705336200,
  },
  timezone: 0,
  id: 2643743,
  name: "London",
  cod: 200,
};

const mockWeatherResponseWithPrecipitation: OpenWeatherCurrentResponse = {
  ...mockWeatherResponse,
  rain: { "1h": 0.5, "3h": 1.2 },
  snow: { "1h": 0.1, "3h": 0.3 },
};

/**
 * Helper to create mock fetch response
 */
function createMockResponse(data: unknown, status = 200, ok = true): Response {
  return {
    ok,
    status,
    json: async () => data,
  } as Response;
}

/**
 * Helper to create mock error response
 */
function createMockErrorResponse(status: number, message: string): Response {
  return {
    ok: false,
    status,
    json: async () => ({ message }),
  } as Response;
}

describe("OpenWeatherError", () => {
  it("should create error with correct properties", () => {
    const error = new OpenWeatherError(404, "City not found");
    
    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(OpenWeatherError);
    expect(error.name).toBe("OpenWeatherError");
    expect(error.statusCode).toBe(404);
    expect(error.errorMessage).toBe("City not found");
    expect(error.message).toBe("City not found");
  });

  it("should store original error when provided", () => {
    const originalError = new Error("Network failure");
    const error = new OpenWeatherError(503, "Connection failed", originalError);
    
    expect(error.originalError).toBe(originalError);
  });
});

describe("geocodeCity", () => {
  const apiKey = "test-api-key";
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    clearCache();
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("should return geocoding result for valid city", async () => {
    globalThis.fetch = mock(() => 
      Promise.resolve(createMockResponse(mockGeocodingResponse))
    );

    const result = await geocodeCity("London", apiKey);

    expect(result.name).toBe("London");
    expect(result.lat).toBe(51.5074);
    expect(result.lon).toBe(-0.1278);
    expect(result.country).toBe("GB");
  });

  it("should use cached result on subsequent calls", async () => {
    const fetchMock = mock(() => 
      Promise.resolve(createMockResponse(mockGeocodingResponse))
    );
    globalThis.fetch = fetchMock;

    // First call - should fetch
    await geocodeCity("London", apiKey);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    // Second call - should use cache
    const result = await geocodeCity("London", apiKey);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(result.name).toBe("London");
  });

  it("should handle case-insensitive city names for caching", async () => {
    const fetchMock = mock(() => 
      Promise.resolve(createMockResponse(mockGeocodingResponse))
    );
    globalThis.fetch = fetchMock;

    await geocodeCity("London", apiKey);
    await geocodeCity("LONDON", apiKey);
    await geocodeCity("london", apiKey);

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("should throw OpenWeatherError for city not found", async () => {
    globalThis.fetch = mock(() => 
      Promise.resolve(createMockResponse([]))
    );

    await expect(geocodeCity("NonexistentCity123", apiKey)).rejects.toThrow(
      OpenWeatherError
    );

    try {
      await geocodeCity("InvalidCity", apiKey);
    } catch (error) {
      expect(error).toBeInstanceOf(OpenWeatherError);
      expect((error as OpenWeatherError).statusCode).toBe(404);
      expect((error as OpenWeatherError).errorMessage).toContain("City not found");
    }
  });

  it("should throw OpenWeatherError for invalid API key", async () => {
    globalThis.fetch = mock(() => 
      Promise.resolve(createMockErrorResponse(401, "Invalid API key"))
    );

    await expect(geocodeCity("London", "invalid-key")).rejects.toThrow(
      OpenWeatherError
    );

    try {
      await geocodeCity("London", "invalid-key");
    } catch (error) {
      expect((error as OpenWeatherError).statusCode).toBe(401);
    }
  });

  it("should throw OpenWeatherError for rate limit exceeded", async () => {
    // Mock Sentry.captureMessage
    const sentrySpy = spyOn(Sentry, "captureMessage").mockImplementation(() => "");

    globalThis.fetch = mock(() => 
      Promise.resolve(createMockErrorResponse(429, "Rate limit exceeded"))
    );

    try {
      await geocodeCity("London", apiKey);
    } catch (error) {
      expect((error as OpenWeatherError).statusCode).toBe(429);
      expect(sentrySpy).toHaveBeenCalled();
    }
  });

  it("should throw OpenWeatherError for invalid response format", async () => {
    // Mock Sentry.captureException
    const sentrySpy = spyOn(Sentry, "captureException").mockImplementation(() => "");

    globalThis.fetch = mock(() => 
      Promise.resolve(createMockResponse([{ invalid: "data" }]))
    );

    await expect(geocodeCity("London", apiKey)).rejects.toThrow(OpenWeatherError);

    try {
      await geocodeCity("London2", apiKey);
    } catch (error) {
      expect((error as OpenWeatherError).statusCode).toBe(500);
      expect((error as OpenWeatherError).errorMessage).toContain("Invalid response");
    }
  });

  it("should URL encode city names with special characters", async () => {
    let capturedUrl = "";
    globalThis.fetch = mock((url: string) => {
      capturedUrl = url;
      return Promise.resolve(createMockResponse(mockGeocodingResponse));
    });

    await geocodeCity("New York", apiKey);

    expect(capturedUrl).toContain("New%20York");
  });
});

describe("fetchCurrentWeather", () => {
  const apiKey = "test-api-key";
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    clearCache();
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("should return weather data for valid coordinates", async () => {
    globalThis.fetch = mock(() => 
      Promise.resolve(createMockResponse(mockWeatherResponse))
    );

    const result = await fetchCurrentWeather(51.5074, -0.1278, "metric", "en", apiKey);

    expect(result.cached).toBe(false);
    expect(result.data.name).toBe("London");
    expect(result.data.main.temp).toBe(15.5);
  });

  it("should return cached data on subsequent calls", async () => {
    const fetchMock = mock(() => 
      Promise.resolve(createMockResponse(mockWeatherResponse))
    );
    globalThis.fetch = fetchMock;

    // First call
    const result1 = await fetchCurrentWeather(51.5074, -0.1278, "metric", "en", apiKey);
    expect(result1.cached).toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    // Second call - should use cache
    const result2 = await fetchCurrentWeather(51.5074, -0.1278, "metric", "en", apiKey);
    expect(result2.cached).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(result2.data.name).toBe("London");
  });

  it("should use different cache keys for different units", async () => {
    const fetchMock = mock(() => 
      Promise.resolve(createMockResponse(mockWeatherResponse))
    );
    globalThis.fetch = fetchMock;

    await fetchCurrentWeather(51.5074, -0.1278, "metric", "en", apiKey);
    await fetchCurrentWeather(51.5074, -0.1278, "imperial", "en", apiKey);

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("should throw OpenWeatherError for API errors", async () => {
    globalThis.fetch = mock(() => 
      Promise.resolve(createMockErrorResponse(404, "City not found"))
    );

    await expect(
      fetchCurrentWeather(99.9999, 99.9999, "metric", "en", apiKey)
    ).rejects.toThrow(OpenWeatherError);
  });

  it("should throw OpenWeatherError for invalid response format", async () => {
    spyOn(Sentry, "captureException").mockImplementation(() => "");

    globalThis.fetch = mock(() => 
      Promise.resolve(createMockResponse({ invalid: "response" }))
    );

    await expect(
      fetchCurrentWeather(51.5074, -0.1278, "metric", "en", apiKey)
    ).rejects.toThrow(OpenWeatherError);
  });

  it("should include correct query parameters in request", async () => {
    let capturedUrl = "";
    globalThis.fetch = mock((url: string) => {
      capturedUrl = url;
      return Promise.resolve(createMockResponse(mockWeatherResponse));
    });

    await fetchCurrentWeather(51.5074, -0.1278, "metric", "en", apiKey);

    expect(capturedUrl).toContain("lat=51.5074");
    expect(capturedUrl).toContain("lon=-0.1278");
    expect(capturedUrl).toContain("units=metric");
    expect(capturedUrl).toContain("lang=en");
    expect(capturedUrl).toContain(`appid=${apiKey}`);
  });
});

describe("transformWeatherResponse", () => {
  it("should transform response with metric units", () => {
    const result = transformWeatherResponse(mockWeatherResponse, "metric", false);

    expect(result.location.name).toBe("London");
    expect(result.location.country).toBe("GB");
    expect(result.location.coordinates.lat).toBe(51.5074);
    expect(result.location.coordinates.lon).toBe(-0.1278);
    expect(result.temperature.unit).toBe("°C");
    expect(result.wind.unit).toBe("m/s");
    expect(result.cached).toBe(false);
  });

  it("should transform response with imperial units", () => {
    const result = transformWeatherResponse(mockWeatherResponse, "imperial", true);

    expect(result.temperature.unit).toBe("°F");
    expect(result.wind.unit).toBe("mph");
    expect(result.cached).toBe(true);
  });

  it("should include weather condition details", () => {
    const result = transformWeatherResponse(mockWeatherResponse, "metric", false);

    expect(result.weather.id).toBe(800);
    expect(result.weather.main).toBe("Clear");
    expect(result.weather.description).toBe("clear sky");
    expect(result.weather.icon).toBe("01d");
  });

  it("should include temperature details", () => {
    const result = transformWeatherResponse(mockWeatherResponse, "metric", false);

    expect(result.temperature.current).toBe(15.5);
    expect(result.temperature.feels_like).toBe(14.8);
    expect(result.temperature.min).toBe(13.0);
    expect(result.temperature.max).toBe(18.0);
  });

  it("should include wind details", () => {
    const result = transformWeatherResponse(mockWeatherResponse, "metric", false);

    expect(result.wind.speed).toBe(5.2);
    expect(result.wind.direction).toBe(180);
    expect(result.wind.gust).toBe(7.8);
  });

  it("should include atmosphere details", () => {
    const result = transformWeatherResponse(mockWeatherResponse, "metric", false);

    expect(result.atmosphere.humidity).toBe(65);
    expect(result.atmosphere.pressure).toBe(1013);
    expect(result.atmosphere.visibility).toBe(10000);
    expect(result.atmosphere.cloudiness).toBe(20);
  });

  it("should handle response without precipitation", () => {
    const result = transformWeatherResponse(mockWeatherResponse, "metric", false);

    expect(result.precipitation).toBeUndefined();
  });

  it("should include precipitation data when present", () => {
    const result = transformWeatherResponse(
      mockWeatherResponseWithPrecipitation,
      "metric",
      false
    );

    expect(result.precipitation).toBeDefined();
    expect(result.precipitation?.rain?.["1h"]).toBe(0.5);
    expect(result.precipitation?.rain?.["3h"]).toBe(1.2);
    expect(result.precipitation?.snow?.["1h"]).toBe(0.1);
    expect(result.precipitation?.snow?.["3h"]).toBe(0.3);
  });

  it("should format timestamp as ISO string", () => {
    const result = transformWeatherResponse(mockWeatherResponse, "metric", false);

    expect(result.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
  });

  it("should format sunrise and sunset as ISO strings", () => {
    const result = transformWeatherResponse(mockWeatherResponse, "metric", false);

    expect(result.location.sunrise).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    expect(result.location.sunset).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
  });
});

describe("getCurrentWeather", () => {
  const apiKey = "test-api-key";
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    clearCache();
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("should return complete weather data for a city", async () => {
    let callCount = 0;
    globalThis.fetch = mock((url: string) => {
      callCount++;
      if (url.includes("/geo/")) {
        return Promise.resolve(createMockResponse(mockGeocodingResponse));
      }
      return Promise.resolve(createMockResponse(mockWeatherResponse));
    });

    const result = await getCurrentWeather(
      { city: "London", units: "metric" },
      apiKey
    );

    expect(result.location.name).toBe("London");
    expect(result.temperature.current).toBe(15.5);
    expect(callCount).toBe(2); // geo + weather
  });

  it("should use default language when not provided", async () => {
    let weatherUrl = "";
    globalThis.fetch = mock((url: string) => {
      if (url.includes("/weather")) {
        weatherUrl = url;
      }
      if (url.includes("/geo/")) {
        return Promise.resolve(createMockResponse(mockGeocodingResponse));
      }
      return Promise.resolve(createMockResponse(mockWeatherResponse));
    });

    await getCurrentWeather({ city: "London", units: "metric" }, apiKey);

    expect(weatherUrl).toContain("lang=en");
  });

  it("should use provided language", async () => {
    let weatherUrl = "";
    globalThis.fetch = mock((url: string) => {
      if (url.includes("/weather")) {
        weatherUrl = url;
      }
      if (url.includes("/geo/")) {
        return Promise.resolve(createMockResponse(mockGeocodingResponse));
      }
      return Promise.resolve(createMockResponse(mockWeatherResponse));
    });

    await getCurrentWeather(
      { city: "London", units: "metric", lang: "es" },
      apiKey
    );

    expect(weatherUrl).toContain("lang=es");
  });

  it("should propagate geocoding errors", async () => {
    globalThis.fetch = mock(() => 
      Promise.resolve(createMockResponse([]))
    );

    await expect(
      getCurrentWeather({ city: "NonexistentCity", units: "metric" }, apiKey)
    ).rejects.toThrow(OpenWeatherError);
  });

  it("should propagate weather API errors", async () => {
    globalThis.fetch = mock((url: string) => {
      if (url.includes("/geo/")) {
        return Promise.resolve(createMockResponse(mockGeocodingResponse));
      }
      return Promise.resolve(createMockErrorResponse(500, "Internal server error"));
    });

    await expect(
      getCurrentWeather({ city: "London", units: "metric" }, apiKey)
    ).rejects.toThrow(OpenWeatherError);
  });
});

describe("clearCache", () => {
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("should clear all cached data", async () => {
    const fetchMock = mock((url: string) => {
      if (url.includes("/geo/")) {
        return Promise.resolve(createMockResponse(mockGeocodingResponse));
      }
      return Promise.resolve(createMockResponse(mockWeatherResponse));
    });
    globalThis.fetch = fetchMock;

    // Populate caches
    await geocodeCity("London", "key");
    await fetchCurrentWeather(51.5074, -0.1278, "metric", "en", "key");

    const statsBefore = getCacheStats();
    expect(statsBefore.geoEntries).toBeGreaterThan(0);
    expect(statsBefore.weatherEntries).toBeGreaterThan(0);

    // Clear caches
    clearCache();

    const statsAfter = getCacheStats();
    expect(statsAfter.geoEntries).toBe(0);
    expect(statsAfter.weatherEntries).toBe(0);
  });
});

describe("getCacheStats", () => {
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    clearCache();
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("should return correct cache statistics", async () => {
    globalThis.fetch = mock((url: string) => {
      if (url.includes("/geo/")) {
        return Promise.resolve(createMockResponse(mockGeocodingResponse));
      }
      return Promise.resolve(createMockResponse(mockWeatherResponse));
    });

    // Empty caches
    let stats = getCacheStats();
    expect(stats.geoEntries).toBe(0);
    expect(stats.weatherEntries).toBe(0);

    // Add geocoding entry
    await geocodeCity("London", "key");
    stats = getCacheStats();
    expect(stats.geoEntries).toBe(1);
    expect(stats.weatherEntries).toBe(0);

    // Add weather entry
    await fetchCurrentWeather(51.5074, -0.1278, "metric", "en", "key");
    stats = getCacheStats();
    expect(stats.geoEntries).toBe(1);
    expect(stats.weatherEntries).toBe(1);
  });
});

describe("Error handling edge cases", () => {
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    clearCache();
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("should handle network errors gracefully", async () => {
    globalThis.fetch = mock(() => 
      Promise.reject(new Error("Network error"))
    );

    try {
      await geocodeCity("London", "key");
    } catch (error) {
      expect(error).toBeInstanceOf(OpenWeatherError);
      expect((error as OpenWeatherError).statusCode).toBe(503);
    }
  });

  it("should handle timeout errors", async () => {
    globalThis.fetch = mock(() => {
      const error = new DOMException("Timeout", "TimeoutError");
      return Promise.reject(error);
    });

    try {
      await geocodeCity("London", "key");
    } catch (error) {
      expect(error).toBeInstanceOf(OpenWeatherError);
      expect((error as OpenWeatherError).statusCode).toBe(504);
      expect((error as OpenWeatherError).errorMessage).toContain("timeout");
    }
  });

  it("should handle JSON parse errors in error response", async () => {
    globalThis.fetch = mock(() => 
      Promise.resolve({
        ok: false,
        status: 500,
        json: () => Promise.reject(new Error("Invalid JSON")),
      } as Response)
    );

    try {
      await geocodeCity("London", "key");
    } catch (error) {
      expect(error).toBeInstanceOf(OpenWeatherError);
      // Should use default message when JSON parsing fails
    }
  });
});

describe("Snapshot tests for response transformation", () => {
  it("should match expected response structure for metric units", () => {
    const result = transformWeatherResponse(mockWeatherResponse, "metric", false);

    // Verify the complete structure matches our schema
    expect(result).toHaveProperty("location");
    expect(result).toHaveProperty("weather");
    expect(result).toHaveProperty("temperature");
    expect(result).toHaveProperty("wind");
    expect(result).toHaveProperty("atmosphere");
    expect(result).toHaveProperty("timestamp");
    expect(result).toHaveProperty("cached");

    // Location structure
    expect(result.location).toHaveProperty("name");
    expect(result.location).toHaveProperty("country");
    expect(result.location).toHaveProperty("coordinates");
    expect(result.location).toHaveProperty("timezone");
    expect(result.location).toHaveProperty("sunrise");
    expect(result.location).toHaveProperty("sunset");

    // Temperature structure
    expect(result.temperature).toHaveProperty("current");
    expect(result.temperature).toHaveProperty("feels_like");
    expect(result.temperature).toHaveProperty("min");
    expect(result.temperature).toHaveProperty("max");
    expect(result.temperature).toHaveProperty("unit");
  });

  it("should match expected response structure with precipitation", () => {
    const result = transformWeatherResponse(
      mockWeatherResponseWithPrecipitation,
      "metric",
      false
    );

    expect(result.precipitation).toBeDefined();
    expect(result.precipitation).toHaveProperty("rain");
    expect(result.precipitation).toHaveProperty("snow");
  });
});
