"use strict";

window.BloodMeasureStore = (() => {
  const STORAGE_KEY = "blood-measure-sessions-v1";
  const CUFF_KEY = "blood-measure-paired-readings-v1";
  const PULSE_KEY = "blood-measure-pulse-sessions-v1";
  const MAX_SESSIONS = 300;
  let migrationComplete = false;

  function readArray(key, strict = false) {
    try {
      const value = JSON.parse(localStorage.getItem(key) || "[]");
      if (!Array.isArray(value) && strict) throw new Error("Expected a storage array");
      return Array.isArray(value) ? value : [];
    } catch (error) {
      if (strict) throw error;
      return [];
    }
  }

  function normalizeLegacySessions(strict = false) {
    const cuff = readArray(CUFF_KEY, strict).map(item => ({
      schemaVersion: 1,
      id: `cuff-comparison:${item.recordedAt}`,
      type: "cuff-comparison",
      recordedAt: item.recordedAt,
      app: item.app || null,
      data: item
    }));
    const pulse = readArray(PULSE_KEY, strict).map(item => ({
      schemaVersion: 1,
      id: `pulse-analysis:${item.recordedAt}`,
      type: "pulse-analysis",
      recordedAt: item.recordedAt,
      app: item.app || null,
      data: item
    }));
    return [...cuff, ...pulse];
  }

  // Compare JSON content independently of object key order. Timestamp alone is
  // insufficient: conflicting readings must remain recoverable as separate rows.
  function stableJson(value) {
    if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
    if (value && typeof value === "object") {
      return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(",")}}`;
    }
    return JSON.stringify(value);
  }

  function mergeLegacySessions(sessions, strict = false) {
    const merged = [...sessions];
    for (const legacy of normalizeLegacySessions(strict)) {
      if (merged.some(session => session?.type === legacy.type &&
          stableJson(session.data) === stableJson(legacy.data))) continue;
      // Use current IDs; disambiguate conflicting payloads with the same ID.
      const baseId = legacy.id;
      let suffix = 1;
      while (merged.some(session => session?.id === legacy.id)) {
        legacy.id = `${baseId}:${suffix++}`;
      }
      merged.push(legacy);
    }
    return merged;
  }

  function migrateLegacySessions() {
    // Additive, repeatable v1 migration. Keep legacy keys for feature histories,
    // old tabs, and recovery. Never apply the new-record retention cap here.
    migrationComplete = false;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const sessions = JSON.parse(raw || "[]");
      if (!Array.isArray(sessions)) return false;
      const merged = mergeLegacySessions(sessions, true);
      if (merged.length === sessions.length) return (migrationComplete = true);
      const serialized = JSON.stringify(merged);
      localStorage.setItem(STORAGE_KEY, serialized);
      migrationComplete = localStorage.getItem(STORAGE_KEY) === serialized;
      return migrationComplete;
    } catch (_) {
      return false;
    }
  }

  function getSessions() {
    migrateLegacySessions();
    const sessions = mergeLegacySessions(readArray(STORAGE_KEY));
    const unique = new Map();
    sessions.forEach(session => {
      if (session?.id && !unique.has(session.id)) unique.set(session.id, session);
    });
    return [...unique.values()].sort((left, right) =>
      new Date(right.recordedAt).getTime() - new Date(left.recordedAt).getTime()
    );
  }

  function record(type, data) {
    const recordedAt = data.recordedAt || new Date().toISOString();
    const session = {
      schemaVersion: 1,
      id: `${type}:${recordedAt}`,
      type,
      recordedAt,
      app: data.app || window.BLOOD_MEASURE_BUILD || null,
      data
    };
    const sessions = readArray(STORAGE_KEY).filter(item => item?.id !== session.id);
    sessions.unshift(session);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions.slice(0, MAX_SESSIONS)));
      return session;
    } catch (_) {
      return null;
    }
  }

  function getSummary() {
    const sessions = getSessions();
    const cuff = sessions.filter(item => item.type === "cuff-comparison");
    const pulse = sessions.filter(item => item.type === "pulse-analysis");
    return { sessions, cuff, pulse, latest: sessions[0] || null, migrationComplete };
  }

  function removeType(type) {
    const sessions = readArray(STORAGE_KEY).filter(session => session?.type !== type);
    try {
      if (sessions.length) localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
      else localStorage.removeItem(STORAGE_KEY);
      // Explicit clear only: migration itself never deletes legacy data.
      if (type === "cuff-comparison") localStorage.removeItem(CUFF_KEY);
      if (type === "pulse-analysis") localStorage.removeItem(PULSE_KEY);
    } catch (_) { /* Storage may be unavailable in private browsing modes. */ }
  }

  function updateData(id, changes) {
    const sessions = readArray(STORAGE_KEY);
    const index = sessions.findIndex(session => session?.id === id);
    if (index < 0) return null;
    sessions[index] = { ...sessions[index], data: { ...sessions[index].data, ...changes } };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
      return sessions[index];
    } catch (_) {
      return null;
    }
  }

  return Object.freeze({ schemaVersion: 1, getSessions, getSummary, migrateLegacySessions, record, updateData, removeType });
})();
