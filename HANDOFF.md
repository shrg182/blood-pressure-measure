# Handoff: Blood Measure / Fingertip Pulse Lab

Last updated: 2026-10-11 (America/Detroit)

## Current state

Repository: `https://github.com/shrg182/blood-pressure-measure`, branch `main`.

- Dashboard reconciliation was published as `1259df0`.
- Measurement-result UI changes were committed as `5b6dec9` (Stage one is completed).
- This release prepares app version **0.9.5**, dated **2026-10-11**, and offline
  cache `blood-measure-v26`, including those dashboard and UI improvements.
- Local builds now say “Local development build” (English/Chinese) instead of
  claiming to be up to date. Published builds retain the service-worker check.
- Live site: <https://shrg182.github.io/blood-pressure-measure/>.
- Deployment runs on pushes to main. For this release, verify GitHub Actions and
  the live version/revision after pushing; the current commit hash is stamped by CI.

## Scope and safety constraints

This is a research prototype for camera fingertip PPG and comparisons with
external cuff readings. Camera-derived blood-pressure estimates are experimental,
not medical measurements. Preserve existing measurement, storage, export, and
calibration behavior. Do not add risk classifications or emergency guidance based
on camera estimates. Do not change medical or signal-processing logic as part of
these UI/storage tasks.

Only Finding 1 in
`docs/reviews_and_suggestions/blood_pressure_dashboard_review_and_upgrade_plan.md`
has been independently verified. Findings 2–7 remain unverified and require separate
review. The actual directory is `reviews_and_suggestions` (plural).

## Published dashboard duplicate-record fix

Finding 1 was reproduced: one cuff pair and one pulse session were counted as
four records because legacy and consolidated copies had different ID prefixes.

- `app.js` writes cuff pairs to `blood-measure-paired-readings-v1`, then calls
  consolidated `record("cuff-comparison", ...)`.
- `pulse.js` writes pulse sessions to `blood-measure-pulse-sessions-v1`, then calls
  `record("pulse-analysis", ...)`.
- Consolidated key: `blood-measure-sessions-v1`.
- The store now reconciles legacy entries incrementally on reads. It collapses
  matching normalized types and complete JSON payloads, independent of object
  key order. Conflicting payloads remain separate with disambiguated IDs.
- Migration copies missing entries, verifies the serialized destination by
  reading it back, and retains legacy sources. There is no one-time completion
  flag or migration retention cap. Later writes from old tabs can be imported.
- Failed reads/writes or verification report incomplete migration; dashboard
  messaging is localized in English and Simplified Chinese.
- Dual-writing remains intentional: legacy stores still support feature history,
  exports, and cuff calibration. Do not remove these stores or redirect readers
  without separately verifying those behaviors and their retention semantics.
- Explicit targeted clearing removes the selected cuff/pulse type from both
  stores to prevent reimport. Clearing camera records leaves cuff/pulse data intact.

Details: `docs/reviews_and_suggestions/duplicate_records_fix.md`.

## Measurement-result UI changes

The user requested a proposed layout first, then implementation and checks.
That proposal was shown, and the following is implemented:

- Camera result heading: “Camera PPG estimate · Experimental.”
- Caution immediately beneath the camera pressure value:
  “Confirm with a validated upper-arm cuff. This camera estimate is not a medical measurement.”
- Pulse and signal-quality information occupy separate blocks, stacking on narrow
  screens. Camera pressure uses neutral text, without a normal/high badge.
- “Enter cuff reading” is a native button that focuses the existing systolic input.
- Successful cuff saves show a separate “Cuff reading” card with pressure, pulse,
  save time, and “Source: User-entered cuff reading.” It uses the existing payload;
  no additional storage writes or schema changes were introduced.
- The saved card is cleared from the display when starting another recording or
  clearing cuff history. It is a current-result display, not a new persistent history.
