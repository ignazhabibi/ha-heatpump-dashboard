/**
 * Pure math/statistics functions for the Insight Card.
 * No dependencies on Lit, Chart.js, or Home Assistant.
 */
import * as ss from 'simple-statistics';
import { DimensioningData } from '../types';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface RawPoint {
    x: number;        // HDD (heating degree-days)
    y: number;        // energy in kWh
    dateStr: string;
    isYesterday: boolean;
}

export interface Point {
    x: number;
    y: number;
}

export interface OutlierFilterResult {
    clean: RawPoint[];
    removedDates: string[];
}

export interface RegressionResult {
    m: number;        // slope (kWh per HDD)
    b: number;        // y-intercept
    r2: number;       // coefficient of determination
}

export interface LinePoint {
    x: number;
    y: number;
}

export interface DimensioningInput {
    m: number;
    b: number;
    totalElecPeriod: number;
    totalDaysPeriod: number;
    annualHeatingElecKwh: number;
    wwBaseLoad: number;
    avgPowerForHeating: number;
    jaz: number;
    jazSource: 'fixed' | 'sensor' | 'missing';
    copCold: number;
    area: number;
    electricityPrice: number;
}

// ─── Functions ───────────────────────────────────────────────────────────────

function median(values: number[]): number {
    if (values.length === 0) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0
        ? (sorted[mid - 1] + sorted[mid]) / 2
        : sorted[mid];
}

function buildTheilSenModel(points: RawPoint[]): { m: number; b: number } {
    const slopes: number[] = [];
    for (let i = 0; i < points.length; i++) {
        for (let j = i + 1; j < points.length; j++) {
            const dx = points[j].x - points[i].x;
            if (Math.abs(dx) < 1e-9) continue;
            slopes.push((points[j].y - points[i].y) / dx);
        }
    }

    if (slopes.length === 0) {
        const yMedian = median(points.map(p => p.y));
        return { m: 0, b: yMedian };
    }

    const m = median(slopes);
    const intercepts = points.map(p => p.y - (m * p.x));
    const b = median(intercepts);
    return { m, b };
}

/**
 * Robust residual-based outlier filter.
 * Uses a Theil-Sen robust baseline fit and MAD-scaled residual scores.
 * Safeguards:
 * - Never remove yesterday point (isYesterday=true)
 * - Cap maximum removed points to 20% of sample
 */
export function filterOutliersByResidual(
    points: RawPoint[],
    fenceFactor: number = 3.5
): OutlierFilterResult {
    if (points.length < 7) {
        return { clean: [...points], removedDates: [] };
    }

    const robust = buildTheilSenModel(points);
    const residuals = points.map(p => p.y - (robust.m * p.x + robust.b));
    const residualMedian = median(residuals);
    const absDev = residuals.map(r => Math.abs(r - residualMedian));
    const mad = median(absDev);

    // Convert MAD to sigma estimate (normal consistency factor).
    const sigma = mad > 1e-9 ? 1.4826 * mad : 0;

    let candidates: Array<{ point: RawPoint; score: number }> = [];

    if (sigma > 1e-9) {
        const scored = points.map((p, i) => {
            const score = Math.abs((residuals[i] - residualMedian) / sigma);
            return { point: p, score };
        });
        candidates = scored
            .filter(s => !s.point.isYesterday && s.score > fenceFactor)
            .sort((a, b) => b.score - a.score);
    } else {
        // Fallback for near-perfect lines where MAD collapses to zero.
        const sorted = [...residuals].sort((a, b) => a - b);
        const q1 = ss.quantileSorted(sorted, 0.25);
        const q3 = ss.quantileSorted(sorted, 0.75);
        const iqr = q3 - q1;
        const delta = iqr > 1e-9 ? fenceFactor * iqr : 1e-9;
        const lower = residualMedian - delta;
        const upper = residualMedian + delta;

        candidates = points
            .map((point, i) => {
                const r = residuals[i];
                return {
                    point,
                    score: Math.abs(r - residualMedian),
                    isOutlier: r < lower || r > upper
                };
            })
            .filter(s => !s.point.isYesterday && s.isOutlier)
            .map(({ point, score }) => ({ point, score }))
            .sort((a, b) => b.score - a.score);
    }

    const maxRemovals = Math.max(1, Math.floor(points.length * 0.2));
    const removed = new Set(
        candidates.slice(0, maxRemovals).map(c => c.point.dateStr)
    );

    const clean = points.filter(p => !removed.has(p.dateStr));
    const removedDates = Array.from(removed.values());

    return { clean, removedDates };
}

