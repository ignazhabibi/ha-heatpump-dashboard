import { html, css } from 'lit';

export const timeSelectorStyles = css`
    .time-selector-container {
        display: flex;
        overflow-x: auto;
        white-space: nowrap;
        gap: 6px;
        padding-bottom: 2px;
        scrollbar-width: none; /* Firefox */
        -ms-overflow-style: none; /* IE/Edge */
    }
    .time-selector-container::-webkit-scrollbar {
        display: none; /* Chrome/Safari */
    }

    .time-tab {
        border: none;
        padding: 4px 12px;
        font-size: 0.8rem;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s;
        border-radius: 12px;
        user-select: none;
        -webkit-user-select: none;
        white-space: nowrap;
        
        /* Semantic Colors using color-mix */
        background: color-mix(in srgb, var(--primary-text-color), transparent 96%);
        color: var(--secondary-text-color);
        border: 1px solid transparent;
    }

    .time-tab:focus-visible {
        outline: 2px solid var(--primary-color);
        outline-offset: 1px;
    }

    .time-tab:hover {
        background: color-mix(in srgb, var(--primary-text-color), transparent 90%);
        color: var(--primary-text-color);
    }

    .time-tab.active {
        /* Active: 90% transparent (10% opacity) - Matches global TabGroup style */
        background: color-mix(in srgb, var(--primary-text-color), transparent 90%);
        color: var(--primary-text-color);
        font-weight: 600;
        box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
`;

export interface TimeViewOption<T extends string = string> {
    id: T;
    label: string;
}

export function renderTimeSelector<T extends string>(
    options: TimeViewOption<T>[],
    activeId: T,
    onSelect: (id: T) => void
) {
    return html`
        <div class="time-selector-container">
            ${options.map(opt => html`
                <button
                    type="button"
                    class="time-tab ${activeId === opt.id ? 'active' : ''}" 
                    @click=${() => onSelect(opt.id)}
                    aria-pressed=${activeId === opt.id ? 'true' : 'false'}
                >
                    ${opt.label}
                </button>
            `)}
        </div>
    `;
}
