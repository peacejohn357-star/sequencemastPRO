
// ─── Core Types ───────────────────────────────────────────────────────────────

export interface DigitEntropy {
  counts: number[];
  zScores: number[];
  anchors: number[];
  avoids: number[];
}

export interface MarkovState {
  transitions: Record<string, Record<string, number>>;
  probabilities: Record<string, Record<string, number>>;
  currentState: string;
  trendLock: boolean;
  fakeOut: boolean;
  dominantBias: "expansion" | "reversion" | "neutral";
}

export interface StepExhaustion {
  ema50: number;
  strain: number;
  maxStrain24h: number;
  strainRatio: number;
  snapBackAlert: boolean;
}

export interface MasterConfidence {
  markovEdge: number;
  strainRatio: number;
  entropyBias: number;
  mcs: number;
  signal: "STRONG_ENTRY" | "EXIT" | "NO_TRADE" | "HOLD";
  anchorDigit: number | null;
  avoidDigit: number | null;
  currentPriceDigit: number;
}

export interface Regime {
  startIndex: number;
  endIndex: number;
  anchorDigit: number | null;
  dominantColor: string;
  markovBias: "expansion" | "reversion" | "neutral";
  volatility: number;
  tickCount: number;
  primaryBias: string;
}

// ─── Discovery Intelligence Types ────────────────────────────────────────────

export interface HeatmapBucket {
  ticks: number;
  count: number;
  pct: number;
}

export interface DiscoveryPattern {
  key: string;
  phase: 3 | 4;
  direction: "UP" | "DOWN" | "mixed";
  frequency: number;
  avgTicksBetween: number;
  lastSeenTicksAgo: number;
  avgContinuation: number;
  confidence: number;
  promoted: boolean;
  heatmap: HeatmapBucket[];
  avgRSI: number;
  avgADX: number;
  avgDigitZ: number;
}

export interface LiveSignal {
  key: string;
  phase: 3 | 4;
  direction: "UP" | "DOWN";
  state: "signal" | "confirm" | "entry" | "result";
  ticksAfter: number;
  confidence: number;
  avgContinuation: number;
  cancelled: boolean;
  cancelReason?: string;
}

export interface DiscoveryIntelligence {
  patterns3: DiscoveryPattern[];
  patterns4: DiscoveryPattern[];
  liveSignal: LiveSignal | null;
  currentRSI: number;
  currentADX: number;
}

// ─── Regime State Machine Types ───────────────────────────────────────────────

export type RegimeName = "A" | "B" | "C" | "D";

export interface PhysicsMetrics {
  rsi: number;
  adx: number;
  bbw: number;
  strain: number;
  ema50: number;
  stdDev20: number;
}

export interface IndicatorState {
  rsi: number;
  bbw: number;
  strain: number;
}

export interface PatternEntry {
  sequence: string;
  action: "CALL" | "PUT";
  status: "SUCCESS" | "FAIL";
  /** Avg indicators at T-10: 10 dirTicks before streak confirmation (pre-sequence start) */
  startState: IndicatorState;
  /** Avg indicators at T-5:  5 dirTicks before streak confirmation (hit / pre-seq begins) */
  hitState: IndicatorState;
  persistenceScore: number;
  totalSeen: number;
  successCount: number;
  failCount: number;
  /** Min/max ranges of hitState across all occurrences (for bar visualisations) */
  safetyBox: {
    rsi: [number, number];
    bbw: [number, number];
    strain: [number, number];
  };
  avgExtension: number;
  isElite: boolean;
}

export interface RegimeAtlas {
  [regimeKey: string]: {
    elitePatterns: PatternEntry[];
    allPatterns: PatternEntry[];
  };
}

export interface EvolutionaryState {
  version: string;
  generatedAt: string;
  activeRegime: RegimeName;
  persistenceRatio: number;
  regimeDuration: number;
  physicsMetrics: PhysicsMetrics;
  entryGate: boolean;
  regimeAtlas: RegimeAtlas;
  globalConfig: {
    minPersistenceToTrade: number;
    minOccurrencesToPromote: number;
    hysteresisWindow: number;
  };
}

export interface DNAResult {
  entropy: DigitEntropy;
  markov: MarkovState;
  exhaustion: StepExhaustion;
  confidence: MasterConfidence;
  regimes: Regime[];
  discoveryIntelligence: DiscoveryIntelligence;
  evolutionaryState: EvolutionaryState;
  windowSize: number;
  totalTicks: number;
}

// ─── Internal Types ───────────────────────────────────────────────────────────

interface DirTick {
  dir: "U" | "D";
  priceIdx: number;
}

interface PatternOccurrence {
  dirIdx: number;
  priceIdx: number;
  contDir: "UP" | "DOWN" | "none";
  contLength: number;
  rsi: number;
  adx: number;
  digitZ: number;
}

interface AllArrays {
  rsiArr: number[];
  adxArr: number[];
  digitZArr: number[];
  ema50Arr: number[];
  stdDev20Arr: number[];
  bbwArr: number[];
  upperBandArr: number[];
  lowerBandArr: number[];
  strainArr: number[];
  dirTicks: DirTick[];
}

interface RawLineData {
  action: "CALL" | "PUT";
  status: "SUCCESS" | "FAIL";
  hitRsiBucket: number;
  hitBbwBucket: number;
  hits: number;
  streakLengths: number[];
  /** T-5 (hit point) samples */
  hitRsiSamples: number[];
  hitBbwSamples: number[];
  hitStrainSamples: number[];
  /** T-10 (start point) samples */
  startRsiSamples: number[];
  startBbwSamples: number[];
  startStrainSamples: number[];
}

// ─── Constants ────────────────────────────────────────────────────────────────

const DIGIT_COLORS: Record<number, string> = {
  0: "#6366f1", 1: "#8b5cf6", 2: "#a855f7", 3: "#ec4899", 4: "#f43f5e",
  5: "#f97316", 6: "#eab308", 7: "#22c55e", 8: "#14b8a6", 9: "#06b6d4",
};

// ─── Shared Math Helpers ──────────────────────────────────────────────────────

function extractDigit(price: number): number {
  return Math.round(Math.round(price * 10) % 10);
}

