# Dashboard duplicate-record fix

Finding 1 is confirmed in the current source. `app.js:saveReferenceReading`
first writes the full cuff payload to `blood-measure-paired-readings-v1`
(up to 100 entries), then calls `record("cuff-comparison", savedReading)`.
`pulse.js:saveSession` likewise writes `blood-measure-pulse-sessions-v1`
(up to 30 entries), then calls `record("pulse-analysis", session)`.
The consolidated store retains up to 300 entries on new writes. Previously,
legacy conversion used `cuff:` and `pulse:` IDs, while `record` used
`cuff-comparison:` and `pulse-analysis:` IDs. Dashboard `getSummary()` merged
both sources and deduplicated only by ID, doubling counts and recent rows.

## Scoped migration

The store now performs an additive, repeatable v1 migration when history is
read. Legacy conversion uses current type-prefixed IDs. A legacy payload
already represented by the same normalized type and complete JSON payload (including the reading timestamp)
is skipped (object key order is irrelevant). Conflicting payloads remain
separate, with disambiguated IDs. Existing consolidated content is retained;
migration does not apply the 300-entry new-record retention limit.

The migration writes only if records are missing and verifies the entire
serialized result by reading it back. It reports false on write or verification
failure; dashboard reads still merge the available sources without duplicate
copies. Invalid consolidated JSON/non-array content is not overwritten by
migration. No legacy keys are deleted by migration, including after success.

This is deliberately a compatibility stage: dual-writing remains because
feature history/export and cuff calibration still read legacy storage.
Changing those readers or their retention windows could alter calibration
inputs and is outside this dashboard fix. No one-time completion flag is used:
older open tabs can still add legacy entries, so subsequent reads must reconcile
them. Repeated migration without new data causes no further writes.

Explicit `removeType` calls clear the matching cuff or pulse legacy key as well
as consolidated records of that type, preventing reimport. Clearing camera
measurements does not clear cuff or pulse history. Existing page clear actions
remain compatible. This deletion occurs only for an explicit history clear,
never as migration cleanup.

## Verification and limitations

Run `node --test tests/measurement_store.test.cjs`, or run pytest, which invokes
the same JavaScript regression suite and explicitly skips it if Node is absent.
Tests execute the actual store in a VM with a localStorage fixture. They cover
legacy-only, consolidated-only, mixed stores, repeated migration/reload, later
legacy writes, conflicting payloads, retention boundaries, failed writes,
corrupt consolidated data, read-back verification failure, targeted clearing, incomplete-migration reporting, retries, and localized dashboard status.

No medical or signal-processing code is changed. Browser UI/device behavior is
not exercised by these VM tests. Existing localStorage multi-tab read/write
races, non-atomic clear operations, new-record retention, and general storage
error messaging remain unchanged. Conflicting same-timestamp payloads are
intentionally preserved rather than guessed to be duplicates. Retiring legacy
storage requires a separate migration of feature readers and their retention
semantics; legacy data should remain available until that work is verified.

The dashboard now explicitly reports incomplete migration, including source read
failures, and clears the message after a successful retry. Legacy reads must
succeed before migration can report completion. Only Finding 1 is confirmed by
this work; the other findings remain unverified. The review’s one-time migration
and immediate end to dual-writing are proposals superseded by this incremental
compatibility approach.

A standalone real-browser runner is available at `tests/check_dashboard_browser.py`.
It uses an isolated temporary Chrome profile and the actual dashboard/store scripts,
with fixtures for seven dashboard scenarios. PWA registration is omitted from the
fixture. Run it with the Chrome executable path as its argument.
Both local Chrome attempts timed out after 45 seconds without returning DOM results,
including a retry with background services disabled. These browser checks are NOT
verified as passing. The cause of the Chrome timeout is undetermined. The 40-test
pytest suite (including 21 VM JavaScript regression cases) still passes; the browser
runner compiles and the diff whitespace check passes. No existing user browser
profile or saved readings was used by these attempts.
