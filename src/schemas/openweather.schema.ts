import { z } from "zod";

/**
 * Zod schemas for validating OpenWeather API responses
 * Based on OpenWeather API 2.5 response structure
 * @see https://openweathermap.org/current
 */

/**
 * Schema for geographic coordinates
 */
export const CoordSchema = z.object({
  lon: z.number().describe("Longitude"),
  lat: z.number().describe("Latitude"),
});

/**
 * Schema for weather condition details
 */
export const WeatherConditionSchema = z.object({
  id: z.number().describe("Weather condition ID"),
  main: z
    .string()
    .describe("Group of weather parameters (Rain, Snow, Clouds, etc.)"),
  description: z.string().describe("Weather condition description"),
  icon: z.string().describe("Weather icon ID"),
});

/**
 * Schema for main weather data
 */
export const MainWeatherSchema = z.object({
  temp: z.number().describe("Temperature"),
  feels_like: z.number().describe("Human perception of temperature"),
  temp_min: z.number().describe("Minimum temperature"),
  temp_max: z.number().describe("Maximum temperature"),
  pressure: z.number().describe("Atmospheric pressure in hPa"),
  humidity: z.number().describe("Humidity percentage"),
  sea_level: z
    .number()
    // .optional()
    .describe("Atmospheric pressure at sea level in hPa"),
  grnd_level: z
    .number()
    // .optional()
    .describe("Atmospheric pressure at ground level in hPa"),
  temp_kf: z
    .number()
    .optional()
    .describe("Temperature deviation from previous day"),
});

/**
 * Schema for wind data
 */
export const WindSchema = z.object({
  speed: z.number().describe("Wind speed"),
  deg: z.number().describe("Wind direction in degrees"),
  gust: z.number().describe("Wind gust speed"),
});

/**
 * Schema for cloud coverage
 */
export const CloudsSchema = z.object({
  all: z.number().describe("Cloudiness percentage"),
});

/**
 * Schema for rain volume
 */
export const RainSchema = z.object({
  "1h": z.number().optional().describe("Rain volume for the last 1 hour in mm"),
  "3h": z
    .number()
    .optional()
    .describe("Rain volume for the last 3 hours in mm"),
});

/**
 * Schema for snow volume
 */
export const SnowSchema = z.object({
  "1h": z.number().optional().describe("Snow volume for the last 1 hour in mm"),
  "3h": z
    .number()
    .optional()
    .describe("Snow volume for the last 3 hours in mm"),
});

/**
 * Schema for system information
 */
export const SysSchema = z.object({
  type: z.number().optional().describe("Internal parameter"),
  id: z.number().optional().describe("Internal parameter"),
  country: z.string().describe("Country code (e.g., US, GB)"),
  sunrise: z.number().describe("Sunrise time, Unix, UTC"),
  sunset: z.number().describe("Sunset time, Unix, UTC"),
});

/**
 * Complete schema for OpenWeather current weather API response
 * Endpoint: /data/2.5/weather
 */
export const OpenWeatherCurrentWeatherResponseSchema = z.object({
  coord: CoordSchema,
  weather: z.array(WeatherConditionSchema).min(1),
  base: z.string().describe("Internal parameter"),
  main: MainWeatherSchema,
  visibility: z.number().describe("Visibility in meters"),
  wind: WindSchema,
  clouds: CloudsSchema,
  rain: RainSchema.optional(),
  snow: SnowSchema.optional(),
  dt: z.number().describe("Time of data calculation, Unix, UTC"),
  sys: SysSchema,
  timezone: z.number().describe("Shift in seconds from UTC"),
  id: z.number().describe("City ID"),
  name: z.string().describe("City name"),
  cod: z.number().describe("HTTP status code"),
});

/**
 * Complete schema for OpenWeather five day forecast API response
 * Endpoint: /data/2.5/weather
 */
export const OpenWeatherFiveDayForecastResponseSchema = z.object({
  list: z.array(
    z.object({
      dt: z.number().describe("Time of data forecasted, unix, UTC"),
      main: MainWeatherSchema,
      weather: z.array(WeatherConditionSchema).min(1),
      clouds: CloudsSchema,
      wind: WindSchema,
      visibility: z.number().describe("Visibility in meters"),
      pop: z.number().describe("Probability of precipitation"),
      sys: z
        .object({
          pod: z.string().describe("Part of the day (d=day, n=night)"),
        })
        .describe("System parameters"),
      dt_txt: z.string().describe("Time of data forecasted, ISO format"),
    })
  ),
  city: z.object({
    id: z.number().describe("City ID"),
    name: z.string().describe("City name"),
    coord: CoordSchema,
    country: z.string().describe("Country code"),
    population: z.number().describe("Population"),
    timezone: z.number().describe("Shift in seconds from UTC"),
    sunrise: z.number().describe("Sunrise time, Unix, UTC"),
    sunset: z.number().describe("Sunset time, Unix, UTC"),
  }),
});

/**
 * Schema for a single geocoding result
 * Endpoint: /geo/1.0/direct
 */
export const GeocodingResultSchema = z.object({
  name: z.string().describe("Name of the found location"),
  local_names: z
    .record(z.string(), z.string())
    .optional()
    .describe("Localized names in different languages"),
  lat: z.number().describe("Latitude of the found location"),
  lon: z.number().describe("Longitude of the found location"),
  country: z.string().describe("Country code"),
  state: z.string().optional().describe("State or region (where available)"),
});

/**
 * Schema for geocoding API response (array of results)
 */
export const GeocodingResponseSchema = z.array(GeocodingResultSchema);

/**
 * Schema for OpenWeather API error response
 */
export const OpenWeatherErrorSchema = z.object({
  cod: z.union([z.string(), z.number()]).describe("Error code"),
  message: z.string().describe("Error message"),
});

// Type exports for use throughout the application
export type Coord = z.infer<typeof CoordSchema>;
export type WeatherCondition = z.infer<typeof WeatherConditionSchema>;
export type MainWeather = z.infer<typeof MainWeatherSchema>;
export type Wind = z.infer<typeof WindSchema>;
export type Clouds = z.infer<typeof CloudsSchema>;
export type Rain = z.infer<typeof RainSchema>;
export type Snow = z.infer<typeof SnowSchema>;
export type Sys = z.infer<typeof SysSchema>;
export type OpenWeatherCurrentWeatherResponse = z.infer<
  typeof OpenWeatherCurrentWeatherResponseSchema
>;
export type OpenWeatherFiveDayForecastResponse = z.infer<
  typeof OpenWeatherFiveDayForecastResponseSchema
>;
export type GeocodingResult = z.infer<typeof GeocodingResultSchema>;
export type GeocodingResponse = z.infer<typeof GeocodingResponseSchema>;
export type OpenWeatherError = z.infer<typeof OpenWeatherErrorSchema>;
