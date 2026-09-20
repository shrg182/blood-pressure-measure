"use strict";

const RECORDING_SECONDS = 15;
const LANGUAGE_KEY = "blood-measure-language";
const THEME_KEY = "blood-measure-theme";
const TRANSLATIONS = {
  en: {
    personalReference: "PERSONAL REFERENCE", appName: "Blood Measure", usage: "Usage", appearance: "Appearance", classic: "Classic", ivory: "Ivory",
    ready: "Ready", initialInstruction: "Sit comfortably and rest for a moment before starting.", signalQuality: "Signal quality",
    startMeasurement: "Start measurement", stopMeasurement: "Stop measurement", experimentalEstimate: "Experimental blood pressure estimate",
    pulse: "Pulse", adjustedPulse: "Pulse estimate", cuffPulse: "Cuff pulse", estimateWarning: "Camera-derived experimental estimate. Compare it with your cuff; do not use it for diagnosis, medication, or emergency decisions.",
    addCuffReference: "Add a cuff reference", cuffInstruction: "Take a validated upper-arm cuff blood-pressure and pulse reading immediately after this recording.",
    systolic: "Systolic", diastolic: "Diastolic", savePairedReading: "Save paired reading", pairedReadings: "Paired readings",
    exportJson: "Export JSON", clearHistory: "Clear history", privacyNote: "Stored only in this browser. Clearing browser data will remove it.",
    installApp: "Install app", importantLimitation: "Important limitation",
    limitationText: "A phone camera detects a pulse waveform and cannot directly measure blood pressure. Personal adjustment only changes the displayed estimate and does not make it a medical measurement. Confirm every health decision or unusual reading with a validated upper-arm cuff or a clinician.",
    cameraSecure: "Camera access requires a supported browser and a secure HTTPS connection.", cameraDenied: "Camera permission was not granted.",
    cameraFailed: "The rear camera could not be started.", holdStill: "Keep your fingertip still and use gentle, steady pressure.", seconds: "{count} sec",
    adjustFinger: "Adjust finger", stabilizing: "Stabilizing", good: "Good", fair: "Fair", poor: "Poor",
    adjusted: "adjusted with {count} cuff comparison{suffix}", uncalibrated: "uncalibrated population heuristic",
    pulseAdjusted: "Camera detected {raw} BPM; adjusted using {count} paired cuff readings.",
    pulseUnadjusted: "Camera-detected pulse. Personal adjustment starts after {required} paired cuff readings ({count} saved).",
    confidence: "{quality}% signal confidence · {adjustment}", complete: "Reading complete. Repeat while still if the result seems unusual.",
    stopped: "Measurement stopped. Keep your finger still and try again.", notEnoughFrames: "Not enough camera frames. Try again.",
    tooShort: "The recording was too short. Try again.", exposure: "Adjust your finger to avoid a dark or overexposed image.",
    noPulse: "No reliable pulse was detected. Cover the camera and flash completely.", lowQuality: "Signal quality was too low. Keep your fingertip still and try again.",
    unsuccessful: "Measurement unsuccessful", completeFirst: "Complete a fingertip recording first.", invalidPressure: "Systolic should be higher than diastolic.",
    invalidPulse: "Enter a cuff pulse between 35 and 220 BPM.",
    storageFailed: "This browser could not store the reading.", saved: "Paired reading saved locally.", savedCount: "{count} saved",
    historyDetail: "camera {bpm} BPM · cuff {cuffPulse} BPM · {quality}% confidence{estimate}", cameraEstimate: " · camera estimate {systolic}/{diastolic}",
    clearConfirm: "Delete all locally stored paired readings? This cannot be undone."
  },
  zh: {
    personalReference: "个人参考", appName: "血压测量", usage: "使用说明", appearance: "外观", classic: "经典", ivory: "象牙白", ready: "准备就绪",
    initialInstruction: "开始前请舒适坐好并稍作休息。", signalQuality: "信号质量", startMeasurement: "开始测量", stopMeasurement: "停止测量",
    experimentalEstimate: "实验性血压估计", pulse: "脉搏", adjustedPulse: "脉搏估计", cuffPulse: "袖带脉搏", estimateWarning: "此结果由手机摄像头实验性估算。请与袖带式血压计对照；勿用于诊断、用药或紧急医疗决定。",
    addCuffReference: "添加袖带血压参考值", cuffInstruction: "请在本次测量后立即使用经过验证的上臂式血压计测量血压和脉搏。",
    systolic: "收缩压", diastolic: "舒张压", savePairedReading: "保存配对读数", pairedReadings: "配对读数", exportJson: "导出 JSON",
    clearHistory: "清除历史", privacyNote: "数据仅保存在本浏览器中。清除浏览器数据会将其删除。", installApp: "安装应用", importantLimitation: "重要限制",
    limitationText: "手机摄像头只能检测脉搏波，无法直接测量血压。个人调整只会改变显示的估计值，不会使其成为医疗测量。任何健康决定或异常读数都应使用经过验证的上臂式血压计或咨询医生确认。",
    cameraSecure: "摄像头访问需要受支持的浏览器和安全的 HTTPS 连接。", cameraDenied: "未授予摄像头权限。", cameraFailed: "无法启动后置摄像头。",
    holdStill: "请保持指尖静止并使用轻柔、稳定的压力。", seconds: "{count} 秒", adjustFinger: "调整手指", stabilizing: "信号稳定中",
    good: "良好", fair: "一般", poor: "较差", adjusted: "已根据 {count} 次袖带对照进行调整", uncalibrated: "未经校准的群体启发式算法",
    pulseAdjusted: "摄像头检测为 {raw} BPM；已使用 {count} 条袖带配对读数调整。",
    pulseUnadjusted: "摄像头检测的脉搏。保存 {required} 条袖带配对读数后开始个人调整（已保存 {count} 条）。",
    confidence: "信号置信度 {quality}% · {adjustment}", complete: "测量完成。如结果异常，请保持静止后重新测量。", stopped: "测量已停止。请保持手指静止后重试。",
    notEnoughFrames: "摄像头帧数不足，请重试。", tooShort: "测量时间过短，请重试。", exposure: "请调整手指，避免画面过暗或过度曝光。",
    noPulse: "未检测到可靠的脉搏波。请完全覆盖摄像头和闪光灯。", lowQuality: "信号质量过低。请保持指尖静止后重试。", unsuccessful: "测量未成功",
    completeFirst: "请先完成一次指尖测量。", invalidPressure: "收缩压应高于舒张压。", invalidPulse: "请输入 35 至 220 BPM 的袖带脉搏。", storageFailed: "此浏览器无法保存该读数。",
    saved: "配对读数已保存在本机。", savedCount: "已保存 {count} 条", historyDetail: "摄像头 {bpm} BPM · 袖带 {cuffPulse} BPM · 置信度 {quality}%{estimate}",
    cameraEstimate: " · 摄像头估计 {systolic}/{diastolic}", clearConfirm: "删除所有保存在本机的配对读数？此操作无法撤销。"
  }
};
let currentLanguage = localStorage.getItem(LANGUAGE_KEY) || (navigator.language?.toLowerCase().startsWith("zh") ? "zh" : "en");

