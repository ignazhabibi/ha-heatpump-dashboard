/**
 * Integration test: feed REAL heat pump data through the processor pipeline.
 * Validates that all calculations produce physically plausible results.
 * 
 * MATCHES REAL CARD BEHAVIOR:
 * - Pre-filters stats to last 365 days (like HA API)
 * - Computes outlier filtering explicitly to verify data quality
 * - Uses user's actual house parameters (250m², JAZ 3.8)
 */
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import {
    processInsightSeries,
    buildEnergyMaps,
    buildTempMap,
    buildRawPoints,
    extractYesterday
} from './processor';
import {
    computeDimensioning,
    filterOutliersByResidual
} from './math';

// ─── CSV Parsers ─────────────────────────────────────────────────────────────

/**
 * Parse energy CSV from HA database export.
 *
 * CSV columns: datetime, state, sum
 *   - state = daily running total (resets at midnight) — NOT usable for deltas
 *   - sum   = cumulative all-time total (never resets)
 *
 * We derive HA's `change` (hourly delta) from consecutive `sum` differences.
 */
function parseEnergyCsv(filepath: string): Array<{ start: string; change: number }> {
    const raw = fs.readFileSync(filepath, 'utf-8');
    const lines = raw.split(/\r?\n/).filter(l => l.trim() && !l.startsWith('"'));

    const rows = lines.map(line => {
        const parts = line.split(',');
        return { start: parts[0].trim(), sum: parseFloat(parts[2]) };
    }).filter(e => !isNaN(e.sum));

    // Reverse to chronological order (oldest first)
    rows.reverse();

    // Compute hourly change as delta between consecutive sum values
    const result: Array<{ start: string; change: number }> = [];
    for (let i = 1; i < rows.length; i++) {
        const change = rows[i].sum - rows[i - 1].sum;
        // Skip negative/zero and absurd spikes (sensor errors)
        if (change >= 0 && change < 50) {
            result.push({ start: rows[i].start, change });
        }
    }
    return result;
}

function parseTempCsv(filepath: string): Array<{ start: string; mean: number }> {
    const raw = fs.readFileSync(filepath, 'utf-8');
    const lines = raw.split(/\r?\n/).filter(l => l.trim() && !l.startsWith('Zeit'));
    return lines.map(line => {
        const [datetime, avg] = line.split(',');
        return { start: datetime.trim(), mean: parseFloat(avg) };
    }).filter(e => !isNaN(e.mean));
}

// ─── Load & Pre-filter Data (365 Days) ───────────────────────────────────────

const dataDir = path.resolve(__dirname, '../../test-data');
const allHeatingData = parseEnergyCsv(path.join(dataDir, 'consumption_heating.csv'));
const allDhwData = parseEnergyCsv(path.join(dataDir, 'consumption_dhw.csv'));
const allTempData = parseTempCsv(path.join(dataDir, 'outside_temp.csv'));

// Fixed "now" timestamp for reproducible tests (latest data in CSV is Feb 2026)
const now = new Date('2026-02-13T12:00:00');
const oneYearAgo = new Date(now);
oneYearAgo.setDate(now.getDate() - 365);

/**
 * Filter stats to a time window, matching what the HA API returns.
 */
function filterStatsToWindow(
    data: Array<{ start: string;[key: string]: any }>,
    startDate: Date,
    endDate: Date
): any[] {
    const startMs = startDate.getTime();
    const endMs = endDate.getTime();
    return data.filter(d => {
        const ms = new Date(d.start).getTime();
        return ms >= startMs && ms <= endMs;
    });
}

const stats365: any = {
    'sensor.heating': filterStatsToWindow(allHeatingData, oneYearAgo, now),
    'sensor.hotwater': filterStatsToWindow(allDhwData, oneYearAgo, now),
    'sensor.temp': filterStatsToWindow(allTempData, oneYearAgo, now)
};

// ─── Data sanity checks ──────────────────────────────────────────────────────

describe('Data Loading (365 days window)', () => {
    it('has sufficient hourly data points', () => {
        console.log(`  Heating hours: ${stats365['sensor.heating'].length}`);
        expect(stats365['sensor.heating'].length).toBeGreaterThan(8000); // ~365*24 = 8760
    });
});

// ─── Main Pipeline Test (Standard Year View) ─────────────────────────────────

