/**
 * Weather API - Main Application Entry Point
 *
 * This is the main entry point for the Weather API service.
 * It sets up the Hono application with OpenAPI support, mounts routes,
 * and configures global error handling with Sentry integration.
 *
 * @module index
 */

// IMPORTANT: Import Sentry instrumentation first before any other modules
import "./instrument";
import { Sentry } from "./instrument";

import { OpenAPIHono } from "@hono/zod-openapi";
import { swaggerUI } from "@hono/swagger-ui";
import { HTTPException } from "hono/http-exception";
import { weatherApp, type Bindings } from "./routes";

/**
 * Create the main OpenAPI Hono application
 */
const app = new OpenAPIHono<{ Bindings: Bindings }>();

/**
 * Global error handler
 * Captures errors in Sentry and returns appropriate JSON responses
 */
app.onError((err, c) => {
  // Capture the error in Sentry
  Sentry.captureException(err, {
    extra: {
      path: c.req.path,
      method: c.req.method,
      query: c.req.query(),
    },
  });

  // Handle HTTPException (already formatted errors)
  if (err instanceof HTTPException) {
    // If the error already has a response, return it
    if (err.res) {
      return err.res;
    }

    return c.json(
      {
        error: {
          code: err.status,
          message: err.message,
        },
      },
      err.status
    );
  }

  // Handle unexpected errors
  console.error("Unhandled error:", err);

  return c.json(
    {
      error: {
        code: 500,
        message: "Internal server error",
        details:
          process.env.NODE_ENV === "development" ? err.message : undefined,
      },
    },
    500
  );
});

/**
 * Global 404 handler
 */
app.notFound((c) => {
  return c.json(
    {
      error: {
        code: 404,
        message: "Not found",
        details: `Route ${c.req.method} ${c.req.path} not found`,
      },
    },
    404
  );
});

/**
 * Root endpoint - API information
 */
app.get("/", (c) => {
  return c.json({
    name: "Weather API",
    version: "1.0.0",
    description: "A RESTful API for weather data powered by OpenWeather",
    documentation: "/doc",
    endpoints: {
      health: "/health",
      currentWeather: "/weather/current",
      openapi: "/openapi.json",
    },
  });
});

/**
 * Mount weather routes
 */
app.route("/", weatherApp);

/**
 * OpenAPI documentation endpoint
 * Serves the OpenAPI specification as JSON
 */
app.doc("/openapi.json", {
  openapi: "3.1.0",
  info: {
    title: "Weather API",
    version: "1.0.0",
    description:
      "A RESTful API service that provides current weather data for cities worldwide. " +
      "Powered by OpenWeather API with intelligent caching and comprehensive error handling.",
    contact: {
      name: "API Support",
    },
    license: {
      name: "MIT",
    },
  },
  servers: [
    {
      url: "http://localhost:3000",
      description: "Development server",
    },
  ],
  tags: [
    {
      name: "Weather",
      description: "Weather data endpoints",
    },
    {
      name: "Health",
      description: "Service health and status endpoints",
    },
  ],
});

/**
 * Swagger UI endpoint
 * Provides interactive API documentation
 */
app.get("/doc", swaggerUI({ url: "/openapi.json" }));

/**
 * Export the app for Bun to serve
 */
export default {
  port: process.env.PORT ? parseInt(process.env.PORT, 10) : 3000,
  fetch: app.fetch,
};
