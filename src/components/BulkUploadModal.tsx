import React, { useState, useRef } from 'react';
import {
  Upload,
  X,
  FileText,
  AlertCircle,
  CheckCircle2,
  Play,
  Zap,
  RotateCcw,
  Sparkles,
  Info,
} from 'lucide-react';
import { StationState, CsvReading, PlaybackSpeed } from '../types';
import { parseCsvText, SAMPLE_CSVS, ParseResult } from '../utils/csvParser';

interface BulkUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  stations: StationState[];
  selectedStationId: string;
  onInjectQueue: (
    stationId: string,
    readings: CsvReading[],
    options: {
      playbackMode: 'queue' | 'batch';
      speed: PlaybackSpeed;
      clearHistory: boolean;
    }
  ) => void;
}

export const BulkUploadModal: React.FC<BulkUploadModalProps> = ({
  isOpen,
  onClose,
  stations,
  selectedStationId,
  onInjectQueue,
}) => {
  const [targetStationId, setTargetStationId] = useState<string>(selectedStationId);
  const [csvContent, setCsvContent] = useState<string>('');
  const [fileName, setFileName] = useState<string>('');
  const [dragActive, setDragActive] = useState<boolean>(false);
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [playbackMode, setPlaybackMode] = useState<'queue' | 'batch'>('queue');
  const [playbackSpeed, setPlaybackSpeed] = useState<PlaybackSpeed>('fast');
  const [clearHistory, setClearHistory] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'upload' | 'samples' | 'preview'>('upload');

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Keep target station in sync if selectedStationId changes when modal opened
  React.useEffect(() => {
    if (selectedStationId) {
      setTargetStationId(selectedStationId);
    }
  }, [selectedStationId, isOpen]);

  if (!isOpen) return null;

  const handleRawText = (text: string, name = 'pasted_data.csv') => {
    setCsvContent(text);
    setFileName(name);
    const res = parseCsvText(text);
    setParseResult(res);
    if (res.readings.length > 0) {
      setActiveTab('preview');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const content = evt.target?.result as string;
      if (content) {
        handleRawText(content, file.name);
      }
    };
    reader.readAsText(file);
    // Reset file input so user can re-upload same file if needed
    e.target.value = '';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        const content = evt.target?.result as string;
        if (content) {
          handleRawText(content, file.name);
        }
      };
      reader.readAsText(file);
    }
  };

  const loadSample = (sampleId: string) => {
    const sample = SAMPLE_CSVS.find((s) => s.id === sampleId);
    if (sample) {
      handleRawText(sample.data, `${sample.id}.csv`);
    }
  };

  const handleApply = () => {
    if (!parseResult || parseResult.readings.length === 0) return;
    onInjectQueue(targetStationId, parseResult.readings, {
      playbackMode,
      speed: playbackSpeed,
      clearHistory,
    });
    onClose();
  };

  const targetStation = stations.find((s) => s.id === targetStationId) || stations[0];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        id="bulk-upload-dialog"
        className="w-full max-w-2xl bg-[#151F2A] border border-[#28394A] rounded-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#28394A] bg-[#111A24]">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded bg-[#3FA796]/15 text-[#3FA796]">
              <Upload size={18} />
            </div>
            <div>
              <h2 className="text-base font-semibold text-[#E7EDF3] tracking-tight">Bulk Upload CSV Telemetry</h2>
              <p className="text-xs text-[#8298A9]">Inject historical time-series data into station queue for batch processing &amp; playback</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded text-[#8298A9] hover:text-[#E7EDF3] hover:bg-[#1B2733] transition-colors"
            title="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 text-sm">
          {/* Target Station Selection */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#8298A9] uppercase tracking-wider">Target Station</label>
            <div className="flex items-center gap-3">
              <select
                id="target-station-select"
                value={targetStationId}
                onChange={(e) => setTargetStationId(e.target.value)}
                className="flex-1 bg-[#0E1620] border border-[#28394A] rounded px-3 py-2 text-[#E7EDF3] text-sm focus:outline-none focus:border-[#5C88C4]"
              >
                {stations.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.region}) {s.csvQueue && s.csvQueue.length > 0 ? `• Queue: ${s.csvQueue.length} pending` : ''}
                  </option>
                ))}
              </select>
              <div className="text-xs px-2.5 py-1.5 rounded bg-[#1B2733] border border-[#28394A] text-[#8298A9] shrink-0">
                Region: <span className="text-[#E7EDF3] font-medium">{targetStation?.region}</span>
              </div>
            </div>
          </div>

          {/* Tab Selector */}
          <div className="flex border-b border-[#28394A] gap-4 text-xs font-medium pt-1">
            <button
              onClick={() => setActiveTab('upload')}
              className={`pb-2 border-b-2 transition-colors flex items-center gap-1.5 ${
                activeTab === 'upload'
                  ? 'border-[#3FA796] text-[#3FA796]'
                  : 'border-transparent text-[#8298A9] hover:text-[#E7EDF3]'
              }`}
            >
              <Upload size={14} /> Upload File / Paste CSV
            </button>
            <button
              onClick={() => setActiveTab('samples')}
              className={`pb-2 border-b-2 transition-colors flex items-center gap-1.5 ${
                activeTab === 'samples'
                  ? 'border-[#3FA796] text-[#3FA796]'
                  : 'border-transparent text-[#8298A9] hover:text-[#E7EDF3]'
              }`}
            >
              <Sparkles size={14} /> Preset Historical Scenarios
            </button>
            {parseResult && parseResult.readings.length > 0 && (
              <button
                onClick={() => setActiveTab('preview')}
                className={`pb-2 border-b-2 transition-colors flex items-center gap-1.5 ${
                  activeTab === 'preview'
                    ? 'border-[#3FA796] text-[#3FA796]'
                    : 'border-transparent text-[#8298A9] hover:text-[#E7EDF3]'
                }`}
              >
                <FileText size={14} /> Parsed Data ({parseResult.readings.length} rows)
              </button>
            )}
          </div>

          {/* Tab 1: Upload / Drop zone */}
          {activeTab === 'upload' && (
            <div className="space-y-3">
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-all ${
                  dragActive
                    ? 'border-[#3FA796] bg-[#3FA796]/10'
                    : 'border-[#28394A] hover:border-[#8298A9] bg-[#0E1620]/60'
                }`}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept=".csv,.txt,.tsv"
                  className="hidden"
                />
                <div className="mx-auto w-10 h-10 rounded-full bg-[#1B2733] flex items-center justify-center text-[#8298A9] mb-2">
                  <Upload size={20} />
                </div>
                <div className="text-sm font-medium text-[#E7EDF3]">
                  {fileName ? fileName : 'Click to select CSV file or drag & drop here'}
                </div>
                <div className="text-xs text-[#8298A9] mt-1">
                  Accepts <code className="text-[#A2B8CC]">.csv</code>, <code className="text-[#A2B8CC]">.tsv</code> or{' '}
                  <code className="text-[#A2B8CC]">.txt</code> format
                </div>
                <div className="text-[11px] text-[#63798B] mt-2">
                  Columns supported: <span className="text-[#8298A9]">temperature (or temp), pressure, humidity</span> (optional time)
                </div>
              </div>

              {/* Direct Paste Alternative */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-xs text-[#8298A9]">Or paste raw CSV text directly:</label>
                  {csvContent && (
                    <button
                      onClick={() => {
                        setCsvContent('');
                        setFileName('');
                        setParseResult(null);
                      }}
                      className="text-[11px] text-[#D9645A] hover:underline"
                    >
                      Clear
                    </button>
                  )}
                </div>
                <textarea
                  value={csvContent}
                  onChange={(e) => handleRawText(e.target.value, 'pasted_data.csv')}
                  placeholder="time,temperature,pressure,humidity&#10;12:00,34.2,1002.5,45&#10;12:05,36.8,1002.1,43&#10;12:10,48.5,1001.9,40"
                  rows={4}
                  className="w-full bg-[#0E1620] border border-[#28394A] rounded p-2.5 text-xs text-[#E7EDF3] font-mono focus:outline-none focus:border-[#5C88C4]"
                ></textarea>
              </div>
            </div>
          )}

          {/* Tab 2: Preset historical test files */}
          {activeTab === 'samples' && (
            <div className="space-y-2.5">
              <p className="text-xs text-[#8298A9]">
                Choose an official simulation dataset to instantly load real-world AWS anomalies into the queue:
              </p>
              <div className="grid grid-cols-1 gap-2">
                {SAMPLE_CSVS.map((sample) => (
                  <div
                    key={sample.id}
                    onClick={() => loadSample(sample.id)}
                    className="p-3 bg-[#0E1620] border border-[#28394A] hover:border-[#3FA796] hover:bg-[#1B2733] rounded cursor-pointer transition-all group"
                  >
                    <div className="flex items-center justify-between">
                      <div className="font-medium text-xs text-[#E7EDF3] group-hover:text-[#3FA796] flex items-center gap-1.5">
                        <Sparkles size={13} className="text-[#3FA796]" />
                        {sample.name}
                      </div>
                      <span className="text-[11px] text-[#3FA796] bg-[#3FA796]/10 px-2 py-0.5 rounded font-mono">
                        Load Dataset →
                      </span>
                    </div>
                    <p className="text-[11.5px] text-[#8298A9] mt-1 leading-relaxed">{sample.description}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tab 3: Parsed Data Preview */}
          {activeTab === 'preview' && parseResult && (
            <div className="space-y-3">
              {/* Parse summary stats */}
              {parseResult.stats && (
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div className="bg-[#0E1620] p-2.5 rounded border border-[#28394A]">
                    <div className="text-[#8298A9]">Temperature Range</div>
                    <div className="font-semibold text-[#D9645A] mt-0.5">
                      {parseResult.stats.minTemp}°C → {parseResult.stats.maxTemp}°C
                    </div>
                  </div>
                  <div className="bg-[#0E1620] p-2.5 rounded border border-[#28394A]">
                    <div className="text-[#8298A9]">Pressure Range</div>
                    <div className="font-semibold text-[#5C88C4] mt-0.5">
                      {parseResult.stats.minPres} → {parseResult.stats.maxPres} hPa
                    </div>
                  </div>
                  <div className="bg-[#0E1620] p-2.5 rounded border border-[#28394A]">
                    <div className="text-[#8298A9]">Humidity Range</div>
                    <div className="font-semibold text-[#3FA796] mt-0.5">
                      {parseResult.stats.minHum}% → {parseResult.stats.maxHum}%
                    </div>
                  </div>
                </div>
              )}

              {/* Data Table */}
              <div className="border border-[#28394A] rounded overflow-hidden max-h-48 overflow-y-auto bg-[#0E1620]">
                <table className="w-full text-xs text-left border-collapse">
                  <thead className="bg-[#111A24] sticky top-0 border-b border-[#28394A] text-[#8298A9]">
                    <tr>
                      <th className="p-2 w-12">#</th>
                      <th className="p-2">Time</th>
                      <th className="p-2">Temp (°C)</th>
                      <th className="p-2">Pressure (hPa)</th>
                      <th className="p-2">Humidity (%)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1F2E3E] font-mono">
                    {parseResult.readings.slice(0, 30).map((r, i) => (
                      <tr key={i} className="hover:bg-[#151F2A]/60">
                        <td className="p-2 text-[#8298A9]">{i + 1}</td>
                        <td className="p-2 text-[#A2B8CC]">{r.time || `+${i + 1}t`}</td>
                        <td className={`p-2 font-medium ${r.temp === null ? 'text-[#D9645A]' : 'text-[#E7EDF3]'}`}>{r.temp === null ? '—' : `${r.temp.toFixed(1)}°`}</td>
                        <td className={`p-2 ${r.pres === null ? 'text-[#D9645A]' : 'text-[#A2B8CC]'}`}>{r.pres === null ? '—' : r.pres.toFixed(1)}</td>
                        <td className={`p-2 ${r.hum === null ? 'text-[#D9645A]' : 'text-[#A2B8CC]'}`}>{r.hum === null ? '—' : `${r.hum.toFixed(0)}%`}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {parseResult.readings.length > 30 && (
                <div className="text-[11px] text-[#8298A9] text-center">
                  Showing first 30 of {parseResult.readings.length} records. All rows will be injected into queue.
                </div>
              )}
            </div>
          )}

          {/* Validation Feedback */}
          {parseResult && parseResult.errors.length > 0 && (
            <div className="p-3 rounded bg-[#D9645A]/10 border border-[#D9645A]/30 text-xs text-[#F0A79E] space-y-1">
              <div className="flex items-center gap-1.5 font-semibold">
                <AlertCircle size={14} /> Warnings / Parse Errors
              </div>
              <ul className="list-disc list-inside space-y-0.5">
                {parseResult.errors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </div>
          )}

          {parseResult && parseResult.readings.length > 0 && (
            <div className="p-2.5 rounded bg-[#3FA796]/10 border border-[#3FA796]/30 text-xs text-[#3FA796] flex items-center gap-2">
              <CheckCircle2 size={15} />
              <span>
                <strong>{parseResult.readings.length} readings</strong> validated and ready to inject into{' '}
                <strong className="underline">{targetStation?.name}</strong>.
              </span>
            </div>
          )}

          {/* Playback & Processing Options */}
          <div className="p-3.5 bg-[#111A24] border border-[#28394A] rounded-lg space-y-3">
            <div className="text-xs font-semibold text-[#8298A9] uppercase tracking-wider flex items-center justify-between">
              <span>Injection &amp; Execution Mode</span>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              {/* Option 1: Queue for Playback */}
              <div
                onClick={() => setPlaybackMode('queue')}
                className={`p-3 rounded border cursor-pointer transition-all ${
                  playbackMode === 'queue'
                    ? 'border-[#3FA796] bg-[#3FA796]/10'
                    : 'border-[#28394A] bg-[#0E1620] hover:border-[#8298A9]'
                }`}
              >
                <div className="flex items-center gap-2 font-medium text-xs text-[#E7EDF3]">
                  <Play size={14} className={playbackMode === 'queue' ? 'text-[#3FA796]' : 'text-[#8298A9]'} />
                  Queue for Playback
                </div>
                <p className="text-[11.5px] text-[#8298A9] mt-1 leading-relaxed">
                  Streams readings tick-by-tick through Tier 1-3 detectors with live chart animation.
                </p>
              </div>

              {/* Option 2: Immediate Batch */}
              <div
                onClick={() => setPlaybackMode('batch')}
                className={`p-3 rounded border cursor-pointer transition-all ${
                  playbackMode === 'batch'
                    ? 'border-[#5C88C4] bg-[#5C88C4]/10'
                    : 'border-[#28394A] bg-[#0E1620] hover:border-[#8298A9]'
                }`}
              >
                <div className="flex items-center gap-2 font-medium text-xs text-[#E7EDF3]">
                  <Zap size={14} className={playbackMode === 'batch' ? 'text-[#5C88C4]' : 'text-[#8298A9]'} />
                  Batch Process All Now
                </div>
                <p className="text-[11.5px] text-[#8298A9] mt-1 leading-relaxed">
                  Instantly processes all records sequentially, updates graphs, and logs any detected tickets.
                </p>
              </div>
            </div>

            {playbackMode === 'queue' && (
              <div className="flex items-center justify-between pt-1 text-xs">
                <span className="text-[#8298A9]">Playback Tick Speed:</span>
                <div className="flex gap-1.5">
                  <button
                    onClick={() => setPlaybackSpeed('normal')}
                    className={`px-2 py-1 rounded text-xs border ${
                      playbackSpeed === 'normal'
                        ? 'bg-[#151F2A] border-[#3FA796] text-[#3FA796]'
                        : 'border-[#28394A] text-[#8298A9]'
                    }`}
                  >
                    1x (2.2s)
                  </button>
                  <button
                    onClick={() => setPlaybackSpeed('fast')}
                    className={`px-2 py-1 rounded text-xs border ${
                      playbackSpeed === 'fast'
                        ? 'bg-[#151F2A] border-[#3FA796] text-[#3FA796]'
                        : 'border-[#28394A] text-[#8298A9]'
                    }`}
                  >
                    2x (1.0s)
                  </button>
                  <button
                    onClick={() => setPlaybackSpeed('turbo')}
                    className={`px-2 py-1 rounded text-xs border ${
                      playbackSpeed === 'turbo'
                        ? 'bg-[#151F2A] border-[#3FA796] text-[#3FA796]'
                        : 'border-[#28394A] text-[#8298A9]'
                    }`}
                  >
                    5x (0.4s)
                  </button>
                </div>
              </div>
            )}

            <div className="pt-1 flex items-center gap-2 text-xs">
              <input
                type="checkbox"
                id="clear-hist-chk"
                checked={clearHistory}
                onChange={(e) => setClearHistory(e.target.checked)}
                className="rounded border-[#28394A] bg-[#0E1620] text-[#3FA796] focus:ring-0 cursor-pointer"
              />
              <label htmlFor="clear-hist-chk" className="text-[#8298A9] cursor-pointer">
                Reset station's rolling window before injecting CSV
              </label>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 border-t border-[#28394A] bg-[#111A24] flex items-center justify-between">
          <div className="text-xs text-[#8298A9] flex items-center gap-1.5">
            <Info size={13} />
            <span>Target: <span className="text-[#E7EDF3] font-medium">{targetStation?.name}</span></span>
          </div>

          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-3.5 py-1.5 rounded border border-[#28394A] text-xs font-medium text-[#8298A9] hover:text-[#E7EDF3] hover:bg-[#1B2733] transition-colors"
            >
              Cancel
            </button>
            <button
              id="confirm-inject-btn"
              disabled={!parseResult || parseResult.readings.length === 0}
              onClick={handleApply}
              className={`px-4 py-1.5 rounded text-xs font-semibold flex items-center gap-1.5 transition-all ${
                parseResult && parseResult.readings.length > 0
                  ? 'bg-[#3FA796] hover:bg-[#358E80] text-[#0E1620] cursor-pointer shadow-sm'
                  : 'bg-[#28394A] text-[#8298A9] cursor-not-allowed opacity-60'
              }`}
            >
              {playbackMode === 'queue' ? (
                <>
                  <Play size={13} />
                  Inject into Queue &amp; Start Playback
                </>
              ) : (
                <>
                  <Zap size={13} />
                  Batch Process All Records Now
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
