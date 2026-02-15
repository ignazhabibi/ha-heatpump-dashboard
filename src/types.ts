import { LovelaceCardConfig } from 'custom-card-helpers';
import type { ChartDataset } from 'chart.js';

export interface HeatpumpEnergyConfig extends LovelaceCardConfig {
    entities: {
        energy_heating?: string;
        energy_water?: string;
        heat_heating?: string;
        heat_water?: string;
    };
    colors?: Record<string, string>;
}

export interface HeatpumpTempConfig extends LovelaceCardConfig {
    entities: {
        flow?: string;
        return?: string;
        flow_circuit?: string;
        flow_circuit_2?: string;
    };
    colors?: Record<string, string>;
}

export interface ChartData {
    labels: string[];
    energyHeating: number[];
    energyWater: number[];
    heatHeating: number[];
    heatWater: number[];
    cop: (number | null)[];
    totalEnergy: number;
    totalHeat: number;
    totalEnergyHeating: number;
    totalEnergyWater: number;
    totalHeatHeating: number;
    totalHeatWater: number;
}

export interface TempChartData {
    labels: string[];
    flow: (number | null)[];
    return: (number | null)[];
    flowCircuit: (number | null)[];
    flowCircuit2: (number | null)[];
    spread: (number | null)[];
    avgFlow: string | number;
    avgReturn: string | number;
    avgFlowCircuit: string | number;
    avgFlowCircuit2: string | number;
    avgSpread: string | number;
}

export interface HeatpumpWaterHeaterConfig extends LovelaceCardConfig {
    entities: {
        water_heater_current_temperature?: string;
        water_heater_setpoint?: string;
        water_heater_once?: string;
        water_heater_hysteresis_on?: string;
        water_heater_hysteresis_off?: string;
        circulation_pump?: string;
        mode?: string;
    };
    colors?: Record<string, string>;
}

export interface WaterHeaterChartData {
    labels: string[];
    waterHeater: (number | null)[];
    avgWaterHeater: string | number;
}

export interface HeatingCurveConfig extends LovelaceCardConfig {
    entities: {
        slope?: string;
        shift?: string;
        outdoor_temp?: string;
        flow_temp_min?: string;
        flow_temp_max?: string;
        room_temp_setpoint?: string;
        current_flow_temp?: string;
        heating_circuit_pump?: string;
    };
    formula?: 'standard' | 'viessmann';
    colors?: Record<string, string>;
}

export interface HeatingCurveData {
    // Curve data points
    outdoor_temps: number[];      // X-axis values (-30 to +20)
    flow_temps: number[];         // Y-axis calculated values

    // Current operating point
    current_outdoor?: number;
    current_flow?: number;

    // Limits
    min_limit?: number;
    max_limit?: number;

    // Parameters for display
    slope: number;
    shift: number;
    room_setpoint: number;
    history?: HistoryDataPoint[]; // For 24h playback
}

export interface HistoryDataPoint {
    timestamp: number;
    outdoor: number | null;
    flow: number | null;
}

export interface HeatpumpInsightConfig extends LovelaceCardConfig {
    entities: {
        // Preferred setup
        energy_heating?: string;
        energy_hotwater?: string;
        // Fallback setup (single total sensor)
        energy_total?: string;
        outdoor_temp?: string;
    };
    settings?: {
        heating_limit?: number;
        period?: number;
        show_comparison?: boolean;
        compare_mode?: 'optimizer' | 'benchmark' | 'balance' | 'full_year' | 'longterm' | 'none';
        area?: number;
        scop_sensor?: string;
        fixed_jaz?: number;
        cop_cold?: number;
        electricity_price?: number;
        electricity_price_sensor?: string;
    };
    colors?: Record<string, string>;
}

export interface DimensioningData {
    avgElectricalPower: number;
    avgThermalLoad: number;
    peakElectricalPower: number;
    peakThermalLoad: number;
    energyIndex: number;
    specificHeatLoad: number;
    costIndex: number;
    jaz: number;
    jazSource: 'fixed' | 'sensor' | 'missing';
    wwBaseLoad: number;
}

export interface InsightChartData {
    datasets: ChartDataset<'scatter' | 'line', { x: number; y: number }[]>[];
    linePoints?: { x: number; y: number }[];
    metrics: {
        baseLoad: number;
        baseLoadSource?: 'ww' | 'regression';
        modelIntercept: number;
        wwBaseLoad: number;
        slope: number;
        r2?: number;
        deviation?: number;
        avgEfficiency?: number;
    };
    modeLabel: string;
    compLabel: string;
    startDate: string;
    endDate: string;
    compStartDate?: string;
    compEndDate?: string;
    dimensioning?: DimensioningData;
    availableDays?: Array<{
        date: string;
        hdd: number;
        energy: number;
    }>;
    selectedDay?: {
        date: string;
        hdd: number;
        energy: number;
        expected: number;
        deviation: number;
    };
    yesterday?: {
        date: string;
        hdd: number;
        energy: number;
        efficiency: number;
    };
    comparisonMetrics?: {
        baseLoad: number;
        wwBaseLoad: number;
        slope: number;
        r2?: number;
        deviation?: number;
    };
}
