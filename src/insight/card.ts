import { html, PropertyValues } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import Chart from 'chart.js/auto';
import type { TooltipItem } from 'chart.js';
import { getTranslations } from '../shared/utils/localization';
import { HeatpumpInsightConfig, InsightChartData } from '../types';
import { cardHeaderStyles, renderCardHeader } from '../shared/components/card-header';
import { renderTimeSelector, timeSelectorStyles } from '../shared/components/time-selector';
import { legendItemStyles, renderLegendItem } from '../shared/components/legend-item';
import { HeatpumpBaseCard } from '../shared/base/base-card';
import { styles } from './styles';
import { processInsightSeries } from './processor';
import { RecorderStatisticsResult } from '../shared/utils/ha-statistics';

type InsightPeriod = '30d' | '90d' | '365d';

interface ResolvedEnergy {
    heatingId?: string;
    hotwaterId?: string;
    ids: string[];
    mode: 'split' | 'heating_only' | 'fallback_total';
}

interface InsightDayPoint {
    date: string;
    hdd: number;
    energy: number;
}

@customElement('heatpump-insight-card')
export class HeatpumpInsightCard extends HeatpumpBaseCard {
    @state() declare config: HeatpumpInsightConfig;
    @state() private _data: InsightChartData | null = null;
    @state() private _period: InsightPeriod = '90d';
    @state() private _selectedDateStr: string | null = null;

    private _chart: Chart<'scatter' | 'line', { x: number; y: number }[], unknown> | null = null;
    private _fetchRequestId = 0;

    public static getStubConfig(): HeatpumpInsightConfig {
        return {
            type: 'custom:heatpump-insight-card',
            entities: {
                energy_heating: '',
                energy_hotwater: '',
                outdoor_temp: ''
            },
            settings: {
                heating_limit: 15
            }
        };
    }

    public getGridOptions() { return { rows: 8, min_rows: 8, columns: 12, min_columns: 12 }; }
    public getCardSize(): number { return 8; }
    public static getConfigElement() { return document.createElement('heatpump-insight-card-editor'); }

    public disconnectedCallback(): void {
        super.disconnectedCallback();
        if (this._chart) {
            this._chart.destroy();
            this._chart = null;
        }
    }

    public connectedCallback(): void {
        super.connectedCallback();
        void this.updateComplete.then(() => {
            if (this.isConnected && this._data && !this._chart) {
                this._drawChart();
            }
        });
    }

    protected updated(changedProps: PropertyValues): void {
        super.updated(changedProps);
        if (this._data && !this._chart) {
            this._drawChart();
        } else if (changedProps.has('_data') && this._data) {
            const previous = changedProps.get('_data') as InsightChartData | undefined;
            const datasetsChanged = !previous || previous.datasets !== this._data.datasets;
            if (datasetsChanged) {
                this._drawChart();
                return;
            }

            const prevDay = previous?.selectedDay?.date || null;
            const nextDay = this._data.selectedDay?.date || null;
            if (prevDay !== nextDay) {
                this._updateSelectedDayMarkerOnly();
            }
        }
    }

    private _periodDays(): number {
        if (this._period === '30d') return 30;
        if (this._period === '365d') return 365;
        return 90;
    }

    private _resolveEnergy(): ResolvedEnergy | null {
        const e = this.config.entities || {};

        // Preferred setup: separate sensors (heating + optional hot water).
        if (e.energy_heating) {
            const ids = [e.energy_heating];
            if (e.energy_hotwater) ids.push(e.energy_hotwater);
            return {
                heatingId: e.energy_heating,
                hotwaterId: e.energy_hotwater,
                ids,
                mode: e.energy_hotwater ? 'split' : 'heating_only'
            };
        }

        // Fallback setup: one total energy sensor.
        if (e.energy_total) {
            return {
                heatingId: e.energy_total,
                hotwaterId: undefined,
                ids: [e.energy_total],
                mode: 'fallback_total'
            };
        }

        return null;
    }

    private _formatDateRange(startIso: string, endIso: string): string {
        const lang = this.hass?.language || 'en';
        const start = new Date(startIso).toLocaleDateString(lang, { day: '2-digit', month: '2-digit' });
        const end = new Date(endIso).toLocaleDateString(lang, { day: '2-digit', month: '2-digit' });
        return `${start} - ${end}`;
    }

    private _setPeriod(period: InsightPeriod): void {
        if (this._period === period) return;
        this._period = period;
        this._requestChartTransition();
        this._fetchData();
    }

