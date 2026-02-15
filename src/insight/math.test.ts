import { describe, it, expect } from 'vitest';
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
    computeDimensioning,
    RawPoint,
    Point
} from './math';

// ─── Test Helpers ────────────────────────────────────────────────────────────

function makeRawPoint(x: number, y: number, dateStr = '2024-01-01', isYesterday = false): RawPoint {
    return { x, y, dateStr, isYesterday };
}

// ─── filterOutliersByResidual ────────────────────────────────────────────────

describe('filterOutliersByResidual', () => {
    it('returns all points when fewer than 5', () => {
        const points = [makeRawPoint(5, 10), makeRawPoint(10, 20), makeRawPoint(15, 30)];
        const result = filterOutliersByResidual(points);
        expect(result.clean).toHaveLength(3);
        expect(result.removedDates).toHaveLength(0);
    });

    it('returns all points when data is clean (no outliers)', () => {
        // Perfect linear: y = 2x + 1
        const points = Array.from({ length: 10 }, (_, i) =>
            makeRawPoint(i, 2 * i + 1, `2024-01-${(i + 1).toString().padStart(2, '0')}`)
        );
        const result = filterOutliersByResidual(points);
        expect(result.clean).toHaveLength(10);
        expect(result.removedDates).toHaveLength(0);
    });

    it('removes extreme outliers', () => {
        // 20 clean points on y = 2x + 1, then one sensor failure day
        const points = Array.from({ length: 20 }, (_, i) =>
            makeRawPoint(i + 1, 2 * (i + 1) + 1, `2024-01-${(i + 1).toString().padStart(2, '0')}`)
        );
        points.push(makeRawPoint(10, 500, '2024-01-21')); // Sensor failure
        const result = filterOutliersByResidual(points);
        expect(result.removedDates).toContain('2024-01-21');
        expect(result.clean.length).toBeLessThan(21);
    });

    it('handles empty array', () => {
        const result = filterOutliersByResidual([]);
        expect(result.clean).toHaveLength(0);
        expect(result.removedDates).toHaveLength(0);
    });

    it('respects custom fence factor', () => {
        // With a very high fence factor, nothing should be removed
        const points = [
            makeRawPoint(1, 3, '2024-01-01'),
            makeRawPoint(2, 5, '2024-01-02'),
            makeRawPoint(3, 7, '2024-01-03'),
            makeRawPoint(4, 9, '2024-01-04'),
            makeRawPoint(5, 11, '2024-01-05'),
            makeRawPoint(6, 13, '2024-01-06'),
            makeRawPoint(7, 30, '2024-01-07'), // Moderate outlier
        ];
        const strict = filterOutliersByResidual(points, 1.0);
        const lenient = filterOutliersByResidual(points, 10.0);
        expect(strict.removedDates.length).toBeGreaterThanOrEqual(lenient.removedDates.length);
    });

    it('never removes yesterday point even if it is an outlier', () => {
        const points = Array.from({ length: 20 }, (_, i) =>
            makeRawPoint(i + 1, 2 * (i + 1) + 1, `2024-02-${(i + 1).toString().padStart(2, '0')}`)
        );
        points.push(makeRawPoint(10, 500, '2024-03-01', true));
        const result = filterOutliersByResidual(points);
        expect(result.removedDates).not.toContain('2024-03-01');
        expect(result.clean.find(p => p.dateStr === '2024-03-01')).toBeTruthy();
    });
});

// ─── computeRegression ───────────────────────────────────────────────────────

