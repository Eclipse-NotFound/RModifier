# RModifier development and validation

These are the published 0.4.0 development notes. Later source progress belongs in state/.



The released EXE needs no development setup. For contributors:

- `desktop/`: desktop application.
- `src/`: loot runtime module. `src/tests` and LootProbe are isolated test code, excluded from the production module.
- `map-editor/`: native map components and build tools.

Install locked dependencies with `npm ci`, then run:

```sh
npm run build:ui
npm run check
npm test
```

Build the loot module with `build/build.ps1`, the older map bridge with `map-editor/tools/build.ps1`, the native editor with `map-editor/tools/build-native-ui.ps1`, and the window adapter with `tools/build-native-surface.ps1`. Tool locations can be overridden through script parameters.

After isolated validation and freezing component files, run `npm run package`. `tools/prepare-packager.ps1` prepares NSIS components with fixed checksums. The default output is `dist/RModifier.exe`; `RMODIFIER_PACKAGE_OUT` selects a candidate directory inside the project. The published 0.4.0 artifact came from the verified `dist/rmodifier-0.4.0-r2` candidate.

Packaging consumes the validated `pfe-loot-safe.swf`; it does not require restoring or modifying the installed game's main file. If rebuilding the bridge is necessary, `build/bridge.ps1` must use a verified original baseline. **Do not install `build/out/pfe-loot.swf`**: it is a compiler donor, not an installable game file. Only `pfe-loot-safe.swf`, after method-preservation checks, is an installation candidate.

`tools/extract_catalog.py` extracts the catalog, and `tools/generate-fixtures.mjs` creates consistency fixtures. Compile `src/LootProbeDoc.as` separately into `build/out/LootProbeMod.swf` for game tests.

`tests/ui.cjs`, `tests/native-host.cjs`, and `tests/barks-host-regression.cjs` exercise real Electron and isolated AIR processes; `RMODIFIER_EXE` selects an unpacked candidate. `tests/portable.cjs` launches the actual portable EXE and checks standalone use, repeat launches, and native UI loading; select a candidate with `RMODIFIER_PORTABLE_EXE`. The old `tests/host-ui.cjs` targets the 0.2.0 web map only. Tests must use a separate test data root and an explicit game root, never real saves.

Desktop 0.4.0 bundles loot module 0.3.0 and the v2 connection. Existing profiles remain readable; profiles that edit vanilla reward entries use `schemaVersion: 2` and require the updated connection. Save and close older editor instances before starting the new one.

Validation records: [game connection checks](../knowledge/verification-2026-09-28.md), [0.4.0 delivery evidence](../knowledge/evidence-rmodifier-0.4.0-2026-09-30/), and [GitHub publication receipt](../state/github-publication-2026-09-30.json). These technical records are primarily in Chinese.
