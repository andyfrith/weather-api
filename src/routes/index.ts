/**
 * Route exports for Weather API
 */

export { weatherApp, type Bindings as WeatherBindings } from "./weather.route";
export { aiApp, type Bindings as AIBindings } from "./ai.route";
export {
  aiOllamaApp,
  type Bindings as AIOllamaBindings,
} from "./ai.ollama.route";
