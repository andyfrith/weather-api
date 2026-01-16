import { z } from "@hono/zod-openapi";

/**
 * Zod schemas for Weather API responses and OpenAPI documentation
 * These schemas define the public API contract and are registered as OpenAPI components
 */

/**
 * Query parameter schema for weather requests
 */
export const WeatherQuerySchema = z
  .object({
    city: z.string().min(1).openapi({
      description: "City name (e.g., 'London', 'New York', 'Tokyo')",
      example: "London",
    }),
    units: z.enum(["metric", "imperial"]).default("metric").openapi({
      description:
        "Temperature units: 'metric' (Celsius) or 'imperial' (Fahrenheit)",
      example: "metric",
    }),
    lang: z.string().length(2).default("en").optional().openapi({
      description: "Language code for descriptions (e.g., 'en', 'es', 'fr')",
      example: "en",
    }),
  })
  .openapi("WeatherQuery");

/**
 * Schema for geographic coordinates in API response
 */
export const CoordinatesResponseSchema = z
  .object({
    lat: z.number().openapi({
      description: "Latitude",
      example: 51.5074,
    }),
    lon: z.number().openapi({
      description: "Longitude",
      example: -0.1278,
    }),
  })
  .openapi("Coordinates");

/**
 * Schema for weather condition in API response
 */
export const WeatherConditionResponseSchema = z
  .object({
    id: z.number().openapi({
      description: "Weather condition ID",
      example: 800,
    }),
    main: z.string().openapi({
      description: "Group of weather parameters",
      example: "Clear",
    }),
    description: z.string().openapi({
      description: "Weather condition description",
      example: "clear sky",
    }),
    icon: z.string().openapi({
      description: "Weather icon ID",
      example: "01d",
    }),
  })
  .openapi("WeatherCondition");

/**
 * Schema for temperature data in API response
 */
export const TemperatureResponseSchema = z
  .object({
    current: z.number().openapi({
      description: "Current temperature",
      example: 22.5,
    }),
    feels_like: z.number().openapi({
      description: "Human perception of temperature",
      example: 21.8,
    }),
    min: z.number().openapi({
      description: "Minimum temperature",
      example: 19.0,
    }),
    max: z.number().openapi({
      description: "Maximum temperature",
      example: 25.0,
    }),
    unit: z.enum(["°C", "°F"]).openapi({
      description: "Temperature unit",
      example: "°C",
    }),
  })
  .openapi("Temperature");

/**
 * Schema for wind data in API response
 */
export const WindResponseSchema = z
  .object({
    speed: z.number().openapi({
      description: "Wind speed",
      example: 5.2,
    }),
    direction: z.number().openapi({
      description: "Wind direction in degrees",
      example: 180,
    }),
    gust: z.number().optional().openapi({
      description: "Wind gust speed",
      example: 7.8,
    }),
    unit: z.enum(["m/s", "mph"]).openapi({
      description: "Wind speed unit",
      example: "m/s",
    }),
  })
  .openapi("Wind");

/**
 * Schema for atmospheric data in API response
 */
export const AtmosphereResponseSchema = z
  .object({
    humidity: z.number().openapi({
      description: "Humidity percentage",
      example: 65,
    }),
    pressure: z.number().openapi({
      description: "Atmospheric pressure in hPa",
      example: 1013,
    }),
    visibility: z.number().openapi({
      description: "Visibility in meters",
      example: 10000,
    }),
    cloudiness: z.number().openapi({
      description: "Cloudiness percentage",
      example: 20,
    }),
  })
  .openapi("Atmosphere");

/**
 * Schema for location data in API response
 */
export const LocationResponseSchema = z
  .object({
    name: z.string().openapi({
      description: "City name",
      example: "London",
    }),
    country: z.string().openapi({
      description: "Country code",
      example: "GB",
    }),
    coordinates: CoordinatesResponseSchema,
    timezone: z.number().openapi({
      description: "Timezone offset from UTC in seconds",
      example: 0,
    }),
    sunrise: z.string().datetime().openapi({
      description: "Sunrise time in ISO 8601 format",
      example: "2024-01-15T07:45:00Z",
    }),
    sunset: z.string().datetime().openapi({
      description: "Sunset time in ISO 8601 format",
      example: "2024-01-15T16:30:00Z",
    }),
  })
  .openapi("Location");

/**
 * Schema for rain volume data
 */
export const RainVolumeSchema = z
  .object({
    "1h": z.number().optional().openapi({
      description: "Rain volume for the last 1 hour in mm",
      example: 0.5,
    }),
    "3h": z.number().optional().openapi({
      description: "Rain volume for the last 3 hours in mm",
      example: 1.2,
    }),
  })
  .openapi("RainVolume");

