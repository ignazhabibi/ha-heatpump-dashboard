import { describe, it, expect } from 'vitest';
import { hexToRgb } from './helpers';

describe('Helpers', () => {
    describe('hexToRgb', () => {
        it('should convert 6-digit hex to RGB string', () => {
            expect(hexToRgb('#ffffff')).toBe('255,255,255');
            expect(hexToRgb('#000000')).toBe('0,0,0');
            expect(hexToRgb('#ff0000')).toBe('255,0,0');
        });

        it('should convert 3-digit hex to RGB string', () => {
            expect(hexToRgb('#fff')).toBe('255,255,255');
            expect(hexToRgb('#000')).toBe('0,0,0');
            expect(hexToRgb('#f00')).toBe('255,0,0');
        });

        it('should return null for invalid hex', () => {
            expect(hexToRgb('invalid')).toBeNull();
            expect(hexToRgb('#12345')).toBeNull(); // 5 digits
        });
    });
});