/**
 * Linear regression with R².
 * Returns slope (m), intercept (b), and coefficient of determination (r2).
 */
export function computeRegression(points: Point[]): RegressionResult {
    if (points.length < 2) {
        return { m: 0, b: 0, r2: 0 };
    }
    const { m, b } = ss.linearRegression(points.map(p => [p.x, p.y]));
    const r2 = ss.sampleCorrelation(
        points.map(p => p.x),
        points.map(p => p.y)
    ) ** 2;
    return { m, b, r2 };
}

/**
 * Generate regression line points, clipped at y ≥ 0.
 * If b < 0, the line starts at the x-intercept instead of x=0.
 */
export function clipRegressionLine(m: number, b: number, maxHDD: number): LinePoint[] {
    const startX = b >= 0 ? 0 : (m !== 0 ? -b / m : 0);
    return [
        { x: startX, y: Math.max(0, (m * startX) + b) },
        { x: maxHDD, y: (m * maxHDD) + b }
    ];
}

/**
 * Annual heating energy projection from regression slope.
 * Uses 2800 HDD as German standard annual heating degree-days.
 */
export function computeAnnualHeatingProjection(m: number): number {
    return m * 2800;
}

/**
 * Mean daily WW energy from the hot water sensor.
 * Only considers positive values (zero = no data day).
 */
export function computeWwBaseLoad(wwMap: Map<string, number>): number {
    const wwDays = Array.from(wwMap.values()).filter(v => typeof v === 'number' && v > 0);
    return wwDays.length > 0 ? ss.mean(wwDays) : 0;
}

/**
 * Average efficiency: total energy / total HDD for heating-active days.
 * Only considers days with HDD > 0 (heating days).
 */
export function computeAvgEfficiency(points: Point[]): number {
    const validPoints = points.filter(p => p.x > 0);
    const totalEnergy = validPoints.reduce((sum, p) => sum + p.y, 0);
    const totalHDD = validPoints.reduce((sum, p) => sum + p.x, 0);
    return totalHDD > 0 ? totalEnergy / totalHDD : 0;
}

/**
 * Average electrical power during heating days (kW).
 * Mean of daily energy values / 24 hours.
 */
export function computeAvgHeatingPower(points: Point[]): number {
    const heatingDays = points.filter(p => p.x > 0);
    return heatingDays.length > 0
        ? (ss.mean(heatingDays.map(p => p.y)) / 24)
        : 0;
}

/**
 * Deviation of yesterday's actual energy from the regression expectation.
 */
export function computeDeviation(
    yesterdayPoint: Point | null,
    m: number,
    b: number
): number {
    if (!yesterdayPoint) return 0;
    const expected = (m * yesterdayPoint.x) + b;
    return yesterdayPoint.y - expected;
}

/**
 * Total energy from a map (sum of all daily values).
 * Returns { total, dayCount }.
 */
export function sumMapValues(map: Map<string, number>): { total: number; dayCount: number } {
    const values = Array.from(map.values()).filter(v => typeof v === 'number');
    return {
        total: values.reduce((a, b) => a + b, 0),
        dayCount: values.length
    };
}

/**
 * Full dimensioning calculation from processed data.
 * Computes all metrics for the Energieausweis.
 */
export function computeDimensioning(input: DimensioningInput): DimensioningData {
    const { m, b, totalElecPeriod, totalDaysPeriod, annualHeatingElecKwh,
        wwBaseLoad, avgPowerForHeating, jaz, jazSource, copCold, area, electricityPrice } = input;

    // Annual total energy: scale measured data to 365 days, fallback to regression
    const annualElectr = totalDaysPeriod > 0
        ? totalElecPeriod * (365.25 / totalDaysPeriod)
        : annualHeatingElecKwh;

    // Peak electrical power at -10°C: Pel = (m × 25 + b) / 24
    // 25 HDD = heatingLimit(15) - (-10°C)
    const peakElectr = ((m * 25) + b) / 24;

    return {
        avgElectricalPower: avgPowerForHeating,
        avgThermalLoad: avgPowerForHeating * jaz,
        peakElectricalPower: peakElectr,
        peakThermalLoad: peakElectr * copCold,
        energyIndex: area > 0 ? (annualElectr * jaz) / area : 0,
        specificHeatLoad: area > 0 ? (peakElectr * copCold * 1000) / area : 0,
        costIndex: area > 0 ? (annualElectr * electricityPrice) / area : 0,
        jaz: jaz,
        jazSource: jazSource,
        wwBaseLoad: wwBaseLoad
    };
}
