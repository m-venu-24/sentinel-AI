import React from 'react';
import { Play, Pause, RotateCcw, StepForward, Zap, Flame, ThermometerSnowflake, Activity, ChevronDown } from 'lucide-react';
import { UserRole } from '../types';

interface ScenarioBarProps {
  role: UserRole;
  isRunning: boolean;
  onToggleRunning: () => void;
  onStepOnce: () => void;
  onRunMungeshpur: () => void;
  onRunHeatwave: () => void;
  onInjectFault: (type: 'flatline' | 'noise' | 'spike') => void;
  onReset: () => void;
  speedMultiplier: number;
  onSetSpeed: (speed: number) => void;
  dataSourceText: string;
}

export const ScenarioBar: React.FC<ScenarioBarProps> = ({
  role,
  isRunning,
  onToggleRunning,
  onStepOnce,
  onRunMungeshpur,
  onRunHeatwave,
  onInjectFault,
  onReset,
  speedMultiplier,
  onSetSpeed,
  dataSourceText,
}) => {
  const [showMoreFaults, setShowMoreFaults] = React.useState(false);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-2.5 bg-[#1B2733] border-b border-[#28394A] text-xs">
      {/* Left: Scenarios */}
      <div className="flex items-center flex-wrap gap-2">
        <span className="text-[#8298A9] font-medium mr-1">Scenarios:</span>

        {/* Mungeshpur Type Fault */}
        <button
          id="btn-mungeshpur"
          onClick={onRunMungeshpur}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#151F2A] border border-[#D9645A]/50 text-[#F3D8D5] hover:bg-[#D9645A]/15 active:scale-[0.98] font-medium transition-all"
          title="Simulate isolated +3.0°C sensor drift at Delhi Mungeshpur (reproducing the May 2024 anomaly)"
        >
          <Zap className="w-3.5 h-3.5 text-[#D9645A]" />
          Run Mungeshpur-type fault (Delhi)
        </button>

        {/* Regional Heatwave */}
        <button
          id="btn-heatwave"
          onClick={onRunHeatwave}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#151F2A] border border-[#5C88C4]/50 text-[#D6E1F5] hover:bg-[#5C88C4]/15 active:scale-[0.98] font-medium transition-all"
          title="Simulate synchronous +5.0°C thermal surge across Delhi Mungeshpur, Safdarjung, and Jaipur"
        >
          <Flame className="w-3.5 h-3.5 text-[#5C88C4]" />
          Run regional heatwave (North India)
        </button>

        {/* Advanced Fault Injections Dropdown */}
        <div className="relative">
          <button
            id="btn-more-faults"
            onClick={() => setShowMoreFaults(!showMoreFaults)}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded bg-[#151F2A] border border-[#28394A] text-[#8298A9] hover:text-[#E7EDF3] hover:border-[#8298A9] transition-all"
            title="Inject additional sensor failure signatures"
          >
            More Faults
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showMoreFaults ? 'rotate-180' : ''}`} />
          </button>

          {showMoreFaults && (
            <div
              className="absolute left-0 mt-1.5 w-52 bg-[#151F2A] border border-[#28394A] rounded-md shadow-xl py-1 z-30 flex flex-col"
              onMouseLeave={() => setShowMoreFaults(false)}
            >
              <button
                id="btn-fault-flatline"
                onClick={() => {
                  onInjectFault('flatline');
                  setShowMoreFaults(false);
                }}
                className="flex items-center gap-2 px-3 py-2 text-left text-xs text-[#E7EDF3] hover:bg-[#1B2733] transition-colors"
              >
                <ThermometerSnowflake className="w-3.5 h-3.5 text-cyan-400" />
                <div>
                  <div className="font-medium">Sensor Flatline / Freeze</div>
                  <div className="text-[10px] text-[#8298A9]">Stuck ADC reading (zero variance)</div>
                </div>
              </button>

              <button
                id="btn-fault-spike"
                onClick={() => {
                  onInjectFault('spike');
                  setShowMoreFaults(false);
                }}
                className="flex items-center gap-2 px-3 py-2 text-left text-xs text-[#E7EDF3] hover:bg-[#1B2733] transition-colors border-t border-[#28394A]/50"
              >
                <Activity className="w-3.5 h-3.5 text-amber-400" />
                <div>
                  <div className="font-medium">Step Jump (+6.0°C)</div>
                  <div className="text-[10px] text-[#8298A9]">Electrical transient / spike</div>
                </div>
              </button>

              <button
                id="btn-fault-noise"
                onClick={() => {
                  onInjectFault('noise');
                  setShowMoreFaults(false);
                }}
                className="flex items-center gap-2 px-3 py-2 text-left text-xs text-[#E7EDF3] hover:bg-[#1B2733] transition-colors border-t border-[#28394A]/50"
              >
                <Zap className="w-3.5 h-3.5 text-rose-400" />
                <div>
                  <div className="font-medium">Sensor Jitter / High Noise</div>
                  <div className="text-[10px] text-[#8298A9]">Cable shielding degradation</div>
                </div>
              </button>
            </div>
          )}
        </div>

        {/* Reset Network */}
        <button
          id="btn-reset"
          onClick={onReset}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded bg-[#151F2A] border border-[#28394A] text-[#8298A9] hover:text-[#E7EDF3] hover:border-[#8298A9] transition-all"
          title="Clear all injected anomalies, revert to nominal diurnal cycle, and clear alert log"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Reset network
        </button>
      </div>

      {/* Right: Simulation Controls & Data Source Indicator */}
      <div className="flex items-center gap-3">
        {/* Play/Pause & Step */}
        <div className="flex items-center bg-[#151F2A] border border-[#28394A] rounded p-0.5">
          <button
            id="btn-play-pause"
            onClick={onToggleRunning}
            className={`p-1 rounded text-xs transition-colors ${
              isRunning ? 'text-[#3FA796] hover:bg-[#3FA796]/15' : 'text-[#E0A458] hover:bg-[#E0A458]/15'
            }`}
            title={isRunning ? 'Pause telemetry streaming' : 'Resume telemetry streaming'}
          >
            {isRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
          </button>

          <button
            id="btn-step"
            onClick={onStepOnce}
            disabled={isRunning}
            className={`p-1 rounded text-xs transition-colors ${
              isRunning ? 'text-[#8298A9]/40 cursor-not-allowed' : 'text-[#8298A9] hover:text-[#E7EDF3]'
            }`}
            title="Step single simulation cycle (when paused)"
          >
            <StepForward className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Speed multiplier */}
        <div className="flex items-center gap-1 text-[11px] text-[#8298A9]">
          <span>Speed:</span>
          {[1, 2, 4].map((s) => (
            <button
              key={s}
              id={`btn-speed-${s}x`}
              onClick={() => onSetSpeed(s)}
              className={`px-1.5 py-0.5 rounded font-mono ${
                speedMultiplier === s ? 'bg-[#3FA796]/20 text-[#3FA796] font-bold border border-[#3FA796]/40' : 'hover:text-[#E7EDF3]'
              }`}
            >
              {s}x
            </button>
          ))}
        </div>

        {/* Data Source Label */}
        <div className="pl-2 border-l border-[#28394A] text-[#8298A9] font-mono text-[11px]">
          <span className="text-[#3FA796] font-sans mr-1">●</span>
          {dataSourceText}
        </div>
      </div>
    </div>
  );
};
