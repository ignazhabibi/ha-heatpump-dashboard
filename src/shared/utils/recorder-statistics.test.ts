import type { HomeAssistant } from 'custom-card-helpers';
import { describe, expect, it, vi } from 'vitest';
import type { RecorderStatisticsResult } from './ha-statistics';
import {
    countStatisticIdsWithPoints,
    getBucketResolution,
    getPreferredStatisticsPeriods,
    hasRecorderStatisticsPoints,
    loadRecorderStatistics
} from './recorder-statistics';

describe('recorder-statistics utils', () => {
    it('detects whether any requested statistic contains points', () => {
        const stats: RecorderStatisticsResult = {
            'sensor.flow': [],
            'sensor.return': [{ start: '2026-03-20T10:00:00Z', mean: 31.5 }]
        };

        expect(hasRecorderStatisticsPoints(stats, ['sensor.flow', 'sensor.return'])).toBe(true);
        expect(hasRecorderStatisticsPoints(stats, ['sensor.flow'])).toBe(false);
        expect(countStatisticIdsWithPoints(stats, ['sensor.flow', 'sensor.return'])).toBe(1);
    });

    it('uses finer long-term periods before falling back to coarser ones', () => {
        expect(getPreferredStatisticsPeriods('day', 'hour')).toEqual(['5minute', 'hour']);
        expect(getPreferredStatisticsPeriods('month', 'day')).toEqual(['hour', 'day']);
        expect(getPreferredStatisticsPeriods('year', 'month')).toEqual(['day', 'month']);
        expect(getPreferredStatisticsPeriods('total', 'month')).toEqual(['day', 'month']);
    });

    it('keeps 5-minute resolution when detailed stats are available', async () => {
        const callWS = vi.fn().mockResolvedValue({
            'sensor.flow': [{ start: '2026-03-20T10:00:00Z', mean: 31.5 }]
        } satisfies RecorderStatisticsResult);
        const hass = { callWS } as unknown as HomeAssistant;

        const result = await loadRecorderStatistics({
            hass,
            start: new Date('2026-03-20T00:00:00Z'),
            end: new Date('2026-03-20T23:59:59Z'),
            statisticIds: ['sensor.flow'],
            period: 'hour',
            types: ['mean'],
            viewMode: 'day'
        });

        expect(result.period).toBe('5minute');
        expect(callWS).toHaveBeenCalledTimes(1);
        expect(callWS).toHaveBeenCalledWith(expect.objectContaining({ period: '5minute' }));
    });

    it('falls back to hourly statistics when 5-minute stats are empty', async () => {
        const callWS = vi.fn()
            .mockResolvedValueOnce({
                'sensor.flow': []
            } satisfies RecorderStatisticsResult)
            .mockResolvedValueOnce({
                'sensor.flow': [{ start: '2026-03-20T10:00:00Z', mean: 31.5 }]
            } satisfies RecorderStatisticsResult);
        const hass = { callWS } as unknown as HomeAssistant;

        const result = await loadRecorderStatistics({
            hass,
            start: new Date('2026-03-20T00:00:00Z'),
            end: new Date('2026-03-20T23:59:59Z'),
            statisticIds: ['sensor.flow'],
            period: 'hour',
            types: ['mean'],
            viewMode: 'day'
        });

        expect(result.period).toBe('hour');
        expect(callWS).toHaveBeenCalledTimes(2);
        expect(callWS).toHaveBeenNthCalledWith(1, expect.objectContaining({ period: '5minute' }));
        expect(callWS).toHaveBeenNthCalledWith(2, expect.objectContaining({ period: 'hour' }));
    });

    it('uses hourly stats for month view before falling back to day stats', async () => {
        const callWS = vi.fn()
            .mockResolvedValueOnce({
                'sensor.flow': []
            } satisfies RecorderStatisticsResult)
            .mockResolvedValueOnce({
                'sensor.flow': [{ start: '2026-03-20T10:00:00Z', mean: 31.5 }]
            } satisfies RecorderStatisticsResult);
        const hass = { callWS } as unknown as HomeAssistant;

        const result = await loadRecorderStatistics({
            hass,
            start: new Date('2026-03-01T00:00:00Z'),
            end: new Date('2026-03-31T23:59:59Z'),
            statisticIds: ['sensor.flow'],
            period: 'day',
            types: ['mean'],
            viewMode: 'month'
        });

        expect(result.period).toBe('day');
        expect(callWS).toHaveBeenCalledTimes(2);
        expect(callWS).toHaveBeenNthCalledWith(1, expect.objectContaining({ period: 'hour' }));
        expect(callWS).toHaveBeenNthCalledWith(2, expect.objectContaining({ period: 'day' }));
    });

    it('uses daily stats for year view before falling back to month stats', async () => {
        const callWS = vi.fn().mockResolvedValue({
            'sensor.flow': [{ start: '2026-03-20T00:00:00Z', mean: 31.5 }]
        } satisfies RecorderStatisticsResult);
        const hass = { callWS } as unknown as HomeAssistant;

        const result = await loadRecorderStatistics({
            hass,
            start: new Date('2026-01-01T00:00:00Z'),
            end: new Date('2026-12-31T23:59:59Z'),
            statisticIds: ['sensor.flow'],
            period: 'month',
            types: ['mean'],
            viewMode: 'year'
        });

        expect(result.period).toBe('day');
        expect(callWS).toHaveBeenCalledTimes(1);
        expect(callWS).toHaveBeenCalledWith(expect.objectContaining({ period: 'day' }));
    });

    it('prefers finer retained data for total view as well', async () => {
        const callWS = vi.fn().mockResolvedValue({
            'sensor.flow': [{ start: '2026-03-20T00:00:00Z', mean: 31.5 }]
        } satisfies RecorderStatisticsResult);
        const hass = { callWS } as unknown as HomeAssistant;

        const result = await loadRecorderStatistics({
            hass,
            start: new Date('2026-03-01T00:00:00Z'),
            end: new Date('2026-03-31T23:59:59Z'),
            statisticIds: ['sensor.flow'],
            period: 'day',
            types: ['mean'],
            viewMode: 'total'
        });

        expect(result.period).toBe('hour');
        expect(callWS).toHaveBeenCalledTimes(1);
        expect(callWS).toHaveBeenCalledWith(expect.objectContaining({ period: 'hour' }));
    });

    it('maps bucket resolution to the effective fetch period', () => {
        expect(getBucketResolution('day', '5minute')).toBe('5minute');
        expect(getBucketResolution('day', 'hour')).toBe('hour');
        expect(getBucketResolution('month', 'day')).toBeUndefined();
    });
});