function calcEMA(prices: number[], period: number): number[] {
  if (prices.length === 0) return [];
  const k = 2 / (period + 1);
  const emas: number[] = [prices[0]];
  for (let i = 1; i < prices.length; i++) {
    emas.push(prices[i] * k + emas[i - 1] * (1 - k));
  }
  return emas;
}

/** Wilder RSI precomputed for all price indices O(n) */
function calcRSIArray(prices: number[], period = 14): number[] {
  const result = new Array(prices.length).fill(50);
  if (prices.length <= period) return result;
  let avgGain = 0, avgLoss = 0;
  for (let i = 1; i <= period; i++) {
    const d = prices[i] - prices[i - 1];
    avgGain += Math.max(d, 0) / period;
    avgLoss += Math.max(-d, 0) / period;
  }
  result[period] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
  for (let i = period + 1; i < prices.length; i++) {
    const d = prices[i] - prices[i - 1];
    avgGain = (avgGain * (period - 1) + Math.max(d, 0)) / period;
    avgLoss = (avgLoss * (period - 1) + Math.max(-d, 0)) / period;
    result[i] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
  }
  return result;
}

/** Wilder ADX precomputed for all price indices O(n) */
function calcADXArray(prices: number[], period = 14): number[] {
  const out = new Array(prices.length).fill(20);
  if (prices.length < period * 2 + 1) return out;
  const plusDM: number[] = [0], minusDM: number[] = [0], tr: number[] = [0];
  for (let i = 1; i < prices.length; i++) {
    const d = prices[i] - prices[i - 1];
    plusDM.push(Math.max(d, 0));
    minusDM.push(Math.max(-d, 0));
    tr.push(Math.abs(d));
  }
  let sP = plusDM.slice(1, period + 1).reduce((a, b) => a + b, 0);
  let sM = minusDM.slice(1, period + 1).reduce((a, b) => a + b, 0);
  let sT = tr.slice(1, period + 1).reduce((a, b) => a + b, 0);
  const dxList: { idx: number; val: number }[] = [];
  for (let i = period + 1; i < prices.length; i++) {
    sP = sP - sP / period + plusDM[i];
    sM = sM - sM / period + minusDM[i];
    sT = sT - sT / period + tr[i];
    if (sT === 0) { dxList.push({ idx: i, val: 0 }); continue; }
    const pDI = 100 * sP / sT;
    const mDI = 100 * sM / sT;
    const diSum = pDI + mDI;
    dxList.push({ idx: i, val: diSum === 0 ? 0 : 100 * Math.abs(pDI - mDI) / diSum });
  }
  if (dxList.length < period) return out;
  let adx = dxList.slice(0, period).reduce((a, b) => a + b.val, 0) / period;
  out[dxList[period - 1].idx] = adx;
  for (let k = period; k < dxList.length; k++) {
    adx = (adx * (period - 1) + dxList[k].val) / period;
    out[dxList[k].idx] = adx;
  }
  let last = 20;
  for (let i = 0; i < out.length; i++) { if (out[i] !== 20) last = out[i]; else out[i] = last; }
  return out;
}

/** Rolling last-digit Z-score (window=100) at every index */
function calcDigitZArray(prices: number[], window = 100): number[] {
  const result = new Array(prices.length).fill(0);
  const counts = new Array(10).fill(0);
  for (let i = 0; i < prices.length; i++) {
    counts[extractDigit(prices[i])]++;
    if (i >= window) counts[extractDigit(prices[i - window])]--;
    const N = Math.min(i + 1, window);
    const expected = N * 0.1;
    const stdDev = Math.sqrt(N * 0.1 * 0.9);
    result[i] = stdDev > 0 ? (counts[extractDigit(prices[i])] - expected) / stdDev : 0;
  }
  return result;
}

/** Rolling Standard Deviation (period=20) at every index O(n) */
function calcStdDevArray(prices: number[], period = 20): number[] {
  const result = new Array(prices.length).fill(0);
  for (let i = period - 1; i < prices.length; i++) {
    const slice = prices.slice(i - period + 1, i + 1);
    const mean = slice.reduce((a, b) => a + b, 0) / period;
    const variance = slice.reduce((a, b) => a + (b - mean) ** 2, 0) / period;
    result[i] = Math.sqrt(variance);
  }
  const firstValid = result[period - 1];
  for (let i = 0; i < period - 1; i++) result[i] = firstValid;
  return result;
}

/** Bollinger Bands BB(10, EMA, 2σ) — absolute spread (Upper − Lower)
 *  EMA middle band eliminates SMA jitter on quantized Step Index ticks.
 *  BBW reported as absolute price width (e.g. 0.350) not ratio. */
function calcBBWData(prices: number[], ema10Arr: number[], stdDev10Arr: number[], period = 10): {
  bbwArr: number[]; upperBandArr: number[]; lowerBandArr: number[];
} {
  const n = prices.length;
  const bbwArr = new Array(n).fill(0.4);
  const upperBandArr = new Array(n).fill(prices[0] ?? 0);
  const lowerBandArr = new Array(n).fill(prices[0] ?? 0);
  for (let i = period - 1; i < n; i++) {
    const mid = ema10Arr[i]; // EMA(10) as smooth middle band
    const std = Math.max(stdDev10Arr[i], 0.0001); // floor prevents collapse to 0
    const upper = mid + 2 * std;
    const lower = mid - 2 * std;
    upperBandArr[i] = upper;
    lowerBandArr[i] = lower;
    bbwArr[i] = upper - lower; // absolute spread in price units
  }
  for (let i = 0; i < period - 1; i++) {
    upperBandArr[i] = upperBandArr[period - 1];
    lowerBandArr[i] = lowerBandArr[period - 1];
    bbwArr[i] = bbwArr[period - 1];
  }
  return { bbwArr, upperBandArr, lowerBandArr };
}

/** Evolutionary Strain = |price - EMA50| / (StdDev20 * 2)
 *  StdDev floor prevents division-by-zero / Infinity */
function calcStrainArray(prices: number[], ema50Arr: number[], stdDev20Arr: number[]): number[] {
  return prices.map((p, i) => {
    // Minimum floor = 0.0001 to avoid Infinity/NaN on flat synthetic segments
    const std2 = Math.max(stdDev20Arr[i], 0.0001) * 2;
    return Math.abs(p - ema50Arr[i]) / std2;
  });
}

