import { css } from 'lit';

export const styles = css`
    .header { margin-bottom: 8px; flex-shrink: 0; }
    .top-row { display: flex; align-items: center; margin-bottom: 8px; overflow: hidden; position: relative; min-height: 34px; }
    .title { font-size: 1.1rem; font-weight: 600; flex-shrink: 0; margin-right: 10px; }
    .header-time {
        position: absolute;
        left: 50%;
        transform: translateX(-50%);
        font-weight: 600;
        font-size: 1rem;
        color: var(--primary-color);
        white-space: nowrap;
    }

    /* Playback Bar - Compact Row 2 */
    .playback-bar {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 0; /* Align with date-row (no padding) */
        min-height: 48px; /* Enforce 48px to match standard date-row */
        box-sizing: border-box;
        font-size: 0.85rem;
        color: var(--secondary-text-color);
        background: transparent;
        flex-wrap: nowrap; /* No wrapping for compact mode */
        justify-content: space-between;
        width: 100%;
    }
    .playback-slider {
        flex: 1; /* Slider takes all remaining space */
        min-width: 60px; /* Ensure it doesn't disappear */
    }

    .period-selector {
        display: flex;
        gap: 6px; /* Increased gap */
        font-size: 0.75rem;
        font-weight: 600;
        background: color-mix(in srgb, var(--primary-text-color), transparent 96%);
        padding: 2px;
        border-radius: 6px;
    }
    .period-opt {
        padding: 4px 10px; /* Larger hit area */
        cursor: pointer;
        border-radius: 4px;
        color: var(--secondary-text-color);
        font-size: 0.85rem; /* Larger font */
    }
    .period-opt.active {
        background: color-mix(in srgb, var(--primary-text-color), transparent 90%);
        color: var(--primary-text-color);
        box-shadow: 0 1px 2px rgba(0,0,0,0.1);
    }
    .playback-btn {
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        color: var(--primary-color);
        transition: opacity 0.2s;
        border: none;
        background: transparent;
        border-radius: 10px;
        padding: 0;
    }
    .playback-btn:hover { opacity: 0.8; }
    .playback-btn:focus-visible { outline: 2px solid var(--primary-color); outline-offset: 1px; }
    .playback-btn.disabled { opacity: 0.3; pointer-events: none; }
    .playback-icon {
        --mdc-icon-size: 28px;
    }
    
    .playback-slider {
        flex: 1;
        -webkit-appearance: none;
        height: 6px; /* Increased height */
        background: var(--divider-color, rgba(0,0,0,0.1));
        border-radius: 3px;
        outline: none;
        cursor: pointer;
    }
    .playback-slider.disabled { opacity: 0.3; pointer-events: none; }
    .playback-slider::-webkit-slider-thumb {
        -webkit-appearance: none;
        width: 18px; /* Increased thumb size */
        height: 18px; /* Increased thumb size */
        border-radius: 50%;
        background: var(--primary-color);
        cursor: pointer;
        transition: transform 0.1s;
        transform: scale(1); /* Default scale */
    }
    .playback-slider::-webkit-slider-thumb:hover { transform: scale(1.2); }
    
    .playback-time {
        font-variant-numeric: tabular-nums;
        font-weight: 500;
        min-width: 45px;
        text-align: right;
    }
    
    .live-badge {
        font-size: 0.8rem;
        color: var(--secondary-text-color);
        font-weight: 500;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 4px;
        padding: 4px 12px;
        border-radius: 12px;
        background: color-mix(in srgb, var(--primary-text-color), transparent 96%);
        transition: all 0.2s;
        min-width: unset;
        justify-content: center;
        border: 1px solid transparent;
        user-select: none;
        border: none;
    }
    .live-badge:hover { 
        background: color-mix(in srgb, var(--primary-text-color), transparent 90%);
        color: var(--primary-text-color);
    }
    .live-badge.active {
        background: color-mix(in srgb, var(--success-color, #43a047), transparent 90%);
        color: var(--success-color, #43a047);
        font-weight: 600;
        box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        cursor: default;
    }
    .live-badge.disabled { opacity: 0.5; pointer-events: none; }
    .live-badge:focus-visible { outline: 2px solid var(--primary-color); outline-offset: 1px; }

    .stat-text {
        display: flex;
        justify-content: space-between;
        width: 100%;
        align-items: center;
    }
    .label { font-size: 0.95rem; font-weight: 500; opacity: 0.9; }
    .vals { display: flex; align-items: center; gap: 8px; }
    
    /* Trend Indicators */
    .trend { 
        display: inline-block;
        width: 20px;
        text-align: center;
        font-weight: 900; 
        font-size: 1.2em; 
        line-height: 1;
        margin-left: 4px;
    }
    .trend.up { color: var(--success-color, #43a047); }
    .trend.down { color: var(--error-color, #d32f2f); }
    .trend.flat { 
        color: var(--secondary-text-color);
        font-size: 1.5em; /* Larger dot */
        line-height: 0.8; /* Adjust vertical align */
    }

    .footer-status-row {
        display: flex;
        gap: 8px;
        margin-right: auto;
    }

    .settings-divider {
        height: 4px;
    }
`;
