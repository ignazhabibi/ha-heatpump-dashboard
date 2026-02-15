import { html, css } from 'lit';
import { HomeAssistant } from 'custom-card-helpers';

export const numberControlStyles = css`
    .control-box {
        /* Match Tab Group Container */
        background: color-mix(in srgb, var(--primary-text-color), transparent 96%);
        border-radius: 16px; 
        height: 40px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 0 4px;
    }
    .control-box.readonly {
        justify-content: center;
        color: var(--secondary-text-color);
    }
    
    .ctrl-btn {
        width: 32px;
        height: 32px;
        border-radius: 12px;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        color: var(--secondary-text-color);
        transition: all 0.2s;
        border: none;
        background: transparent;
        padding: 0;
    }
    .ctrl-btn:hover {
        /* Hover: Match Tab Hover */
        background: color-mix(in srgb, var(--primary-text-color), transparent 90%);
        color: var(--primary-text-color);
    }
    .ctrl-btn:focus-visible {
        outline: 2px solid var(--primary-color);
        outline-offset: 1px;
    }
    .ctrl-btn ha-icon {
        --mdc-icon-size: 20px;
    }
    
    .value {
        font-size: 1.0rem;
        font-weight: 500;
    }
    .unit {
        font-size: 0.85rem;
        font-weight: 400;
        color: var(--secondary-text-color);
        margin-left: 2px;
    }
`;

export function renderNumberControl(
    displayValue: string,
    unit: string = "",
    onMinus: (e: Event) => void,
    onPlus: (e: Event) => void,
    disabled: boolean = false,
    minusAriaLabel: string = 'Decrease value',
    plusAriaLabel: string = 'Increase value'
) {
    if (disabled) {
        return html`<div class="control-box readonly"><span class="value">${displayValue}${unit}</span></div>`;
    }

    return html`
        <div class="control-box">
            <button type="button" class="ctrl-btn minus" @click=${onMinus} aria-label=${minusAriaLabel}>
                <ha-icon icon="mdi:minus"></ha-icon>
            </button>
            <span class="value">${displayValue} <span class="unit">${unit}</span></span>
            <button type="button" class="ctrl-btn plus" @click=${onPlus} aria-label=${plusAriaLabel}>
                <ha-icon icon="mdi:plus"></ha-icon>
            </button>
        </div>
    `;
}

export async function updateNumberEntity(
    hass: HomeAssistant,
    entityId: string,
    direction: 1 | -1
): Promise<void> {
    const stateObj = hass.states[entityId];
    if (!stateObj) return;

    const current = parseFloat(stateObj.state);
    const step = stateObj.attributes.step || 1;
    const min = stateObj.attributes.min;
    const max = stateObj.attributes.max;

    let newValue = current + (step * direction);

    // Fix floating point math
    const precision = step.toString().split('.')[1]?.length || 0;
    newValue = parseFloat(newValue.toFixed(precision));

    if (min !== undefined && newValue < min) newValue = min;
    if (max !== undefined && newValue > max) newValue = max;

    const domain = entityId.split('.')[0];

    if (domain === 'number' || domain === 'input_number') {
        await hass.callService(domain, 'set_value', {
            entity_id: entityId,
            value: newValue
        });
        return;
    }

    // Some integrations expose DHW setpoints via water_heater entities.
    // They use set_temperature instead of set_value.
    if (domain === 'water_heater') {
        await hass.callService('water_heater', 'set_temperature', {
            entity_id: entityId,
            temperature: newValue
        });
    }
}
