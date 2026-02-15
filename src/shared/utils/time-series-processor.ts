import { ViewMode } from './date-helpers';
import { RecorderStatisticPoint } from './ha-statistics';

export interface TimeBucket {
    start: number;
    end: number;
    label: string;
}

export interface ProcessingOptions {
    viewMode: ViewMode;
    language: string;
    resolution?: '5minute' | 'hour' | 'day' | 'month' | 'year';
}

export class TimeSeriesProcessor {

    /**
     * Generates time buckets based on the view mode and date range.
     */
    public static generateBuckets(start: Date, end: Date, options: ProcessingOptions): TimeBucket[] {
        const buckets: TimeBucket[] = [];
        const { viewMode, language, resolution } = options;
        const startTime = start.getTime();
        const endTime = end.getTime();

        const fmtHour = new Intl.DateTimeFormat(language, { hour: 'numeric', minute: '2-digit' });
        const fmtDay = new Intl.DateTimeFormat(language, { day: '2-digit' });
        const fmtMonth = new Intl.DateTimeFormat(language, { month: 'short' });

        let step = 3600000; // Default 1 hour

        if (resolution === '5minute') step = 5 * 60 * 1000;
        else if (resolution === 'hour') step = 60 * 60 * 1000;
        else if (resolution === 'day') step = 24 * 60 * 60 * 1000;

        // Custom logic based on ViewMode if resolution is not forced, or to generate labels
        if (viewMode === '12h' || viewMode === 'day') {
            const iterations = Math.ceil((endTime - startTime) / step);
            for (let i = 0; i < iterations; i++) {
                const t = new Date(startTime + (i * step));
                if (t.getTime() > endTime) break;

                let label = "";
                // Label logic: Show label only on full hours for 5-minute view
                if (resolution === '5minute') {
                    if (t.getMinutes() === 0 && (viewMode === '12h' || i % 12 === 0)) label = fmtHour.format(t);
                } else {
                    if (viewMode === '12h') label = fmtHour.format(t);
                    else if (viewMode === 'day' && t.getHours() % 4 === 0) label = fmtHour.format(t); // Sparse labels for day
                    else label = fmtHour.format(t); // Default
                }

                buckets.push({ start: t.getTime(), end: t.getTime() + step, label });
            }
        } else if (viewMode === 'month') {
            // Daily resolution
            const days = Math.ceil((endTime - startTime) / 86400000);
            for (let i = 0; i < days; i++) {
                const t = new Date(startTime + (i * 86400000));
                if (t.getTime() > endTime) break;
                buckets.push({
                    start: t.getTime(),
                    end: t.getTime() + 86400000,
                    label: fmtDay.format(t)
                });
            }
        } else if (viewMode === 'year') {
            // Monthly resolution
            const startDate = new Date(start);
            const endDate = new Date(end);
            const months = (endDate.getFullYear() - startDate.getFullYear()) * 12 + (endDate.getMonth() - startDate.getMonth()) + 1;

            for (let i = 0; i < months; i++) {
                const d = new Date(startDate.getFullYear(), startDate.getMonth() + i, 1);
                if (d.getTime() > endTime) break;

                const nextMonth = new Date(d.getFullYear(), d.getMonth() + 1, 1);
                buckets.push({
                    start: d.getTime(),
                    end: nextMonth.getTime(),
                    label: fmtMonth.format(d)
                });
            }
        } else if (viewMode === 'total') {
            // Yearly resolution
            const startYear = start.getFullYear();
            const endYear = end.getFullYear();
            for (let y = startYear; y <= endYear; y++) {
                const d = new Date(y, 0, 1);
                const nextYear = new Date(y + 1, 0, 1);
                buckets.push({
                    start: d.getTime(),
                    end: nextYear.getTime(),
                    label: y.toString()
                });
            }
        }

        return buckets;
    }

    /**
     * Aggregates statistics into the provided buckets.
     */
    public static aggregate(
        stats: RecorderStatisticPoint[],
        buckets: TimeBucket[],
        type: 'mean' | 'sum' | 'change'
    ): (number | null)[] {
        if (!stats || stats.length === 0) return new Array(buckets.length).fill(null);

        return buckets.map(bucket => {
            const inBucket = stats.filter((s) => {
                const t = new Date(s.start).getTime();
                return t >= bucket.start && t < bucket.end;
            });

            if (type === 'change' || type === 'sum') {
                if (inBucket.length === 0) return 0;
                return inBucket.reduce((sum, curr) => sum + (curr.change || 0), 0);
            } else {
                // Mean
                if (inBucket.length === 0) return null;
                const valid = inBucket
                    .filter((s) => s.mean !== null && s.mean !== undefined)
                    .map((s) => s.mean as number);
                if (valid.length === 0) return null;
                return valid.reduce((a, b) => a + b, 0) / valid.length;
            }
        });
    }

    public static calculateAverage(values: (number | null)[]): number | null {
        const valid = values.filter(x => x !== null) as number[];
        return valid.length ? valid.reduce((a, b) => a + b, 0) / valid.length : null;
    }
}
