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

    const preferredPeriod = prefersHighResolutionStatistics(viewMode) ? '5minute' : period;
    const preferredStats = await fetchStats(preferredPeriod);

    if (preferredPeriod !== '5minute' || hasRecorderStatisticsPoints(preferredStats, statisticIds)) {
        return { stats: preferredStats, period: preferredPeriod };
    }

    const fallbackStats = await fetchStats('hour');
    return { stats: fallbackStats, period: 'hour' };
}
