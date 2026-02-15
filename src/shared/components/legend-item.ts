import { html, css, TemplateResult } from 'lit';

export const legendItemStyles = css`
    .legend-item {
        display: flex;
        font-size: 0.9rem;
        line-height: 1.2;
        transition: opacity 0.2s;
        width: 100%;
        text-align: left;
        border: none;
        background: none;
        padding: 0;
        margin: 0;
        color: var(--primary-text-color);
        font-family: inherit;
        -webkit-appearance: none;
        appearance: none;
    }

    .legend-item.interactive {
        cursor: pointer;
    }

    .legend-item.static {
        cursor: default;
    }
    
    .legend-item.dimmed {
        opacity: 0.5;
    }

    .legend-main {
        display: flex;
        align-items: center;
        width: 100%;
    }

    .legend-bar {
        width: 4px;
        height: 24px;
        margin-right: 12px;
        border-radius: 2px;
        flex-shrink: 0;
    }

    .content-container {
        display: flex;
        justify-content: space-between;
        width: 100%;
        align-items: center;
    }

    .label {
        font-size: 0.95rem;
        font-weight: 500;
        opacity: 0.9;
        color: var(--primary-text-color);
    }

    .value-container {
        display: flex;
        align-items: baseline;
        gap: 8px;
        text-align: right;
    }

    .primary-value {
        font-weight: 700;
        font-size: 1.0rem;
        color: var(--primary-text-color);
    }

    .secondary-value {
        font-size: 0.85rem;
        color: var(--secondary-text-color);
    }
    
    /* Support for nested children (used in Energy card) */
    .children-container {
        display: flex;
        flex-direction: column;
        gap: 2px;
        padding-left: 14px;
        margin-top: 2px;
    }

    .legend-inner {
        width: 100%;
    }

    .legend-item .now {
        color: var(--primary-text-color);
    }
`;

export function renderLegendItem(
    label: string,
    color: string,
    isVisible: boolean,
    onToggle: (() => void) | undefined,
    valueContent: TemplateResult | string | number, // Can be simple text/number or complex HTML
    children?: TemplateResult // Optional sub-rows
) {
    const content = html`
        <div class="legend-inner">
            <div class="legend-main">
                <div class="legend-bar" style="background: ${color}"></div>
                <div class="content-container">
                    <span class="label">${label}</span>
                    <div class="value-container">
                        ${typeof valueContent === 'object' ? valueContent : html`<span class="primary-value">${valueContent}</span>`}
                    </div>
                </div>
            </div>
            ${isVisible && children ? html`<div class="children-container">${children}</div>` : ''}
        </div>
    `;

    if (onToggle) {
        return html`
            <button type="button" class="legend-item interactive ${isVisible ? '' : 'dimmed'}" @click=${onToggle}>
                ${content}
            </button>
        `;
    }

    return html`
        <div class="legend-item static ${isVisible ? '' : 'dimmed'}">
            ${content}
        </div>
    `;
}