/** Build U/D direction ticks, skipping flat prices */
function calcDirTicks(prices: number[]): DirTick[] {
  const result: DirTick[] = [];
  for (let i = 1; i < prices.length; i++) {
    if (prices[i] > prices[i - 1]) result.push({ dir: "U", priceIdx: i });
    else if (prices[i] < prices[i - 1]) result.push({ dir: "D", priceIdx: i });
  }
  return result;
}

/** Precompute ALL shared arrays once per compute call */
function computeAllArrays(prices: number[]): AllArrays {
  const ema50Arr = calcEMA(prices, 50);
  const ema10Arr  = calcEMA(prices, 10);          // EMA(10) for BB middle band
  const rsiArr = calcRSIArray(prices);
  const adxArr = calcADXArray(prices);
  const digitZArr = calcDigitZArray(prices);
  const stdDev20Arr = calcStdDevArray(prices);    // period=20, used for Strain
  const stdDev10Arr = calcStdDevArray(prices, 10); // period=10, used for BB(10)
  const { bbwArr, upperBandArr, lowerBandArr } = calcBBWData(prices, ema10Arr, stdDev10Arr);
  const strainArr = calcStrainArray(prices, ema50Arr, stdDev20Arr);
  const dirTicks = calcDirTicks(prices);
  return { rsiArr, adxArr, digitZArr, ema50Arr, stdDev20Arr, bbwArr, upperBandArr, lowerBandArr, strainArr, dirTicks };
}

// ─── Existing Indicators ──────────────────────────────────────────────────────

function calcDigitEntropy(prices: number[], windowSize: number): DigitEntropy {
  const slice = prices.slice(-windowSize);
  const N = slice.length;
  const counts = new Array(10).fill(0);
  for (const p of slice) counts[extractDigit(p)]++;
  const expected = N * 0.1;
  const stdDev = Math.sqrt(N * 0.1 * 0.9);
  const zScores = counts.map((x) => stdDev > 0 ? (x - expected) / stdDev : 0);
  const anchors = zScores.map((z, i) => z < -2.0 ? i : -1).filter((i) => i >= 0);
  const avoids  = zScores.map((z, i) => z >  2.0 ? i : -1).filter((i) => i >= 0);
  return { counts, zScores, anchors, avoids };
}

function calcMarkov(prices: number[]): MarkovState {
  if (prices.length < 3) {
    return {
      transitions: { UU:{U:0,D:0}, UD:{U:0,D:0}, DU:{U:0,D:0}, DD:{U:0,D:0} },
      probabilities: { UU:{U:.5,D:.5}, UD:{U:.5,D:.5}, DU:{U:.5,D:.5}, DD:{U:.5,D:.5} },
      currentState: "UU", trendLock: false, fakeOut: false, dominantBias: "neutral",
    };
  }
  const states = ["UU","UD","DU","DD"];
  const transitions: Record<string, Record<string, number>> = {};
  for (const s of states) transitions[s] = { U: 0, D: 0 };
  const dirs: string[] = [];
  for (let i = 1; i < prices.length; i++) dirs.push(prices[i] >= prices[i-1] ? "U" : "D");
  for (let i = 2; i < dirs.length; i++) {
    const state = dirs[i-2] + dirs[i-1];
    if (transitions[state]) transitions[state][dirs[i]] = (transitions[state][dirs[i]] || 0) + 1;
  }
  const probabilities: Record<string, Record<string, number>> = {};
  for (const s of states) {
    const total = (transitions[s].U||0) + (transitions[s].D||0);
    probabilities[s] = {
      U: total > 0 ? (transitions[s].U||0)/total : 0.5,
      D: total > 0 ? (transitions[s].D||0)/total : 0.5,
    };
  }
  const lastTwo = dirs.slice(-2);
  const currentState = lastTwo.length >= 2 ? lastTwo[0]+lastTwo[1] : "UU";
  const trendLock = probabilities["UU"]?.U >= 0.65 || probabilities["DD"]?.D >= 0.65;
  const fakeOut   = probabilities["UU"]?.D >= 0.60 || probabilities["DD"]?.U >= 0.60;
  const dominantBias: MarkovState["dominantBias"] = trendLock ? "expansion" : fakeOut ? "reversion" : "neutral";
  return { transitions, probabilities, currentState, trendLock, fakeOut, dominantBias };
}

function calcExhaustion(prices: number[]): StepExhaustion {
  if (prices.length < 2) return { ema50: prices[0]||0, strain:0, maxStrain24h:0, strainRatio:0, snapBackAlert:false };
  const emas = calcEMA(prices, 50);
  const ema50 = emas[emas.length-1];
  const currentPrice = prices[prices.length-1];
  const strain = Math.abs(currentPrice - ema50) / 0.1;
  const strains = prices.map((p,i) => Math.abs(p - emas[i]) / 0.1);
  const maxStrain24h = Math.max(...strains);
  const strainRatio = maxStrain24h > 0 ? strain / maxStrain24h : 0;
  return { ema50, strain, maxStrain24h, strainRatio, snapBackAlert: strainRatio >= 0.9 };
}

function calcRegimeStability(prices: number[], windowSize: number): number {
  const slice = prices.slice(-windowSize);
  if (slice.length < 20) return 50;
  const mean = slice.reduce((a,b)=>a+b,0)/slice.length;
  const variance = slice.reduce((a,b)=>a+(b-mean)**2,0)/slice.length;
  const cv = variance > 0 ? (Math.sqrt(variance)/Math.abs(mean))*100 : 0;
  return Math.max(0, Math.min(100, 100 - cv*10));
}

