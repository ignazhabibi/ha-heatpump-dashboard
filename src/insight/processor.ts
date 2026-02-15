/**
 * Data processing logic for the Insight Card.
 * Transforms raw Home Assistant statistics into chart-ready data.
 * No dependencies on Lit or Chart.js.
 */
import {
    filterOutliersByResidual,
    computeRegression,
    clipRegressionLine,
    computeAnnualHeatingProjection,
    computeWwBaseLoad,
    computeAvgEfficiency,
    computeAvgHeatingPower,
    computeDeviation,
    sumMapValues,
    RawPoint,
    Point
} from './math';
import { RecorderStatisticPoint, RecorderStatisticsResult } from '../shared/utils/ha-statistics';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface YesterdayMeta {
    date: string;
    energy: number;
    hdd: number;
    efficiency: number;
}

export interface SeriesResult {
    points: Point[];
    datedPoints: Array<{ x: number; y: number; dateStr: string }>;
    yesterdayPoint: Point | null;
    yesterdayMeta: YesterdayMeta | null;
    m: number;
    b: number;
    r2: number;
    linePoints: { x: number; y: number }[];
    deviation: number;
    avgEfficiency: number;
    avgPowerForHeating: number;
    annualHeatingElecKwh: number;
    totalElecPeriod: number;
    totalDaysPeriod: number;
    wwBaseLoad: number;
}

export interface ProcessSeriesParams {
    stats: RecorderStatisticsResult;
    heatingId: string | undefined;
    hotwaterId: string | undefined;
    tempId: string;
    heatingLimit: number;
    identifyYesterday: boolean;
    filterStart: Date | null;
    excludeZeroHddDays?: boolean;
}

// ─── Functions ───────────────────────────────────────────────────────────────

function computeRegressionThroughOrigin(points: Point[]): { m: number } {
    const denom = points.reduce((sum, p) => sum + (p.x * p.x), 0);
    if (denom <= 1e-9) return { m: 0 };
    const numer = points.reduce((sum, p) => sum + (p.x * p.y), 0);
    return { m: numer / denom };
}

function computeModelR2(points: Point[], m: number, b: number): number {
    if (points.length < 2) return 0;
    const meanY = points.reduce((sum, p) => sum + p.y, 0) / points.length;
    const sst = points.reduce((sum, p) => {
        const d = p.y - meanY;
        return sum + (d * d);
    }, 0);
    if (sst <= 1e-9) return 0;

    const sse = points.reduce((sum, p) => {
        const err = p.y - ((m * p.x) + b);
        return sum + (err * err);
    }, 0);
    return 1 - (sse / sst);
}

/**
 * Build three separate energy maps from raw HA statistics:
 * - heatingMap: heating-only energy (for regression)
 * - totalMap: heating + hot water (for Energieausweis)
 * - wwMap: hot water only (for measured WW base load)
 */
export function buildEnergyMaps(
    stats: RecorderStatisticsResult,
    heatingId: string | undefined,
    hotwaterId: string | undefined
): { heatingMap: Map<string, number>; totalMap: Map<string, number>; wwMap: Map<string, number> } {
    const heatingMap = new Map<string, number>();
    const totalMap = new Map<string, number>();
    const wwMap = new Map<string, number>();

    if (heatingId && stats[heatingId]) {
        stats[heatingId].forEach((e: RecorderStatisticPoint) => {
            const key = new Date(e.start).toDateString();
            // Clamp invalid/negative deltas (e.g. counter resets) to 0
            // so they don't distort regression and period sums.
            const raw = Number(e.change);
            const val = Number.isFinite(raw) ? Math.max(0, raw) : 0;
            heatingMap.set(key, (heatingMap.get(key) || 0) + val);
            totalMap.set(key, (totalMap.get(key) || 0) + val);
        });
    }
    if (hotwaterId && stats[hotwaterId]) {
        stats[hotwaterId].forEach((e: RecorderStatisticPoint) => {
            const key = new Date(e.start).toDateString();
            const raw = Number(e.change);
            const val = Number.isFinite(raw) ? Math.max(0, raw) : 0;
            wwMap.set(key, (wwMap.get(key) || 0) + val);
            totalMap.set(key, (totalMap.get(key) || 0) + val);
        });
    }

    return { heatingMap, totalMap, wwMap };
}

