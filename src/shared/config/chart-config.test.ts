import { describe, it, expect } from 'vitest';
import { ChartConfigFactory } from './chart-config';

describe('ChartConfigFactory', () => {
    describe('createOptions', () => {
        it('should create defaults correctly', () => {
            const options = ChartConfigFactory.createOptions({ type: 'line' });
            expect(options.responsive).toBe(true);
            expect(options.maintainAspectRatio).toBe(false);
            const yScale = options.scales?.y as any;
            expect(yScale?.beginAtZero).toBe(true);
        });

        it('should handle dark mode option', () => {
            const options = ChartConfigFactory.createOptions({ type: 'line', darkMode: true });

            // Check tooltip background color
            const tooltip = options.plugins?.tooltip as any;
            expect(tooltip.backgroundColor).toContain('rgba(50, 50, 50');
            expect(tooltip.titleColor).toBe('#fff');
        });

        it('should handle light mode option', () => {
            const options = ChartConfigFactory.createOptions({ type: 'line', darkMode: false });

            // Check tooltip background color
            const tooltip = options.plugins?.tooltip as any;
            expect(tooltip.backgroundColor).toContain('rgba(255, 255, 255');
            expect(tooltip.titleColor).toBe('#000');
        });

        it('should render y-axis title from symbol', () => {
            const options = ChartConfigFactory.createOptions({ type: 'line', symbol: '°C' });
            const yScale = options.scales?.y as any;
            expect(yScale?.title?.display).toBe(true);
            expect(yScale?.title?.text).toBe('°C');
        });

        it('should render custom axis titles when provided', () => {
            const options = ChartConfigFactory.createOptions({
                type: 'line',
                xAxisTitle: 'kD',
                yAxisTitle: 'kWh',
                hasSecondaryAxis: true,
                y1AxisTitle: 'COP'
            });
            const xScale = options.scales?.x as any;
            const yScale = options.scales?.y as any;
            const y1Scale = options.scales?.y1 as any;
            expect(xScale?.title?.text).toBe('kD');
            expect(yScale?.title?.text).toBe('kWh');
            expect(y1Scale?.title?.text).toBe('COP');
        });

        it('should add unit to tooltip if present in dataset', () => {
            const options = ChartConfigFactory.createOptions({ type: 'line', symbol: '°' });
            const callback = options.plugins?.tooltip?.callbacks?.label;

            // Mock context
            const context = {
                dataset: { label: 'Test', unit: 'kWh' },
                parsed: { y: 10 }
            };

            // We invoke the callback to test specific logic inside it
            if (typeof callback === 'function') {
                // Mock 'this' context for the callback
                const mockTooltipModel = {};
                const result = callback.call(mockTooltipModel as any, context as any) as string;

                // Should contain formatted value "10" and unit "kWh"
                expect(result).toContain('10');
                expect(result).toContain('kWh');
                // Should NOT contain default symbol '°' if unit is provided
                expect(result).not.toContain('°');
            } else {
                throw new Error('Callback not found');
            }
        });

        it('should use default symbol if unit is missing', () => {
            const options = ChartConfigFactory.createOptions({ type: 'line', symbol: '°' });
            const callback = options.plugins?.tooltip?.callbacks?.label;

            const context = {
                dataset: { label: 'Test' },
                parsed: { y: 10 }
            };

            if (typeof callback === 'function') {
                const mockTooltipModel = {};
                const result = callback.call(mockTooltipModel as any, context as any) as string;
                expect(result).toContain('10');
                expect(result).toContain('°');
            }
        });
    });
});
