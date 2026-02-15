import { html, PropertyValues } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import Chart from 'chart.js/auto';
import type { ChartDataset } from 'chart.js';
import { ENERGY_DEFAULTS } from '../shared/config/const';
import { hexToRgb } from '../shared/utils/helpers';
import { getTranslations } from '../shared/utils/localization';
import { HeatpumpEnergyConfig, ChartData } from '../types';
import { legendItemStyles, renderLegendItem } from '../shared/components/legend-item';
import { cardHeaderStyles, renderCardHeader } from '../shared/components/card-header';
import { canGoNext, calculateDateRange } from '../shared/utils/date-helpers';
import { TimeSeriesProcessor } from '../shared/utils/time-series-processor';
import { ChartConfigFactory } from '../shared/config/chart-config';
import { RecorderStatisticsResult } from '../shared/utils/ha-statistics';
import { readStorageJson, writeStorageJson } from '../shared/utils/storage';
import { HeatpumpBaseCard } from '../shared/base/base-card';
import { styles } from './styles';

type EnergyDataset = ChartDataset<'bar' | 'line', (number | null)[]> & { unit?: string };

@customElement('heatpump-energy-card')
export class HeatpumpEnergyCard extends HeatpumpBaseCard {
    @state() declare config: HeatpumpEnergyConfig; // Narrow the type
    @state() private _data: ChartData | null = null;
    @state() private _visibility = { energy: true, heat: true, cop: false };

    private _chart: Chart | null = null;
    private _fetchRequestId = 0;

    public static getStubConfig(): HeatpumpEnergyConfig {
        return {
            type: 'custom:heatpump-energy-card',
            entities: { energy_heating: "", energy_water: "", heat_heating: "", heat_water: "" },
            colors: { ...ENERGY_DEFAULTS }
        };
    }

    public getGridOptions() { return { rows: 8, min_rows: 8, columns: 12, min_columns: 12 }; }
    public static getConfigElement() { return document.createElement("heatpump-energy-card-editor"); }

    public setConfig(config: HeatpumpEnergyConfig): void {
        super.setConfig(config);
        this._loadVisibilityFromStorage();
    }
    // Generate unique storage key per card instance
    protected get _storageKey(): string {
        const configStr = JSON.stringify(this.config?.entities || {});
        return `energy-card-viewmode-${configStr}`;
    }

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

    private _loadVisibilityFromStorage(): void {
        this._visibility = readStorageJson(this._storageKey + '-visibility', this._visibility);
    }

    private _saveVisibilityToStorage(): void {
        writeStorageJson(this._storageKey + '-visibility', this._visibility);
    }

    protected updated(changedProps: PropertyValues): void {
        super.updated(changedProps);
        if (changedProps.has("hass") && this.hass) this._updateThemeColors();

        // Redraw if data exists but chart was destroyed (e.g. after Edit Mode)
        if (this._data && !this._chart) {
            this._drawChart();
        } else if (changedProps.has("_data") && this._data) {
            this._drawChart();
        }
        if (changedProps.has("_visibility")) this._drawChart();
    }

    private _updateThemeColors(): void {
        const cfg = this.config.colors || {};
        const setC = (name: string, key: string, defaultHex: string) => {
            const val = cfg[key] || defaultHex;
            const rgb = hexToRgb(val);
            if (rgb) this.style.setProperty(`--c-${name}-rgb`, rgb);
        };
        setC('energy-heating', 'energy_heating', ENERGY_DEFAULTS.energy_heating);
        setC('energy-water', 'energy_water', ENERGY_DEFAULTS.energy_water);
        setC('heat-heating', 'heat_heating', ENERGY_DEFAULTS.heat_heating);
        setC('heat-water', 'heat_water', ENERGY_DEFAULTS.heat_water);
        setC('cop', 'cop', ENERGY_DEFAULTS.cop);
    }

    private _getThemeVar(varName: string): string {
        return getComputedStyle(this).getPropertyValue(varName).trim();
    }

    private _toggleSeries(key: 'energy' | 'heat' | 'cop'): void {
        this._visibility = { ...this._visibility, [key]: !this._visibility[key] };
        this._saveVisibilityToStorage();
    }

