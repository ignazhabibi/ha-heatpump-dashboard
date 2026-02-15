import { LitElement, html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { HomeAssistant, fireEvent } from 'custom-card-helpers';
import { getTranslations } from '../shared/utils/localization';
import { getLocalizedColors, TEMP_DEFAULTS } from '../shared/config/const';
import { editorLayoutStyles } from '../shared/components/editor-layout';
import { cloneAndSetConfigPath } from '../shared/utils/config-updater';
import { HeatpumpTempConfig } from '../types';

type ConfigTarget = EventTarget & { configValue?: string };

@customElement('heatpump-temperature-card-editor')
export class HeatpumpTemperatureCardEditor extends LitElement {
    @property({ attribute: false }) public hass!: HomeAssistant;
    @state() private _config!: HeatpumpTempConfig;

    public setConfig(config: HeatpumpTempConfig): void {
        this._config = config;
    }

    private _valueChanged(ev: CustomEvent): void {
        if (!this._config || !this.hass) return;
        const target = ev.target as ConfigTarget;
        const key = target.configValue;
        if (!key) return;
        const value = ev.detail.value;

        const newConfig = cloneAndSetConfigPath(this._config, key, value);

        fireEvent(this, 'config-changed', { config: newConfig });
    }

    private _renderEntityField(label: string, key: string) {
        const entities = this._config.entities as Record<string, string | undefined> | undefined;
        return html`
            <div class="field">
                <ha-selector
                    .hass=${this.hass}
                    .selector=${{ entity: { domain: 'sensor', device_class: 'temperature' } }}
                    .value=${entities?.[key] || ''}
                    .label=${label}
                    .configValue=${`entities.${key}`}
                    @value-changed=${this._valueChanged}
                ></ha-selector>
            </div>
        `;
    }

    private _renderColorField(label: string, colorKey: string, defaultColor: string) {
        const t = getTranslations(this.hass.language);
        const currentColor = this._config.colors?.[colorKey] || defaultColor;
        return html`
            <div class="field">
                <div class="color-row">
                    <div class="color-selector">
                        <ha-selector
                            .hass=${this.hass}
                            .selector=${{ select: { options: getLocalizedColors(this.hass.language), mode: 'dropdown' } }}
                            .value=${currentColor}
                            .label=${`${label} · ${t.color}`}
                            .configValue=${`colors.${colorKey}`}
                            @value-changed=${this._valueChanged}
                        ></ha-selector>
                    </div>
                    <div class="color-dot" style="background-color: ${currentColor};"></div>
                </div>
            </div>
        `;
    }

    protected render() {
        if (!this.hass || !this._config) return html``;
        const t = getTranslations(this.hass.language);

        return html`
            <div class="card-config">
                <div class="section">
                    <h3>${t.editorDataSourcesTitle}</h3>
                    <div class="section-hint">${t.editorTemperatureDataHint}</div>

                    ${this._renderEntityField(t.commonSupplyTempLabel, 'flow')}
                    ${this._renderEntityField(t.heatingCircuitSupplyTempLabel, 'flow_circuit')}
                    ${this._renderEntityField(t.heatingCircuit2SupplyTempLabel, 'flow_circuit_2')}
                    ${this._renderEntityField(t.returnTempLabel, 'return')}
                </div>

                <div class="section">
                    <h3>${t.editorAppearanceTitle}</h3>
                    <div class="section-hint">${t.editorTemperatureAppearanceHint}</div>

                    ${this._renderColorField(t.commonSupplyTempLabel, 'flow', TEMP_DEFAULTS.flow)}
                    ${this._renderColorField(t.heatingCircuitSupplyTempLabel, 'flow_circuit', TEMP_DEFAULTS.flow_circuit)}
                    ${this._renderColorField(t.heatingCircuit2SupplyTempLabel, 'flow_circuit_2', TEMP_DEFAULTS.flow_circuit_2)}
                    ${this._renderColorField(t.returnTempLabel, 'return', TEMP_DEFAULTS.return)}
                    ${this._renderColorField(t.temperatureSpread, 'spread', TEMP_DEFAULTS.spread)}
                </div>
            </div>
        `;
    }

    static get styles() {
        return [editorLayoutStyles];
    }
}
