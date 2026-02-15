import { getTranslations } from '../utils/localization';

/**
 * Generate localized color picker options
 * @param language - Language code (e.g., 'de', 'en')
 * @returns Array of color options with localized labels
 */
export function getLocalizedColors(language: string) {
    const t = getTranslations(language);

    return [
        { value: '#1976D2', label: t.colorDarkBlue },
        { value: '#90CAF9', label: t.colorLightBlue },
        { value: '#2196F3', label: t.colorBlue },
        { value: '#03A9F4', label: t.colorAzure },
        { value: '#FFC107', label: t.colorYellow },
        { value: '#E65100', label: t.colorDarkOrange },
        { value: '#FF9800', label: t.colorOrange },
        { value: '#FFCC80', label: t.colorLightOrange },
        { value: '#FF5722', label: t.colorRedOrange },
        { value: '#F44336', label: t.colorRed },
        { value: '#E91E63', label: t.colorPink },
        { value: '#4CAF50', label: t.colorGreen },
        { value: '#009688', label: t.colorTeal },
        { value: '#9C27B0', label: t.colorPurple },
        { value: '#673AB7', label: t.colorDeepPurple },
        { value: '#795548', label: t.colorBrown },
        { value: '#607D8B', label: t.colorBlueGrey },
        { value: '#9E9E9E', label: t.colorGrey },
        { value: '#000000', label: t.colorBlack }
    ];
}

// Legacy export for backward compatibility (English by default)
export const HA_COLORS = getLocalizedColors('en');

export const ENERGY_DEFAULTS: Record<string, string> = {
    energy_heating: '#1976D2', // Blue 700
    energy_water: '#90CAF9',   // Blue 200
    heat_heating: '#F44336',   // Red
    heat_water: '#FF9800',     // Orange
    cop: '#4CAF50'             // Green
};

export const TEMP_DEFAULTS: Record<string, string> = {
    flow: '#F44336',          // Red
    return: '#2196F3',        // Blue
    flow_circuit: '#FFC107',  // Amber
    flow_circuit_2: '#9C27B0', // Purple
    spread: '#000000'         // Black
};

export const HEATING_CURVE_DEFAULTS: Record<string, string> = {
    curve: '#2196F3',         // Blue - heating curve line
    limits: '#F44336',        // Red - min/max limits
    current_point: '#FF9800'  // Orange - current operating point
};

export const WATER_HEATER_DEFAULTS: Record<string, string> = {
    water_heater: '#FF9800',  // Orange
};