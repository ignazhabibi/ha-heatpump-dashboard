import { css } from 'lit';

export const baseCardStyles = css`
    :host { 
        display: block; 
        height: 100%; 
        --card-padding: 12px;
        --chart-fixed-height: 220px;
    }
    
    ha-card { 
        position: relative;
        padding: var(--card-padding); 
        color: var(--primary-text-color); 
        border-radius: 12px; 
        height: 100%; 
        box-sizing: border-box;
        display: flex;
        flex-direction: column;
        overflow: hidden;
    }

    .chart-container { 
        flex: 0 0 var(--chart-fixed-height);
        height: var(--chart-fixed-height);
        width: 100%; 
        margin-bottom: 0; 
        min-height: 0; 
        position: relative;
    }

    canvas {
        width: 100% !important;
        height: 100% !important;
        display: block;
    }

    .legend {
        display: flex; 
        flex-direction: column; 
        gap: 8px; 
        flex: 1 1 auto;
        min-height: 0;
        justify-content: flex-start;
        padding: 10px 12px 0 12px;
        margin: 0 -12px;
    }

    .now { 
        font-weight: 700; 
        font-size: 1.0rem; 
    }

    .avg { 
        font-size: 0.85rem; 
        color: var(--secondary-text-color); 
    }

    .card-footer {
        position: relative;
        display: grid;
        grid-template-rows: minmax(0, 1fr) auto;
        gap: 0;
        flex: 1 1 auto;
        min-height: 0;
    }

    .card-footer .legend {
        flex: none;
        min-height: 0;
        margin: 0 -12px;
        padding-top: 10px;
    }

    .loading-card {
        padding: 16px;
    }

    .footer-actions {
        display: flex;
        justify-content: flex-end;
        align-items: center;
        min-height: 34px;
        padding-top: 8px;
        padding-bottom: 2px;
    }

    .action-button {
        display: flex;
        align-items: center;
        justify-content: center;
        height: 28px;
        padding: 0 12px;
        gap: 6px;
        font-size: 0.8rem;
        font-weight: 500;
        border-radius: 12px;
        background: color-mix(in srgb, var(--primary-text-color), transparent 96%);
        color: var(--secondary-text-color);
        cursor: pointer;
        transition: all 0.2s;
        --mdc-icon-size: 18px;
        user-select: none;
        border: none;
        font-family: inherit;
    }

    .action-button:hover {
        background: color-mix(in srgb, var(--primary-text-color), transparent 90%);
        color: var(--primary-text-color);
    }

    .action-button:focus-visible {
        outline: 2px solid var(--primary-color);
        outline-offset: 1px;
    }

    .action-button.active {
        background: color-mix(in srgb, var(--primary-color), transparent 90%);
        color: var(--primary-color);
    }
`;
