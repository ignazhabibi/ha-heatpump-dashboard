// Localization for Heatpump Dashboard Cards
// Supports: German (de), English (en, fallback)

export interface Translations {
    // Energy Card
    energyBalance: string;
    totalEnergyConsumption: string;
    heatingEnergyConsumption: string;
    dhwEnergyConsumption: string;
    totalHeatProduction: string;
    heatingHeatProduction: string;
    dhwHeatProduction: string;
    efficiency: string;
    loading: string;
    allTimeHistory: string;

    // Card Picker metadata
    energyCardName: string;
    energyCardDescription: string;
    temperatureCardName: string;
    temperatureCardDescription: string;
    heatingCurveCardName: string;
    heatingCurveCardDescription: string;
    waterHeaterCardName: string;
    waterHeaterCardDescription: string;
    insightCardName: string;
    insightCardDescription: string;

    // Temperature Card
    temperatures: string;
    commonSupplyTemp: string;
    heatingCircuitSupplyTemp: string;
    heatingCircuit2SupplyTemp: string;
    returnTemp: string;
    temperatureSpread: string;
    average: string;

    // Water Heater Card
    waterHeater: string;
    waterHeaterCurrentTemp: string;
    waterHeaterSetpoint: string;
    waterHeaterHysteresisOn: string;
    waterHeaterHysteresisOff: string;
    waterHeaterOnce: string;
    circulationPump: string;
    circulationOn: string;
    circulationOff: string;
    onceOn: string;
    onceOff: string;
    operationMode: string;
    modeKomfort: string;
    modeEco: string;
    modeOff: string;

    // Heating Curve Card
    heatingCurve: string;
    standardFormula: string;
    viessmannFormula: string;
    currentOperatingPoint: string;
    liveNow: string;
    minShort: string;
    maxShort: string;

    // Insight Card
    baseLoad: string;
    insulationFactor: string;
    deviation: string;
    heatingDegreeDays: string;
    heatingLimit: string;
    temperatureSensor: string;
    energySensor: string;
    energyHeatingSensor: string;
    energyHotwaterSensor: string;
    actualShort: string;
    expectedShort: string;
    baseLoadRegression: string;
    insightDataSourcesTitle: string;
    insightDataSourcesHint: string;
    insightFallbackTitle: string;
    insightFallbackHint: string;
    insightModelTitle: string;
    analysisPeriod: string;
    showComparison: string;
    compareLastYear: string;
    baseLoadDesc: string;
    insulationFactorDesc: string;
    baseLoadTooltip: string;
    insulationFactorTooltip: string;
    today: string;
    yesterday: string;
    showPoints: string;
    todayDeviation: string;
    yesterdayDeviation: string;
    dailyError: string;
    analysis: string;
    close: string;
    currentPeriod: string;
    comparisonPeriod: string;
    dailyConsumption: string;
    trendLine: string;
    scenario: string;
    scenarioOptimizer: string;
    scenarioOptimizerDesc: string;
    scenarioBenchmark: string;
    scenarioBenchmarkDesc: string;
    scenarioBalance: string;
    scenarioBalanceDesc: string;
    scenarioFullYear: string;
    scenarioFullYearDesc: string;
    scenarioLongterm: string;
    scenarioLongtermDesc: string;
    scenarioNone: string;
    explainOptimizer: string;
    explainBenchmark: string;
    explainBalance: string;
    explainFullYear: string;
    explainLongterm: string;
    label14d: string;
    labelPrev14d: string;
    label30d: string;
    labelLastYear: string;
    labelYTD: string;
    labelFullYear: string;
    labelPrevYear: string;
    controlQuality: string;
    controlQualityTooltip: string;
    ratingExcellent: string;
    ratingGood: string;
    ratingSatisfactory: string;
    ratingPoor: string;
    area: string;
    areaUnit: string;
    scalePassive: string;
    scaleNew: string;
    scaleInsulated: string;
    scaleUninsulated: string;

    // System Dimensioning / Certificate
    certificateTitle: string;
    avgHeatLoad: string;
    peakHeatLoad: string;
    thermalPower: string;
    electricalPower: string;
    energyIndexLabel: string;
    specificHeatLoadLabel: string;
    costIndexLabel: string;
    dimensioningSection: string;
    buildingSection: string;
    loadsSection: string;
    efficiencyClass: string;
    jazLabel: string;
    jazHint: string;
    scopSensor: string;
    copCold: string;
    electricityPrice: string;
    electricityPriceSensor: string;
    priceHint: string;
    systemCheck: string;
    systemDimensioningDesc: string;
    avgHeatLoadDesc: string;
    peakHeatLoadDesc: string;
    buildingBenchmarkDesc: string;

