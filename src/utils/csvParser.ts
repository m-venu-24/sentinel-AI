import { CsvReading } from '../types';

export interface ParseResult {
  readings: CsvReading[];
  errors: string[];
  totalRows: number;
  dropoutRows?: number;
  stats?: {
    minTemp: number;
    maxTemp: number;
    minPres: number;
    maxPres: number;
    minHum: number;
    maxHum: number;
  };
}

export function parseCsvText(rawText: string): ParseResult {
  const lines = rawText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !l.startsWith('#'));

  if (lines.length === 0) {
    return { readings: [], errors: ['File is empty or contains only comments'], totalRows: 0 };
  }

  // Detect delimiter: comma, semicolon, tab
  const firstLine = lines[0];
  let delimiter = ',';
  if (firstLine.includes('\t')) delimiter = '\t';
  else if (firstLine.includes(';') && !firstLine.includes(',')) delimiter = ';';

  // Check if first row is header
  const rawHeaders = firstLine.split(delimiter).map((h) => h.trim().toLowerCase().replace(/['"]+/g, ''));
  const hasHeader = rawHeaders.some((h) =>
    ['temp', 'temperature', 't', 'pres', 'pressure', 'p', 'hum', 'humidity', 'rh'].some((k) => h.includes(k))
  );

  let tempIdx = -1;
  let presIdx = -1;
  let humIdx = -1;
  let timeIdx = -1;

  let startLine = 0;

  if (hasHeader) {
    startLine = 1;
    rawHeaders.forEach((col, idx) => {
      if (col.includes('temp') || col === 't' || col === 'degc' || col === 'temperature') {
        if (tempIdx === -1) tempIdx = idx;
      } else if (col.includes('pres') || col.includes('baro') || col === 'p' || col === 'pressure' || col.includes('hpa')) {
        if (presIdx === -1) presIdx = idx;
      } else if (col.includes('hum') || col === 'rh' || col === 'humidity') {
        if (humIdx === -1) humIdx = idx;
      } else if (col.includes('time') || col.includes('date') || col === 'timestamp') {
        if (timeIdx === -1) timeIdx = idx;
      }
    });
  } else {
    // Default column fallback: [temp, pres, hum, time]
    tempIdx = 0;
    presIdx = 1;
    humIdx = 2;
    timeIdx = 3;
  }

  // If only 1 column, fallback tempIdx = 0
  if (tempIdx === -1) tempIdx = 0;

  const readings: CsvReading[] = [];
  const errors: string[] = [];

  let minTemp = Infinity;
  let maxTemp = -Infinity;
  let minPres = Infinity;
  let maxPres = -Infinity;
  let minHum = Infinity;
  let maxHum = -Infinity;
  let dropoutRows = 0;

  for (let i = startLine; i < lines.length; i++) {
    const row = lines[i].split(delimiter).map((v) => v.trim().replace(/['"]+/g, ''));
    if (row.length === 0 || (row.length === 1 && !row[0])) continue;

    const parseValue = (value: string | undefined): number | null => {
      const normalized = (value ?? '').trim().toLowerCase();
      if (!normalized || ['null', 'na', 'n/a', 'missing', '-'].includes(normalized)) return null;
      const parsed = Number(normalized);
      return Number.isFinite(parsed) ? parsed : null;
    };
    const tempVal = parseValue(row[tempIdx]);
    const presVal = presIdx === -1 ? null : parseValue(row[presIdx]);
    const humVal = humIdx === -1 ? null : parseValue(row[humIdx]);
    const missingFields: CsvReading['missingFields'] = [];
    if (tempVal === null) missingFields.push('temperature');
    if (presVal === null) missingFields.push('pressure');
    if (humVal === null) missingFields.push('humidity');
    if (missingFields.length > 0) dropoutRows++;

    const timeVal = timeIdx !== -1 && row[timeIdx] ? row[timeIdx] : undefined;

    if (tempVal !== null) { minTemp = Math.min(minTemp, tempVal); maxTemp = Math.max(maxTemp, tempVal); }
    if (presVal !== null) { minPres = Math.min(minPres, presVal); maxPres = Math.max(maxPres, presVal); }
    if (humVal !== null) { minHum = Math.min(minHum, humVal); maxHum = Math.max(maxHum, humVal); }

    readings.push({
      temp: tempVal,
      pres: presVal,
      hum: humVal,
      time: timeVal,
      originalIndex: readings.length + 1,
      missingFields,
    });
  }

  if (readings.length === 0 && errors.length === 0) {
    errors.push('No valid data rows found');
  }

  return {
    readings,
    errors,
    totalRows: readings.length,
    dropoutRows,
    stats:
      readings.length > 0
        ? {
            minTemp: Number.isFinite(minTemp) ? Math.round(minTemp * 10) / 10 : 0,
            maxTemp: Number.isFinite(maxTemp) ? Math.round(maxTemp * 10) / 10 : 0,
            minPres: Number.isFinite(minPres) ? Math.round(minPres * 10) / 10 : 0,
            maxPres: Number.isFinite(maxPres) ? Math.round(maxPres * 10) / 10 : 0,
            minHum: Number.isFinite(minHum) ? Math.round(minHum * 10) / 10 : 0,
            maxHum: Number.isFinite(maxHum) ? Math.round(maxHum * 10) / 10 : 0,
          }
        : undefined,
  };
}

export const SAMPLE_CSVS = [
  {
    id: 'sensor_dropout',
    name: 'AWS Data Dropout (Missing Telemetry)',
    description: 'A complete sensor record dropout. The row is accepted and escalated by Tier 1 instead of being discarded.',
    data: `time,temp,pres,hum
09:00,24.1,1009.2,58
09:05,24.3,1009.1,57
09:10,,,,
09:15,24.6,1008.9,56`,
  },
  {
    id: 'mungeshpur_spike',
    name: 'Mungeshpur 52.9°C Sensor Fault',
    description: 'Simulates the historical AWS sensor overheating drift in Delhi, ramping from 38°C to an abnormal 52.9°C spike.',
    data: `timestamp,temperature,pressure,humidity
14:00,38.2,1001.2,38
14:05,39.0,1001.0,37
14:10,39.8,1000.9,36
14:15,41.2,1000.7,35
14:20,43.5,1000.5,33
14:25,45.8,1000.3,31
14:30,48.2,1000.1,29
14:35,50.6,999.8,28
14:40,52.4,999.6,26
14:45,52.9,999.5,25
14:50,53.1,999.5,25
14:55,52.8,999.6,26
15:00,51.5,999.8,27
15:05,48.0,1000.2,30
15:10,44.2,1000.5,32
15:15,40.1,1000.8,35`,
  },
  {
    id: 'flatline_defect',
    name: 'AWS Sensor Flatline (Freezing Defect)',
    description: 'Sensor stuck at exact identical reading for consecutive hours with zero variance (ADC frozen/stuck loop).',
    data: `time,temp,pres,hum
08:00,28.4,1012.0,62
08:05,28.4,1012.0,62
08:10,28.4,1012.0,62
08:15,28.4,1012.0,62
08:20,28.4,1012.0,62
08:25,28.4,1012.0,62
08:30,28.4,1012.0,62
08:35,28.4,1012.0,62
08:40,28.4,1012.0,62
08:45,28.4,1012.0,62
08:50,28.4,1012.0,62
08:55,28.4,1012.0,62`,
  },
  {
    id: 'thunderstorm_microburst',
    name: 'Severe Convective Cold Pool (Weather Event)',
    description: 'Rapid genuine atmospheric gust front: steep temperature drop accompanied by sudden pressure rise and humidity jump.',
    data: `time,temp,pres,hum
16:00,37.5,998.2,34
16:05,37.2,998.1,35
16:10,36.4,998.5,39
16:15,33.1,1001.2,56
16:20,29.8,1003.4,74
16:25,27.2,1004.1,88
16:30,25.9,1004.5,92
16:35,25.5,1004.2,93
16:40,25.8,1003.8,91
16:45,26.4,1003.1,89
16:50,27.0,1002.5,85
16:55,27.5,1002.0,82`,
  },
  {
    id: 'noisy_telemetry',
    name: 'High Frequency Sensor Noise (Loose Cable)',
    description: 'Intermittent loose thermocouple circuit causing extreme high-frequency oscillating spikes.',
    data: `time,temp,pres,hum
11:00,32.1,1005.0,50
11:05,38.6,1005.1,50
11:10,26.3,1004.9,51
11:15,39.4,1005.0,49
11:20,28.1,1005.2,50
11:25,41.0,1005.0,52
11:30,30.5,1004.8,50
11:35,32.4,1005.1,51
11:40,32.6,1005.0,50`,
  },
];
