import { LitElement, html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { HomeAssistant, fireEvent } from 'custom-card-helpers';
import { getTranslations } from '../shared/utils/localization';
import { getLocalizedColors, HEATING_CURVE_DEFAULTS } from '../shared/config/const';
import { editorLayoutStyles } from '../shared/components/editor-layout';
import { cloneAndSetConfigPath } from '../shared/utils/config-updater';
import { HeatingCurveConfig } from '../types';

type ConfigTarget = EventTarget & { configValue?: string };

@customElement('heatpump-heating-curve-card-editor')
export class HeatpumpHeatingCurveCardEditor extends LitElement {
    @property({ attribute: false }) public hass!: HomeAssistant;
    @state() private _config!: HeatingCurveConfig;

    public setConfig(config: HeatingCurveConfig): void {
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

    private _renderEntityField(label: string, key: string, domains: string[] = ['number', 'input_number']) {
        const entities = this._config.entities as Record<string, string | undefined> | undefined;
        return html`
            <div class="field">
                <ha-selector
                    .hass=${this.hass}
                    .selector=${{ entity: { domain: domains } }}
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
                    <div class="section-hint">${t.editorHeatingCurveDataHint}</div>

                    ${this._renderEntityField(t.slopeLabel, 'slope')}
                    ${this._renderEntityField(t.shiftLabel, 'shift')}
                    ${this._renderEntityField(`${t.roomTempSetpointLabel} ${t.roomTempSetpointHint}`, 'room_temp_setpoint')}
                    ${this._renderEntityField(t.outdoorTempLabel, 'outdoor_temp', ['sensor', 'number'])}
                    ${this._renderEntityField(t.flowTempMinLabel, 'flow_temp_min')}
                    ${this._renderEntityField(t.flowTempMaxLabel, 'flow_temp_max')}
                    ${this._renderEntityField(t.currentFlowTempLabel, 'current_flow_temp', ['sensor', 'number'])}
                </div>

                <div class="section">
                    <h3>${t.editorFormulaTitle}</h3>
                    <div class="section-hint">${t.editorHeatingCurveFormulaHint}</div>

                    <div class="field">
                        <ha-selector
                            .hass=${this.hass}
                            .selector=${{
                                select: {
                                    options: [
                                        { value: 'standard', label: t.standardFormula },
                                        { value: 'viessmann', label: t.viessmannFormula }
                                    ],
                                    mode: 'dropdown'
                                }
                            }}
                            .value=${this._config.formula || 'standard'}
                            .label=${t.formulaSettingLabel}
                            .configValue=${'formula'}
                            @value-changed=${this._valueChanged}
                        ></ha-selector>
                    </div>
                </div>

                <div class="section">
                    <h3>${t.editorOptionalEntitiesTitle}</h3>
                    <div class="section-hint">${t.editorHeatingCurveOptionalHint}</div>

                    ${this._renderEntityField(t.heatingCircuitPumpLabel, 'heating_circuit_pump', ['binary_sensor', 'switch', 'input_boolean'])}
                </div>

                <div class="section">
                    <h3>${t.editorAppearanceTitle}</h3>
                    <div class="section-hint">${t.editorHeatingCurveAppearanceHint}</div>

                    ${this._renderColorField(t.heatingCurve, 'curve', HEATING_CURVE_DEFAULTS.curve)}
                    ${this._renderColorField(`Min/Max ${t.flowTempMinLabel}`, 'limits', HEATING_CURVE_DEFAULTS.limits)}
                    ${this._renderColorField(t.currentOperatingPoint, 'current_point', HEATING_CURVE_DEFAULTS.current_point)}
                </div>
            </div>
        `;
    }

    static get styles() {
        return [editorLayoutStyles];
    }
}