function t(key, values = {}) {
  let text = TRANSLATIONS[currentLanguage][key] || TRANSLATIONS.en[key] || key;
  Object.entries(values).forEach(([name, value]) => { text = text.replaceAll(`{${name}}`, value); });
  return text;
}

function applyLanguage() {
  document.documentElement.lang = currentLanguage === "zh" ? "zh-CN" : "en";
  document.title = t("appName");
  document.querySelectorAll("[data-i18n]").forEach(element => { element.textContent = t(element.dataset.i18n); });
  document.querySelector("#languageButton").textContent = currentLanguage === "zh" ? "English" : "中文";
  renderHistory();
}
const video = document.querySelector("#camera");
const canvas = document.querySelector("#sampleCanvas");
const context = canvas.getContext("2d", { willReadFrequently: true });
const button = document.querySelector("#measureButton");
const instruction = document.querySelector("#instruction");
const countdown = document.querySelector("#countdown");
const qualityBar = document.querySelector("#qualityBar");
const qualityLabel = document.querySelector("#qualityLabel");
const result = document.querySelector("#result");
const resultTitle = document.querySelector("#resultTitle");
const pressureValue = document.querySelector("#pressureValue");
const estimatedSystolic = document.querySelector("#estimatedSystolic");
const estimatedDiastolic = document.querySelector("#estimatedDiastolic");
const pulseValue = document.querySelector("#pulseValue");
const heartRate = document.querySelector("#heartRate");
const pulseAdjustment = document.querySelector("#pulseAdjustment");
const resultQuality = document.querySelector("#resultQuality");
const referenceForm = document.querySelector("#referenceForm");
const saveMessage = document.querySelector("#saveMessage");
const historySection = document.querySelector("#historySection");
const historyList = document.querySelector("#historyList");
const historyCount = document.querySelector("#historyCount");
const trendChart = document.querySelector("#trendChart");
const installButton = document.querySelector("#installButton");
const languageButton = document.querySelector("#languageButton");
const themeSelect = document.querySelector("#themeSelect");
const STORAGE_KEY = "blood-measure-paired-readings-v1";

