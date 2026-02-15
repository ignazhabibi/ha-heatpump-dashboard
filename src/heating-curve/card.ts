import { html, PropertyValues } from 'lit';
import type { TemplateResult } from 'lit';
import type { HomeAssistant } from 'custom-card-helpers';
import { customElement, state } from 'lit/decorators.js';
import { ChartConfigFactory } from '../shared/config/chart-config';
import Chart from 'chart.js/auto';
import type { ChartDataset } from 'chart.js';
import { HEATING_CURVE_DEFAULTS } from '../shared/config/const';
import { hexToRgb } from '../shared/utils/helpers';
import { getTranslations } from '../shared/utils/localization';
import { HeatingCurveConfig, HeatingCurveData } from '../types';
import { numberControlStyles, renderNumberControl, updateNumberEntity } from '../shared/components/number-control';
import { switchControlStyles } from '../shared/components/switch-control';
import { settingsViewStyles, renderSettingsView } from '../shared/components/settings-view';
import { legendItemStyles, renderLegendItem } from '../shared/components/legend-item';
import { renderStatusBadge, statusBadgeStyles } from '../shared/components/status-badge';
import { renderTimeSelector, timeSelectorStyles } from '../shared/components/time-selector';
import { HeatpumpBaseCard } from '../shared/base/base-card';
import { styles } from './styles';
import { RecorderStatisticPoint, RecorderStatisticsResult } from '../shared/utils/ha-statistics';
import type { Translations } from '../shared/utils/localization';

interface HeatingCurveHistoryPoint {
    timestamp: number;
    outdoor: number | null;
    flow: number | null;
    pump?: boolean | null;
}

interface PumpHistoryState {
    last_changed: string;
    state: string;
}

type HeatingCurveDataset = ChartDataset<'line' | 'scatter', { x: number; y: number }[]>;

@customElement('heatpump-heating-curve-card')
export class HeatpumpHeatingCurveCard extends HeatpumpBaseCard {
    @state() protected declare config: HeatingCurveConfig;
    @state() private _data: HeatingCurveData | null = null;
    @state() private _formula: 'standard' | 'viessmann' = 'standard';
    @state() private _isPlaying = false;
    @state() private _playbackIndex = 0;
    @state() private _isHistoryMode = false;
    @state() private _historyPeriod: '24h' | '7d' = '24h';
    @state() private _playbackSpeed: 0.5 | 1 | 2 = 1;
    @state() private _showSettings = false;
    @state() private _historyData: HeatingCurveHistoryPoint[] = [];
    @state() private _trendData: HeatingCurveHistoryPoint[] = [];
    @state() private _liveOutdoor: number | undefined = undefined;
    @state() private _liveFlow: number | undefined = undefined;

    private _playbackInterval: number | null = null;
    private _chart: Chart | null = null;
    private _prevEntityStates: Record<string, string> = {};
    private _lastTrendFetchTs = 0;
    private _historyRequestId = 0;
    private _trendRequestId = 0;

    public static getStubConfig(): HeatingCurveConfig {
        return {
            type: 'custom:heatpump-heating-curve-card',
            entities: { slope: "", shift: "", outdoor_temp: "", room_temp_setpoint: "" },
            colors: { ...HEATING_CURVE_DEFAULTS }
        };
    }

    public getCardSize(): number { return 8; }

    public getGridOptions() { return { rows: 8, min_rows: 8, columns: 12, min_columns: 8 }; }
    public static getConfigElement() { return document.createElement("heatpump-heating-curve-card-editor"); }

    public setConfig(config: HeatingCurveConfig): void {
        super.setConfig(config);
        this._formula = config.formula || 'standard';
    }