    // Common
    settings: string;
    view12h: string;
    viewDay: string;
    viewMonth: string;
    viewYear: string;
    viewTotal: string;
    previousPeriodAria: string;
    nextPeriodAria: string;
    closeSettingsAria: string;
    startPlaybackAria: string;
    pausePlaybackAria: string;

    // Editor labels
    entitiesAndColors: string;
    color: string;
    copLine: string;
    editorDataSourcesTitle: string;
    editorAppearanceTitle: string;
    editorControlEntitiesTitle: string;
    editorOptionalEntitiesTitle: string;
    editorFormulaTitle: string;
    editorEnergyDataHint: string;
    editorEnergyAppearanceHint: string;
    editorTemperatureDataHint: string;
    editorTemperatureAppearanceHint: string;
    editorWaterHeaterDataHint: string;
    editorWaterHeaterAppearanceHint: string;
    editorWaterHeaterControlsHint: string;
    editorHeatingCurveDataHint: string;
    editorHeatingCurveFormulaHint: string;
    editorHeatingCurveOptionalHint: string;
    editorHeatingCurveAppearanceHint: string;

    // Energy Editor entity labels
    heatingEnergyConsumptionLabel: string;
    dhwEnergyConsumptionLabel: string;
    heatingHeatProductionLabel: string;
    dhwHeatProductionLabel: string;
    energyShort: string;
    heatShort: string;

    // Temperature Editor entity labels
    commonSupplyTempLabel: string;
    heatingCircuitSupplyTempLabel: string;
    heatingCircuit2SupplyTempLabel: string;
    returnTempLabel: string;

    // Water Heater Editor entity labels
    waterHeaterCurrentTempLabel: string;
    waterHeaterSetpointLabel: string;
    waterHeaterHysteresisOnLabel: string;
    waterHeaterHysteresisOffLabel: string;
    waterHeaterOnceLabel: string;
    circulationPumpLabel: string;
    operationModeLabel: string;

    // Heating Curve Editor entity labels
    slopeLabel: string;
    shiftLabel: string;
    roomTempSetpointHint: string;
    outdoorTempLabel: string;
    flowTempMinLabel: string;
    flowTempMaxLabel: string;
    roomTempSetpointLabel: string;
    currentFlowTempLabel: string;
    formulaSettingLabel: string;
    heatingCircuitPumpLabel: string;
    heatingCircuitPump: string;
    heatingCircuitPumpOn: string;
    heatingCircuitPumpOff: string;

    // Units
    unitKwh: string;
    unitMwh: string;
    unitCelsius: string;

    // Color names
    colorDarkBlue: string;
    colorLightBlue: string;
    colorBlue: string;
    colorAzure: string;
    colorYellow: string;
    colorDarkOrange: string;
    colorOrange: string;
    colorLightOrange: string;
    colorRedOrange: string;
    colorRed: string;
    colorPink: string;
    colorGreen: string;
    colorTeal: string;
    colorPurple: string;
    colorDeepPurple: string;
    colorBrown: string;
    colorBlueGrey: string;
    colorGrey: string;
    colorBlack: string;
}

