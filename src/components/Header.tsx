import React from 'react';
import { UserRole } from '../types';
import { Activity, ShieldAlert, Radio, Wrench, CloudSun, UserCheck, Volume2, VolumeX, MapPin, LineChart, Cloud, CloudRain } from 'lucide-react';

interface HeaderProps {
  role: UserRole;
  setRole: (role: UserRole) => void;
  counts: { normal: number; flagged: number; fault: number; event: number };
  currentTime: string;
  soundEnabled: boolean;
  setSoundEnabled: (val: boolean) => void;
  activeView: 'charts' | 'map';
  setActiveView: (view: 'charts' | 'map') => void;
  weatherEnabled: boolean;
  setWeatherEnabled: (val: boolean) => void;
}

export const Header: React.FC<HeaderProps> = ({
  role,
  setRole,
  counts,
  currentTime,
  soundEnabled,
  setSoundEnabled,
  activeView,
  setActiveView,
  weatherEnabled,
  setWeatherEnabled,
}) => {
  const roleLabels: Record<UserRole, { label: string; desc: string; icon: React.ReactNode; badgeClass: string }> = {
    technician: {
      label: 'Technician view',
      desc: 'Hardware triage, physical sensor diagnostics & tickets',
      icon: <Wrench className="w-3.5 h-3.5 text-amber-300" />,
      badgeClass: 'bg-amber-500/15 text-amber-200 border-amber-500/30',
    },
    forecaster: {
      label: 'Forecaster view',
      desc: 'Synoptic events, regional heatwaves & weather advisories',
      icon: <CloudSun className="w-3.5 h-3.5 text-blue-300" />,
      badgeClass: 'bg-blue-500/15 text-blue-200 border-blue-500/30',
    },
    admin: {
      label: 'Administrator view',
      desc: 'Full QC pipeline, ingestion, simulation & dispatch controls',
      icon: <UserCheck className="w-3.5 h-3.5 text-purple-300" />,
      badgeClass: 'bg-purple-500/15 text-purple-200 border-purple-500/30',
    },
  };

  return (
    <header className="flex flex-wrap items-center justify-between gap-4 px-5 py-3.5 bg-[#151F2A] border-b border-[#28394A]">
      {/* Brand & Subtitle */}
      <div className="flex items-center gap-3.5">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#3FA796]/15 border border-[#3FA796]/30 text-[#3FA796]">
          <Radio className="w-4 h-4 animate-pulse" />
        </div>
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-lg font-bold tracking-tight text-[#E7EDF3] m-0">Sentinel</h1>
            <span className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-0.5 rounded-full border font-medium ${roleLabels[role].badgeClass}`}>
              {roleLabels[role].icon}
              {roleLabels[role].label}
            </span>
          </div>
          <p className="text-xs text-[#8298A9] m-0">
            Continuous QC &amp; Anomaly Detection for IMD's Automatic Weather Station (AWS) network
          </p>
        </div>
      </div>

      {/* Center/Right Status & Controls */}
      <div className="flex items-center flex-wrap gap-4 text-xs">
        {/* View switcher */}
        <div className="flex items-center bg-[#1B2733] border border-[#28394A] rounded-md p-0.5">
          <button
            id="btn-view-charts"
            onClick={() => setActiveView('charts')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-colors ${
              activeView === 'charts' ? 'bg-[#28394A] text-[#E7EDF3]' : 'text-[#8298A9] hover:text-[#E7EDF3]'
            }`}
            title="Time-series telemetry charts"
          >
            <LineChart className="w-3.5 h-3.5" />
            Charts
          </button>
          <button
            id="btn-view-map"
            onClick={() => setActiveView('map')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-colors ${
              activeView === 'map' ? 'bg-[#28394A] text-[#E7EDF3]' : 'text-[#8298A9] hover:text-[#E7EDF3]'
            }`}
            title="Spatial network map & topology"
          >
            <MapPin className="w-3.5 h-3.5" />
            Network Map
          </button>
        </div>

        {/* Role Selector */}
        <div className="flex items-center gap-2">
          <label htmlFor="role-select" className="text-[#8298A9] font-medium">Role</label>
          <select
            id="role-select"
            value={role}
            onChange={(e) => setRole(e.target.value as UserRole)}
            className="bg-[#1B2733] text-[#E7EDF3] border border-[#28394A] rounded px-2.5 py-1 text-xs focus:outline-none focus:border-[#3FA796] transition-colors cursor-pointer"
          >
            <option value="technician">Technician</option>
            <option value="forecaster">Forecaster</option>
            <option value="admin">Administrator</option>
          </select>
        </div>

        {/* Status Counters */}
        <div className="flex items-center gap-3.5 bg-[#1B2733]/80 border border-[#28394A] rounded-md px-3 py-1">
          <div className="flex items-center gap-1.5" title="Operating within bounds and regional correlation">
            <span className="w-2 h-2 rounded-full bg-[#3FA796] ring-2 ring-[#3FA796]/20"></span>
            <span className="font-mono text-[#E7EDF3] font-semibold">{counts.normal}</span>
            <span className="text-[#8298A9]">normal</span>
          </div>

          <div className="flex items-center gap-1.5" title="Triggered Tier 1 or Tier 2 preliminary checks">
            <span className="w-2 h-2 rounded-full bg-[#E0A458] ring-2 ring-[#E0A458]/20"></span>
            <span className="font-mono text-[#E7EDF3] font-semibold">{counts.flagged}</span>
            <span className="text-[#8298A9]">review</span>
          </div>

          <div className="flex items-center gap-1.5" title="Isolated instrument fault (Technician ticket required)">
            <span className="w-2 h-2 rounded-full bg-[#D9645A] ring-2 ring-[#D9645A]/20"></span>
            <span className="font-mono text-[#F0A79E] font-semibold">{counts.fault}</span>
            <span className="text-[#8298A9]">faults</span>
          </div>

          <div className="flex items-center gap-1.5" title="Regionally confirmed weather event (Forecaster advisory)">
            <span className="w-2 h-2 rounded-full bg-[#5C88C4] ring-2 ring-[#5C88C4]/20"></span>
            <span className="font-mono text-[#AFC8EE] font-semibold">{counts.event}</span>
            <span className="text-[#8298A9]">events</span>
          </div>
        </div>

        {/* Weather Data Toggle */}
        <button
          id="btn-toggle-weather"
          onClick={() => setWeatherEnabled(!weatherEnabled)}
          title={weatherEnabled ? 'Weather data integration active (Click to disable)' : 'Weather data integration disabled (Click to enable)'}
          className="p-1.5 rounded bg-[#1B2733] border border-[#28394A] text-[#8298A9] hover:text-[#E7EDF3] transition-colors"
        >
          {weatherEnabled ? <CloudRain className="w-3.5 h-3.5 text-[#5C88C4]" /> : <Cloud className="w-3.5 h-3.5" />}
        </button>

        {/* Audio Alert Toggle */}
        <button
          id="btn-toggle-sound"
          onClick={() => setSoundEnabled(!soundEnabled)}
          title={soundEnabled ? 'Audio alerts active (Click to mute)' : 'Audio alerts muted (Click to enable)'}
          className="p-1.5 rounded bg-[#1B2733] border border-[#28394A] text-[#8298A9] hover:text-[#E7EDF3] transition-colors"
        >
          {soundEnabled ? <Volume2 className="w-3.5 h-3.5 text-[#3FA796]" /> : <VolumeX className="w-3.5 h-3.5" />}
        </button>

        {/* Live Clock */}
        <div className="flex items-center gap-1.5 font-mono text-[#8298A9] bg-[#111B27] px-2.5 py-1 rounded border border-[#28394A]">
          <Activity className="w-3 h-3 text-[#3FA796]" />
          <span>{currentTime} IST</span>
        </div>
      </div>
    </header>
  );
};
