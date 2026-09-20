"use strict";

const LANGUAGE_KEY = "blood-measure-language";
const THEME_KEY = "blood-measure-theme";
const TRANSLATIONS = {
  en: {
    backToMeter: "Meter", appearance: "Appearance", classic: "Classic", ivory: "Ivory", guideEyebrow: "QUICK GUIDE",
    usageTitle: "Usage instructions", usageIntro: "For a steadier camera pulse recording, prepare first and keep still.",
    beforeTitle: "Before measuring", beforeOne: "Sit comfortably and rest for a few minutes.",
    beforeTwo: "Use a supported browser over HTTPS and allow rear-camera access.",
    beforeThree: "Warm cold hands and remove any phone case that blocks the camera or flash.",
    duringTitle: "During the recording", duringOne: "Cover the rear camera and flash completely with your fingertip.",
    duringTwo: "Use gentle, steady pressure—do not press hard.", duringThree: "Keep your hand and phone still until the 15-second recording finishes.",
    duringFour: "If signal quality stays poor, reposition your finger and try again.", referenceTitle: "Using a cuff reference",
    referenceText: "Immediately after recording, take a reading with a validated upper-arm cuff and save its pressure and pulse. After three usable pairs, the app applies bounded personal adjustments to comparison values.",
    limitationTitle: "Important limitation", limitationText: "A phone camera detects a pulse waveform and cannot directly measure blood pressure. Personal adjustment only changes the displayed estimate and does not make it a medical measurement. Confirm every health decision or unusual reading with a validated upper-arm cuff or a clinician.",
    privacyTitle: "Privacy and saved readings", privacyText: "Paired readings and preferences stay in this browser. Export readings before clearing browser data if you want to keep a copy.",
    startNow: "Go to meter"
  },
  zh: {
    backToMeter: "测量", appearance: "外观", classic: "经典", ivory: "象牙白", guideEyebrow: "快速指南",
    usageTitle: "使用说明", usageIntro: "提前做好准备并保持静止，有助于获得更稳定的摄像头脉搏记录。",
    beforeTitle: "测量前", beforeOne: "舒适坐好并休息几分钟。", beforeTwo: "通过 HTTPS 使用受支持的浏览器，并允许访问后置摄像头。",
    beforeThree: "如果手指冰凉，请先暖手；若手机壳遮挡摄像头或闪光灯，请将其取下。", duringTitle: "记录期间",
    duringOne: "用指尖完全覆盖后置摄像头和闪光灯。", duringTwo: "保持轻柔、稳定的压力，请勿用力按压。",
    duringThree: "在 15 秒记录结束前，保持手和手机静止。", duringFour: "如果信号质量一直较差，请调整手指位置后重试。",
    referenceTitle: "使用袖带参考值", referenceText: "记录结束后，请立即使用经过验证的上臂式血压计测量，并保存其血压和脉搏。保存三组有效配对数据后，应用会对比较值进行有限度的个人调整。",
    limitationTitle: "重要限制", limitationText: "手机摄像头只能检测脉搏波，无法直接测量血压。个人调整只会改变显示的估计值，不会使其成为医疗测量。任何健康决定或异常读数都应使用经过验证的上臂式血压计或咨询医生确认。",
    privacyTitle: "隐私与保存的读数", privacyText: "配对读数和偏好设置仅保存在此浏览器中。如果需要保留副本，请在清除浏览器数据前导出读数。", startNow: "前往测量"
  }
};

let currentLanguage = localStorage.getItem(LANGUAGE_KEY) || (navigator.language?.toLowerCase().startsWith("zh") ? "zh" : "en");
const languageButton = document.querySelector("#languageButton");
const themeSelect = document.querySelector("#themeSelect");

function applyLanguage() {
  document.documentElement.lang = currentLanguage === "zh" ? "zh-CN" : "en";
  document.title = `${TRANSLATIONS[currentLanguage].usageTitle} · ${currentLanguage === "zh" ? "血压测量" : "Blood Measure"}`;
  document.querySelectorAll("[data-i18n]").forEach(element => { element.textContent = TRANSLATIONS[currentLanguage][element.dataset.i18n]; });
  languageButton.textContent = currentLanguage === "zh" ? "English" : "中文";
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
applyLanguage();
