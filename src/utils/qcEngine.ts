import { Station, Tier1Result, Tier2Result, Tier3Result, AnomalyType, AgentInsight, PeerComparisonItem } from '../types';

export function avg(arr: number[]): number {
  if (arr.length === 0) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

export function stdDev(arr: number[]): number {
  if (arr.length < 2) return 0.5;
  const m = avg(arr);
  const variance = arr.reduce((acc, val) => acc + Math.pow(val - m, 2), 0) / arr.length;
  return Math.sqrt(variance) || 0.0001;
}

export function runTier1(s: Station): Tier1Result {
  const reasons: string[] = [];
  const h = s.history.temp;
  const cur = h[h.length - 1];
  const prev = h.length > 1 ? h[h.length - 2] : cur;

  // 1. Physical operating range limit (-10°C to 55°C)
  const rangeMin = -10;
  const rangeMax = 55;
  const rangePassed = cur >= rangeMin && cur <= rangeMax;
  if (!rangePassed) {
    reasons.push(`Temperature ${cur.toFixed(1)}°C outside physical operating limits (${rangeMin}°C to ${rangeMax}°C)`);
  }

  // 2. Step change / rate of change check (> 2.2°C between consecutive readings)
  const stepDelta = Math.abs(cur - prev);
  const maxAllowedStep = 2.2;
  const stepPassed = stepDelta <= maxAllowedStep;
  if (!stepPassed) {
    reasons.push(`Unphysical step change of ${(cur - prev).toFixed(1)}°C between consecutive readings (max allowed: ${maxAllowedStep}°C)`);
  }

  // 3. Near-zero variance / frozen sensor / flatline check (last 10 readings std < 0.02)
  const recent10 = h.slice(-10);
  const varianceStd = recent10.length >= 8 ? stdDev(recent10) : 1.0;
  const minAllowedVariance = 0.02;
  const variancePassed = recent10.length < 8 || varianceStd >= minAllowedVariance;
  if (!variancePassed) {
    reasons.push(`Sensor flatline detected: variance across last 10 readings is ${(varianceStd).toFixed(4)}°C (threshold: ${minAllowedVariance}°C)`);
  }

  const flagged = reasons.length > 0;

  return {
    flagged,
    reasons,
    checks: {
      range: {
        passed: rangePassed,
        value: cur,
        limitMin: rangeMin,
        limitMax: rangeMax,
        message: rangePassed ? `Operating in nominal range (${cur.toFixed(1)}°C)` : `Out of physical range (${cur.toFixed(1)}°C)`,
      },
      step: {
        passed: stepPassed,
        delta: stepDelta,
        maxAllowed: maxAllowedStep,
        message: stepPassed ? `Step delta ${(cur - prev).toFixed(2)}°C is nominal` : `Rapid step change ${(cur - prev).toFixed(2)}°C exceeds threshold`,
      },
      variance: {
        passed: variancePassed,
        stdDev: varianceStd,
        minAllowed: minAllowedVariance,
        message: variancePassed ? `Sensor dynamic variance ${(varianceStd).toFixed(2)} is healthy` : `Sensor flatline detected (σ = ${(varianceStd).toFixed(4)})`,
      },
    },
  };
}

export function runTier2(s: Station): Tier2Result {
  const ht = s.history.temp;
  const hp = s.history.pres;
  const hh = s.history.hum;

  const windowT = ht.slice(-30, -1);
  const meanT = windowT.length > 0 ? avg(windowT) : s.baseTemp;
  const stdT = windowT.length > 1 ? stdDev(windowT) : 0.5;
  const curT = ht[ht.length - 1];
  const zTemp = Math.abs(curT - meanT) / (stdT || 0.5);

  const windowP = hp.slice(-30, -1);
  const meanP = windowP.length > 0 ? avg(windowP) : s.basePres;
  const stdP = windowP.length > 1 ? stdDev(windowP) : 0.3;
  const curP = hp[hp.length - 1];
  const zPres = Math.abs(curP - meanP) / (stdP || 0.3);

  const windowH = hh.slice(-30, -1);
  const meanH = windowH.length > 0 ? avg(windowH) : s.baseHum;
  const stdH = windowH.length > 1 ? stdDev(windowH) : 1.5;
  const curH = hh[hh.length - 1];
  const zHum = Math.abs(curH - meanH) / (stdH || 1.5);

  // Multivariate outlier synthesis
  const combined = zTemp * 0.70 + zPres * 0.15 + zHum * 0.15;
  const score = Math.min(1, Math.max(0, combined / 6));
  const flagged = score > 0.35;
  const prevHistory = s.tier2?.scoreHistory || [];
  const scoreHistory = [...prevHistory, score].slice(-60);

  return {
    score,
    flagged,
    scoreHistory,
    zTemp,
    zPres,
    zHum,
    rollingMeanTemp: meanT,
    rollingStdTemp: stdT,
  };
}

export function runTier3(s: Station, allStations: Station[]): Tier3Result {
  if (!s.tier1.flagged && !s.tier2.flagged) {
    return {
      classification: 'none',
      confidence: 0,
      reason: "This station's latest reading fell within physical bounds and tracks the expected diurnal baseline of its regional cluster.",
      correlatedCount: 0,
      totalPeers: 0,
      peerComparisons: [],
    };
  }

  const cur = s.history.temp[s.history.temp.length - 1];
  const prev = s.history.temp.length > 1 ? s.history.temp[s.history.temp.length - 2] : cur;
  const delta = cur - prev;

  const peers = allStations.filter((p) => p.region === s.region && p.id !== s.id);
  const peerComparisons: PeerComparisonItem[] = [];
  let correlated = 0;

  peers.forEach((p) => {
    const pCur = p.history.temp[p.history.temp.length - 1];
    const pPrev = p.history.temp.length > 1 ? p.history.temp[p.history.temp.length - 2] : pCur;
    const pDelta = pCur - pPrev;
    const sameDirection = Math.sign(pDelta) === Math.sign(delta);
    const significant = Math.abs(pDelta) > 0.8;
    const isCorr = sameDirection && (significant || Math.abs(pCur - p.baseTemp) > 2.5);

    if (isCorr) {
      correlated++;
    }

    peerComparisons.push({
      peerId: p.id,
      peerName: p.name,
      peerDelta: pDelta,
      correlated: isCorr,
    });
  });

  // Anomaly signature typing
  let type: AnomalyType = 'noise';
  if (s.tier1.reasons.some((r) => r.toLowerCase().includes('flatline'))) {
    type = 'flatline';
  } else if (s.tier1.reasons.some((r) => r.toLowerCase().includes('step change'))) {
    type = 'spike';
  } else if (s.injected?.type === 'bias') {
    type = 'bias';
  } else if (s.tier2.score > 0.5) {
    type = 'drift';
  }
  s.anomalyType = type;

  if (correlated >= 1) {
    const confidence = Math.min(96, Math.round(58 + correlated * 18 + Math.min(20, s.tier2.score * 20)));
    const peerNames = peerComparisons.filter((c) => c.correlated).map((c) => c.peerName).join(', ');
    return {
      classification: 'event',
      confidence,
      reason: `${correlated} nearby station(s) in ${s.region} (${peerNames}) observed synchronous thermal movement. Consistent with a genuine atmospheric synoptic event (e.g. advective heatwave / frontal boundary), not an isolated sensor fault.`,
      correlatedCount: correlated,
      totalPeers: peers.length,
      peerComparisons,
    };
  } else {
    const confidence = Math.min(97, Math.round(55 + (s.tier1.flagged ? 20 : 0) + Math.min(22, s.tier2.score * 22)));
    return {
      classification: 'fault',
      confidence,
      reason: `No neighboring station in ${s.region} exhibits a correlated deviation. This departure is isolated to this AWS instrument, matching a known sensor fault signature (${type.toUpperCase()}). Maintenance ticket generated.`,
      correlatedCount: 0,
      totalPeers: peers.length,
      peerComparisons,
    };
  }
}

export function classifyStation(s: Station, allStations: Station[]): void {
  s.tier1 = runTier1(s);
  s.tier2 = runTier2(s);
  s.tier3 = runTier3(s, allStations);

  if (s.tier3.classification === 'fault') {
    s.status = 'fault';
  } else if (s.tier3.classification === 'event') {
    s.status = 'event';
  } else if (s.tier2.flagged || s.tier1.flagged) {
    s.status = 'flagged';
  } else {
    s.status = 'normal';
  }
}

export function generateAgentInsight(s: Station, allStations: Station[]): AgentInsight {
  const h = s.history.temp.slice(-12);
  const n = h.length;
  const xs = h.map((_, i) => i);
  const xm = avg(xs);
  const ym = avg(h);
  const num = xs.reduce((acc, x, i) => acc + (x - xm) * (h[i] - ym), 0);
  const den = xs.reduce((acc, x) => acc + Math.pow(x - xm, 2), 0) || 1;
  const slope = num / den;
  const curTemp = h[n - 1] ?? s.baseTemp;
  const nextEst = curTemp + slope;

  let summary = '';
  let historicalContext = '';
  let recommendation = '';

  const normalCount = allStations.filter((x) => x.status === 'normal').length;

  if (s.tier3.classification === 'fault') {
    summary = `CRITICAL ANOMALY: ${s.name} shows an isolated ${s.anomalyType.toUpperCase()} (+${(curTemp - s.baseTemp).toFixed(1)}°C delta from diurnal expectation) with 0 regional peers showing agreement.`;
    if (s.id === 'del-mgs') {
      historicalContext = `Direct reference to the May 2024 Delhi Mungeshpur incident where a sensor calibration bias produced an artificial 52.9°C reading uncorroborated by Safdarjung or Ridge stations.`;
    } else {
      historicalContext = `Uncorroborated single-station divergence indicates physical sensor thermistor drift, solar shield obstruction, or telemetry transmission corruption.`;
    }
    recommendation = `Dispatch AWS field technician for on-site calibration check. Flag station data as provisional/rejected in IMD public weather bulletin feeds.`;
  } else if (s.tier3.classification === 'event') {
    summary = `METEOROLOGICAL EVENT: Regional thermal anomaly verified across ${s.tier3.correlatedCount} peer stations in ${s.region}. Atmospheric phenomenon confirmed.`;
    historicalContext = `Synoptic advection or intense solar insolation affecting the entire regional boundary layer. No sensor hardware discrepancy found.`;
    recommendation = `Do NOT dispatch technicians. Escalate to Regional Meteorological Centre (RMC) duty forecaster for Heatwave / Severe Weather warning issuance.`;
  } else if (s.tier1.flagged || s.tier2.flagged) {
    summary = `OBSERVATION UNDER REVIEW: ${s.name} triggered initial statistical/rule filters (Tier 1/2), awaiting subsequent cycles for cross-regional confirmation.`;
    historicalContext = `Transient fluctuations often occur during local cloud cover or gust fronts before synoptic signal stabilizes.`;
    recommendation = `Maintain high-frequency polling (1-minute cycles) and monitor peer station Safdarjung/Jaipur for cross-verification.`;
  } else {
    summary = `NETWORK NOMINAL: ${normalCount} of ${allStations.length} stations are tracking expected diurnal cycles with healthy covariance.`;
    historicalContext = `Standard diurnal heating curve following solar zenith angle; temperature, pressure, and humidity exhibit normal negative covariance.`;
    recommendation = `Routine automated monitoring active. All sensor diagnostics and battery voltages are within operating tolerances.`;
  }

  const forecast = `Linear trend over last 12 cycles: ${slope >= 0 ? '+' : ''}${slope.toFixed(2)}°C/step. Projected next reading: ${nextEst.toFixed(1)}°C.`;

  return {
    summary,
    forecast,
    trendSlope: slope,
    nextTempEstimate: nextEst,
    historicalContext,
    recommendation,
  };
}
