/**
 * AI API Routes
 *
 * Defines routes for AI endpoints using Hono + Zod OpenAPI.
 * Handles request validation, response documentation, and error mapping.
 *
 * @module routes/ai
 */
import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { HTTPException } from "hono/http-exception";
import { AIQuerySchema } from "../schemas";
import { getText } from "../services/googleai.service";
import { AITextResponseSchema } from "../schemas/ai.schema";

/**
 * Environment bindings type definition
 */
type Bindings = {
  GEMINI_API_KEY: string;
};

/**
 * Create a new Hono app instance with OpenAPI support
 */
const aiApp = new OpenAPIHono<{ Bindings: Bindings }>();

/**
 * Route definition for POST /ai/text
 * Returns the text of the response from the AI service.
 */
const textRoute = createRoute({
  method: "post",
  path: "/ai/text",
  tags: ["AI"],
  summary: "Text",
  description: "Returns the text of the AI service.",
  request: {
    query: AIQuerySchema,
  },
  responses: {
    200: {
      description: "AI text data retrieved successfully",
      content: {
        "application/json": {
          schema: AITextResponseSchema,
        },
      },
    },
  },
});

// Register the text route handler
aiApp.openapi(textRoute, async (c) => {
  const query = c.req.valid("query");

  // In Bun runtime, environment variables are accessed via process.env
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new HTTPException(500, {
      message: "Google AI API key not configured",
    });
  }

  try {
    const textData = await getText(query, apiKey);
    return c.json(textData, 200);
  } catch (error) {
    throw error;
  }
});

export { aiApp };
export type { Bindings };
