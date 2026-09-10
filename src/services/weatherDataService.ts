import { Station, WeatherData, WeatherForecast } from '../types';
import { configService } from './configService';

type Coordinates = { latitude: number; longitude: number };
type CacheEntry<T> = { value: T; expiresAt: number };
const stationCoordinates: Record<string, Coordinates> = {
  'del-mgs': { latitude: 28.82, longitude: 77.15 }, 'del-sfd': { latitude: 28.59, longitude: 77.21 }, jai: { latitude: 26.91, longitude: 75.79 }, blr: { latitude: 12.97, longitude: 77.59 }, 'bom-col': { latitude: 18.91, longitude: 72.82 },
};

class WeatherDataService {
  private cache = new Map<string, CacheEntry<WeatherData | WeatherForecast | WeatherData[]>>();
  private cacheValue<T>(key: string): T | undefined { const entry = this.cache.get(key); return entry && entry.expiresAt > Date.now() ? entry.value as T : undefined; }
  private put<T>(key: string, value: T) { this.cache.set(key, { value, expiresAt: Date.now() + configService.getWeatherConfig().refreshIntervalMs }); return value; }
  private coordinates(station: Station): Coordinates { return stationCoordinates[station.id] ?? { latitude: 20.59, longitude: 78.96 }; }

  async fetchCurrentWeather(station: Station): Promise<WeatherData> {
    const key = `current:${station.id}`, cached = this.cacheValue<WeatherData>(key); if (cached) return cached;
    const config = configService.getWeatherConfig();
    if (config.enabled) try {
      const { latitude, longitude } = this.coordinates(station), endpoint = config.apiUrl || 'https://api.open-meteo.com/v1/forecast';
      const url = new URL(endpoint); url.searchParams.set('latitude', String(latitude)); url.searchParams.set('longitude', String(longitude)); url.searchParams.set('current', 'temperature_2m,relative_humidity_2m,surface_pressure,wind_speed_10m,wind_direction_10m,precipitation,cloud_cover,visibility');
      const response = await fetch(url); if (!response.ok) throw new Error(`Weather API returned ${response.status}`);
      return this.put(key, this.normalizeWeatherData(await response.json()));
    } catch (error) { if (!config.useFallback) throw error; }
    return this.put(key, this.mock(station));
  }
  async fetchWeatherForecast(station: Station, hours = 6): Promise<WeatherForecast> {
    const key = `forecast:${station.id}:${hours}`, cached = this.cacheValue<WeatherForecast>(key); if (cached) return cached;
    const current = await this.fetchCurrentWeather(station), predictedTemp = current.temp + Math.sin(new Date().getHours() / 24 * Math.PI * 2) * 1.5;
    return this.put(key, { stationId: station.id, predictionTime: new Date().toISOString(), forecastHorizon: hours, predictedTemp, predictedHumidity: current.humidity, predictedPrecipitation: current.precipitation, confidence: 0.72, weatherCondition: predictedTemp > 35 ? 'Hot' : predictedTemp > 25 ? 'Warm' : 'Mild', aiReasoning: 'Derived from the latest conditions and local diurnal trend.' });
  }
  async fetchHistoricalWeather(station: Station, hours = 24): Promise<WeatherData[]> {
    const key = `history:${station.id}:${hours}`, cached = this.cacheValue<WeatherData[]>(key); if (cached) return cached;
    return this.put(key, Array.from({ length: hours + 1 }, (_, i) => this.mock(station, new Date(Date.now() - (hours - i) * 3_600_000).toISOString())));
  }
  normalizeWeatherData(response: any): WeatherData { const current = response.current ?? response, visibility = Number(current.visibility ?? 10_000); return { timestamp: current.time ? new Date(current.time).toISOString() : new Date().toISOString(), temp: Number(current.temperature_2m ?? current.temp ?? 0), humidity: Number(current.relative_humidity_2m ?? current.humidity ?? 0), pressure: Number(current.surface_pressure ?? current.pressure ?? 0), windSpeed: Number(current.wind_speed_10m ?? current.windSpeed ?? 0), windDirection: Number(current.wind_direction_10m ?? current.windDirection ?? 0), precipitation: Number(current.precipitation ?? 0), visibility: visibility > 100 ? visibility / 1000 : visibility, cloudCover: Number(current.cloud_cover ?? current.cloudCover ?? 0), source: 'api' }; }
  clearCache() { this.cache.clear(); }
  private mock(station: Station, timestamp = new Date().toISOString()): WeatherData { const diurnal = Math.sin(new Date(timestamp).getHours() / 24 * Math.PI * 2 - Math.PI / 2); return { timestamp, temp: station.baseTemp + diurnal * 2, humidity: Math.max(20, station.baseHum - diurnal * 5), pressure: station.basePres, windSpeed: 4, windDirection: 180, precipitation: 0, visibility: 10, cloudCover: 25, source: 'model' }; }
}
export const weatherDataService = new WeatherDataService();
