import { html, css } from 'lit';

export const statusBadgeStyles = css`
    .status-badge {
        font-size: 0.8rem;
        color: var(--secondary-text-color);
        font-weight: 500;
        display: flex;
        align-items: center;
        gap: 4px;
        padding: 0 12px;
        height: 28px;
        box-sizing: border-box;
        border-radius: 12px;
        background: color-mix(in srgb, var(--primary-text-color), transparent 96%);
        transition: all 0.2s;
        border: 1px solid transparent;
        user-select: none;
        border: none;
        font-family: inherit;
        text-align: left;
        margin: 0;
    }
    .status-badge.active {
        background: color-mix(in srgb, var(--success-color, #43a047), transparent 90%);
        color: var(--success-color, #43a047);
        font-weight: 600;
        box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    .status-badge ha-icon {
        --mdc-icon-size: 16px;
    }

    .status-badge.interactive {
        cursor: pointer;
    }

    .status-badge.interactive:focus-visible {
        outline: 2px solid var(--primary-color);
        outline-offset: 1px;
    }
`;

export function renderStatusBadge(
    label: string,
    icon: string,
    isActive: boolean,
    onClick?: () => void,
    styleOverride: string = ""
) {
    if (onClick) {
        return html`
            <button
                type="button"
                class="status-badge interactive ${isActive ? 'active' : ''}"
                style="${styleOverride}"
                @click=${onClick}
            >
                <ha-icon icon="${icon}"></ha-icon>
                <span>${label}</span>
            </button>
        `;
    }

    return html`
        <div
            class="status-badge ${isActive ? 'active' : ''}" 
            style="${styleOverride}"
        >
            <ha-icon icon="${icon}"></ha-icon>
            <span>${label}</span>
        </div>
    `;
}
