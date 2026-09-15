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
    captureFrame();
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
  else animationId = requestAnimationFrame(captureFrame);
}

function updateQuality() {
  const recent = samples.slice(-30).map(sample => sample.green);
  if (recent.length < 10) return;
  const mean = average(recent);
  const variation = standardDeviation(recent);
  const exposure = mean > 12 && mean < 250 ? 1 : 0;
  const quality = Math.max(0, Math.min(1, exposure * variation / 2.5));
  qualityBar.style.width = `${quality * 100}%`;
  qualityLabel.textContent = quality > .65 ? "Good" : quality > .25 ? "Fair" : "Poor";
}

function finishMeasurement() {
  cancelAnimationFrame(animationId);
  try {
    const reading = analyzePPG(samples);
    latestReading = reading;
    heartRate.textContent = reading.bpm.toFixed(0);
    resultQuality.textContent = `${Math.round(reading.quality * 100)}% signal confidence · personal reference only`;
    result.hidden = false;
    instruction.textContent = "Reading complete. Repeat while still if the result seems unusual.";
  } catch (error) {
    showError(error.message);
  }
  releaseCamera();
}

function stopMeasurement() {
  cancelAnimationFrame(animationId);
  releaseCamera();
  instruction.textContent = "Measurement stopped. Keep your finger still and try again.";
}

function releaseCamera() {
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
  const green = frames.map(frame => frame.green);
  const clipped = green.filter(value => value <= 1 || value >= 254).length / green.length;
  if (average(green) < 8 || clipped > .2) throw new Error("Adjust your finger to avoid a dark or overexposed image.");

  const windowSize = Math.max(3, Math.round(sampleRate * .75));
  const baseline = movingAverage(green, windowSize);
  const centered = green.map((value, index) => value - baseline[index]);
  const scale = Math.sqrt(average(centered.map(value => value * value)));
  if (scale < .15) throw new Error("No reliable pulse was detected. Cover the camera and flash completely.");
  const signal = centered.map(value => value / scale);
  const minLag = Math.max(1, Math.round(sampleRate * 60 / 200));
  const maxLag = Math.min(Math.floor(signal.length / 2), Math.round(sampleRate * 60 / 40));
  const correlations = [];
  for (let lag = minLag; lag <= maxLag; lag++) correlations.push({ lag, value: autocorrelation(signal, lag) });
  const strongest = Math.max(...correlations.map(item => item.value));
  const peakIndex = correlations.findIndex((item, index) => item.value >= strongest * .95 &&
    (index === 0 || item.value >= correlations[index - 1].value) &&
    (index === correlations.length - 1 || item.value >= correlations[index + 1].value));
  const peak = correlations[peakIndex];
  if (!peak || peak.value < .25) throw new Error("Signal quality was too low. Keep your fingertip still and try again.");
  let lag = peak.lag;
  if (peakIndex > 0 && peakIndex < correlations.length - 1) {
    const previous = correlations[peakIndex - 1].value, current = peak.value, next = correlations[peakIndex + 1].value;
    const curvature = previous - 2 * current + next;
    if (curvature) lag += .5 * (previous - next) / curvature;
  }
  const waveform = downsample(centered.map(value => value / scale), 150).map(value => Number(value.toFixed(4)));
  return {
    bpm: 60 * sampleRate / lag,
    quality: Math.max(0, Math.min(1, peak.value)),
    durationSeconds: duration,
    sampleRateHz: sampleRate,
    waveform
  };
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
    detail.textContent = `${Math.round(reading.ppg.bpm)} BPM · ${Math.round(reading.ppg.quality * 100)}% signal confidence`;
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
