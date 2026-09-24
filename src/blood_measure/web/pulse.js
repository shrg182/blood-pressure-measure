"use strict";

const RECORDING_SECONDS = 60;
const LANGUAGE_KEY = "blood-measure-language";
const THEME_KEY = "blood-measure-theme";
const PULSE_STORAGE_KEY = "blood-measure-pulse-sessions-v1";
const TRANSLATIONS = {
  en: {
    meter: "Meter", usage: "Usage", appearance: "Appearance", classic: "Classic", ivory: "Ivory", sheets: "Sheets",
    eyebrow: "60-SECOND RECORDING", title: "Pulse analysis", intro: "Explore pulse timing from the fingertip camera signal.",
    ready: "Ready", initialInstruction: "Rest your hand, cover the rear camera and flash, and remain still for one minute.", signalQuality: "Signal quality",
    start: "Start pulse analysis", stop: "Stop recording", holdStill: "Keep your fingertip and phone still for the full minute.", seconds: "{count} sec",
    adjustFinger: "Adjust finger", stabilizing: "Stabilizing", good: "Good", fair: "Fair", poor: "Poor",
    averagePulse: "Average camera pulse", regularity: "Pulse regularity", meanInterval: "Mean beat interval", detectedIntervals: "Intervals analyzed",
    regular: "Regular within this recording", variable: "Variable within this recording", insufficient: "Not enough intervals",
    quality: "{quality}% signal confidence · {channel} channel", history: "Pulse sessions", savedCount: "{count} saved",
    historyDetail: "{bpm} BPM · {regularity} · {count} intervals", exportJson: "Export JSON", clearHistory: "Clear history", privacy: "Stored only in this browser.",
    warning: "Experimental pulse-timing screen only. It cannot diagnose atrial fibrillation or another heart condition. Seek medical assessment for symptoms or persistent concerns.",
    cameraSecure: "Camera access requires a supported browser and a secure HTTPS connection.", cameraDenied: "Camera permission was not granted.", cameraFailed: "The rear camera could not be started.",
    notEnoughFrames: "Not enough camera frames. Try again.", tooShort: "The recording was too short. Try again.", exposure: "Adjust your finger to avoid a dark or overexposed image.",
    noPulse: "No reliable pulse was detected. Cover the camera and flash completely.", lowQuality: "Signal quality was too low. Keep your fingertip still and try again.",
    stopped: "Recording stopped. Start again when ready.", unsuccessful: "Pulse analysis unsuccessful", clearConfirm: "Delete all saved pulse sessions? This cannot be undone."
  },
  zh: {
    meter: "测量", usage: "使用说明", appearance: "外观", classic: "经典", ivory: "象牙白", sheets: "表格",
    eyebrow: "60 秒记录", title: "脉搏分析", intro: "通过指尖摄像头信号查看脉搏时间变化。",
    ready: "准备就绪", initialInstruction: "请支撑好手部，完全覆盖后置摄像头和闪光灯，并保持静止一分钟。", signalQuality: "信号质量",
    start: "开始脉搏分析", stop: "停止记录", holdStill: "请保持指尖和手机静止整整一分钟。", seconds: "{count} 秒",
    adjustFinger: "调整手指", stabilizing: "信号稳定中", good: "良好", fair: "一般", poor: "较差",
    averagePulse: "摄像头平均脉搏", regularity: "脉搏规律性", meanInterval: "平均搏动间隔", detectedIntervals: "已分析间隔",
    regular: "本次记录内较规律", variable: "本次记录内有变化", insufficient: "间隔数量不足",
    quality: "信号置信度 {quality}% · {channel} 通道", history: "脉搏记录", savedCount: "已保存 {count} 条",
    historyDetail: "{bpm} BPM · {regularity} · {count} 个间隔", exportJson: "导出 JSON", clearHistory: "清除历史", privacy: "数据仅保存在本浏览器中。",
    warning: "这只是实验性脉搏时间筛查，不能诊断房颤或其他心脏疾病。如有症状或持续担忧，请接受医疗评估。",
    cameraSecure: "摄像头访问需要受支持的浏览器和安全的 HTTPS 连接。", cameraDenied: "未授予摄像头权限。", cameraFailed: "无法启动后置摄像头。",
    notEnoughFrames: "摄像头帧数不足，请重试。", tooShort: "记录时间过短，请重试。", exposure: "请调整手指，避免画面过暗或过度曝光。",
    noPulse: "未检测到可靠的脉搏波。请完全覆盖摄像头和闪光灯。", lowQuality: "信号质量过低。请保持指尖静止后重试。",
    stopped: "记录已停止。准备好后请重新开始。", unsuccessful: "脉搏分析未成功", clearConfirm: "删除所有已保存的脉搏记录？此操作无法撤销。"
  }
};

