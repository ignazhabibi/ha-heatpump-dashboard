import { beforeEach, describe, expect, it } from 'vitest';
import { readStorageItem, readStorageJson, writeStorageItem, writeStorageJson } from './storage';

describe('storage utils', () => {
    let store: Record<string, string>;

    beforeEach(() => {
        store = {};
        const mockStorage = {
            getItem: (key: string) => store[key] ?? null,
            setItem: (key: string, value: string) => {
                store[key] = String(value);
            },
            clear: () => {
                store = {};
            }
        };

        Object.defineProperty(globalThis, 'localStorage', {
            value: mockStorage,
            configurable: true
        });
    });

    it('reads and writes plain storage items', () => {
        writeStorageItem('hp-test-key', 'day');
        expect(readStorageItem('hp-test-key')).toBe('day');
    });

    it('reads json and merges with fallback defaults', () => {
        localStorage.setItem('hp-test-json', JSON.stringify({ heat: false }));

        const merged = readStorageJson('hp-test-json', { energy: true, heat: true });
        expect(merged).toEqual({ energy: true, heat: false });
    });

    it('returns fallback when json is invalid', () => {
        localStorage.setItem('hp-test-json-invalid', '{bad json');

        const value = readStorageJson('hp-test-json-invalid', { energy: true, heat: true });
        expect(value).toEqual({ energy: true, heat: true });
    });

    it('writes json values', () => {
        writeStorageJson('hp-test-json-write', { flow: true, spread: false });
        expect(store['hp-test-json-write']).toBe('{"flow":true,"spread":false}');
    });
});
