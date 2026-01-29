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
import { initSentry, getSentry } from "./instrument";

// Initialize Sentry (async, but we don't need to wait for it)
initSentry();

import { OpenAPIHono } from "@hono/zod-openapi";
import { swaggerUI } from "@hono/swagger-ui";
import { cors } from "hono/cors";
import { HTTPException } from "hono/http-exception";
import { rateLimiter } from "hono-rate-limiter";
import {
  aiApp,
  aiOllamaApp,
  weatherApp,
  type AIBindings,
  type WeatherBindings,
} from "./routes";

/**
 * Check if we're running in Bun runtime (vs Cloudflare Workers)
 * Used to conditionally load Cloudflare-specific modules
 */
const isBunRuntime =
  typeof (globalThis as Record<string, unknown>).Bun !== "undefined";

/**
 * Rate limiter bindings for Cloudflare KV
 * Optional because KV is only available in Cloudflare Workers
 */
type RateLimiterBindings = {
  RATE_LIMITER?: KVNamespace;
};

type Bindings = WeatherBindings & AIBindings & RateLimiterBindings;

/**
 * Create the main OpenAPI Hono application
 */
const app = new OpenAPIHono<{ Bindings: Bindings }>();

/**
 * Configure CORS middleware
 * Allows requests from the frontend development server
 */
app.use(
  "*",
  cors({
    origin: "http://localhost:5173",
  }),
);

/**
 * Rate limiting middleware
 * - In Cloudflare Workers: Uses KV store for distributed rate limiting
 * - In Bun: Uses default in-memory store for local development
 *
 * Configuration:
 * - windowMs: 3 minutes
 * - limit: 25 requests per window per client
 * - Uses cf-connecting-ip header (set by Cloudflare) for client identification
 */
app.use("*", async (c, next) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let store: any = undefined;

  // Only use Cloudflare KV store when running in Workers (not Bun)
  if (!isBunRuntime && c.env.RATE_LIMITER) {
    try {
      // Dynamic import to avoid 'cloudflare:workers' error in Bun
      const { WorkersKVStore } = await import("@hono-rate-limiter/cloudflare");
      store = new WorkersKVStore({ namespace: c.env.RATE_LIMITER as any });
    } catch {
      console.warn("[Rate Limiter] Failed to load KV store, using in-memory");
    }
  }

  const middleware = rateLimiter<{ Bindings: Bindings }>({
    windowMs: 3 * 60 * 1000, // 3 minutes
    limit: 25, // Limit each client to 25 requests per window
    store, // undefined = default in-memory store
    keyGenerator: (c) => {
      // Use Cloudflare's cf-connecting-ip header (most reliable in CF environment)
      // Fallback to x-forwarded-for or x-real-ip for local development
      return (
        c.req.header("cf-connecting-ip") ??
        c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ??
        c.req.header("x-real-ip") ??
        "unknown"
      );
    },
  });
  return middleware(c, next);
});

/**
 * Global error handler
 * Captures errors in Sentry and returns appropriate JSON responses
 */
app.onError((err, c) => {
  // Capture the error in Sentry
  getSentry().captureException(err, {
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
      err.status,
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
    500,
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
    404,
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
 * Mount AI routes
 */
app.route("/", aiApp);

/**
 * Mount Ollama AI routes
 */
app.route("/", aiOllamaApp);

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
      name: "AI",
      description: "AI data endpoints",
    },
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
// export default {
//   port: process.env.PORT ? parseInt(process.env.PORT, 10) : 3000,
//   fetch: app.fetch,
//   idleTimeout: 20,
// };
export default app;