describe('Standard Year Analysis (matching HA Card)', () => {

    // 1. Manually run pipeline steps to inspect intermediate data (Outliers, etc.)
    const { heatingMap } = buildEnergyMaps(stats365, 'sensor.heating', 'sensor.hotwater');
    const tempMap = buildTempMap(stats365, 'sensor.temp');

    // Remove "today" (incomplete)
    const todayStr = now.toDateString();
    heatingMap.delete(todayStr);

    const rawPoints = buildRawPoints(heatingMap, tempMap, 15, null, false);
    const { clean, removedDates } = filterOutliersByResidual(rawPoints);
    extractYesterday(clean);

    // 2. Run the actual processor (black box check)
    const result = processInsightSeries({
        stats: stats365,
        heatingId: 'sensor.heating',
        hotwaterId: 'sensor.hotwater',
        tempId: 'sensor.temp',
        heatingLimit: 15,
        identifyYesterday: false,
        filterStart: null // Uses standard 365d window from stats
    });

    it('returns valid result', () => {
        expect(result).not.toBeNull();
    });

    if (!result) return;

    it('Outlier Filter: removes < 15% of days', () => {
        const pct = (removedDates.length / rawPoints.length) * 100;
        console.log(`  Raw days: ${rawPoints.length}`);
        console.log(`  Outliers: ${removedDates.length} (${pct.toFixed(1)}%)`);
        if (removedDates.length > 0) {
            console.log(`  Removed:  ${removedDates.slice(0, 5).join(', ')}...`);
        }
        expect(pct).toBeLessThan(15);
    });

    it('Regression: valid slope and fit', () => {
        console.log(`  Slope:    ${result.m.toFixed(3)} kWh/HDD`);
        console.log(`  R²:       ${result.r2.toFixed(4)}`);

        expect(result.m).toBeGreaterThan(0.5);
        expect(result.m).toBeLessThan(10);
        expect(result.r2).toBeGreaterThan(0.5); // Should be high for 1 year
    });

    it('Energy: plausible annual values', () => {
        // Annual heating (regression-based)
        console.log(`  Annual Heating (Reg): ${result.annualHeatingElecKwh.toFixed(0)} kWh`);
        expect(result.annualHeatingElecKwh).toBeGreaterThan(1000);
        expect(result.annualHeatingElecKwh).toBeLessThan(25000);

        // Annual total (scaled from actuals)
        const annualTotal = result.totalElecPeriod * (365.25 / result.totalDaysPeriod);
        console.log(`  Annual Total (Real):  ${annualTotal.toFixed(0)} kWh`);
        expect(annualTotal).toBeGreaterThan(2000);
        expect(annualTotal).toBeLessThan(30000);
    });

    it('DHW: plausible base load', () => {
        console.log(`  WW Base Load: ${result.wwBaseLoad.toFixed(2)} kWh/day`);
        expect(result.wwBaseLoad).toBeGreaterThan(1);
        expect(result.wwBaseLoad).toBeLessThan(20);
    });

    // ─── Dimensioning (User's House: 250m², JAZ 3.8) ─────────────────────────

    const dim = computeDimensioning({
        m: result.m,
        b: result.b,
        totalElecPeriod: result.totalElecPeriod,
        totalDaysPeriod: result.totalDaysPeriod,
        annualHeatingElecKwh: result.annualHeatingElecKwh,
        wwBaseLoad: result.wwBaseLoad,
        avgPowerForHeating: result.avgPowerForHeating,
        jaz: 3.8,              // User's JAZ
        jazSource: 'fixed',
        copCold: 2.7,          // User's COP@-10
        area: 250,             // User's Area
        electricityPrice: 0.30
    });

    it('Dimensioning: Energy Index matches expectation (~70-90)', () => {
        console.log(`  Energy Index:       ${dim.energyIndex.toFixed(1)} kWh/(m²a)`);
        expect(dim.energyIndex).toBeGreaterThan(50);
        expect(dim.energyIndex).toBeLessThan(120);
    });

    it('Dimensioning: Peak Power plausible', () => {
        console.log(`  Peak Power @-10°C:  ${dim.peakElectricalPower.toFixed(2)} kW`);
        expect(dim.peakElectricalPower).toBeGreaterThan(1);
        expect(dim.peakElectricalPower).toBeLessThan(15);
    });

    it('Dimensioning: Specific Heat Load', () => {
        console.log(`  Spec. Heat Load:    ${dim.specificHeatLoad.toFixed(1)} W/m²`);
        expect(dim.specificHeatLoad).toBeGreaterThan(10);
        expect(dim.specificHeatLoad).toBeLessThan(100);
    });

    it('Dimensioning: Cost Index', () => {
        console.log(`  Cost Index:         ${dim.costIndex.toFixed(2)} €/(m²a)`);
        expect(dim.costIndex).toBeLessThan(25);
    });
});