    protected async _fetchData(): Promise<void> {
        if (!this.hass || !this.config.entities) return;
        const requestId = ++this._fetchRequestId;
        const { start, end, period } = calculateDateRange(this._currentDate, this._viewMode);

        const ids: string[] = [];
        const e = this.config.entities;
        if (e.energy_heating) ids.push(e.energy_heating);
        if (e.energy_water) ids.push(e.energy_water);
        if (e.heat_heating) ids.push(e.heat_heating);
        if (e.heat_water) ids.push(e.heat_water);

        if (ids.length === 0) {
            if (requestId === this._fetchRequestId) this._data = null;
            return;
        }

        try {
            const stats = await this.hass.callWS({
                type: "recorder/statistics_during_period",
                start_time: start.toISOString(), end_time: end.toISOString(),
                statistic_ids: ids, period: period, types: ["change"],
            }) as RecorderStatisticsResult;
            if (requestId !== this._fetchRequestId) return;
            this._processData(stats, start, end);
        } catch (e) {
            if (requestId !== this._fetchRequestId) return;
            console.error("Fetch Error:", e);
        }
    }

    private _processData(stats: RecorderStatisticsResult, start: Date, end: Date): void {
        const e = this.config.entities;

        // Energy card uses hourly resolution for 12h/Day views (unlike Temp card which uses 5min)
        const resolution = (this._viewMode === '12h' || this._viewMode === 'day') ? 'hour' : undefined;

        const buckets = TimeSeriesProcessor.generateBuckets(start, end, {
            viewMode: this._viewMode,
            language: this.hass.language,
            resolution: resolution
        });

        const getSeries = (id: string | undefined) =>
            id ? TimeSeriesProcessor.aggregate(stats[id], buckets, 'sum') : new Array(buckets.length).fill(0);

        const energyHeating = getSeries(e.energy_heating) as number[];
        const energyWater = getSeries(e.energy_water) as number[];
        const heatHeating = getSeries(e.heat_heating) as number[];
        const heatWater = getSeries(e.heat_water) as number[];

        const cop: (number | null)[] = buckets.map((_, i) => {
            const energy = (energyHeating[i] || 0) + (energyWater[i] || 0);
            const heat = (heatHeating[i] || 0) + (heatWater[i] || 0);
            if (energy > 0.1) {
                let val = heat / energy;
                return val > 10 ? 10 : val;
            }
            return null;
        });

        // Calculate Totals
        const sum = (arr: number[]) => arr.reduce((a, b) => a + (b || 0), 0);
        const totalEnergyHeating = sum(energyHeating);
        const totalEnergyWater = sum(energyWater);
        const totalHeatHeating = sum(heatHeating);
        const totalHeatWater = sum(heatWater);
        const totalEnergy = totalEnergyHeating + totalEnergyWater;
        const totalHeat = totalHeatHeating + totalHeatWater;

        const chartData: ChartData = {
            labels: buckets.map(b => b.label),
            energyHeating, energyWater, heatHeating, heatWater, cop,
            totalEnergy, totalHeat,
            totalEnergyHeating, totalEnergyWater, totalHeatHeating, totalHeatWater
        };

        this._data = chartData;
    }