    public disconnectedCallback(): void {
        super.disconnectedCallback();
        this._stopAnimation();
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

        // Optimize Theme Update: Only if dark mode changed
        const oldHass = changedProps.get("hass") as HomeAssistant | undefined;
        const oldDark = Boolean((oldHass?.themes as { darkMode?: boolean } | undefined)?.darkMode);
        const newDark = Boolean((this.hass?.themes as { darkMode?: boolean } | undefined)?.darkMode);

        if (oldHass && this.hass && oldDark !== newDark) {
            this._updateThemeColors();
        } else if (!oldHass && this.hass) {
            this._updateThemeColors(); // Initial
        }

        // Redraw if data exists but chart was destroyed (e.g. after Edit Mode)
        if (this._data && !this._chart) {
            this._drawChart();
        } else if (changedProps.has("_data") && this._data) {
            this._drawChart();
        }
        if (changedProps.has("_formula")) {
            this._fetchData();
        }

        // Lightweight update for animation
        if (
            changedProps.has("_playbackIndex") ||
            changedProps.has("_isHistoryMode") ||
            changedProps.has("_liveOutdoor") ||
            changedProps.has("_liveFlow")
        ) {
            this._updateChartPoint();
        }

        // Auto-update when entity values change
        if (changedProps.has("hass") && this.hass && this._hasFetchedInitial) {
            const e = this.config.entities;
            const staticEntityIds = [
                e.slope, e.shift, e.flow_temp_min,
                e.flow_temp_max, e.room_temp_setpoint
            ].filter(Boolean) as string[];
            const liveEntityIds = [
                e.outdoor_temp, e.current_flow_temp
            ].filter(Boolean) as string[];
            const allEntityIds = [...staticEntityIds, ...liveEntityIds];

            if (Object.keys(this._prevEntityStates).length === 0) {
                for (const id of allEntityIds) {
                    const current = this.hass.states[id]?.state;
                    if (current !== undefined) this._prevEntityStates[id] = current;
                }
                this._syncLivePointFromStates();
                return;
            }

            let staticChanged = false;
            let liveChanged = false;

            for (const id of staticEntityIds) {
                const newState = this.hass.states[id]?.state;
                if (newState !== undefined && this._prevEntityStates[id] !== newState) {
                    staticChanged = true;
                    this._prevEntityStates[id] = newState;
                }
            }

            for (const id of liveEntityIds) {
                const newState = this.hass.states[id]?.state;
                if (newState !== undefined && this._prevEntityStates[id] !== newState) {
                    liveChanged = true;
                    this._prevEntityStates[id] = newState;
                }
            }

            if (staticChanged) {
                this._fetchData();
            } else if (liveChanged) {
                this._syncLivePointFromStates();
                const now = Date.now();
                if (now - this._lastTrendFetchTs > 120000) {
                    this._lastTrendFetchTs = now;
                    this._fetchTrendData();
                }
            }
        }
    }

    private _updateThemeColors(): void {
        const cfg = this.config.colors || {};
        const setC = (name: string, key: string, defaultHex: string) => {
            const val = cfg[key] || defaultHex;
            const rgb = hexToRgb(val);
            if (rgb) this.style.setProperty(`--c-${name}-rgb`, rgb);
        };
        setC('curve', 'curve', HEATING_CURVE_DEFAULTS.curve);
        setC('limits', 'limits', HEATING_CURVE_DEFAULTS.limits);
        setC('current-point', 'current_point', HEATING_CURVE_DEFAULTS.current_point);
    }

    private _getThemeVar(varName: string): string {
        return getComputedStyle(this).getPropertyValue(varName).trim();
    }

    private _readNumberState(entityId?: string): number | null {
        if (!entityId) return null;
        const raw = this.hass.states[entityId]?.state;
        if (raw === undefined || raw === null || raw === '') return null;
        const parsed = Number(raw);
        return Number.isFinite(parsed) ? parsed : null;
    }

    private _syncLivePointFromStates(): void {
        const e = this.config.entities;
        const outdoor = this._readNumberState(e.outdoor_temp);
        const flow = this._readNumberState(e.current_flow_temp);
        this._liveOutdoor = outdoor ?? undefined;
        this._liveFlow = flow ?? undefined;
    }

    protected async _fetchData(): Promise<void> {
        const e = this.config.entities;

        // Get parameters from entity states
        const slope = this._readNumberState(e.slope);
        const shift = this._readNumberState(e.shift);
        const room_setpoint = this._readNumberState(e.room_temp_setpoint) ?? 20;
        const outdoor_temp = this._readNumberState(e.outdoor_temp);
        const current_flow = this._readNumberState(e.current_flow_temp);
        const min_limit = this._readNumberState(e.flow_temp_min);
        const max_limit = this._readNumberState(e.flow_temp_max);

        if (slope === null || shift === null) {
            this._data = null;
            return;
        }

        // Generate curve data points from -30 to +20
        const outdoor_temps: number[] = [];
        const flow_temps: number[] = [];

        for (let temp = -30; temp <= 20; temp++) {
            outdoor_temps.push(temp);
            const calculated = this._calculateTemp(temp, slope, shift, room_setpoint);
            const clamped = this._clampToLimits(calculated, min_limit, max_limit);
            flow_temps.push(clamped);
        }

        this._liveOutdoor = outdoor_temp ?? undefined;
        this._liveFlow = current_flow ?? undefined;

        this._data = {
            outdoor_temps,
            flow_temps,
            current_outdoor: outdoor_temp ?? undefined,
            current_flow: current_flow ?? undefined,
            min_limit: min_limit ?? undefined,
            max_limit: max_limit ?? undefined,
            slope,
            shift,
            room_setpoint
        };

        // Fetch history for playback in background
        this._fetchHistory();
        this._lastTrendFetchTs = Date.now();
        this._fetchTrendData();
    }

