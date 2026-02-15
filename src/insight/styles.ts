import { css } from 'lit';

export const styles = css`
    .deviation-positive {
        color: var(--error-color, #d32f2f);
        font-weight: 700;
    }

    .deviation-negative {
        color: var(--success-color, #2e7d32);
        font-weight: 700;
    }

    .insight-kpis {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 8px;
        padding-top: 8px;
    }

    .yesterday-values {
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        gap: 2px;
        min-width: 0;
    }

    .yesterday-main {
        font-size: 0.88rem;
        font-weight: 700;
        color: var(--primary-text-color);
        white-space: nowrap;
    }

    .yesterday-dev {
        font-size: 0.82rem;
        white-space: nowrap;
    }

    .kpi-card {
        background: color-mix(in srgb, var(--primary-text-color), transparent 96%);
        border-radius: 10px;
        padding: 9px 8px;
        min-width: 0;
    }

    .kpi-label {
        font-size: 0.68rem;
        text-transform: uppercase;
        letter-spacing: 0.4px;
        color: var(--secondary-text-color);
        font-weight: 600;
        margin-bottom: 4px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }

    .kpi-value {
        font-size: 0.92rem;
        font-weight: 700;
        color: var(--primary-text-color);
        line-height: 1.2;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }

    @media (min-width: 768px) {
        .kpi-label {
            font-size: 0.72rem;
        }

        .kpi-value {
            font-size: 0.98rem;
        }
    }
`;