    private _toSortedDays(days: InsightDayPoint[]): InsightDayPoint[] {
        return [...days].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    }

    private _resolveSelectedDay(days: InsightDayPoint[]): InsightDayPoint | null {
        if (days.length === 0) return null;
        const sortedDays = this._toSortedDays(days);
        const requested = this._selectedDateStr;

        if (!requested) return sortedDays[sortedDays.length - 1];

        const exact = sortedDays.find((d) => d.date === requested);
        if (exact) return exact;

        const requestedTs = new Date(requested).getTime();
        let fallback = sortedDays[0];
        for (const day of sortedDays) {
            if (new Date(day.date).getTime() <= requestedTs) {
                fallback = day;
                continue;
            }
            break;
        }
        return fallback;
    }

    private _buildDatasets(
        linePoints: { x: number; y: number }[],
        days: InsightDayPoint[],
        selectedDay: InsightDayPoint | null
    ): InsightChartData['datasets'] {
        const t = getTranslations(this.hass?.language || 'en');
        const datasets: InsightChartData['datasets'] = [
            {
                label: t.trendLine,
                data: linePoints,
                borderColor: '#2196F3',
                backgroundColor: 'transparent',
                type: 'line',
                pointRadius: 0,
                showLine: true,
                borderWidth: 2,
                order: 1
            },
            {
                label: t.dailyConsumption,
                data: days.map((day) => ({ x: day.hdd, y: day.energy })),
                backgroundColor: 'rgba(33, 150, 243, 0.55)',
                borderColor: 'transparent',
                pointRadius: 4,
                type: 'scatter',
                order: 2
            }
        ];

        if (selectedDay) {
            datasets.push({
                label: t.viewDay,
                data: [{ x: selectedDay.hdd, y: selectedDay.energy }],
                backgroundColor: '#FF9800',
                borderColor: '#FF9800',
                pointRadius: 6,
                pointHoverRadius: 8,
                type: 'scatter',
                order: 0
            });
        }

        return datasets;
    }

    private _selectedDayIndex(): number {
        if (!this._data?.availableDays || !this._data.selectedDay) return -1;
        return this._data.availableDays.findIndex((day) => day.date === this._data?.selectedDay?.date);
    }

    private _canGoPrevSelectedDay(): boolean {
        return this._selectedDayIndex() > 0;
    }

    private _canGoNextSelectedDay(): boolean {
        const idx = this._selectedDayIndex();
        const total = this._data?.availableDays?.length ?? 0;
        return idx >= 0 && idx < total - 1;
    }

    private _navigateSelectedDay(direction: 'prev' | 'next'): void {
        if (!this._data?.availableDays || !this._data.linePoints || !this._data.metrics) return;
        const idx = this._selectedDayIndex();
        if (idx < 0) return;
        const delta = direction === 'prev' ? -1 : 1;
        const nextIdx = idx + delta;
        if (nextIdx < 0 || nextIdx >= this._data.availableDays.length) return;

        const selectedDay = this._data.availableDays[nextIdx];
        this._selectedDateStr = selectedDay.date;

        const expected = (this._data.metrics.slope * selectedDay.hdd) + this._data.metrics.modelIntercept;
        const deviation = selectedDay.energy - expected;

        this._data = {
            ...this._data,
            selectedDay: {
                ...selectedDay,
                expected,
                deviation
            }
        };
    }

    private _updateSelectedDayMarkerOnly(): void {
        if (!this._chart || !this._data?.selectedDay) return;

        const markerDataset = this._chart.data.datasets.find((dataset) => dataset.type === 'scatter' && dataset.order === 0);
        if (!markerDataset) return;

        markerDataset.data = [{
            x: this._data.selectedDay.hdd,
            y: this._data.selectedDay.energy
        }];
        this._chart.update('none');
    }

