import { describe, it, expect } from 'vitest';
import { buildEnergyMaps, buildTempMap, buildRawPoints, extractYesterday, processInsightSeries } from './processor';
import { RawPoint } from './math';

// ─── buildEnergyMaps ─────────────────────────────────────────────────────────

describe('buildEnergyMaps', () => {
    it('separates heating and hot water into correct maps', () => {
        const stats = {
            'sensor.heating': [
                { start: '2024-01-15T00:00:00Z', change: 10 },
                { start: '2024-01-16T00:00:00Z', change: 15 },
            ],
            'sensor.hotwater': [
                { start: '2024-01-15T00:00:00Z', change: 3 },
                { start: '2024-01-16T00:00:00Z', change: 4 },
            ],
        };
        const { heatingMap, totalMap, wwMap } = buildEnergyMaps(stats, 'sensor.heating', 'sensor.hotwater');

        const d1 = new Date('2024-01-15T00:00:00Z').toDateString();
        const d2 = new Date('2024-01-16T00:00:00Z').toDateString();

        expect(heatingMap.get(d1)).toBe(10);
        expect(heatingMap.get(d2)).toBe(15);
        expect(wwMap.get(d1)).toBe(3);
        expect(wwMap.get(d2)).toBe(4);
        expect(totalMap.get(d1)).toBe(13);
        expect(totalMap.get(d2)).toBe(19);
    });

    it('handles heating-only (no hot water sensor)', () => {
        const stats = {
            'sensor.heating': [
                { start: '2024-01-15T00:00:00Z', change: 10 },
            ],
        };
        const { heatingMap, totalMap, wwMap } = buildEnergyMaps(stats, 'sensor.heating', undefined);

        const d1 = new Date('2024-01-15T00:00:00Z').toDateString();
        expect(heatingMap.get(d1)).toBe(10);
        expect(totalMap.get(d1)).toBe(10);
        expect(wwMap.size).toBe(0);
    });

    it('handles hot-water-only (no heating sensor)', () => {
        const stats = {
            'sensor.hotwater': [
                { start: '2024-01-15T00:00:00Z', change: 5 },
            ],
        };
        const { heatingMap, totalMap, wwMap } = buildEnergyMaps(stats, undefined, 'sensor.hotwater');

        const d1 = new Date('2024-01-15T00:00:00Z').toDateString();
        expect(heatingMap.size).toBe(0);
        expect(totalMap.get(d1)).toBe(5);
        expect(wwMap.get(d1)).toBe(5);
    });

    it('aggregates multiple entries per day', () => {
        const stats = {
            'sensor.heating': [
                { start: '2024-01-15T00:00:00Z', change: 5 },
                { start: '2024-01-15T12:00:00Z', change: 7 },
            ],
        };
        const { heatingMap } = buildEnergyMaps(stats, 'sensor.heating', undefined);
        const d1 = new Date('2024-01-15T00:00:00Z').toDateString();
        expect(heatingMap.get(d1)).toBe(12);
    });

    it('clamps negative daily deltas to zero', () => {
        const stats = {
            'sensor.heating': [
                { start: '2024-01-15T00:00:00Z', change: -5 },
                { start: '2024-01-15T12:00:00Z', change: 7 },
            ],
            'sensor.hotwater': [
                { start: '2024-01-15T00:00:00Z', change: -2 },
                { start: '2024-01-15T12:00:00Z', change: 3 },
            ],
        };
        const { heatingMap, totalMap, wwMap } = buildEnergyMaps(stats, 'sensor.heating', 'sensor.hotwater');
        const d1 = new Date('2024-01-15T00:00:00Z').toDateString();

        expect(heatingMap.get(d1)).toBe(7);
        expect(wwMap.get(d1)).toBe(3);
        expect(totalMap.get(d1)).toBe(10);
    });
});

// ─── buildTempMap ────────────────────────────────────────────────────────────

describe('buildTempMap', () => {
    it('builds a map from mean temperature values', () => {
        const stats = {
            'sensor.temp': [
                { start: '2024-01-15T00:00:00Z', mean: 5.5 },
                { start: '2024-01-16T00:00:00Z', mean: -2.0 },
            ],
        };
        const map = buildTempMap(stats, 'sensor.temp');
        const d1 = new Date('2024-01-15T00:00:00Z').toDateString();
        const d2 = new Date('2024-01-16T00:00:00Z').toDateString();
        expect(map.get(d1)).toBe(5.5);
        expect(map.get(d2)).toBe(-2.0);
    });

    it('returns empty map when sensor is missing', () => {
        const map = buildTempMap({}, 'sensor.temp');
        expect(map.size).toBe(0);
    });
});

