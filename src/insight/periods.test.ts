/**
 * Period-specific regression test.
 * Runs the pipeline for each scenario (optimizer, benchmark, balance, full_year, longterm)
 * matching the REAL card data fetching behavior:
 *   - "longterm": Fetches ALL available data (up to 5 years)
 *   - All others: Fetches last 365 days only
 * 
 * Verifies consistency and physical plausibility across these views.
 */
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import {
    buildEnergyMaps,
    buildTempMap,
    buildRawPoints,
    extractYesterday,
} from './processor';
import { filterOutliersByResidual, computeRegression } from './math';

// ─── CSV Parsers ─────────────────────────────────────────────────────────────

function parseEnergyCsv(filepath: string): Array<{ start: string; change: number }> {
    const raw = fs.readFileSync(filepath, 'utf-8');
    const lines = raw.split(/\r?\n/).filter(l => l.trim() && !l.startsWith('"'));
    const rows = lines.map(line => {
        const parts = line.split(',');
        return { start: parts[0].trim(), sum: parseFloat(parts[2]) };
    }).filter(e => !isNaN(e.sum));
    rows.reverse();
    const result: Array<{ start: string; change: number }> = [];
    for (let i = 1; i < rows.length; i++) {
        const change = rows[i].sum - rows[i - 1].sum;
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

// ─── Load & Pre-filter Data ──────────────────────────────────────────────────

const dataDir = path.resolve(__dirname, '../../test-data');
const allHeatingData = parseEnergyCsv(path.join(dataDir, 'consumption_heating.csv'));
const allDhwData = parseEnergyCsv(path.join(dataDir, 'consumption_dhw.csv'));
const allTempData = parseTempCsv(path.join(dataDir, 'outside_temp.csv'));

// Fixed "now" = latest data point (Feb 2026)
const now = new Date('2026-02-13T12:00:00');
const oneYearAgo = new Date(now);
oneYearAgo.setDate(now.getDate() - 365);

/**
 * Filter stats to a time window
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

// 1. Longterm Stats (All Data)
const statsLongterm: any = {
    'sensor.heating': allHeatingData,
    'sensor.hotwater': allDhwData,
    'sensor.temp': allTempData
};

// 2. Standard Stats (Last 365 Days) - Used for all other views
const stats365: any = {
    'sensor.heating': filterStatsToWindow(allHeatingData, oneYearAgo, now),
    'sensor.hotwater': filterStatsToWindow(allDhwData, oneYearAgo, now),
    'sensor.temp': filterStatsToWindow(allTempData, oneYearAgo, now)
};

// ─── Period Definitions ──────────────────────────────────────────────────────

interface PeriodDef {
    name: string;
    label: string;
    filterStart: Date | null;
    useLongtermData: boolean;
}

const periods: PeriodDef[] = [
    {
        name: 'optimizer',
        label: 'Live-Optimierung (14d)',
        filterStart: new Date(new Date(now).setDate(now.getDate() - 14)),
        useLongtermData: false
    },
    {
        name: 'benchmark',
        label: 'Saison-Check (30d)',
        filterStart: new Date(new Date(now).setDate(now.getDate() - 30)),
        useLongtermData: false
    },
    {
        name: 'balance',
        label: 'Jahresbilanz (YTD)',
        // Jan 1st of current year (2026)
        filterStart: new Date(now.getFullYear(), 0, 1),
        useLongtermData: false
    },
    {
        name: 'full_year',
        label: 'Volles Jahr (365d)',
        filterStart: new Date(new Date(now).setDate(now.getDate() - 365)),
        useLongtermData: false
    },
    {
        name: 'longterm',
        label: 'Langzeit (alle Daten)',
        filterStart: null,
        useLongtermData: true // Key difference!
    }
];

// ─── Detailed per-period analysis ────────────────────────────────────────────

describe('Period-specific validation (matches Real Card)', () => {

    const summaryRows: string[] = [];

    for (const period of periods) {
        describe(period.label, () => {

            const statsForPeriod = period.useLongtermData ? statsLongterm : stats365;

            // Step 1: Build maps
            const { heatingMap, totalMap, wwMap } = buildEnergyMaps(
                statsForPeriod, 'sensor.heating', 'sensor.hotwater'
            );
            const tempMap = buildTempMap(statsForPeriod, 'sensor.temp');

            // Remove today
            const todayStr = now.toDateString();
            heatingMap.delete(todayStr);
            totalMap.delete(todayStr);
            wwMap.delete(todayStr);

            // Step 2: Build raw points with filterStart
            const rawPoints = buildRawPoints(
                heatingMap, tempMap, 15, period.filterStart, false
            );

            // Step 3: Outlier filter
            const { clean: cleanPoints, removedDates } = filterOutliersByResidual(rawPoints);

            const { points } = extractYesterday(cleanPoints);

            it('stats and outlier check', () => {
                const pctRemoved = rawPoints.length > 0
                    ? ((removedDates.length / rawPoints.length) * 100).toFixed(1)
                    : '0';

                console.log(`\n  ── ${period.label} ──`);
                console.log(`  Raw points:    ${rawPoints.length}`);
                console.log(`  Outliers:      ${removedDates.length} (${pctRemoved}%)`);

                if (removedDates.length > 0) {
                    console.log(`  Removed:       ${removedDates.slice(0, 3).join(', ')}...`);
                }

                // Should have some data
                expect(rawPoints.length).toBeGreaterThan(0);
            });

            it('metrics validation', () => {
                // Short periods might have too few points for regression
                if (points.length < 5) {
                    console.log(`  ⚠️  Skipping metrics check: too few points (${points.length})`);
                    summaryRows.push(
                        `  ${period.label.padEnd(24)}| ${String(points.length).padStart(4)} |    --   |    --   |   --   |   --  `
                    );
                    return;
                }

                const { m, b, r2 } = computeRegression(points);

                // Avg efficiency
                const heatingPts = points.filter(p => p.x > 0);
                const avgEff = heatingPts.length > 0
                    ? heatingPts.reduce((a, p) => a + p.y / p.x, 0) / heatingPts.length
                    : 0;

                console.log(`  Slope (m):     ${m.toFixed(3)} kWh/HDD`);
                console.log(`  Base load (b): ${b.toFixed(3)} kWh`);
                console.log(`  R²:            ${r2.toFixed(4)}`);
                console.log(`  Avg Eff:       ${avgEff.toFixed(2)} kWh/HDD`);

                summaryRows.push(
                    `  ${period.label.padEnd(24)}| ${String(points.length).padStart(4)} | ${m.toFixed(3).padStart(7)} | ${b.toFixed(2).padStart(7)} | ${r2.toFixed(4)} | ${avgEff.toFixed(2).padStart(5)}`
                );

                expect(m).toBeGreaterThan(0);
            });
        });
    }

    // ─── Summary ─────────────────────────────────────────────────────────────

    describe('Summary', () => {
        it('output comparison table', () => {
            console.log('\n  ════════════════════════════════════════════════════════════════');
            console.log('  PERIOD COMPARISON');
            console.log('  ════════════════════════════════════════════════════════════════');
            console.log('  Period                  | Pts  | Slope   | Base    | R²     | Eff   ');
            console.log('  ────────────────────────|------|---------|---------|--------|-------');
            for (const row of summaryRows) {
                console.log(row);
            }
            console.log('  ════════════════════════════════════════════════════════════════');
            expect(summaryRows.length).toBeGreaterThan(0);
        });
    });
});
