import { LitElement, PropertyValues } from 'lit';
import { property, state } from 'lit/decorators.js';
import { HomeAssistant, LovelaceCardConfig } from 'custom-card-helpers';
import { ViewMode, formatDateLabel, normalizeDateForViewMode, shiftDate } from '../utils/date-helpers';
import { getTranslations } from '../utils/localization';
import { readStorageItem, writeStorageItem } from '../utils/storage';
import { cloneConfig } from '../utils/config-updater';
import { baseCardStyles } from './styles';

export abstract class HeatpumpBaseCard extends LitElement {
    @property({ attribute: false }) public hass!: HomeAssistant;
    @state() protected config!: LovelaceCardConfig; // Type can be refined in subclasses
    @state() protected _viewMode: ViewMode = 'day';
    @state() protected _currentDate: Date = new Date();
    @state() protected _hasFetchedInitial = false;
    protected _animateNextChartUpdate = false;

    // Abstract methods to be implemented by subclasses
    protected abstract _fetchData(): Promise<void>;
    protected abstract _drawChart(): void;

    public setConfig(config: LovelaceCardConfig): void {
        if (!config) throw new Error("Invalid configuration");
        this.config = cloneConfig(config);
        this._loadViewModeFromStorage();
    }

    protected updated(changedProps: PropertyValues): void {
        super.updated(changedProps);

        if (changedProps.has("hass") && this.hass) {
            this._updateGlobalThemeVars();
        }

        // Initial Fetch
        if (changedProps.has("hass") && this.hass && !this._hasFetchedInitial && this.config) {
            this._hasFetchedInitial = true;
            this._fetchData();
        }

        // View Mode or Date changed
        if (changedProps.has("_viewMode") || changedProps.has("_currentDate")) {
            this._fetchData();
        }
    }

    protected _updateGlobalThemeVars(): void {
        if (!this.hass) return;
        const isDark = this.isDark;

        this.style.setProperty('--tab-bg', isDark ? '#2c2c2e' : '#f2f2f7');
        this.style.setProperty('--tab-active', isDark ? '#48484a' : '#ffffff');
        this.style.setProperty('--tab-text', isDark ? '#fff' : '#000');
    }

    // --- Common Helpers ---

    /**
     * Generates the unique storage key for this card instance based on entities.
     * Subclasses can override this if they have a specific way to identify uniqueness.
     */
    protected get _storageKey(): string {
        const cfg = this.config as LovelaceCardConfig & { entities?: Record<string, string | undefined> };
        const entities = cfg.entities || {};
        const configStr = JSON.stringify(entities);
        return `heatpump-card-${this.tagName.toLowerCase()}-${configStr}`;
    }

    protected _loadViewModeFromStorage(): void {
        const stored = readStorageItem(this._storageKey + '-viewmode');
        if (['12h', 'day', 'month', 'year', 'total'].includes(stored as string)) {
            this._viewMode = stored as ViewMode;
        }
    }

    protected _saveViewModeToStorage(): void {
        writeStorageItem(this._storageKey + '-viewmode', this._viewMode);
    }

    /**
     * Returns true if dark mode is active in Home Assistant.
     */
    protected get isDark(): boolean {
        const themes = this.hass?.themes as { darkMode?: boolean } | undefined;
        return Boolean(themes?.darkMode);
    }

    protected get _formattedDateLabel(): string {
        const t = getTranslations(this.hass?.language || 'en');
        return formatDateLabel(this._currentDate, this._viewMode, this.hass?.language, t.allTimeHistory);
    }

    // --- Event Handlers ---

    protected _handleViewModeChange(mode: ViewMode): void {
        this._currentDate = normalizeDateForViewMode(this._currentDate, mode);
        this._viewMode = mode;
        this._animateNextChartUpdate = true;
        this._saveViewModeToStorage();
    }

    protected _handlePrevDate(): void {
        this._animateNextChartUpdate = true;
        this._currentDate = shiftDate(this._currentDate, this._viewMode, 'prev');
    }

    protected _handleNextDate(): void {
        this._animateNextChartUpdate = true;
        this._currentDate = shiftDate(this._currentDate, this._viewMode, 'next');
    }

    protected _requestChartTransition(): void {
        this._animateNextChartUpdate = true;
    }

    protected _updateChartWithTransition(chart: { update: (mode?: 'none') => void }): void {
        if (this._animateNextChartUpdate) {
            this._animateNextChartUpdate = false;
            chart.update();
            return;
        }
        chart.update('none');
    }

    static get baseStyles() {
        return baseCardStyles;
    }
}