describe('computeRegression', () => {
    it('computes correct slope and intercept for perfect linear data', () => {
        const points: Point[] = [{ x: 0, y: 5 }, { x: 10, y: 25 }];
        const result = computeRegression(points);
        expect(result.m).toBeCloseTo(2.0, 5);
        expect(result.b).toBeCloseTo(5.0, 5);
        expect(result.r2).toBeCloseTo(1.0, 5);
    });

    it('returns zeros for fewer than 2 points', () => {
        const result = computeRegression([{ x: 5, y: 10 }]);
        expect(result.m).toBe(0);
        expect(result.b).toBe(0);
        expect(result.r2).toBe(0);
    });

    it('returns r2 < 1 for noisy data', () => {
        const points: Point[] = [
            { x: 0, y: 5 }, { x: 5, y: 12 },
            { x: 10, y: 20 }, { x: 15, y: 35 },
        ];
        const result = computeRegression(points);
        expect(result.r2).toBeGreaterThan(0.8);
        expect(result.r2).toBeLessThan(1.0);
    });
});

// ─── clipRegressionLine ──────────────────────────────────────────────────────

describe('clipRegressionLine', () => {
    it('starts at x=0 when b >= 0', () => {
        const line = clipRegressionLine(2, 3, 20);
        expect(line[0].x).toBe(0);
        expect(line[0].y).toBe(3);
        expect(line[1].x).toBe(20);
        expect(line[1].y).toBe(43);
    });

    it('starts at x-intercept when b < 0', () => {
        // y = 2x - 4, x-intercept at x = 2
        const line = clipRegressionLine(2, -4, 20);
        expect(line[0].x).toBeCloseTo(2, 5);
        expect(line[0].y).toBeCloseTo(0, 5);
    });

    it('handles b = 0', () => {
        const line = clipRegressionLine(2, 0, 20);
        expect(line[0].x).toBe(0);
        expect(line[0].y).toBe(0);
    });
});

// ─── computeAnnualHeatingProjection ──────────────────────────────────────────

describe('computeAnnualHeatingProjection', () => {
    it('multiplies slope by 2800 HDD', () => {
        expect(computeAnnualHeatingProjection(2)).toBe(5600);
        expect(computeAnnualHeatingProjection(0)).toBe(0);
        expect(computeAnnualHeatingProjection(1.5)).toBeCloseTo(4200);
    });
});

// ─── computeWwBaseLoad ───────────────────────────────────────────────────────

describe('computeWwBaseLoad', () => {
    it('computes mean of positive values', () => {
        const map = new Map<string, number>([['d1', 3], ['d2', 5], ['d3', 7]]);
        expect(computeWwBaseLoad(map)).toBeCloseTo(5);
    });

    it('ignores zero values', () => {
        const map = new Map<string, number>([['d1', 0], ['d2', 4], ['d3', 6]]);
        expect(computeWwBaseLoad(map)).toBeCloseTo(5);
    });

    it('returns 0 for empty map', () => {
        expect(computeWwBaseLoad(new Map())).toBe(0);
    });

    it('returns 0 when all values are zero', () => {
        const map = new Map<string, number>([['d1', 0], ['d2', 0]]);
        expect(computeWwBaseLoad(map)).toBe(0);
    });
});

// ─── computeAvgEfficiency ────────────────────────────────────────────────────

describe('computeAvgEfficiency', () => {
    it('computes total energy / total HDD for heating days', () => {
        const points: Point[] = [{ x: 10, y: 20 }, { x: 5, y: 10 }, { x: 0, y: 3 }];
        // Only points with x > 0: (10, 20) and (5, 10)
        // totalEnergy = 30, totalHDD = 15
        expect(computeAvgEfficiency(points)).toBeCloseTo(2.0);
    });

    it('returns 0 when no heating days', () => {
        const points: Point[] = [{ x: 0, y: 5 }];
        expect(computeAvgEfficiency(points)).toBe(0);
    });
});

// ─── computeAvgHeatingPower ──────────────────────────────────────────────────

describe('computeAvgHeatingPower', () => {
    it('computes mean of heating day energies / 24', () => {
        const points: Point[] = [{ x: 10, y: 24 }, { x: 5, y: 48 }];
        // mean(24, 48) / 24 = 36 / 24 = 1.5
        expect(computeAvgHeatingPower(points)).toBeCloseTo(1.5);
    });

    it('returns 0 for no heating days', () => {
        const points: Point[] = [{ x: 0, y: 5 }];
        expect(computeAvgHeatingPower(points)).toBe(0);
    });
});