let stream = null;
let animationId = null;
let animationKind = null;
let samples = [];
let startedAt = 0;
let latestReading = null;
let installPrompt = null;

button.addEventListener("click", () => stream ? stopMeasurement() : startMeasurement());
referenceForm.addEventListener("submit", saveReferenceReading);
document.querySelector("#exportButton").addEventListener("click", exportHistory);
document.querySelector("#clearButton").addEventListener("click", clearHistory);
installButton.addEventListener("click", installApp);
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
window.addEventListener("pagehide", releaseCamera);
window.addEventListener("beforeinstallprompt", event => {
  event.preventDefault();
  installPrompt = event;
  installButton.hidden = false;
});
window.addEventListener("appinstalled", () => {
  installPrompt = null;
  installButton.hidden = true;
});
applyLanguage();
registerServiceWorker();

async function startMeasurement() {
  if (!navigator.mediaDevices?.getUserMedia) {
    showError(t("cameraSecure"));
    return;
  }
  button.disabled = true;
  result.hidden = true;
  result.classList.remove("error");
  resultTitle.textContent = t("experimentalEstimate");
  pressureValue.hidden = false;
  pulseValue.hidden = false;
  referenceForm.hidden = false;
  latestReading = null;
  saveMessage.textContent = "";
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: { facingMode: { ideal: "environment" }, width: { ideal: 640 }, height: { ideal: 480 } }
    });
    video.srcObject = stream;
    await video.play();
    await enableTorch(stream.getVideoTracks()[0]);
    samples = [];
    startedAt = performance.now();
    button.textContent = t("stopMeasurement");
    instruction.textContent = t("holdStill");
    scheduleCapture();
  } catch (error) {
    releaseCamera();
    showError(error.name === "NotAllowedError" ? t("cameraDenied") : t("cameraFailed"));
  } finally {
    button.disabled = false;
  }
}

