/**
 * Schema exports for Weather API
 */

// OpenWeather API response schemas (for validating external API responses)
export {
  CoordSchema,
  WeatherConditionSchema,
  MainWeatherSchema,
  WindSchema,
  CloudsSchema,
  RainSchema,
  SnowSchema,
  SysSchema,
  OpenWeatherCurrentResponseSchema,
  GeocodingResultSchema,
  GeocodingResponseSchema,
  OpenWeatherErrorSchema,
  type Coord,
  type WeatherCondition,
  type MainWeather,
  type Wind,
  type Clouds,
  type Rain,
  type Snow,
  type Sys,
  type OpenWeatherCurrentResponse,
  type GeocodingResult,
  type GeocodingResponse,
  type OpenWeatherError,
} from "./openweather.schema";

// Public API schemas (for OpenAPI documentation)
export {
  WeatherQuerySchema,
  WeatherConditionResponseSchema,
  TemperatureResponseSchema,
  WindResponseSchema,
  AtmosphereResponseSchema,
  LocationResponseSchema,
  PrecipitationResponseSchema,
  CurrentWeatherResponseSchema,
  ErrorResponseSchema,
  RateLimitErrorSchema,
  HealthCheckResponseSchema,
  type WeatherQuery,
  type WeatherConditionResponse,
  type TemperatureResponse,
  type WindResponse,
  type AtmosphereResponse,
  type LocationResponse,
  type PrecipitationResponse,
  type CurrentWeatherResponse,
  type ErrorResponse,
  type RateLimitError,
  type HealthCheckResponse,
} from "./weather.schema";