function calcMCS(
  entropy: DigitEntropy, markov: MarkovState, exhaustion: StepExhaustion,
  currentPrice: number, windowSize: number, prices: number[]
): MasterConfidence {
  const currentPriceDigit = extractDigit(currentPrice);
  const anchorDigit = entropy.anchors.length > 0 ? entropy.anchors[0] : null;
  const avoidDigit  = entropy.avoids.length  > 0 ? entropy.avoids[0]  : null;
  const maxZ = Math.max(...entropy.zScores.map(Math.abs));
  const entropyBias = Math.min(1, maxZ / 3);
  const stateProb = markov.probabilities[markov.currentState];
  const markovEdge = stateProb ? Math.abs((stateProb.U||0) - 0.5)*2 : 0;
  const strainRatio = exhaustion.strainRatio;
  const mcs = (0.4*markovEdge + 0.3*strainRatio + 0.3*entropyBias)*100;
  let signal: MasterConfidence["signal"] = "HOLD";
  const stability = calcRegimeStability(prices, windowSize);
  if (stability < 30) signal = "NO_TRADE";
  else if (avoidDigit !== null && currentPriceDigit === avoidDigit) signal = "EXIT";
  else if (mcs > 75) signal = "STRONG_ENTRY";
  return { markovEdge, strainRatio, entropyBias, mcs, signal, anchorDigit, avoidDigit, currentPriceDigit };
}

function detectRegimes(prices: number[]): Regime[] {
  if (prices.length < 200) {
    const entropy = calcDigitEntropy(prices, prices.length);
    const markov  = calcMarkov(prices);
    const mean = prices.reduce((a,b)=>a+b,0)/prices.length;
    const variance = prices.reduce((a,b)=>a+(b-mean)**2,0)/prices.length;
    const anchorDigit = entropy.anchors.length > 0 ? entropy.anchors[0] : null;
    return [{ startIndex:0, endIndex:prices.length-1, anchorDigit,
      dominantColor: anchorDigit!==null ? DIGIT_COLORS[anchorDigit] : "#6366f1",
      markovBias: markov.dominantBias, volatility: Math.sqrt(variance),
      tickCount: prices.length, primaryBias: markov.dominantBias }];
  }
  const CHUNK=200, STEP=50;
  const regimes: Regime[] = [];
  let start=0, prevAnchor: number|null=null, prevProb=0.5, prevVol=0;
  for (let i=0; i+CHUNK<=prices.length; i+=STEP) {
    const chunk = prices.slice(i,i+CHUNK);
    const entropy = calcDigitEntropy(chunk, chunk.length);
    const markov  = calcMarkov(chunk);
    const mean = chunk.reduce((a,b)=>a+b,0)/chunk.length;
    const variance = chunk.reduce((a,b)=>a+(b-mean)**2,0)/chunk.length;
    const vol = Math.sqrt(variance);
    const anchorDigit = entropy.anchors.length>0?entropy.anchors[0]:null;
    const prob = markov.probabilities["UU"]?.U||0.5;
    const anchorChanged = anchorDigit!==prevAnchor && prevAnchor!==null && i>0;
    const markovShifted = Math.abs(prob-prevProb)>0.15 && i>0;
    const volDoubled = prevVol>0&&(vol>prevVol*2||vol<prevVol/2)&&i>0;
    if ((anchorChanged||markovShifted||volDoubled)&&i>start) {
      const seg=prices.slice(start,i), se=calcDigitEntropy(seg,seg.length), sm=calcMarkov(seg);
      const smean=seg.reduce((a,b)=>a+b,0)/seg.length, svar=seg.reduce((a,b)=>a+(b-smean)**2,0)/seg.length;
      const sa=se.anchors.length>0?se.anchors[0]:null;
      regimes.push({ startIndex:start, endIndex:i-1, anchorDigit:sa,
        dominantColor:sa!==null?DIGIT_COLORS[sa]:"#64748b", markovBias:sm.dominantBias,
        volatility:Math.sqrt(svar), tickCount:seg.length, primaryBias:sm.dominantBias });
      start=i;
    }
    prevAnchor=anchorDigit; prevProb=prob; prevVol=vol;
  }
  if (start < prices.length) {
    const seg=prices.slice(start), se=calcDigitEntropy(seg,seg.length), sm=calcMarkov(seg);
    const smean=seg.reduce((a,b)=>a+b,0)/seg.length, svar=seg.reduce((a,b)=>a+(b-smean)**2,0)/seg.length;
    const sa=se.anchors.length>0?se.anchors[0]:null;
    regimes.push({ startIndex:start, endIndex:prices.length-1, anchorDigit:sa,
      dominantColor:sa!==null?DIGIT_COLORS[sa]:"#64748b", markovBias:sm.dominantBias,
      volatility:Math.sqrt(svar), tickCount:seg.length, primaryBias:sm.dominantBias });
  }
  return regimes.length>0 ? regimes : [{
    startIndex:0, endIndex:prices.length-1, anchorDigit:null, dominantColor:"#64748b",
    markovBias:"neutral", volatility:0, tickCount:prices.length, primaryBias:"neutral" }];
}

// ─── Discovery Intelligence Engine ───────────────────────────────────────────

function buildDiscoveryPatterns(
  dirTicks: DirTick[], prices: number[], patLen: 3 | 4,
  rsiArr: number[], adxArr: number[], digitZArr: number[]
): Map<string, PatternOccurrence[]> {
  const store = new Map<string, PatternOccurrence[]>();
  if (dirTicks.length < patLen + 1) return store;
  const startDirIdx = dirTicks.findIndex(d => d.priceIdx >= 50);
  if (startDirIdx < 0) return store;
  const iStart = Math.max(startDirIdx, patLen - 1);
  const iEnd = dirTicks.length - 2;
  for (let i = iStart; i <= iEnd; i++) {
    const patStart = i - (patLen - 1);
    if (patStart < 0) continue;
    const key = dirTicks.slice(patStart, i + 1).map(d => d.dir).join("");
    const contStart = i + 1;
    let contDir: "UP" | "DOWN" | "none" = "none";
    let contLength = 0;
    if (contStart < dirTicks.length) {
      const firstDir = dirTicks[contStart].dir;
      contDir = firstDir === "U" ? "UP" : "DOWN";
      contLength = 1;
      for (let j = contStart + 1; j < dirTicks.length && j < contStart + 12; j++) {
        if (dirTicks[j].dir === firstDir) contLength++;
        else break;
      }
    }
    const priceIdx = dirTicks[i].priceIdx;
    const occ: PatternOccurrence = {
      dirIdx: i, priceIdx, contDir, contLength,
      rsi: rsiArr[priceIdx] ?? 50, adx: adxArr[priceIdx] ?? 20, digitZ: digitZArr[priceIdx] ?? 0,
    };
    if (!store.has(key)) store.set(key, []);
    store.get(key)!.push(occ);
  }
  return store;
}

