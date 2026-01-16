/**
 * Weather API Routes
 *
 * Defines OpenAPI routes for weather endpoints using Hono + Zod OpenAPI.
 * Handles request validation, response documentation, and error mapping.
 *
 * @module routes/weather
 */

import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { HTTPException } from "hono/http-exception";
import {
  WeatherQuerySchema,
  CurrentWeatherResponseSchema,
  ErrorResponseSchema,
  RateLimitErrorSchema,
  HealthCheckResponseSchema,
} from "../schemas";
import {
  getCurrentWeather,
  OpenWeatherError,
  getCacheStats,
} from "../services";

/**
 * Environment bindings type definition
 */
type Bindings = {
  OPENWEATHER_API_KEY: string;
};

/**
 * Create a new Hono app instance with OpenAPI support
 */
const weatherApp = new OpenAPIHono<{ Bindings: Bindings }>();

/**
 * Route definition for GET /weather/current
 * Retrieves current weather data for a specified city
 */
const getCurrentWeatherRoute = createRoute({
  method: "get",
  path: "/weather/current",
  tags: ["Weather"],
  summary: "Get current weather",
  description:
    "Retrieves current weather data for a specified city using the OpenWeather API.",
  request: {
    query: WeatherQuerySchema.openapi("WeatherQuery"),
  },
  responses: {
    200: {
      description: "Current weather data retrieved successfully",
      content: {
        "application/json": {
          schema: CurrentWeatherResponseSchema,
        },
      },
    },
    400: {
      description: "Invalid request parameters",
      content: {
        "application/json": {
          schema: ErrorResponseSchema,
        },
      },
    },
    401: {
      description: "Invalid API key",
      content: {
        "application/json": {
          schema: ErrorResponseSchema,
        },
      },
    },
    404: {
      description: "City not found",
      content: {
        "application/json": {
          schema: ErrorResponseSchema,
        },
      },
    },
    429: {
      description: "Rate limit exceeded",
      content: {
        "application/json": {
          schema: RateLimitErrorSchema,
        },
      },
    },
    500: {
      description: "Internal server error",
      content: {
        "application/json": {
          schema: ErrorResponseSchema,
        },
      },
    },
    503: {
      description: "Service unavailable - OpenWeather API unreachable",
      content: {
        "application/json": {
          schema: ErrorResponseSchema,
        },
      },
    },
    504: {
      description: "Gateway timeout - OpenWeather API timed out",
      content: {
        "application/json": {
          schema: ErrorResponseSchema,
        },
      },
    },
  },
});

/**
 * Route definition for GET /health
 * Returns service health status and uptime information
 */
const healthCheckRoute = createRoute({
  method: "get",
  path: "/health",
  tags: ["Health"],
  summary: "Health check",
  description: "Returns the health status of the Weather API service.",
  responses: {
    200: {
      description: "Service is healthy",
      content: {
        "application/json": {
          schema: HealthCheckResponseSchema,
        },
      },
    },
  },
});

/**
 * Service start time for uptime calculation
 */
const startTime = Date.now();

/**
 * Maps OpenWeatherError to appropriate HTTPException
 * @param error - OpenWeather service error
 * @returns HTTPException with proper status and message
 */
function mapToHTTPException(error: OpenWeatherError): HTTPException {
  const errorResponse = {
    error: {
      code: error.statusCode,
      message: error.errorMessage,
    },
  };

  return new HTTPException(
    error.statusCode as 400 | 401 | 404 | 429 | 500 | 503 | 504,
    {
      message: error.errorMessage,
      res: new Response(JSON.stringify(errorResponse), {
        status: error.statusCode,
        headers: { "Content-Type": "application/json" },
      }),
    }
  );
}

// Register the current weather route handler
weatherApp.openapi(getCurrentWeatherRoute, async (c) => {
  const query = c.req.valid("query");
  // In Bun runtime, environment variables are accessed via process.env
  const apiKey = process.env.OPENWEATHER_API_KEY;

  if (!apiKey) {
    throw new HTTPException(500, {
      message: "OpenWeather API key not configured",
    });
  }

  try {
    const weatherData = await getCurrentWeather(query, apiKey);
    return c.json(weatherData, 200);
  } catch (error) {
    if (error instanceof OpenWeatherError) {
      throw mapToHTTPException(error);
    }
    throw error;
  }
});

// Register the health check route handler
weatherApp.openapi(healthCheckRoute, (c) => {
  const cacheStats = getCacheStats();
  const uptimeSeconds = Math.floor((Date.now() - startTime) / 1000);

  return c.json(
    {
      status: "healthy" as const,
      timestamp: new Date().toISOString(),
      version: "1.0.0",
      uptime: uptimeSeconds,
    },
    200
  );
});

export { weatherApp };
export type { Bindings };
