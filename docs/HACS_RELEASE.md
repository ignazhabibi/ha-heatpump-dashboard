# HACS Release Checklist

Diese Checkliste stellt sicher, dass ein Release sauber von HACS erkannt wird.

## 1. Vor dem Release

1. Arbeitsbaum muss sauber sein (`git status`).
2. Version in `package.json` anpassen (SemVer).
3. Validieren:
   - `npm ci`
   - `npm run typecheck`
   - `npm test -- --run`
   - `npm run build`
4. Prüfen, dass `dist/heatpump-dashboard.js` aktualisiert ist.
5. Änderungen committen.

## 2. Release erzeugen

1. Tag im Format `vX.Y.Z` erstellen (Beispiel `v1.0.1`):
   - `git tag v1.0.1`
2. Branch + Tag pushen:
   - `git push origin main --tags`

## 3. Automatisierung

- Workflow: `.github/workflows/release.yml`
- Trigger: Push eines Tags `v*.*.*`
- Schritte:
  - Typecheck
  - Tests
  - Build
  - Dist-Drift-Check (`git diff --exit-code dist/heatpump-dashboard.js`)
  - GitHub Release mit generierten Release Notes

## 4. HACS Verfügbarkeit

Voraussetzungen im Repo:

- `hacs.json` vorhanden
- `hacs.json.filename` zeigt auf `dist/heatpump-dashboard.js`
- Build-Datei ist im getaggten Commit enthalten

Nach dem Release in Home Assistant:

1. HACS öffnen
2. Repository aktualisieren (neu laden)
3. Neue Version installieren
