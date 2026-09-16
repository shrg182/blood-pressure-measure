"use strict";

const RECORDING_SECONDS = 15;
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
const resultQuality = document.querySelector("#resultQuality");
const referenceForm = document.querySelector("#referenceForm");
const saveMessage = document.querySelector("#saveMessage");
const historySection = document.querySelector("#historySection");
const historyList = document.querySelector("#historyList");
const historyCount = document.querySelector("#historyCount");
const trendChart = document.querySelector("#trendChart");
const installButton = document.querySelector("#installButton");
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
renderHistory();
registerServiceWorker();

async function startMeasurement() {
  if (!navigator.mediaDevices?.getUserMedia) {
    showError("Camera access requires a supported browser and a secure HTTPS connection.");
    return;
  }
  button.disabled = true;
  result.hidden = true;
  result.classList.remove("error");
  resultTitle.textContent = "Experimental blood pressure estimate";
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
    button.textContent = "Stop measurement";
    instruction.textContent = "Keep your fingertip still and use gentle, steady pressure.";
    scheduleCapture();
  } catch (error) {
    releaseCamera();
    showError(error.name === "NotAllowedError" ? "Camera permission was not granted." : "The rear camera could not be started.");
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
  countdown.textContent = `${Math.max(0, Math.ceil(RECORDING_SECONDS - elapsed))} sec`;
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
    setQualityDisplay(0, "Adjust finger");
    return;
  }
  if (recent.length < 10) return;
  const mean = average(recent);
  const variation = standardDeviation(recent);
  const exposure = mean > 12 && mean < 250 ? 1 : 0;
  const contact = Math.max(0, Math.min(1, exposure * variation / 1.5));
  setQualityDisplay(contact, recentFrames.length < 45 ? "Stabilizing" : undefined);
}

function finishMeasurement() {
  cancelCapture();
  try {
    const reading = analyzePPG(samples);
    reading.bpEstimate = estimateBloodPressure(reading, loadHistory());
    latestReading = reading;
    heartRate.textContent = reading.bpm.toFixed(0);
    estimatedSystolic.textContent = reading.bpEstimate.systolic;
    estimatedDiastolic.textContent = reading.bpEstimate.diastolic;
    const adjustment = reading.bpEstimate.referenceCount
      ? `adjusted with ${reading.bpEstimate.referenceCount} cuff comparison${reading.bpEstimate.referenceCount === 1 ? "" : "s"}`
      : "uncalibrated population heuristic";
    resultQuality.textContent = `${Math.round(reading.quality * 100)}% signal confidence · ${adjustment}`;
    setQualityDisplay(reading.quality);
    result.hidden = false;
    instruction.textContent = "Reading complete. Repeat while still if the result seems unusual.";
  } catch (error) {
    showMeasurementFailure(error.message);
  }
  releaseCamera();
}

function stopMeasurement() {
  cancelCapture();
  releaseCamera();
  instruction.textContent = "Measurement stopped. Keep your finger still and try again.";
}

function releaseCamera() {
  cancelCapture();
  if (stream) stream.getTracks().forEach(track => track.stop());
  stream = null;
  video.srcObject = null;
  button.textContent = "Start measurement";
  countdown.textContent = "Ready";
}

