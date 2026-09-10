import React, { useState, useEffect, useRef, useCallback } from 'react';
import Chart from 'chart.js/auto';
import { Upload, Cloud, CloudRain } from 'lucide-react';
import {
  StationState,
  LogEntry,
  CsvReading,
  PlaybackSpeed,
} from './types';
import { BulkUploadModal } from './components/BulkUploadModal';
import { PlaybackControls } from './components/PlaybackControls';
import { AnomalyScoreHistoryChart } from './components/AnomalyScoreHistoryChart';
import { WeatherDataPanel } from './components/WeatherDataPanel';
import { WeatherDataControls } from './components/WeatherDataControls';
import { WeatherAnalysisDashboard } from './components/WeatherAnalysisDashboard';
import { weatherDataService } from './services/weatherDataService';
import { analyzeWeatherPattern, correlateWithSensorData, detectWeatherAnomalies, generateWeatherInsights } from './agents/weatherAnalysisAgent';
import { WeatherData, WeatherForecast } from './types';

// Configure Chart.js styling to match IBM Plex Sans and theme colors
Chart.defaults.font.family = "'IBM Plex Sans', sans-serif";
Chart.defaults.font.size = 11;
Chart.defaults.color = '#8298A9';

const REGIONS = {
  NORTH: 'North India',
  SOUTH: 'South India',
  WEST: 'West India',
};

const HISTORY_LEN = 60;

