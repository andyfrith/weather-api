import { streamText } from "ai";
import { AIQuery, AITextResponse } from "../schemas/ai.schema";
import { createOpenAI } from "@ai-sdk/openai";

/**
 * Main service function to generate AI text for a prompt
 * `@param` query - AI query parameters
 * `@param` apiKey - OpenAI API key
 * `@returns` AI text response
 * `@throws` Error on any AI API errors
 */
export async function getText(
  query: AIQuery,
  apiKey: string
): Promise<AITextResponse> {
  const { prompt } = query;
  if (!prompt) {
    throw new Error("Prompt is required");
  }
  const client = createOpenAI({ apiKey });
  const result = await streamText({
    model: client("gpt-4o"),
    prompt,
  });
  return { text: await result.text };
}
