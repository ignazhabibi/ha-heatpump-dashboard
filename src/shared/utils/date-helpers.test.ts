import { describe, expect, it, vi } from 'vitest';
import { canGoNext, normalizeDateForViewMode } from './date-helpers';

describe('date-helpers canGoNext', () => {
    it('allows going from year 2025 to 2026 even when currentDate is in July', () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-02-15T10:00:00Z'));

        const canGo = canGoNext(new Date('2025-07-10T00:00:00Z'), 'year');
        expect(canGo).toBe(true);

        vi.useRealTimers();
    });

    it('disables year next when next year start is in the future', () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-02-15T10:00:00Z'));

        const canGo = canGoNext(new Date('2026-07-10T00:00:00Z'), 'year');
        expect(canGo).toBe(false);

        vi.useRealTimers();
    });

    it('uses month start boundaries for month mode', () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-02-15T10:00:00Z'));

        expect(canGoNext(new Date('2026-01-31T10:00:00Z'), 'month')).toBe(true);
        expect(canGoNext(new Date('2026-02-01T00:00:00Z'), 'month')).toBe(false);

        vi.useRealTimers();
    });
});

describe('date-helpers normalizeDateForViewMode', () => {
    it('clamps future month to current month when switching to month view', () => {
        const now = new Date('2026-02-15T10:00:00Z');
        const normalized = normalizeDateForViewMode(new Date('2026-10-01T12:00:00Z'), 'month', now);
        expect(normalized.getFullYear()).toBe(2026);
        expect(normalized.getMonth()).toBe(1); // February
    });

    it('keeps past month unchanged in month view', () => {
        const now = new Date('2026-02-15T10:00:00Z');
        const original = new Date('2025-10-01T12:00:00Z');
        const normalized = normalizeDateForViewMode(original, 'month', now);
        expect(normalized.getFullYear()).toBe(2025);
        expect(normalized.getMonth()).toBe(9); // October
    });
});
