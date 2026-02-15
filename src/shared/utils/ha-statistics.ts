export interface RecorderStatisticPoint {
    start: string;
    mean?: number | null;
    change?: number | null;
}

export type RecorderStatisticsResult = Record<string, RecorderStatisticPoint[]>;