    protected _drawChart(): void {
        if (!this._data) return;
        const data = this._data;
        const canvas = this.renderRoot.querySelector("#chart") as HTMLCanvasElement | null;
        if (!canvas) return;

        // FIX: Read colors directly from config instead of waiting for CSS computed styles
        const getCol = (key: string, def: string) => hexToRgb(this.config.colors?.[key] || def);

        const heatingEnergyRgb = getCol('energy_heating', ENERGY_DEFAULTS.energy_heating);
        const dhwEnergyRgb = getCol('energy_water', ENERGY_DEFAULTS.energy_water);
        const heatingHeatRgb = getCol('heat_heating', ENERGY_DEFAULTS.heat_heating);
        const dhwHeatRgb = getCol('heat_water', ENERGY_DEFAULTS.heat_water);
        const rgbCop = getCol('cop', ENERGY_DEFAULTS.cop);

        const c = {
            heatingEnergyFill: `rgba(${heatingEnergyRgb}, 0.6)`, heatingEnergyBorder: `rgb(${heatingEnergyRgb})`,
            dhwEnergyFill: `rgba(${dhwEnergyRgb}, 0.6)`, dhwEnergyBorder: `rgb(${dhwEnergyRgb})`,
            heatingHeatFill: `rgba(${heatingHeatRgb}, 0.6)`, heatingHeatBorder: `rgb(${heatingHeatRgb})`,
            dhwHeatFill: `rgba(${dhwHeatRgb}, 0.6)`, dhwHeatBorder: `rgb(${dhwHeatRgb})`,
            cop: `rgb(${rgbCop})`,
            grid: this._getThemeVar('--divider-color') || '#e0e0e0',
            tick: this._getThemeVar('--secondary-text-color') || '#999'
        };

        let barPercentage = 0.8;
        if (this._viewMode === '12h' || this._viewMode === 'total') barPercentage = 0.5;

        const datasets: EnergyDataset[] = [];
        const e = this.config.entities;

        if ((e.energy_heating || e.energy_water) && (e.heat_heating || e.heat_water)) {
            datasets.push({
                label: "COP", data: data.cop, type: 'line',
                borderColor: c.cop, backgroundColor: c.cop, borderWidth: 2,
                pointRadius: 3, tension: 0.2, yAxisID: 'y1', order: 0, hidden: !this._visibility.cop, unit: ''
            });
        }

        const t = getTranslations(this.hass.language);
        if (e.energy_water) datasets.push({ label: `${t.energyShort}: ${t.dhwEnergyConsumption}`, data: data.energyWater, backgroundColor: c.dhwEnergyFill, borderColor: c.dhwEnergyBorder, borderWidth: 1, borderRadius: 2, stack: 'energy', yAxisID: 'y', order: 2, hidden: !this._visibility.energy, barPercentage: barPercentage, unit: 'kWh' });
        if (e.energy_heating) datasets.push({ label: `${t.energyShort}: ${t.heatingEnergyConsumption}`, data: data.energyHeating, backgroundColor: c.heatingEnergyFill, borderColor: c.heatingEnergyBorder, borderWidth: 1, borderRadius: 2, stack: 'energy', yAxisID: 'y', order: 2, hidden: !this._visibility.energy, barPercentage: barPercentage, unit: 'kWh' });
        if (e.heat_water) datasets.push({ label: `${t.heatShort}: ${t.dhwHeatProduction}`, data: data.heatWater, backgroundColor: c.dhwHeatFill, borderColor: c.dhwHeatBorder, borderWidth: 1, borderRadius: 2, stack: 'heat', yAxisID: 'y', order: 3, hidden: !this._visibility.heat, barPercentage: barPercentage, unit: 'kWh' });
        if (e.heat_heating) datasets.push({ label: `${t.heatShort}: ${t.heatingHeatProduction}`, data: data.heatHeating, backgroundColor: c.heatingHeatFill, borderColor: c.heatingHeatBorder, borderWidth: 1, borderRadius: 2, stack: 'heat', yAxisID: 'y', order: 3, hidden: !this._visibility.heat, barPercentage: barPercentage, unit: 'kWh' });

        const options = ChartConfigFactory.createOptions({
            type: 'bar',
            stacked: true,
            hasSecondaryAxis: true,
            symbol: '', // Mixed units (kWh, COP), so no global tooltip symbol
            yAxisTitle: 'kWh',
            y1AxisTitle: 'COP',
            fontColor: c.tick,
            gridColor: c.grid,
            darkMode: this.isDark
        });

        // Customize Secondary Axis (COP)
        if (options.scales?.y1) {
            options.scales.y1.display = this._visibility.cop;
            options.scales.y1.min = 0;
            options.scales.y1.suggestedMax = 6;
            options.scales.y1.ticks = {
                color: c.cop,
                font: { size: 10 }
            };
        }

        if (this._chart) {
            this._chart.data.labels = data.labels;
            this._chart.data.datasets = datasets;
            this._chart.options = options;
            this._updateChartWithTransition(this._chart);
            return;
        }

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        this._chart = new Chart(ctx, {
            type: "bar",
            data: { labels: data.labels, datasets: datasets },
            options: options
        });
    }

