"use strict";

const LANGUAGE_KEY = "blood-measure-language";
const THEME_KEY = "blood-measure-theme";
const TEXT = {
  en: { meter: "Meter", pulse: "Pulse", usage: "Usage", appearance: "Appearance", classic: "Classic", ivory: "Ivory", sheets: "Sheets", eyebrow: "FINGERTIP HEALTH", title: "Health dashboard", intro: "Your fingertip PPG sessions and cuff comparisons in one place.", allSessions: "All sessions", pulseSessions: "Pulse sessions", cuffPairs: "Cuff pairs", quickMeter: "Quick meter", quickMeterText: "15-second pulse recording with an experimental cuff comparison.", pulseAnalysis: "Pulse analysis", pulseAnalysisText: "60-second variability and conservative irregular-pulse screening.", recovery: "Recovery test", recoveryText: "Guided pulse readings immediately after activity and at one and two minutes.", breathing: "Breathing rate", breathingText: "Experimental 90-second estimate from pulse-signal modulation.", waveform: "Waveform Lab", waveformText: "Normalized pulse shape, beat alignment, and repeatability research view.", oxygen: "Oxygen saturation", oxygenText: "Log hospital or external pulse-oximeter readings, manually or by compatible Bluetooth.", recent: "Recent activity", privacy: "Data stays in this browser unless you export it.", safetyTitle: "Measurement limits", safety: "Camera PPG is experimental and does not directly measure blood pressure, oxygen saturation, or diagnose a heart condition.", cuffReading: "Cuff {pressure} · pulse {pulse} BPM", pulseReading: "Pulse analysis · {pulse} BPM", measurementReading: "Camera estimate {pressure} · pulse {pulse} BPM", recoveryReading: "Recovery · 1-minute decrease {drop} BPM", breathingReading: "Breathing estimate · {rate} breaths/min", waveformReading: "Waveform · {consistency}% repeatability", oxygenReading: "External oximeter · {spo2}% SpO₂ · {pulse} BPM" },
  zh: { meter: "测量", pulse: "脉搏", usage: "使用说明", appearance: "外观", classic: "经典", ivory: "象牙白", sheets: "表格", eyebrow: "指尖健康", title: "健康仪表板", intro: "集中查看指尖 PPG 记录和袖带对照读数。", allSessions: "全部记录", pulseSessions: "脉搏记录", cuffPairs: "袖带配对", quickMeter: "快速测量", quickMeterText: "进行 15 秒脉搏记录并显示实验性袖带对照值。", pulseAnalysis: "脉搏分析", pulseAnalysisText: "进行 60 秒变异性分析和保守的脉搏不规则筛查。", recovery: "脉搏恢复测试", recoveryText: "引导记录活动后即刻、1 分钟和 2 分钟的脉搏。", breathing: "呼吸频率", breathingText: "根据脉搏信号调制进行实验性 90 秒估计。", waveform: "波形实验室", waveformText: "查看归一化脉搏形态、搏动对齐和重复性。", oxygen: "血氧饱和度", oxygenText: "手动或通过兼容蓝牙记录医院或外部脉搏血氧仪读数。", recent: "最近活动", privacy: "除非导出，否则数据仅保存在本浏览器中。", safetyTitle: "测量限制", safety: "摄像头 PPG 属于实验性功能，不能直接测量血压、血氧饱和度，也不能诊断心脏疾病。", cuffReading: "袖带 {pressure} · 脉搏 {pulse} BPM", pulseReading: "脉搏分析 · {pulse} BPM", measurementReading: "摄像头估计 {pressure} · 脉搏 {pulse} BPM", recoveryReading: "脉搏恢复 · 1 分钟下降 {drop} BPM", breathingReading: "呼吸估计 · {rate} 次/分钟", waveformReading: "波形 · 重复性 {consistency}%", oxygenReading: "外部血氧仪 · SpO₂ {spo2}% · {pulse} BPM" }
};

let language = localStorage.getItem(LANGUAGE_KEY) || (navigator.language?.toLowerCase().startsWith("zh") ? "zh" : "en");
const languageButton = document.querySelector("#languageButton");
const themeSelect = document.querySelector("#themeSelect");

function t(key, values = {}) {
  let value = TEXT[language][key] || TEXT.en[key] || key;
  Object.entries(values).forEach(([name, replacement]) => { value = value.replaceAll(`{${name}}`, replacement); });
  return value;
}

function applyLanguage() {
  document.documentElement.lang = language === "zh" ? "zh-CN" : "en";
  document.title = `${t("title")} · Blood Measure`;
  document.querySelectorAll("[data-i18n]").forEach(element => { element.textContent = t(element.dataset.i18n); });
  languageButton.textContent = language === "zh" ? "English" : "中文";
  renderSummary();
}

function renderSummary() {
  const summary = window.BloodMeasureStore.getSummary();
  document.querySelector("#totalCount").textContent = summary.sessions.length;
  document.querySelector("#pulseCount").textContent = summary.pulse.length;
  document.querySelector("#cuffCount").textContent = summary.cuff.length;
  const section = document.querySelector("#recentSection");
  section.hidden = summary.sessions.length === 0;
  if (!summary.sessions.length) return;
  document.querySelector("#latestDate").textContent = new Date(summary.latest.recordedAt).toLocaleDateString(language === "zh" ? "zh-CN" : undefined, { dateStyle: "medium" });
  document.querySelector("#recentList").replaceChildren(...summary.sessions.slice(0, 5).map(session => {
    const row = document.createElement("div");
    row.className = "history-item";
    const title = document.createElement("strong");
    const data = session.data || {};
    if (session.type === "cuff-comparison") {
      title.textContent = t("cuffReading", { pressure: `${data.cuff?.systolic || "—"}/${data.cuff?.diastolic || "—"}`, pulse: data.cuff?.pulse || "—" });
    } else if (session.type === "camera-measurement") {
      title.textContent = t("measurementReading", { pressure: data.ppg?.bpEstimate ? `${data.ppg.bpEstimate.systolic}/${data.ppg.bpEstimate.diastolic}` : "—", pulse: Math.round(data.ppg?.pulseEstimate?.bpm ?? data.ppg?.bpm ?? 0) || "—" });
    } else if (session.type === "pulse-recovery") {
      title.textContent = t("recoveryReading", { drop: data.oneMinuteDrop });
    } else if (session.type === "respiratory-rate") {
      title.textContent = t("breathingReading", { rate: data.breathsPerMinute });
    } else if (session.type === "waveform-analysis") {
      title.textContent = t("waveformReading", { consistency: Math.round(data.morphology.consistency * 100) });
    } else if (session.type === "oxygen-saturation") {
      title.textContent = t("oxygenReading", { spo2: data.spo2, pulse: data.pulse });
    } else {
      title.textContent = t("pulseReading", { pulse: Math.round(data.bpm || 0) || "—" });
    }
    const date = document.createElement("time");
    date.dateTime = session.recordedAt;
    date.textContent = new Date(session.recordedAt).toLocaleString(language === "zh" ? "zh-CN" : undefined, { dateStyle: "medium", timeStyle: "short" });
    row.append(title, date);
    return row;
  }));
}

languageButton.addEventListener("click", () => { language = language === "en" ? "zh" : "en"; localStorage.setItem(LANGUAGE_KEY, language); applyLanguage(); });
themeSelect.value = document.documentElement.dataset.theme;
themeSelect.addEventListener("change", () => { document.documentElement.dataset.theme = themeSelect.value; localStorage.setItem(THEME_KEY, themeSelect.value); });
applyLanguage();
