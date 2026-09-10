import { WeatherData, WeatherForecast } from '../types';

const slope = (data: WeatherData[]) => data.length < 2 ? 0 : (data.at(-1)!.temp - data[0].temp) / (data.length - 1);
export const calculatePredictionConfidence = (_model: string, data: WeatherData[]) => Math.min(0.95, Math.max(0.45, 0.55 + Math.min(data.length, 24) / 80));
export const predictShortTermWeather = (stationId: string, data: WeatherData[], hours = 6): WeatherForecast => {
  const current = data.at(-1);
  const temp = current?.temp ?? 0, change = slope(data);
  const predictedTemp = temp + change * hours;
  return { stationId, predictionTime: new Date().toISOString(), forecastHorizon: hours, predictedTemp, predictedHumidity: current?.humidity ?? 0, predictedPrecipitation: current?.precipitation ?? 0, confidence: calculatePredictionConfidence('linear-trend', data), weatherCondition: predictedTemp > 35 ? 'Hot' : predictedTemp > 25 ? 'Warm' : 'Mild', aiReasoning: `Linear trend of ${change.toFixed(2)}°C per observation, projected ${hours} hours ahead.` };
};
export const predictLongTermWeather = (stationId: string, data: WeatherData[]): WeatherForecast[] => [24, 48].map(hours => predictShortTermWeather(stationId, data, hours));
export const generateForecastExplanation = (prediction: WeatherForecast) => `${prediction.weatherCondition}: ${prediction.predictedTemp.toFixed(1)}°C expected in ${prediction.forecastHorizon} hours (${Math.round(prediction.confidence * 100)}% confidence).`;