function avg(arr: number[]): number {
  if (!arr.length) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function stdDev(arr: number[]): number {
  if (arr.length < 2) return 0.5;
  const m = avg(arr);
  return Math.sqrt(avg(arr.map((v) => Math.pow(v - m, 2)))) || 0.0001;
}

function simulateReading(s: StationState, tIndex: number) {
  const diurnal = Math.sin((tIndex / HISTORY_LEN) * Math.PI * 2 - Math.PI / 2);
  let temp = s.baseTemp + diurnal * 3 + (Math.random() - 0.5) * 0.6;
  let pres = s.basePres + diurnal * -1.2 + (Math.random() - 0.5) * 0.4;
  let hum = s.baseHum + diurnal * -6 + (Math.random() - 0.5) * 2;

  if (s.injected) {
    const inj = s.injected;
    if (inj.type === 'bias') temp += inj.magnitude;
    if (inj.type === 'flatline') temp = inj.frozenValue ?? temp;
    if (inj.type === 'noise') temp += (Math.random() - 0.5) * inj.magnitude;
    if (inj.type === 'event') temp += inj.magnitude;
  }
  return { temp, pres, hum };
}

// Keep charts numerically stable while preserving the original missing-value signal for Tier 1.
function materializeCsvReading(s: StationState, reading: CsvReading): { temp: number; pres: number; hum: number; missing: string[] } {
  return {
    temp: reading.temp ?? s.history.temp.at(-1) ?? s.baseTemp,
    pres: reading.pres ?? s.history.pres.at(-1) ?? s.basePres,
    hum: reading.hum ?? s.history.hum.at(-1) ?? s.baseHum,
    missing: reading.missingFields ?? [],
  };
}

function createInitialStations(): StationState[] {
  const definitions = [
    { id: 'del-mgs', name: 'Delhi (Mungeshpur)', region: REGIONS.NORTH, baseTemp: 34, basePres: 1002, baseHum: 42 },
    { id: 'del-sfd', name: 'Delhi (Safdarjung)', region: REGIONS.NORTH, baseTemp: 33, basePres: 1003, baseHum: 44 },
    { id: 'jai', name: 'Jaipur', region: REGIONS.NORTH, baseTemp: 35, basePres: 998, baseHum: 30 },
    { id: 'blr', name: 'Bengaluru', region: REGIONS.SOUTH, baseTemp: 24, basePres: 1009, baseHum: 58 },
    { id: 'bom-col', name: 'Mumbai (Colaba)', region: REGIONS.WEST, baseTemp: 30, basePres: 1006, baseHum: 68 },
  ];

  return definitions.map((def) => {
    const st: StationState = {
      ...def,
      t: 0,
      status: 'normal',
      anomalyType: null,
      injected: null,
      tier1: { flagged: false, reasons: [] },
      tier2: { score: 0, flagged: false },
      tier3: { classification: 'none', confidence: 0, reason: '' },
      ticketIssued: false,
      usingCsv: false,
      csvQueue: null,
      totalCsvLoaded: 0,
      history: { temp: [], pres: [], hum: [], labels: [] },
    };

    const initialScores: number[] = [];
    for (let k = -HISTORY_LEN; k < 0; k++) {
      const r = simulateReading(st, k);
      st.history.temp.push(r.temp);
      st.history.pres.push(r.pres);
      st.history.hum.push(r.hum);
      st.history.labels.push(k);
      // Realistic baseline outlier scores (subtle noise between 0.06 and 0.15)
      const baseJitter = 0.08 + Math.sin(k * 0.28) * 0.04 + (Math.abs(k % 7) * 0.006);
      initialScores.push(Math.round(baseJitter * 1000) / 1000);
    }
    st.tier2 = {
      score: initialScores[initialScores.length - 1] || 0.08,
      flagged: false,
      scoreHistory: initialScores,
    };
    return st;
  });
}

export default function App() {
  const [stations, setStations] = useState<StationState[]>(createInitialStations);
  const [selectedId, setSelectedId] = useState<string>('del-mgs');
  const [logEntries, setLogEntries] = useState<LogEntry[]>([]);
  const [clockTime, setClockTime] = useState<string>(() => new Date().toLocaleTimeString());

  // Bulk Upload & Playback state
  const [isUploadOpen, setIsUploadOpen] = useState<boolean>(false);
  const [isSimulationPaused, setIsSimulationPaused] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<PlaybackSpeed>('normal');

  // Weather data state
  const [weatherEnabled, setWeatherEnabled] = useState<boolean>(false);
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [weatherForecast, setWeatherForecast] = useState<WeatherForecast | null>(null);
  const [weatherHistory, setWeatherHistory] = useState<WeatherData[]>([]);
  const [weatherRefresh, setWeatherRefresh] = useState(0);

  // Chart canvas refs
  const tempCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const presCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const humCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Chart instances
  const tempChartRef = useRef<Chart | null>(null);
  const presChartRef = useRef<Chart | null>(null);
  const humChartRef = useRef<Chart | null>(null);

  // Helper to make a chart instance
  const initChart = (ctx: CanvasRenderingContext2D, color: string, formatThousands = false) => {
    return new Chart(ctx, {
      type: 'line',
      data: {
        labels: [],
        datasets: [
          {
            data: [],
            borderColor: color,
            backgroundColor: color + '22',
            borderWidth: 2,
            pointRadius: 0,
            tension: 0.35,
            fill: true,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        scales: {
          x: { display: false },
          y: {
            grid: { color: '#28394A' },
            ticks: {
              color: '#8298A9',
              callback: function (val: any) {
                if (formatThousands && typeof val === 'number') {
                  return val.toLocaleString('en-US', { minimumFractionDigits: 1 });
                }
                return val;
              },
            },
          },
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            enabled: true,
            backgroundColor: '#151F2A',
            titleColor: '#8298A9',
            bodyColor: '#E7EDF3',
            borderColor: '#28394A',
            borderWidth: 1,
            displayColors: false,
          },
        },
      },
    });
  };

  // Mount Chart.js instances
  useEffect(() => {
    if (tempCanvasRef.current && !tempChartRef.current) {
      const ctx = tempCanvasRef.current.getContext('2d');
      if (ctx) tempChartRef.current = initChart(ctx, '#D9645A', false);
    }
    if (presCanvasRef.current && !presChartRef.current) {
      const ctx = presCanvasRef.current.getContext('2d');
      if (ctx) presChartRef.current = initChart(ctx, '#5C88C4', true);
    }
    if (humCanvasRef.current && !humChartRef.current) {
      const ctx = humCanvasRef.current.getContext('2d');
      if (ctx) humChartRef.current = initChart(ctx, '#3FA796', false);
    }

    return () => {
      tempChartRef.current?.destroy();
      tempChartRef.current = null;
      presChartRef.current?.destroy();
      presChartRef.current = null;
      humChartRef.current?.destroy();
      humChartRef.current = null;
    };
  }, []);

  // Update clock every second
  useEffect(() => {
    const timer = setInterval(() => {
      setClockTime(new Date().toLocaleTimeString());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch weather data when enabled and station changes
  useEffect(() => {
    if (!weatherEnabled) {
      setWeatherData(null);
      setWeatherForecast(null);
      return;
    }

    const activeStation = stations.find((s) => s.id === selectedId);
    if (!activeStation) return;

    const fetchWeatherData = async () => {
      try {
        const currentWeather = await weatherDataService.fetchCurrentWeather(activeStation);
        const forecast = await weatherDataService.fetchWeatherForecast(activeStation);
        setWeatherData(currentWeather);
        setWeatherForecast(forecast);
        const history = await weatherDataService.fetchHistoricalWeather(activeStation);
        setWeatherHistory(history);
        setStations(previous => previous.map(station => station.id === activeStation.id ? { ...station, weatherData: [...history, currentWeather], weatherForecast: forecast, weatherDataEnabled: true } : station));
      } catch (error) {
        console.error('Failed to fetch weather data:', error);
      }
    };

    fetchWeatherData();
    // Refresh weather data every 5 minutes
    const interval = setInterval(fetchWeatherData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [weatherEnabled, selectedId, weatherRefresh]);

  const refreshWeather = useCallback(() => {
    weatherDataService.clearCache();
    setWeatherRefresh(value => value + 1);
  }, []);

  // Quality Control Pipeline execution
  const runQC = useCallback((s: StationState, allStations: StationState[]): { newLog?: LogEntry } => {
    // 1. Tier 1 - Rule checks
    const reasons: string[] = [];
    const h = s.history.temp;
    const cur = h[h.length - 1];
    const prev = h[h.length - 2] ?? cur;

    if (s.lastDataDropout?.length) {
      reasons.push(`Data dropout detected: missing ${s.lastDataDropout.join(', ')} sensor value${s.lastDataDropout.length > 1 ? 's' : ''}`);
    }
    if (cur < -10 || cur > 55) {
      reasons.push('Temperature outside physical operating range (−10°C to 55°C)');
    }
    if (Math.abs(cur - prev) > 2.2) {
      reasons.push(`Step change of ${(cur - prev).toFixed(1)}°C between consecutive readings`);
    }
    const std10 = stdDev(h.slice(-10));
    if (std10 < 0.02) {
      reasons.push('Last 10 readings show near-zero variance (possible flatline)');
    }
    s.tier1 = { flagged: reasons.length > 0, reasons };

    // 2. Tier 2 - Statistical outlier score
    const windowT = h.slice(-30, -1);
    const meanT = avg(windowT);
    const stdT = stdDev(windowT) || 0.5;
    const zT = Math.abs(cur - meanT) / stdT;

    const hp = s.history.pres;
    const hh = s.history.hum;
    const zp = Math.abs(hp[hp.length - 1] - avg(hp.slice(-30, -1))) / (stdDev(hp.slice(-30, -1)) || 0.3);
    const zh = Math.abs(hh[hh.length - 1] - avg(hh.slice(-30, -1))) / (stdDev(hh.slice(-30, -1)) || 1);

    const combined = zT * 0.7 + zp * 0.15 + zh * 0.15;
    const score = Math.min(1, Math.max(0, combined / 6));
    const prevScores = s.tier2.scoreHistory || [];
    const newScores = [...prevScores, score];
    if (newScores.length > HISTORY_LEN) {
      newScores.shift();
    }
    s.tier2 = {
      score,
      flagged: score > 0.35,
      scoreHistory: newScores,
    };

    // 3. Tier 3 - Contextual classification
    if (!s.tier1.flagged && !s.tier2.flagged) {
      s.tier3 = { classification: 'none', confidence: 0, reason: '' };
      s.status = 'normal';
      s.ticketIssued = false;
      return {};
    }

    const delta = cur - prev;
    const peers = allStations.filter((p) => p.region === s.region && p.id !== s.id);
    let correlated = 0;
    peers.forEach((p) => {
      const pCur = p.history.temp[p.history.temp.length - 1];
      const pPrev = p.history.temp[p.history.temp.length - 2] ?? pCur;
      const pDelta = pCur - pPrev;
      if (Math.sign(pDelta) === Math.sign(delta) && Math.abs(pDelta) > 0.8) {
        correlated++;
      }
    });

    let type = 'noise';
    if (s.lastDataDropout?.length) type = 'data dropout';
    else if (s.tier1.reasons.some((r) => r.includes('flatline'))) type = 'flatline';
    else if (s.tier1.reasons.some((r) => r.includes('Step change'))) type = 'spike/bias';
    else if (s.tier2.score > 0.5) type = 'drift';
    s.anomalyType = type;

    let newLog: LogEntry | undefined;

    if (correlated >= 1) {
      const confidence = Math.min(96, 58 + correlated * 18 + Math.min(20, s.tier2.score * 20));
      s.tier3 = {
        classification: 'event',
        confidence: Math.round(confidence),
        reason: `${correlated} nearby station${
          correlated > 1 ? 's' : ''
        } in ${s.region} moved the same direction at the same time — consistent with a real atmospheric event, not an isolated sensor issue.`,
      };
      s.status = 'event';

      if (!s.ticketIssued) {
        s.ticketIssued = true;
        const nowStr = new Date().toLocaleTimeString();
        newLog = {
          id: `alert-${Date.now()}-${s.id}`,
          timestamp: nowStr,
          time: nowStr,
          stationName: s.name,
          station: s.name,
          region: s.region,
          kind: 'event',
          anomalyType: s.anomalyType,
          confidence: s.tier3.confidence,
          action: 'No dispatch — advisory issued to forecasters',
        };
      }
    } else {
      const confidence = Math.min(97, 55 + (s.tier1.flagged ? 20 : 0) + Math.min(22, s.tier2.score * 22));
      s.tier3 = {
        classification: 'fault',
        confidence: Math.round(confidence),
        reason: `No neighboring station in ${s.region} shows a correlated change — the deviation is isolated to this sensor, and its shape matches a known fault signature (${type}).`,
      };
      s.status = 'fault';

      if (!s.ticketIssued) {
        s.ticketIssued = true;
        const nowStr = new Date().toLocaleTimeString();
        newLog = {
          id: `alert-${Date.now()}-${s.id}`,
          timestamp: nowStr,
          time: nowStr,
          stationName: s.name,
          station: s.name,
          region: s.region,
          kind: 'fault',
          anomalyType: s.anomalyType,
          confidence: s.tier3.confidence,
          action: s.lastDataDropout?.length ? 'Data dropout logged — maintenance ticket auto-generated' : 'Maintenance ticket auto-generated',
          ticketStatus: 'open',
        };
      }
    }

    return { newLog };
  }, []);

  // Process Batch Immediately (evaluates all records sequentially)
  const processBatchAll = useCallback(
    (stationId: string, readings: CsvReading[], clearHistory: boolean) => {
      if (readings.length === 0) return;

      setStations((prevStations) => {
        const nextStations = prevStations.map((st) => ({
          ...st,
          tier1: { ...st.tier1 },
          tier2: { ...st.tier2 },
          tier3: { ...st.tier3 },
          history: {
            temp: [...st.history.temp],
            pres: [...st.history.pres],
            hum: [...st.history.hum],
            labels: [...st.history.labels],
          },
        }));

        const target = nextStations.find((s) => s.id === stationId);
        if (!target) return prevStations;

        if (clearHistory) {
          target.history.temp = [];
          target.history.pres = [];
          target.history.hum = [];
          target.history.labels = [];
        }

        const newLogs: LogEntry[] = [];

        readings.forEach((reading, idx) => {
          const value = materializeCsvReading(target, reading);
          target.t += 1;
          target.lastDataDropout = value.missing;
          target.history.temp.push(value.temp);
          target.history.pres.push(value.pres);
          target.history.hum.push(value.hum);
          target.history.labels.push(target.t);

          if (target.history.temp.length > HISTORY_LEN) {
            target.history.temp.shift();
            target.history.pres.shift();
            target.history.hum.shift();
            target.history.labels.shift();
          }

          const { newLog } = runQC(target, nextStations);
          if (newLog) {
            newLogs.push({
              ...newLog,
              id: `${newLog.id}-${idx}`,
            });
          }
        });

        target.usingCsv = false;
        target.csvQueue = null;
        target.totalCsvLoaded = 0;

        if (newLogs.length > 0) {
          setLogEntries((old) => [...newLogs, ...old].slice(0, 50));
        }

        return nextStations;
      });
    },
    [runQC]
  );

  // Single tick step (for manual playback stepping)
  const handleStepNext = useCallback(() => {
    setStations((prevStations) => {
      const nextList = prevStations.map((s) => {
        if (s.id !== selectedId || !s.csvQueue || s.csvQueue.length === 0) {
          return s;
        }
        const nextT = s.t + 1;
        const r = s.csvQueue[0];
        const value = materializeCsvReading(s, r);
        const remainingQueue = s.csvQueue.slice(1);
        const stillUsing = remainingQueue.length > 0;

        const newTemp = [...s.history.temp, value.temp];
        const newPres = [...s.history.pres, value.pres];
        const newHum = [...s.history.hum, value.hum];
        const newLabels = [...s.history.labels, nextT];

        if (newTemp.length > HISTORY_LEN) {
          newTemp.shift();
          newPres.shift();
          newHum.shift();
          newLabels.shift();
        }

        return {
          ...s,
          t: nextT,
          usingCsv: stillUsing,
          csvQueue: remainingQueue,
          lastDataDropout: value.missing,
          history: {
            temp: newTemp,
            pres: newPres,
            hum: newHum,
            labels: newLabels,
          },
        };
      });

      const newLogs: LogEntry[] = [];
      nextList.forEach((st) => {
        const { newLog } = runQC(st, nextList);
        if (newLog) newLogs.push(newLog);
      });

      if (newLogs.length > 0) {
        setLogEntries((old) => [...newLogs, ...old].slice(0, 30));
      }

      return nextList;
    });
  }, [selectedId, runQC]);

  // Fast forward remaining active station queue
  const handleFastForwardAll = useCallback(() => {
    const active = stations.find((s) => s.id === selectedId);
    if (!active || !active.csvQueue || active.csvQueue.length === 0) return;
    processBatchAll(selectedId, active.csvQueue, false);
  }, [stations, selectedId, processBatchAll]);

  // Clear active station queue
  const handleClearQueue = useCallback(() => {
    setStations((prev) =>
      prev.map((s) => {
        if (s.id === selectedId) {
          return {
            ...s,
            usingCsv: false,
            csvQueue: null,
            totalCsvLoaded: 0,
          };
        }
        return s;
      })
    );
  }, [selectedId]);

  // Handle Inject from Bulk Upload Modal
  const handleInjectQueue = useCallback(
    (
      stationId: string,
      readings: CsvReading[],
      options: {
        playbackMode: 'queue' | 'batch';
        speed: PlaybackSpeed;
        clearHistory: boolean;
      }
    ) => {
      setPlaybackSpeed(options.speed);
      setSelectedId(stationId);

      if (options.playbackMode === 'batch') {
        processBatchAll(stationId, readings, options.clearHistory);
      } else {
        // Queue for continuous playback
        setStations((prev) =>
          prev.map((s) => {
            if (s.id !== stationId) return s;

            let currentHist = s.history;
            if (options.clearHistory && readings.length > 0) {
              const first = materializeCsvReading(s, readings[0]);
              currentHist = {
                temp: [first.temp],
                pres: [first.pres],
                hum: [first.hum],
                labels: [0],
              };
            }

            return {
              ...s,
              usingCsv: true,
              csvQueue: [...readings],
              totalCsvLoaded: readings.length,
              ticketIssued: false,
              history: currentHist,
            };
          })
        );
        setIsSimulationPaused(false);
      }
    },
    [processBatchAll]
  );

  // Main simulation tick loop (interval adjusted based on playback speed)
  useEffect(() => {
    if (isSimulationPaused) return;

    const tickInterval = playbackSpeed === 'turbo' ? 400 : playbackSpeed === 'fast' ? 1000 : 2200;

    const interval = setInterval(() => {
      setStations((prevStations) => {
        const nextList = prevStations.map((s) => {
          const nextT = s.t + 1;
          let r: { temp: number; pres: number; hum: number };
          let nextQueue = s.csvQueue;
          let stillUsingCsv = s.usingCsv;

          if (s.usingCsv && s.csvQueue && s.csvQueue.length > 0) {
            const csv = s.csvQueue[0];
            const value = materializeCsvReading(s, csv);
            r = value;
            s.lastDataDropout = value.missing;
            nextQueue = s.csvQueue.slice(1);
            if (nextQueue.length === 0) {
              stillUsingCsv = false;
            }
          } else {
            r = simulateReading(s, nextT);
            s.lastDataDropout = [];
          }

          const newTemp = [...s.history.temp, r.temp];
          const newPres = [...s.history.pres, r.pres];
          const newHum = [...s.history.hum, r.hum];
          const newLabels = [...s.history.labels, nextT];

          if (newTemp.length > HISTORY_LEN) {
            newTemp.shift();
            newPres.shift();
            newHum.shift();
            newLabels.shift();
          }

          let nextInjected = s.injected;
          if (nextInjected) {
            const left = nextInjected.ticksLeft - 1;
            nextInjected = left <= 0 ? null : { ...nextInjected, ticksLeft: left };
          }

          return {
            ...s,
            t: nextT,
            injected: nextInjected,
            usingCsv: stillUsingCsv,
            csvQueue: nextQueue,
            history: {
              temp: newTemp,
              pres: newPres,
              hum: newHum,
              labels: newLabels,
            },
          };
        });

        const newLogs: LogEntry[] = [];
        nextList.forEach((st) => {
          const { newLog } = runQC(st, nextList);
          if (newLog) newLogs.push(newLog);
        });

        if (newLogs.length > 0) {
          setLogEntries((old) => [...newLogs, ...old].slice(0, 30));
        }

        return nextList;
      });
    }, tickInterval);

    return () => clearInterval(interval);
  }, [isSimulationPaused, playbackSpeed, runQC]);

  // Sync Charts with active selected station
  const activeStation = stations.find((s) => s.id === selectedId) || stations[0];

  useEffect(() => {
    if (!activeStation) return;
    const labels = activeStation.history.labels.map((_, i) => i);

    if (tempChartRef.current) {
      tempChartRef.current.data.labels = labels;
      tempChartRef.current.data.datasets[0].data = activeStation.history.temp;
      tempChartRef.current.update('none');
    }
    if (presChartRef.current) {
      presChartRef.current.data.labels = labels;
      presChartRef.current.data.datasets[0].data = activeStation.history.pres;
      presChartRef.current.update('none');
    }
    if (humChartRef.current) {
      humChartRef.current.data.labels = labels;
      humChartRef.current.data.datasets[0].data = activeStation.history.hum;
      humChartRef.current.update('none');
    }
  }, [stations, selectedId, activeStation]);

  // Scenario Buttons
  const handleRunMungeshpur = () => {
    setStations((prev) =>
      prev.map((s) => {
        if (s.id === 'del-mgs') {
          return {
            ...s,
            injected: { type: 'bias', magnitude: 3.0, ticksLeft: 40 },
            ticketIssued: false,
          };
        }
        return s;
      })
    );
    setSelectedId('del-mgs');
  };

  const handleRunHeatwave = () => {
    setStations((prev) =>
      prev.map((s) => {
        if (s.id === 'del-mgs' || s.id === 'del-sfd' || s.id === 'jai') {
          return {
            ...s,
            injected: { type: 'event', magnitude: 5.0, ticksLeft: 40 },
            ticketIssued: false,
          };
        }
        return s;
      })
    );
    setSelectedId('del-mgs');
  };

  const handleResetNetwork = () => {
    setStations((prev) =>
      prev.map((s) => ({
        ...s,
        injected: null,
        status: 'normal',
        ticketIssued: false,
        usingCsv: false,
        csvQueue: null,
        totalCsvLoaded: 0,
        tier1: { flagged: false, reasons: [] },
        tier2: {
          score: 0.08,
          flagged: false,
          scoreHistory: Array.from({ length: HISTORY_LEN }, (_, i) =>
            Math.round((0.07 + Math.sin(i * 0.25) * 0.03 + Math.random() * 0.02) * 1000) / 1000
          ),
        },
        tier3: { classification: 'none', confidence: 0, reason: '' },
      }))
    );
    setLogEntries([]);
  };

  // Counts
  const countNormal = stations.filter((s) => s.status === 'normal').length;
  const countFlagged = stations.filter((s) => s.status === 'flagged').length;
  const countFault = stations.filter((s) => s.status === 'fault').length;
  const countEvent = stations.filter((s) => s.status === 'event').length;

  const isDataDropout = Boolean(activeStation.lastDataDropout?.length);
  const curTemp = isDataDropout && activeStation.lastDataDropout?.includes('temperature') ? '—' : activeStation.history.temp[activeStation.history.temp.length - 1]?.toFixed(1) ?? '31.4';
  const curPres = isDataDropout && activeStation.lastDataDropout?.includes('pressure') ? '—' : activeStation.history.pres[activeStation.history.pres.length - 1]?.toFixed(1) ?? '1003.2';
  const curHum = isDataDropout && activeStation.lastDataDropout?.includes('humidity') ? '—' : activeStation.history.hum[activeStation.history.hum.length - 1]?.toFixed(0) ?? '47';

  // Pipeline state display
  const tier1Pass = !activeStation.tier1.flagged;
  const tier2Score = Math.round(activeStation.tier2.score * 100);
  const tier2Flag = activeStation.tier2.flagged;

  let tier3Text = 'Not evaluated — no upstream flag';
  let tier3Class = 'pass';
  if (isDataDropout) {
    verdictBoxClass = 'fault';
    verdictBadge = 'Data dropout — missing sensor data';
    verdictWhy = `Tier 1 detected absent ${activeStation.lastDataDropout?.join(', ')} telemetry for ${activeStation.name}.`;
    verdictConfidence = 95;
    verdictFillClass = 'fault';
  } else if (activeStation.tier3.classification === 'fault') {
    tier3Text = 'Isolated deviation — likely sensor fault';
    tier3Class = 'flag';
  } else if (activeStation.tier3.classification === 'event') {
    tier3Text = 'Regionally correlated — likely genuine event';
    tier3Class = 'flag';
  }

  let verdictBoxClass = 'normal';
  let verdictBadge = 'No anomaly active';
  let verdictWhy = "This station's last reading fell within expected range and matched the diurnal pattern of its neighbors.";
  let verdictConfidence = 0;
  let verdictFillClass = '';

  if (activeStation.tier3.classification === 'fault') {
    verdictBoxClass = 'fault';
    verdictBadge = `Likely sensor fault — ${activeStation.anomalyType || 'noise'}`;
    verdictWhy = activeStation.tier3.reason;
    verdictConfidence = activeStation.tier3.confidence;
    verdictFillClass = 'fault';
  } else if (activeStation.tier3.classification === 'event') {
    verdictBoxClass = 'event';
    verdictBadge = 'Likely genuine weather event';
    verdictWhy = activeStation.tier3.reason;
    verdictConfidence = activeStation.tier3.confidence;
    verdictFillClass = 'event';
  }

  return (
    <div className="app">
      {/* Header */}
      <header className="app-header">
        <div className="brand">
          <h1>Sentinel</h1>
          <span className="tag">Continuous QC for IMD's Automatic Weather Station network</span>
        </div>
        <div className="status-summary">
          <div className="status-chip">
            <span className="dot normal"></span>
            <span id="count-normal">{countNormal}</span> normal
          </div>
          <div className="status-chip">
            <span className="dot flagged"></span>
            <span id="count-flagged">{countFlagged}</span> under review
          </div>
          <div className="status-chip">
            <span className="dot fault"></span>
            <span id="count-fault">{countFault}</span> faults
          </div>
          <div className="status-chip">
            <span className="dot event"></span>
            <span id="count-event">{countEvent}</span> weather events
          </div>
          <button
            onClick={() => setWeatherEnabled(!weatherEnabled)}
            className="weather-toggle"
            title={weatherEnabled ? 'Weather data enabled (Click to disable)' : 'Weather data disabled (Click to enable)'}
          >
            {weatherEnabled ? <CloudRain className="w-4 h-4 text-[#5C88C4]" /> : <Cloud className="w-4 h-4 text-[#8298A9]" />}
          </button>
          <WeatherDataControls enabled={weatherEnabled} onEnabledChange={setWeatherEnabled} onRefresh={refreshWeather} />
          <div className="clock tnum" id="clock">
            {clockTime}
          </div>
        </div>
      </header>

      {/* Main 3-Column Layout */}
      <div className="main-grid">
        {/* Left Sidebar (Stations) */}
        <aside className="stations">
          <div className="section-label flex items-center justify-between">
            <span>Stations</span>
            <span className="text-[11px] text-[#8298A9]">5 Active</span>
          </div>
          <div id="station-list">
            {stations.map((s) => {
              const lastTemp = s.history.temp[s.history.temp.length - 1]?.toFixed(1) ?? '30.0';
              const hasQueue = s.csvQueue && s.csvQueue.length > 0;
              return (
                <div
                  key={s.id}
                  className={`station-item ${s.id === selectedId ? 'active' : ''}`}
                  onClick={() => setSelectedId(s.id)}
                >
                  <span className={`dot ${s.status}`}></span>
                  <div className="info">
                    <div className="name flex items-center gap-1.5">
                      <span>{s.name}</span>
                      {hasQueue && (
                        <span
                          className="px-1.5 py-0.2 text-[9.5px] rounded bg-[#3FA796]/20 text-[#3FA796] font-mono border border-[#3FA796]/30 shrink-0"
                          title={`${s.csvQueue?.length} CSV records in queue`}
                        >
                          Q:{s.csvQueue?.length}
                        </span>
                      )}
                    </div>
                    <div className="region">{s.region}</div>
                  </div>
                  <div className="reading tnum">{lastTemp}°</div>
                </div>
              );
            })}
          </div>
        </aside>

        {/* Center Main Readout */}
        <main className="readout">
          {/* Weather Data Panel (shown when enabled) */}
          {weatherEnabled && (
            <div className="mb-4">
              <WeatherDataPanel
                weatherData={weatherData}
                weatherForecast={weatherForecast}
                stationName={activeStation.name}
              />
              <WeatherAnalysisDashboard
                pattern={weatherHistory.length ? analyzeWeatherPattern(weatherHistory) : undefined}
                anomalies={weatherData ? detectWeatherAnomalies(weatherData, weatherHistory) : []}
                correlation={weatherHistory.length ? correlateWithSensorData(weatherHistory, activeStation.history.temp.map((temp, index) => ({ temp, hum: activeStation.history.hum[index] }))) : undefined}
                insights={weatherHistory.length ? generateWeatherInsights(analyzeWeatherPattern(weatherHistory)) : []}
              />
            </div>
          )}

          <div className="readout-head">
            <div>
              <h2 id="readout-title">{activeStation.name}</h2>
              <div className="sub" id="readout-sub">
                {activeStation.region} · Last 60 readings
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                id="btn-upload-readout"
                className="scen-btn highlight flex items-center gap-1.5"
                onClick={() => setIsUploadOpen(true)}
                title="Upload historical CSV data into station queue"
              >
                <Upload size={13} />
                <span>Bulk Upload CSV</span>
              </button>
            </div>
          </div>

          {/* Active Playback Controls Bar if station has queued CSV items */}
          {activeStation.csvQueue && activeStation.csvQueue.length > 0 && (
            <div className="mb-3.5">
              <PlaybackControls
                stationName={activeStation.name}
                queueLength={activeStation.csvQueue.length}
                totalLoaded={activeStation.totalCsvLoaded || activeStation.csvQueue.length}
                isPlaying={!isSimulationPaused}
                speed={playbackSpeed}
                onTogglePlay={() => setIsSimulationPaused((p) => !p)}
                onStepNext={handleStepNext}
                onFastForwardAll={handleFastForwardAll}
                onClearQueue={handleClearQueue}
                onSpeedChange={(spd) => setPlaybackSpeed(spd)}
              />
            </div>
          )}

          {/* Temperature Card */}
          <div className="chart-card">
            <div className="chart-title">
              <span>Temperature (°C)</span>
              <span id="temp-current" className="tnum">
                {curTemp}°C
              </span>
            </div>
            <div className="chart-wrap">
              <canvas ref={tempCanvasRef} id="chart-temp"></canvas>
            </div>
          </div>

          {/* Secondary Mini Row (Pressure & Humidity) */}
          <div className="mini-row">
            <div className="chart-card">
              <div className="chart-title">
                <span>Pressure (hPa)</span>
                <span id="pres-current" className="tnum">
                  {curPres} hPa
                </span>
              </div>
              <div className="chart-wrap">
                <canvas ref={presCanvasRef} id="chart-pres"></canvas>
              </div>
            </div>

            <div className="chart-card">
              <div className="chart-title">
                <span>Relative humidity (%)</span>
                <span id="hum-current" className="tnum">
                  {curHum}%
                </span>
              </div>
              <div className="chart-wrap">
                <canvas ref={humCanvasRef} id="chart-hum"></canvas>
              </div>
            </div>
          </div>
        </main>

        {/* Right Sidebar (Detection Pipeline) */}
        <aside className="pipeline">
          <h3>Detection pipeline</h3>
          <div className="sub" id="pipeline-station-name">
            {activeStation.name} · {activeStation.region}
          </div>

          {/* Tier 1 */}
          <div className="tier">
            <div className="tier-head">
              <span className="name">Tier 1 — Rule checks</span>
              <span className="n">instant</span>
            </div>
            <div className={`result ${tier1Pass ? 'pass' : 'flag'}`} id="tier1-result">
              {tier1Pass ? 'Within expected bounds' : 'Flagged'}
            </div>
            {activeStation.tier1.reasons.length > 0 && (
              <ul id="tier1-list">
                {activeStation.tier1.reasons.map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            )}
          </div>

          {/* Tier 2 */}
          <div className="tier" id="pipeline-tier2-card">
            <div className="tier-head">
              <span className="name">Tier 2 — Statistical outlier score</span>
              <span className="n">rolling window</span>
            </div>
            <div className={`result ${tier2Flag ? 'flag' : 'pass'}`} id="tier2-result">
              {tier2Flag
                ? `Elevated outlier score — ${tier2Score} / 100`
                : `Outlier score ${tier2Score} / 100 — normal`}
            </div>
            <div className="confidence-bar">
              <div
                className="fill"
                id="tier2-bar"
                style={{
                  width: `${tier2Score}%`,
                  background: tier2Flag ? 'var(--amber)' : 'var(--teal)',
                }}
              ></div>
            </div>

            {/* D3-based Anomaly Score History line chart */}
            <div className="mt-3 pt-2.5 border-t border-[#28394A]/70" id="tier2-anomaly-chart-wrap">
              <AnomalyScoreHistoryChart
                data={activeStation.tier2.scoreHistory || []}
                currentScore={activeStation.tier2.score}
                threshold={0.35}
                stationName={activeStation.name}
              />
            </div>
          </div>

          {/* Tier 3 */}
          <div className="tier">
            <div className="tier-head">
              <span className="name">Tier 3 — Contextual classification</span>
              <span className="n">regional cross-check</span>
            </div>
            <div className={`result ${tier3Class}`} id="tier3-result">
              {tier3Text}
            </div>
          </div>

          {/* Verdict Box */}
          <div className={`verdict ${verdictBoxClass}`} id="verdict-box">
            <div className="badge" id="verdict-badge">
              {verdictBadge}
            </div>
            <div className="why" id="verdict-why">
              {verdictWhy}
            </div>
            <div className="confidence-bar">
              <div
                className={`fill ${verdictFillClass}`}
                id="verdict-bar"
                style={{ width: `${verdictConfidence}%` }}
              ></div>
            </div>
            <div className="confidence-label">
              <span>Confidence</span>
              <span id="verdict-conf">{verdictConfidence}%</span>
            </div>
          </div>
        </aside>
      </div>

      {/* Alert & Ticket Log */}
      <section className="log">
        <div className="log-head">
          <h3>Alert &amp; ticket log</h3>
          <span className="sub" style={{ color: 'var(--muted)', fontSize: '11.5px' }}>
            Most recent first
          </span>
        </div>
        <div id="log-body">
          {logEntries.length === 0 ? (
            <div className="log-empty">
              No anomalies logged yet. Run a scenario above, upload a CSV dataset, or wait for the live simulation to surface one.
            </div>
          ) : (
            <table className="log-table">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Station</th>
                  <th>Type</th>
                  <th>Classification</th>
                  <th>Confidence</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {logEntries.map((e) => (
                  <tr key={e.id}>
                    <td className="tnum">{e.time}</td>
                    <td>{e.station}</td>
                    <td>{e.anomalyType || '—'}</td>
                    <td>
                      <span className={`pill ${e.kind}`}>
                        {e.kind === 'fault' ? 'Sensor fault' : 'Weather event'}
                      </span>
                    </td>
                    <td className="tnum">{e.confidence}%</td>
                    <td>
                      {e.kind === 'fault' && <span className="pill ticket">Ticket</span>}{' '}
                      {e.action}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

      {/* Demo Scenarios Toolbar (Bottom Bar) */}
      <div className="scenario-bar">
        <span className="label">Demo scenarios</span>
        <button className="scen-btn primary" id="btn-mungeshpur" onClick={handleRunMungeshpur}>
          Run Mungeshpur-type fault (Delhi)
        </button>
        <button className="scen-btn secondary" id="btn-heatwave" onClick={handleRunHeatwave}>
          Run regional heatwave (North India)
        </button>
        <button className="scen-btn" id="btn-reset" onClick={handleResetNetwork}>
          Reset network
        </button>
        <button
          className="scen-btn highlight flex items-center gap-1.5"
          id="btn-bulk-upload"
          onClick={() => setIsUploadOpen(true)}
        >
          <Upload size={13} />
          <span>Bulk Upload CSV</span>
        </button>
      </div>

      {/* Bulk Upload CSV Modal */}
      <BulkUploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        stations={stations}
        selectedStationId={selectedId}
        onInjectQueue={handleInjectQueue}
      />
    </div>
  );
}
