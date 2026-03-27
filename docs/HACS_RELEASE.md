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

1. For a normal public release, create a tag in format `vX.Y.Z` (example: `v1.0.1`)
2. For a test/prerelease, create a SemVer prerelease tag such as `v1.0.1-beta.1`
3. If you publish a prerelease tag, keep `package.json` in the matching prerelease version as well so the injected card version stays accurate
4. Push branch and tags:
   - `git push origin <branch> --tags`

## 3. Automation

The workflow in `.github/workflows/release.yml` runs on tag push and performs:

- typecheck
- tests
- build
- dist consistency check
- GitHub Release creation with generated release notes
- automatic GitHub prerelease creation when the tag contains a prerelease suffix such as `-beta.1`

## 4. HACS Requirements

Required in the repository:

- `hacs.json` exists
- `hacs.json.filename` is `heatpump-dashboard.js` and the file exists in `dist/`
- built file is included in the tagged commit

After release in Home Assistant:

1. Refresh HACS repository cache
2. Update to the new version
3. For prereleases, enable prerelease/beta visibility for this repository in HACS before checking for updates