async function enableTorch(track) {
  const capabilities = track.getCapabilities?.();
  if (capabilities?.torch) {
    try { await track.applyConstraints({ advanced: [{ torch: true }] }); } catch (_) { /* unsupported by some browsers */ }
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

function cancelCapture() {
  if (animationId === null) return;
  if (animationKind === "video" && typeof video.cancelVideoFrameCallback === "function") {
    video.cancelVideoFrameCallback(animationId);
  } else {
    cancelAnimationFrame(animationId);
  }
  animationId = null;
  animationKind = null;
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
    updateQuality();
  }

  const elapsed = (now - startedAt) / 1000;
  countdown.textContent = t("seconds", { count: Math.max(0, Math.ceil(RECORDING_SECONDS - elapsed)) });
  document.querySelector("#progress").style.boxShadow = `inset 0 0 0 ${Math.min(9, elapsed / RECORDING_SECONDS * 9)}px #ec6376`;
  if (elapsed >= RECORDING_SECONDS) finishMeasurement();
  else scheduleCapture();
}

function updateQuality() {
  const recentFrames = samples.slice(-90);
  const recent = ["red", "green", "blue"]
    .map(name => recentFrames.map(sample => sample[name]))
    .filter(values => average(values) > 8 && average(values) < 250)
    .sort((left, right) => standardDeviation(right) - standardDeviation(left))[0];
  if (!recent) {
    setQualityDisplay(0, t("adjustFinger"));
    return;
  }
  if (recent.length < 10) return;
  const mean = average(recent);
  const variation = standardDeviation(recent);
  const exposure = mean > 12 && mean < 250 ? 1 : 0;
  const contact = Math.max(0, Math.min(1, exposure * variation / 1.5));
  setQualityDisplay(contact, recentFrames.length < 45 ? t("stabilizing") : undefined);
}

function finishMeasurement() {
  cancelCapture();
  try {
    const reading = analyzePPG(samples);
    const history = loadHistory();
    reading.bpEstimate = estimateBloodPressure(reading, history);
    reading.pulseEstimate = adjustPulse(reading, history);
    latestReading = reading;
    heartRate.textContent = reading.pulseEstimate.bpm;
    pulseAdjustment.textContent = reading.pulseEstimate.referenceCount >= 3
      ? t("pulseAdjusted", { raw: Math.round(reading.bpm), count: reading.pulseEstimate.referenceCount })
      : t("pulseUnadjusted", { required: 3, count: reading.pulseEstimate.referenceCount });
    estimatedSystolic.textContent = reading.bpEstimate.systolic;
    estimatedDiastolic.textContent = reading.bpEstimate.diastolic;
    const adjustment = reading.bpEstimate.referenceCount
      ? t("adjusted", { count: reading.bpEstimate.referenceCount, suffix: reading.bpEstimate.referenceCount === 1 ? "" : "s" })
      : t("uncalibrated");
    resultQuality.textContent = t("confidence", { quality: Math.round(reading.quality * 100), adjustment });
    setQualityDisplay(reading.quality);
    result.hidden = false;
    instruction.textContent = t("complete");
  } catch (error) {
    showMeasurementFailure(error.message);
  }
  releaseCamera();
}

function stopMeasurement() {
  cancelCapture();
  releaseCamera();
  instruction.textContent = t("stopped");
}

function releaseCamera() {
  cancelCapture();
  if (stream) stream.getTracks().forEach(track => track.stop());
  stream = null;
  video.srcObject = null;
  button.textContent = t("startMeasurement");
  countdown.textContent = t("ready");
}

function analyzePPG(frames) {
  if (frames.length < 40) throw new Error(t("notEnoughFrames"));
  const duration = frames.at(-1).timestamp - frames[0].timestamp;
  if (duration < 8) throw new Error(t("tooShort"));
  const intervals = frames.slice(1).map((frame, index) => frame.timestamp - frames[index].timestamp);
  const sampleRate = 1 / median(intervals);
  const channels = ["red", "green", "blue"].map(name => {
    const values = frames.map(frame => frame[name]);
    const clipped = values.filter(value => value <= 1 || value >= 254).length / values.length;
    return { name, values, clipped };
  });
  const usableChannels = channels.filter(channel => average(channel.values) >= 8 && channel.clipped <= .35);
  if (!usableChannels.length) throw new Error(t("exposure"));
  const minLag = Math.max(1, Math.round(sampleRate * 60 / 200));
  const maxLag = Math.min(Math.floor(frames.length / 2), Math.round(sampleRate * 60 / 40));
  const candidates = usableChannels.map(channel => analyzeChannel(channel, sampleRate, minLag, maxLag)).filter(Boolean);
  if (!candidates.length) throw new Error(t("noPulse"));
  const selected = candidates.reduce((best, candidate) => candidate.peak.value > best.peak.value ? candidate : best);
  const { centered, scale, signal, correlations, peakIndex, peak } = selected;
  if (peak.value < .18) throw new Error(t("lowQuality"));
  let lag = peak.lag;
  if (peakIndex > 0 && peakIndex < correlations.length - 1) {
    const previous = correlations[peakIndex - 1].value, current = peak.value, next = correlations[peakIndex + 1].value;
    const curvature = previous - 2 * current + next;
    if (curvature) lag += .5 * (previous - next) / curvature;
  }
  const waveform = downsample(centered.map(value => value / scale), 150).map(value => Number(value.toFixed(4)));
  // A correlation coefficient is not itself a percentage. Map the useful
  // real-camera range (roughly .10-.60) onto a user-facing confidence scale.
  const confidence = Math.max(0, Math.min(1, (peak.value - .10) / .50));
  return {
    bpm: 60 * sampleRate / lag,
    quality: confidence,
    durationSeconds: duration,
    sampleRateHz: sampleRate,
    channel: selected.name,
    waveform
  };
}

function analyzeChannel(channel, sampleRate, minLag, maxLag) {
  const baseline = movingAverage(channel.values, Math.max(3, Math.round(sampleRate * .75)));
  const centered = channel.values.map((value, index) => value - baseline[index]);
  const scale = Math.sqrt(average(centered.map(value => value * value)));
  if (scale < .15) return null;
  const normalized = centered.map(value => value / scale);
  const signal = movingAverage(normalized, Math.max(1, Math.round(sampleRate * .10)));
  const correlations = [];
  for (let lag = minLag; lag <= maxLag; lag++) correlations.push({ lag, value: autocorrelation(signal, lag) });
  const strongest = Math.max(...correlations.map(item => item.value));
  const peakIndex = correlations.findIndex((item, index) => item.value >= strongest * .95 &&
    (index === 0 || item.value >= correlations[index - 1].value) &&
    (index === correlations.length - 1 || item.value >= correlations[index + 1].value));
  if (peakIndex < 0) return null;
  return { name: channel.name, centered, scale, signal, correlations, peakIndex, peak: correlations[peakIndex] };
}

function movingAverage(values, windowSize) {
  const radius = Math.floor(windowSize / 2), prefix = [0];
  values.forEach(value => prefix.push(prefix.at(-1) + value));
  return values.map((_, index) => {
    const start = Math.max(0, index - radius), end = Math.min(values.length, index + radius + 1);
    return (prefix[end] - prefix[start]) / (end - start);
  });
}

function autocorrelation(values, lag) {
  let product = 0, leftEnergy = 0, rightEnergy = 0;
  for (let index = 0; index < values.length - lag; index++) {
    product += values[index] * values[index + lag];
    leftEnergy += values[index] ** 2; rightEnergy += values[index + lag] ** 2;
  }
  return product / Math.sqrt(leftEnergy * rightEnergy);
}

function average(values) { return values.reduce((sum, value) => sum + value, 0) / values.length; }
function standardDeviation(values) { const mean = average(values); return Math.sqrt(average(values.map(value => (value - mean) ** 2))); }
function median(values) { const sorted = [...values].sort((a, b) => a - b); return sorted[Math.floor(sorted.length / 2)]; }
function showError(message) { instruction.textContent = message; qualityLabel.textContent = t("poor"); qualityBar.style.width = "0"; }

function setQualityDisplay(quality, temporaryLabel) {
  qualityBar.style.width = `${Math.round(quality * 100)}%`;
  qualityLabel.textContent = temporaryLabel || (quality >= .70 ? t("good") : quality >= .40 ? t("fair") : t("poor"));
}

function showMeasurementFailure(message) {
  showError(message);
  result.classList.add("error");
  resultTitle.textContent = t("unsuccessful");
  pressureValue.hidden = true;
  pulseValue.hidden = true;
  resultQuality.textContent = message;
  referenceForm.hidden = true;
  result.hidden = false;
}

function estimateBloodPressure(reading, history = []) {
  // This deliberately conservative heuristic provides a comparison value, not
  // a physiological BP measurement. Camera PPG has no absolute pressure scale.
  const waveform = reading.waveform || [];
  const roughness = waveform.length > 1
    ? average(waveform.slice(1).map((value, index) => Math.abs(value - waveform[index])))
    : .2;
  const heartRateOffset = Math.max(-35, Math.min(80, reading.bpm - 70));
  const shapeOffset = Math.max(-1, Math.min(1, (roughness - .22) / .18));
  const raw = {
    systolic: 118 + .28 * heartRateOffset + 5 * shapeOffset,
    diastolic: 76 + .14 * heartRateOffset + 3 * shapeOffset
  };

  const comparisons = history.filter(item =>
    Number.isFinite(item?.cuff?.systolic) && Number.isFinite(item?.cuff?.diastolic) &&
    Number.isFinite(item?.ppg?.bpm) && item.ppg.quality >= .40
  ).slice(0, 10);
  let systolicCorrection = 0, diastolicCorrection = 0;
  if (comparisons.length >= 3) {
    const residuals = comparisons.map(item => {
      const prior = estimateBloodPressure(item.ppg, []);
      return {
        systolic: item.cuff.systolic - prior.systolic,
        diastolic: item.cuff.diastolic - prior.diastolic
      };
    });
    systolicCorrection = Math.max(-25, Math.min(25, median(residuals.map(item => item.systolic))));
    diastolicCorrection = Math.max(-15, Math.min(15, median(residuals.map(item => item.diastolic))));
  }

  const systolic = Math.round(Math.max(80, Math.min(200, raw.systolic + systolicCorrection)));
  const diastolic = Math.round(Math.max(45, Math.min(130, raw.diastolic + diastolicCorrection)));
  return {
    systolic: Math.max(systolic, diastolic + 10),
    diastolic,
    referenceCount: comparisons.length >= 3 ? comparisons.length : 0,
    method: comparisons.length >= 3 ? "personal-median-offset-v2" : "population-heuristic-v1"
  };
}

function adjustPulse(reading, history = []) {
  const comparisons = history
    .filter(item => Number.isFinite(item?.cuff?.pulse) && Number.isFinite(item?.ppg?.bpm) && item.ppg.quality >= .40)
    .slice(0, 10);
  if (comparisons.length < 3) {
    return { bpm: Math.round(reading.bpm), rawBpm: reading.bpm, correction: 0, referenceCount: comparisons.length, method: "camera-ppg-v1" };
  }
  const residuals = comparisons.map(item => item.cuff.pulse - item.ppg.bpm);
  const correction = Math.max(-20, Math.min(20, median(residuals)));
  return {
    bpm: Math.round(Math.max(35, Math.min(220, reading.bpm + correction))),
    rawBpm: reading.bpm,
    correction: Number(correction.toFixed(1)),
    referenceCount: comparisons.length,
    method: "personal-median-offset-v1"
  };
}

function downsample(values, targetLength) {
  if (values.length <= targetLength) return values;
  const result = [];
  for (let bucket = 0; bucket < targetLength; bucket++) {
    const start = Math.floor(bucket * values.length / targetLength);
    const end = Math.max(start + 1, Math.floor((bucket + 1) * values.length / targetLength));
    result.push(average(values.slice(start, end)));
  }
  return result;
}

function loadHistory() {
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(value) ? value : [];
  } catch (_) {
    return [];
  }
}