// ─── buildRawPoints ──────────────────────────────────────────────────────────

describe('buildRawPoints', () => {
    it('builds HDD-based scatter points', () => {
        const energyMap = new Map<string, number>();
        const tempMap = new Map<string, number>();
        const d1 = new Date('2024-01-15T00:00:00Z').toDateString();
        energyMap.set(d1, 20);
        tempMap.set(d1, 5);

        const points = buildRawPoints(energyMap, tempMap, 15, null, false);
        expect(points).toHaveLength(1);
        expect(points[0].x).toBe(10); // HDD = 15 - 5
        expect(points[0].y).toBe(20);
        expect(points[0].isYesterday).toBe(false);
    });

    it('clamps HDD to zero for warm days', () => {
        const energyMap = new Map<string, number>();
        const tempMap = new Map<string, number>();
        const d1 = new Date('2024-01-15T00:00:00Z').toDateString();
        energyMap.set(d1, 5);
        tempMap.set(d1, 20); // Above heating limit

        const points = buildRawPoints(energyMap, tempMap, 15, null, false);
        expect(points[0].x).toBe(0); // HDD clamped to 0
    });

    it('skips dates without temperature data', () => {
        const energyMap = new Map<string, number>();
        const tempMap = new Map<string, number>();
        const d1 = new Date('2024-01-15T00:00:00Z').toDateString();
        energyMap.set(d1, 20);
        // No temp for d1

        const points = buildRawPoints(energyMap, tempMap, 15, null, false);
        expect(points).toHaveLength(0);
    });

    it('respects filterStart', () => {
        const energyMap = new Map<string, number>();
        const tempMap = new Map<string, number>();
        const d1 = new Date('2024-01-01T00:00:00Z').toDateString();
        const d2 = new Date('2024-01-20T00:00:00Z').toDateString();
        energyMap.set(d1, 10);
        energyMap.set(d2, 20);
        tempMap.set(d1, 5);
        tempMap.set(d2, 5);

        const filterStart = new Date('2024-01-15T00:00:00Z');
        const points = buildRawPoints(energyMap, tempMap, 15, filterStart, false);
        expect(points).toHaveLength(1);
        expect(points[0].y).toBe(20); // Only the point after filterStart
    });

    it('can exclude non-heating days with HDD = 0', () => {
        const energyMap = new Map<string, number>();
        const tempMap = new Map<string, number>();
        const warmDay = new Date('2024-06-15T00:00:00Z').toDateString();
        const coldDay = new Date('2024-01-15T00:00:00Z').toDateString();
        energyMap.set(warmDay, 2);
        energyMap.set(coldDay, 20);
        tempMap.set(warmDay, 18); // HDD = 0
        tempMap.set(coldDay, 5);  // HDD = 10

        const points = buildRawPoints(energyMap, tempMap, 15, null, false, true);
        expect(points).toHaveLength(1);
        expect(points[0].x).toBe(10);
        expect(points[0].y).toBe(20);
    });
});

// ─── extractYesterday ────────────────────────────────────────────────────────

describe('extractYesterday', () => {
    it('separates yesterday from regular points', () => {
        const raw: RawPoint[] = [
            { x: 5, y: 10, dateStr: '2024-01-14', isYesterday: false },
            { x: 8, y: 20, dateStr: '2024-01-15', isYesterday: true },
            { x: 3, y: 7, dateStr: '2024-01-13', isYesterday: false },
        ];
        const result = extractYesterday(raw);
        expect(result.points).toHaveLength(2);
        expect(result.yesterdayPoint).toEqual({ x: 8, y: 20 });
        expect(result.yesterdayMeta).not.toBeNull();
        expect(result.yesterdayMeta!.energy).toBe(20);
        expect(result.yesterdayMeta!.hdd).toBe(8);
    });

    it('returns null yesterday when none flagged', () => {
        const raw: RawPoint[] = [
            { x: 5, y: 10, dateStr: '2024-01-14', isYesterday: false },
        ];
        const result = extractYesterday(raw);
        expect(result.yesterdayPoint).toBeNull();
        expect(result.points).toHaveLength(1);
    });

    it('calculates efficiency correctly', () => {
        const raw: RawPoint[] = [
            { x: 10, y: 30, dateStr: '2024-01-15', isYesterday: true },
        ];
        const result = extractYesterday(raw);
        expect(result.yesterdayMeta!.efficiency).toBeCloseTo(3.0);
    });

    it('handles zero HDD for efficiency calculation', () => {
        const raw: RawPoint[] = [
            { x: 0, y: 5, dateStr: '2024-01-15', isYesterday: true },
        ];
        const result = extractYesterday(raw);
        expect(result.yesterdayMeta!.efficiency).toBe(0);
    });
});