/**
 * Build a temperature map from raw HA statistics.
 */
export function buildTempMap(stats: RecorderStatisticsResult, tempId: string): Map<string, number> {
    const tempMap = new Map<string, number>();
    if (stats[tempId]) {
        stats[tempId].forEach((t: RecorderStatisticPoint) => {
            if (typeof t.mean === 'number') {
                tempMap.set(new Date(t.start).toDateString(), t.mean);
            }
        });
    }
    return tempMap;
}

/**
 * Build raw scatter points from an energy map + temperature map.
 * Skips today's incomplete data. Flags yesterday for identification.
 */
export function buildRawPoints(
    regressionSource: Map<string, number>,
    tempMap: Map<string, number>,
    heatingLimit: number,
    filterStart: Date | null,
    identifyYesterday: boolean,
    excludeZeroHddDays: boolean = false
): RawPoint[] {
    const todayStr = new Date().toDateString();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toDateString();
    const startTime = filterStart ? filterStart.getTime() : 0;

    const points: RawPoint[] = [];

    regressionSource.forEach((energy, dateStr) => {
        if (dateStr === todayStr) return;
        const date = new Date(dateStr);
        const temp = tempMap.get(dateStr);
        if (typeof temp === 'number' && typeof energy === 'number') {
            const hdd = Math.max(0, heatingLimit - temp);
            if (excludeZeroHddDays && hdd <= 0) return;
            const isYday = identifyYesterday && dateStr === yesterdayStr;
            if (isYday || date.getTime() >= startTime) {
                points.push({ x: hdd, y: energy, dateStr, isYesterday: isYday });
            }
        }
    });

    return points;
}

/**
 * Separate yesterday's point from the rest of the clean points.
 */
export function extractYesterday(
    cleanPoints: RawPoint[]
): {
    points: Point[];
    yesterdayPoint: Point | null;
    yesterdayMeta: YesterdayMeta | null;
} {
    let yesterdayPoint: Point | null = null;
    let yesterdayMeta: YesterdayMeta | null = null;
    const points: Point[] = [];

    for (const p of cleanPoints) {
        if (p.isYesterday) {
            yesterdayPoint = { x: p.x, y: p.y };
            yesterdayMeta = {
                date: p.dateStr,
                energy: p.y,
                hdd: p.x,
                efficiency: p.x > 0 ? p.y / p.x : 0
            };
        } else {
            points.push({ x: p.x, y: p.y });
        }
    }

    return { points, yesterdayPoint, yesterdayMeta };
}

/**
 * Full series processing pipeline.
 * Orchestrates: map building → raw points → outlier filter → regression → metrics.
 * 
 * This replaces the former `processSeries` closure in card.ts.
 */
