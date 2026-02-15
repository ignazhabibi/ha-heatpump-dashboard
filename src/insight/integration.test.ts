import { describe, it, expect } from 'vitest';
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
import { FIXTURE_NOW, insightStats365 } from './test-fixtures';

describe('Data Loading (365 days window)', () => {
    it('has sufficient hourly data points', () => {
        const heatingHours = insightStats365['sensor.heating'].length;
        console.log(`  Heating hours: ${heatingHours}`);
        expect(heatingHours).toBeGreaterThan(8000);
    });
});

describe('Standard Year Analysis (synthetic baseline)', () => {
    const { heatingMap } = buildEnergyMaps(insightStats365, 'sensor.heating', 'sensor.hotwater');
    const tempMap = buildTempMap(insightStats365, 'sensor.temp');

    const todayStr = FIXTURE_NOW.toDateString();
    heatingMap.delete(todayStr);

    const rawPoints = buildRawPoints(heatingMap, tempMap, 15, null, false);
    const { clean, removedDates } = filterOutliersByResidual(rawPoints);
    extractYesterday(clean);

    const result = processInsightSeries({
        stats: insightStats365,
        heatingId: 'sensor.heating',
        hotwaterId: 'sensor.hotwater',
        tempId: 'sensor.temp',
        heatingLimit: 15,
        identifyYesterday: false,
        filterStart: null
    });

    it('returns valid result', () => {
        expect(result).not.toBeNull();
    });

    if (!result) return;

    it('Outlier Filter: removes < 15% of days', () => {
        const pct = (removedDates.length / rawPoints.length) * 100;
        console.log(`  Raw days: ${rawPoints.length}`);
        console.log(`  Outliers: ${removedDates.length} (${pct.toFixed(1)}%)`);
        expect(pct).toBeLessThan(15);
    });

    it('Regression: valid slope and fit', () => {
        console.log(`  Slope:    ${result.m.toFixed(3)} kWh/HDD`);
        console.log(`  R²:       ${result.r2.toFixed(4)}`);

        expect(result.m).toBeGreaterThan(0.5);
        expect(result.m).toBeLessThan(6);
        expect(result.r2).toBeGreaterThan(0.5);
    });

    it('Energy: plausible annual values', () => {
        console.log(`  Annual Heating (Reg): ${result.annualHeatingElecKwh.toFixed(0)} kWh`);
        expect(result.annualHeatingElecKwh).toBeGreaterThan(2000);
        expect(result.annualHeatingElecKwh).toBeLessThan(18000);

        const annualTotal = result.totalElecPeriod * (365.25 / result.totalDaysPeriod);
        console.log(`  Annual Total (Real):  ${annualTotal.toFixed(0)} kWh`);
        expect(annualTotal).toBeGreaterThan(3000);
        expect(annualTotal).toBeLessThan(25000);
    });

    it('DHW: plausible base load', () => {
        console.log(`  WW Base Load: ${result.wwBaseLoad.toFixed(2)} kWh/day`);
        expect(result.wwBaseLoad).toBeGreaterThan(2);
        expect(result.wwBaseLoad).toBeLessThan(10);
    });

    const dim = computeDimensioning({
        m: result.m,
        b: result.b,
        totalElecPeriod: result.totalElecPeriod,
        totalDaysPeriod: result.totalDaysPeriod,
        annualHeatingElecKwh: result.annualHeatingElecKwh,
        wwBaseLoad: result.wwBaseLoad,
        avgPowerForHeating: result.avgPowerForHeating,
        jaz: 3.8,
        jazSource: 'fixed',
        copCold: 2.7,
        area: 250,
        electricityPrice: 0.30
    });

    it('Dimensioning: Energy Index plausible', () => {
        console.log(`  Energy Index:       ${dim.energyIndex.toFixed(1)} kWh/(m²a)`);
        expect(dim.energyIndex).toBeGreaterThan(40);
        expect(dim.energyIndex).toBeLessThan(180);
    });

    it('Dimensioning: Peak Power plausible', () => {
        console.log(`  Peak Power @-10°C:  ${dim.peakElectricalPower.toFixed(2)} kW`);
        expect(dim.peakElectricalPower).toBeGreaterThan(1);
        expect(dim.peakElectricalPower).toBeLessThan(15);
    });

    it('Dimensioning: Specific Heat Load', () => {
        console.log(`  Spec. Heat Load:    ${dim.specificHeatLoad.toFixed(1)} W/m²`);
        expect(dim.specificHeatLoad).toBeGreaterThan(10);
        expect(dim.specificHeatLoad).toBeLessThan(120);
    });

    it('Dimensioning: Cost Index', () => {
        console.log(`  Cost Index:         ${dim.costIndex.toFixed(2)} €/(m²a)`);
        expect(dim.costIndex).toBeLessThan(40);
    });
});
