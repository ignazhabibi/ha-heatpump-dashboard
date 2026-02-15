import './energy/card';
import './energy/editor';
import './temperature/card';
import './temperature/editor';
import './heating-curve/card';
import './heating-curve/editor';
import './water-heater/card';
import './water-heater/editor';
import './insight/card';
import './insight/editor';
import { getTranslations } from './shared/utils/localization';

interface CustomCardDefinition {
    type: string;
    name: string;
    description: string;
}

interface NavigatorWithUserLanguage extends Navigator {
    userLanguage?: string;
}

interface WindowWithCustomCards extends Window {
    customCards?: CustomCardDefinition[];
}

const CARD_VERSION = '__PACKAGE_VERSION__';

console.info(
    `%c HEATPUMP DASHBOARD %c v${CARD_VERSION} `,
    "color: white; background: #FF9800; font-weight: 700;",
    "color: #FF9800; background: white; font-weight: 700;"
);

// Detect browser language for card picker localization
const browserLang = navigator.language || (navigator as NavigatorWithUserLanguage).userLanguage || 'en';
const t = getTranslations(browserLang);

// Register custom cards in HACS/Lovelace picker
const appWindow = window as WindowWithCustomCards;
appWindow.customCards = appWindow.customCards || [];

function registerCard(def: CustomCardDefinition): void {
    const cards = appWindow.customCards!;
    if (cards.some(card => card.type === def.type)) return;
    cards.push(def);
}

registerCard({
    type: "heatpump-energy-card",
    name: t.energyCardName,
    description: t.energyCardDescription
});

registerCard({
    type: "heatpump-temperature-card",
    name: t.temperatureCardName,
    description: t.temperatureCardDescription
});

registerCard({
    type: "heatpump-heating-curve-card",
    name: t.heatingCurveCardName,
    description: t.heatingCurveCardDescription
});

registerCard({
    type: "heatpump-water-heater-card",
    name: t.waterHeaterCardName,
    description: t.waterHeaterCardDescription
});

registerCard({
    type: "heatpump-insight-card",
    name: t.insightCardName,
    description: t.insightCardDescription
});
