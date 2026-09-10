import React from 'react';
import { RefreshCw, Cloud } from 'lucide-react';

export const WeatherDataControls: React.FC<{ enabled: boolean; onEnabledChange: (enabled: boolean) => void; onRefresh: () => void }> = ({ enabled, onEnabledChange, onRefresh }) => (
  <div className="flex items-center gap-2 text-xs">
    <button className="weather-toggle" onClick={() => onEnabledChange(!enabled)} title="Toggle weather integration"><Cloud size={15} /> <span>{enabled ? 'Weather on' : 'Weather off'}</span></button>
    {enabled && <button className="weather-toggle" onClick={onRefresh} title="Refresh weather data"><RefreshCw size={15} /> <span>Refresh</span></button>}
  </div>
);