function summarizePatterns(
  store: Map<string, PatternOccurrence[]>, phase: 3 | 4, totalDirTicks: number
): DiscoveryPattern[] {
  const MIN_CONT = 4;
  const results: DiscoveryPattern[] = [];
  for (const [key, occs] of store) {
    if (occs.length < 2) continue;
    const contLengths = occs.map(o => o.contLength);
    const avgContinuation = contLengths.reduce((a,b)=>a+b,0) / contLengths.length;
    const promotable = occs.filter(o => o.contDir !== "none" && o.contLength >= MIN_CONT);
    const upCount   = promotable.filter(o => o.contDir === "UP").length;
    const downCount = promotable.filter(o => o.contDir === "DOWN").length;
    let direction: "UP" | "DOWN" | "mixed";
    if (promotable.length === 0) direction = "mixed";
    else if (upCount > downCount * 1.4) direction = "UP";
    else if (downCount > upCount * 1.4) direction = "DOWN";
    else direction = "mixed";
    const confidence = (promotable.length / occs.length) * 100;
    const promoted = confidence >= 50 && direction !== "mixed";
    const heatmap: HeatmapBucket[] = [];
    for (let t = 1; t <= 10; t++) {
      const count = contLengths.filter(l => (t < 10 ? l === t : l >= 10)).length;
      heatmap.push({ ticks: t, count, pct: (count / occs.length) * 100 });
    }
    const sortedIdxs = occs.map(o => o.priceIdx).sort((a,b) => a-b);
    let avgTicksBetween = 0;
    if (sortedIdxs.length > 1) {
      const diffs: number[] = [];
      for (let k = 1; k < sortedIdxs.length; k++) diffs.push(sortedIdxs[k] - sortedIdxs[k-1]);
      avgTicksBetween = diffs.reduce((a,b)=>a+b,0) / diffs.length;
    }
    const lastOcc = occs.reduce((a,b) => a.dirIdx > b.dirIdx ? a : b);
    const lastSeenTicksAgo = totalDirTicks - 1 - lastOcc.dirIdx;
    const avgRSI    = occs.reduce((a,o)=>a+o.rsi,0)    / occs.length;
    const avgADX    = occs.reduce((a,o)=>a+o.adx,0)    / occs.length;
    const avgDigitZ = occs.reduce((a,o)=>a+o.digitZ,0) / occs.length;
    results.push({ key, phase, direction, frequency: occs.length, avgTicksBetween, lastSeenTicksAgo,
      avgContinuation, confidence, promoted, heatmap, avgRSI, avgADX, avgDigitZ });
  }
  return results.sort((a,b) => b.confidence - a.confidence || b.frequency - a.frequency);
}

function detectLiveSignal(
  dirTicks: DirTick[], prices: number[],
  promoted3: DiscoveryPattern[], promoted4: DiscoveryPattern[]
): LiveSignal | null {
  if (dirTicks.length < 5) return null;
  const map3 = new Map(promoted3.filter(p => p.promoted).map(p => [p.key, p]));
  const map4 = new Map(promoted4.filter(p => p.promoted).map(p => [p.key, p]));
  const tryDetect = (patLen: 3 | 4, promotedMap: Map<string, DiscoveryPattern>): LiveSignal | null => {
    for (let ticksAfter = 1; ticksAfter <= 4; ticksAfter++) {
      const patEnd   = dirTicks.length - 1 - ticksAfter;
      const patStart = patEnd - (patLen - 1);
      if (patStart < 0 || patEnd < 0) continue;
      const key = dirTicks.slice(patStart, patEnd + 1).map(d => d.dir).join("");
      const pattern = promotedMap.get(key);
      if (!pattern) continue;
      const winStart = dirTicks[patEnd].priceIdx + 1;
      let cancelled = false; let cancelReason: string | undefined;
      for (let p = winStart; p < prices.length; p++) {
        if (prices[p] === prices[p-1]) { cancelled = true; cancelReason = "Flat tick in execution window"; break; }
      }
      if (!cancelled && ticksAfter >= 2) {
        const expectedDir = pattern.direction === "UP" ? "U" : "D";
        for (let j = patEnd + 1; j <= patEnd + ticksAfter - 1 && j < dirTicks.length; j++) {
          if (dirTicks[j].dir !== expectedDir) { cancelled = true; cancelReason = "Direction mismatch"; break; }
        }
      }
      const states = ["signal", "confirm", "entry", "result"] as const;
      return { key, phase: patLen, direction: pattern.direction as "UP" | "DOWN",
        state: states[ticksAfter - 1], ticksAfter, confidence: pattern.confidence,
        avgContinuation: pattern.avgContinuation, cancelled, cancelReason };
    }
    return null;
  };
  return tryDetect(4, map4) ?? tryDetect(3, map3);
}

function calcDiscoveryIntelligence(prices: number[], arrays: AllArrays): DiscoveryIntelligence {
  if (prices.length < 55) {
    return { patterns3: [], patterns4: [], liveSignal: null, currentRSI: 50, currentADX: 20 };
  }
  const { rsiArr, adxArr, digitZArr, dirTicks } = arrays;
  const currentRSI = rsiArr[rsiArr.length - 1];
  const currentADX = adxArr[adxArr.length - 1];
  const store3 = buildDiscoveryPatterns(dirTicks, prices, 3, rsiArr, adxArr, digitZArr);
  const store4 = buildDiscoveryPatterns(dirTicks, prices, 4, rsiArr, adxArr, digitZArr);
  const patterns3 = summarizePatterns(store3, 3, dirTicks.length).slice(0, 10);
  const patterns4 = summarizePatterns(store4, 4, dirTicks.length).slice(0, 10);
  const liveSignal = detectLiveSignal(dirTicks, prices, patterns3, patterns4);
  return { patterns3, patterns4, liveSignal, currentRSI, currentADX };
}

// ─── Regime State Machine Engine ──────────────────────────────────────────────

