import React, { useState } from 'react';
import { LogEntry, UserRole } from '../types';
import { Download, Trash2, CheckCircle2, Wrench, AlertTriangle, CloudSun, Filter, Search } from 'lucide-react';
import { exportLogsToCSV } from '../utils/csvExporter';

interface LogTableProps {
  entries: LogEntry[];
  role: UserRole;
  onClearLog: () => void;
  onUpdateTicketStatus: (id: string, newStatus: LogEntry['ticketStatus']) => void;
}

export const LogTable: React.FC<LogTableProps> = ({
  entries,
  role,
  onClearLog,
  onUpdateTicketStatus,
}) => {
  const [filterType, setFilterType] = useState<'all' | 'fault' | 'event' | 'ticket'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredEntries = entries.filter((e) => {
    if (filterType === 'fault' && e.kind !== 'fault') return false;
    if (filterType === 'event' && e.kind !== 'event') return false;
    if (filterType === 'ticket' && e.kind !== 'fault') return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        e.stationName.toLowerCase().includes(q) ||
        e.anomalyType.toLowerCase().includes(q) ||
        e.action.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleExportCsv = () => {
    exportLogsToCSV(filteredEntries);
  };

  return (
    <section className="bg-[#151F2A] border-t border-[#28394A] max-h-56 flex flex-col shrink-0 text-xs">
      {/* Log Header with Controls */}
      <div className="sticky top-0 bg-[#151F2A] px-5 py-2.5 flex flex-wrap items-center justify-between border-b border-[#28394A] gap-2 z-10">
        <div className="flex items-center gap-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#E7EDF3] m-0">
            Alert &amp; Ticket Log
          </h3>
          <span className="text-[11px] text-[#8298A9]">({filteredEntries.length} logged)</span>
        </div>

        {/* Filter & Search Bar */}
        <div className="flex items-center gap-2">
          {/* Quick Filters */}
          <div className="flex items-center bg-[#1B2733] border border-[#28394A] rounded p-0.5 text-[11px]">
            {(['all', 'fault', 'event'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setFilterType(t)}
                className={`px-2 py-0.5 rounded capitalize ${
                  filterType === t ? 'bg-[#28394A] text-[#E7EDF3] font-medium' : 'text-[#8298A9] hover:text-[#E7EDF3]'
                }`}
              >
                {t === 'fault' ? 'Faults' : t === 'event' ? 'Events' : 'All'}
              </button>
            ))}
          </div>

          {/* Search box */}
          <div className="relative">
            <Search className="w-3 h-3 text-[#8298A9] absolute left-2 top-2" />
            <input
              type="text"
              placeholder="Search log..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-[#1B2733] border border-[#28394A] rounded pl-6 pr-2 py-1 text-[11px] text-[#E7EDF3] focus:outline-none focus:border-[#3FA796] w-32"
            />
          </div>

          {/* Export Log */}
          <button
            onClick={handleExportCsv}
            disabled={entries.length === 0}
            className="p-1.5 rounded bg-[#1B2733] border border-[#28394A] text-[#8298A9] hover:text-[#E7EDF3] disabled:opacity-40"
            title="Export alert log to CSV"
          >
            <Download className="w-3 h-3" />
          </button>

          {/* Clear Log */}
          <button
            onClick={onClearLog}
            disabled={entries.length === 0}
            className="p-1.5 rounded bg-[#1B2733] border border-[#28394A] text-[#8298A9] hover:text-[#D9645A] disabled:opacity-40"
            title="Clear all logged events"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Log Body */}
      <div id="log-body" className="overflow-y-auto flex-1">
        {filteredEntries.length === 0 ? (
          <div className="p-4 text-center text-[#8298A9] text-xs">
            No anomalies logged yet. Run a scenario above, or wait for the live simulation to surface one.
          </div>
        ) : (
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-[#28394A] text-[11px] text-[#8298A9] bg-[#111B27]/60 sticky top-0">
                <th className="py-2 px-4 font-medium">Time</th>
                <th className="py-2 px-4 font-medium">Station</th>
                <th className="py-2 px-4 font-medium">Type</th>
                <th className="py-2 px-4 font-medium">Classification</th>
                <th className="py-2 px-4 font-medium">Confidence</th>
                <th className="py-2 px-4 font-medium">Action / Ticket Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#28394A]/30 font-mono text-[11px]">
              {filteredEntries.map((e) => (
                <tr key={e.id} className="hover:bg-[#1B2733]/50 transition-colors">
                  <td className="py-2 px-4 text-[#8298A9] whitespace-nowrap">{e.timestamp}</td>
                  <td className="py-2 px-4 font-sans font-medium text-[#E7EDF3]">{e.stationName}</td>
                  <td className="py-2 px-4 text-[#8298A9] uppercase">{e.anomalyType || '—'}</td>
                  <td className="py-2 px-4 whitespace-nowrap font-sans">
                    {e.kind === 'fault' ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#D9645A]/15 text-[#F0A79E] border border-[#D9645A]/30">
                        Sensor fault
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#5C88C4]/15 text-[#AFC8EE] border border-[#5C88C4]/30">
                        Weather event
                      </span>
                    )}
                  </td>
                  <td className="py-2 px-4 font-bold text-[#E7EDF3]">{e.confidence}%</td>
                  <td className="py-2 px-4 font-sans flex items-center gap-2">
                    {e.kind === 'fault' && (
                      <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold uppercase bg-[#E0A458]/15 text-[#F1CC97] border border-[#E0A458]/30">
                        Ticket
                      </span>
                    )}
                    <span className="text-[#8298A9] truncate max-w-xs">{e.action}</span>

                    {/* Interactive Ticket Workflow (Technician / Admin) */}
                    {e.kind === 'fault' && (role === 'technician' || role === 'admin') && (
                      <div className="ml-auto flex items-center gap-1">
                        {e.ticketStatus === 'open' && (
                          <button
                            onClick={() => onUpdateTicketStatus(e.id, 'dispatched')}
                            className="text-[10px] px-2 py-0.5 rounded bg-[#1B2733] border border-[#28394A] text-[#E0A458] hover:border-[#E0A458]"
                          >
                            Dispatch
                          </button>
                        )}
                        {e.ticketStatus === 'dispatched' && (
                          <button
                            onClick={() => onUpdateTicketStatus(e.id, 'resolved')}
                            className="text-[10px] px-2 py-0.5 rounded bg-[#3FA796]/20 border border-[#3FA796]/40 text-[#3FA796] hover:bg-[#3FA796]/30"
                          >
                            Resolve
                          </button>
                        )}
                        {e.ticketStatus === 'resolved' && (
                          <span className="text-[10px] text-[#3FA796] flex items-center gap-0.5">
                            <CheckCircle2 className="w-3 h-3" />
                            Closed
                          </span>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
};
