import React from 'react';
import { Play, Pause, SkipForward, FastForward, Trash2, Sliders } from 'lucide-react';
import { PlaybackSpeed } from '../types';

interface PlaybackControlsProps {
  stationName: string;
  queueLength: number;
  totalLoaded: number;
  isPlaying: boolean;
  speed: PlaybackSpeed;
  onTogglePlay: () => void;
  onStepNext: () => void;
  onFastForwardAll: () => void;
  onClearQueue: () => void;
  onSpeedChange: (speed: PlaybackSpeed) => void;
}

export const PlaybackControls: React.FC<PlaybackControlsProps> = ({
  stationName,
  queueLength,
  totalLoaded,
  isPlaying,
  speed,
  onTogglePlay,
  onStepNext,
  onFastForwardAll,
  onClearQueue,
  onSpeedChange,
}) => {
  const processed = Math.max(0, totalLoaded - queueLength);
  const progressPercent = totalLoaded > 0 ? Math.round((processed / totalLoaded) * 100) : 0;

  return (
    <div
      id="playback-control-bar"
      className="bg-[#111A24] border border-[#28394A] rounded-md px-3 py-2 flex items-center justify-between gap-3 text-xs flex-wrap"
    >
      <div className="flex items-center gap-2 min-w-0">
        <span className="w-2 h-2 rounded-full bg-[#3FA796] animate-pulse"></span>
        <div className="flex flex-col">
          <span className="font-semibold text-[#E7EDF3] truncate">
            Playback Queue: <span className="text-[#3FA796]">{stationName}</span>
          </span>
          <span className="text-[11px] text-[#8298A9]">
            {queueLength} rows remaining ({processed} of {totalLoaded} processed · {progressPercent}%)
          </span>
        </div>
      </div>

      <div className="flex items-center gap-1.5 flex-wrap">
        {/* Play/Pause Toggle */}
        <button
          id="btn-playback-toggle"
          onClick={onTogglePlay}
          className="px-2.5 py-1 rounded bg-[#1B2733] hover:bg-[#28394A] border border-[#28394A] text-[#E7EDF3] flex items-center gap-1 transition-colors font-medium"
          title={isPlaying ? 'Pause Playback' : 'Resume Playback'}
        >
          {isPlaying ? (
            <>
              <Pause size={12} className="text-[#E0A458]" />
              <span>Pause</span>
            </>
          ) : (
            <>
              <Play size={12} className="text-[#3FA796]" />
              <span>Play</span>
            </>
          )}
        </button>

        {/* Step 1 Row */}
        <button
          id="btn-playback-step"
          onClick={onStepNext}
          className="px-2.5 py-1 rounded bg-[#1B2733] hover:bg-[#28394A] border border-[#28394A] text-[#E7EDF3] flex items-center gap-1 transition-colors"
          title="Process next single CSV record"
        >
          <SkipForward size={12} />
          <span>Step</span>
        </button>

        {/* Process All Remaining Batch */}
        <button
          id="btn-playback-all"
          onClick={onFastForwardAll}
          className="px-2.5 py-1 rounded bg-[#1B2733] hover:bg-[#28394A] border border-[#28394A] text-[#5C88C4] hover:text-[#E7EDF3] flex items-center gap-1 transition-colors"
          title="Process all remaining CSV rows in immediate batch"
        >
          <FastForward size={12} />
          <span>Batch All</span>
        </button>

        {/* Speed Toggles */}
        <div className="flex items-center bg-[#0E1620] border border-[#28394A] rounded p-0.5 ml-1">
          <button
            onClick={() => onSpeedChange('normal')}
            className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${
              speed === 'normal' ? 'bg-[#28394A] text-[#3FA796] font-bold' : 'text-[#8298A9]'
            }`}
            title="Normal Speed (2.2s/tick)"
          >
            1x
          </button>
          <button
            onClick={() => onSpeedChange('fast')}
            className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${
              speed === 'fast' ? 'bg-[#28394A] text-[#3FA796] font-bold' : 'text-[#8298A9]'
            }`}
            title="Fast Speed (1.0s/tick)"
          >
            2x
          </button>
          <button
            onClick={() => onSpeedChange('turbo')}
            className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${
              speed === 'turbo' ? 'bg-[#28394A] text-[#3FA796] font-bold' : 'text-[#8298A9]'
            }`}
            title="Turbo Speed (0.4s/tick)"
          >
            5x
          </button>
        </div>

        {/* Clear Queue */}
        <button
          id="btn-playback-clear"
          onClick={onClearQueue}
          className="p-1 rounded bg-[#1B2733] hover:bg-[#D9645A]/20 hover:text-[#D9645A] border border-[#28394A] text-[#8298A9] transition-colors ml-1"
          title="Cancel and flush remaining queue"
        >
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  );
};
