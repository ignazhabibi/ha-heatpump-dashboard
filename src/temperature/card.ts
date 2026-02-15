
import { html, PropertyValues } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import Chart from 'chart.js/auto';
import type { ChartDataset } from 'chart.js';
import { TEMP_DEFAULTS } from '../shared/config/const';
import { hexToRgb } from '../shared/utils/helpers';
import { getTranslations } from '../shared/utils/localization';
import { HeatpumpTempConfig, TempChartData } from '../types';
import { legendItemStyles, renderLegendItem } from '../shared/components/legend-item';
import { cardHeaderStyles, renderCardHeader } from '../shared/components/card-header';
import { canGoNext, calculateDateRange } from '../shared/utils/date-helpers';
import { TimeSeriesProcessor } from '../shared/utils/time-series-processor';
import { ChartConfigFactory } from '../shared/config/chart-config';
import { RecorderStatisticsResult } from '../shared/utils/ha-statistics';
import { readStorageJson, writeStorageJson } from '../shared/utils/storage';
import { HeatpumpBaseCard } from '../shared/base/base-card';
import { styles } from './styles';

type TemperatureDataset = ChartDataset<'line', (number | null)[]> & { unit?: string };

@customElement('heatpump-temperature-card')
export class HeatpumpTemperatureCard extends HeatpumpBaseCard {
    @state() declare config: HeatpumpTempConfig; // Narrow the type
    @state() private _data: TempChartData | null = null;
    @state() private _visibility = { flow: true, return: true, flow_circuit: true, flow_circuit_2: true, spread: false };

    private _chart: Chart | null = null;
    private _fetchRequestId = 0;
    public static getStubConfig(): HeatpumpTempConfig {
        return {
            type: 'custom:heatpump-temperature-card',
            entities: { flow: "", return: "", flow_circuit: "" },
            colors: { ...TEMP_DEFAULTS }
        };
    }

    public getGridOptions() { return { rows: 8, min_rows: 8, columns: 12, min_columns: 12 }; }
    public static getConfigElement() { return document.createElement("heatpump-temperature-card-editor"); }

    public setConfig(config: HeatpumpTempConfig): void {
        super.setConfig(config);
        this._loadVisibilityFromStorage();
    }

    // Generate unique storage key per card instance. Overriding to match previous behavior if needed, or use base.
    // Using base implementation logic but customized for this card's legacy or preference.
    // Actually, let's rely on Base Card's _storageKey for consistency, but we need it for visibility too.
    protected get _storageKey(): string {
        const configStr = JSON.stringify(this.config?.entities || {});
        return `temperature-card-viewmode-${configStr}`;
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
        setC('flow', 'flow', TEMP_DEFAULTS.flow);
        setC('return', 'return', TEMP_DEFAULTS.return);
        setC('flow-circuit', 'flow_circuit', TEMP_DEFAULTS.flow_circuit);
        setC('flow-circuit-2', 'flow_circuit_2', TEMP_DEFAULTS.flow_circuit_2);
        setC('spread', 'spread', TEMP_DEFAULTS.spread);
    }

    private _getThemeVar(varName: string): string { return getComputedStyle(this).getPropertyValue(varName).trim(); }

    private _toggleSeries(key: 'flow' | 'return' | 'flow_circuit' | 'flow_circuit_2' | 'spread'): void {
        this._visibility = { ...this._visibility, [key]: !this._visibility[key] };
        this._saveVisibilityToStorage();
    }