const translations: Record<string, Translations> = {
    de: {
        // Energy Card
        energyBalance: 'Energiebilanz',
        totalEnergyConsumption: 'Energieverbrauch (Gesamt)',
        heatingEnergyConsumption: 'Heizung',
        dhwEnergyConsumption: 'Warmwasser',
        totalHeatProduction: 'Wärmeerzeugung (Gesamt)',
        heatingHeatProduction: 'Heizung',
        dhwHeatProduction: 'Warmwasser',
        efficiency: 'Effizienz Ø (AZ)',
        loading: 'Lade Daten...',
        allTimeHistory: 'Gesamtverlauf',

        // Card Picker metadata
        energyCardName: 'Wärmepumpe Energiebilanz',
        energyCardDescription: 'Zeigt die Energiebilanz der Wärmepumpe im Zeitverlauf: Stromverbrauch und Wärmeerzeugung, getrennt nach Heizung und Warmwasser, inklusive COP-Entwicklung zur Effizienzbewertung.',
        temperatureCardName: 'Wärmepumpe Temperaturen',
        temperatureCardDescription: 'Visualisiert Vorlauf- und Rücklauftemperaturen je Heizkreis inklusive berechneter Spreizung. Damit erkennst du hydraulische Auffälligkeiten und Regelabweichungen über verschiedene Zeiträume.',
        heatingCurveCardName: 'Wärmepumpe Heizkurve',
        heatingCurveCardDescription: 'Stellt die aktive Heizkurve mit aktuellem Betriebspunkt dar und unterstützt die Feinabstimmung der Regelung im Live-Betrieb sowie in der Historienanalyse.',
        waterHeaterCardName: 'Wärmepumpe Warmwasser',
        waterHeaterCardDescription: 'Zeigt den Warmwasser-Temperaturverlauf und bindet optional Sollwert, Einmalladung, Hysterese, Modus und Zirkulation ein, um Komfort und Energieeinsatz besser zu bewerten.',
        insightCardName: 'Effizienzvergleich',
        insightCardDescription: 'Analysiert den Zusammenhang zwischen Heizenergie und Heizgradtagen (kD) per Regressionsmodell und macht Basislast, Verbrauch pro Grad sowie Tagesabweichungen transparent.',

        // Temperature Card
        temperatures: 'Temperaturen',
        commonSupplyTemp: 'Gemeinsamer Vorlauf',
        heatingCircuitSupplyTemp: 'Vorlauf Heizkreis',
        heatingCircuit2SupplyTemp: 'Vorlauf Heizkreis 2',
        returnTemp: 'Rücklauf',
        temperatureSpread: 'Spreizung (ΔT)',
        average: 'Durchschnitt',

        // Water Heater Card
        waterHeater: 'Warmwasser',
        waterHeaterCurrentTemp: 'Ist-Temperatur',
        waterHeaterSetpoint: 'Solltemperatur',
        waterHeaterHysteresisOn: 'Hysterese Ein',
        waterHeaterHysteresisOff: 'Hysterese Aus',
        waterHeaterOnce: 'Einmalige Ladung',
        circulationPump: 'Zirkulationspumpe',
        circulationOn: 'Zirkulation ein',
        circulationOff: 'Zirkulation aus',
        onceOn: 'Ladung ein',
        onceOff: 'Ladung aus',
        operationMode: 'Betriebsmodus',
        modeKomfort: 'Komfort',
        modeEco: 'Eco',
        modeOff: 'Aus',

        // Heating Curve Card
        heatingCurve: 'Heizkurve',
        standardFormula: 'Standard',
        viessmannFormula: 'Viessmann',
        currentOperatingPoint: 'Aktuell',
        liveNow: 'Jetzt',
        minShort: 'Min',
        maxShort: 'Max',

        // Insight Card
        baseLoad: 'Basislast (WW)',
        insulationFactor: 'Verbrauch pro Grad',
        deviation: 'Abweichung',
        heatingDegreeDays: 'Kelvin-Gradtage (kD)',
        heatingLimit: 'Heizgrenze',
        temperatureSensor: 'Außentemperatur-Sensor',
        energySensor: 'Energie-Sensor',
        energyHeatingSensor: 'Energie Heizung',
        energyHotwaterSensor: 'Energie Warmwasser',
        actualShort: 'Ist',
        expectedShort: 'Erwartet',
        baseLoadRegression: 'Basislast (Regression)',
        insightDataSourcesTitle: 'Datengrundlage',
        insightDataSourcesHint: 'Bevorzugt: Heizung und Warmwasser getrennt auswählen.',
        insightFallbackTitle: 'Fallback (optional)',
        insightFallbackHint: 'Nur nutzen, wenn kein separater Heizungs-Sensor vorhanden ist.',
        insightModelTitle: 'Modell',
        analysisPeriod: 'Analyse-Zeitraum',
        showComparison: 'Vergleich anzeigen',
        compareLastYear: 'Vergleich: Letztes Jahr',
        baseLoadDesc: 'Standby & Warmwasser',
        insulationFactorDesc: 'Reaktion auf Kälte',
        baseLoadTooltip: 'Gemessener Tagesverbrauch für Warmwasser, basierend auf dem WW-Sensor. Temperaturunabhängiger Grundverbrauch der Wärmepumpe.',
        insulationFactorTooltip: 'Dieser Wert zeigt, wie stark deine Heizung auf fallende Temperaturen reagiert. Er wird beeinflusst durch Dämmung, Heizkurve und gewünschte Raumtemperatur.',
        today: 'Heute',
        yesterday: 'Gestern',
        showPoints: 'Punkte anzeigen',
        todayDeviation: 'Heutige Abweichung',
        yesterdayDeviation: 'Gestrige Abweichung',
        dailyError: 'Im grünen Bereich',
        analysis: 'Analyse',
        close: 'Schließen',
        currentPeriod: "Aktueller Zeitraum",
        comparisonPeriod: "Vergleichszeitraum",
        dailyConsumption: "Tagesverbrauch",
        trendLine: "Trendlinie",
        scenario: "Szenario",
        scenarioOptimizer: "Live-Optimierung",
        scenarioOptimizerDesc: "Letzte 14 Tage vs. 14 Tage davor",
        scenarioBenchmark: "Saison-Check",
        scenarioBenchmarkDesc: "Letzte 30 Tage vs. Vorjahr",
        scenarioBalance: "Jahres-Bilanz",
        scenarioBalanceDesc: "Dieses Jahr (YTD) vs. Vorjahr",
        scenarioFullYear: "Jahres-Vergleich",
        scenarioFullYearDesc: "Letzte 365 Tage vs. Jahr davor",
        scenarioLongterm: "Langzeit-Trend",
        scenarioLongtermDesc: "Gesamte Historie (max. 5 Jahre)",
        scenarioNone: "Kein Vergleich",
        explainOptimizer: "Vergleich: 14 Tage vs. vorherige 14 Tage",
        explainBenchmark: "Vergleich: Letzte 30 Tage vs. Vorjahreszeitraum",
        explainBalance: "Vergleich: Laufendes Jahr (YTD) vs. Vorjahreszeitraum",
        explainFullYear: "Vergleich: Letzte 365 Tage vs. Vorjahreszeitraum",
        explainLongterm: "Analyse der gesamten Sensor-Historie (max. 5 Jahre)",
        label14d: "14T",
        labelPrev14d: "Vorherige 14T",
        label30d: "30T",
        labelLastYear: "Vorjahr",
        labelYTD: "Lfd. Jahr",
        labelFullYear: "365T",
        labelPrevYear: "Vorjahr",
        controlQuality: "Regelungsgüte",
        controlQualityTooltip: "Gibt an, wie präzise die Heizung auf die Außentemperatur reagiert. Ein hoher Wert (R²) bedeutet eine sehr stabile und vorhersehbare Regelung.",
        ratingExcellent: "Sehr Gut",
        ratingGood: "Gut",
        ratingSatisfactory: "Befriedigend",
        ratingPoor: "Instabil",
        area: "Wohnfläche",
        areaUnit: "m²",
        scalePassive: "Passivhaus",
        scaleNew: "Neubau",
        scaleInsulated: "Gedämmter Altbau",
        scaleUninsulated: "Ungedämmter Altbau",

        // System Dimensioning / Certificate
        certificateTitle: "Virtueller Energieausweis",
        avgHeatLoad: "Durchschnittl. Heizlast",
        peakHeatLoad: "Maximale Heizlast",
        thermalPower: "Thermische Leistung",
        electricalPower: "Elektrische Leistung",
        energyIndexLabel: "Energie-Index",
        specificHeatLoadLabel: "Spezifische Heizlast",
        costIndexLabel: "Kosten-Index",
        dimensioningSection: "System-Dimensionierung",
        buildingSection: "Gebäude-Einordnung",
        loadsSection: "Betriebs-Lasten",
        efficiencyClass: "Effizienzklasse",
        jazLabel: "Jahresarbeitszahl (JAZ)",
        jazHint: "Manueller Wert (wird vom Sensor überschrieben)",
        scopSensor: "SCOP/JAZ Sensor (optional)",
        copCold: "Angenommener COP bei -10°C",
        electricityPrice: "Strompreis (€/kWh)",
        electricityPriceSensor: "Strompreis-Sensor (optional)",
        priceHint: "Manueller Wert (wird vom Sensor überschrieben)",
        systemCheck: "System-Check",
        systemDimensioningDesc: "Diese Analyse basiert auf deinen realen Betriebsdaten und der gewählten JAZ.",
        avgHeatLoadDesc: "Durchschnittliche thermische Leistung während der Heizperiode (< 15°C).",
        peakHeatLoadDesc: "Geschätzte thermische Last bei -10°C (Auslegungspunkt).",
        buildingBenchmarkDesc: "Vergleich deines Gebäudes mit gängigen Standards.",

        // View modes
        view12h: '12h',
        viewDay: 'Tag',
        viewMonth: 'Monat',
        viewYear: 'Jahr',
        viewTotal: 'Gesamt',
        previousPeriodAria: 'Vorheriger Zeitraum',
        nextPeriodAria: 'Nächster Zeitraum',
        closeSettingsAria: 'Einstellungen schließen',
        startPlaybackAria: 'Wiedergabe starten',
        pausePlaybackAria: 'Wiedergabe pausieren',

        // Editor labels
        entitiesAndColors: 'Entitäten & Farben',
        color: 'Farbe',
        copLine: 'COP-Linie',
        editorDataSourcesTitle: 'Datengrundlage',
        editorAppearanceTitle: 'Darstellung',
        editorControlEntitiesTitle: 'Steuerungs-Entitäten',
        editorOptionalEntitiesTitle: 'Optionale Entitäten',
        editorFormulaTitle: 'Modellformel',
        editorEnergyDataHint: 'Lege getrennte Sensoren für Stromverbrauch und Wärmeerzeugung von Heizung und Warmwasser fest.',
        editorEnergyAppearanceHint: 'Farben für Balken und COP-Linie. Die Legende übernimmt dieselben Farben.',
        editorTemperatureDataHint: 'Sensoren für Vorlauf-/Rücklaufwerte. Die Spreizung wird aus gemeinsamem Vorlauf und Rücklauf berechnet.',
        editorTemperatureAppearanceHint: 'Linienfarben für Temperaturreihen und Spreizung.',
        editorWaterHeaterDataHint: 'Primärer Temperatursensor für Diagramm und Legende.',
        editorWaterHeaterAppearanceHint: 'Linienfarbe für die Warmwasser-Temperaturanzeige in Diagramm und Legende.',
        editorWaterHeaterControlsHint: 'Optional: Entitäten für Sollwert, Einmalladung, Hysterese, Modus und Zirkulationsstatus.',
        editorHeatingCurveDataHint: 'Entitäten für Heizkurven-Parameter, Außentemperatur, Grenzen und aktuellen Betriebspunkt.',
        editorHeatingCurveFormulaHint: 'Wähle die Rechenformel passend zu deiner Regelung (Standard oder Viessmann).',
        editorHeatingCurveOptionalHint: 'Optionaler Statussensor für die Anzeige der Heizkreispumpe.',
        editorHeatingCurveAppearanceHint: 'Farben für Kurve, Min/Max-Linien und aktuellen Betriebspunkt.',

        // Energy Editor entity labels
        heatingEnergyConsumptionLabel: 'Energieverbrauch Heizung',
        dhwEnergyConsumptionLabel: 'Energieverbrauch Warmwasser',
        heatingHeatProductionLabel: 'Wärmeerzeugung Heizung',
        dhwHeatProductionLabel: 'Wärmeerzeugung Warmwasser',
        energyShort: 'Energie',
        heatShort: 'Wärme',
        settings: 'Einstellungen',

        // Temperature Editor entity labels
        commonSupplyTempLabel: 'Vorlauftemperatur Gemeinsam',
        heatingCircuitSupplyTempLabel: 'Vorlauftemperatur Heizkreis',
        heatingCircuit2SupplyTempLabel: 'Vorlauftemperatur Heizkreis 2',
        returnTempLabel: 'Rücklauftemperatur',

        // Water Heater Editor entity labels
        waterHeaterCurrentTempLabel: 'Warmwasser Ist-Temperatur',
        waterHeaterSetpointLabel: 'Warmwasser Soll-Temperatur',
        waterHeaterHysteresisOnLabel: 'Einschalt-Hysterese',
        waterHeaterHysteresisOffLabel: 'Ausschalt-Hysterese',
        waterHeaterOnceLabel: 'Einmalige Warmwasserbereitung',
        circulationPumpLabel: 'Zirkulationspumpe',
        operationModeLabel: 'Betriebsmodus',

        // Heating Curve Editor entity labels
        slopeLabel: 'Steigung',
        shiftLabel: 'Verschiebung',
        roomTempSetpointHint: '(Standard: 20°C)',
        outdoorTempLabel: 'Außentemperatur',
        flowTempMinLabel: 'Vorlaufbegrenzung Min',
        flowTempMaxLabel: 'Vorlaufbegrenzung Max',
        roomTempSetpointLabel: 'Raumsolltemperatur',
        currentFlowTempLabel: 'Vorlauftemperatur',
        formulaSettingLabel: 'Berechnungsformel',
        heatingCircuitPumpLabel: 'Heizkreispumpe',
        heatingCircuitPump: 'Heizkreispumpe',
        heatingCircuitPumpOn: 'Pumpe ein',
        heatingCircuitPumpOff: 'Pumpe aus',

        // Units
        unitKwh: 'kWh',
        unitMwh: 'MWh',
        unitCelsius: '°C',

        // Color names
        colorDarkBlue: 'Dunkelblau',
        colorLightBlue: 'Hellblau',
        colorBlue: 'Blau',
        colorAzure: 'Azurblau',
        colorYellow: 'Gelb',
        colorDarkOrange: 'Dunkelorange',
        colorOrange: 'Orange',
        colorLightOrange: 'Hellorange',
        colorRedOrange: 'Rotorange',
        colorRed: 'Rot',
        colorPink: 'Pink',
        colorGreen: 'Grün',
        colorTeal: 'Türkis',
        colorPurple: 'Lila',
        colorDeepPurple: 'Dunkellila',
        colorBrown: 'Braun',
        colorBlueGrey: 'Blaugrau',
        colorGrey: 'Grau',
        colorBlack: 'Schwarz',
    },
    en: {
        // Energy Card
        energyBalance: 'Energy Balance',
        totalEnergyConsumption: 'Energy Consumption (Total)',
        heatingEnergyConsumption: 'Heating',
        dhwEnergyConsumption: 'Hot Water',
        totalHeatProduction: 'Heat Production (Total)',
        heatingHeatProduction: 'Heating',
        dhwHeatProduction: 'Hot Water',
        energyShort: 'Energy',
        heatShort: 'Heat',
        settings: 'Settings',
        efficiency: 'Efficiency Ø (COP)',
        loading: 'Loading Data...',
        allTimeHistory: 'All Time History',

        // Card Picker metadata
        energyCardName: 'Heatpump Energy Balance',
        energyCardDescription: 'Shows the heat pump energy balance over time: electrical consumption and thermal output, split into heating and domestic hot water, including COP development for efficiency tracking.',
        temperatureCardName: 'Heatpump Temperatures',
        temperatureCardDescription: 'Visualizes flow and return temperatures per heating circuit, including calculated spread. This helps identify hydraulic issues and control deviations across multiple time ranges.',
        heatingCurveCardName: 'Heatpump Heating Curve',
        heatingCurveCardDescription: 'Shows the active heating curve with the current operating point and supports controller fine-tuning in both live operation and history-based analysis.',
        waterHeaterCardName: 'Heatpump Water Heater',
        waterHeaterCardDescription: 'Displays domestic hot water temperature history and supports optional entities for setpoint, one-time load, hysteresis, mode, and circulation status to evaluate comfort versus energy usage.',
        insightCardName: 'Efficiency Comparison',
        insightCardDescription: 'Analyzes the relationship between heating energy and degree days (kD) using regression, highlighting base load, consumption per degree, and day-level model deviation.',

        // Temperature Card
        temperatures: 'Temperatures',
        commonSupplyTemp: 'Common Supply',
        heatingCircuitSupplyTemp: 'Heating Circuit Supply',
        heatingCircuit2SupplyTemp: 'Heating Circuit 2 Supply',
        returnTemp: 'Return',
        temperatureSpread: 'Spread (ΔT)',
        average: 'Average',

        // Water Heater Card
        waterHeater: 'Water Heater',
        waterHeaterCurrentTemp: 'Current Temp',
        waterHeaterSetpoint: 'Setpoint',
        waterHeaterHysteresisOn: 'Hysteresis On',
        waterHeaterHysteresisOff: 'Hysteresis Off',
        waterHeaterOnce: 'One-Time Load',
        circulationPump: 'Circulation Pump',
        circulationOn: 'Circulation on',
        circulationOff: 'Circulation off',
        onceOn: 'Charging on',
        onceOff: 'Charging off',
        operationMode: 'Obs. Mode',
        modeKomfort: 'Comfort',
        modeEco: 'Eco',
        modeOff: 'Off',

        // Heating Curve Card
        heatingCurve: 'Heating Curve',
        standardFormula: 'Standard',
        viessmannFormula: 'Viessmann',
        currentOperatingPoint: 'Current',
        liveNow: 'Now',
        minShort: 'Min',
        maxShort: 'Max',

        // Insight Card
        baseLoad: 'Base Load (DHW)',
        insulationFactor: 'Cons. per Degree',
        deviation: 'Deviation',
        heatingDegreeDays: 'Kelvin Degree Days (kD)',
        heatingLimit: 'Heating Limit',
        temperatureSensor: 'Outdoor Temperature Sensor',
        energySensor: 'Energy Sensor',
        energyHeatingSensor: 'Energy Heating',
        energyHotwaterSensor: 'Energy Hot Water',
        actualShort: 'Actual',
        expectedShort: 'Expected',
        baseLoadRegression: 'Base Load (Regression)',
        insightDataSourcesTitle: 'Data Sources',
        insightDataSourcesHint: 'Preferred: select separate sensors for heating and hot water.',
        insightFallbackTitle: 'Fallback (optional)',
        insightFallbackHint: 'Use only if no dedicated heating energy sensor is available.',
        insightModelTitle: 'Model',
        analysisPeriod: 'Analysis Period (Days)',
        showComparison: 'Show Comparison',
        compareLastYear: 'Comparison: Last Year',
        baseLoadDesc: 'Standby & Hot Water',
        baseLoadTooltip: 'Measured daily hot water consumption from the DHW sensor. Temperature-independent base consumption of the heat pump.',
        insulationFactorDesc: 'Reaction to cold',
        insulationFactorTooltip: 'This value shows how strongly your heating reacts to falling temperatures. It is influenced by insulation, heating curve, and desired room temperature.',
        today: 'Today',
        yesterday: 'Yesterday',
        showPoints: 'Show Points',
        todayDeviation: 'Today\'s Deviation',
        yesterdayDeviation: 'Yesterday\'s Deviation',
        dailyError: 'Within expected range',
        analysis: 'Analysis',
        close: 'Close',
        currentPeriod: "Current Period",
        comparisonPeriod: "Comparison Period",
        dailyConsumption: "Daily Consumption",
        trendLine: "Trend Line",
        scenario: "Scenario",
        scenarioOptimizer: "Live Optimization",
        scenarioOptimizerDesc: "Last 14 days vs. previous 14 days",
        scenarioBenchmark: "Seasonal Check",
        scenarioBenchmarkDesc: "Last 30 days vs. last year",
        scenarioBalance: "Annual Balance",
        scenarioBalanceDesc: "This year (YTD) vs. last year",
        scenarioFullYear: "Full Year Comparison",
        scenarioFullYearDesc: "Last 365 days vs. year before",
        scenarioLongterm: "Long-term Trend",
        scenarioLongtermDesc: "Full history (max. 5 years)",
        scenarioNone: "No Comparison",
        explainOptimizer: "Comparison: 14 days vs. previous 14 days",
        explainBenchmark: "Comparison: Last 30 days vs. same period last year",
        explainBalance: "Comparison: Current year (YTD) vs. same period last year",
        explainFullYear: "Comparison: Last 365 days vs. same period year before",
        explainLongterm: "Analysis of the full sensor history (max. 5 years)",
        label14d: "14d",
        labelPrev14d: "Prev 14d",
        label30d: "30d",
        labelLastYear: "Last Year",
        labelYTD: "This Year",
        labelFullYear: "365d",
        labelPrevYear: "Last Year",
        controlQuality: "Control Quality",
        controlQualityTooltip: "Indicates how precisely the heating reacts to the outdoor temperature. A high value (R²) means very stable and predictable control.",
        ratingExcellent: "Excellent",
        ratingGood: "Good",
        ratingSatisfactory: "Satisfactory",
        ratingPoor: "Unstable",
        area: "Living Area",
        areaUnit: "m²",
        scalePassive: "Passive House",
        scaleNew: "New Build",
        scaleInsulated: "Insulated Old Build",
        scaleUninsulated: "Uninsulated Old Build",

        // System Dimensioning / Certificate
        certificateTitle: "Virtual Energy Certificate",
        avgHeatLoad: "Average Heat Load",
        peakHeatLoad: "Peak Heat Load",
        thermalPower: "Thermal Power",
        electricalPower: "Electrical Power",
        energyIndexLabel: "Energy Index",
        specificHeatLoadLabel: "Specific Heat Load",
        costIndexLabel: "Cost Index",
        dimensioningSection: "System Dimensioning",
        buildingSection: "Building Classification",
        loadsSection: "Operating Loads",
        efficiencyClass: "Efficiency Class",
        jazLabel: "Annual COP (JAZ)",
        jazHint: "Manual value (overridden by sensor)",
        scopSensor: "SCOP/JAZ Sensor (optional)",
        copCold: "Assumed COP at -10°C",
        electricityPrice: "Electricity Price (€/kWh)",
        electricityPriceSensor: "Price Sensor (optional)",
        priceHint: "Manual value (overridden by sensor)",
        systemCheck: "System Check",
        systemDimensioningDesc: "This analysis is based on your real operating data and the selected JAZ.",
        avgHeatLoadDesc: "Average thermal power during the heating season (< 15°C).",
        peakHeatLoadDesc: "Estimated thermal load at -10°C (design point).",
        buildingBenchmarkDesc: "Comparison of your building with common standards.",

        // View modes
        view12h: '12h',
        viewDay: 'Day',
        viewMonth: 'Month',
        viewYear: 'Year',
        viewTotal: 'Total',
        previousPeriodAria: 'Previous period',
        nextPeriodAria: 'Next period',
        closeSettingsAria: 'Close settings',
        startPlaybackAria: 'Start playback',
        pausePlaybackAria: 'Pause playback',

        // Editor labels
        entitiesAndColors: 'Entities & Colors',
        color: 'Color',
        copLine: 'COP Line',
        editorDataSourcesTitle: 'Data Sources',
        editorAppearanceTitle: 'Appearance',
        editorControlEntitiesTitle: 'Control Entities',
        editorOptionalEntitiesTitle: 'Optional Entities',
        editorFormulaTitle: 'Model Formula',
        editorEnergyDataHint: 'Assign separate sensors for electrical consumption and thermal output of heating and domestic hot water.',
        editorEnergyAppearanceHint: 'Choose colors for bars and COP line. The legend uses the same colors.',
        editorTemperatureDataHint: 'Assign flow and return sensors. Spread is derived from common flow and return values.',
        editorTemperatureAppearanceHint: 'Line colors for temperature series and spread.',
        editorWaterHeaterDataHint: 'Primary temperature sensor used in chart and legend.',
        editorWaterHeaterAppearanceHint: 'Line color used for domestic hot water temperature in chart and legend.',
        editorWaterHeaterControlsHint: 'Optional entities for setpoint, one-time load, hysteresis, mode, and circulation status.',
        editorHeatingCurveDataHint: 'Entities for heating curve parameters, outdoor temperature, limits, and current operating point.',
        editorHeatingCurveFormulaHint: 'Choose the formula matching your controller behavior (Standard or Viessmann).',
        editorHeatingCurveOptionalHint: 'Optional status entity for heating circuit pump indication.',
        editorHeatingCurveAppearanceHint: 'Colors for the curve, min/max limits, and current operating point.',

        // Energy Editor entity labels
        heatingEnergyConsumptionLabel: 'Energy Consumption Heating',
        dhwEnergyConsumptionLabel: 'Energy Consumption Domestic Hot Water',
        heatingHeatProductionLabel: 'Heat Production Heating',
        dhwHeatProductionLabel: 'Heat Production Domestic Hot Water',

        // Temperature Editor entity labels
        commonSupplyTempLabel: 'Common Supply Temperature',
        heatingCircuitSupplyTempLabel: 'Heating Circuit Supply Temperature',
        heatingCircuit2SupplyTempLabel: 'Heating Circuit 2 Supply Temperature',
        returnTempLabel: 'Return Temperature',

        // Water Heater Editor entity labels
        waterHeaterCurrentTempLabel: 'DHW Current Temperature',
        waterHeaterSetpointLabel: 'DHW Setpoint Temperature',
        waterHeaterHysteresisOnLabel: 'Hysteresis On',
        waterHeaterHysteresisOffLabel: 'Hysteresis Off',
        waterHeaterOnceLabel: 'One-Time Water Heating',
        circulationPumpLabel: 'Circulation Pump',
        operationModeLabel: 'Operation Mode',

        // Heating Curve Editor entity labels
        slopeLabel: 'Slope',
        shiftLabel: 'Shift',
        roomTempSetpointHint: '(Default: 20°C)',
        outdoorTempLabel: 'Outdoor Temperature',
        flowTempMinLabel: 'Flow Temperature Min',
        flowTempMaxLabel: 'Flow Temperature Max',
        roomTempSetpointLabel: 'Room Temperature Setpoint',
        currentFlowTempLabel: 'Current Flow Temperature',
        formulaSettingLabel: 'Formula',
        heatingCircuitPumpLabel: 'Heating Circuit Pump',
        heatingCircuitPump: 'Heating Circuit Pump',
        heatingCircuitPumpOn: 'Pump on',
        heatingCircuitPumpOff: 'Pump off',

        // Units
        unitKwh: 'kWh',
        unitMwh: 'MWh',
        unitCelsius: '°C',

        // Color names
        colorDarkBlue: 'Dark Blue',
        colorLightBlue: 'Light Blue',
        colorBlue: 'Blue',
        colorAzure: 'Azure',
        colorYellow: 'Yellow',
        colorDarkOrange: 'Dark Orange',
        colorOrange: 'Orange',
        colorLightOrange: 'Light Orange',
        colorRedOrange: 'Red Orange',
        colorRed: 'Red',
        colorPink: 'Pink',
        colorGreen: 'Green',
        colorTeal: 'Teal',
        colorPurple: 'Purple',
        colorDeepPurple: 'Deep Purple',
        colorBrown: 'Brown',
        colorBlueGrey: 'Blue Grey',
        colorGrey: 'Grey',
        colorBlack: 'Black',
    }
};

/**
 * Get translations based on Home Assistant language setting
 * @param language - Home Assistant language code (e.g., 'de', 'en-US', 'fr')
 * @returns Translations object for the detected language (defaults to English)
 */
export function getTranslations(language: string): Translations {
    // Normalize language code (strip region, convert to lowercase)
    const lang = language.toLowerCase().split('-')[0];

    // Return German if language is 'de', otherwise default to English
    return translations[lang] || translations['en'];
}

/**
 * Convenience function to get a single translation
 * @param language - Home Assistant language code
 * @param key - Translation key
 * @returns Translated string
 */
export function t(language: string, key: keyof Translations): string {
    return getTranslations(language)[key];
}
