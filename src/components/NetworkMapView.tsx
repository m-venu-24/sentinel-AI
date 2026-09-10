import React from 'react';
import { Station, UserRole } from '../types';
import { Radio, AlertTriangle, CloudSun, Wrench, ShieldCheck, MapPin } from 'lucide-react';

interface NetworkMapViewProps {
  stations: Station[];
  selectedId: string;
  onSelectStation: (id: string) => void;
  role: UserRole;
}

export const NetworkMapView: React.FC<NetworkMapViewProps> = ({
  stations,
  selectedId,
  onSelectStation,
  role,
}) => {
  // India SVG projection boundaries
  // Lat: ~8°N to ~35°N, Lon: ~68°E to ~90°E
  const mapBounds = {
    minLon: 68.0,
    maxLon: 90.0,
    minLat: 8.0,
    maxLat: 35.0,
  };

  const svgWidth = 700;
  const svgHeight = 620;

  const projectCoord = (lat: number, lon: number) => {
    const x = ((lon - mapBounds.minLon) / (mapBounds.maxLon - mapBounds.minLon)) * (svgWidth - 120) + 60;
    // Invert Y because latitude goes North (up) but SVG goes down
    const y = svgHeight - 60 - ((lat - mapBounds.minLat) / (mapBounds.maxLat - mapBounds.minLat)) * (svgHeight - 120);
    return { x, y };
  };

  const selectedStation = stations.find((s) => s.id === selectedId) || stations[0];

  // Are North India stations in a heatwave event?
  const isNorthHeatwave = stations.some((s) => s.region === 'North India' && s.status === 'event');

  return (
    <main className="flex-1 p-5 overflow-y-auto flex flex-col items-center">
      <div className="w-full max-w-4xl bg-[#151F2A] border border-[#28394A] rounded-lg p-5 flex flex-col">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-3 border-b border-[#28394A]">
          <div>
            <h2 className="text-lg font-bold text-[#E7EDF3] m-0 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-[#3FA796]" />
              IMD Automatic Weather Station (AWS) Grid Map
            </h2>
            <p className="text-xs text-[#8298A9] m-0">
              Spatial topology showing real-time quality control state &amp; regional cross-station correlation
            </p>
          </div>

          <div className="flex items-center gap-3 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#3FA796]"></span>
              <span className="text-[#8298A9]">Normal</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#D9645A]"></span>
              <span className="text-[#F0A79E]">Sensor Fault</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#5C88C4]"></span>
              <span className="text-[#AFC8EE]">Regional Event</span>
            </div>
          </div>
        </div>

        {/* Map Container */}
        <div className="relative w-full aspect-[7/6] bg-[#0E1620] rounded-lg border border-[#28394A] overflow-hidden flex items-center justify-center">
          <svg
            viewBox={`0 0 ${svgWidth} ${svgHeight}`}
            className="w-full h-full"
          >
            {/* Ambient Background Grid */}
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#28394A" strokeWidth="0.5" strokeOpacity="0.4" />
            </pattern>
            <rect width="100%" height="100%" fill="url(#grid)" />

            {/* Stylized India Subcontinent Contour Outline */}
            <path
              d="M 230 60 Q 280 40 330 70 T 420 130 T 480 200 T 540 280 Q 480 340 460 410 Q 420 480 370 560 Q 350 590 340 590 Q 330 590 310 540 Q 250 440 210 390 Q 170 320 180 260 Q 190 200 190 140 Z"
              fill="#151F2A"
              stroke="#28394A"
              strokeWidth="1.5"
              strokeOpacity="0.8"
            />

            {/* Regional Clusters Outlines */}
            {/* North India Cluster Circle */}
            <ellipse
              cx="290"
              cy="175"
              rx="110"
              ry="75"
              fill="rgba(92, 136, 196, 0.03)"
              stroke="#28394A"
              strokeWidth="1"
              strokeDasharray="4 4"
            />
            <text x="375" y="125" fill="#8298A9" fontSize="10" fontFamily="Space Grotesk" opacity="0.6">
              NORTH CLUSTER (NCR &amp; RAJ)
            </text>

            {/* Correlation Lines if Regional Event active */}
            {isNorthHeatwave && (
              <g className="animate-pulse">
                {(() => {
                  const mgs = projectCoord(28.718, 77.019);
                  const sfd = projectCoord(28.583, 77.208);
                  const jai = projectCoord(26.824, 75.812);
                  return (
                    <>
                      <line x1={mgs.x} y1={mgs.y} x2={sfd.x} y2={sfd.y} stroke="#5C88C4" strokeWidth="2.5" strokeDasharray="5 3" />
                      <line x1={sfd.x} y1={sfd.y} x2={jai.x} y2={jai.y} stroke="#5C88C4" strokeWidth="2.5" strokeDasharray="5 3" />
                      <line x1={mgs.x} y1={mgs.y} x2={jai.x} y2={jai.y} stroke="#5C88C4" strokeWidth="2" strokeDasharray="5 3" opacity="0.7" />
                    </>
                  );
                })()}
              </g>
            )}

            {/* Station Nodes */}
            {stations.map((s) => {
              const pos = projectCoord(s.coordinates.lat, s.coordinates.lon);
              const isSelected = s.id === selectedId;
              const curTemp = s.history.temp[s.history.temp.length - 1] ?? s.baseTemp;

              const nodeColor =
                s.status === 'fault'
                  ? '#D9645A'
                  : s.status === 'event'
                  ? '#5C88C4'
                  : s.status === 'flagged'
                  ? '#E0A458'
                  : '#3FA796';

              return (
                <g
                  key={s.id}
                  id={`map-node-${s.id}`}
                  className="cursor-pointer group"
                  onClick={() => onSelectStation(s.id)}
                >
                  {/* Selection Glow */}
                  {isSelected && (
                    <circle
                      cx={pos.x}
                      cy={pos.y}
                      r="22"
                      fill={nodeColor}
                      fillOpacity="0.15"
                      stroke={nodeColor}
                      strokeWidth="1.5"
                      strokeDasharray="3 3"
                    />
                  )}

                  {/* Fault Pulse Ping */}
                  {s.status === 'fault' && (
                    <circle
                      cx={pos.x}
                      cy={pos.y}
                      r="26"
                      fill="none"
                      stroke="#D9645A"
                      strokeWidth="1.5"
                      className="animate-ping"
                    />
                  )}

                  {/* Outer Ring */}
                  <circle
                    cx={pos.x}
                    cy={pos.y}
                    r={isSelected ? 10 : 8}
                    fill="#151F2A"
                    stroke={nodeColor}
                    strokeWidth={isSelected ? 3 : 2}
                  />

                  {/* Inner Dot */}
                  <circle
                    cx={pos.x}
                    cy={pos.y}
                    r="4"
                    fill={nodeColor}
                  />

                  {/* Station Label & Readout Pill */}
                  <g transform={`translate(${pos.x + 12}, ${pos.y - 12})`}>
                    <rect
                      x="-2"
                      y="-12"
                      width={s.name.length * 6.5 + 44}
                      height="22"
                      rx="4"
                      fill="#1B2733"
                      stroke={isSelected ? nodeColor : '#28394A'}
                      strokeWidth="1"
                    />
                    <text
                      x="4"
                      y="3"
                      fill="#E7EDF3"
                      fontSize="10.5"
                      fontFamily="Space Grotesk"
                      fontWeight={isSelected ? 'bold' : 'normal'}
                    >
                      {s.name.replace('Delhi ', 'Del ')}
                    </text>
                    <text
                      x={s.name.length * 6.5 + 14}
                      y="3"
                      fill={nodeColor}
                      fontSize="10"
                      fontFamily="IBM Plex Mono"
                      fontWeight="bold"
                    >
                      {curTemp.toFixed(1)}°
                    </text>
                  </g>
                </g>
              );
            })}
          </svg>

          {/* Selected Station Floating Info Card */}
          <div className="absolute bottom-3 left-3 right-3 sm:right-auto sm:w-80 bg-[#151F2A]/95 backdrop-blur border border-[#28394A] rounded-lg p-3.5 shadow-2xl text-xs">
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-bold text-sm text-[#E7EDF3]">{selectedStation.name}</span>
              <span
                className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase ${
                  selectedStation.status === 'fault'
                    ? 'bg-[#D9645A]/20 text-[#F0A79E] border border-[#D9645A]/40'
                    : selectedStation.status === 'event'
                    ? 'bg-[#5C88C4]/20 text-[#AFC8EE] border border-[#5C88C4]/40'
                    : selectedStation.status === 'flagged'
                    ? 'bg-[#E0A458]/20 text-[#F1CC97] border border-[#E0A458]/40'
                    : 'bg-[#3FA796]/20 text-[#3FA796] border border-[#3FA796]/40'
                }`}
              >
                {selectedStation.status === 'fault'
                  ? 'Sensor Fault'
                  : selectedStation.status === 'event'
                  ? 'Weather Event'
                  : selectedStation.status === 'flagged'
                  ? 'Review Needed'
                  : 'Normal'}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 py-1.5 border-y border-[#28394A]/60 my-1.5 font-mono text-[11px]">
              <div>
                <div className="text-[9px] text-[#8298A9]">TEMP</div>
                <div className="font-bold text-[#E7EDF3]">
                  {selectedStation.history.temp[selectedStation.history.temp.length - 1]?.toFixed(1)}°C
                </div>
              </div>
              <div>
                <div className="text-[9px] text-[#8298A9]">PRESSURE</div>
                <div className="font-bold text-[#AFC8EE]">
                  {selectedStation.history.pres[selectedStation.history.pres.length - 1]?.toFixed(1)} hPa
                </div>
              </div>
              <div>
                <div className="text-[9px] text-[#8298A9]">HUMIDITY</div>
                <div className="font-bold text-[#B7E7DA]">
                  {selectedStation.history.hum[selectedStation.history.hum.length - 1]?.toFixed(0)}%
                </div>
              </div>
            </div>

            <div className="text-[11px] text-[#8298A9] line-clamp-2">
              {selectedStation.tier3.reason || "Operating nominal with expected diurnal variance."}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
};
