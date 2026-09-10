import React, { useRef } from 'react';
import { Station, UserRole } from '../types';
import { Upload, Download, FileText, CheckCircle2, AlertTriangle, Battery, Signal, Wrench, RefreshCw } from 'lucide-react';
import { generateSampleCsvContent, parseUploadedCsv } from '../utils/simulator';

interface StationSidebarProps {
  stations: Station[];
  selectedId: string;
  onSelectStation: (id: string) => void;
  role: UserRole;
  isCsvMode: boolean;
  onSetCsvMode: (enabled: boolean) => void;
  onLoadCsvData: (mappings: Record<string, any[]>, matchedNames: string[]) => void;
  onResetCsv: () => void;
}

export const StationSidebar: React.FC<StationSidebarProps> = ({
  stations,
  selectedId,
  onSelectStation,
  role,
  isCsvMode,
  onSetCsvMode,
  onLoadCsvData,
  onResetCsv,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [csvStatus, setCsvStatus] = React.useState<{ type: 'ok' | 'warn'; msg: string } | null>(null);

  const selectedStation = stations.find((s) => s.id === selectedId) || stations[0];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const text = evt.target?.result as string;
        const result = parseUploadedCsv(text, stations);

        if (!result.success || Object.keys(result.stationMappings).length === 0) {
          setCsvStatus({
            type: 'warn',
            msg: result.errorMessage || 'Failed to match any stations from CSV rows.',
          });
          return;
        }

        onLoadCsvData(result.stationMappings, result.matchedStationNames);
        setCsvStatus({
          type: 'ok',
          msg: `Replaying ${result.matchedRows} rows across ${result.matchedStationNames.length} station(s) (${result.matchedStationNames.join(', ')})${
            result.skippedRows > 0 ? ` · ${result.skippedRows} skipped` : ''
          }`,
        });
      } catch (err: any) {
        setCsvStatus({
          type: 'warn',
          msg: `Failed to parse CSV file: ${err.message || 'Malformed structure'}`,
        });
      }
    };
    reader.readAsText(file);
  };

  const handleDownloadSampleCsv = () => {
    const csvContent = generateSampleCsvContent(stations);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'imd-aws-telemetry-sample.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <aside className="w-full md:w-64 lg:w-72 bg-[#151F2A] border-r border-[#28394A] flex flex-col overflow-y-auto">
      {/* Stations Header */}
      <div className="px-4 py-3 border-b border-[#28394A]/60 flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-[#8298A9]">Stations ({stations.length})</span>
        <span className="text-[10px] text-[#8298A9] font-mono">IMD AWS GRID</span>
      </div>

      {/* Station List */}
      <div id="station-list" className="divide-y divide-[#28394A]/40 flex-1">
        {stations.map((s) => {
          const curTemp = s.history.temp[s.history.temp.length - 1] ?? s.baseTemp;
          const isSelected = s.id === selectedId;

          const dotColor =
            s.status === 'fault'
              ? 'bg-[#D9645A] ring-[#D9645A]/30'
              : s.status === 'event'
              ? 'bg-[#5C88C4] ring-[#5C88C4]/30'
              : s.status === 'flagged'
              ? 'bg-[#E0A458] ring-[#E0A458]/30'
              : 'bg-[#3FA796] ring-[#3FA796]/30';

          return (
            <button
              key={s.id}
              id={`station-item-${s.id}`}
              onClick={() => onSelectStation(s.id)}
              className={`w-full text-left flex items-center gap-3 px-4 py-3 transition-colors cursor-pointer border-l-2 ${
                isSelected
                  ? 'bg-[#1B2733] border-l-[#5C88C4] text-[#E7EDF3]'
                  : 'border-l-transparent text-[#8298A9] hover:bg-[#1B2733]/60 hover:text-[#E7EDF3]'
              }`}
            >
              {/* Status Dot */}
              <span className={`w-2.5 h-2.5 rounded-full ring-4 shrink-0 transition-colors ${dotColor}`}></span>

              {/* Station Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 font-medium text-xs text-[#E7EDF3] truncate">
                  <span>{s.name}</span>
                  {s.usingCsv && (
                    <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-[#3FA796]/20 text-[#3FA796] border border-[#3FA796]/40">
                      CSV
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-[#8298A9] flex items-center justify-between">
                  <span>{s.region}</span>
                  <span className="font-mono text-[10px] text-[#8298A9]/80">{s.code.split(' ')[0]}</span>
                </div>
              </div>

              {/* Current Temperature Readout */}
              <div className="text-right shrink-0">
                <div className="font-mono text-xs font-semibold text-[#E7EDF3]">
                  {curTemp.toFixed(1)}°
                </div>
                <div className="text-[10px] font-mono text-[#8298A9]">
                  {s.status === 'fault' ? (
                    <span className="text-[#F0A79E]">FAULT</span>
                  ) : s.status === 'event' ? (
                    <span className="text-[#AFC8EE]">EVENT</span>
                  ) : s.status === 'flagged' ? (
                    <span className="text-[#F1CC97]">REVIEW</span>
                  ) : (
                    <span>OK</span>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Technician Hardware Diagnostics Card (Visible in technician role) */}
      {role === 'technician' && (
        <div className="p-3 m-3 bg-[#1B2733] border border-[#28394A] rounded-lg text-xs space-y-2">
          <div className="flex items-center justify-between text-[#8298A9] border-b border-[#28394A]/60 pb-1.5">
            <span className="flex items-center gap-1.5 font-medium text-[#E7EDF3]">
              <Wrench className="w-3.5 h-3.5 text-amber-400" />
              Sensor Health ({selectedStation.code})
            </span>
          </div>

          <div className="space-y-1.5 text-[11px]">
            <div className="flex justify-between text-[#8298A9]">
              <span>Model:</span>
              <span className="font-mono text-[#E7EDF3]">{selectedStation.sensorModel}</span>
            </div>
            <div className="flex justify-between text-[#8298A9]">
              <span>Battery Bus:</span>
              <span className="font-mono text-[#3FA796] flex items-center gap-1">
                <Battery className="w-3 h-3" />
                {selectedStation.batteryV.toFixed(1)}V (Optimal)
              </span>
            </div>
            <div className="flex justify-between text-[#8298A9]">
              <span>Cellular Signal:</span>
              <span className="font-mono text-[#E7EDF3] flex items-center gap-1">
                <Signal className="w-3 h-3 text-[#3FA796]" />
                {selectedStation.signalDbm} dBm
              </span>
            </div>
            <div className="flex justify-between text-[#8298A9]">
              <span>Last Calibrated:</span>
              <span className="font-mono text-[#8298A9]">{selectedStation.lastCalibrationDate}</span>
            </div>
          </div>
        </div>
      )}

      {/* Data Source Configuration (Visible in Forecaster and Admin view) */}
      {role !== 'technician' && (
        <div className="p-3 m-3 bg-[#1B2733] border border-[#28394A] rounded-lg text-xs space-y-2.5">
          <h4 className="font-semibold text-xs text-[#E7EDF3] m-0 flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-[#3FA796]" />
            Data Source
          </h4>

          <div className="flex gap-3 text-xs text-[#8298A9]">
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="radio"
                name="datasrc"
                value="live"
                checked={!isCsvMode}
                onChange={() => {
                  onSetCsvMode(false);
                  onResetCsv();
                  setCsvStatus(null);
                }}
                className="accent-[#3FA796]"
              />
              Live simulation
            </label>

            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="radio"
                name="datasrc"
                value="csv"
                checked={isCsvMode}
                onChange={() => onSetCsvMode(true)}
                className="accent-[#3FA796]"
              />
              CSV upload
            </label>
          </div>

          <div>
            <input
              type="file"
              id="csv-file"
              ref={fileInputRef}
              accept=".csv"
              disabled={!isCsvMode}
              onChange={handleFileChange}
              className="text-[11px] text-[#8298A9] file:mr-2 file:py-1 file:px-2.5 file:rounded file:border file:border-[#28394A] file:text-[11px] file:font-medium file:bg-[#151F2A] file:text-[#E7EDF3] hover:file:bg-[#28394A] cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed w-full"
            />
            <p className="text-[10px] text-[#8298A9]/80 mt-1 m-0">
              Columns: station, timestamp, temperature, pressure, humidity
            </p>
          </div>

          {csvStatus && (
            <div
              id="csv-status"
              className={`p-2 rounded text-[11px] flex items-start gap-1.5 ${
                csvStatus.type === 'ok'
                  ? 'bg-[#3FA796]/10 border border-[#3FA796]/30 text-[#B7E7DA]'
                  : 'bg-[#D9645A]/10 border border-[#D9645A]/30 text-[#F0A79E]'
              }`}
            >
              {csvStatus.type === 'ok' ? (
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0 mt-0.5 text-[#3FA796]" />
              ) : (
                <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-[#D9645A]" />
              )}
              <span className="leading-tight">{csvStatus.msg}</span>
            </div>
          )}

          <button
            id="btn-sample-csv"
            type="button"
            onClick={handleDownloadSampleCsv}
            className="w-full flex items-center justify-center gap-1.5 py-1.5 px-2 bg-[#151F2A] border border-[#28394A] rounded text-[#8298A9] hover:text-[#E7EDF3] hover:border-[#8298A9] transition-colors text-[11px]"
          >
            <Download className="w-3 h-3" />
            Download sample CSV
          </button>
        </div>
      )}
    </aside>
  );
};
