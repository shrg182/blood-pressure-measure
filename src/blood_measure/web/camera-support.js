"use strict";

window.CameraSupport = (() => {
  function isPermissionError(error) {
    return ["NotAllowedError", "PermissionDeniedError", "SecurityError"].includes(error?.name);
  }

  function errorMessage(error, language = "en") {
    const zh = language === "zh" || language === "zh-CN";
    if (error?.message === "cameraSecure") {
      return zh
        ? "摄像头需要受支持的浏览器和安全的 HTTPS 连接。"
        : "Camera access requires a supported browser and a secure HTTPS connection.";
    }
    if (!isPermissionError(error)) {
      return zh
        ? "无法启动后置摄像头。请确认没有其他应用正在使用摄像头，然后重试。"
        : "The rear camera could not start. Close any other app using the camera, then try again.";
    }
    return zh
      ? "摄像头权限已被阻止。在小米/HyperOS 中，请打开“设置 > 应用设置 > 应用管理 > Blood Measure（或安装时使用的浏览器）> 权限管理 > 相机”，选择“仅在使用中允许”。也可在浏览器的网站设置中将此网站的“相机”设为“允许”。然后重新打开本应用并重试。"
      : "Camera access is blocked. On Xiaomi/HyperOS, open Settings > Apps > Manage apps > Blood Measure (or the browser used to install it) > Permissions > Camera, and choose Allow while using. You can also open this site in the browser and set Site settings > Camera to Allow. Then reopen the app and try again.";
  }

  return Object.freeze({ errorMessage, isPermissionError });
})();
