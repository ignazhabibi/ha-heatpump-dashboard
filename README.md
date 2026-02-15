# Heatpump Dashboard Cards

[![HACS Custom](https://img.shields.io/badge/HACS-Custom-orange.svg)](https://hacs.xyz/)
[![CI](https://github.com/ignazhabibi/ha-heatpump-dashboard/actions/workflows/ci.yml/badge.svg)](https://github.com/ignazhabibi/ha-heatpump-dashboard/actions/workflows/ci.yml)

A focused set of Lovelace cards for heat pump systems in Home Assistant.
The goal is practical daily operation: clear energy flows, stable temperature monitoring, and a mathematically grounded efficiency view.

## Why This Project

- Vendor-agnostic setup (works with common Home Assistant heat pump entities)
- Built for section dashboards with compact and consistent card layouts
- Mobile-friendly interaction and desktop-grade detail where needed
- UI-based configuration for all cards (no YAML required)

## Included Cards

1. **Energy Balance**
   - Stacked energy and heat generation with COP trend.
   - Useful for daily/seasonal performance checks.

2. **Temperatures**
   - Supply, return, and optional additional circuit temperatures.
   - Designed to spot spread and control anomalies quickly.

3. **Heating Curve**
   - Visual curve model with current operating point and quick controls.
   - Supports standard and Viessmann-like behavior.

4. **Water Heater**
   - Domestic hot water temperature history and operating states.
   - Optional quick actions for relevant DHW controls.

5. **Efficiency Comparison (Insight)**
   - Weather-adjusted scatter/regression analysis.
   - KPIs: base load (DHW), consumption per degree day, control quality.

## Card Previews

### Energy Balance
![Energy Balance](docs/images/energiebilanz.png)

### Temperatures
![Temperatures](docs/images/temperaturen.png)

### Heating Curve
![Heating Curve](docs/images/heizkurve.png)

### Water Heater
![Water Heater](docs/images/warmwasser.png)

### Efficiency Comparison
![Efficiency Comparison](docs/images/effizienzvergleich.png)

## UI Configuration (No YAML)

All cards can be configured directly in the Home Assistant UI editor.

![UI configuration example](docs/images/energiebilanz_ui_config.png)

## Installation with HACS

1. Open HACS in Home Assistant.
2. Go to `⋮` -> `Custom repositories`.
3. Add `https://github.com/ignazhabibi/ha-heatpump-dashboard`.
4. Select repository type: `Dashboard`.
5. Install **Heatpump Dashboard Cards**.
6. Reload the frontend (or restart Home Assistant once).
7. Add cards via `+ Add card` and configure in the visual editor.

## Release Process (HACS)

1. Validate locally:
   - `npm ci`
   - `npm run typecheck`
   - `npm test -- --run`
   - `npm run build`
2. Commit changes including `dist/heatpump-dashboard.js`.
3. Create and push a semantic version tag, for example:
   - `git tag v1.0.1`
   - `git push origin main --tags`
4. The GitHub release workflow publishes the release automatically.

Optional maintainer checklist: [`docs/HACS_RELEASE.md`](docs/HACS_RELEASE.md)

## Development

- `npm ci`
- `npm run typecheck`
- `npm test -- --run`
- `npm run build`