    private async _fetchHistory(): Promise<void> {
        if (!this._data || !this.hass) return;
        const e = this.config.entities;
        if (!e.outdoor_temp || !e.current_flow_temp) return;
        const requestId = ++this._historyRequestId;

        const end = new Date();
        // 24h = 5min, 7d = hour
        const duration = this._historyPeriod === '24h' ? 24 * 60 * 60 * 1000 : 7 * 24 * 60 * 60 * 1000;
        const period = this._historyPeriod === '24h' ? '5minute' : 'hour';
        const start = new Date(end.getTime() - duration);

        try {
            // 1. Fetch Statistics for Temperatures
            const statsPromise = this.hass.callWS({
                type: "recorder/statistics_during_period",
                start_time: start.toISOString(), end_time: end.toISOString(),
                statistic_ids: [e.outdoor_temp, e.current_flow_temp],
                period: period,
                types: ["mean"]
            });

            // 2. Fetch State History for Pump (if configured)
            // Use history/period API via callApi to get raw state changes for binary_sensor
            let pumpHistoryPromise: Promise<PumpHistoryState[] | PumpHistoryState[][]> = Promise.resolve([]);
            if (e.heating_circuit_pump) {
                // We fetch history for the same period. 
                // Using minimal_response to get only state/last_changed
                const startIso = start.toISOString();
                const endIso = end.toISOString();
                const entity = e.heating_circuit_pump;
                // Note: callApi path for history is `history/period/<timestamp>`
                pumpHistoryPromise = this.hass.callApi('GET', `history/period/${startIso}?filter_entity_id=${entity}&end_time=${endIso}&minimal_response`);
            }

            const [stats, pumpHistoryRaw] = await Promise.all([statsPromise, pumpHistoryPromise]);
            if (requestId !== this._historyRequestId) return;

            const statsResult = stats as RecorderStatisticsResult;
            const outdoor = statsResult[e.outdoor_temp] || [];
            const flow = statsResult[e.current_flow_temp] || [];

            // Flatten pump history (API returns array of arrays, one per entity)
            const pumpHistoryPoints = (Array.isArray(pumpHistoryRaw) && pumpHistoryRaw.length > 0)
                ? (pumpHistoryRaw[0] as PumpHistoryState[])
                : [];

            // Merge stats by timestamp
            // We use the stats timestamps as the reference points for the chart
            const timeMap = new Map<number, { outdoor?: number, flow?: number, pump?: boolean }>();

            // Setup Pump State Iterator
            let pumpIdx = 0;
            // Initial pump state needed? Ideally we find the state just before 'start', but history/period usually includes it if significant?
            // Actually, history/period starts with the state at 'start' if it didn't change exactly then? 
            // Often it returns changes within the window. We might miss the initial state if it didn't change.
            // But for now, let's assume we scan forward.

            const getPumpStateAt = (timestamp: number): boolean | null => {
                if (pumpHistoryPoints.length === 0) return null;

                // Advance pumpIdx until we pass the timestamp
                while (pumpIdx < pumpHistoryPoints.length - 1) {
                    const nextPt = pumpHistoryPoints[pumpIdx + 1];
                    const nextTime = new Date(nextPt.last_changed).getTime();
                    if (nextTime <= timestamp) {
                        pumpIdx++;
                    } else {
                        break;
                    }
                }

                // Current pumpIdx is the last state change before or at timestamp
                // But we must also check if the *first* point is already passed timestamp? 
                // (Shouldn't happen if we fetched from start)

                const pt = pumpHistoryPoints[pumpIdx];
                const ptTime = new Date(pt.last_changed).getTime();

                // If the very first point in history is already AFTER our target timestamp, 
                // we technically don't know the state (unless we fetched context).
                // But usually history/period includes the state at start time as a virtual entry?
                // Let's assume it works or we default to false/null.

                if (ptTime > timestamp) return null; // Should not happen if API behaves

                return pt.state === 'on';
            };

            const addToMap = (arr: RecorderStatisticPoint[], key: 'outdoor' | 'flow') => {
                arr.forEach(pt => {
                    if (pt.mean === null || pt.mean === undefined) return;
                    const t = new Date(pt.start).getTime();
                    // Align time to period
                    const grain = this._historyPeriod === '24h' ? 300000 : 3600000;
                    const roundedT = Math.round(t / grain) * grain;

                    if (!timeMap.has(roundedT)) timeMap.set(roundedT, {});
                    const entry = timeMap.get(roundedT)!;
                    entry[key] = pt.mean;

                    // Resolve pump state for this timestamp if pump exists
                    if (e.heating_circuit_pump && entry.pump === undefined) {
                        const pState = getPumpStateAt(roundedT);
                        if (pState !== null) entry.pump = pState;
                    }
                });
            };

            addToMap(outdoor, 'outdoor');
            addToMap(flow, 'flow');

            // Convert map to sorted array
            const sortedTimes = Array.from(timeMap.keys()).sort((a, b) => a - b);

            let lastOutdoor: number | null = null;
            let lastFlow: number | null = null;
            let lastPump: boolean | null = null;

            const history: HeatingCurveHistoryPoint[] = [];
            sortedTimes.forEach(t => {
                const entry = timeMap.get(t)!;
                if (entry.outdoor !== undefined) lastOutdoor = entry.outdoor;
                if (entry.flow !== undefined) lastFlow = entry.flow;
                if (entry.pump !== undefined) lastPump = entry.pump;
                else if (lastPump !== null) entry.pump = lastPump; // Carry forward pump state gaps

                if (lastOutdoor !== null && lastFlow !== null) {
                    history.push({
                        timestamp: t,
                        outdoor: lastOutdoor,
                        flow: lastFlow,
                        pump: lastPump
                    });
                }
            });

            if (this._data) {
                this._historyData = history;
                // If we are already in history mode (re-fetch), limit index
                if (this._playbackIndex >= history.length) this._playbackIndex = history.length - 1;
            }

        } catch (err) {
            console.error("Failed to fetch history for playback", err);
        }
    }

