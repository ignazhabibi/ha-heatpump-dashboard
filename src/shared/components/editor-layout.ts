import { css } from 'lit';

export const editorLayoutStyles = css`
    .card-config {
        display: grid;
        gap: 16px;
    }

    .section {
        border: 1px solid var(--divider-color);
        border-radius: 12px;
        padding: 14px 12px;
    }

    .section h3 {
        margin: 0 0 6px 0;
        font-size: 1rem;
        font-weight: 600;
    }

    .section-hint {
        margin-bottom: 12px;
        color: var(--secondary-text-color);
        font-size: 0.85rem;
        line-height: 1.35;
    }

    .field {
        margin-bottom: 14px;
    }

    .field:last-child {
        margin-bottom: 0;
    }

    .color-row {
        display: flex;
        align-items: center;
        gap: 12px;
    }

    .color-selector {
        min-width: 220px;
        max-width: 320px;
    }

    .color-dot {
        width: 22px;
        height: 22px;
        border-radius: 50%;
        border: 1px solid var(--divider-color);
        flex-shrink: 0;
    }

    @media (max-width: 720px) {
        .color-row {
            flex-direction: column;
            align-items: stretch;
            gap: 8px;
        }

        .color-selector {
            min-width: 0;
            max-width: none;
        }

        .color-dot {
            display: none;
        }
    }
`;
