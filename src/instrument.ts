/**
 * Sentry Instrumentation for Bun Runtime
 *
 * This module initializes Sentry error tracking and performance monitoring.
 * IMPORTANT: This file must be imported before any other application code.
 *
 * @module instrument
 */

import * as Sentry from "@sentry/bun";

/**
 * Initializes Sentry with configuration for the Weather API.
 * Reads SENTRY_DSN from environment variables.
 */
export function initSentry(): void {
  const dsn = process.env.SENTRY_DSN;

  if (!dsn) {
    console.warn(
      "[Sentry] SENTRY_DSN environment variable not set. Error tracking disabled."
    );
    return;
  }

  Sentry.init({
    dsn,

    // Environment identification
    environment: process.env.NODE_ENV || "development",

    // Send default PII data (e.g., IP addresses)
    sendDefaultPii: true,

    // Performance monitoring sample rate (1.0 = 100% of transactions)
    tracesSampleRate: process.env.NODE_ENV === "production" ? 0.2 : 1.0,

    // Attach stack traces to pure capture message calls
    attachStacktrace: true,

    // Filter out health check endpoints from transactions
    beforeSendTransaction(event) {
      if (event.transaction === "GET /health" || event.transaction === "GET /") {
        return null;
      }
      return event;
    },
  });

  console.log("[Sentry] Initialized successfully");
}

// Auto-initialize on import
initSentry();

// Re-export Sentry for use in other modules
export { Sentry };
