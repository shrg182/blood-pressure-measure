"use strict";

const LANGUAGE_KEY = "blood-measure-language";
const THEME_KEY = "blood-measure-theme";
const TRANSLATIONS = {
  en: {
    backToMeter: "Meter", pulseAnalysis: "Pulse", appearance: "Appearance", classic: "Classic", ivory: "Ivory", sheets: "Sheets", guideEyebrow: "QUICK GUIDE",
    usageTitle: "Usage instructions", usageIntro: "For a steadier camera pulse recording, prepare first and keep still.",
    beforeTitle: "Before measuring", beforeOne: "Sit comfortably and rest for a few minutes.",
    beforeTwo: "Use a supported browser over HTTPS and allow rear-camera access.",
    beforeThree: "Warm cold hands and remove any phone case that blocks the camera or flash.",
    duringTitle: "During the recording", duringOne: "Cover the rear camera and flash completely with your fingertip.",
    duringTwo: "Use gentle, steady pressure—do not press hard.", duringThree: "Keep your hand and phone still until the 15-second recording finishes.",
    duringFour: "If signal quality stays poor, reposition your finger and try again.", referenceTitle: "Using a cuff reference",
    referenceText: "Immediately after recording, take a reading with a validated upper-arm cuff and save its pressure and pulse. After three usable pairs, the app applies bounded personal adjustments to comparison values.",
    pulseTitle: "Pulse analysis mode", pulseText: "Pulse Analysis uses a separate 60-second recording to show beat-to-beat intervals and variability within that recording. It is experimental screening information, not an ECG or arrhythmia diagnosis.",
    limitationTitle: "Important limitation", limitationText: "A phone camera detects a pulse waveform and cannot directly measure blood pressure. Personal adjustment only changes the displayed estimate and does not make it a medical measurement. Confirm every health decision or unusual reading with a validated upper-arm cuff or a clinician.",
    privacyTitle: "Privacy and saved readings", privacyText: "Paired readings and preferences stay in this browser. Export readings before clearing browser data if you want to keep a copy.",
    versionTitle: "Version and updates", versionDetails: "Blood Measure {version} · build {revision} · {released}",
    updateNotChecked: "Update status not checked.", checkingUpdates: "Checking for updates…", upToDate: "This app is up to date.",
    updateReady: "An update is ready. Reload to use it.", updateOffline: "Offline—connect to the internet to check for updates.",
    updateFailed: "The update check could not be completed.", checkUpdates: "Check for updates", reloadUpdate: "Reload to update",
    startNow: "Go to meter"
  },
  zh: {
    backToMeter: "测量", pulseAnalysis: "脉搏", appearance: "外观", classic: "经典", ivory: "象牙白", sheets: "表格", guideEyebrow: "快速指南",
    usageTitle: "使用说明", usageIntro: "提前做好准备并保持静止，有助于获得更稳定的摄像头脉搏记录。",
    beforeTitle: "测量前", beforeOne: "舒适坐好并休息几分钟。", beforeTwo: "通过 HTTPS 使用受支持的浏览器，并允许访问后置摄像头。",
    beforeThree: "如果手指冰凉，请先暖手；若手机壳遮挡摄像头或闪光灯，请将其取下。", duringTitle: "记录期间",
    duringOne: "用指尖完全覆盖后置摄像头和闪光灯。", duringTwo: "保持轻柔、稳定的压力，请勿用力按压。",
    duringThree: "在 15 秒记录结束前，保持手和手机静止。", duringFour: "如果信号质量一直较差，请调整手指位置后重试。",
    referenceTitle: "使用袖带参考值", referenceText: "记录结束后，请立即使用经过验证的上臂式血压计测量，并保存其血压和脉搏。保存三组有效配对数据后，应用会对比较值进行有限度的个人调整。",
    pulseTitle: "脉搏分析模式", pulseText: "脉搏分析使用单独的 60 秒记录来显示逐搏间隔及本次记录内的变化。这是实验性筛查信息，不是心电图或心律失常诊断。",
    limitationTitle: "重要限制", limitationText: "手机摄像头只能检测脉搏波，无法直接测量血压。个人调整只会改变显示的估计值，不会使其成为医疗测量。任何健康决定或异常读数都应使用经过验证的上臂式血压计或咨询医生确认。",
    privacyTitle: "隐私与保存的读数", privacyText: "配对读数和偏好设置仅保存在此浏览器中。如果需要保留副本，请在清除浏览器数据前导出读数。",
    versionTitle: "版本与更新", versionDetails: "血压测量 {version} · 构建 {revision} · {released}",
    updateNotChecked: "尚未检查更新。", checkingUpdates: "正在检查更新…", upToDate: "应用已是最新版本。",
    updateReady: "更新已准备好。请重新加载以使用新版本。", updateOffline: "当前离线——请连接互联网后检查更新。",
    updateFailed: "无法完成更新检查。", checkUpdates: "检查更新", reloadUpdate: "重新加载并更新", startNow: "前往测量"
  }
};

