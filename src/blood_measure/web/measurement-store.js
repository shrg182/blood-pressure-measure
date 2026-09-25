"use strict";

window.BloodMeasureStore = (() => {
  const STORAGE_KEY = "blood-measure-sessions-v1";
  const CUFF_KEY = "blood-measure-paired-readings-v1";
  const PULSE_KEY = "blood-measure-pulse-sessions-v1";
  const MAX_SESSIONS = 300;

  function readArray(key) {
    try {
      const value = JSON.parse(localStorage.getItem(key) || "[]");
      return Array.isArray(value) ? value : [];
    } catch (_) {
      return [];
    }
  }

  function normalizeLegacySessions() {
    const cuff = readArray(CUFF_KEY).map(item => ({
      schemaVersion: 1,
      id: `cuff:${item.recordedAt}`,
      type: "cuff-comparison",
      recordedAt: item.recordedAt,
      app: item.app || null,
      data: item
    }));
    const pulse = readArray(PULSE_KEY).map(item => ({
      schemaVersion: 1,
      id: `pulse:${item.recordedAt}`,
      type: "pulse-analysis",
      recordedAt: item.recordedAt,
      app: item.app || null,
      data: item
    }));
    return [...cuff, ...pulse];
  }

  function getSessions() {
    const sessions = [...readArray(STORAGE_KEY), ...normalizeLegacySessions()];
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
    return { sessions, cuff, pulse, latest: sessions[0] || null };
  }

  function removeType(type) {
    const sessions = readArray(STORAGE_KEY).filter(session => session?.type !== type);
    try {
      if (sessions.length) localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
      else localStorage.removeItem(STORAGE_KEY);
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

  return Object.freeze({ schemaVersion: 1, getSessions, getSummary, record, updateData, removeType });
})();
