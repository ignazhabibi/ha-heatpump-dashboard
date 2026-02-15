# Heatpump Dashboard Cards

A professional collection of Home Assistant Lovelace cards designed for Heat Pump monitoring. Vendor-agnostic (works with Viessmann, Vaillant, Daikin, etc.).

## Cards

### 1. Heatpump Energy Balance
Visualizes power consumption vs. heat generation and calculates the COP (Coefficient of Performance) dynamically.
* **Features:**
    * 12h / Day / Month / Year / Total views (Total: rolling multi-year history).
    * Stacked bars for Heating vs. Hot Water.
    * Dynamic COP calculation logic.
    * Responsive touch navigation.

### 2. Heatpump Temperatures
Visualizes flow and return temperatures over time.
* **Features:**
    * Comparison of common flow, return, and up to two heating circuits.
    * Averages calculation per view.
    * Zoomable timeframes.

### 3. Heatpump Heating Curve
Visualizes heating curve parameters and current operating point.
* **Features:**
    * Standard and Viessmann formulas.
    * Min/max flow limits.
    * Playback mode for recent history and trend indicators.
    * Optional quick settings for slope/shift and limits.

### 4. Heatpump Water Heater
Tracks domestic hot water temperature and common DHW controls.
* **Features:**
    * Temperature history with averages.
    * Optional controls for one-time charge, setpoint, hysteresis, and mode.
    * Status badges for circulation and one-time charge.

### 5. Heatpump Insight
Analyzes weather-adjusted consumption (kD/HDD) and efficiency trends.
* **Features:**
    * 30d / 90d / 365d analysis windows.
    * Regression-based analysis of heating energy vs. degree days (kD).
    * Clear KPIs: domestic hot water base load, consumption per degree, and control quality (R²).
    * Split-sensor mode (heating + hot water) with total-sensor fallback.
    * Highlight for yesterday including actual vs. expected consumption deviation.

## Installation

1.  Add this repository to HACS.
2.  Install "Heatpump Dashboard".
3.  Add the cards to your dashboard using the UI editor.

## Development

* `npm run build` - build `dist/heatpump-dashboard.js`
* `npm run typecheck` - TypeScript validation (`tsc --noEmit`)
* `npm test -- --run` - run test suite
* `npm run coverage` - run tests with coverage report