    private async _fetchTrendData(): Promise<void> {
        if (!this.hass) return;
        const e = this.config.entities;
        if (!e.outdoor_temp || !e.current_flow_temp) return;
        const requestId = ++this._trendRequestId;

        // Always fetch last 2 hours at 5min resolution for stable Live Trend
        const end = new Date();
        const start = new Date(end.getTime() - 2 * 60 * 60 * 1000); // 2 hours

        try {
            const stats = await this.hass.callWS({
                type: "recorder/statistics_during_period",
                start_time: start.toISOString(), end_time: end.toISOString(),
                statistic_ids: [e.outdoor_temp, e.current_flow_temp],
                period: '5minute',
                types: ["mean"]
            }) as RecorderStatisticsResult;
            if (requestId !== this._trendRequestId) return;

            const outdoorStats = stats[e.outdoor_temp] || [];
            const flowStats = stats[e.current_flow_temp] || [];

            // Merge stats
            const trendData: HeatingCurveHistoryPoint[] = [];
            const timeMap = new Map<number, { outdoor?: number, flow?: number }>();

            const addToMap = (arr: RecorderStatisticPoint[], key: 'outdoor' | 'flow') => {
                arr.forEach(pt => {
                    if (pt.mean === null || pt.mean === undefined) return;
                    const t = new Date(pt.start).getTime();
                    // Align to 5min
                    const grain = 300000;
                    const roundedT = Math.round(t / grain) * grain;
                    if (!timeMap.has(roundedT)) timeMap.set(roundedT, {});
                    const entry = timeMap.get(roundedT)!;
                    entry[key] = pt.mean;
                });
            };

            addToMap(outdoorStats, 'outdoor');
            addToMap(flowStats, 'flow');

            const sortedTimes = Array.from(timeMap.keys()).sort((a, b) => a - b);

            let lastOutdoor: number | null = null;
            let lastFlow: number | null = null;

            sortedTimes.forEach(t => {
                const entry = timeMap.get(t)!;
                if (entry.outdoor !== undefined) lastOutdoor = entry.outdoor;
                if (entry.flow !== undefined) lastFlow = entry.flow;

                if (lastOutdoor !== null && lastFlow !== null) {
                    trendData.push({
                        timestamp: t,
                        outdoor: lastOutdoor,
                        flow: lastFlow
                    });
                }
            });

            this._trendData = trendData;
        } catch (err) {
            console.error("Failed to fetch trend data", err);
        }
    }

    private _calculateTemp(outdoor: number, slope: number, shift: number, room_setpoint: number): number {
        if (this._formula === 'viessmann') {
            // Verified Viessmann formula
            const DAR = outdoor - room_setpoint;
            const dampingTerm = 1.4347 + 0.021 * DAR + 247.9e-6 * DAR * DAR;
            return room_setpoint + shift - slope * DAR * dampingTerm;
        } else {
            // Standard formula
            return room_setpoint + shift + slope * (room_setpoint - outdoor);
        }
    }

    private _clampToLimits(temp: number, min: number | null, max: number | null): number {
        if (max !== null && temp > max) return max;
        if (min !== null && temp < min) return min;
        return temp;
    }