    protected render() {
        const t = getTranslations(this.hass?.language || 'en');
        if (!this._data) return html`<ha-card class="loading-card">${t.loading}</ha-card>`;
        const e = this.config.entities;
        const formatE = (v: number) => v >= 1000 ? (v / 1000).toFixed(2) + " MWh" : v.toFixed(1) + " kWh";
        const totalCOP = (this._data.totalEnergy > 0) ? (this._data.totalHeat / this._data.totalEnergy).toFixed(2) : "-.--";

        const tabs = [{ id: '12h', label: t.view12h }, { id: 'day', label: t.viewDay }, { id: 'month', label: t.viewMonth }, { id: 'year', label: t.viewYear }, { id: 'total', label: t.viewTotal }];
        const showEnergy = e.energy_heating || e.energy_water;
        const showHeat = e.heat_heating || e.heat_water;
        const showCOP = showEnergy && showHeat;

        return html`
      <ha-card>
        ${renderCardHeader({
            title: t.energyBalance,
            tabs,
            activeViewMode: this._viewMode,
            onViewModeChange: (mode) => this._handleViewModeChange(mode),
            dateLabel: this._formattedDateLabel,
            canGoNext: canGoNext(this._currentDate, this._viewMode),
            onPrevDate: () => this._handlePrevDate(),
            onNextDate: () => this._handleNextDate(),
            prevAriaLabel: t.previousPeriodAria,
            nextAriaLabel: t.nextPeriodAria
        })}

        <div class="chart-container"><canvas id="chart"></canvas></div>

        <div class="legend">
            ${showEnergy ?
                renderLegendItem(
                    t.totalEnergyConsumption,
                    `rgb(var(--c-energy-heating-rgb))`,
                    this._visibility.energy,
                    () => this._toggleSeries('energy'),
                    formatE(this._data.totalEnergy),
                    this._visibility.energy ? html`
                        ${e.energy_heating ? html`<div class="sub-row"><span class="dot" style="background: rgb(var(--c-energy-heating-rgb))"></span><span class="sub-lbl">${t.heatingEnergyConsumption}</span><span class="sub-val">${formatE(this._data.totalEnergyHeating)}</span></div>` : ''}
                        ${e.energy_water ? html`<div class="sub-row"><span class="dot" style="background: rgb(var(--c-energy-water-rgb))"></span><span class="sub-lbl">${t.dhwEnergyConsumption}</span><span class="sub-val">${formatE(this._data.totalEnergyWater)}</span></div>` : ''}
                    ` : undefined
                )
                : ''}

            ${showHeat ?
                renderLegendItem(
                    t.totalHeatProduction,
                    `rgb(var(--c-heat-heating-rgb))`,
                    this._visibility.heat,
                    () => this._toggleSeries('heat'),
                    formatE(this._data.totalHeat),
                    this._visibility.heat ? html`
                        ${e.heat_heating ? html`<div class="sub-row"><span class="dot" style="background: rgb(var(--c-heat-heating-rgb))"></span><span class="sub-lbl">${t.heatingHeatProduction}</span><span class="sub-val">${formatE(this._data.totalHeatHeating)}</span></div>` : ''}
                        ${e.heat_water ? html`<div class="sub-row"><span class="dot" style="background: rgb(var(--c-heat-water-rgb))"></span><span class="sub-lbl">${t.dhwHeatProduction}</span><span class="sub-val">${formatE(this._data.totalHeatWater)}</span></div>` : ''}
                    ` : undefined
                )
                : ''}

            ${showCOP ?
                renderLegendItem(t.efficiency, `rgb(var(--c-cop-rgb))`, this._visibility.cop, () => this._toggleSeries('cop'), totalCOP)
                : ''}
        </div>
      </ha-card>
    `;
    }

    static get styles() {
        return [
            HeatpumpBaseCard.baseStyles,
            cardHeaderStyles,
            legendItemStyles,
            styles
        ];
    }
}
