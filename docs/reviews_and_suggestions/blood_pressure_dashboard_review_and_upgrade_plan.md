# Blood Measure: Code Review and Upgrade Plan

**Reviewed:** 11 October 2026
**Reviewed snapshot:** uploaded `blood-pressure-measure.zip`, documented app version 0.9.4
**Focus:** dashboard, local measurement store, related cuff/pulse persistence, blood-pressure classification, and offline behavior

## Executive summary

The app has useful separation between experimental camera PPG and external cuff/oximeter data, visible safety language, bilingual screens, and a shared session store. The uploaded code also contains a reproducible dashboard counting bug: cuff and pulse records are saved in both the new consolidated store and the legacy per-feature stores, then the dashboard reads both copies as separate records. In a simulated storage state with one cuff pair and one pulse session, `getSummary()` returns four records (two of each).

Fix the duplicate-storage migration before adding dashboard charts or totals. Then tighten input validation, make local-storage failures visible, improve dashboard history navigation, and make offline behavior more predictable.

## Findings

### 1. Duplicate cuff and pulse records in dashboard totals and recent activity — high priority

**Evidence in the uploaded code:**

- `measurement-store.js:18–35` converts old cuff and pulse storage arrays into session records.
- `measurement-store.js:38–46` combines those converted entries with the consolidated session array and deduplicates only by `id`.
- `app.js:409–412` writes a cuff pair to `blood-measure-paired-readings-v1` and also calls `BloodMeasureStore.record("cuff-comparison", ...)`.
- `pulse.js:308–313` writes a pulse session to `blood-measure-pulse-sessions-v1` and also calls `BloodMeasureStore.record("pulse-analysis", ...)`.
- The new IDs use `cuff-comparison:<timestamp>` / `pulse-analysis:<timestamp>`, while the legacy IDs use `cuff:<timestamp>` / `pulse:<timestamp>`, so the two copies do not deduplicate.

**Impact:** `All sessions`, `Cuff pairs`, and recent activity can show inflated counts or duplicate rows. The simulated case returned `all: 4`, `cuff: 2`, and `pulse: 2` from only two underlying readings.

**Recommendation:** choose one canonical store. Add a one-time, versioned migration from legacy keys into the consolidated store, verify the migrated count and content, and then stop dual-writing. Until migration is in place, deduplicate records with a stable legacy-to-current identity and source-aware rules. Add executable tests for a legacy-only state, a new-only state, and a state containing both copies.

### 2. “Pulse sessions” summary undercounts pulse-related records — medium priority

`measurement-store.js:69–73` defines `pulse` as only records with type `pulse-analysis`. The app also stores pulse recovery, camera measurement, breathing, waveform, and oxygen sessions, some of which contain pulse values. The dashboard label “Pulse sessions” therefore describes a narrower count than its wording suggests.

**Recommendation:** either rename the card to **Pulse analyses**, or define exactly which session types count as pulse sessions and test that contract. Consider separate counts for cuff pairs, pulse analyses, recovery tests, and external oxygen readings if the dashboard needs a useful overview.

### 3. Blood-pressure classifier accepts invalid values and has a boundary mismatch — medium priority

- `logic.py:4–11` documents a crisis threshold as `>180 or >120`, while the code uses `>=180 or >=120`.
- `logic.py:19–20` returns `Normal` for any remaining pair, including impossible values such as `0/0` or negative values.
- `cli.py` parses integers but does not validate plausible ranges or require systolic to exceed diastolic.
- `tests/test_blood_measure.py` checks representative examples but not invalid inputs or values just below/at/above category boundaries.

**Recommendation:** make the documented boundary and implementation agree with the authoritative guideline the project intends to follow; reject invalid inputs rather than assigning them a category; and add boundary and range tests. Keep the category wording clearly about a single reading and avoid implying a diagnosis.

### 4. Storage failures can be silent or inconsistent — medium priority

`measurement-store.js:9–15` treats malformed JSON and unavailable storage as an empty array. `record()` returns `null` on write failure (`:61–66`), but `app.js:255` ignores that return value after a camera recording. The camera result still appears complete even if the dashboard history could not be saved. In the cuff flow, legacy storage and the consolidated store are written separately (`app.js:409–412`), so a quota failure can leave them out of sync.

