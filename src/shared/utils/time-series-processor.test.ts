import { describe, it, expect } from 'vitest';
import { TimeSeriesProcessor } from './time-series-processor';

describe('TimeSeriesProcessor', () => {
    describe('generateBuckets', () => {
        it('should generate correct number of buckets for 24h view with hourly resolution', () => {
            const start = new Date('2023-01-01T00:00:00');
            const end = new Date('2023-01-02T00:00:00');

            // Explicitly requesting hourly resolution which defaults to 1h steps
            const buckets = TimeSeriesProcessor.generateBuckets(start, end, {
                viewMode: 'day',
                language: 'en',
                resolution: 'hour'
            });

            expect(buckets.length).toBe(24);
            expect(buckets[0].start).toBe(start.getTime());
        });

        it('should generate correct number of buckets for day view (12h)', () => {
            const start = new Date('2023-01-01T00:00:00');
            const end = new Date('2023-01-01T12:00:00');

            const buckets = TimeSeriesProcessor.generateBuckets(start, end, {
                viewMode: '12h',
                language: 'en',
                resolution: 'hour'
            });

            expect(buckets.length).toBe(12);
        });
    });

    describe('aggregate', () => {
        it('should correctly sum values using "change" field', () => {
            const start = new Date('2023-01-01T00:00:00');
            const end = new Date('2023-01-01T04:00:00');

            const buckets = TimeSeriesProcessor.generateBuckets(start, end, {
                viewMode: 'day',
                language: 'en',
                resolution: 'hour'
            });

            // Mock HA Statistics data (uses 'change' for accumulated values)
            const stats = [
                { start: new Date(start.getTime()).toISOString(), change: 10 },
                { start: new Date(start.getTime() + 3600000).toISOString(), change: 20 },
                { start: new Date(start.getTime() + 7200000).toISOString(), change: 30 },
                { start: new Date(start.getTime() + 10800000).toISOString(), change: 40 }
            ];

            const result = TimeSeriesProcessor.aggregate(stats, buckets, 'sum');

            expect(result).toHaveLength(4);
            expect(result[0]).toBe(10);
            expect(result[1]).toBe(20);
            expect(result[2]).toBe(30);
            expect(result[3]).toBe(40);
        });

        it('should correctly average values (mean)', () => {
            const start = new Date('2023-01-01T00:00:00');
            const end = new Date('2023-01-01T01:00:00');

            const buckets = TimeSeriesProcessor.generateBuckets(start, end, {
                viewMode: 'day',
                language: 'en',
                resolution: 'hour'
            });

            // Two data points in the same bucket
            const stats = [
                { start: new Date(start.getTime() + 1000).toISOString(), mean: 10 },
                { start: new Date(start.getTime() + 2000).toISOString(), mean: 30 }
            ];

            const result = TimeSeriesProcessor.aggregate(stats, buckets, 'mean');

            // (10 + 30) / 2 = 20
            expect(result[0]).toBe(20);
        });

        it('should handle empty statistics', () => {
            const start = new Date('2023-01-01T00:00:00');
            const end = new Date('2023-01-01T01:00:00');

            const buckets = TimeSeriesProcessor.generateBuckets(start, end, {
                viewMode: 'day',
                language: 'en',
                resolution: 'hour'
            });

            const result = TimeSeriesProcessor.aggregate([], buckets, 'mean');
            expect(result[0]).toBeNull();
        });
    });
});