function runRegimeStateMachine(
  prices: number[],
  rsiArr: number[], adxArr: number[], bbwArr: number[], strainArr: number[],
  upperBandArr: number[], lowerBandArr: number[]
): { current: RegimeName; duration: number; history: RegimeName[] } {
  const history: RegimeName[] = new Array(prices.length).fill("D");
  if (prices.length < 20) return { current: "D", duration: 1, history };

  let currentRegime: RegimeName = "D";
  let candidate: RegimeName = "D";
  let hysteresisCount = 0;
  let duration = 0;
  const upperHist: number[] = [];
  const lowerHist: number[] = [];

  // Hysteresis: A/B locked for 15 ticks; C for 2 ticks (safety priority); D instant
  const required: Record<RegimeName, number> = { A: 15, B: 15, C: 2, D: 1 };

  for (let i = 0; i < prices.length; i++) {
    if (i < 19) { history[i] = "D"; duration++; continue; }

    const rsi    = rsiArr[i];
    const adx    = adxArr[i];
    const bbw    = bbwArr[i];
    const strain = strainArr[i];

    upperHist.push(upperBandArr[i]);
    lowerHist.push(lowerBandArr[i]);
    if (upperHist.length > 4) { upperHist.shift(); lowerHist.shift(); }

    // Bands sliding = both bands moving same direction for 3 consecutive ticks
    let bandsSliding = false;
    if (upperHist.length >= 3) {
      const len = upperHist.length;
      const uUp = upperHist[len-1] > upperHist[len-2] && upperHist[len-2] > upperHist[len-3];
      const uDn = upperHist[len-1] < upperHist[len-2] && upperHist[len-2] < upperHist[len-3];
      const lUp = lowerHist[len-1] > lowerHist[len-2] && lowerHist[len-2] > lowerHist[len-3];
      const lDn = lowerHist[len-1] < lowerHist[len-2] && lowerHist[len-2] < lowerHist[len-3];
      bandsSliding = (uUp && lUp) || (uDn && lDn);
    }

    // Evaluate regime conditions (priority: C > A > B > D)
    // BBW is now absolute spread BB(10,EMA,2). RSI gate 42–58 avoids quantized 14-step exits.
    const condC = strain > 2.0 && (rsi > 70 || rsi < 30);
    const condA = bbw < 0.6 && rsi >= 42 && rsi <= 58;
    const condB = adx > 20 && strain < 0.5 && bandsSliding;

    const rawCandidate: RegimeName = condC ? "C" : condA ? "A" : condB ? "B" : "D";

    if (rawCandidate === candidate) {
      hysteresisCount++;
    } else {
      candidate = rawCandidate;
      hysteresisCount = 1;
    }

    // Regime A exit buffer: exit if BBW > 0.80 (absolute spread expanding beyond squeeze)
    // Regime C can always override A or B immediately (safety)
    if (currentRegime === "A" && bbw > 0.80 && !condC) {
      currentRegime = "D";
      duration = 1;
      candidate = "D";
      hysteresisCount = 1;
    } else if (condC && currentRegime !== "C") {
      // C is a priority interrupt — confirm after just 2 ticks regardless of current lock
      if (hysteresisCount >= required["C"]) {
        currentRegime = "C";
        duration = 1;
      } else {
        duration++;
      }
    } else if (hysteresisCount >= required[candidate] && candidate !== currentRegime) {
      currentRegime = candidate;
      duration = 1;
    } else {
      duration++;
    }

    history[i] = currentRegime;
  }

  return { current: currentRegime, duration, history };
}

/** Persistence ratio: % of 4-tick streaks that reached a 5th tick (macro window) */
function calcPersistenceRatio(dirTicks: DirTick[]): number {
  const slice = dirTicks.slice(-2000);
  if (slice.length < 10) return 50;
  let total = 0, reached5 = 0;
  for (let i = 3; i < slice.length - 1; i++) {
    const d = slice[i-3].dir;
    if (slice[i-2].dir === d && slice[i-1].dir === d && slice[i].dir === d) {
      total++;
      if (slice[i+1].dir === d) reached5++;
    }
  }
  return total > 0 ? (reached5 / total) * 100 : 50;
}

/** Reversal-Confirmation Engine with Dual-Point Indicator Tracking
 *
 *  Timing (relative to streak confirmation at position i+STREAK_LEN in dirTicks):
 *    T-5  (hitState):   dirTick[i-4].priceIdx  — start of the pre-sequence
 *    T-10 (startState): dirTick[i-9].priceIdx  — 5 dirTicks before the pre-sequence
 *
 *  Strict Confirmation Cross:
 *    UP streak  (→ CALL): pre-sequence must end in 'D'
 *    DOWN streak (→ PUT):  pre-sequence must end in 'U'
 *
 *  Grouping key: Sequence × Action × hitState RSI-bucket(±2) × hitState BBW-bucket(±0.05)
 *  50-tick warm-up ensures all indicators are fully primed before analysis begins.
 */
