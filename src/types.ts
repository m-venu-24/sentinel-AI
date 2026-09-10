export type UserRole = 'technician' | 'forecaster' | 'admin';

export type Region = 'North India' | 'South India' | 'West India' | 'East India' | 'Central India' | string;

export type AnomalyType = 'none' | 'bias' | 'flatline' | 'noise' | 'spike' | 'drift' | 'event' | string;

export type PlaybackSpeed = 'normal' | 'fast' | 'turbo';

export interface Reading {
  temp: number;
  pres: number;
  hum: number;
  time?: string;
  timestamp?: string;
}

export interface CsvReading {
  temp: number | null;
  pres: number | null;
  hum: number | null;
  time?: string;
  originalIndex?: number;
  missingFields?: Array<'temperature' | 'pressure' | 'humidity'>;
}

export interface FaultInjection {
  type: 'bias' | 'flatline' | 'noise' | 'event' | 'spike';
  magnitude: number;
  frozenValue?: number;
  ticksLeft: number;
}

export type InjectedFault = FaultInjection;

export interface Tier1Result {
  flagged: boolean;
  reasons: string[];
  checks?: {
    range: {
      passed: boolean;
      value: number;
      limitMin: number;
      limitMax: number;
      message: string;
    };
    step: {
      passed: boolean;
      delta: number;
      maxAllowed: number;
      message: string;
    };
    variance: {
      passed: boolean;
      stdDev: number;
      minAllowed: number;
      message: string;
    };
  };
}

export type Tier1State = Tier1Result;

export interface Tier2Result {
  score: number;
  flagged: boolean;
  scoreHistory?: number[];
  zTemp?: number;
  zPres?: number;
  zHum?: number;
  rollingMeanTemp?: number;
  rollingStdTemp?: number;
}

export type Tier2State = Tier2Result;

export interface PeerComparisonItem {
  peerId: string;
  peerName: string;
  peerDelta: number;
  correlated: boolean;
}

export interface Tier3Result {
  classification: 'none' | 'fault' | 'event';
  confidence: number;
  reason: string;
  correlatedCount?: number;
  totalPeers?: number;
  peerComparisons?: PeerComparisonItem[];
}

export type Tier3State = Tier3Result;

export interface AgentInsight {
  summary: string;
  forecast: string;
  trendSlope: number;
  nextTempEstimate: number;
  historicalContext: string;
  recommendation: string;
}

export interface Station {
  id: string;
  name: string;
  code?: string;
  region: Region;
  coordinates?: { lat: number; lon: number };
  elevationM?: number;
  sensorModel?: string;
  batteryV?: number;
  signalDbm?: number;
  lastCalibrationDate?: string;
  baseTemp: number;
  basePres: number;
  baseHum: number;
  t: number;
  status: 'normal' | 'flagged' | 'fault' | 'event';
  anomalyType: AnomalyType | null;
  injected: FaultInjection | null;
  tier1: Tier1Result;
  tier2: Tier2Result;
  tier3: Tier3Result;
  ticketIssued: boolean;
  usingCsv: boolean;
  csvQueue: CsvReading[] | null;
  totalCsvLoaded?: number;
  /** Set for the current playback tick when a CSV record has absent telemetry. */
  lastDataDropout?: string[];
  history: {
    temp: number[];
    pres: number[];
    hum: number[];
    labels: number[];
    timestamps?: string[];
  };
  // Weather data integration (optional)
  weatherData?: WeatherData[];
  weatherForecast?: WeatherForecast;
  weatherDataEnabled?: boolean;
}

export type StationState = Station;

export interface LogEntry {
  id: string;
  timestamp: string;
  time?: string;
  stationName: string;
  station?: string;
  region?: string;
  kind: 'fault' | 'event';
  anomalyType: string;
  confidence: number;
  action: string;
  ticketStatus?: 'open' | 'dispatched' | 'resolved';
}

// Weather Data Types
export type WeatherSourceType = 'api' | 'satellite' | 'radar' | 'model';

export interface WeatherData {
  timestamp: string;
  temp: number;
  humidity: number;
  pressure: number;
  windSpeed: number;
  windDirection: number;
  precipitation: number;
  visibility: number;
  cloudCover: number;
  source: WeatherSourceType;
}

export interface WeatherForecast {
  stationId: string;
  predictionTime: string;
  forecastHorizon: number; // hours ahead
  predictedTemp: number;
  predictedHumidity: number;
  predictedPrecipitation: number;
  confidence: number;
  weatherCondition: string;
  aiReasoning: string;
}

export interface WeatherPatternAnalysis {
  trend: 'warming' | 'cooling' | 'stable';
  temperatureChange: number;
  averageTemperature: number;
  averageHumidity: number;
  precipitationTotal: number;
  summary: string;
}

export interface WeatherAnomaly {
  metric: 'temperature' | 'humidity' | 'pressure' | 'wind' | 'precipitation';
  severity: 'low' | 'medium' | 'high';
  value: number;
  expected: number;
  message: string;
}

export interface CorrelationAnalysis {
  temperatureCorrelation: number;
  humidityCorrelation: number;
  sampleSize: number;
  summary: string;
}

export interface WeatherDataPoint {
  time: string;
  temp: number;
  humidity: number;
  pressure: number;
  windSpeed?: number;
  windDirection?: number;
  precipitation?: number;
}
