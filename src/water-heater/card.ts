import { html, PropertyValues, TemplateResult } from 'lit';
import { customElement, state } from 'lit/decorators.js';

import Chart from 'chart.js/auto';
import type { ChartDataset } from 'chart.js';
import { WATER_HEATER_DEFAULTS } from '../shared/config/const';
import { hexToRgb } from '../shared/utils/helpers';
import { getTranslations } from '../shared/utils/localization';
import { HeatpumpWaterHeaterConfig, WaterHeaterChartData } from '../types';
import { numberControlStyles, renderNumberControl, updateNumberEntity } from '../shared/components/number-control';
import { selectControlStyles, renderSelectControl, updateSelectEntity } from '../shared/components/select-control';
import { switchControlStyles, renderSwitchControl, toggleBinaryEntity } from '../shared/components/switch-control';
import { settingsViewStyles, renderSettingsView } from '../shared/components/settings-view';
import { legendItemStyles, renderLegendItem } from '../shared/components/legend-item';
import { cardHeaderStyles, renderCardHeader } from '../shared/components/card-header';
import { statusBadgeStyles, renderStatusBadge } from '../shared/components/status-badge';
import { canGoNext, calculateDateRange } from '../shared/utils/date-helpers';
import { TimeSeriesProcessor } from '../shared/utils/time-series-processor';
import { ChartConfigFactory } from '../shared/config/chart-config';
import { RecorderStatisticsResult } from '../shared/utils/ha-statistics';
import { readStorageJson, writeStorageJson } from '../shared/utils/storage';
import { HeatpumpBaseCard } from '../shared/base/base-card';
import { styles } from './styles';
import type { Translations } from '../shared/utils/localization';

type WaterHeaterDataset = ChartDataset<'line', (number | null)[]>;

@customElement('heatpump-water-heater-card')
export class HeatpumpWaterHeaterCard extends HeatpumpBaseCard {
    @state() declare config: HeatpumpWaterHeaterConfig; // Narrow the type
    @state() private _data: WaterHeaterChartData | null = null;
    @state() private _visibility = { water_heater: true };
    @state() private _showSettings = false;

    private _chart: Chart | null = null;
    private _fetchRequestId = 0;

    public static getStubConfig(): HeatpumpWaterHeaterConfig {
        return {
            type: 'custom:heatpump-water-heater-card',
            entities: { water_heater_current_temperature: "" },
            colors: { ...WATER_HEATER_DEFAULTS }
        };
    }

    public getGridOptions() { return { rows: 8, min_rows: 8, columns: 12, min_columns: 12 }; }
    public static getConfigElement() { return document.createElement("heatpump-water-heater-card-editor"); }

    public setConfig(config: HeatpumpWaterHeaterConfig): void {
        super.setConfig(config);
        this._loadVisibilityFromStorage();
    }

    // Generate unique storage key per card instance
    protected get _storageKey(): string {
        const configStr = JSON.stringify(this.config?.entities || {});
        return `water-heater-card-viewmode-${configStr}`;
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
        setC('water-heater', 'water_heater', WATER_HEATER_DEFAULTS.water_heater);

        // Tab styling handled by shared component
    }

    private _getThemeVar(varName: string): string { return getComputedStyle(this).getPropertyValue(varName).trim(); }

