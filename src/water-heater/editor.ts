import { LitElement, html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { HomeAssistant, fireEvent } from 'custom-card-helpers';
import { getTranslations } from '../shared/utils/localization';
import { getLocalizedColors, WATER_HEATER_DEFAULTS } from '../shared/config/const';
import { editorLayoutStyles } from '../shared/components/editor-layout';
import { cloneAndSetConfigPath } from '../shared/utils/config-updater';
import { HeatpumpWaterHeaterConfig } from '../types';

type ConfigTarget = EventTarget & { configValue?: string };

@customElement('heatpump-water-heater-card-editor')
export class HeatpumpWaterHeaterCardEditor extends LitElement {
    @property({ attribute: false }) public hass!: HomeAssistant;
    @state() private _config!: HeatpumpWaterHeaterConfig;

    public setConfig(config: HeatpumpWaterHeaterConfig): void {
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

    private _renderEntityField(label: string, key: string, selector: Record<string, unknown>) {
        const entities = this._config.entities as Record<string, string | undefined> | undefined;
        return html`
            <div class="field">
                <ha-selector
                    .hass=${this.hass}
                    .selector=${selector}
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
                    <div class="section-hint">${t.editorWaterHeaterDataHint}</div>

                    ${this._renderEntityField(
                        t.waterHeaterCurrentTempLabel,
                        'water_heater_current_temperature',
                        { entity: { domain: ['sensor', 'input_number', 'number', 'water_heater'], device_class: 'temperature' } }
                    )}
                </div>

                <div class="section">
                    <h3>${t.editorControlEntitiesTitle}</h3>
                    <div class="section-hint">${t.editorWaterHeaterControlsHint}</div>

                    ${this._renderEntityField(t.waterHeaterSetpointLabel, 'water_heater_setpoint', { entity: { domain: ['number', 'input_number', 'water_heater'] } })}
                    ${this._renderEntityField(t.waterHeaterOnceLabel, 'water_heater_once', { entity: { domain: ['switch', 'input_boolean'] } })}
                    ${this._renderEntityField(t.waterHeaterHysteresisOnLabel, 'water_heater_hysteresis_on', { entity: { domain: ['number', 'input_number'] } })}
                    ${this._renderEntityField(t.waterHeaterHysteresisOffLabel, 'water_heater_hysteresis_off', { entity: { domain: ['number', 'input_number'] } })}
                    ${this._renderEntityField(t.operationModeLabel, 'mode', { entity: { domain: ['select', 'input_select'] } })}
                    ${this._renderEntityField(t.circulationPumpLabel, 'circulation_pump', { entity: { domain: ['binary_sensor', 'input_boolean', 'switch'] } })}
                </div>

                <div class="section">
                    <h3>${t.editorAppearanceTitle}</h3>
                    <div class="section-hint">${t.editorWaterHeaterAppearanceHint}</div>

                    ${this._renderColorField(t.waterHeaterCurrentTempLabel, 'water_heater', WATER_HEATER_DEFAULTS.water_heater)}
                </div>
            </div>
        `;
    }

    static get styles() {
        return [editorLayoutStyles];
    }
}
