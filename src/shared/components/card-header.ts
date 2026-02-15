import { html, css, TemplateResult } from 'lit';
import { renderTimeSelector, TimeViewOption, timeSelectorStyles } from './time-selector';
import { ViewMode } from '../utils/date-helpers';

export const cardHeaderStyles = [
    timeSelectorStyles,
    css`
    .header { margin-bottom: 8px; flex-shrink: 0; }
    .top-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; overflow: hidden; min-height: 34px; }
    .title { font-size: 1.1rem; font-weight: 600; flex-shrink: 0; margin-right: 10px; }
    
    .date-row { display: flex; align-items: center; justify-content: center; gap: 16px; font-weight: 600; font-size: 0.95rem; min-height: 48px; }
    .second-row { display: flex; align-items: center; justify-content: center; min-height: 48px; }
    .date-label { min-width: 120px; text-align: center; } /* Prevent jumping */

    .nav-btn { 
        cursor: pointer; 
        padding: 2px; 
        color: var(--secondary-text-color); 
        display: flex; 
        align-items: center;
        border: none;
        background: transparent;
        border-radius: 10px;
    }
    .nav-btn:hover { color: var(--primary-text-color); }
    .nav-btn:focus-visible { outline: 2px solid var(--primary-color); outline-offset: 1px; }
    .nav-btn.disabled { opacity: 0.2; cursor: default; }
`];

export interface CardHeaderOptions {
    title: string;
    tabs?: TimeViewOption[];
    activeViewMode?: ViewMode;
    onViewModeChange?: (id: ViewMode) => void;
    dateLabel?: string;
    canGoNext?: boolean;
    onPrevDate?: () => void;
    onNextDate?: () => void;
    customSecondRow?: TemplateResult;
    customTopRight?: TemplateResult;
    prevAriaLabel?: string;
    nextAriaLabel?: string;
    showDateRow?: boolean;
}

export function renderCardHeader(options: CardHeaderOptions) {
    const {
        title,
        tabs = [],
        activeViewMode = 'day',
        onViewModeChange = () => { },
        dateLabel = '',
        canGoNext = false,
        onPrevDate = () => { },
        onNextDate = () => { },
        customSecondRow,
        customTopRight,
        prevAriaLabel = 'Previous period',
        nextAriaLabel = 'Next period',
        showDateRow = true
    } = options;

    return html`
        <div class="header">
            <div class="top-row">
                 <div class="title">${title}</div>
                 ${customTopRight ? customTopRight : renderTimeSelector(tabs, activeViewMode, (id) => onViewModeChange(id as ViewMode))}
            </div>
            ${customSecondRow ? html`<div class="second-row">${customSecondRow}</div>` : (showDateRow ? html`
            <div class="date-row">
                ${activeViewMode !== 'total' ? html`
                <button type="button" class="nav-btn" @click=${onPrevDate} aria-label=${prevAriaLabel}><ha-icon icon="mdi:chevron-left"></ha-icon></button>
                <span class="date-label">${dateLabel}</span>
                <button type="button" class="nav-btn ${!canGoNext ? 'disabled' : ''}" .disabled=${!canGoNext} @click=${canGoNext ? onNextDate : null} aria-label=${nextAriaLabel}><ha-icon icon="mdi:chevron-right"></ha-icon></button>
                ` : html`<span class="date-label">${dateLabel}</span>`}
            </div>
            ` : html``)}
        </div>
    `;
}
