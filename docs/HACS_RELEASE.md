# HACS Release Checklist (Maintainers)

This checklist is optional but helps keep releases consistent and easy to verify.

## 1. Before Tagging

1. Ensure the working tree is clean: `git status`
2. Update version in `package.json` (SemVer)
3. Validate locally:
   - `npm ci`
   - `npm run typecheck`
   - `npm test -- --run`
   - `npm run build`
4. Confirm `dist/heatpump-dashboard.js` is up to date
5. Commit all release-related changes

## 2. Create the Release

1. Create a tag in format `vX.Y.Z` (example: `v1.0.1`)
2. Push branch and tags:
   - `git push origin main --tags`

## 3. Automation

The workflow in `.github/workflows/release.yml` runs on tag push and performs:

- typecheck
- tests
- build
- dist consistency check
- GitHub Release creation with generated release notes

## 4. HACS Requirements

Required in the repository:

- `hacs.json` exists
- `hacs.json.filename` points to `dist/heatpump-dashboard.js`
- built file is included in the tagged commit

After release in Home Assistant:

1. Refresh HACS repository cache
2. Update to the new version
