import { html, css } from 'lit';
import { HomeAssistant } from 'custom-card-helpers';

export const switchControlStyles = css`
    .switch-row { 
        display: flex; 
        align-items: center; 
        justify-content: space-between;
        padding: 0 4px; /* Align with number-control padding */
        height: 40px;
        width: 100%; 
        box-sizing: border-box;
        background: color-mix(in srgb, var(--primary-text-color), transparent 96%); /* Match container style */
        border-radius: 16px; /* Match container radius */
    }
    .switch-label { 
        display: flex; 
        align-items: center; 
        gap: 8px; 
        font-size: 1rem; 
        font-weight: 500; 
        color: var(--primary-text-color);
        padding-left: 8px;
    }
    .switch-label ha-icon {
        color: var(--secondary-text-color);
        --mdc-icon-size: 20px; /* Match other icons */
    }
    
    .toggle-switch { 
        width: 52px; 
        height: 32px; 
        background: color-mix(in srgb, var(--primary-text-color), transparent 85%); 
        border-radius: 16px; /* Pill shape (half of height) */
        position: relative; 
        transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        cursor: pointer;
        box-sizing: border-box;
        border: none;
        padding: 0;
    }
    .toggle-switch:focus-visible {
        outline: 2px solid var(--primary-color);
        outline-offset: 1px;
    }
    
    /* Thumb */
    .toggle-switch::after { 
        content: ''; 
        position: absolute; 
        left: 4px; 
        top: 4px; 
        width: 24px; 
        height: 24px; 
        background: var(--card-background-color, #ffffff);
        border-radius: 50%; 
        transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        box-shadow: 0 2px 4px rgba(0,0,0,0.2);
    }

    .active .toggle-switch { 
        background: var(--primary-color); 
        opacity: 0.9; /* Slightly transparent to match system feel? or full? System guidelines say 90% opacity active. */
        /* Let's use the 90% primary token used elsewhere */
        background: color-mix(in srgb, var(--primary-color), transparent 10%);
    }
    .active .toggle-switch::after { 
        transform: translateX(20px); 
        background: #ffffff;
    }
    .active .switch-label ha-icon {
        color: var(--primary-color);
    }
`;

export function renderSwitchControl(
    label: string,
    icon: string,
    isActive: boolean,
    onToggle: () => void
) {
    return html`
        <div class="switch-row ${isActive ? 'active' : ''}">
            <div class="switch-label">
                <ha-icon .icon=${icon}></ha-icon>
                <span>${label}</span>
            </div>
            <button
                type="button"
                class="toggle-switch"
                role="switch"
                aria-checked=${isActive ? 'true' : 'false'}
                aria-label=${label}
                @click=${onToggle}
            ></button>
        </div>
    `;
}

export async function toggleBinaryEntity(
    hass: HomeAssistant,
    entityId: string
): Promise<void> {
    const stateObj = hass.states[entityId];
    if (!stateObj) return;

    const domain = entityId.split('.')[0];
    const service = stateObj.state === 'on' ? 'turn_off' : 'turn_on';

    await hass.callService(domain, service, { entity_id: entityId });
}