    protected async _fetchData(): Promise<void> {
        if (!this.hass || !this.config.entities) return;
        const requestId = ++this._fetchRequestId;
        let { start, end, period } = calculateDateRange(this._currentDate, this._viewMode);

        // Override period for high-resolution views
        if (this._viewMode === '12h' || this._viewMode === 'day') {
            period = '5minute';
        }

        const ids: string[] = [];
        const e = this.config.entities;
        if (e.flow) ids.push(e.flow);
        if (e.return) ids.push(e.return);
        if (e.flow_circuit) ids.push(e.flow_circuit);
        if (e.flow_circuit_2) ids.push(e.flow_circuit_2);

        if (ids.length === 0) {
            if (requestId === this._fetchRequestId) this._data = null;
            return;
        }

        try {
            const stats = await this.hass.callWS({
                type: "recorder/statistics_during_period",
                start_time: start.toISOString(), end_time: end.toISOString(),
                statistic_ids: ids, period: period, types: ["mean"],
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
        const resolution = (this._viewMode === '12h' || this._viewMode === 'day') ? '5minute' : undefined;

        const buckets = TimeSeriesProcessor.generateBuckets(start, end, {
            viewMode: this._viewMode,
            language: this.hass.language,
            resolution: resolution
        });

        const flow = e.flow ? TimeSeriesProcessor.aggregate(stats[e.flow], buckets, 'mean') : new Array(buckets.length).fill(null);
        const ret = e.return ? TimeSeriesProcessor.aggregate(stats[e.return], buckets, 'mean') : new Array(buckets.length).fill(null);
        const flowCircuit = e.flow_circuit ? TimeSeriesProcessor.aggregate(stats[e.flow_circuit], buckets, 'mean') : new Array(buckets.length).fill(null);
        const flowCircuit2 = e.flow_circuit_2 ? TimeSeriesProcessor.aggregate(stats[e.flow_circuit_2], buckets, 'mean') : new Array(buckets.length).fill(null);

        const spread = buckets.map((_, i) => {
            if (flow[i] !== null && ret[i] !== null) return (flow[i] as number) - (ret[i] as number);
            return null;
        });

        const chartData: TempChartData = {
            labels: buckets.map(b => b.label),
            flow: flow,
            return: ret,
            flowCircuit: flowCircuit,
            flowCircuit2: flowCircuit2,
            spread: spread,
            avgFlow: TimeSeriesProcessor.calculateAverage(flow)?.toFixed(1) || "-",
            avgReturn: TimeSeriesProcessor.calculateAverage(ret)?.toFixed(1) || "-",
            avgFlowCircuit: TimeSeriesProcessor.calculateAverage(flowCircuit)?.toFixed(1) || "-",
            avgFlowCircuit2: TimeSeriesProcessor.calculateAverage(flowCircuit2)?.toFixed(1) || "-",
            avgSpread: TimeSeriesProcessor.calculateAverage(spread)?.toFixed(1) || "-"
        };

        this._data = chartData;
    }

    protected _drawChart(): void {
        if (!this._data) return;
        const data = this._data;
        const canvas = this.renderRoot.querySelector("#chart") as HTMLCanvasElement | null;
        if (!canvas) return;

        // FIX: Read colors directly from config
        const getCol = (key: string, def: string) => hexToRgb(this.config.colors?.[key] || def);

        const commonSupplyRgb = getCol('flow', TEMP_DEFAULTS.flow);
        const returnTempRgb = getCol('return', TEMP_DEFAULTS.return);
        const heatingCircuitSupplyRgb = getCol('flow_circuit', TEMP_DEFAULTS.flow_circuit);
        const heatingCircuit2SupplyRgb = getCol('flow_circuit_2', TEMP_DEFAULTS.flow_circuit_2);
        const spreadRgb = getCol('spread', TEMP_DEFAULTS.spread);

        const c = {
            commonSupply: `rgb(${commonSupplyRgb})`,
            returnTemp: `rgb(${returnTempRgb})`,
            heatingCircuitSupply: `rgb(${heatingCircuitSupplyRgb})`,
            heatingCircuit2Supply: `rgb(${heatingCircuit2SupplyRgb})`,
            spread: `rgb(${spreadRgb})`,
            grid: this._getThemeVar('--divider-color') || '#e0e0e0',
            tick: this._getThemeVar('--secondary-text-color') || '#999'
        };

        const datasets: TemperatureDataset[] = [];
        const e = this.config.entities;

        const t = getTranslations(this.hass.language);
        if (e.flow) datasets.push({ label: t.commonSupplyTemp, data: data.flow, borderColor: c.commonSupply, backgroundColor: c.commonSupply, borderWidth: 1.5, pointRadius: 0, hidden: !this._visibility.flow });
        if (e.flow_circuit) datasets.push({ label: t.heatingCircuitSupplyTemp, data: data.flowCircuit, borderColor: c.heatingCircuitSupply, backgroundColor: c.heatingCircuitSupply, borderWidth: 1.5, pointRadius: 0, hidden: !this._visibility.flow_circuit });
        if (e.flow_circuit_2) datasets.push({ label: t.heatingCircuit2SupplyTemp, data: data.flowCircuit2, borderColor: c.heatingCircuit2Supply, backgroundColor: c.heatingCircuit2Supply, borderWidth: 1.5, pointRadius: 0, hidden: !this._visibility.flow_circuit_2 });
        if (e.return) datasets.push({ label: t.returnTemp, data: data.return, borderColor: c.returnTemp, backgroundColor: c.returnTemp, borderWidth: 1.5, pointRadius: 0, hidden: !this._visibility.return });

        // Spread dataset with secondary Y-axis
        if (e.flow && e.return) datasets.push({
            label: t.temperatureSpread,
            data: data.spread,
            borderColor: c.spread,
            backgroundColor: c.spread,
            borderWidth: 1,  // Thinner line
            borderDash: [5, 5],  // Dashed line
            pointRadius: 0,
            yAxisID: 'y1',  // Secondary axis
            hidden: !this._visibility.spread,
            unit: 'K'
        });

        const options = ChartConfigFactory.createOptions({
            type: 'line',
            symbol: '°C',
            beginAtZero: false,
            hasSecondaryAxis: true,
            y1AxisTitle: 'K',
            fontColor: c.tick,
            gridColor: c.grid,
            darkMode: this.isDark
        });

        // Customize Secondary Axis (Spread)
        if (options.scales?.y1) {
            options.scales.y1.display = this._visibility.spread;
            options.scales.y1.max = 20;
            options.scales.y1.ticks = {
                color: c.tick,
                font: { size: 10 }
            };
        }

        if (this._chart) {
            this._chart.data.labels = data.labels;
            this._chart.data.datasets = datasets as unknown as typeof this._chart.data.datasets;
            this._chart.options = options;
            this._updateChartWithTransition(this._chart);
            return;
        }

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        this._chart = new Chart(ctx, {
            type: "line",
            data: { labels: data.labels, datasets: datasets as unknown as Chart['data']['datasets'] },
            options: options
        });
    }

    protected render() {
        const t = getTranslations(this.hass?.language || 'en');
        if (!this._data) return html`<ha-card class="loading-card">${t.loading}</ha-card>`;
        const e = this.config.entities;

        const curV = e.flow ? (this.hass.states[e.flow]?.state || "-") : "-";
        const curR = e.return ? (this.hass.states[e.return]?.state || "-") : "-";
        const curHK = e.flow_circuit ? (this.hass.states[e.flow_circuit]?.state || "-") : "-";
        const curHK2 = e.flow_circuit_2 ? (this.hass.states[e.flow_circuit_2]?.state || "-") : "-";
        const curSpread = (e.flow && e.return && curV !== "-" && curR !== "-")
            ? (parseFloat(curV) - parseFloat(curR)).toFixed(1)
            : "-";

        const tabs = [{ id: '12h', label: t.view12h }, { id: 'day', label: t.viewDay }, { id: 'month', label: t.viewMonth }, { id: 'year', label: t.viewYear }, { id: 'total', label: t.viewTotal }];

        return html`
      <ha-card>
        ${renderCardHeader({
            title: t.temperatures,
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
            ${e.flow ?
                renderLegendItem(t.commonSupplyTemp, `rgb(var(--c-flow-rgb))`, this._visibility.flow, () => this._toggleSeries('flow'), html`<span class="now">${curV}°</span> <span class="avg">Ø ${this._data.avgFlow}°</span>`)
                : ''}
            
            ${e.flow_circuit ?
                renderLegendItem(t.heatingCircuitSupplyTemp, `rgb(var(--c-flow-circuit-rgb))`, this._visibility.flow_circuit, () => this._toggleSeries('flow_circuit'), html`<span class="now">${curHK}°</span> <span class="avg">Ø ${this._data.avgFlowCircuit}°</span>`)
                : ''}

            ${e.flow_circuit_2 ?
                renderLegendItem(t.heatingCircuit2SupplyTemp, `rgb(var(--c-flow-circuit-2-rgb))`, this._visibility.flow_circuit_2, () => this._toggleSeries('flow_circuit_2'), html`<span class="now">${curHK2}°</span> <span class="avg">Ø ${this._data.avgFlowCircuit2}°</span>`)
                : ''}

            ${e.return ?
                renderLegendItem(t.returnTemp, `rgb(var(--c-return-rgb))`, this._visibility.return, () => this._toggleSeries('return'), html`<span class="now">${curR}°</span> <span class="avg">Ø ${this._data.avgReturn}°</span>`)
                : ''}

            ${e.flow && e.return ?
                renderLegendItem(t.temperatureSpread, `rgb(var(--c-spread-rgb))`, this._visibility.spread, () => this._toggleSeries('spread'), html`<span class="now">${curSpread} K</span> <span class="avg">Ø ${this._data.avgSpread} K</span>`)
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