// ─── processInsightSeries ────────────────────────────────────────────────────

describe('processInsightSeries', () => {
    // Create mock stats for 10 days of data
    function createMockStats(days: number = 10) {
        const heatingData: any[] = [];
        const tempData: any[] = [];

        for (let i = 0; i < days; i++) {
            const date = new Date(2024, 0, i + 1); // Jan 1..N, 2024
            const temp = 15 - i * 1.5; // Temperature drops: 15, 13.5, 12, ...
            const hdd = Math.max(0, 15 - temp);
            const energy = 2 * hdd + 3; // Perfect linear: y = 2x + 3

            heatingData.push({ start: date.toISOString(), change: energy });
            tempData.push({ start: date.toISOString(), mean: temp });
        }

        return {
            'sensor.heating': heatingData,
            'sensor.temp': tempData
        };
    }

    it('returns null when temperature sensor is missing', () => {
        const result = processInsightSeries({
            stats: { 'sensor.heating': [{ start: '2024-01-01', change: 10 }] },
            heatingId: 'sensor.heating',
            hotwaterId: undefined,
            tempId: 'sensor.temp',
            heatingLimit: 15,
            identifyYesterday: false,
            filterStart: null
        });
        expect(result).toBeNull();
    });

    it('returns null when no energy sensor is present', () => {
        const result = processInsightSeries({
            stats: { 'sensor.temp': [{ start: '2024-01-01', mean: 5 }] },
            heatingId: 'sensor.heating',
            hotwaterId: undefined,
            tempId: 'sensor.temp',
            heatingLimit: 15,
            identifyYesterday: false,
            filterStart: null
        });
        expect(result).toBeNull();
    });

    it('processes valid data and returns correct regression', () => {
        const stats = createMockStats(10);
        const result = processInsightSeries({
            stats,
            heatingId: 'sensor.heating',
            hotwaterId: undefined,
            tempId: 'sensor.temp',
            heatingLimit: 15,
            identifyYesterday: false,
            filterStart: null
        });

        expect(result).not.toBeNull();
        expect(result!.m).toBeCloseTo(2.0, 1);
        expect(result!.r2).toBeGreaterThan(0.9);
        expect(result!.points.length).toBeGreaterThan(0);
    });

    it('returns valid line points', () => {
        const stats = createMockStats(10);
        const result = processInsightSeries({
            stats,
            heatingId: 'sensor.heating',
            hotwaterId: undefined,
            tempId: 'sensor.temp',
            heatingLimit: 15,
            identifyYesterday: false,
            filterStart: null
        });

        expect(result).not.toBeNull();
        expect(result!.linePoints).toHaveLength(2);
        expect(result!.linePoints[0].y).toBeGreaterThanOrEqual(0); // Clipped
    });

    it('computes wwBaseLoad from hot water sensor', () => {
        const stats = {
            'sensor.heating': [
                { start: '2024-01-15T00:00:00Z', change: 20 },
                { start: '2024-01-16T00:00:00Z', change: 25 },
                { start: '2024-01-17T00:00:00Z', change: 30 },
            ],
            'sensor.hotwater': [
                { start: '2024-01-15T00:00:00Z', change: 3 },
                { start: '2024-01-16T00:00:00Z', change: 5 },
                { start: '2024-01-17T00:00:00Z', change: 4 },
            ],
            'sensor.temp': [
                { start: '2024-01-15T00:00:00Z', mean: 5 },
                { start: '2024-01-16T00:00:00Z', mean: 3 },
                { start: '2024-01-17T00:00:00Z', mean: 0 },
            ],
        };

        const result = processInsightSeries({
            stats,
            heatingId: 'sensor.heating',
            hotwaterId: 'sensor.hotwater',
            tempId: 'sensor.temp',
            heatingLimit: 15,
            identifyYesterday: false,
            filterStart: null
        });

        expect(result).not.toBeNull();
        expect(result!.wwBaseLoad).toBeCloseTo(4.0); // mean(3, 5, 4) = 4
        // In split mode, the displayed model uses the measured WW base as intercept.
        expect(result!.b).toBeCloseTo(4.0, 6);
        expect(result!.linePoints[0].x).toBe(0);
        expect(result!.linePoints[0].y).toBeCloseTo(4.0, 6);
        // Display points are total consumption (heating + WW).
        expect(result!.points[0].y).toBeGreaterThanOrEqual(23);
    });
});
