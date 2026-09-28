"use strict";

const CACHE_NAME = "blood-measure-v24";
const APP_SHELL = ["./", "dashboard.html", "index.html", "pulse.html", "recovery.html", "breathing.html", "waveform.html", "oxygen.html", "usage.html", "styles.css", "dashboard.js", "app.js", "pulse.js", "recovery.js", "breathing.js", "waveform.js", "oxygen.js", "usage.js", "measurement-store.js", "ppg-analysis.js", "respiration-analysis.js", "camera-support.js", "fingertip-recorder.js", "pwa-bootstrap.js", "version.js", "manifest.webmanifest", "icon.svg", "icon-maskable.svg", "icon-192.png", "icon-512.png", "icon-maskable-512.png"];

self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(
    keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
  )));
  self.clients.claim();
});

self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;
  event.respondWith(fetch(event.request)
    .then(response => {
      const copy = response.clone();
      caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
      return response;
    })
    .catch(() => caches.match(event.request).then(response => response || caches.match("index.html"))));
});
