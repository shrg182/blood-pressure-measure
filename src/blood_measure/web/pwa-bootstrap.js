"use strict";

if ("serviceWorker" in navigator && window.isSecureContext) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("service-worker.js", { updateViaCache: "none" }).catch(() => {
      // The app remains usable online if offline support cannot be registered.
    });
  });
}