function analyzePPG(frames) {
  if (frames.length < 40) throw new Error("Not enough camera frames. Try again.");
  const duration = frames.at(-1).timestamp - frames[0].timestamp;
  if (duration < 8) throw new Error("The recording was too short. Try again.");
  const intervals = frames.slice(1).map((frame, index) => frame.timestamp - frames[index].timestamp);
  const sampleRate = 1 / median(intervals);
  const channels = ["red", "green", "blue"].map(name => {
    const values = frames.map(frame => frame[name]);
    const clipped = values.filter(value => value <= 1 || value >= 254).length / values.length;
    return { name, values, clipped };
  });
  const usableChannels = channels.filter(channel => average(channel.values) >= 8 && channel.clipped <= .35);
  if (!usableChannels.length) throw new Error("Adjust your finger to avoid a dark or overexposed image.");
  const minLag = Math.max(1, Math.round(sampleRate * 60 / 200));
  const maxLag = Math.min(Math.floor(frames.length / 2), Math.round(sampleRate * 60 / 40));
  const candidates = usableChannels.map(channel => analyzeChannel(channel, sampleRate, minLag, maxLag)).filter(Boolean);
  if (!candidates.length) throw new Error("No reliable pulse was detected. Cover the camera and flash completely.");
  const selected = candidates.reduce((best, candidate) => candidate.peak.value > best.peak.value ? candidate : best);
  const { centered, scale, signal, correlations, peakIndex, peak } = selected;
  if (peak.value < .18) throw new Error("Signal quality was too low. Keep your fingertip still and try again.");
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
function showError(message) { instruction.textContent = message; qualityLabel.textContent = "Poor"; qualityBar.style.width = "0"; }

function setQualityDisplay(quality, temporaryLabel) {
  qualityBar.style.width = `${Math.round(quality * 100)}%`;
  qualityLabel.textContent = temporaryLabel || (quality >= .70 ? "Good" : quality >= .40 ? "Fair" : "Poor");
}

function showMeasurementFailure(message) {
  showError(message);
  result.classList.add("error");
  resultTitle.textContent = "Measurement unsuccessful";
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

  const comparisons = history.filter(item => item?.cuff && item?.ppg).slice(0, 10);
  let systolicCorrection = 0, diastolicCorrection = 0;
  if (comparisons.length) {
    const residuals = comparisons.map(item => {
      const prior = estimateBloodPressure(item.ppg, []);
      return {
        systolic: item.cuff.systolic - prior.systolic,
        diastolic: item.cuff.diastolic - prior.diastolic
      };
    });
    systolicCorrection = Math.max(-25, Math.min(25, average(residuals.map(item => item.systolic))));
    diastolicCorrection = Math.max(-15, Math.min(15, average(residuals.map(item => item.diastolic))));
  }

  const systolic = Math.round(Math.max(80, Math.min(200, raw.systolic + systolicCorrection)));
  const diastolic = Math.round(Math.max(45, Math.min(130, raw.diastolic + diastolicCorrection)));
  return {
    systolic: Math.max(systolic, diastolic + 10),
    diastolic,
    referenceCount: comparisons.length,
    method: comparisons.length ? "personal-offset-v1" : "population-heuristic-v1"
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
    saveMessage.textContent = "Complete a fingertip recording first.";
    return;
  }
  const systolic = Number(document.querySelector("#systolic").value);
  const diastolic = Number(document.querySelector("#diastolic").value);
  if (systolic <= diastolic) {
    saveMessage.textContent = "Systolic should be higher than diastolic.";
    return;
  }
  const history = loadHistory();
  history.unshift({
    recordedAt: new Date().toISOString(),
    cuff: { systolic, diastolic },
    ppg: latestReading
  });
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history.slice(0, 100)));
  } catch (_) {
    saveMessage.textContent = "This browser could not store the reading.";
    return;
  }
  referenceForm.reset();
  latestReading = null;
  saveMessage.textContent = "Paired reading saved locally.";
  renderHistory();
}

function renderHistory() {
  const history = loadHistory();
  historySection.hidden = history.length === 0;
  historyCount.textContent = `${history.length} saved`;
  historyList.replaceChildren(...history.slice(0, 8).map(reading => {
    const row = document.createElement("div");
    row.className = "history-item";
    const pressure = document.createElement("strong");
    pressure.textContent = `${reading.cuff.systolic}/${reading.cuff.diastolic} mmHg`;
    const date = document.createElement("time");
    date.dateTime = reading.recordedAt;
    date.textContent = new Date(reading.recordedAt).toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
    const detail = document.createElement("small");
    const estimate = reading.ppg.bpEstimate;
    detail.textContent = `${Math.round(reading.ppg.bpm)} BPM · ${Math.round(reading.ppg.quality * 100)}% confidence${estimate ? ` · camera estimate ${estimate.systolic}/${estimate.diastolic}` : ""}`;
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
  if (!confirm("Delete all locally stored paired readings? This cannot be undone.")) return;
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
