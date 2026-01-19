import { z } from "@hono/zod-openapi";

/**
 * Zod schemas for AI API responses and OpenAPI documentation
 * These schemas define the public API contract and are registered as OpenAPI components
 */

/**
 * Query parameter schema for AI requests
 */
export const AIQuerySchema = z
  .object({
    prompt: z.string().openapi({
      description: "AI message (e.g., 'Write a short poem about coding.')",
      example: "Write a short poem about coding.",
    }),
  })
  .openapi("AIQuery");

/**
 * Complete schema for OpenAI text API response
 */
export const AITextResponseSchema = z.object({
  text: z.string().describe("text response from AI"),
});

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
      example: "AI response not found",
    }),
    details: z.string().optional().openapi({
      description: "Additional error details",
      example: "No AI response found for the provided prompt",
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

// Type exports for use throughout the application
export type AIQuery = z.infer<typeof AIQuerySchema>;
export type AITextResponse = z.infer<typeof AITextResponseSchema>;
export type ErrorDetails = z.infer<typeof ErrorDetailsSchema>;
export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;
