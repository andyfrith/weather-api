import { z } from "zod";

/**
 * Zod schemas for Weather API responses and OpenAPI documentation
 * These schemas define the public API contract
 */

/**
 * Query parameter schema for weather requests
 */
export const WeatherQuerySchema = z.object({
  city: z
    .string()
    .min(1)
    .describe("City name (e.g., 'London', 'New York', 'Tokyo')"),
  units: z
    .enum(["metric", "imperial"])
    .default("metric")
    .describe("Temperature units: 'metric' (Celsius) or 'imperial' (Fahrenheit)"),
  lang: z
    .string()
    .length(2)
    .default("en")
    .optional()
    .describe("Language code for descriptions (e.g., 'en', 'es', 'fr')"),
});

/**
 * Schema for weather condition in API response
 */
export const WeatherConditionResponseSchema = z.object({
  id: z.number().openapi({ example: 800 }),
  main: z.string().openapi({ example: "Clear" }),
  description: z.string().openapi({ example: "clear sky" }),
  icon: z.string().openapi({ example: "01d" }),
});

/**
 * Schema for temperature data in API response
 */
export const TemperatureResponseSchema = z.object({
  current: z.number().openapi({ example: 22.5 }),
  feels_like: z.number().openapi({ example: 21.8 }),
  min: z.number().openapi({ example: 19.0 }),
  max: z.number().openapi({ example: 25.0 }),
  unit: z.enum(["°C", "°F"]).openapi({ example: "°C" }),
});

/**
 * Schema for wind data in API response
 */
export const WindResponseSchema = z.object({
  speed: z.number().openapi({ example: 5.2 }),
  direction: z.number().openapi({ example: 180 }),
  gust: z.number().optional().openapi({ example: 7.8 }),
  unit: z.enum(["m/s", "mph"]).openapi({ example: "m/s" }),
});

/**
 * Schema for atmospheric data in API response
 */
export const AtmosphereResponseSchema = z.object({
  humidity: z.number().openapi({ example: 65 }),
  pressure: z.number().openapi({ example: 1013 }),
  visibility: z.number().openapi({ example: 10000 }),
  cloudiness: z.number().openapi({ example: 20 }),
});

/**
 * Schema for location data in API response
 */
export const LocationResponseSchema = z.object({
  name: z.string().openapi({ example: "London" }),
  country: z.string().openapi({ example: "GB" }),
  coordinates: z.object({
    lat: z.number().openapi({ example: 51.5074 }),
    lon: z.number().openapi({ example: -0.1278 }),
  }),
  timezone: z.number().openapi({ example: 0 }),
  sunrise: z.string().datetime().openapi({ example: "2024-01-15T07:45:00Z" }),
  sunset: z.string().datetime().openapi({ example: "2024-01-15T16:30:00Z" }),
});

/**
 * Schema for precipitation data in API response
 */
export const PrecipitationResponseSchema = z.object({
  rain: z
    .object({
      "1h": z.number().optional().openapi({ example: 0.5 }),
      "3h": z.number().optional().openapi({ example: 1.2 }),
    })
    .optional(),
  snow: z
    .object({
      "1h": z.number().optional().openapi({ example: 0.0 }),
      "3h": z.number().optional().openapi({ example: 0.0 }),
    })
    .optional(),
});

/**
 * Complete schema for current weather API response
 */
export const CurrentWeatherResponseSchema = z.object({
  location: LocationResponseSchema,
  weather: WeatherConditionResponseSchema,
  temperature: TemperatureResponseSchema,
  wind: WindResponseSchema,
  atmosphere: AtmosphereResponseSchema,
  precipitation: PrecipitationResponseSchema.optional(),
  timestamp: z.string().datetime().openapi({ example: "2024-01-15T12:00:00Z" }),
  cached: z.boolean().openapi({ example: false }),
});

/**
 * Schema for API error response
 */
export const ErrorResponseSchema = z.object({
  error: z.object({
    code: z.number().openapi({ example: 404 }),
    message: z.string().openapi({ example: "City not found" }),
    details: z.string().optional().openapi({ example: "No location found for the provided city name" }),
  }),
});

/**
 * Schema for rate limit error response
 */
export const RateLimitErrorSchema = z.object({
  error: z.object({
    code: z.literal(429).openapi({ example: 429 }),
    message: z.literal("Rate limit exceeded").openapi({ example: "Rate limit exceeded" }),
    retryAfter: z.number().optional().openapi({ example: 60 }),
  }),
});

/**
 * Schema for health check response
 */
export const HealthCheckResponseSchema = z.object({
  status: z.enum(["healthy", "degraded", "unhealthy"]).openapi({ example: "healthy" }),
  timestamp: z.string().datetime().openapi({ example: "2024-01-15T12:00:00Z" }),
  version: z.string().openapi({ example: "1.0.0" }),
  uptime: z.number().openapi({ example: 3600 }),
});

// Type exports for use throughout the application
export type WeatherQuery = z.infer<typeof WeatherQuerySchema>;
export type WeatherConditionResponse = z.infer<typeof WeatherConditionResponseSchema>;
export type TemperatureResponse = z.infer<typeof TemperatureResponseSchema>;
export type WindResponse = z.infer<typeof WindResponseSchema>;
export type AtmosphereResponse = z.infer<typeof AtmosphereResponseSchema>;
export type LocationResponse = z.infer<typeof LocationResponseSchema>;
export type PrecipitationResponse = z.infer<typeof PrecipitationResponseSchema>;
export type CurrentWeatherResponse = z.infer<typeof CurrentWeatherResponseSchema>;
export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;
export type RateLimitError = z.infer<typeof RateLimitErrorSchema>;
export type HealthCheckResponse = z.infer<typeof HealthCheckResponseSchema>;
