import { CorrelationAnalysis, WeatherAnomaly, WeatherData, WeatherPatternAnalysis } from '../types';

const average = (values: number[]) => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
const pearson = (a: number[], b: number[]) => {
  const n = Math.min(a.length, b.length);
  if (n < 2) return 0;
  const x = a.slice(-n), y = b.slice(-n), mx = average(x), my = average(y);
  const divisor = Math.sqrt(x.reduce((s, v, i) => s + (v - mx) ** 2, 0) * y.reduce((s, v, i) => s + (v - my) ** 2, 0));
  return divisor ? x.reduce((s, v, i) => s + (v - mx) * (y[i] - my), 0) / divisor : 0;
};

export const analyzeWeatherPattern = (data: WeatherData[]): WeatherPatternAnalysis => {
  const temperatures = data.map(d => d.temp);
  const change = temperatures.length > 1 ? temperatures.at(-1)! - temperatures[0] : 0;
  const trend = change > 0.8 ? 'warming' : change < -0.8 ? 'cooling' : 'stable';
  return { trend, temperatureChange: change, averageTemperature: average(temperatures), averageHumidity: average(data.map(d => d.humidity)), precipitationTotal: data.reduce((sum, d) => sum + d.precipitation, 0), summary: `${trend[0].toUpperCase()}${trend.slice(1)} trend (${change >= 0 ? '+' : ''}${change.toFixed(1)}°C) across ${data.length} observations.` };
};

export const detectWeatherAnomalies = (current: WeatherData, historical: WeatherData[]): WeatherAnomaly[] => {
  if (historical.length < 3) return [];
  const metrics: Array<[WeatherAnomaly['metric'], keyof WeatherData, number]> = [['temperature', 'temp', 2.5], ['humidity', 'humidity', 15], ['pressure', 'pressure', 5], ['wind', 'windSpeed', 12]];
  return metrics.flatMap(([metric, key, threshold]) => {
    const expected = average(historical.map(d => Number(d[key])));
    const value = Number(current[key]);
    const difference = Math.abs(value - expected);
    return difference > threshold ? [{ metric, value, expected, severity: difference > threshold * 2 ? 'high' : 'medium', message: `${metric} differs from its recent baseline by ${difference.toFixed(1)}.` }] : [];
  });
};

export const correlateWithSensorData = (weather: WeatherData[], sensor: Array<{ temp: number; hum?: number }>): CorrelationAnalysis => {
  const n = Math.min(weather.length, sensor.length);
  const correlation = pearson(weather.slice(-n).map(d => d.temp), sensor.slice(-n).map(d => d.temp));
  return { temperatureCorrelation: correlation, humidityCorrelation: pearson(weather.slice(-n).map(d => d.humidity), sensor.slice(-n).map(d => d.hum ?? 0)), sampleSize: n, summary: n < 2 ? 'Not enough aligned readings for correlation.' : `Temperature correlation is ${correlation.toFixed(2)} across ${n} aligned readings.` };
};

export const generateWeatherInsights = (analysis: WeatherPatternAnalysis): string[] => [analysis.summary, analysis.precipitationTotal > 0 ? `${analysis.precipitationTotal.toFixed(1)} mm precipitation recorded.` : 'No precipitation recorded in the analysis window.'];