function runPatternEvolution(
  dirTicks: DirTick[],
  regimeHistory: RegimeName[],
  rsiArr: number[], bbwArr: number[], strainArr: number[]
): RegimeAtlas {
  const PRE_LEN    = 5;
  const STREAK_LEN = 5;
  const RSI_STEP   = 2;
  const BBW_STEP   = 0.05;
  const WARM_UP    = 50;
  // T-10 needs 9 prior dirTick positions; guard against out-of-bounds
  const MIN_I      = PRE_LEN - 1 + 5;  // = 9

  const lines = new Map<string, RawLineData>();
  const knownSuccessSeqs = new Set<string>();

  // ── Helpers ───────────────────────────────────────────────────────────────────
  function extractPoints(i: number) {
    const preTickArr    = dirTicks.slice(i - PRE_LEN + 1, i + 1);
    const preSeq        = preTickArr.map(d => d.dir).join("");
    const lastPreDir    = preSeq[PRE_LEN - 1];
    // T-5: dirTick index i-4 = start of the pre-sequence
    const hitPriceIdx   = preTickArr[0].priceIdx;
    // T-10: dirTick index i-9 = 5 ticks before the pre-sequence
    const startPriceIdx = dirTicks[i - 9].priceIdx;
    return { preSeq, lastPreDir, hitPriceIdx, startPriceIdx };
  }

  function getOrCreate(lineKey: string, action: "CALL" | "PUT", status: "SUCCESS" | "FAIL",
                       hitRsiBucket: number, hitBbwBucket: number): RawLineData {
    if (!lines.has(lineKey)) {
      lines.set(lineKey, {
        action, status, hitRsiBucket, hitBbwBucket,
        hits: 0, streakLengths: [],
        hitRsiSamples: [], hitBbwSamples: [], hitStrainSamples: [],
        startRsiSamples: [], startBbwSamples: [], startStrainSamples: [],
      });
    }
    return lines.get(lineKey)!;
  }

  function pushSamples(line: RawLineData,
                       hitRsi: number, hitBbw: number, hitStrain: number,
                       startRsi: number, startBbw: number, startStrain: number) {
    line.hits++;
    line.hitRsiSamples.push(hitRsi);
    line.hitBbwSamples.push(hitBbw);
    line.hitStrainSamples.push(hitStrain);
    line.startRsiSamples.push(startRsi);
    line.startBbwSamples.push(startBbw);
    line.startStrainSamples.push(startStrain);
  }

  // ── Helper: measure the full run length starting at index j ─────────────────
  function measureStreak(startJ: number): { dir: "U" | "D"; len: number; endJ: number } {
    const dir = dirTicks[startJ].dir;
    let endJ  = startJ;
    while (endJ + 1 < dirTicks.length && dirTicks[endJ + 1].dir === dir) endJ++;
    return { dir, len: endJ - startJ + 1, endJ };
  }

  // ── Pass 1: SUCCESS events ────────────────────────────────────────────────────
  //  Iterate actual streaks. For each streak ≥ STREAK_LEN, look back exactly
  //  PRE_LEN ticks before the streak started — those are the presequence.
  //  Each streak is processed exactly once regardless of how long it runs.
  {
    let j = 0;
    while (j < dirTicks.length) {
      const { dir: streakDir, len: streakLen, endJ } = measureStreak(j);

      if (streakLen >= STREAK_LEN) {
        // i = last presequence tick (one tick before the streak)
        const i = j - 1;
        if (i >= MIN_I) {
          const { preSeq, lastPreDir, hitPriceIdx, startPriceIdx } = extractPoints(i);

          if (hitPriceIdx >= WARM_UP) {
            const regime    = regimeHistory[hitPriceIdx] ?? "D";
            const regimeKey = `Regime_${regime}`;

            // Strict Confirmation Cross
            if (!(streakDir === "U" && lastPreDir !== "D") && !(streakDir === "D" && lastPreDir !== "U")) {
              const action: "CALL" | "PUT" = streakDir === "U" ? "CALL" : "PUT";

              const hitRsi      = rsiArr[hitPriceIdx]      ?? 50;
              const hitBbw      = bbwArr[hitPriceIdx]      ?? 0.4;
              const hitStrain   = strainArr[hitPriceIdx]   ?? 0;
              const startRsi    = rsiArr[startPriceIdx]    ?? 50;
              const startBbw    = bbwArr[startPriceIdx]    ?? 0.4;
              const startStrain = strainArr[startPriceIdx] ?? 0;

              const hitRsiBucket = Math.round(hitRsi / RSI_STEP) * RSI_STEP;
              const hitBbwBucket = parseFloat((Math.round(hitBbw / BBW_STEP) * BBW_STEP).toFixed(3));
              const lineKey      = `${regimeKey}::${preSeq}::${action}::SUCCESS::${hitRsiBucket}::${hitBbwBucket}`;

              const line = getOrCreate(lineKey, action, "SUCCESS", hitRsiBucket, hitBbwBucket);
              pushSamples(line, hitRsi, hitBbw, hitStrain, startRsi, startBbw, startStrain);
              line.streakLengths.push(streakLen); // actual full streak length

              knownSuccessSeqs.add(`${regimeKey}::${preSeq}`);
            }
          }
        }
      }

      j = endJ + 1;
    }
  }

  // ── Pass 2: FAIL events for proven sequences ──────────────────────────────────
  //  Iterate actual streaks. For each streak < STREAK_LEN, look back exactly
  //  PRE_LEN ticks before the streak started. If that presequence has ever
  //  produced a SUCCESS, record a FAIL — otherwise ignore entirely.
  {
    let j = 0;
    while (j < dirTicks.length) {
      const { len: streakLen, endJ } = measureStreak(j);

      if (streakLen < STREAK_LEN) {
        const i = j - 1; // last presequence tick
        if (i >= MIN_I) {
          const { preSeq, lastPreDir, hitPriceIdx, startPriceIdx } = extractPoints(i);

          if (hitPriceIdx >= WARM_UP) {
            const regime    = regimeHistory[hitPriceIdx] ?? "D";
            const regimeKey = `Regime_${regime}`;

            if (knownSuccessSeqs.has(`${regimeKey}::${preSeq}`)) {
              const expectedAction: "CALL" | "PUT" = lastPreDir === "D" ? "CALL" : "PUT";

              const hitRsi      = rsiArr[hitPriceIdx]      ?? 50;
              const hitBbw      = bbwArr[hitPriceIdx]      ?? 0.4;
              const hitStrain   = strainArr[hitPriceIdx]   ?? 0;
              const startRsi    = rsiArr[startPriceIdx]    ?? 50;
              const startBbw    = bbwArr[startPriceIdx]    ?? 0.4;
              const startStrain = strainArr[startPriceIdx] ?? 0;

              const hitRsiBucket = Math.round(hitRsi / RSI_STEP) * RSI_STEP;
              const hitBbwBucket = parseFloat((Math.round(hitBbw / BBW_STEP) * BBW_STEP).toFixed(3));
              const lineKey      = `${regimeKey}::${preSeq}::${expectedAction}::FAIL::${hitRsiBucket}::${hitBbwBucket}`;

              const line = getOrCreate(lineKey, expectedAction, "FAIL", hitRsiBucket, hitBbwBucket);
              pushSamples(line, hitRsi, hitBbw, hitStrain, startRsi, startBbw, startStrain);
            }
          }
        }
      }

      j = endJ + 1;
    }
  }

  // ── Build RegimeAtlas ─────────────────────────────────────────────────────────
  function arrAvg(arr: number[]): number {
    return arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
  }
  function arrRange(arr: number[], dp: number): [number, number] {
    if (arr.length === 0) return [0, 0];
    return [+Math.min(...arr).toFixed(dp), +Math.max(...arr).toFixed(dp)];
  }

  const byRegime: Record<string, PatternEntry[]> = {};

  for (const [lineKey, line] of lines.entries()) {
    const parts     = lineKey.split("::");
    const regimeKey = parts[0];
    const sequence  = parts[1];

    const startState: IndicatorState = {
      rsi:    +arrAvg(line.startRsiSamples).toFixed(1),
      bbw:    +arrAvg(line.startBbwSamples).toFixed(4),
      strain: +arrAvg(line.startStrainSamples).toFixed(4),
    };
    const hitState: IndicatorState = {
      rsi:    +arrAvg(line.hitRsiSamples).toFixed(1),
      bbw:    +arrAvg(line.hitBbwSamples).toFixed(4),
      strain: +arrAvg(line.hitStrainSamples).toFixed(4),
    };

    const safetyBox = {
      rsi:    arrRange(line.hitRsiSamples,    1) as [number, number],
      bbw:    arrRange(line.hitBbwSamples,    4) as [number, number],
      strain: arrRange(line.hitStrainSamples, 4) as [number, number],
    };

    const avgExtension = line.streakLengths.length > 0
      ? parseFloat((line.streakLengths.reduce((a, b) => a + b, 0) / line.streakLengths.length).toFixed(1))
      : 0;

    const entry: PatternEntry = {
      sequence,
      action:           line.action,
      status:           line.status,
      startState,
      hitState,
      persistenceScore: line.status === "SUCCESS" ? 100 : 0,
      totalSeen:        line.hits,
      successCount:     line.status === "SUCCESS" ? line.hits : 0,
      failCount:        line.status === "FAIL"    ? line.hits : 0,
      safetyBox,
      avgExtension,
      isElite: line.status === "SUCCESS" && line.hits >= 5,
    };

    if (!byRegime[regimeKey]) byRegime[regimeKey] = [];
    byRegime[regimeKey].push(entry);
  }

  // ── Sort: SUCCESS by hits desc, FAIL by hits desc, SUCCESS always first ───────
  const result: RegimeAtlas = {};
  for (const [regimeKey, entries] of Object.entries(byRegime)) {
    const success = entries
      .filter(e => e.status === "SUCCESS")
      .sort((a, b) => b.successCount - a.successCount);
    const fail = entries
      .filter(e => e.status === "FAIL")
      .sort((a, b) => b.failCount - a.failCount);

    result[regimeKey] = {
      elitePatterns: success.filter(e => e.isElite),
      allPatterns:   [...success, ...fail],
    };
  }
  return result;
}