    private _updateChartPoint(): void {
        if (!this._chart || !this._data) return;

        // Find the "Current Point" dataset (it's the scatter one, usually last)
        const datasetIndex = this._chart.data.datasets.findIndex(d => d.type === 'scatter');
        if (datasetIndex === -1) return;

        let curOutdoor: number | undefined;
        let curFlow: number | undefined;

        if (this._isHistoryMode && this._historyData && this._historyData.length > 0) {
            const pt = this._historyData[this._playbackIndex];
            if (pt) {
                curOutdoor = pt.outdoor ?? undefined;
                curFlow = pt.flow ?? undefined;
            }
        } else {
            curOutdoor = this._liveOutdoor ?? this._data.current_outdoor;
            curFlow = this._liveFlow ?? this._data.current_flow;
        }

        if (curOutdoor !== undefined && curFlow !== undefined) {
            this._chart.data.datasets[datasetIndex].data = [{ x: curOutdoor, y: curFlow }];
        } else {
            this._chart.data.datasets[datasetIndex].data = [];
        }

        this._chart.update('none'); // Efficient update without animation
    }

    private _togglePlay(): void {
        if (!this._historyData || this._historyData.length === 0) return;

        this._isPlaying = !this._isPlaying;
        this._isHistoryMode = true;

        if (this._isPlaying) {
            // Zoom in for dynamic effect!
            this._zoomToHistory();

            // If at end, restart
            if (this._playbackIndex >= this._historyData.length - 1) {
                this._playbackIndex = 0;
            }
            this._startAnimation();
        } else {
            this._stopAnimation();
        }
    }

    private _zoomToHistory(): void {
        if (!this._chart || !this._historyData || this._historyData.length === 0) return;

        // Calculate bounds from history
        let minX = 100, maxX = -100, minY = 100, maxY = -100;

        this._historyData.forEach(pt => {
            if (pt.outdoor !== null) {
                if (pt.outdoor < minX) minX = pt.outdoor;
                if (pt.outdoor > maxX) maxX = pt.outdoor;
            }
            if (pt.flow !== null) {
                if (pt.flow < minY) minY = pt.flow;
                if (pt.flow > maxY) maxY = pt.flow;
            }
        });

        // Add padding (at least 2 degrees X, 5 degrees Y)
        const padX = Math.max(2, (maxX - minX) * 0.1);
        const padY = Math.max(5, (maxY - minY) * 0.1);

        minX -= padX;
        maxX += padX;
        minY -= padY;
        maxY += padY;

        // Updates scales with animation
        const options = this._chart.options.scales!;

        if (options.x) {
            options.x.min = minX;
            options.x.max = maxX;
        }
        if (options.y) {
            options.y.min = minY;
            options.y.max = maxY;
        }

        this._chart.update();
    }

    private _resetZoom(): void {
        if (!this._chart || !this._data) return;

        // Default X range
        const options = this._chart.options.scales!;
        if (options.x) {
            options.x.min = -30;
            options.x.max = 20;
        }

        // Default Y range (re-calculate logic from _drawChart)
        const yMin = this._data.min_limit !== undefined ? Math.max(0, this._data.min_limit - 5) : 15;
        const yMax = this._data.max_limit !== undefined ? this._data.max_limit + 5 : 70;

        if (options.y) {
            options.y.min = yMin;
            options.y.max = yMax;
        }

        this._chart.update();
    }



    private _startAnimation(): void {
        if (this._playbackInterval) clearInterval(this._playbackInterval);

        // Base 1x = 120ms
        // 2x = 60ms
        // 0.5x = 240ms
        const interval = 120 / this._playbackSpeed;

        this._playbackInterval = window.setInterval(() => {
            if (!this._historyData) return;

            this._playbackIndex++;

            if (this._playbackIndex >= this._historyData.length) {
                // Playback finished
                this._exitHistoryMode();
            }
        }, interval);
    }

    private _stopAnimation(): void {
        if (this._playbackInterval) {
            clearInterval(this._playbackInterval);
            this._playbackInterval = null;
        }
    }

    private _onSliderChange(e: Event): void {
        const target = e.target as HTMLInputElement | null;
        if (!target) return;
        const val = parseInt(target.value);
        this._playbackIndex = val;
        // Auto-enter history mode on scrub
        if (!this._isHistoryMode) {
            this._isHistoryMode = true;
        }
        this._isPlaying = false; // Stop playing when user scrubs
        this._stopAnimation();
    }

    private _exitHistoryMode(): void {
        this._isPlaying = false;
        this._isHistoryMode = false;
        this._stopAnimation();
        // Reset to live values
        this._playbackIndex = (this._historyData?.length || 0) - 1;
        this._resetZoom();
    }

    private _setHistoryPeriod(period: '24h' | '7d'): void {
        if (this._historyPeriod === period) return;
        this._historyPeriod = period;
        this._stopAnimation();
        this._isPlaying = false;
        // Refetch with new period
        this._fetchHistory().then(() => {
            // Reset slider to end
            this._playbackIndex = (this._historyData?.length || 0) - 1;
            // Force drawing update if in history mode (likely needs chart update)
            if (this._isHistoryMode) this._updateChartPoint();
            // Zoom reset on period change handled by _drawChart or implied reset
        });
    }



