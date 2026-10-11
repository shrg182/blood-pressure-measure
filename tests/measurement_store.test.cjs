const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { test } = require('node:test');
const source = fs.readFileSync('src/blood_measure/web/measurement-store.js', 'utf8');
const STORE = 'blood-measure-sessions-v1';
const CUFF = 'blood-measure-paired-readings-v1';
const PULSE = 'blood-measure-pulse-sessions-v1';
const cuff = { recordedAt: '2026-10-11T10:00:00Z', cuff: { systolic: 120, diastolic: 80, pulse: 70 }, ppg: { bpm: 71 } };
const pulse = { recordedAt: cuff.recordedAt, bpm: 70, beatIntervalsMs: [850, 860] };
const session = (type, data) => ({ schemaVersion: 1, id: `${type}:${data.recordedAt}`, type, recordedAt: data.recordedAt, app: null, data });
const current = [session('cuff-comparison', cuff), session('pulse-analysis', pulse)];
function setup(initial = {}, failWrite = false) {
  const values = new Map(Object.entries(initial).map(([key, value]) => [key, JSON.stringify(value)]));
  let writes = 0;
  const localStorage = {
    getItem: key => values.get(key) ?? null,
    setItem(key, value) { if (failWrite) throw Error('Quota exceeded'); writes++; values.set(key, value); },
    removeItem: key => values.delete(key),
  };
  const context = { window: {}, localStorage };
  vm.runInNewContext(source, context);
  return { store: context.window.BloodMeasureStore, values, get writes() { return writes; } };
}
function counts(store, all = 2, cuffs = 1, pulses = 1) {
  const summary = store.getSummary();
  assert.equal(summary.sessions.length, all);
  assert.equal(summary.cuff.length, cuffs);
  assert.equal(summary.pulse.length, pulses);
}
for (const [name, initial] of Object.entries({
  'legacy only': { [CUFF]: [cuff], [PULSE]: [pulse] },
  'consolidated only': { [STORE]: current },
  'both stores': { [STORE]: current, [CUFF]: [cuff], [PULSE]: [pulse] },
})) {
  test(name, () => {
    const env = setup(initial);
    counts(env.store);
    assert.deepEqual(JSON.parse(env.values.get(STORE)), current);
    for (const key of [CUFF, PULSE]) {
      assert.equal(env.values.get(key), initial[key] && JSON.stringify(initial[key]));
    }
  });
}
test('migration is repeatable across reloads and accepts later legacy writes', () => {
  const env = setup({ [CUFF]: [cuff], [PULSE]: [pulse] });
  assert.equal(env.store.migrateLegacySessions(), true);
  const persisted = env.values.get(STORE);
  assert.equal(env.store.migrateLegacySessions(), true);
  counts(env.store);
  assert.equal(env.values.get(STORE), persisted);
  assert.equal(env.writes, 1);
  const reloaded = setup(Object.fromEntries([...env.values].map(([key, value]) => [key, JSON.parse(value)])));
  counts(reloaded.store);
  assert.equal(reloaded.writes, 0);
  const later = { ...pulse, recordedAt: '2026-10-11T11:00:00Z' };
  reloaded.values.set(PULSE, JSON.stringify([later, pulse]));
  counts(reloaded.store, 3, 1, 2);
  assert.equal(reloaded.store.getSummary().latest.recordedAt, later.recordedAt);
});
test('different payloads at the same timestamp survive, regardless of key order', () => {
  const other = { ...cuff, cuff: { ...cuff.cuff, systolic: 121 } };
  const env = setup({ [STORE]: current, [CUFF]: [{ ppg: cuff.ppg, cuff: cuff.cuff, recordedAt: cuff.recordedAt }, other] });
  counts(env.store, 3, 2, 1);
  assert.equal(env.store.migrateLegacySessions(), true);
  counts(env.store, 3, 2, 1);
  assert.equal(new Set(env.store.getSessions().map(item => item.id)).size, 3);
  assert.deepEqual(JSON.parse(env.values.get(STORE))[2].data, other);
});
test('migration does not truncate existing or legacy records at the retention limit', () => {
  const existing = Array.from({ length: 300 }, (_, i) => session('camera-measurement', { recordedAt: String(i), bpm: 70 }));
  const env = setup({ [STORE]: existing, [CUFF]: [cuff], [PULSE]: [pulse] });
  counts(env.store, 302);
  assert.deepEqual(JSON.parse(env.values.get(STORE)).slice(0, 300), existing);
});
test('failed writes leave both source stores intact and dashboard deduplicated', () => {
  const env = setup({ [STORE]: [current[0]], [CUFF]: [cuff], [PULSE]: [pulse] }, true);
  const before = [...env.values];
  assert.equal(env.store.migrateLegacySessions(), false);
  counts(env.store);
  assert.deepEqual([...env.values], before);
});
test('corrupt consolidated storage is not overwritten by migration', () => {
  for (const raw of ['broken JSON', '{"unexpected":true}']) {
    const env = setup({ [CUFF]: [cuff] });
    env.values.set(STORE, raw);
    assert.equal(env.store.migrateLegacySessions(), false);
    counts(env.store, 1, 1, 0);
    assert.equal(env.values.get(STORE), raw);
    assert.equal(env.values.get(CUFF), JSON.stringify([cuff]));
  }
});
for (const type of ['cuff-comparison', 'pulse-analysis', 'camera-measurement']) {
  for (const migrated of [false, true]) {
    test(`clear ${type}, migrated=${migrated}, leaves other types and keys intact`, () => {
      const camera = session('camera-measurement', { recordedAt: cuff.recordedAt, bpm: 72 });
      const env = setup({ [STORE]: [...current, camera], [CUFF]: [cuff], [PULSE]: [pulse] });
      if (migrated) env.store.migrateLegacySessions();
      env.store.removeType(type);
      counts(env.store, 2, type === 'cuff-comparison' ? 0 : 1, type === 'pulse-analysis' ? 0 : 1);
      assert.equal(env.store.getSessions().some(item => item.type === type), false);
      assert.equal(env.values.has(CUFF), type !== 'cuff-comparison');
      assert.equal(env.values.has(PULSE), type !== 'pulse-analysis');
      env.store.removeType(type);
      assert.equal(env.store.getSessions().length, 2);
    });
  }
}
test('clear legacy-only history prevents reimport', () => {
  const env = setup({ [CUFF]: [cuff], [PULSE]: [pulse] });
  env.store.removeType('cuff-comparison');
  counts(env.store, 1, 0, 1);
  env.store.removeType('pulse-analysis');
  counts(env.store, 0, 0, 0);
});
test('migration reports failed read-back verification without deleting legacy data', () => {
  const values = new Map([[CUFF, JSON.stringify([cuff])]]);
  const context = { window: {}, localStorage: {
    getItem: key => values.get(key) ?? null,
    setItem() { /* Simulate a write that does not persist. */ },
    removeItem() { assert.fail('Migration must never delete a key'); },
  } };
  vm.runInNewContext(source, context);
  assert.equal(context.window.BloodMeasureStore.migrateLegacySessions(), false);
  counts(context.window.BloodMeasureStore, 1, 1, 0);
  assert.equal(values.get(CUFF), JSON.stringify([cuff]));
});
test('summary reports incomplete migration and a later successful retry', () => {
  const env = setup({ [CUFF]: [cuff] });
  const original = env.values.get(CUFF);
  env.values.set(STORE, 'broken JSON');
  assert.equal(env.store.getSummary().migrationComplete, false);
  assert.equal(env.values.get(CUFF), original);
  env.values.delete(STORE);
  assert.equal(env.store.getSummary().migrationComplete, true);
  assert.equal(env.values.get(CUFF), original);
  counts(env.store, 1, 1, 0);
});
test('legacy read failure reports incomplete migration without writing or deleting', () => {
  const context = { window: {}, localStorage: {
    getItem(key) { if (key === CUFF) throw Error('Storage unavailable'); return null; },
    setItem() { assert.fail('Must not write after a source read failure'); },
    removeItem() { assert.fail('Must retain legacy sources'); },
  } };
  vm.runInNewContext(source, context);
  assert.equal(context.window.BloodMeasureStore.getSummary().migrationComplete, false);
});
test('malformed legacy storage reports incomplete migration and remains intact', () => {
  const env = setup({ [STORE]: current });
  env.values.set(CUFF, '{invalid');
  const before = [...env.values];
  assert.equal(env.store.getSummary().migrationComplete, false);
  assert.deepEqual([...env.values], before);
});
test('matching type and payload collapse even if the wrapper timestamp differs', () => {
  const env = setup({ [STORE]: [{ ...current[0], recordedAt: '2026-10-11T10:00:00.000Z' }], [CUFF]: [cuff] });
  counts(env.store, 1, 1, 0);
});
test('dashboard shows localized incomplete status and clears it after retry', () => {
  const elements = new Map();
  const element = key => {
    if (!elements.has(key)) elements.set(key, { hidden: false, textContent: '', addEventListener() {}, replaceChildren() {} });
    return elements.get(key);
  };
  let complete = false;
  const context = {
    window: { BloodMeasureStore: { getSummary: () => ({ sessions: [], cuff: [], pulse: [], migrationComplete: complete }) } },
    localStorage: { getItem: () => null }, navigator: { language: 'en' },
    document: { documentElement: { dataset: {} }, querySelector: element, querySelectorAll: () => [] },
  };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync('src/blood_measure/web/dashboard.js', 'utf8'), context);
  assert.equal(element('#migrationStatus').hidden, false);
  assert.match(element('#migrationStatus').textContent, /migration is incomplete/);
  vm.runInContext('language = "zh"; renderSummary();', context);
  assert.match(element('#migrationStatus').textContent, /迁移尚未完成/);
  complete = true;
  vm.runInContext('renderSummary();', context);
  assert.equal(element('#migrationStatus').hidden, true);
  assert.equal(element('#migrationStatus').textContent, '');
});