export function processInsightSeries(params: ProcessSeriesParams): SeriesResult | null {
    const {
        stats,
        heatingId,
        hotwaterId,
        tempId,
        heatingLimit,
        identifyYesterday,
        filterStart,
        excludeZeroHddDays = false
    } = params;

    // Guard: need temperature data
    if (!stats[tempId]) return null;
    // Guard: need at least one energy source
    if ((!heatingId || !stats[heatingId]) && (!hotwaterId || !stats[hotwaterId])) return null;

    // 1. Build three-tier energy maps
    const { heatingMap, totalMap, wwMap } = buildEnergyMaps(stats, heatingId, hotwaterId);
    const hasHeating = Boolean(heatingId && stats[heatingId]);
    const hasHotwater = Boolean(hotwaterId && stats[hotwaterId]);
    const splitMode = hasHeating && hasHotwater;

    // Remove today's incomplete data from all maps
    const todayStr = new Date().toDateString();
    wwMap.delete(todayStr);
    totalMap.delete(todayStr);

    // 2. Choose regression source
    const regressionSource = hasHeating ? heatingMap : totalMap;

    // 3. Build temperature map and raw points
    const tempMap = buildTempMap(stats, tempId);
    const allRawPoints = buildRawPoints(
        regressionSource,
        tempMap,
        heatingLimit,
        filterStart,
        identifyYesterday,
        excludeZeroHddDays
    );

    // 4. Outlier filter
    const { clean: cleanPoints, removedDates } = filterOutliersByResidual(allRawPoints);

    // Remove outlier dates from totalMap and wwMap
    for (const dateStr of removedDates) {
        totalMap.delete(dateStr);
        wwMap.delete(dateStr);
    }

    // 5. Extract yesterday from filtered points (regression space)
    const {
        points: regressionPoints,
        yesterdayPoint: regressionYesterdayPoint,
        yesterdayMeta: regressionYesterdayMeta
    } = extractYesterday(cleanPoints);
    if (regressionPoints.length < 2) return null;

    // 6. Build coherent model + display series.
    // Split mode:
    //   - slope from heating-only points (through-origin model)
    //   - intercept from measured WW base load
    //   - displayed points are total energy
    // Fallback mode:
    //   - classic unconstrained regression on one selected series
    const wwBaseLoad = computeWwBaseLoad(wwMap);
    let points: Point[] = regressionPoints;
    let datedPoints: Array<{ x: number; y: number; dateStr: string }> = cleanPoints
        .filter((p) => !p.isYesterday)
        .map((p) => ({ x: p.x, y: p.y, dateStr: p.dateStr }));
    let yesterdayPoint = regressionYesterdayPoint;
    let yesterdayMeta: YesterdayMeta | null = null;
    let m = 0;
    let b = 0;
    let r2 = 0;

    if (splitMode) {
        const constrained = computeRegressionThroughOrigin(regressionPoints);
        m = constrained.m;
        b = wwBaseLoad;

        const displayRawPoints: RawPoint[] = [];
        for (const p of cleanPoints) {
            const totalY = totalMap.get(p.dateStr);
            if (typeof totalY !== 'number') continue;
            displayRawPoints.push({ ...p, y: totalY });
        }

        const extracted = extractYesterday(displayRawPoints);
        points = extracted.points;
        datedPoints = displayRawPoints
            .filter((p) => !p.isYesterday)
            .map((p) => ({ x: p.x, y: p.y, dateStr: p.dateStr }));
        yesterdayPoint = extracted.yesterdayPoint;
        yesterdayMeta = extracted.yesterdayMeta;

        if (points.length < 2) return null;
        r2 = computeModelR2(points, m, b);
    } else {
        const regression = computeRegression(regressionPoints);
        m = regression.m;
        b = regression.b;
        r2 = regression.r2;
        yesterdayMeta = regressionYesterdayMeta;
    }

    // 7. Derived metrics
    const annualHeatingElecKwh = computeAnnualHeatingProjection(m);
    const maxHDD = Math.max(...points.map(p => p.x), 20);
    const linePoints = clipRegressionLine(m, b, maxHDD);
    const deviation = computeDeviation(yesterdayPoint, m, b);
    const avgEfficiency = computeAvgEfficiency(regressionPoints);
    const avgPowerForHeating = computeAvgHeatingPower(regressionPoints);
    const { total: totalElecPeriod, dayCount: totalDaysPeriod } = sumMapValues(totalMap);

    return {
        datedPoints,
        points, yesterdayPoint, yesterdayMeta,
        m, b, r2, linePoints,
        deviation, avgEfficiency, avgPowerForHeating,
        annualHeatingElecKwh, totalElecPeriod, totalDaysPeriod, wwBaseLoad
    };
}
