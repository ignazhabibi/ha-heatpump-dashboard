import { describe, it, expect, vi } from 'vitest';
import { updateNumberEntity } from './number-control';
import { updateSelectEntity } from './select-control';

describe('Control service helpers', () => {
    describe('updateNumberEntity', () => {
        it('calls number.set_value for number entities', async () => {
            const callService = vi.fn().mockResolvedValue(undefined);
            const hass = {
                states: {
                    'number.flow_temp': {
                        state: '30',
                        attributes: { step: 0.5, min: 20, max: 60 }
                    }
                },
                callService
            } as any;

            await updateNumberEntity(hass, 'number.flow_temp', 1);

            expect(callService).toHaveBeenCalledWith('number', 'set_value', {
                entity_id: 'number.flow_temp',
                value: 30.5
            });
        });

        it('clamps value to max/min limits', async () => {
            const callService = vi.fn().mockResolvedValue(undefined);
            const hass = {
                states: {
                    'input_number.shift': {
                        state: '5',
                        attributes: { step: 1, min: 0, max: 5 }
                    }
                },
                callService
            } as any;

            await updateNumberEntity(hass, 'input_number.shift', 1);

            expect(callService).toHaveBeenCalledWith('input_number', 'set_value', {
                entity_id: 'input_number.shift',
                value: 5
            });
        });

        it('calls water_heater.set_temperature for water_heater entities', async () => {
            const callService = vi.fn().mockResolvedValue(undefined);
            const hass = {
                states: {
                    'water_heater.dhw': {
                        state: '48',
                        attributes: { step: 1, min: 35, max: 55 }
                    }
                },
                callService
            } as any;

            await updateNumberEntity(hass, 'water_heater.dhw', 1);

            expect(callService).toHaveBeenCalledWith('water_heater', 'set_temperature', {
                entity_id: 'water_heater.dhw',
                temperature: 49
            });
        });

        it('does nothing for unsupported domains', async () => {
            const callService = vi.fn().mockResolvedValue(undefined);
            const hass = {
                states: {
                    'sensor.read_only': {
                        state: '10',
                        attributes: { step: 1, min: 0, max: 20 }
                    }
                },
                callService
            } as any;

            await updateNumberEntity(hass, 'sensor.read_only', 1);

            expect(callService).not.toHaveBeenCalled();
        });
    });

    describe('updateSelectEntity', () => {
        it('calls select.select_option for select entities', async () => {
            const callService = vi.fn().mockResolvedValue(undefined);
            const hass = { callService } as any;

            await updateSelectEntity(hass, 'select.operation_mode', 'eco');

            expect(callService).toHaveBeenCalledWith('select', 'select_option', {
                entity_id: 'select.operation_mode',
                option: 'eco'
            });
        });

        it('calls input_select.select_option for input_select entities', async () => {
            const callService = vi.fn().mockResolvedValue(undefined);
            const hass = { callService } as any;

            await updateSelectEntity(hass, 'input_select.operation_mode', 'comfort');

            expect(callService).toHaveBeenCalledWith('input_select', 'select_option', {
                entity_id: 'input_select.operation_mode',
                option: 'comfort'
            });
        });

        it('does nothing for unsupported domains', async () => {
            const callService = vi.fn().mockResolvedValue(undefined);
            const hass = { callService } as any;

            await updateSelectEntity(hass, 'sensor.read_only_mode', 'eco');

            expect(callService).not.toHaveBeenCalled();
        });
    });
});