// ─── computeDeviation ────────────────────────────────────────────────────────

describe('computeDeviation', () => {
    it('returns actual - expected', () => {
        // Expected at x=5: y = 2*5 + 3 = 13
        expect(computeDeviation({ x: 5, y: 15 }, 2, 3)).toBeCloseTo(2);
    });

    it('returns 0 when no yesterday point', () => {
        expect(computeDeviation(null, 2, 3)).toBe(0);
    });

    it('handles negative deviation', () => {
        // Expected at x=5: y = 2*5 + 3 = 13
        expect(computeDeviation({ x: 5, y: 10 }, 2, 3)).toBeCloseTo(-3);
    });
});

// ─── sumMapValues ────────────────────────────────────────────────────────────

describe('sumMapValues', () => {
    it('sums all numeric values and counts days', () => {
        const map = new Map<string, number>([['d1', 10], ['d2', 20], ['d3', 30]]);
        const result = sumMapValues(map);
        expect(result.total).toBe(60);
        expect(result.dayCount).toBe(3);
    });

    it('handles empty map', () => {
        const result = sumMapValues(new Map());
        expect(result.total).toBe(0);
        expect(result.dayCount).toBe(0);
    });
});

// ─── computeDimensioning ─────────────────────────────────────────────────────

describe('computeDimensioning', () => {
    const baseInput = {
        m: 1.5,
        b: 2.0,
        totalElecPeriod: 3000,
        totalDaysPeriod: 300,
        annualHeatingElecKwh: 4200,
        wwBaseLoad: 4.5,
        avgPowerForHeating: 0.8,
        jaz: 4.0,
        jazSource: 'fixed' as const,
        copCold: 2.7,
        area: 150,
        electricityPrice: 0.30
    };

    it('computes annual energy from totalMap scaling', () => {
        const d = computeDimensioning(baseInput);
        // 3000 * (365.25 / 300) = 3652.5
        const expectedAnnual = 3000 * (365.25 / 300);
        expect(d.energyIndex).toBeCloseTo((expectedAnnual * 4.0) / 150);
    });

    it('falls back to regression when totalDaysPeriod is 0', () => {
        const d = computeDimensioning({ ...baseInput, totalDaysPeriod: 0, totalElecPeriod: 0 });
        // annualHeatingElecKwh = 4200
        expect(d.energyIndex).toBeCloseTo((4200 * 4.0) / 150);
    });

    it('computes peak electrical power at -10°C', () => {
        const d = computeDimensioning(baseInput);
        // (1.5 * 25 + 2.0) / 24 = 39.5 / 24 ≈ 1.646
        expect(d.peakElectricalPower).toBeCloseTo(39.5 / 24, 2);
    });

    it('computes thermal loads correctly', () => {
        const d = computeDimensioning(baseInput);
        expect(d.avgThermalLoad).toBeCloseTo(0.8 * 4.0);
        expect(d.peakThermalLoad).toBeCloseTo((39.5 / 24) * 2.7, 2);
    });

    it('returns zero area-dependent metrics when area is 0', () => {
        const d = computeDimensioning({ ...baseInput, area: 0 });
        expect(d.energyIndex).toBe(0);
        expect(d.specificHeatLoad).toBe(0);
        expect(d.costIndex).toBe(0);
    });

    it('passes through wwBaseLoad', () => {
        const d = computeDimensioning(baseInput);
        expect(d.wwBaseLoad).toBe(4.5);
    });

    it('passes through jazSource', () => {
        const d = computeDimensioning(baseInput);
        expect(d.jazSource).toBe('fixed');
        const d2 = computeDimensioning({ ...baseInput, jazSource: 'sensor' });
        expect(d2.jazSource).toBe('sensor');
    });
});
