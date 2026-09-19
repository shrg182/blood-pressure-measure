# Personal calibration implementation progress

Last updated: 2026-09-19

## Goal

Add bounded personal calibration based on paired fingertip/cuff readings. Preserve
the raw camera pulse, require multiple comparisons before adjustment, and keep
the medical limitations explicit.

## Completed

- Reviewed the existing PPG, blood-pressure heuristic, paired-reading storage,
  bilingual UI, offline cache, and tests.
- Chosen design: require 3 usable paired readings; use the median residual from
  up to 10 recent references; cap pulse correction at +/-20 BPM, systolic at
  +/-25 mmHg, and diastolic at +/-15 mmHg.
- Added required cuff pulse capture (35-220 BPM) and bilingual validation.
- Added raw camera and adjusted pulse presentation. Adjustment begins after 3
  readings with at least 40% signal confidence.
- Changed BP calibration to begin after 3 good-quality pairs and use median
  residuals with the existing correction caps.
- Preserved the v1 storage key and backward compatibility: old entries without
  cuff pulse display an em dash and are excluded only from pulse adjustment.
- Updated warning text, README, styling, history output, tests, and offline
  cache version.

## Verification

- Full test suite: `22 passed` on 2026-09-18.
- `git diff --check`: passed.
- Manually reviewed the calibration and failure-state JavaScript paths.
- Local HTTP smoke test: passed on 2026-09-19. `/`, `app.js`, and
  `service-worker.js` returned successfully; the served page included the cuff
  pulse field and raw/adjusted pulse UI; the server returned
  `Permissions-Policy: camera=(self)`; cache version `blood-measure-v6` was
  served. The temporary server was stopped after the check.
- Node.js, QuickJS, Deno, and Bun are unavailable, so no standalone JavaScript
  parser check was possible in this environment.

## Remaining

- Optional: browser-device smoke test with camera permission and three real
  paired cuff readings. This requires a supported phone/browser and cannot be
  automated in the current workspace.

## Resume notes

Primary files are `src/blood_measure/web/app.js`, `index.html`, `styles.css`,
`service-worker.js`, `README.md`, and `tests/test_web_assets.py`. Existing local
storage key remains `blood-measure-paired-readings-v1`, so old BP-only entries
must continue to load safely.