let currentLanguage = localStorage.getItem(LANGUAGE_KEY) || (navigator.language?.toLowerCase().startsWith("zh") ? "zh" : "en");
let stream = null, animationId = null, animationKind = null, samples = [], startedAt = 0;
const video = document.querySelector("#camera");
const canvas = document.querySelector("#sampleCanvas");
const context = canvas.getContext("2d", { willReadFrequently: true });
const measureButton = document.querySelector("#pulseMeasureButton");
const instruction = document.querySelector("#instruction");
const countdown = document.querySelector("#countdown");
const qualityBar = document.querySelector("#qualityBar");
const qualityLabel = document.querySelector("#qualityLabel");
const result = document.querySelector("#pulseResult");
const languageButton = document.querySelector("#languageButton");
const themeSelect = document.querySelector("#themeSelect");

function t(key, values = {}) {
  let text = TRANSLATIONS[currentLanguage][key] || TRANSLATIONS.en[key] || key;
  Object.entries(values).forEach(([name, value]) => { text = text.replaceAll(`{${name}}`, value); });
  return text;
}

function applyLanguage() {
  document.documentElement.lang = currentLanguage === "zh" ? "zh-CN" : "en";
  document.title = `${t("title")} · ${currentLanguage === "zh" ? "血压测量" : "Blood Measure"}`;
  document.querySelectorAll("[data-i18n]").forEach(element => { element.textContent = t(element.dataset.i18n); });
  languageButton.textContent = currentLanguage === "zh" ? "English" : "中文";
  renderHistory();
}

measureButton.addEventListener("click", () => stream ? stopRecording() : startRecording());
languageButton.addEventListener("click", () => {
  currentLanguage = currentLanguage === "en" ? "zh" : "en";
  localStorage.setItem(LANGUAGE_KEY, currentLanguage);
  applyLanguage();
});
themeSelect.value = document.documentElement.dataset.theme;
themeSelect.addEventListener("change", () => {
  document.documentElement.dataset.theme = themeSelect.value;
  localStorage.setItem(THEME_KEY, themeSelect.value);
});
document.querySelector("#exportPulseButton").addEventListener("click", exportHistory);
document.querySelector("#clearPulseButton").addEventListener("click", clearHistory);
window.addEventListener("pagehide", releaseCamera);

async function startRecording() {
  if (!navigator.mediaDevices?.getUserMedia) return showFailure(t("cameraSecure"));
  measureButton.disabled = true;
  result.hidden = true;
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: false, video: { facingMode: { ideal: "environment" }, width: { ideal: 640 }, height: { ideal: 480 } } });
    video.srcObject = stream;
    await video.play();
    const track = stream.getVideoTracks()[0];
    if (track.getCapabilities?.().torch) {
      try { await track.applyConstraints({ advanced: [{ torch: true }] }); } catch (_) { /* Torch support varies. */ }
    }
    samples = [];
    startedAt = performance.now();
    measureButton.textContent = t("stop");
    instruction.textContent = t("holdStill");
    scheduleCapture();
  } catch (error) {
    releaseCamera();
    showFailure(t(error.name === "NotAllowedError" ? "cameraDenied" : "cameraFailed"));
  } finally {
    measureButton.disabled = false;
  }
}

function scheduleCapture() {
  if (!stream) return;
  if (typeof video.requestVideoFrameCallback === "function") {
    animationKind = "video";
    animationId = video.requestVideoFrameCallback(captureFrame);
  } else {
    animationKind = "animation";
    animationId = requestAnimationFrame(captureFrame);
  }
}

