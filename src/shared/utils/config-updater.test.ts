import { describe, expect, it } from 'vitest';
import { cloneAndSetConfigPath, setConfigValueAtPath } from './config-updater';

describe('config-updater', () => {
    it('updates nested values without mutating original config', () => {
        const original = {
            entities: {
                energy_heating: 'sensor.old'
            }
        };

        const updated = cloneAndSetConfigPath(original, 'entities.energy_heating', 'sensor.new');

        expect(updated.entities.energy_heating).toBe('sensor.new');
        expect(original.entities.energy_heating).toBe('sensor.old');
    });

    it('creates missing nested objects for path updates', () => {
        const original = { type: 'custom:test-card' };
        const updated = cloneAndSetConfigPath(original, 'settings.heating_limit', 15);

        expect(updated).toEqual({
            type: 'custom:test-card',
            settings: {
                heating_limit: 15
            }
        });
    });

    it('supports root-level updates', () => {
        const original = { formula: 'standard' };
        const updated = cloneAndSetConfigPath(original, 'formula', 'viessmann');
        expect(updated.formula).toBe('viessmann');
    });

    it('setConfigValueAtPath handles empty paths as no-op', () => {
        const target: Record<string, unknown> = { a: 1 };
        setConfigValueAtPath(target, '', 2);
        expect(target).toEqual({ a: 1 });
    });
});
