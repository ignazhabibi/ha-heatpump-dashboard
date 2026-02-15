import { html, css } from 'lit';
import { HomeAssistant } from 'custom-card-helpers';

export const selectControlStyles = css`
    .control-box.select-mode { 
        background: color-mix(in srgb, var(--primary-text-color), transparent 96%);
        border-radius: 16px; 
        height: 40px; 
        display: flex; 
        align-items: center; 
        justify-content: space-between;
        position: relative; 
        padding: 0 12px; 
        transition: background 0.2s;
        box-sizing: border-box;
    }
    .control-box.select-mode:hover {
        background: color-mix(in srgb, var(--primary-text-color), transparent 92%);
    }
    .control-box.select-mode.compact {
        height: 28px;
        border-radius: 12px;
        padding: 0 8px;
    }
    .control-box select { 
        width: 100%; height: 100%; border: none; background: transparent; 
        font-size: 1.0rem; font-weight: 500; color: var(--primary-text-color); 
        appearance: none; -webkit-appearance: none; -moz-appearance: none; 
        outline: none; cursor: pointer; z-index: 2;
        padding-right: 24px;
    }
    .control-box.select-mode.compact select {
        font-size: 0.85rem;
        padding-right: 20px;
    }
    .select-icon { 
        position: absolute; right: 8px; top: 50%; 
        transform: translateY(-50%); 
        pointer-events: none; 
        color: var(--secondary-text-color); 
        --mdc-icon-size: 20px;
    }
    .control-box.select-mode.compact .select-icon {
        --mdc-icon-size: 16px;
        right: 4px;
    }
`;

export function renderSelectControl(
    hass: HomeAssistant,
    entityId: string,
    options: string[],
    onChange: (value: string) => void,
    valueOverride?: string,
    mapping?: Record<string, string>,
    isCompact?: boolean
) {
    const stateObj = entityId ? hass.states[entityId] : null;
    const currentValue = valueOverride !== undefined ? valueOverride : (stateObj ? stateObj.state : '');

    return html`
        <div class="control-box select-mode ${isCompact ? 'compact' : ''}">
            <select @change=${(e: Event) => onChange((e.target as HTMLSelectElement).value)}>
                ${options.map((opt: string) => html`
                    <option value=${opt} ?selected=${opt === currentValue}>
                        ${mapping && mapping[opt] ? mapping[opt] : opt}
                    </option>
                `)}
            </select>
            <ha-icon icon="mdi:chevron-down" class="select-icon"></ha-icon>
        </div>
    `;
}

export async function updateSelectEntity(
    hass: HomeAssistant,
    entityId: string,
    option: string
): Promise<void> {
    const domain = entityId.split('.')[0];
    if (domain !== 'select' && domain !== 'input_select') return;

    await hass.callService(domain, 'select_option', {
        entity_id: entityId,
        option: option
    });
}
