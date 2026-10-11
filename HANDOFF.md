# Handoff: 指尖脉搏 · Fingertip Pulse Lab

Last updated: 2026-10-11

## Purpose

Research prototype for recording fingertip photoplethysmography (PPG) with a
phone camera, estimating pulse-related signals, and comparing experimental
values with readings from validated external devices.

## Safety boundary

A phone camera does not directly measure blood pressure or clinical oxygen
saturation. Camera-derived pressure values are unvalidated comparison values.
Do not use them for diagnosis, medication decisions, emergencies, or other
health decisions. Confirm relevant readings with a validated upper-arm cuff or
a qualified clinician.

## Current state

- Version 0.9.4 was released on 2026-09-28 at revision
  `ea23c310e22402d6ed353cc888a73a4ee78ae9a8`.
- The application supports camera PPG, pulse estimation, quality rejection,
  cuff comparisons, bounded personal offsets, PRV, recovery, experimental
  respiration, cautious irregularity screening, waveform research, external
  SpO2 logging, bilingual UI, and offline installation.
- Automated verification recorded in `IMPLEMENTATION_PROGRESS.md` predates the
  current release and therefore must be refreshed.
- The visible product name is **指尖脉搏 · Fingertip Pulse Lab**. The repository,
  package, and deployed URL remain unchanged.

## Run and verify

```bash
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -e '.[dev]'
pytest
blood-measure-web
```

For phone testing, use HTTPS as described in `deploy/README.md`; remote mobile
browsers will not grant camera access to an ordinary HTTP origin.

## Important files

- `src/blood_measure/web/app.js` — primary short-recording and cuff workflow.
- `src/blood_measure/web/ppg-analysis.js` — shared PPG signal analysis.
- `src/blood_measure/web/pulse.js` — 60-second pulse and PRV workflow.
- `src/blood_measure/web/measurement-store.js` — browser-local records.
- `tests/test_web_assets.py` — static integration and safety wording checks.
- `IMPLEMENTATION_PROGRESS.md` — earlier calibration implementation record.

## Known constraints

- Results vary by phone camera, flash behavior, exposure, contact pressure,
  motion, skin temperature, and recording conditions.
- Personal adjustment begins only after sufficient usable cuff comparisons and
  does not create a clinically validated measurement.
- Measurement history is stored in the browser and can be lost if site data is
  cleared unless it is exported first.

## Latest verification

- Finding 1 (duplicate cuff/pulse dashboard records) is confirmed and fixed by
  incremental, retryable reconciliation. Legacy histories, exports, calibration,
  and dual-writing are preserved; migration never deletes legacy data.
- Dashboard reports incomplete migration in English and Chinese.
- Full automated suite: `40 passed` on 2026-10-11, including 21 executable
  JavaScript regression cases. All 16 web JavaScript syntax checks, Python
  compilation, and diff whitespace checks passed.
- Real Chrome dashboard checks remain unverified: two isolated headless runs
  timed out after 45 seconds. The runner is `tests/check_dashboard_browser.py`.
- Offline cache version advanced to v25 for the dashboard fix. The deployed
  Git revision identifies this update; the app version remains 0.9.4.
- Real-phone camera and paired-cuff verification remains outstanding.
- See `docs/reviews_and_suggestions/duplicate_records_fix.md` for migration
  details and limitations. Other review findings are not independently verified.

## Next tasks

1. Resolve the local headless Chrome timeout and run the dashboard browser checks.
2. Perform a real-phone smoke test covering permission, good and poor signals,
   three cuff pairs, history, export, reload, installation, and offline use.
3. Review remaining findings separately before expanding the scope of fixes.
