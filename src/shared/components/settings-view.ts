import { html, css, TemplateResult } from 'lit';

export const settingsViewStyles = css`
    .settings-view {
        position: absolute;
        bottom: 0;
        left: 0;
        right: 0;
        background: var(--card-background-color, #fff);
        padding: 12px 16px;
        border-radius: 16px 16px 0 0;
        box-shadow: 0 -4px 12px rgba(0,0,0,0.1);
        z-index: 10;
        display: flex;
        flex-direction: column;
        gap: 16px;
        box-sizing: border-box;
        /* Animation */
        animation: slide-up 0.25s cubic-bezier(0.4, 0, 0.2, 1);
        will-change: transform, opacity;
    }

    @keyframes slide-up {
        from { transform: translateY(100%); opacity: 0; }
        to { transform: translateY(0); opacity: 1; }
    }

    .settings-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 4px;
    }

    .settings-title {
        font-size: 0.9rem;
        font-weight: 700;
        color: var(--primary-text-color);
    }

    .settings-close {
        cursor: pointer;
        color: var(--secondary-text-color);
        --mdc-icon-size: 20px;
        border: none;
        background: transparent;
        border-radius: 10px;
        padding: 2px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
    }

    .settings-close:focus-visible {
        outline: 2px solid var(--primary-color);
        outline-offset: 1px;
    }

    .settings-content {
        display: flex;
        flex-direction: column;
        gap: 12px;
    }

    .settings-row {
        display: flex;
        flex-direction: column;
        gap: 6px;
    }

    .settings-label {
        font-size: 0.75rem;
        font-weight: 600;
        color: var(--secondary-text-color);
        text-transform: uppercase;
        letter-spacing: 0.5px;
    }
`;

export function renderSettingsView(
    title: string,
    content: TemplateResult,
    onClose: () => void,
    closeAriaLabel: string = 'Close settings'
) {
    return html`
        <div class="settings-view">
            <div class="settings-header">
                <div class="settings-title">${title}</div>
                <button type="button" class="settings-close" @click=${onClose} aria-label=${closeAriaLabel}>
                    <ha-icon icon="mdi:close"></ha-icon>
                </button>
            </div>
            <div class="settings-content">
                ${content}
            </div>
        </div>
    `;
}