- English/Simplified Chinese labels, caution, cuff details, and camera details
  update with language selection. Failure headings remain failure headings.
- Headings, labelled regions, existing labelled inputs and save status, and visible
  keyboard focus support accessibility. Styling is scoped to the meter result and
  uses theme variables for Classic, Ivory, and Sheets.

UI implementation files (committed in `5b6dec9`):

- `src/blood_measure/web/index.html` — result structure, caution, focus action, cuff card.
- `src/blood_measure/web/app.js` — presentation state, rendering, focus, translations.
- `src/blood_measure/web/styles.css` — scoped responsive result styles.
- `tests/measurement_result.test.cjs` — six new executable UI regression cases.
- `tests/test_measurement_store.py` — pytest now runs both JavaScript suites.
- `tests/test_web_assets.py` — updated expected camera label/caution wording.
- `HANDOFF.md` — project state and verification notes.

Unrelated `.DS_Store` changes exist at the root and in `src/`, plus an untracked
`docs/.DS_Store`. Leave these out of task commits.

## Verification completed

Latest local UI verification on 2026-10-11:

- `.venv/bin/python -m pytest -q`: **42 passed**, no skips. This includes wrappers
  executing **29 JavaScript cases**: 21 store cases, six result-UI cases, and two release/update-status cases.
- `node --check` on all 16 web JavaScript files: passed.
- `.venv/bin/python -m compileall -q src tests`: passed.
- `git diff --check`: passed.
- UI cases cover focus, saved-card content and unchanged payload, failed/invalid
  saves, language switching, failure headings, and accessible markup/order.
- Native Safari successfully displayed isolated synthetic result fixtures at
  360px width in Classic, Ivory, and Sheets, including Chinese content. Visual
  inspection confirmed separate camera/cuff cards, caution, timestamp, and source.
- Safari accessibility state exposed headings, labelled fields, caution and cuff
  regions. The cuff-entry action focused systolic; Tab progressed to diastolic.
- Preview fixtures used synthetic data and a page-local storage stub, not the
  user's existing readings. Temporary previews are under `/tmp/blood-result-*.html`;
  they are snapshots, not tracked production assets, and may become stale.

Verification limits:

- Earlier headless Chrome dashboard runs timed out twice after 45 seconds. The
  cause remains undetermined. `tests/check_dashboard_browser.py` is the runner;
  do not report those seven browser scenarios as passing. Safari result-preview
  checks do not replace those dashboard regression checks.
- Full screen-reader testing, real-device camera/paired-cuff testing, and mobile
  installation/offline update testing remain outstanding.
- Existing multi-tab localStorage races, non-atomic clears, normal new-record
  retention, and general storage-error handling remain outside this fix.

## Local server

The user reported that <http://localhost:8001/> was unreachable. No server was
listening. It was started and the returned HTML was checked for the new result UI.

The server was started on `127.0.0.1:8001` during this session. It is a development
process, not a persistent login service; check before starting another instance:

```bash
lsof -nP -iTCP:8001 -sTCP:LISTEN
```

Start it from the repository when needed:

```bash
.venv/bin/python -u -m blood_measure.web_server --host 127.0.0.1 --port 8001
```

The sandbox initially blocked the listening socket; an escalated run succeeded.
The local server serves current source files. Localhost and GitHub Pages have
separate browser storage origins. Phone access requires an appropriate HTTPS setup;
see `deploy/README.md`.

## Commands and next steps

```bash
.venv/bin/python -m pytest -q
node --test tests/measurement_store.test.cjs tests/measurement_result.test.cjs tests/usage_updates.test.cjs
.venv/bin/python -m compileall -q src tests
git diff --check
```

1. Verify the 0.9.5 deployment and live version/revision after pushing this release.
2. Complete real-device and assistive-technology checks, and resolve the separate
   Chrome dashboard runner timeout without claiming unperformed checks passed.
3. Review other findings only as separately scoped work.