function saveReferenceReading(event) {
  event.preventDefault();
  if (!latestReading) {
    saveMessage.textContent = t("completeFirst");
    return;
  }
  const systolic = Number(document.querySelector("#systolic").value);
  const diastolic = Number(document.querySelector("#diastolic").value);
  const cuffPulse = Number(document.querySelector("#cuffPulse").value);
  if (systolic <= diastolic) {
    saveMessage.textContent = t("invalidPressure");
    return;
  }
  if (!Number.isFinite(cuffPulse) || cuffPulse < 35 || cuffPulse > 220) {
    saveMessage.textContent = t("invalidPulse");
    return;
  }
  const history = loadHistory();
  history.unshift({
    recordedAt: new Date().toISOString(),
    cuff: { systolic, diastolic, pulse: cuffPulse },
    ppg: latestReading
  });
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history.slice(0, 100)));
  } catch (_) {
    saveMessage.textContent = t("storageFailed");
    return;
  }
  referenceForm.reset();
  latestReading = null;
  saveMessage.textContent = t("saved");
  renderHistory();
}

function renderHistory() {
  const history = loadHistory();
  historySection.hidden = history.length === 0;
  historyCount.textContent = t("savedCount", { count: history.length });
  historyList.replaceChildren(...history.slice(0, 8).map(reading => {
    const row = document.createElement("div");
    row.className = "history-item";
    const pressure = document.createElement("strong");
    pressure.textContent = `${reading.cuff.systolic}/${reading.cuff.diastolic} mmHg`;
    const date = document.createElement("time");
    date.dateTime = reading.recordedAt;
    date.textContent = new Date(reading.recordedAt).toLocaleString(currentLanguage === "zh" ? "zh-CN" : undefined, { dateStyle: "medium", timeStyle: "short" });
    const detail = document.createElement("small");
    const estimate = reading.ppg.bpEstimate;
    const estimateText = estimate ? t("cameraEstimate", { systolic: estimate.systolic, diastolic: estimate.diastolic }) : "";
    detail.textContent = t("historyDetail", {
      bpm: Math.round(reading.ppg.bpm),
      cuffPulse: Number.isFinite(reading.cuff.pulse) ? Math.round(reading.cuff.pulse) : "—",
      quality: Math.round(reading.ppg.quality * 100),
      estimate: estimateText
    });
    row.append(pressure, date, detail);
    return row;
  }));
  drawTrend(history);
}

