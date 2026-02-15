import { RecorderStatisticPoint, RecorderStatisticsResult } from '../shared/utils/ha-statistics';

const HEATING_LIMIT = 15;
const HEATING_SENSOR = 'sensor.heating';
const HOTWATER_SENSOR = 'sensor.hotwater';
const TEMP_SENSOR = 'sensor.temp';

export const FIXTURE_NOW = new Date('2026-02-13T12:00:00Z');

function createRng(seed: number): () => number {
    let state = seed >>> 0;
    return () => {
        state = (1664525 * state + 1013904223) >>> 0;
        return state / 0x100000000;
    };
}

function randomNormal(rng: () => number, mean: number = 0, stdDev: number = 1): number {
    const u1 = Math.max(rng(), 1e-9);
    const u2 = Math.max(rng(), 1e-9);
    const mag = Math.sqrt(-2 * Math.log(u1));
    const z0 = mag * Math.cos(2 * Math.PI * u2);
    return mean + z0 * stdDev;
}

function dayOfYear(date: Date): number {
    const yearStart = Date.UTC(date.getUTCFullYear(), 0, 1);
    return Math.floor((date.getTime() - yearStart) / 86400000) + 1;
}

function normalized(values: number[]): number[] {
    const sum = values.reduce((acc, value) => acc + value, 0);
    return values.map(value => value / sum);
}

const heatingHourlyWeights = normalized([
    1.25, 1.20, 1.15, 1.10, 1.05, 1.05,
    1.20, 1.40, 1.35, 1.20, 1.00, 0.95,
    0.90, 0.88, 0.90, 0.95, 1.05, 1.15,
    1.25, 1.35, 1.40, 1.35, 1.30, 1.28
]);

const dhwHourlyWeights = normalized([
    0.80, 0.75, 0.72, 0.72, 0.76, 0.90,
    1.35, 1.45, 1.00, 0.80, 0.72, 0.74,
    0.78, 0.82, 0.88, 0.95, 1.05, 1.20,
    1.35, 1.45, 1.25, 1.00, 0.90, 0.85
]);

function generateSyntheticStatistics(start: Date, end: Date, seed: number): RecorderStatisticsResult {
    const rng = createRng(seed);
    const heatingStats: RecorderStatisticPoint[] = [];
    const hotwaterStats: RecorderStatisticPoint[] = [];
    const temperatureStats: RecorderStatisticPoint[] = [];

    const dayCursor = new Date(start);
    dayCursor.setUTCHours(0, 0, 0, 0);

    while (dayCursor <= end) {
        const doy = dayOfYear(dayCursor);
        const seasonal = 9 + 11 * Math.sin((2 * Math.PI * (doy - 40)) / 365.25);
        const tempMean = seasonal + randomNormal(rng, 0, 1.3);

        const hdd = Math.max(0, HEATING_LIMIT - tempMean);
        let heatingDayKwh = Math.max(0, 1.9 * hdd + randomNormal(rng, 0, 1.0));
        let dhwDayKwh = Math.max(2.5, 4.8 + randomNormal(rng, 0, 0.35));

        if (rng() < 0.012) heatingDayKwh *= 1.8;
        if (rng() < 0.006) dhwDayKwh *= 1.45;

        for (let hour = 0; hour < 24; hour++) {
            const timestamp = new Date(Date.UTC(
                dayCursor.getUTCFullYear(),
                dayCursor.getUTCMonth(),
                dayCursor.getUTCDate(),
                hour,
                0,
                0
            ));

            const heatingNoise = 1 + randomNormal(rng, 0, 0.06);
            const dhwNoise = 1 + randomNormal(rng, 0, 0.08);

            heatingStats.push({
                start: timestamp.toISOString(),
                change: Math.max(0, heatingDayKwh * heatingHourlyWeights[hour] * heatingNoise)
            });

            hotwaterStats.push({
                start: timestamp.toISOString(),
                change: Math.max(0, dhwDayKwh * dhwHourlyWeights[hour] * dhwNoise)
            });
        }

        const tempTimestamp = new Date(Date.UTC(
            dayCursor.getUTCFullYear(),
            dayCursor.getUTCMonth(),
            dayCursor.getUTCDate(),
            12,
            0,
            0
        ));
        temperatureStats.push({ start: tempTimestamp.toISOString(), mean: tempMean });

        dayCursor.setUTCDate(dayCursor.getUTCDate() + 1);
    }

    return {
        [HEATING_SENSOR]: heatingStats,
        [HOTWATER_SENSOR]: hotwaterStats,
        [TEMP_SENSOR]: temperatureStats
    };
}

function filterStatsToWindow(
    data: RecorderStatisticPoint[],
    startDate: Date,
    endDate: Date
): RecorderStatisticPoint[] {
    const startMs = startDate.getTime();
    const endMs = endDate.getTime();
    return data.filter((entry) => {
        const ms = new Date(entry.start).getTime();
        return ms >= startMs && ms <= endMs;
    });
}

const longtermStart = new Date('2024-01-01T00:00:00Z');
const syntheticStats = generateSyntheticStatistics(longtermStart, FIXTURE_NOW, 42377);

const oneYearAgo = new Date(FIXTURE_NOW);
oneYearAgo.setUTCDate(FIXTURE_NOW.getUTCDate() - 365);

export const insightStatsLongterm: RecorderStatisticsResult = syntheticStats;

export const insightStats365: RecorderStatisticsResult = {
    [HEATING_SENSOR]: filterStatsToWindow(syntheticStats[HEATING_SENSOR], oneYearAgo, FIXTURE_NOW),
    [HOTWATER_SENSOR]: filterStatsToWindow(syntheticStats[HOTWATER_SENSOR], oneYearAgo, FIXTURE_NOW),
    [TEMP_SENSOR]: filterStatsToWindow(syntheticStats[TEMP_SENSOR], oneYearAgo, FIXTURE_NOW)
};
