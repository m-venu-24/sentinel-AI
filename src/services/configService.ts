export type WeatherProvider = 'open-meteo' | 'openweather';

export interface WeatherConfig {
  enabled: boolean;
  provider: WeatherProvider;
  apiKey: string;
  apiUrl: string;
  refreshIntervalMs: number;
  useFallback: boolean;
}

const readEnv = (key: string): string => (import.meta.env?.[key] as string | undefined) ?? '';

class ConfigService {
  private config: WeatherConfig = {
    enabled: readEnv('VITE_WEATHER_DATA_ENABLED') !== 'false',
    provider: readEnv('VITE_WEATHER_PROVIDER') === 'openweather' ? 'openweather' : 'open-meteo',
    apiKey: readEnv('VITE_WEATHER_API_KEY'),
    apiUrl: readEnv('VITE_WEATHER_API_URL'),
    refreshIntervalMs: Math.max(60_000, Number(readEnv('VITE_WEATHER_REFRESH_INTERVAL_MS')) || 300_000),
    useFallback: readEnv('VITE_WEATHER_FALLBACK') !== 'false',
  };

  getWeatherConfig = (): WeatherConfig => ({ ...this.config });
  updateWeatherConfig = (changes: Partial<WeatherConfig>): WeatherConfig => {
    this.config = { ...this.config, ...changes };
    return this.getWeatherConfig();
  };
}

export const configService = new ConfigService();