    private _formatSelectedDateLabel(): string {
        if (!this._data?.selectedDay) return '';
        return new Date(this._data.selectedDay.date).toLocaleDateString(this.hass?.language || 'en', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
    }

    protected async _fetchData(): Promise<void> {
        if (!this.hass || !this.config.entities?.outdoor_temp) return;
        const requestId = ++this._fetchRequestId;

        const energy = this._resolveEnergy();
        if (!energy) {
            if (requestId === this._fetchRequestId) this._data = null;
            return;
        }

        const end = new Date();
        const start = new Date(end);
        start.setDate(end.getDate() - this._periodDays());

        const ids = [...energy.ids, this.config.entities.outdoor_temp].filter(Boolean) as string[];

        try {
            const stats = await this.hass.callWS({
                type: 'recorder/statistics_during_period',
                start_time: start.toISOString(),
                end_time: end.toISOString(),
                statistic_ids: ids,
                period: 'day',
                types: ['change', 'mean']
            }) as RecorderStatisticsResult;
            if (requestId !== this._fetchRequestId) return;

            const result = processInsightSeries({
                stats,
                heatingId: energy.heatingId,
                hotwaterId: energy.hotwaterId,
                tempId: this.config.entities.outdoor_temp,
                heatingLimit: this.config.settings?.heating_limit || 15,
                identifyYesterday: false,
                filterStart: start,
                excludeZeroHddDays: energy.mode !== 'fallback_total'
            });

            if (!result) {
                this._data = null;
                return;
            }

            const hasDedicatedWw = Boolean(energy.hotwaterId && stats[energy.hotwaterId]);
            const baseLoad = hasDedicatedWw ? result.wwBaseLoad : Math.max(0, result.b);
            const baseLoadSource = hasDedicatedWw ? 'ww' as const : 'regression' as const;

            const availableDays = this._toSortedDays(
                result.datedPoints.map((point) => ({
                    date: point.dateStr,
                    hdd: point.x,
                    energy: point.y
                }))
            );
            const selectedDay = this._resolveSelectedDay(availableDays);
            this._selectedDateStr = selectedDay?.date || null;

            const selectedExpected = selectedDay
                ? (result.m * selectedDay.hdd) + result.b
                : 0;
            const selectedDeviation = selectedDay
                ? selectedDay.energy - selectedExpected
                : 0;

            const datasets = this._buildDatasets(result.linePoints, availableDays, selectedDay);

            this._data = {
                linePoints: result.linePoints,
                availableDays,
                selectedDay: selectedDay ? {
                    ...selectedDay,
                    expected: selectedExpected,
                    deviation: selectedDeviation
                } : undefined,
                datasets,
                metrics: {
                    // With split sensors, show measured DHW base load.
                    // Without DHW sensor fallback to regression intercept.
                    baseLoad,
                    baseLoadSource,
                    modelIntercept: result.b,
                    wwBaseLoad: result.wwBaseLoad,
                    slope: result.m,
                    r2: result.r2,
                    avgEfficiency: result.avgEfficiency
                },
                modeLabel: `${this._periodDays()}d`,
                compLabel: '',
                startDate: start.toISOString(),
                endDate: end.toISOString()
            };
        } catch (e) {
            if (requestId !== this._fetchRequestId) return;
            console.error('Fetch Error:', e);
        }
    }

    protected _drawChart(): void {
        if (!this._data) return;
        const canvas = this.renderRoot.querySelector('#chart') as HTMLCanvasElement | null;
        if (!canvas) return;

        const gridColor = getComputedStyle(this).getPropertyValue('--divider-color').trim() || '#e0e0e0';
        const tickColor = getComputedStyle(this).getPropertyValue('--secondary-text-color').trim() || '#999';
        const isDark = this.isDark;

        const options = {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    title: { display: true, text: 'kD', color: tickColor },
                    grid: { color: gridColor },
                    ticks: { color: tickColor, font: { size: 10 } }
                },
                y: {
                    title: { display: true, text: 'kWh', color: tickColor },
                    grid: { color: gridColor },
                    ticks: { color: tickColor, font: { size: 10 } },
                    beginAtZero: true,
                    border: { display: false }
                }
            },
            plugins: {
                legend: { display: false },
                tooltip: {
                    mode: 'nearest',
                    intersect: false,
                    backgroundColor: isDark ? 'rgba(50, 50, 50, 0.9)' : 'rgba(255, 255, 255, 0.9)',
                    titleColor: isDark ? '#fff' : '#000',
                    bodyColor: isDark ? '#fff' : '#000',
                    borderColor: isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.2)',
                    borderWidth: 1,
                    callbacks: {
                        label: (ctx: TooltipItem<'scatter' | 'line'>) => {
                            if (ctx.dataset.type === 'line') return '';
                            if (ctx.parsed.x !== null && ctx.parsed.y !== null) {
                                return `kD: ${ctx.parsed.x.toFixed(1)}, kWh: ${ctx.parsed.y.toFixed(1)}`;
                            }
                            return '';
                        }
                    }
                }
            }
        } as const;

        if (this._chart) {
            this._chart.data.datasets = this._data.datasets;
            this._chart.options = options;
            this._updateChartWithTransition(this._chart);
            return;
        }

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        this._chart = new Chart<'scatter' | 'line', { x: number; y: number }[]>(ctx, {
            type: 'scatter',
            data: { datasets: this._data.datasets },
            options: options
        });
    }

    protected render() {
        if (!this.hass || !this.config) return html``;
        const t = getTranslations(this.hass.language || 'en');
        if (!this._data) return html`<ha-card class="loading-card">${t.loading}</ha-card>`;

        const m = this._data.metrics;
        const range = this._formatDateRange(this._data.startDate, this._data.endDate);
        const qualityShort = m.r2 !== undefined ? `${Math.round(m.r2 * 100)}%` : '-';
        const baseLoadLabel = m.baseLoadSource === 'regression' ? t.baseLoadRegression : t.baseLoad;
        const selectedDay = this._data.selectedDay;
        const selectedEnergy = selectedDay?.energy ?? 0;
        const expectedSelected = selectedDay?.expected ?? 0;
        const selectedDeviation = selectedDay?.deviation ?? 0;
        const deviationPct = expectedSelected > 0.1
            ? (selectedDeviation / expectedSelected) * 100
            : null;
        const pctText = deviationPct === null
            ? ''
            : ` (${deviationPct > 0 ? '+' : ''}${deviationPct.toFixed(0)}%)`;

        const periodTabs = [
            { id: '30d', label: '30d' },
            { id: '90d', label: '90d' },
            { id: '365d', label: '365d' }
        ];

        const customTopRight = renderTimeSelector(periodTabs, this._period, (id) => this._setPeriod(id as InsightPeriod));

        return html`
            <ha-card>
                ${renderCardHeader({
                    title: t.insightCardName,
                    customTopRight,
                    dateLabel: this._formatSelectedDateLabel(),
                    canGoNext: this._canGoNextSelectedDay(),
                    onPrevDate: () => {
                        if (this._canGoPrevSelectedDay()) this._navigateSelectedDay('prev');
                    },
                    onNextDate: () => this._navigateSelectedDay('next'),
                    prevAriaLabel: t.previousPeriodAria,
                    nextAriaLabel: t.nextPeriodAria,
                    showDateRow: true
                })}

                <div class="chart-container">
                    <canvas id="chart"></canvas>
                </div>

                <div class="card-footer">
                    <div class="legend">
                        ${selectedDay ? renderLegendItem(
            `${t.viewDay} (${new Date(selectedDay.date).toLocaleDateString(this.hass.language || 'en', { day: '2-digit', month: '2-digit' })})`,
            '#FF9800',
            true,
            undefined,
            html`
                            <div class="yesterday-values">
                                <span class="yesterday-main">
                                    ${t.actualShort} ${selectedEnergy.toFixed(1)} | ${t.expectedShort} ${expectedSelected.toFixed(1)} kWh
                                </span>
                                <span class="yesterday-dev ${selectedDeviation > 0 ? 'deviation-positive' : 'deviation-negative'}">
                                    ${selectedDeviation > 0 ? '+' : ''}${selectedDeviation.toFixed(1)} kWh${pctText}
                                </span>
                            </div>
                        `
        ) : ''}
                        ${renderLegendItem(
            t.currentPeriod,
            '#2196F3',
            true,
            undefined,
            html`<span class="now">${range}</span>`
        )}
                    </div>

                    <div class="insight-kpis">
                        <div class="kpi-card">
                            <div class="kpi-label">${baseLoadLabel}</div>
                            <div class="kpi-value">${m.baseLoad.toFixed(2)} kWh/d</div>
                        </div>
                        <div class="kpi-card">
                            <div class="kpi-label">${t.insulationFactor}</div>
                            <div class="kpi-value">${m.slope.toFixed(2)} kWh/kD</div>
                        </div>
                        <div class="kpi-card">
                            <div class="kpi-label">${t.controlQuality}</div>
                            <div class="kpi-value">${qualityShort}</div>
                        </div>
                    </div>
                </div>
            </ha-card>
        `;
    }

    static get styles() {
        return [
            HeatpumpBaseCard.baseStyles,
            cardHeaderStyles,
            timeSelectorStyles,
            legendItemStyles,
            styles
        ];
    }
}