/**
 * Schema for snow volume data
 */
export const SnowVolumeSchema = z
  .object({
    "1h": z.number().optional().openapi({
      description: "Snow volume for the last 1 hour in mm",
      example: 0.0,
    }),
    "3h": z.number().optional().openapi({
      description: "Snow volume for the last 3 hours in mm",
      example: 0.0,
    }),
  })
  .openapi("SnowVolume");

/**
 * Schema for precipitation data in API response
 */
export const PrecipitationResponseSchema = z
  .object({
    rain: RainVolumeSchema.optional(),
    snow: SnowVolumeSchema.optional(),
  })
  .openapi("Precipitation");

/**
 * Complete schema for current weather API response
 */
export const CurrentWeatherResponseSchema = z
  .object({
    location: LocationResponseSchema,
    weather: WeatherConditionResponseSchema,
    temperature: TemperatureResponseSchema,
    wind: WindResponseSchema,
    atmosphere: AtmosphereResponseSchema,
    precipitation: PrecipitationResponseSchema.optional(),
    timestamp: z.string().datetime().openapi({
      description: "Data calculation timestamp in ISO 8601 format",
      example: "2024-01-15T12:00:00Z",
    }),
    cached: z.boolean().openapi({
      description: "Whether the response was served from cache",
      example: false,
    }),
  })
  .openapi("CurrentWeatherResponse");

/**
 * Schema for error details
 */
export const ErrorDetailsSchema = z
  .object({
    code: z.number().openapi({
      description: "HTTP error code",
      example: 404,
    }),
    message: z.string().openapi({
      description: "Error message",
      example: "City not found",
    }),
    details: z.string().optional().openapi({
      description: "Additional error details",
      example: "No location found for the provided city name",
    }),
  })
  .openapi("ErrorDetails");

/**
 * Schema for API error response
 */
export const ErrorResponseSchema = z
  .object({
    error: ErrorDetailsSchema,
  })
  .openapi("ErrorResponse");

/**
 * Schema for rate limit error details
 */
export const RateLimitErrorDetailsSchema = z
  .object({
    code: z.literal(429).openapi({
      description: "Rate limit error code",
      example: 429,
    }),
    message: z.literal("Rate limit exceeded").openapi({
      description: "Rate limit error message",
      example: "Rate limit exceeded",
    }),
    retryAfter: z.number().optional().openapi({
      description: "Seconds to wait before retrying",
      example: 60,
    }),
  })
  .openapi("RateLimitErrorDetails");

/**
 * Schema for rate limit error response
 */
export const RateLimitErrorSchema = z
  .object({
    error: RateLimitErrorDetailsSchema,
  })
  .openapi("RateLimitError");

/**
 * Schema for health check response
 */
export const HealthCheckResponseSchema = z
  .object({
    status: z.enum(["healthy", "degraded", "unhealthy"]).openapi({
      description: "Service health status",
      example: "healthy",
    }),
    timestamp: z.string().datetime().openapi({
      description: "Current timestamp in ISO 8601 format",
      example: "2024-01-15T12:00:00Z",
    }),
    version: z.string().openapi({
      description: "API version",
      example: "1.0.0",
    }),
    uptime: z.number().openapi({
      description: "Service uptime in seconds",
      example: 3600,
    }),
  })
  .openapi("HealthCheckResponse");

// Type exports for use throughout the application
export type WeatherQuery = z.infer<typeof WeatherQuerySchema>;
export type CoordinatesResponse = z.infer<typeof CoordinatesResponseSchema>;
export type WeatherConditionResponse = z.infer<
  typeof WeatherConditionResponseSchema
>;
export type TemperatureResponse = z.infer<typeof TemperatureResponseSchema>;
export type WindResponse = z.infer<typeof WindResponseSchema>;
export type AtmosphereResponse = z.infer<typeof AtmosphereResponseSchema>;
export type LocationResponse = z.infer<typeof LocationResponseSchema>;
export type RainVolume = z.infer<typeof RainVolumeSchema>;
export type SnowVolume = z.infer<typeof SnowVolumeSchema>;
export type PrecipitationResponse = z.infer<typeof PrecipitationResponseSchema>;
export type CurrentWeatherResponse = z.infer<
  typeof CurrentWeatherResponseSchema
>;
export type ErrorDetails = z.infer<typeof ErrorDetailsSchema>;
export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;
export type RateLimitErrorDetails = z.infer<typeof RateLimitErrorDetailsSchema>;
export type RateLimitError = z.infer<typeof RateLimitErrorSchema>;
export type HealthCheckResponse = z.infer<typeof HealthCheckResponseSchema>;
