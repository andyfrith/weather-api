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
import { getText } from "../services/ollamaai.service";
import { AITextResponseSchema } from "../schemas/ai.schema";

/**
 * Environment bindings type definition
 */
type Bindings = {
  OLLAMA_HOST: string;
  OLLAMA_MODEL: string;
};

/**
 * Create a new Hono app instance with OpenAPI support
 */
const aiOllamaApp = new OpenAPIHono<{ Bindings: Bindings }>();

/**
 * Route definition for POST /ai/text
 * Returns the text of the response from the AI service.
 */
const textRoute = createRoute({
  method: "post",
  path: "/ai/ollama/text",
  tags: ["AI"],
  summary: "Text",
  description: "Returns the text of the Ollama AI service.",
  request: {
    body: {
      content: {
        "application/json": {
          schema: AIQuerySchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: "Ollama AI text data retrieved successfully",
      content: {
        "application/json": {
          schema: AITextResponseSchema,
        },
      },
    },
  },
});

// Register the text route handler
aiOllamaApp.openapi(textRoute, async (c) => {
  const query = c.req.valid("json");

  // In Bun runtime, environment variables are accessed via process.env
  const ollamaHost = process.env.OLLAMA_HOST;
  const ollamaModel = process.env.OLLAMA_MODEL;

  if (!ollamaHost) {
    throw new HTTPException(500, {
      message: "Ollama host not configured",
    });
  }

  if (!ollamaModel) {
    throw new HTTPException(500, {
      message: "Ollama model not configured",
    });
  }

  try {
    const textData = await getText(query, ollamaHost, ollamaModel);
    return c.json(textData, 200);
  } catch (error) {
    throw error;
  }
});

export { aiOllamaApp };
export type { Bindings };
