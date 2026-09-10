import React from 'react';
import { CorrelationAnalysis, WeatherAnomaly, WeatherPatternAnalysis } from '../types';

export const WeatherAnalysisDashboard: React.FC<{ pattern?: WeatherPatternAnalysis; anomalies: WeatherAnomaly[]; correlation?: CorrelationAnalysis; insights: string[] }> = ({ pattern, anomalies, correlation, insights }) => (
  <section className="chart-card mt-4 text-sm">
    <div className="chart-title"><span>Weather analysis</span><span>{pattern?.trend ?? 'Awaiting data'}</span></div>
    {pattern && <p className="text-[#8298A9]">{pattern.summary} Average humidity: {pattern.averageHumidity.toFixed(0)}%.</p>}
    {correlation && <p className="text-[#8298A9] mt-2">{correlation.summary}</p>}
    {anomalies.length > 0 && <p className="text-[#D9645A] mt-2">{anomalies.map(a => a.message).join(' ')}</p>}
    {insights.map((insight, index) => <p key={index} className="text-[#A2B8CC] mt-1">• {insight}</p>)}
  </section>
);