function captureFrame(now = performance.now()) {
  if (!stream) return;
  if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
    let red = 0, green = 0, blue = 0;
    for (let index = 0; index < pixels.length; index += 4) {
      red += pixels[index]; green += pixels[index + 1]; blue += pixels[index + 2];
    }
    const count = pixels.length / 4;
    samples.push({ timestamp: now / 1000, red: red / count, green: green / count, blue: blue / count });
    updateLiveQuality();
  }
  const elapsed = (now - startedAt) / 1000;
  countdown.textContent = t("seconds", { count: Math.max(0, Math.ceil(RECORDING_SECONDS - elapsed)) });
  document.querySelector("#progress").style.boxShadow = `inset 0 0 0 ${Math.min(9, elapsed / RECORDING_SECONDS * 9)}px #ec6376`;
  if (elapsed >= RECORDING_SECONDS) finishRecording(); else scheduleCapture();
}

function finishRecording() {
  cancelCapture();
  try {
    const reading = window.BloodMeasurePPG.analyze(samples);
    const intervals = reading.beatIntervalsMs;
    const meanInterval = intervals.length ? average(intervals) : 0;
    const variability = intervals.length > 1 ? standardDeviation(intervals) / meanInterval : Infinity;
    const regularityKey = intervals.length < 10 ? "insufficient" : variability <= .10 ? "regular" : "variable";
    const session = { recordedAt: new Date().toISOString(), app: window.BLOOD_MEASURE_BUILD || null, ...reading, meanIntervalMs: Math.round(meanInterval), variability, regularity: regularityKey };
    saveSession(session);
    showResult(session);
    instruction.textContent = t("ready");
  } catch (error) {
    showFailure(t(error.code || error.message));
  }
  releaseCamera();
}

function showResult(session) {
  document.querySelector("#pulseResultTitle").textContent = t("averagePulse");
  document.querySelector("#pulseBpm").textContent = Math.round(session.bpm);
  document.querySelector("#regularityValue").textContent = t(session.regularity);
  document.querySelector("#meanIntervalValue").textContent = session.meanIntervalMs || "—";
  document.querySelector("#intervalCount").textContent = session.beatIntervalsMs.length;
  document.querySelector("#pulseQuality").textContent = t("quality", { quality: Math.round(session.quality * 100), channel: session.channel });
  drawIntervals(session.beatIntervalsMs);
  result.hidden = false;
}

function showFailure(message) {
  instruction.textContent = message;
  qualityLabel.textContent = t("poor");
  qualityBar.style.width = "0";
  result.hidden = false;
  document.querySelector("#pulseResultTitle").textContent = t("unsuccessful");
  document.querySelector("#pulseBpm").textContent = "—";
  document.querySelector("#regularityValue").textContent = message;
  document.querySelector("#meanIntervalValue").textContent = "—";
  document.querySelector("#intervalCount").textContent = "—";
}

function stopRecording() {
  cancelCapture();
  releaseCamera();
  instruction.textContent = t("stopped");
}

function cancelCapture() {
  if (animationId === null) return;
  if (animationKind === "video" && typeof video.cancelVideoFrameCallback === "function") video.cancelVideoFrameCallback(animationId);
  else cancelAnimationFrame(animationId);
  animationId = null;
}

function releaseCamera() {
  cancelCapture();
  if (stream) stream.getTracks().forEach(track => track.stop());
  stream = null;
  video.srcObject = null;
  measureButton.textContent = t("start");
  countdown.textContent = t("ready");
}

function updateLiveQuality() {
  const recentFrames = samples.slice(-90);
  const recent = ["red", "green", "blue"].map(name => recentFrames.map(sample => sample[name]))
    .filter(values => average(values) > 8 && average(values) < 250)
    .sort((left, right) => standardDeviation(right) - standardDeviation(left))[0];
  if (!recent) return setQuality(0, t("adjustFinger"));
  if (recent.length < 10) return;
  const contact = Math.max(0, Math.min(1, standardDeviation(recent) / 1.5));
  setQuality(contact, recentFrames.length < 45 ? t("stabilizing") : undefined);
}