    protected _drawChart(): void {
        const canvas = this.shadowRoot?.querySelector('#heatingCurveChart') as HTMLCanvasElement;
        if (!canvas || !this._data) return;

        const cfg = this.config.colors || {};
        const curveColor = cfg.curve || HEATING_CURVE_DEFAULTS.curve;
        const limitsColor = cfg.limits || HEATING_CURVE_DEFAULTS.limits;
        const currentColor = cfg.current_point || HEATING_CURVE_DEFAULTS.current_point;

        // Get dynamic Y-axis range
        const yMin = this._data.min_limit !== undefined ? Math.max(0, this._data.min_limit - 5) : 15;
        const yMax = this._data.max_limit !== undefined ? this._data.max_limit + 5 : 70;

        const t = getTranslations(this.hass.language);
        const isDark = this.isDark;
        const gridColor = this._getThemeVar('--divider-color') || '#e0e0e0';
        const tickColor = this._getThemeVar('--secondary-text-color') || '#999';

        // Prepare Datasets
        const datasets: HeatingCurveDataset[] = [
            {
                label: t.heatingCurve,
                data: this._data.outdoor_temps.map((x, i) => ({ x, y: this._data!.flow_temps[i] })),
                type: 'line',
                borderColor: curveColor,
                backgroundColor: curveColor,
                borderWidth: 2,
                pointRadius: 0,
                tension: 0,
                order: 2
            }
        ];

        // Add min limit line
        if (this._data.min_limit !== undefined) {
            datasets.push({
                label: `${t.minShort}: ${this._data.min_limit}°C`,
                data: [{ x: -30, y: this._data.min_limit }, { x: 20, y: this._data.min_limit }],
                type: 'line',
                borderColor: limitsColor,
                borderWidth: 2,
                borderDash: [5, 5],
                pointRadius: 0,
                order: 3
            });
        }

        // Add max limit line
        if (this._data.max_limit !== undefined) {
            datasets.push({
                label: `${t.maxShort}: ${this._data.max_limit}°C`,
                data: [{ x: -30, y: this._data.max_limit }, { x: 20, y: this._data.max_limit }],
                type: 'line',
                borderColor: limitsColor,
                borderWidth: 2,
                borderDash: [5, 5],
                pointRadius: 0,
                order: 3
            });
        }

        // Add current operating point
        let curOutdoor = this._liveOutdoor ?? this._data.current_outdoor;
        let curFlow = this._liveFlow ?? this._data.current_flow;
        let labelPrefix = t.currentOperatingPoint;

        // Overwrite with history if active
        if (this._isHistoryMode && this._historyData && this._historyData.length > 0) {
            const historyPt = this._historyData[this._playbackIndex];
            if (historyPt) {
                curOutdoor = historyPt.outdoor ?? undefined;
                curFlow = historyPt.flow ?? undefined;
                const date = new Date(historyPt.timestamp);
                const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                labelPrefix = `${timeStr} `;
            }
        }

        if (curOutdoor !== undefined && curFlow !== undefined) {
            datasets.push({
                label: `${labelPrefix}: ${curOutdoor.toFixed(1)}°C / ${curFlow.toFixed(1)}°C`,
                data: [{ x: curOutdoor, y: curFlow }],
                type: 'scatter',
                backgroundColor: currentColor,
                borderColor: currentColor,
                pointRadius: 6,
                pointHoverRadius: 8,
                order: 1
            });
        }

        // If chart exists, update it
        if (this._chart) {
            this._chart.data.datasets = datasets as unknown as typeof this._chart.data.datasets;

            // Update Options (Y-Axis Range & Colors)
            if (this._chart.options.scales?.y) {
                this._chart.options.scales.y.min = yMin;
                this._chart.options.scales.y.max = yMax;
                // Update grid/tick colors in case of theme change
                if (this._chart.options.scales.y.grid) this._chart.options.scales.y.grid.color = gridColor;
                if (this._chart.options.scales.y.ticks) this._chart.options.scales.y.ticks.color = tickColor;
            }
            if (this._chart.options.scales?.x) {
                if (this._chart.options.scales.x.ticks) this._chart.options.scales.x.ticks.color = tickColor;
            }

            this._chart.update();
            return;
        }

        // Create new chart if it doesn't exist
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const options = ChartConfigFactory.createOptions({
            type: 'line',
            symbol: '°C',
            xAxisTitle: '°C',
            yAxisTitle: '°C',
            beginAtZero: false,
            fontColor: tickColor,
            gridColor: gridColor,
            darkMode: isDark,
            yMin: yMin,
            yMax: yMax
        });

        // Ensure chart fills the container (flex-grow)
        options.maintainAspectRatio = false;

        if (options.scales?.x) {
            options.scales.x.type = 'linear';
            options.scales.x.min = -30;
            options.scales.x.max = 20;
        }

        if (options.scales?.y) {
            options.scales.y.ticks = {
                // Fix Jitter: Force fixed decimals (now integers)
                callback: (val) => typeof val === 'number' ? val.toFixed(0) : val,
                font: { size: 10 }
            };
        }

        if (options.interaction) {
            options.interaction.mode = 'nearest';
        }

        this._chart = new Chart(ctx, {
            type: 'line',
            data: { datasets: datasets as unknown as Chart['data']['datasets'] },
            options: options
        });
    }

