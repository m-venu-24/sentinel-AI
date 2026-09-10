import React, { useState } from 'react';
import { Station, UserRole } from '../types';
import { Thermometer, Gauge, Droplets, Info, AlertOctagon, TrendingUp, TrendingDown } from 'lucide-react';

interface ChartsReadoutProps {
  station: Station;
  role: UserRole;
}

interface SvgChartProps {
  data: number[];
  timestamps: string[];
  color: string;
  fillColor: string;
  unit: string;
  height: number;
  minVal?: number;
  maxVal?: number;
  highlightLast?: boolean;
  status?: string;
  thresholdLine?: { value: number; label: string; color: string };
  normalBand?: { min: number; max: number };
}

const TelemetryChart: React.FC<SvgChartProps> = ({
  data,
  timestamps,
  color,
  fillColor,
  unit,
  height,
  minVal,
  maxVal,
  highlightLast = true,
  status,
  thresholdLine,
  normalBand,
}) => {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  if (!data || data.length === 0) {
    return <div className="h-full flex items-center justify-center text-xs text-[#8298A9]">No telemetry data</div>;
  }

  const padding = { top: 12, right: 16, bottom: 20, left: 45 };
  const width = 600; // SVG viewBox coordinate width

  const dMin = minVal !== undefined ? minVal : Math.min(...data);
  const dMax = maxVal !== undefined ? maxVal : Math.max(...data);
  const range = dMax - dMin || 1;
  const yPadding = range * 0.12;
  const effectiveMin = dMin - yPadding;
  const effectiveMax = dMax + yPadding;
  const effectiveRange = effectiveMax - effectiveMin || 1;

  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const getX = (idx: number) => padding.left + (idx / (data.length - 1 || 1)) * chartW;
  const getY = (val: number) => padding.top + chartH - ((val - effectiveMin) / effectiveRange) * chartH;

  // Build SVG path
  const points = data.map((val, idx) => ({ x: getX(idx), y: getY(val), val, idx }));
  const pathData = points.reduce((acc, p, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)},${p.y.toFixed(1)}`, '');
  const areaData = `${pathData} L ${points[points.length - 1].x.toFixed(1)},${(padding.top + chartH).toFixed(1)} L ${points[0].x.toFixed(1)},${(padding.top + chartH).toFixed(1)} Z`;

  // Grid tick marks
  const yTicks = [
    effectiveMin + effectiveRange * 0.15,
    effectiveMin + effectiveRange * 0.5,
    effectiveMin + effectiveRange * 0.85,
  ];

  return (
    <div className="relative w-full h-full select-none" onMouseLeave={() => setHoverIndex(null)}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-full overflow-visible"
        preserveAspectRatio="none"
        onMouseMove={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const mouseX = e.clientX - rect.left;
          const svgX = (mouseX / rect.width) * width;
          const relativeX = Math.max(0, Math.min(chartW, svgX - padding.left));
          const idx = Math.round((relativeX / chartW) * (data.length - 1));
          setHoverIndex(idx);
        }}
      >
        {/* Horizontal grid lines */}
        {yTicks.map((tickVal, i) => {
          const y = getY(tickVal);
          return (
            <g key={i}>
              <line
                x1={padding.left}
                y1={y}
                x2={width - padding.right}
                y2={y}
                stroke="#28394A"
                strokeDasharray="3 3"
                strokeWidth="1"
              />
              <text
                x={padding.left - 6}
                y={y + 3.5}
                textAnchor="end"
                fontSize="9.5"
                fill="#8298A9"
                fontFamily="IBM Plex Mono"
              >
                {tickVal.toFixed(1)}
              </text>
            </g>
          );
        })}

        {/* Normal Expected Diurnal Band (if provided) */}
        {normalBand && (
          <rect
            x={padding.left}
            y={getY(normalBand.max)}
            width={chartW}
            height={Math.max(2, getY(normalBand.min) - getY(normalBand.max))}
            fill="#3FA796"
            fillOpacity="0.04"
            stroke="#3FA796"
            strokeOpacity="0.15"
            strokeDasharray="2 2"
          />
        )}

        {/* Threshold Line (if provided) */}
        {thresholdLine && thresholdLine.value >= effectiveMin && thresholdLine.value <= effectiveMax && (
          <g>
            <line
              x1={padding.left}
              y1={getY(thresholdLine.value)}
              x2={width - padding.right}
              y2={getY(thresholdLine.value)}
              stroke={thresholdLine.color}
              strokeDasharray="4 2"
              strokeWidth="1.2"
            />
            <text
              x={width - padding.right}
              y={getY(thresholdLine.value) - 4}
              textAnchor="end"
              fontSize="8.5"
              fill={thresholdLine.color}
              fontFamily="Space Grotesk"
            >
              {thresholdLine.label}
            </text>
          </g>
        )}

        {/* Area fill */}
        <path d={areaData} fill={fillColor} />

        {/* Trend Line */}
        <path
          d={pathData}
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Active Hover Guide line */}
        {hoverIndex !== null && points[hoverIndex] && (
          <g>
            <line
              x1={points[hoverIndex].x}
              y1={padding.top}
              x2={points[hoverIndex].x}
              y2={padding.top + chartH}
              stroke="#8298A9"
              strokeDasharray="2 2"
              strokeWidth="1"
            />
            <circle
              cx={points[hoverIndex].x}
              cy={points[hoverIndex].y}
              r="4.5"
              fill={color}
              stroke="#0E1620"
              strokeWidth="2"
            />
          </g>
        )}

        {/* Last reading point pulse */}
        {highlightLast && points.length > 0 && hoverIndex === null && (
          <g>
            <circle
              cx={points[points.length - 1].x}
              cy={points[points.length - 1].y}
              r="4"
              fill={status === 'fault' ? '#D9645A' : status === 'event' ? '#5C88C4' : color}
              stroke="#0E1620"
              strokeWidth="1.5"
            />
            {status === 'fault' && (
              <circle
                cx={points[points.length - 1].x}
                cy={points[points.length - 1].y}
                r="7"
                fill="none"
                stroke="#D9645A"
                strokeWidth="1"
                className="animate-ping"
              />
            )}
          </g>
        )}

        {/* Baseline timeline label */}
        <text
          x={padding.left}
          y={height - 4}
          fontSize="9"
          fill="#8298A9"
          fontFamily="IBM Plex Mono"
        >
          -60m
        </text>
        <text
          x={width - padding.right}
          y={height - 4}
          textAnchor="end"
          fontSize="9"
          fill="#8298A9"
          fontFamily="IBM Plex Mono"
        >
          Latest
        </text>
      </svg>

      {/* Interactive Tooltip Card */}
      {hoverIndex !== null && points[hoverIndex] && (
        <div
          className="absolute pointer-events-none z-20 bg-[#1B2733] border border-[#28394A] rounded shadow-xl px-2 py-1 text-[11px] font-mono text-[#E7EDF3]"
          style={{
            left: `${(points[hoverIndex].x / width) * 100}%`,
            top: '8px',
            transform: 'translateX(-50%)',
          }}
        >
          <div className="text-[10px] text-[#8298A9]">
            {timestamps[hoverIndex] || `T-${data.length - 1 - hoverIndex}m`}
          </div>
          <div className="font-bold flex items-center gap-1">
            <span style={{ color }}>{points[hoverIndex].val.toFixed(2)}</span>
            <span>{unit}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export const ChartsReadout: React.FC<ChartsReadoutProps> = ({ station, role }) => {
  const curTemp = station.history.temp[station.history.temp.length - 1] ?? station.baseTemp;
  const curPres = station.history.pres[station.history.pres.length - 1] ?? station.basePres;
  const curHum = station.history.hum[station.history.hum.length - 1] ?? station.baseHum;

  const minTemp = Math.min(...station.history.temp);
  const maxTemp = Math.max(...station.history.temp);
  const avgTemp = station.history.temp.reduce((a, b) => a + b, 0) / (station.history.temp.length || 1);

  return (
    <main className="flex-1 p-5 overflow-y-auto space-y-4">
      {/* Station Title & Meta */}
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 id="readout-title" className="text-xl font-bold tracking-tight text-[#E7EDF3] m-0">
              {station.name}
            </h2>
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-[#1B2733] border border-[#28394A] text-[#8298A9]">
              {station.code}
            </span>
            {station.usingCsv && (
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-[#3FA796]/20 text-[#3FA796] border border-[#3FA796]/30">
                Replaying CSV Telemetry
              </span>
            )}
          </div>
          <div id="readout-sub" className="text-xs text-[#8298A9] mt-0.5">
            {station.region} · Elevation {station.elevationM}m AMSL · {station.sensorModel} · Last 60 readings
          </div>
        </div>

        {/* Quick Temp Summary Pill */}
        <div className="flex items-center gap-3 text-xs bg-[#151F2A] border border-[#28394A] rounded-lg px-3 py-1.5">
          <div className="text-[11px] text-[#8298A9]">
            Min: <span className="font-mono text-[#E7EDF3]">{minTemp.toFixed(1)}°</span>
          </div>
          <div className="text-[11px] text-[#8298A9]">
            Avg: <span className="font-mono text-[#E7EDF3]">{avgTemp.toFixed(1)}°</span>
          </div>
          <div className="text-[11px] text-[#8298A9]">
            Max: <span className="font-mono text-[#E7EDF3]">{maxTemp.toFixed(1)}°</span>
          </div>
        </div>
      </div>

      {/* Main Temperature Chart Card */}
      <div className="bg-[#151F2A] border border-[#28394A] rounded-lg p-4">
        <div className="flex items-center justify-between mb-3 text-xs">
          <div className="flex items-center gap-2">
            <div className="p-1 rounded bg-[#D9645A]/15 text-[#D9645A]">
              <Thermometer className="w-4 h-4" />
            </div>
            <div>
              <span className="font-semibold text-sm text-[#E7EDF3]">Temperature (°C)</span>
              <span className="text-[11px] text-[#8298A9] ml-2">Air temperature at 2m height (WMO standard)</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-[#8298A9]">Current:</span>
            <span
              id="temp-current"
              className={`font-mono text-lg font-bold ${
                station.status === 'fault'
                  ? 'text-[#F0A79E]'
                  : station.status === 'event'
                  ? 'text-[#AFC8EE]'
                  : 'text-[#E7EDF3]'
              }`}
            >
              {curTemp.toFixed(1)}°C
            </span>
          </div>
        </div>

        <div className="h-60 w-full">
          <TelemetryChart
            data={station.history.temp}
            timestamps={station.history.timestamps}
            color="#D9645A"
            fillColor="rgba(217, 100, 90, 0.08)"
            unit="°C"
            height={240}
            status={station.status}
            thresholdLine={{ value: 50.0, label: '50°C Record Alert', color: '#D9645A' }}
            normalBand={{ min: station.baseTemp - 3, max: station.baseTemp + 3 }}
          />
        </div>
      </div>

      {/* Secondary Metrics Mini Row (Pressure and Humidity) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Pressure Card */}
        <div className="bg-[#151F2A] border border-[#28394A] rounded-lg p-3.5">
          <div className="flex items-center justify-between mb-2 text-xs">
            <div className="flex items-center gap-2">
              <div className="p-1 rounded bg-[#5C88C4]/15 text-[#5C88C4]">
                <Gauge className="w-3.5 h-3.5" />
              </div>
              <span className="font-semibold text-xs text-[#E7EDF3]">Atmospheric Pressure (hPa)</span>
            </div>
            <span id="pres-current" className="font-mono text-sm font-bold text-[#AFC8EE]">
              {curPres.toFixed(1)} hPa
            </span>
          </div>
          <div className="h-32 w-full">
            <TelemetryChart
              data={station.history.pres}
              timestamps={station.history.timestamps}
              color="#5C88C4"
              fillColor="rgba(92, 136, 196, 0.08)"
              unit="hPa"
              height={128}
            />
          </div>
        </div>

        {/* Humidity Card */}
        <div className="bg-[#151F2A] border border-[#28394A] rounded-lg p-3.5">
          <div className="flex items-center justify-between mb-2 text-xs">
            <div className="flex items-center gap-2">
              <div className="p-1 rounded bg-[#3FA796]/15 text-[#3FA796]">
                <Droplets className="w-3.5 h-3.5" />
              </div>
              <span className="font-semibold text-xs text-[#E7EDF3]">Relative Humidity (%)</span>
            </div>
            <span id="hum-current" className="font-mono text-sm font-bold text-[#B7E7DA]">
              {curHum.toFixed(0)}%
            </span>
          </div>
          <div className="h-32 w-full">
            <TelemetryChart
              data={station.history.hum}
              timestamps={station.history.timestamps}
              color="#3FA796"
              fillColor="rgba(63, 167, 150, 0.08)"
              unit="%"
              height={128}
              minVal={0}
              maxVal={100}
            />
          </div>
        </div>
      </div>
    </main>
  );
};
