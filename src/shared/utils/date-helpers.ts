export type ViewMode = '12h' | 'day' | 'month' | 'year' | 'total';

export function shiftDate(currentDate: Date, viewMode: ViewMode, direction: 'prev' | 'next'): Date {
    const val = direction === 'next' ? 1 : -1;
    const d = new Date(currentDate);
    if (viewMode === '12h') d.setHours(d.getHours() + (val * 12));
    else if (viewMode === 'day') d.setDate(d.getDate() + val);
    else if (viewMode === 'month') d.setMonth(d.getMonth() + val);
    else if (viewMode === 'year') d.setFullYear(d.getFullYear() + val);
    return d;
}

export function normalizeDateForViewMode(currentDate: Date, viewMode: ViewMode, now: Date = new Date()): Date {
    if (viewMode === 'total') return new Date(currentDate);

    const d = new Date(currentDate);

    if (viewMode === 'year') {
        if (d.getFullYear() > now.getFullYear()) return new Date(now);
        return d;
    }

    if (viewMode === 'month') {
        const isFutureMonth = d.getFullYear() > now.getFullYear() ||
            (d.getFullYear() === now.getFullYear() && d.getMonth() > now.getMonth());
        if (isFutureMonth) return new Date(now);
        return d;
    }

    if (viewMode === 'day') {
        const dayDate = new Date(d.getFullYear(), d.getMonth(), d.getDate());
        const nowDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        if (dayDate > nowDay) return new Date(now);
        return d;
    }

    // 12h view: keep existing timestamp unless it is in the future.
    if (d > now) return new Date(now);
    return d;
}

export function canGoNext(currentDate: Date, viewMode: ViewMode): boolean {
    if (viewMode === 'total') return false;

    const now = new Date();

    // Compare period starts to avoid carrying day/month offsets across mode switches.
    if (viewMode === 'year') {
        const nextYearStart = new Date(currentDate.getFullYear() + 1, 0, 1);
        return nextYearStart <= now;
    }

    if (viewMode === 'month') {
        const nextMonthStart = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);
        return nextMonthStart <= now;
    }

    if (viewMode === 'day') {
        const nextDayStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate() + 1, 0, 0, 0);
        return nextDayStart <= now;
    }

    // 12h view keeps its moving 12-hour window behavior.
    const nextDate = shiftDate(currentDate, viewMode, 'next');
    return nextDate <= now;
}

export function formatDateLabel(currentDate: Date, viewMode: ViewMode, language: string = 'en-US', allTimeLabel: string = "All Time"): string {
    if (viewMode === 'total') return allTimeLabel;

    const d = currentDate;
    if (viewMode === '12h') {
        return d.toLocaleDateString(language, { day: "2-digit", month: "2-digit" }) + " " + d.getHours() + ":00";
    }
    if (viewMode === 'day') return d.toLocaleDateString(language, { day: "2-digit", month: "long", year: "numeric" });
    if (viewMode === 'month') return d.toLocaleDateString(language, { month: "long", year: "numeric" });
    return d.toLocaleDateString(language, { year: "numeric" });
}

export function calculateDateRange(currentDate: Date, viewMode: ViewMode): { start: Date, end: Date, period: '5minute' | 'hour' | 'day' | 'month' } {
    let start: Date, end: Date, period: '5minute' | 'hour' | 'day' | 'month';
    const now = new Date();
    const d = currentDate;

    if (viewMode === '12h') {
        period = 'hour';
        start = new Date(d);
        start.setMinutes(0, 0, 0);

        // If "today" and within 12h range, show accurate "now" window?
        // Existing logic: 
        // if (d.toDateString() === now.toDateString() && Math.abs(now.getHours() - d.getHours()) < 12)
        // This is a bit complex to port exactly without context, but let's stick to the core logic.
        // Actually, let's keep it simple and consistent for now, or copy the specific "smart 12h" logic:

        if (d.toDateString() === now.toDateString() && Math.abs(now.getHours() - d.getHours()) < 12) {
            let h = now.getHours();
            end = new Date(now); end.setMinutes(59, 59, 999);
            start = new Date(now); start.setHours(h - 11, 0, 0, 0);
        } else {
            end = new Date(start.getTime() + 12 * 60 * 60 * 1000);
        }
    }
    else if (viewMode === 'day') {
        start = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0);
        end = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59);
        period = 'hour';
    }
    else if (viewMode === 'month') {
        start = new Date(d.getFullYear(), d.getMonth(), 1);
        end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);
        period = 'day';
    }
    else if (viewMode === 'year') {
        start = new Date(d.getFullYear(), 0, 1);
        end = new Date(d.getFullYear(), 11, 31, 23, 59, 59);
        period = 'month';
    }
    else { // total
        start = new Date(now.getFullYear() - 4, 0, 1);
        end = now;
        period = 'month';
    }

    return { start, end, period };
}