**Recommendation:** return a structured save result, distinguish unavailable/corrupt/full storage from an empty history, and show a clear status when the measurement was processed but not saved. Make migrations and multi-key updates recoverable; preserve a backup before replacing corrupted data.

### 5. Dashboard history is a preview, not a complete records view — product improvement

`dashboard.js:28–60` renders the totals and at most five recent records. The dashboard has no “view all” action, filters, or empty-state explanation. Full history is split across the feature pages, and the summary currently has no refresh path if another app tab changes local storage while this page is open.

**Recommendation:** add a “View all records” destination with date, source/type, and quality details; distinguish cuff readings from camera estimates in every row; provide a clear first-use empty state; and refresh on the `storage` event or an explicit reload action. Avoid combining unrelated measurements into one trend chart.

### 6. Offline cache behavior can return the wrong page — medium priority for PWA use

`service-worker.js:18–25` uses network-first for every GET, caches responses without checking `response.ok`, and falls back to `index.html` for any failed request. When opened offline at `dashboard.html` or another module URL, a cached meter page may be served instead of the requested page. The cache write is also started without extending the fetch event lifetime with `event.waitUntil()`.

**Recommendation:** use a navigation strategy that first checks the requested cached page, then an intentional offline fallback; cache only successful same-origin responses; and attach cache writes to the event lifetime. Test direct offline navigation to each app page and behavior when the service worker updates.

### 7. Duplicate service-worker registration paths — low priority cleanup

`pwa-bootstrap.js:3–8` registers the worker for all pages. `app.js:550–555` registers it again, and `pulse.js:350` has another registration. The browser generally reuses the same scope, but the duplicated code makes update behavior harder to reason about.

**Recommendation:** keep registration in one shared bootstrap module and use the Usage page’s update-check flow to manage update prompts consistently.

## Positive implementation choices

- `dashboard.html` and the meter page include explicit experimental measurement limits.
- DOM output in the reviewed dashboard and histories uses `textContent` and `replaceChildren`, reducing injection risk from stored strings.
- The app stores external cuff values separately from camera estimates and records method/reference metadata for the estimates.
- The project includes a useful PPG signal-quality pipeline, localized English/Simplified Chinese UI, and a test suite for packaged assets and selected safety wording.
- The cuff reference inputs have HTML `required`, `min`, and `max` constraints; retain equivalent validation in any import or non-browser entry point.

## Recommended delivery order

| Priority | Change | Acceptance check |
|---|---|---|
| 1 | Fix legacy migration and duplicate counting | A mixed legacy/new fixture reports each underlying reading once; clear actions remove the intended records. |
| 2 | Validate classifier and cuff references | Invalid pressure pairs are rejected; tests cover exact category boundaries and plausible input limits. |
| 3 | Make save failures and corrupted storage visible | Simulated quota and malformed-data cases never look like a successful saved record or silently erase recoverable data. |
| 4 | Improve dashboard navigation | Empty, one-record, duplicate legacy, and mixed-source histories render correctly; all records are reachable. |
| 5 | Correct offline behavior and centralize registration | Each page opens correctly offline after a successful online load; failed responses are not cached as good app assets. |
| 6 | Add browser-level regression checks | Tests exercise storage migration and dashboard rendering, rather than only searching source strings. |

## Verification performed

- Reviewed the uploaded source files, including `dashboard.html`, `dashboard.js`, `measurement-store.js`, `app.js`, `pulse.js`, `logic.py`, `cli.py`, `service-worker.js`, and the existing tests.
- Ran a Node simulation of the store with one consolidated and one legacy copy of each of a cuff reading and pulse reading. It reproduced the duplicate summary (`all: 4`, `cuff: 2`, `pulse: 2`).
- JavaScript syntax checks (`node --check` for each web JavaScript file) passed.
- Python bytecode compilation (`python3 -m compileall -q src tests`) passed.
- The pytest suite could not run because `pytest` is not installed in the available Python environment. The project declares it as an optional development dependency.

## Next step

Implement the canonical-store migration and regression tests first. That removes incorrect counts from the dashboard and gives later history, filter, and chart work a trustworthy data foundation.