    protected render() {
        const t = getTranslations(this.hass?.language || 'en');

        // Format current values for legend
        let curOutdoor = this._liveOutdoor !== undefined
            ? this._liveOutdoor.toFixed(1)
            : '-';
        let curFlow = this._liveFlow !== undefined
            ? this._liveFlow.toFixed(1)
            : '-';
        // History Overrides
        let timeLabel = "";
        let isHistoryReady = this._historyData && this._historyData.length > 0;

        if (this._isHistoryMode && isHistoryReady) {
            const pt = this._historyData[this._playbackIndex];
            if (pt) {
                curOutdoor = pt.outdoor !== null ? pt.outdoor.toFixed(1) : '-';
                curFlow = pt.flow !== null ? pt.flow.toFixed(1) : '-';

                const d = new Date(pt.timestamp);
                const now = new Date();
                const isToday = d.toDateString() === now.toDateString();
                const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                timeLabel = isToday ? timeStr : d.toLocaleDateString([], { weekday: 'short' }) + " " + timeStr;
            }
        }


        // Calculate trends
        let outdoorTrend: 'up' | 'down' | 'flat' | null = null;
        let flowTrend: 'up' | 'down' | 'flat' | null = null;

        if (this._isHistoryMode) {
            // PLAYBACK MODE: Use History Data (with standardized ~1h interval)
            if (this._historyData && this._historyData.length > 1) {
                const currentIdx = this._playbackIndex;
                const stepsBack = this._historyPeriod === '24h' ? 12 : 1;
                const prevIdx = currentIdx - stepsBack;

                if (currentIdx >= 0 && prevIdx >= 0) {
                    const currentPt = this._historyData[currentIdx];
                    const prevPt = this._historyData[prevIdx];
                    if (currentPt && prevPt) {
                        outdoorTrend = this._getTrend(currentPt.outdoor, prevPt.outdoor);
                        flowTrend = this._getTrend(currentPt.flow, prevPt.flow);
                    }
                }
            }
        } else {
            // LIVE MODE: Use dedicated Trend Data (Always 2h / 5min res)
            // Compare Now vs ~1h ago (12 steps of 5min)
            if (this._trendData && this._trendData.length > 12) {
                const currentIdx = this._trendData.length - 1;
                const prevIdx = currentIdx - 12; // 1 hour ago

                const currentPt = this._trendData[currentIdx];
                const prevPt = this._trendData[prevIdx];

                if (currentPt && prevPt) {
                    outdoorTrend = this._getTrend(currentPt.outdoor, prevPt.outdoor);
                    flowTrend = this._getTrend(currentPt.flow, prevPt.flow);
                }
            }
        }

        const renderTrend = (trend: 'up' | 'down' | 'flat' | null) => {
            if (!trend) return html``;
            if (trend === 'flat') return html`<span class="trend flat">●</span>`;
            if (trend === 'up') return html`<span class="trend up">↑</span>`;
            return html`<span class="trend down">↓</span>`;
        };

        return html`
            <ha-card>
            <div class="header">
                    <div class="top-row">
                        <div class="title">${t.heatingCurve}</div>
                        ${this._isHistoryMode && timeLabel ? html`
                            <div class="header-time">${timeLabel}</div>
                        ` : ''}
                    </div>
                
                    <div class="playback-bar">
                        ${renderTimeSelector(
            [{ id: '24h', label: '24h' }, { id: '7d', label: '7d' }],
            this._historyPeriod,
            (id) => this._setHistoryPeriod(id as '24h' | '7d')
        )}

                        <button
                            type="button"
                            class="playback-btn ${!isHistoryReady ? 'disabled' : ''}"
                            .disabled=${!isHistoryReady}
                            aria-label=${this._isPlaying ? t.pausePlaybackAria : t.startPlaybackAria}
                            @click=${this._togglePlay}
                        >
                            <ha-icon class="playback-icon" icon="${this._isPlaying ? 'mdi:pause' : 'mdi:play'}"></ha-icon>
                        </button>
                        
                        <input 
                            type="range" 
                            class="playback-slider ${!isHistoryReady ? 'disabled' : ''}"
                            min="0" 
                            max="${(this._historyData?.length || 1) - 1}" 
                            .value="${this._isHistoryMode ? this._playbackIndex : (this._historyData?.length || 1) - 1}" 
                            @input=${this._onSliderChange}
                        >
                        
                        <button
                            type="button"
                            class="live-badge ${!this._isHistoryMode ? 'active' : ''} ${!isHistoryReady ? 'disabled' : ''}"
                            .disabled=${!isHistoryReady}
                            aria-pressed=${!this._isHistoryMode ? 'true' : 'false'}
                            @click=${this._exitHistoryMode}
                        >
                            <span>${t.liveNow}</span>
                        </button>
                    </div>
                </div>
                
                <div class="chart-container">
                    <canvas id="heatingCurveChart"></canvas>
                </div>

                <div class="card-footer">
                    <div class="legend">
                        ${renderLegendItem(
            t.outdoorTempLabel,
            `rgb(var(--c-current-point-rgb))`,
            true, // Always visible
            undefined,
            html`<div class="vals"><span class="now">${curOutdoor}°C</span>${renderTrend(outdoorTrend)}</div>`
        )}

                        ${renderLegendItem(
            t.currentFlowTempLabel,
            `rgb(var(--c-current-point-rgb))`,
            true, // Always visible
            undefined,
            html`<div class="vals"><span class="now">${curFlow}°C</span>${renderTrend(flowTrend)}</div>`
        )}
                    </div>
                    
                    <div class="footer-actions">
                        <div class="footer-status-row">
                            ${this.config.entities.heating_circuit_pump ? this._renderHeatingPump(t) : ''}
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

    private _renderHeatingPump(t: Translations): TemplateResult {
        const entityId = this.config.entities.heating_circuit_pump;
        if (!entityId || !this.hass.states[entityId]) return html``;

        const state = this.hass.states[entityId].state;
        const isOn = state === 'on';

        return renderStatusBadge(
            isOn ? t.heatingCircuitPumpOn : t.heatingCircuitPumpOff,
            "mdi:pump",
            isOn
        );
    }

    private _renderSettings(t: Translations): TemplateResult {
        const e = this.config.entities;

        return renderSettingsView(t.settings, html`
            <div class="settings-content">
                <!-- Curve Adjustment Section -->
                <div class="settings-row">
                    <div class="settings-label">${t.slopeLabel}</div>
                    ${renderNumberControl(
            this._data?.slope?.toFixed(2) || '-',
            "",
            () => updateNumberEntity(this.hass, e.slope!, -1),
            () => updateNumberEntity(this.hass, e.slope!, 1)
        )}
                </div>

                <div class="settings-row">
                    <div class="settings-label">${t.shiftLabel}</div>
                    ${renderNumberControl(
            this._data?.shift?.toFixed(1) || '-',
            "",
            () => updateNumberEntity(this.hass, e.shift!, -1),
            () => updateNumberEntity(this.hass, e.shift!, 1)
        )}
                </div>

                ${e.room_temp_setpoint ? html`
                    <div class="settings-row">
                        <div class="settings-label">${t.roomTempSetpointLabel}</div>
                        ${renderNumberControl(
            this._data?.room_setpoint?.toFixed(1) || '-',
            "°C",
            () => updateNumberEntity(this.hass, e.room_temp_setpoint!, -1),
            () => updateNumberEntity(this.hass, e.room_temp_setpoint!, 1)
        )}
                    </div>
                ` : ''}

                <!-- Limits Section -->
                <div class="settings-divider"></div>
                
                ${e.flow_temp_min ? html`
                    <div class="settings-row">
                        <div class="settings-label">${t.flowTempMinLabel}</div>
                        ${renderNumberControl(
            this.hass.states[e.flow_temp_min]?.state || "-",
            "°C",
            () => updateNumberEntity(this.hass, e.flow_temp_min!, -1),
            () => updateNumberEntity(this.hass, e.flow_temp_min!, 1)
        )}
                    </div>
                ` : ''}

                ${e.flow_temp_max ? html`
                    <div class="settings-row">
                        <div class="settings-label">${t.flowTempMaxLabel}</div>
                        ${renderNumberControl(
            this.hass.states[e.flow_temp_max]?.state || "-",
            "°C",
            () => updateNumberEntity(this.hass, e.flow_temp_max!, -1),
            () => updateNumberEntity(this.hass, e.flow_temp_max!, 1)
        )}
                    </div>
                ` : ''}
            </div>
        `, () => this._showSettings = false, t.closeSettingsAria);
    }



    private _getTrend(current: number | null, prev: number | null): 'up' | 'down' | 'flat' | null {
        if (current === null || prev === null) return null;
        const diff = current - prev;
        if (Math.abs(diff) < 0.01) return 'flat';
        return diff > 0 ? 'up' : 'down';
    }

    static get styles() {
        return [
            HeatpumpBaseCard.baseStyles,
            numberControlStyles,
            switchControlStyles,
            settingsViewStyles,
            legendItemStyles,
            statusBadgeStyles,
            timeSelectorStyles,
            styles
        ];
    }
}
