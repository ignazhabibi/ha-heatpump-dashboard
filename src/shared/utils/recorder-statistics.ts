import type { HomeAssistant } from 'custom-card-helpers';
import type { ViewMode } from './date-helpers';
import type { RecorderStatisticsResult } from './ha-statistics';

export type RecorderStatisticsPeriod = '5minute' | 'hour' | 'day' | 'month';
export type RecorderStatisticsType = 'mean' | 'sum' | 'change';

export interface LoadRecorderStatisticsOptions {
    hass: HomeAssistant;
    start: Date;
    end: Date;
    statisticIds: string[];
    period: RecorderStatisticsPeriod;
    types: RecorderStatisticsType[];
    viewMode: ViewMode;
}

export interface LoadRecorderStatisticsResult {
    stats: RecorderStatisticsResult;
    period: RecorderStatisticsPeriod;
}

export function prefersHighResolutionStatistics(viewMode: ViewMode): boolean {
    return viewMode === '12h' || viewMode === 'day';
}

export function hasRecorderStatisticsPoints(
    stats: RecorderStatisticsResult,
    statisticIds: string[]
): boolean {
    return statisticIds.some((id) => (stats[id]?.length ?? 0) > 0);
}

export function countStatisticIdsWithPoints(
    stats: RecorderStatisticsResult,
    statisticIds: string[]
): number {
    return statisticIds.filter((id) => (stats[id]?.length ?? 0) > 0).length;
}

export function getPreferredStatisticsPeriods(
    viewMode: ViewMode,
    period: RecorderStatisticsPeriod
): RecorderStatisticsPeriod[] {
    if (prefersHighResolutionStatistics(viewMode)) {
        return ['5minute', 'hour'];
    }

    if (period === 'day') {
        return ['hour', 'day'];
    }

    if (period === 'month') {
        return ['day', 'month'];
    }

    return [period];
}

export function getBucketResolution(
    viewMode: ViewMode,
    period: RecorderStatisticsPeriod
): '5minute' | 'hour' | undefined {
    if (!prefersHighResolutionStatistics(viewMode)) return undefined;
    return period === '5minute' ? '5minute' : 'hour';
}

export async function loadRecorderStatistics({
    hass,
    start,
    end,
    statisticIds,
    period,
    types,
    viewMode
}: LoadRecorderStatisticsOptions): Promise<LoadRecorderStatisticsResult> {
    const fetchStats = async (requestedPeriod: RecorderStatisticsPeriod): Promise<RecorderStatisticsResult> => {
        return hass.callWS({
            type: 'recorder/statistics_during_period',
            start_time: start.toISOString(),
            end_time: end.toISOString(),
            statistic_ids: statisticIds,
            period: requestedPeriod,
            types
        }) as Promise<RecorderStatisticsResult>;
    };

    const preferredPeriods = getPreferredStatisticsPeriods(viewMode, period);
    let bestResult: LoadRecorderStatisticsResult | null = null;
    let bestCoverage = -1;

    for (const requestedPeriod of preferredPeriods) {
        const stats = await fetchStats(requestedPeriod);
        const coverage = countStatisticIdsWithPoints(stats, statisticIds);

        if (coverage > bestCoverage) {
            bestCoverage = coverage;
            bestResult = { stats, period: requestedPeriod };
        }

        if (coverage === statisticIds.length) {
            return { stats, period: requestedPeriod };
        }
    }

    if (bestResult) {
        return bestResult;
    }

    return { stats: {}, period };
}
