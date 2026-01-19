import { streamText } from "ai";
import { AIQuery, AITextResponse } from "../schemas/ai.schema";
import { openai } from "@ai-sdk/openai";
/**
 * Main service function to get current weather for a city
 * Handles geocoding, caching, and response transformation
 * @param query - Weather query parameters
 * @param apiKey - OpenWeather API key
 * @returns Current weather response
 * @throws OpenWeatherError on any API errors
 */
export async function getText(
  query: AIQuery,
  apiKey: string
): Promise<AITextResponse> {
  const { prompt } = query;
  if (!prompt) {
    throw new Error("Prompt is required");
  }
  const result = streamText({
    model: openai("gpt-4o"),
    prompt,
  });
  return { text: await result.text };
}
