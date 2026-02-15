import { LitElement, html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { HomeAssistant, fireEvent } from 'custom-card-helpers';
import { getTranslations } from '../shared/utils/localization';
import { editorLayoutStyles } from '../shared/components/editor-layout';
import { cloneAndSetConfigPath } from '../shared/utils/config-updater';
import { HeatpumpInsightConfig } from '../types';

type ConfigTarget = EventTarget & { configValue?: string };

@customElement('heatpump-insight-card-editor')
export class HeatpumpInsightCardEditor extends LitElement {
    @property({ attribute: false }) public hass!: HomeAssistant;
    @state() private _config!: HeatpumpInsightConfig;

    public setConfig(config: HeatpumpInsightConfig): void {
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

    protected render() {
        if (!this.hass || !this._config) return html``;
        const t = getTranslations(this.hass.language);
        const s = this._config.settings || {};

        return html`
            <div class="card-config">
                <div class="section">
                    <h3>${t.insightDataSourcesTitle}</h3>
                    <div class="section-hint">${t.insightDataSourcesHint}</div>

                    <div class="field">
                        <ha-selector
                            .hass=${this.hass}
                            .selector=${{ entity: { domain: 'sensor', device_class: 'energy' } }}
                            .value=${this._config.entities?.energy_heating || ''}
                            .label=${t.energyHeatingSensor}
                            .configValue=${'entities.energy_heating'}
                            @value-changed=${this._valueChanged}
                        ></ha-selector>
                    </div>

                    <div class="field">
                        <ha-selector
                            .hass=${this.hass}
                            .selector=${{ entity: { domain: 'sensor', device_class: 'energy' } }}
                            .value=${this._config.entities?.energy_hotwater || ''}
                            .label=${t.energyHotwaterSensor}
                            .configValue=${'entities.energy_hotwater'}
                            @value-changed=${this._valueChanged}
                        ></ha-selector>
                    </div>

                    <div class="field">
                        <ha-selector
                            .hass=${this.hass}
                            .selector=${{ entity: { domain: 'sensor', device_class: 'temperature' } }}
                            .value=${this._config.entities?.outdoor_temp || ''}
                            .label=${t.temperatureSensor}
                            .configValue=${'entities.outdoor_temp'}
                            @value-changed=${this._valueChanged}
                        ></ha-selector>
                    </div>
                </div>

                <div class="section">
                    <h3>${t.insightFallbackTitle}</h3>
                    <div class="section-hint">${t.insightFallbackHint}</div>

                    <div class="field">
                        <ha-selector
                            .hass=${this.hass}
                            .selector=${{ entity: { domain: 'sensor', device_class: 'energy' } }}
                            .value=${this._config.entities?.energy_total || ''}
                            .label=${`${t.energySensor} (Fallback)`}
                            .configValue=${'entities.energy_total'}
                            @value-changed=${this._valueChanged}
                        ></ha-selector>
                    </div>
                </div>

                <div class="section">
                    <h3>${t.insightModelTitle}</h3>
                    <div class="field">
                        <ha-selector
                            .hass=${this.hass}
                            .selector=${{ number: { min: 10, max: 25, unit_of_measurement: '°C', mode: 'slider' } }}
                            .value=${s.heating_limit ?? 15}
                            .label=${t.heatingLimit}
                            .configValue=${'settings.heating_limit'}
                            @value-changed=${this._valueChanged}
                        ></ha-selector>
                    </div>
                </div>
            </div>
        `;
    }

    static get styles() {
        return [editorLayoutStyles];
    }
}