function exportHistory() {
  const history = loadHistory();
  if (!history.length) return;
  const blob = new Blob([JSON.stringify({ format: "blood-measure-v1", readings: history }, null, 2)], { type: "application/json" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `blood-measure-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(link.href), 1000);
}

function clearHistory() {
  if (!confirm(t("clearConfirm"))) return;
  localStorage.removeItem(STORAGE_KEY);
  renderHistory();
}

function drawTrend(history) {
  const context = trendChart.getContext("2d");
  const width = trendChart.width, height = trendChart.height;
  context.clearRect(0, 0, width, height);
  if (!history.length) return;
  const readings = history.slice(0, 30).reverse();
  const values = readings.flatMap(item => [item.cuff.systolic, item.cuff.diastolic]);
  const low = Math.max(30, Math.floor((Math.min(...values) - 10) / 10) * 10);
  const high = Math.min(280, Math.ceil((Math.max(...values) + 10) / 10) * 10);
  const padding = { left: 42, right: 14, top: 14, bottom: 24 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  context.font = "20px system-ui";
  context.fillStyle = "#8a777a";
  context.strokeStyle = "#eee2df";
  context.lineWidth = 1;
  for (let value = Math.ceil(low / 20) * 20; value <= high; value += 20) {
    const y = padding.top + (high - value) / (high - low) * chartHeight;
    context.beginPath(); context.moveTo(padding.left, y); context.lineTo(width - padding.right, y); context.stroke();
    context.fillText(String(value), 2, y + 7);
  }
  drawSeries("systolic", "#982e42");
  drawSeries("diastolic", "#d88958");

  function drawSeries(field, color) {
    context.beginPath(); context.strokeStyle = color; context.lineWidth = 5; context.lineJoin = "round";
    readings.forEach((reading, index) => {
      const x = padding.left + (readings.length === 1 ? chartWidth / 2 : index / (readings.length - 1) * chartWidth);
      const y = padding.top + (high - reading.cuff[field]) / (high - low) * chartHeight;
      if (index === 0) context.moveTo(x, y); else context.lineTo(x, y);
    });
    context.stroke();
  }
}

async function installApp() {
  if (!installPrompt) return;
  installPrompt.prompt();
  await installPrompt.userChoice;
  installPrompt = null;
  installButton.hidden = true;
}

function registerServiceWorker() {
  if ("serviceWorker" in navigator && window.isSecureContext) {
    navigator.serviceWorker.register("service-worker.js").catch(() => {
      // The measurement interface still works if offline installation is unavailable.
    });
  }
}
