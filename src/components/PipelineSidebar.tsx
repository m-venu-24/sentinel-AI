import React from 'react';
import { Station, UserRole, AgentInsight } from '../types';
import { ShieldCheck, AlertTriangle, CloudSun, Wrench, Sparkles, CheckCircle, XCircle, ArrowUpRight, Check, Activity } from 'lucide-react';

interface PipelineSidebarProps {
  station: Station;
  role: UserRole;
  insight: AgentInsight;
  onDispatchTicket: (station: Station) => void;
  onIssueAdvisory: (station: Station) => void;
}

export const PipelineSidebar: React.FC<PipelineSidebarProps> = ({
  station,
  role,
  insight,
  onDispatchTicket,
  onIssueAdvisory,
}) => {
  const isTechnician = role === 'technician';
  const isForecaster = role === 'forecaster';

  const t1 = station.tier1;
  const t2 = station.tier2;
  const t3 = station.tier3;

  // Verdict style determination
  let verdictClass = 'bg-[#1B2733] border-[#28394A]';
  let badgeColor = 'text-[#E7EDF3]';
  let barFillColor = 'bg-[#3FA796]';
  let verdictTitle = 'No anomaly active';

  if (t3.classification === 'fault') {
    verdictClass = 'bg-[#D9645A]/10 border-[#D9645A]/40';
    badgeColor = 'text-[#F0A79E]';
    barFillColor = 'bg-[#D9645A]';
    verdictTitle = `Likely sensor fault — ${station.anomalyType.toUpperCase()}`;
  } else if (t3.classification === 'event') {
    verdictClass = 'bg-[#5C88C4]/10 border-[#5C88C4]/40';
    badgeColor = 'text-[#AFC8EE]';
    barFillColor = 'bg-[#5C88C4]';
    verdictTitle = 'Likely genuine weather event';
  } else if (t1.flagged || t2.flagged) {
    verdictClass = 'bg-[#E0A458]/10 border-[#E0A458]/40';
    badgeColor = 'text-[#F1CC97]';
    barFillColor = 'bg-[#E0A458]';
    verdictTitle = 'Observation under preliminary review';
  }

  return (
    <aside className="w-full md:w-80 lg:w-[340px] bg-[#151F2A] border-l border-[#28394A] p-4 flex flex-col overflow-y-auto space-y-3.5 text-xs">
      {/* Sidebar Header */}
      <div>
        <h3 className="text-sm font-bold text-[#E7EDF3] m-0">Detection Pipeline</h3>
        <p id="pipeline-station-name" className="text-[11px] text-[#8298A9] m-0 mt-0.5 truncate">
          {station.name} · {station.region}
        </p>
      </div>

      {/* AI Insight (Agent) Card - Hidden in technician role per prototype requirement */}
      {!isTechnician && (
        <div className="rounded-lg p-3 border border-[#8B7FD4]/40 bg-[#8B7FD4]/10 space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-xs text-[#D4CDF2] flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#8B7FD4]" />
              AI Insight (Agent)
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#8B7FD4]/20 text-[#D4CDF2]">
              Heuristic QC
            </span>
          </div>

          <div id="agent-summary" className="text-xs text-[#E7EDF3] leading-relaxed font-normal">
            {insight.summary}
          </div>

          <div id="agent-forecast" className="text-[11px] text-[#8298A9] border-t border-[#8B7FD4]/25 pt-2">
            {insight.forecast}
          </div>

          {insight.historicalContext && (
            <div className="text-[11px] text-[#D4CDF2]/80 bg-[#151F2A]/60 p-2 rounded border border-[#8B7FD4]/20 leading-snug">
              <span className="font-semibold text-[#D4CDF2]">Synoptic Context: </span>
              {insight.historicalContext}
            </div>
          )}

          <div className="text-[10px] text-[#8298A9] italic leading-tight">
            Simulated locally for this prototype — a production build routes this through an LLM agent with tools over the live and historical data.
          </div>
        </div>
      )}

      {/* Tier 1 — Rule Checks (Physical Bounds & Step) - Hidden in Forecaster view */}
      {!isForecaster && (
        <div className="bg-[#1B2733] border border-[#28394A] rounded-lg p-3 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-xs text-[#E7EDF3]">Tier 1 — Rule checks</span>
            <span className="text-[10px] font-mono text-[#8298A9]">instant</span>
          </div>

          <div
            id="tier1-result"
            className={`font-medium text-xs flex items-center gap-1.5 ${
              t1.flagged ? 'text-[#E0A458]' : 'text-[#3FA796]'
            }`}
          >
            {t1.flagged ? (
              <>
                <AlertTriangle className="w-3.5 h-3.5" />
                Physical Rule Violation
              </>
            ) : (
              <>
                <CheckCircle className="w-3.5 h-3.5" />
                Within physical bounds
              </>
            )}
          </div>

          {/* Sub-check status pills */}
          <div className="grid grid-cols-3 gap-1 pt-1 text-[10px] font-mono">
            <div className={`p-1 rounded text-center border ${t1.checks.range.passed ? 'bg-[#3FA796]/10 text-[#3FA796] border-[#3FA796]/30' : 'bg-[#D9645A]/15 text-[#F0A79E] border-[#D9645A]/40'}`}>
              Range: {t1.checks.range.passed ? 'OK' : 'FAIL'}
            </div>
            <div className={`p-1 rounded text-center border ${t1.checks.step.passed ? 'bg-[#3FA796]/10 text-[#3FA796] border-[#3FA796]/30' : 'bg-[#D9645A]/15 text-[#F0A79E] border-[#D9645A]/40'}`}>
              Step: {t1.checks.step.passed ? 'OK' : 'SPIKE'}
            </div>
            <div className={`p-1 rounded text-center border ${t1.checks.variance.passed ? 'bg-[#3FA796]/10 text-[#3FA796] border-[#3FA796]/30' : 'bg-[#D9645A]/15 text-[#F0A79E] border-[#D9645A]/40'}`}>
              Var: {t1.checks.variance.passed ? 'OK' : 'FLAT'}
            </div>
          </div>

          {t1.reasons.length > 0 && (
            <ul id="tier1-list" className="list-disc list-inside text-[11px] text-[#E0A458] space-y-0.5 pt-1">
              {t1.reasons.map((r, i) => (
                <li key={i} className="leading-snug">{r}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Tier 2 — Statistical Outlier Score - Hidden in Forecaster view */}
      {!isForecaster && (
        <div className="bg-[#1B2733] border border-[#28394A] rounded-lg p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-xs text-[#E7EDF3]">Tier 2 — Statistical outlier score</span>
            <span className="text-[10px] font-mono text-[#8298A9]">rolling window</span>
          </div>

          <div
            id="tier2-result"
            className={`font-medium text-xs ${t2.flagged ? 'text-[#E0A458]' : 'text-[#3FA796]'}`}
          >
            {t2.flagged
              ? `Elevated outlier score — ${(t2.score * 100).toFixed(0)} / 100`
              : `Outlier score ${(t2.score * 100).toFixed(0)} / 100 — normal`}
          </div>

          {/* Outlier score bar */}
          <div className="h-1.5 w-full bg-[#28394A] rounded-full overflow-hidden">
            <div
              id="tier2-bar"
              className={`h-full transition-all duration-300 ${t2.flagged ? 'bg-[#E0A458]' : 'bg-[#3FA796]'}`}
              style={{ width: `${Math.round(t2.score * 100)}%` }}
            ></div>
          </div>

          {/* Multivariate Z-Scores */}
          <div className="flex items-center justify-between text-[10px] font-mono text-[#8298A9] pt-1">
            <span>Z_Temp: <strong className="text-[#E7EDF3]">{t2.zTemp.toFixed(2)}σ</strong></span>
            <span>Z_Pres: <strong className="text-[#AFC8EE]">{t2.zPres.toFixed(2)}σ</strong></span>
            <span>Z_Hum: <strong className="text-[#B7E7DA]">{t2.zHum.toFixed(2)}σ</strong></span>
          </div>
        </div>
      )}

      {/* Tier 3 — Contextual Classification (Regional Cross-Check) */}
      <div className="bg-[#1B2733] border border-[#28394A] rounded-lg p-3 space-y-2">
        <div className="flex items-center justify-between">
          <span className="font-semibold text-xs text-[#E7EDF3]">Tier 3 — Contextual classification</span>
          <span className="text-[10px] font-mono text-[#8298A9]">regional cross-check</span>
        </div>

        <div
          id="tier3-result"
          className={`font-medium text-xs ${
            t3.classification === 'fault'
              ? 'text-[#F0A79E]'
              : t3.classification === 'event'
              ? 'text-[#AFC8EE]'
              : 'text-[#3FA796]'
          }`}
        >
          {t3.classification === 'none'
            ? 'Not evaluated — no upstream flag'
            : t3.classification === 'fault'
            ? 'Isolated deviation — likely sensor fault'
            : 'Regionally correlated — likely genuine event'}
        </div>

        {/* Peer stations correlation list */}
        {t3.peerComparisons && t3.peerComparisons.length > 0 && (
          <div className="space-y-1 pt-1 border-t border-[#28394A]/60">
            <div className="text-[10px] text-[#8298A9] font-medium">Regional Peers ({station.region}):</div>
            {t3.peerComparisons.map((peer) => (
              <div
                key={peer.peerId}
                className="flex items-center justify-between text-[11px] font-mono py-0.5"
              >
                <span className="truncate pr-2 text-[#E7EDF3]">{peer.peerName}</span>
                <span className={peer.correlated ? 'text-[#5C88C4] font-bold' : 'text-[#8298A9]'}>
                  {peer.peerDelta >= 0 ? '+' : ''}{peer.peerDelta.toFixed(1)}°C {peer.correlated ? '✓ (correlated)' : '—'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Final Verdict Box */}
      <div id="verdict-box" className={`rounded-lg p-3.5 border space-y-2 transition-all ${verdictClass}`}>
        <div id="verdict-badge" className={`font-bold text-sm tracking-tight ${badgeColor}`}>
          {verdictTitle}
        </div>

        <div id="verdict-why" className="text-xs text-[#8298A9] leading-relaxed">
          {t3.reason}
        </div>

        {/* Confidence Gauge */}
        <div className="space-y-1 pt-1">
          <div className="h-1.5 w-full bg-[#28394A] rounded-full overflow-hidden">
            <div
              id="verdict-bar"
              className={`h-full transition-all duration-300 ${barFillColor}`}
              style={{ width: `${t3.confidence}%` }}
            ></div>
          </div>
          <div className="flex items-center justify-between text-[11px] text-[#8298A9] font-mono">
            <span>Classification Confidence</span>
            <span id="verdict-conf" className="font-bold text-[#E7EDF3]">
              {t3.confidence}%
            </span>
          </div>
        </div>

        {/* Action Trigger Buttons */}
        {t3.classification === 'fault' && (
          <button
            id="btn-dispatch-ticket"
            onClick={() => onDispatchTicket(station)}
            className="w-full mt-2 py-2 px-3 rounded bg-[#D9645A] hover:bg-[#D9645A]/90 text-white font-medium flex items-center justify-center gap-1.5 transition-colors shadow"
          >
            <Wrench className="w-3.5 h-3.5" />
            Auto-generate Maintenance Ticket
          </button>
        )}

        {t3.classification === 'event' && (
          <button
            id="btn-issue-advisory"
            onClick={() => onIssueAdvisory(station)}
            className="w-full mt-2 py-2 px-3 rounded bg-[#5C88C4] hover:bg-[#5C88C4]/90 text-white font-medium flex items-center justify-center gap-1.5 transition-colors shadow"
          >
            <CloudSun className="w-3.5 h-3.5" />
            Issue Regional Weather Advisory
          </button>
        )}
      </div>
    </aside>
  );
};
