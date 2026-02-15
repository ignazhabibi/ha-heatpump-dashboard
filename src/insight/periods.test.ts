import { describe, it, expect } from 'vitest';
import {
    buildEnergyMaps,
    buildTempMap,
    buildRawPoints,
    extractYesterday,
} from './processor';
import { filterOutliersByResidual, computeRegression } from './math';
import { FIXTURE_NOW, insightStats365, insightStatsLongterm } from './test-fixtures';

interface PeriodDef {
    label: string;
    filterStart: Date | null;
    useLongtermData: boolean;
}

const periods: PeriodDef[] = [
    {
        label: 'Live optimization (14d)',
        filterStart: new Date(new Date(FIXTURE_NOW).setUTCDate(FIXTURE_NOW.getUTCDate() - 14)),
        useLongtermData: false
    },
    {
        label: 'Season check (30d)',
        filterStart: new Date(new Date(FIXTURE_NOW).setUTCDate(FIXTURE_NOW.getUTCDate() - 30)),
        useLongtermData: false
    },
    {
        label: 'YTD balance',
        filterStart: new Date(Date.UTC(FIXTURE_NOW.getUTCFullYear(), 0, 1)),
        useLongtermData: false
    },
    {
        label: 'Full year (365d)',
        filterStart: new Date(new Date(FIXTURE_NOW).setUTCDate(FIXTURE_NOW.getUTCDate() - 365)),
        useLongtermData: false
    },
    {
        label: 'Longterm',
        filterStart: null,
        useLongtermData: true
    }
];

describe('Period-specific validation', () => {
    const summaryRows: string[] = [];

    for (const period of periods) {
        describe(period.label, () => {
            const statsForPeriod = period.useLongtermData ? insightStatsLongterm : insightStats365;

            const { heatingMap, totalMap, wwMap } = buildEnergyMaps(
                statsForPeriod, 'sensor.heating', 'sensor.hotwater'
            );
            const tempMap = buildTempMap(statsForPeriod, 'sensor.temp');

            const todayStr = FIXTURE_NOW.toDateString();
            heatingMap.delete(todayStr);
            totalMap.delete(todayStr);
            wwMap.delete(todayStr);

            const rawPoints = buildRawPoints(
                heatingMap, tempMap, 15, period.filterStart, false
            );

            const { clean: cleanPoints, removedDates } = filterOutliersByResidual(rawPoints);
            const { points } = extractYesterday(cleanPoints);

            it('stats and outlier check', () => {
                const pctRemoved = rawPoints.length > 0
                    ? ((removedDates.length / rawPoints.length) * 100).toFixed(1)
                    : '0';

                console.log(`\n  -- ${period.label} --`);
                console.log(`  Raw points:    ${rawPoints.length}`);
                console.log(`  Outliers:      ${removedDates.length} (${pctRemoved}%)`);

                expect(rawPoints.length).toBeGreaterThan(0);
            });

            it('metrics validation', () => {
                if (points.length < 5) {
                    console.log(`  Skipping metrics check: too few points (${points.length})`);
                    summaryRows.push(
                        `  ${period.label.padEnd(22)}| ${String(points.length).padStart(4)} |    --   |    --   |   --   |   --  `
                    );
                    return;
                }

                const { m, b, r2 } = computeRegression(points);

                const heatingPts = points.filter(p => p.x > 0);
                const avgEff = heatingPts.length > 0
                    ? heatingPts.reduce((acc, p) => acc + p.y / p.x, 0) / heatingPts.length
                    : 0;

                console.log(`  Slope (m):     ${m.toFixed(3)} kWh/HDD`);
                console.log(`  Base load (b): ${b.toFixed(3)} kWh`);
                console.log(`  R²:            ${r2.toFixed(4)}`);
                console.log(`  Avg Eff:       ${avgEff.toFixed(2)} kWh/HDD`);

                summaryRows.push(
                    `  ${period.label.padEnd(22)}| ${String(points.length).padStart(4)} | ${m.toFixed(3).padStart(7)} | ${b.toFixed(2).padStart(7)} | ${r2.toFixed(4)} | ${avgEff.toFixed(2).padStart(5)}`
                );

                expect(m).toBeGreaterThan(0);
            });
        });
    }

    describe('Summary', () => {
        it('prints comparison table', () => {
            console.log('\n  ===============================================================');
            console.log('  PERIOD COMPARISON');
            console.log('  ===============================================================');
            console.log('  Period                 | Pts  | Slope   | Base    | R²     | Eff   ');
            console.log('  -----------------------|------|---------|---------|--------|-------');
            for (const row of summaryRows) {
                console.log(row);
            }
            console.log('  ===============================================================');
            expect(summaryRows.length).toBeGreaterThan(0);
        });
    });
});