let currentLanguage = localStorage.getItem(LANGUAGE_KEY) || (navigator.language?.toLowerCase().startsWith("zh") ? "zh" : "en");
const languageButton = document.querySelector("#languageButton");
const themeSelect = document.querySelector("#themeSelect");
const versionDetails = document.querySelector("#versionDetails");
const updateStatus = document.querySelector("#updateStatus");
const checkUpdateButton = document.querySelector("#checkUpdateButton");
const reloadUpdateButton = document.querySelector("#reloadUpdateButton");
let updateState = "updateNotChecked";
let checkingForUpdate = false;

function t(key, values = {}) {
  let text = TRANSLATIONS[currentLanguage][key] || TRANSLATIONS.en[key] || key;
  Object.entries(values).forEach(([name, value]) => { text = text.replaceAll(`{${name}}`, value); });
  return text;
}

function applyLanguage() {
  document.documentElement.lang = currentLanguage === "zh" ? "zh-CN" : "en";
  document.title = `${TRANSLATIONS[currentLanguage].usageTitle} · ${currentLanguage === "zh" ? "血压测量" : "Blood Measure"}`;
  document.querySelectorAll("[data-i18n]").forEach(element => { element.textContent = t(element.dataset.i18n); });
  languageButton.textContent = currentLanguage === "zh" ? "English" : "中文";
  renderVersion();
  setUpdateState(updateState);
}

function renderVersion() {
  const build = window.BLOOD_MEASURE_BUILD || { version: "unknown", released: "unknown", revision: "local" };
  const revision = build.revision.startsWith("__") ? "local" : build.revision;
  versionDetails.textContent = t("versionDetails", { version: build.version, revision, released: build.released });
}

function setUpdateState(state) {
  updateState = state;
  updateStatus.textContent = t(state);
  reloadUpdateButton.hidden = state !== "updateReady";
}

async function checkForUpdates() {
  if (!navigator.onLine || !("serviceWorker" in navigator)) {
    setUpdateState("updateOffline");
    return;
  }
  checkingForUpdate = true;
  checkUpdateButton.disabled = true;
  setUpdateState("checkingUpdates");
  try {
    const registration = await navigator.serviceWorker.getRegistration() || await navigator.serviceWorker.register("service-worker.js");
    await registration.update();
    if (registration.waiting) setUpdateState("updateReady");
    else if (registration.installing) watchInstallingWorker(registration.installing);
    else setUpdateState("upToDate");
  } catch (_) {
    setUpdateState(navigator.onLine ? "updateFailed" : "updateOffline");
  } finally {
    checkUpdateButton.disabled = false;
  }
}

function watchInstallingWorker(worker) {
  worker.addEventListener("statechange", () => {
    if (worker.state === "activated") setUpdateState("updateReady");
  });
}

themeSelect.value = document.documentElement.dataset.theme;
themeSelect.addEventListener("change", () => {
  document.documentElement.dataset.theme = themeSelect.value;
  localStorage.setItem(THEME_KEY, themeSelect.value);
});
languageButton.addEventListener("click", () => {
  currentLanguage = currentLanguage === "en" ? "zh" : "en";
  localStorage.setItem(LANGUAGE_KEY, currentLanguage);
  applyLanguage();
});
checkUpdateButton.addEventListener("click", checkForUpdates);
reloadUpdateButton.addEventListener("click", () => location.reload());
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (checkingForUpdate) setUpdateState("updateReady");
  });
}
applyLanguage();