function setQuality(value, label) {
  qualityBar.style.width = `${Math.round(value * 100)}%`;
  qualityLabel.textContent = label || (value >= .70 ? t("good") : value >= .40 ? t("fair") : t("poor"));
}

function drawIntervals(intervals) {
  const chart = document.querySelector("#intervalChart");
  const ctx = chart.getContext("2d");
  ctx.clearRect(0, 0, chart.width, chart.height);
  if (intervals.length < 2) return;
  const low = Math.max(250, Math.min(...intervals) - 80), high = Math.min(2000, Math.max(...intervals) + 80);
  const pad = { left: 55, right: 16, top: 16, bottom: 30 };
  ctx.strokeStyle = "#e2d7d6"; ctx.fillStyle = "#806c70"; ctx.font = "18px system-ui";
  for (let row = 0; row <= 4; row++) {
    const y = pad.top + row * (chart.height - pad.top - pad.bottom) / 4;
    const value = Math.round(high - row * (high - low) / 4);
    ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(chart.width - pad.right, y); ctx.stroke(); ctx.fillText(String(value), 3, y + 6);
  }
  ctx.beginPath(); ctx.strokeStyle = "#188038"; ctx.lineWidth = 4; ctx.lineJoin = "round";
  intervals.forEach((value, index) => {
    const x = pad.left + index / (intervals.length - 1) * (chart.width - pad.left - pad.right);
    const y = pad.top + (high - value) / (high - low) * (chart.height - pad.top - pad.bottom);
    if (index === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  });
  ctx.stroke();
}

function loadHistory() {
  try { const value = JSON.parse(localStorage.getItem(PULSE_STORAGE_KEY) || "[]"); return Array.isArray(value) ? value : []; }
  catch (_) { return []; }
}

function saveSession(session) {
  const history = loadHistory();
  history.unshift(session);
  localStorage.setItem(PULSE_STORAGE_KEY, JSON.stringify(history.slice(0, 30)));
  renderHistory();
}

function renderHistory() {
  const history = loadHistory();
  const section = document.querySelector("#pulseHistory");
  section.hidden = history.length === 0;
  document.querySelector("#pulseHistoryCount").textContent = t("savedCount", { count: history.length });
  document.querySelector("#pulseHistoryList").replaceChildren(...history.slice(0, 8).map(session => {
    const row = document.createElement("div"); row.className = "history-item";
    const strong = document.createElement("strong"); strong.textContent = `${Math.round(session.bpm)} BPM`;
    const time = document.createElement("time"); time.dateTime = session.recordedAt; time.textContent = new Date(session.recordedAt).toLocaleString(currentLanguage === "zh" ? "zh-CN" : undefined, { dateStyle: "medium", timeStyle: "short" });
    const detail = document.createElement("small"); detail.textContent = t("historyDetail", { bpm: Math.round(session.bpm), regularity: t(session.regularity), count: session.beatIntervalsMs.length });
    row.append(strong, time, detail); return row;
  }));
}

function exportHistory() {
  const sessions = loadHistory();
  if (!sessions.length) return;
  const data = { format: "blood-measure-pulse-v1", app: window.BLOOD_MEASURE_BUILD || null, exportedAt: new Date().toISOString(), sessions };
  const link = document.createElement("a"); link.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
  link.download = `blood-measure-pulse-${new Date().toISOString().slice(0, 10)}.json`; link.click();
  setTimeout(() => URL.revokeObjectURL(link.href), 1000);
}

function clearHistory() {
  if (!confirm(t("clearConfirm"))) return;
  localStorage.removeItem(PULSE_STORAGE_KEY);
  renderHistory();
}

function average(values) { return values.reduce((sum, value) => sum + value, 0) / values.length; }
function standardDeviation(values) { const mean = average(values); return Math.sqrt(average(values.map(value => (value - mean) ** 2))); }

if ("serviceWorker" in navigator && window.isSecureContext) navigator.serviceWorker.register("service-worker.js").catch(() => {});
applyLanguage();