    private _toggleSeries(key: 'water_heater'): void {
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
        if (e.water_heater_current_temperature) ids.push(e.water_heater_current_temperature);

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

        const waterHeater = e.water_heater_current_temperature ?
            TimeSeriesProcessor.aggregate(stats[e.water_heater_current_temperature], buckets, 'mean') :
            new Array(buckets.length).fill(null);

        const chartData: WaterHeaterChartData = {
            labels: buckets.map(b => b.label),
            waterHeater: waterHeater,
            avgWaterHeater: TimeSeriesProcessor.calculateAverage(waterHeater)?.toFixed(1) || "-"
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

        const waterHeaterRgb = getCol('water_heater', WATER_HEATER_DEFAULTS.water_heater);

        const c = {
            waterHeater: `rgb(${waterHeaterRgb})`,
            grid: this._getThemeVar('--divider-color') || '#e0e0e0',
            tick: this._getThemeVar('--secondary-text-color') || '#999'
        };

        const datasets: WaterHeaterDataset[] = [];
        const e = this.config.entities;

        const t = getTranslations(this.hass.language);
        if (e.water_heater_current_temperature) datasets.push({ label: t.waterHeaterCurrentTemp, data: data.waterHeater, borderColor: c.waterHeater, backgroundColor: c.waterHeater, borderWidth: 1.5, pointRadius: 0, hidden: !this._visibility.water_heater });

        const options = ChartConfigFactory.createOptions({
            type: 'line',
            symbol: '°C',
            beginAtZero: false,
            fontColor: c.tick,
            gridColor: c.grid,
            darkMode: this.isDark
        });

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

        const curW = e.water_heater_current_temperature ? (this.hass.states[e.water_heater_current_temperature]?.state || "-") : "-";

        let isFuture = this._viewMode === 'total' ? false : new Date(this._currentDate) > new Date();
        if (!isFuture && this._viewMode !== 'total') {
            let d = new Date(this._currentDate);
            if (this._viewMode === '12h') d.setHours(d.getHours() + 12);
            else if (this._viewMode === 'day') d.setDate(d.getDate() + 1);
            else if (this._viewMode === 'month') d.setMonth(d.getMonth() + 1);
            else d.setFullYear(d.getFullYear() + 1);
            isFuture = d > new Date();
        }

        const tabs = [{ id: '12h', label: t.view12h }, { id: 'day', label: t.viewDay }, { id: 'month', label: t.viewMonth }, { id: 'year', label: t.viewYear }, { id: 'total', label: t.viewTotal }];

        const waterHeaterRgb = hexToRgb(this.config.colors?.water_heater || WATER_HEATER_DEFAULTS.water_heater);

        return html`
      <ha-card>
        ${renderCardHeader({
            title: t.waterHeater,
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

        <div class="card-footer">
            <div class="legend">
                ${e.water_heater_current_temperature ?
                renderLegendItem(
                    t.waterHeaterCurrentTemp,
                    `rgb(${waterHeaterRgb})`,
                    this._visibility.water_heater,
                    () => this._toggleSeries('water_heater'),
                    html`<span class="now">${curW}°</span> <span class="avg">Ø ${this._data.avgWaterHeater}°</span>`
                ) : ''}
            </div>
            
            <div class="footer-actions">
                <div class="footer-status-row">
                    ${e.circulation_pump ? this._renderCirculationPump(t) : ''}
                    ${e.water_heater_once ? this._renderOneTimeCharge(t) : ''}
                </div>
                <button type="button" class="action-button ${this._showSettings ? 'active' : ''}" @click=${() => this._showSettings = !this._showSettings}>
                    <ha-icon icon="mdi:cog"></ha-icon>
                    <span>${t.settings}</span>
                </button>
            </div>

            ${this._showSettings ? this._renderSettings(t) : ''}
        </div>
      </ha-card>
    `;
    }

    private _renderCirculationPump(t: Translations): TemplateResult {
        const entityId = this.config.entities.circulation_pump;
        if (!entityId || !this.hass.states[entityId]) return html``;

        const state = this.hass.states[entityId].state;
        const isOn = state === 'on';

        return renderStatusBadge(
            isOn ? t.circulationOn : t.circulationOff,
            'mdi:pump',
            isOn
        );
    }

    private _renderOneTimeCharge(t: Translations): TemplateResult {
        const entityId = this.config.entities.water_heater_once;
        if (!entityId || !this.hass.states[entityId]) return html``;

        const state = this.hass.states[entityId].state;
        const isOn = state === 'on';

        return renderStatusBadge(
            isOn ? t.onceOn : t.onceOff,
            'mdi:water-boiler',
            isOn
        );
    }

    private _renderSettings(t: Translations): TemplateResult {
        const e = this.config.entities;

        // Mode mapping
        const modeEntityId = e.mode;
        const modeStateObj = modeEntityId ? this.hass.states[modeEntityId] : null;
        const modeOptions = modeStateObj?.attributes.options || [];
        const modeMapping = {
            'efficientWithMinComfort': t.modeKomfort,
            'efficient': t.modeEco,
            'off': t.modeOff
        };

        return renderSettingsView(t.settings, html`
            <!-- Primary Controls Section -->
            <div class="settings-content">
                ${e.water_heater_once ? html`
                    <div class="settings-row">
                        <div class="settings-label">${t.waterHeaterOnce}</div>
                        ${renderSwitchControl(
            t.waterHeaterOnce,
            'mdi:water-boiler',
            this.hass.states[e.water_heater_once!]?.state === 'on',
            () => toggleBinaryEntity(this.hass, e.water_heater_once!)
        )}
                    </div>
                ` : ''}

                ${e.water_heater_setpoint ? html`
                    <div class="settings-row">
                        <div class="settings-label">${t.waterHeaterSetpoint}</div>
                        ${renderNumberControl(
            this.hass.states[e.water_heater_setpoint]?.state || "-",
            "°C",
            () => updateNumberEntity(this.hass, e.water_heater_setpoint!, -1),
            () => updateNumberEntity(this.hass, e.water_heater_setpoint!, 1)
        )}
                    </div>
                ` : ''}

                ${modeEntityId ? html`
                    <div class="settings-row">
                        <div class="settings-label">${t.operationMode}</div>
                        ${renderSelectControl(
            this.hass,
            modeEntityId,
            modeOptions,
            (val) => updateSelectEntity(this.hass, modeEntityId, val),
            undefined,
            modeMapping
        )}
                    </div>
                ` : ''}

                <!-- Hysteresis Section -->
                ${(e.water_heater_hysteresis_on || e.water_heater_hysteresis_off) ? html`
                    <div class="settings-divider"></div>
                    ${e.water_heater_hysteresis_on ? html`
                        <div class="settings-row">
                            <div class="settings-label">${t.waterHeaterHysteresisOn}</div>
                            ${renderNumberControl(
            this.hass.states[e.water_heater_hysteresis_on]?.state || "-",
            "K",
            () => updateNumberEntity(this.hass, e.water_heater_hysteresis_on!, -1),
            () => updateNumberEntity(this.hass, e.water_heater_hysteresis_on!, 1)
        )}
                        </div>
                    ` : ''}
                    ${e.water_heater_hysteresis_off ? html`
                        <div class="settings-row">
                            <div class="settings-label">${t.waterHeaterHysteresisOff}</div>
                            ${renderNumberControl(
            this.hass.states[e.water_heater_hysteresis_off]?.state || "-",
            "K",
            () => updateNumberEntity(this.hass, e.water_heater_hysteresis_off!, -1),
            () => updateNumberEntity(this.hass, e.water_heater_hysteresis_off!, 1)
        )}
                        </div>
                    ` : ''}
                ` : ''}
            </div>
        `, () => this._showSettings = false, t.closeSettingsAria);
    }

    static get styles() {
        return [
            HeatpumpBaseCard.baseStyles,
            cardHeaderStyles,
            numberControlStyles,
            selectControlStyles,
            switchControlStyles,
            settingsViewStyles,
            legendItemStyles,
            statusBadgeStyles,
            styles
        ];
    }
}
