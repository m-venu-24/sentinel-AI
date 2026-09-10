import { Station, Reading, Region, FaultInjection } from '../types';

export const REGIONS: Record<string, Region> = {
  NORTH: 'North India',
  SOUTH: 'South India',
  WEST: 'West India',
  EAST: 'East India',
  CENTRAL: 'Central India',
};

export const HISTORY_LEN = 60;

export function createInitialStations(): Station[] {
  const baseStations: Array<{
    id: string;
    name: string;
    code: string;
    region: Region;
    coordinates: { lat: number; lon: number };
    elevationM: number;
    sensorModel: string;
    batteryV: number;
    signalDbm: number;
    baseTemp: number;
    basePres: number;
    baseHum: number;
  }> = [
    {
      id: 'del-mgs',
      name: 'Delhi (Mungeshpur)',
      code: 'DEL-AWS-004',
      region: REGIONS.NORTH,
      coordinates: { lat: 28.718, lon: 77.019 },
      elevationM: 215,
      sensorModel: 'Vaisala HMP155 Pt100',
      batteryV: 12.8,
      signalDbm: -72,
      baseTemp: 34.0,
      basePres: 1002.0,
      baseHum: 42.0,
    },
    {
      id: 'del-sfd',
      name: 'Delhi (Safdarjung)',
      code: 'DEL-AWS-001 (HQ)',
      region: REGIONS.NORTH,
      coordinates: { lat: 28.583, lon: 77.208 },
      elevationM: 211,
      sensorModel: 'Vaisala HMP155 Pt100',
      batteryV: 13.2,
      signalDbm: -65,
      baseTemp: 33.2,
      basePres: 1003.1,
      baseHum: 44.0,
    },
    {
      id: 'jai',
      name: 'Jaipur (Sanganer)',
      code: 'RAJ-AWS-012',
      region: REGIONS.NORTH,
      coordinates: { lat: 26.824, lon: 75.812 },
      elevationM: 390,
      sensorModel: 'Lambrecht Meteo 8095',
      batteryV: 12.9,
      signalDbm: -78,
      baseTemp: 35.1,
      basePres: 998.0,
      baseHum: 30.0,
    },
    {
      id: 'blr',
      name: 'Bengaluru (HAL)',
      code: 'KAR-AWS-003',
      region: REGIONS.SOUTH,
      coordinates: { lat: 12.953, lon: 77.668 },
      elevationM: 920,
      sensorModel: 'Campbell CS215 Rotronic',
      batteryV: 13.0,
      signalDbm: -68,
      baseTemp: 24.2,
      basePres: 1009.2,
      baseHum: 58.0,
    },
    {
      id: 'bom-col',
      name: 'Mumbai (Colaba)',
      code: 'MAH-AWS-007',
      region: REGIONS.WEST,
      coordinates: { lat: 18.906, lon: 72.814 },
      elevationM: 11,
      sensorModel: 'Vaisala HMP155 Marine',
      batteryV: 12.7,
      signalDbm: -74,
      baseTemp: 30.4,
      basePres: 1006.4,
      baseHum: 68.0,
    },
  ];

  return baseStations.map((s) => {
    const station: Station = {
      ...s,
      lastCalibrationDate: '2025-11-14',
      t: 0,
      status: 'normal',
      anomalyType: 'none',
      injected: null,
      ticketIssued: false,
      usingCsv: false,
      csvQueue: null,
      history: { temp: [], pres: [], hum: [], labels: [], timestamps: [] },
      tier1: {
        flagged: false,
        reasons: [],
        checks: {
          range: { passed: true, value: s.baseTemp, limitMin: -10, limitMax: 55, message: 'Nominal' },
          step: { passed: true, delta: 0, maxAllowed: 2.2, message: 'Nominal' },
          variance: { passed: true, stdDev: 0.8, minAllowed: 0.02, message: 'Nominal' },
        },
      },
      tier2: {
        score: 0.05,
        flagged: false,
        zTemp: 0.1,
        zPres: 0.1,
        zHum: 0.1,
        rollingMeanTemp: s.baseTemp,
        rollingStdTemp: 0.5,
      },
      tier3: {
        classification: 'none',
        confidence: 0,
        reason: 'Within expected bounds',
        correlatedCount: 0,
        totalPeers: 0,
        peerComparisons: [],
      },
    };

    // Pre-populate historical buffer with realistic diurnal curve
    const now = Date.now();
    for (let k = -HISTORY_LEN; k < 0; k++) {
      const reading = simulateRawReading(station, k);
      station.history.temp.push(reading.temp);
      station.history.pres.push(reading.pres);
      station.history.hum.push(reading.hum);
      station.history.labels.push(k);
      station.history.timestamps.push(new Date(now + k * 60000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    }

    return station;
  });
}

export function simulateRawReading(s: Station, tIndex: number): Reading {
  // Diurnal sinusoidal oscillation: peak daytime heat at ~noon, coolest before dawn
  const diurnal = Math.sin((tIndex / HISTORY_LEN) * Math.PI * 2 - Math.PI / 2);
  const microNoiseTemp = (Math.random() - 0.5) * 0.45;
  const microNoisePres = (Math.random() - 0.5) * 0.3;
  const microNoiseHum = (Math.random() - 0.5) * 1.6;

  let temp = s.baseTemp + diurnal * 3.2 + microNoiseTemp;
  let pres = s.basePres + diurnal * -1.2 + microNoisePres;
  let hum = s.baseHum + diurnal * -6.5 + microNoiseHum;

  // Injected fault or weather event modifiers
  if (s.injected) {
    const inj = s.injected;
    if (inj.type === 'bias') {
      temp += inj.magnitude;
    } else if (inj.type === 'flatline') {
      temp = inj.frozenValue ?? (s.history.temp.length > 0 ? s.history.temp[s.history.temp.length - 1] : s.baseTemp);
    } else if (inj.type === 'noise') {
      temp += (Math.random() - 0.5) * inj.magnitude;
    } else if (inj.type === 'spike') {
      temp += inj.magnitude;
    } else if (inj.type === 'event') {
      temp += inj.magnitude;
      hum = Math.max(15, hum - inj.magnitude * 1.5); // Regional heatwave drops humidity
    }
  }

  // Bounds clamping
  hum = Math.max(5, Math.min(100, hum));

  return {
    temp: Number(temp.toFixed(2)),
    pres: Number(pres.toFixed(1)),
    hum: Number(hum.toFixed(1)),
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
  };
}

export function generateSampleCsvContent(stations: Station[]): string {
  const rows: string[] = ['station,timestamp,temperature,pressure,humidity,status_note'];
  const t0 = Date.now() - 3600000;

  // Generate 30 minutes of readings for Delhi Mungeshpur, Safdarjung, and Jaipur
  const activeStations = stations.slice(0, 3);
  for (let i = 0; i < 30; i++) {
    const timeStr = new Date(t0 + i * 120000).toISOString();
    activeStations.forEach((st) => {
      const diurnal = Math.sin((i / 30) * Math.PI * 2 - Math.PI / 2);
      let temp = st.baseTemp + diurnal * 3.0 + (Math.random() - 0.5) * 0.4;
      let note = 'nominal';

      // Inject deliberate Mungeshpur drift in row 20+
      if (st.id === 'del-mgs' && i >= 20) {
        temp += 3.8;
        note = 'mungeshpur_thermistor_bias';
      }

      const pres = (st.basePres - diurnal * 1.1 + (Math.random() - 0.5) * 0.2).toFixed(1);
      const hum = Math.max(15, (st.baseHum - diurnal * 5.5 + (Math.random() - 0.5) * 1.0)).toFixed(0);

      rows.push(`"${st.name}",${timeStr},${temp.toFixed(1)},${pres},${hum},${note}`);
    });
  }

  return rows.join('\n');
}

export interface CsvParseResult {
  success: boolean;
  totalRows: number;
  matchedRows: number;
  skippedRows: number;
  stationMappings: Record<string, Reading[]>;
  matchedStationNames: string[];
  errorMessage?: string;
}

export function parseUploadedCsv(csvText: string, stations: Station[]): CsvParseResult {
  const lines = csvText.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0);
  if (lines.length < 2) {
    return {
      success: false,
      totalRows: 0,
      matchedRows: 0,
      skippedRows: 0,
      stationMappings: {},
      matchedStationNames: [],
      errorMessage: 'CSV file is empty or missing data rows.',
    };
  }

  const header = lines[0].split(',').map((h) => h.replace(/["']/g, '').trim().toLowerCase());
  const idxStation = header.findIndex((h) => h.includes('station') || h.includes('name') || h.includes('site') || h.includes('location'));
  const idxTemp = header.findIndex((h) => h.includes('temp') || h.includes('temperature') || h.includes('degc') || h.includes('t_c'));
  const idxPres = header.findIndex((h) => h.includes('pres') || h.includes('pressure') || h.includes('hpa') || h.includes('baro'));
  const idxHum = header.findIndex((h) => h.includes('hum') || h.includes('rh') || h.includes('humidity'));
  const idxTime = header.findIndex((h) => h.includes('time') || h.includes('date') || h.includes('ts'));

  if (idxStation < 0 || idxTemp < 0) {
    return {
      success: false,
      totalRows: lines.length - 1,
      matchedRows: 0,
      skippedRows: lines.length - 1,
      stationMappings: {},
      matchedStationNames: [],
      errorMessage: 'Could not detect required "station" and "temperature" columns in CSV header. Required format: station,timestamp,temperature,pressure,humidity',
    };
  }

  const perStation: Record<string, Reading[]> = {};
  let matchedRows = 0;
  let skippedRows = 0;

  for (let i = 1; i < lines.length; i++) {
    // Regex for CSV split handling quotes
    const row = lines[i].match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || lines[i].split(',');
    if (!row || row.length <= idxTemp) {
      skippedRows++;
      continue;
    }

    const rawStationName = (row[idxStation] || '').replace(/["']/g, '').trim().toLowerCase();
    const matchedStation = stations.find((s) => {
      const sName = s.name.toLowerCase();
      const sCode = s.code.toLowerCase();
      const sId = s.id.toLowerCase();
      return (
        sName.includes(rawStationName) ||
        rawStationName.includes(sId) ||
        rawStationName.includes(sName) ||
        rawStationName.includes(sCode)
      );
    });

    if (!matchedStation) {
      skippedRows++;
      continue;
    }

    const tempVal = parseFloat(row[idxTemp]?.replace(/["']/g, ''));
    const presVal = idxPres >= 0 ? parseFloat(row[idxPres]?.replace(/["']/g, '')) : matchedStation.basePres;
    const humVal = idxHum >= 0 ? parseFloat(row[idxHum]?.replace(/["']/g, '')) : matchedStation.baseHum;
    const timeVal = idxTime >= 0 ? row[idxTime]?.replace(/["']/g, '').trim() : undefined;

    if (isNaN(tempVal)) {
      skippedRows++;
      continue;
    }

    if (!perStation[matchedStation.id]) {
      perStation[matchedStation.id] = [];
    }

    perStation[matchedStation.id].push({
      temp: Number(tempVal.toFixed(2)),
      pres: isNaN(presVal) ? matchedStation.basePres : Number(presVal.toFixed(1)),
      hum: isNaN(humVal) ? matchedStation.baseHum : Number(humVal.toFixed(1)),
      timestamp: timeVal,
    });

    matchedRows++;
  }

  const matchedStationNames = Object.keys(perStation).map((id) => stations.find((s) => s.id === id)?.name || id);

  return {
    success: matchedRows > 0,
    totalRows: lines.length - 1,
    matchedRows,
    skippedRows,
    stationMappings: perStation,
    matchedStationNames,
    errorMessage: matchedRows === 0 ? 'No station names matched the AWS network registry (Delhi Mungeshpur, Safdarjung, Jaipur, Bengaluru, Mumbai).' : undefined,
  };
}
