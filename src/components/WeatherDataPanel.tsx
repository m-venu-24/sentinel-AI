import React from 'react';
import { WeatherData, WeatherForecast } from '../types';
import { Cloud, CloudRain, Wind, Droplets, Thermometer, Gauge, Eye } from 'lucide-react';

interface WeatherDataPanelProps {
  weatherData?: WeatherData;
  weatherForecast?: WeatherForecast;
  stationName: string;
}

export const WeatherDataPanel: React.FC<WeatherDataPanelProps> = ({
  weatherData,
  weatherForecast,
  stationName,
}) => {
  if (!weatherData) {
    return (
      <div className="bg-[#151F2A] border border-[#28394A] rounded-lg p-4 text-xs">
        <div className="flex items-center gap-2 text-[#8298A9]">
          <Cloud className="w-4 h-4" />
          <span>Weather data not available for {stationName}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#151F2A] border border-[#28394A] rounded-lg p-4 text-xs space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-[#E7EDF3] font-semibold">
          <CloudRain className="w-4 h-4 text-[#5C88C4]" />
          <span>Weather Data</span>
        </div>
        <span className="text-[#8298A9]">{stationName}</span>
      </div>

      {/* Current Conditions */}
      <div className="grid grid-cols-2 gap-2">
        <div className="flex items-center gap-2 bg-[#1B2733] p-2 rounded">
          <Thermometer className="w-3 h-3 text-[#D9645A]" />
          <div>
            <div className="text-[#8298A9]">Temperature</div>
            <div className="text-[#E7EDF3] font-mono">{weatherData.temp.toFixed(1)}°C</div>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-[#1B2733] p-2 rounded">
          <Droplets className="w-3 h-3 text-[#3FA796]" />
          <div>
            <div className="text-[#8298A9]">Humidity</div>
            <div className="text-[#E7EDF3] font-mono">{weatherData.humidity.toFixed(0)}%</div>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-[#1B2733] p-2 rounded">
          <Gauge className="w-3 h-3 text-[#5C88C4]" />
          <div>
            <div className="text-[#8298A9]">Pressure</div>
            <div className="text-[#E7EDF3] font-mono">{weatherData.pressure.toFixed(1)} hPa</div>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-[#1B2733] p-2 rounded">
          <Wind className="w-3 h-3 text-[#E0A458]" />
          <div>
            <div className="text-[#8298A9]">Wind</div>
            <div className="text-[#E7EDF3] font-mono">{weatherData.windSpeed.toFixed(1)} m/s</div>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-[#1B2733] p-2 rounded">
          <Eye className="w-3 h-3 text-[#A2B8CC]" />
          <div>
            <div className="text-[#8298A9]">Visibility</div>
            <div className="text-[#E7EDF3] font-mono">{weatherData.visibility.toFixed(1)} km</div>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-[#1B2733] p-2 rounded">
          <Cloud className="w-3 h-3 text-[#8298A9]" />
          <div>
            <div className="text-[#8298A9]">Cloud Cover</div>
            <div className="text-[#E7EDF3] font-mono">{weatherData.cloudCover.toFixed(0)}%</div>
          </div>
        </div>
      </div>

      {/* Forecast Section */}
      {weatherForecast && (
        <div className="pt-2 border-t border-[#28394A]">
          <div className="text-[#8298A9] mb-2 font-medium">AI Forecast ({weatherForecast.forecastHorizon}h)</div>
          <div className="bg-[#1B2733] p-2 rounded space-y-1">
            <div className="flex justify-between">
              <span className="text-[#8298A9]">Condition:</span>
              <span className="text-[#E7EDF3]">{weatherForecast.weatherCondition}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#8298A9]">Predicted Temp:</span>
              <span className="text-[#E7EDF3] font-mono">{weatherForecast.predictedTemp.toFixed(1)}°C</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#8298A9]">Confidence:</span>
              <span className="text-[#3FA796] font-mono">{(weatherForecast.confidence * 100).toFixed(0)}%</span>
            </div>
          </div>
        </div>
      )}

      {/* Data Source */}
      <div className="text-[10px] text-[#63798B] text-center">
        Source: {weatherData.source} • {new Date(weatherData.timestamp).toLocaleTimeString()}
      </div>
    </div>
  );
};