function calcEvolutionaryState(prices: number[], arrays: AllArrays): EvolutionaryState {
  const { rsiArr, adxArr, bbwArr, upperBandArr, lowerBandArr, strainArr, ema50Arr, stdDev20Arr, dirTicks } = arrays;

  // Block all atlas + physicsMetrics updates until the Meso-window (50 ticks) is fully primed.
  // This prevents BBW 0.0000 and garbage indicator readings at startup.
  if (prices.length < 50) {
    return {
      version: "3.0-EVO", generatedAt: new Date().toISOString(),
      activeRegime: "D", persistenceRatio: 50, regimeDuration: 1,
      physicsMetrics: { rsi: 50, adx: 20, bbw: 0.4000, strain: 0, ema50: prices[prices.length-1]||0, stdDev20: 0 },
      entryGate: false, regimeAtlas: {},
      globalConfig: { minPersistenceToTrade: 55, minOccurrencesToPromote: 10, hysteresisWindow: 15 },
    };
  }

  const { current, duration, history } = runRegimeStateMachine(
    prices, rsiArr, adxArr, bbwArr, strainArr, upperBandArr, lowerBandArr
  );
  const persistenceRatio = calcPersistenceRatio(dirTicks);
  const activeRegime: RegimeName = persistenceRatio < 45 ? "D" : current;
  const regimeAtlas = runPatternEvolution(dirTicks, history, rsiArr, bbwArr, strainArr);

  const lastIdx = prices.length - 1;
  const physicsMetrics: PhysicsMetrics = {
    rsi:     +( rsiArr[lastIdx]     ?? 50).toFixed(1),
    adx:     +( adxArr[lastIdx]     ?? 20).toFixed(1),
    bbw:     +( bbwArr[lastIdx]     ?? 0.4).toFixed(4),
    strain:  +(strainArr[lastIdx]   ?? 0).toFixed(4),
    ema50:   +(ema50Arr[lastIdx]    ?? prices[lastIdx]).toFixed(4),
    stdDev20:+(stdDev20Arr[lastIdx] ?? 0).toFixed(6),
  };

  return {
    version: "3.0-EVO", generatedAt: new Date().toISOString(),
    activeRegime, persistenceRatio: +persistenceRatio.toFixed(1),
    regimeDuration: duration, physicsMetrics,
    entryGate: activeRegime === "A" || activeRegime === "B",
    regimeAtlas,
    globalConfig: { minPersistenceToTrade: 55, minOccurrencesToPromote: 10, hysteresisWindow: 15 },
  };
}

// ─── Worker Message Handler ───────────────────────────────────────────────────

self.onmessage = (e: MessageEvent) => {
  const { type, prices, windowSize } = e.data as {
    type: string; prices: number[]; windowSize: number;
  };

  if (type === "compute") {
    if (!prices || prices.length === 0) {
      self.postMessage({ type: "error", message: "No price data" });
      return;
    }

    const window = Math.min(windowSize, prices.length);
    const slicedPrices = prices.slice(-window);

    // Compute all shared arrays once
    const arrays = computeAllArrays(prices);

    const entropy    = calcDigitEntropy(prices, window);
    const markov     = calcMarkov(slicedPrices);
    const exhaustion = calcExhaustion(prices);
    const currentPrice = prices[prices.length - 1];
    const confidence = calcMCS(entropy, markov, exhaustion, currentPrice, window, prices);
    const regimes    = detectRegimes(prices);
    const discoveryIntelligence = calcDiscoveryIntelligence(prices, arrays);
    const evolutionaryState     = calcEvolutionaryState(prices, arrays);

    const result: DNAResult = {
      entropy, markov, exhaustion, confidence, regimes,
      discoveryIntelligence, evolutionaryState,
      windowSize: window, totalTicks: prices.length,
    };

    self.postMessage({ type: "result", data: result });
  }
};
