/**
 * Sentry Instrumentation
 *
 * This module provides Sentry error tracking and performance monitoring.
 * It detects the runtime environment and only initializes @sentry/bun when
 * running in the Bun runtime (not in Cloudflare Workers).
 *
 * IMPORTANT: This file must be imported before any other application code.
 *
 * @module instrument
 */

/**
 * Check if we're running in the Bun runtime
 */
const isBunRuntime = typeof globalThis.Bun !== "undefined";

/**
 * Minimal Sentry interface for cross-runtime compatibility
 */
interface SentryLike {
  init: (...args: unknown[]) => void;
  captureException: (err: unknown, context?: unknown) => string;
  captureMessage: (message: string, level?: unknown) => string;
  setUser: (...args: unknown[]) => void;
  setTag: (...args: unknown[]) => void;
  setExtra: (...args: unknown[]) => void;
  addBreadcrumb: (...args: unknown[]) => void;
  withScope: (callback: (scope: unknown) => void) => void;
}

/**
 * Sentry instance - only loaded when running in Bun
 */
let Sentry: SentryLike | null = null;

/**
 * No-op Sentry stub for Cloudflare Workers environment
 * Provides the same interface but does nothing
 */
const SentryStub: SentryLike = {
  init: () => {},
  captureException: (err: unknown, _context?: unknown) => {
    console.error("[Sentry Stub] Exception captured:", err);
    return "";
  },
  captureMessage: (message: string, _level?: unknown) => {
    console.log("[Sentry Stub] Message captured:", message);
    return "";
  },
  setUser: () => {},
  setTag: () => {},
  setExtra: () => {},
  addBreadcrumb: () => {},
  withScope: (callback: (scope: unknown) => void) => callback({}),
};

/**
 * Initializes Sentry with configuration for the Weather API.
 * Only initializes when running in Bun runtime.
 * Reads SENTRY_DSN from environment variables.
 */
export async function initSentry(): Promise<void> {
  if (!isBunRuntime) {
    console.log(
      "[Sentry] Not running in Bun runtime (likely Cloudflare Workers). Using stub."
    );
    return;
  }

  // Dynamically import @sentry/bun only when in Bun runtime
  try {
    Sentry = (await import("@sentry/bun")) as unknown as SentryLike;
  } catch (err) {
    console.warn("[Sentry] Failed to load @sentry/bun:", err);
    return;
  }

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
    beforeSendTransaction(event: { transaction?: string }) {
      if (
        event.transaction === "GET /health" ||
        event.transaction === "GET /"
      ) {
        return null;
      }
      return event;
    },
  });

  console.log("[Sentry] Initialized successfully");
}

/**
 * Get the Sentry instance (real or stub based on runtime)
 */
export function getSentry(): SentryLike {
  return Sentry ?? SentryStub;
}

// Export the interface and stub for use in other modules
export type { SentryLike };
export { SentryStub };
