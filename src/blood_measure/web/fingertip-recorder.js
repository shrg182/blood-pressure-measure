"use strict";

window.FingertipRecorder = (() => {
  function create({ video, canvas, onProgress = () => {}, onQuality = () => {} }) {
    const context = canvas.getContext("2d", { willReadFrequently: true });
    let stream = null, requestId = null, requestKind = null, rejectRecording = null;

    async function record(durationSeconds) {
      if (!navigator.mediaDevices?.getUserMedia || !window.isSecureContext) throw new Error("cameraSecure");
      stream = await navigator.mediaDevices.getUserMedia({ audio: false, video: { facingMode: { ideal: "environment" }, width: { ideal: 640 }, height: { ideal: 480 } } });
      video.srcObject = stream;
      await video.play();
      const track = stream.getVideoTracks()[0];
      if (track.getCapabilities?.().torch) {
        try { await track.applyConstraints({ advanced: [{ torch: true }] }); } catch (_) { /* Optional capability. */ }
      }
      const frames = [], startedAt = performance.now();
      return new Promise((resolve, reject) => {
        rejectRecording = reject;
        const capture = (now = performance.now()) => {
          if (!stream) return;
          if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
            context.drawImage(video, 0, 0, canvas.width, canvas.height);
            const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
            let red = 0, green = 0, blue = 0;
            for (let index = 0; index < pixels.length; index += 4) { red += pixels[index]; green += pixels[index + 1]; blue += pixels[index + 2]; }
            const count = pixels.length / 4;
            frames.push({ timestamp: now / 1000, red: red / count, green: green / count, blue: blue / count });
            updateQuality(frames);
          }
          const elapsed = (now - startedAt) / 1000;
          onProgress(Math.min(1, elapsed / durationSeconds), Math.max(0, Math.ceil(durationSeconds - elapsed)));
          if (elapsed >= durationSeconds) {
            stopStream();
            rejectRecording = null;
            resolve(frames);
          } else schedule(capture);
        };
        schedule(capture);
      });
    }

    function schedule(callback) {
      if (typeof video.requestVideoFrameCallback === "function") {
        requestKind = "video";
        requestId = video.requestVideoFrameCallback(callback);
      } else {
        requestKind = "animation";
        requestId = requestAnimationFrame(callback);
      }
    }

    function updateQuality(frames) {
      const recent = frames.slice(-90);
      const channels = ["red", "green", "blue"].map(name => recent.map(frame => frame[name]));
      const usable = channels.filter(values => average(values) > 8 && average(values) < 250).sort((left, right) => deviation(right) - deviation(left))[0];
      onQuality(usable && usable.length >= 10 ? Math.max(0, Math.min(1, deviation(usable) / 1.5)) : 0);
    }

    function cancel() {
      if (rejectRecording) rejectRecording(new Error("cancelled"));
      rejectRecording = null;
      stopStream();
    }

    function stopStream() {
      if (requestId !== null) {
        if (requestKind === "video" && typeof video.cancelVideoFrameCallback === "function") video.cancelVideoFrameCallback(requestId);
        else cancelAnimationFrame(requestId);
      }
      requestId = null;
      if (stream) stream.getTracks().forEach(track => track.stop());
      stream = null;
      video.srcObject = null;
    }

    function average(values) { return values.reduce((sum, value) => sum + value, 0) / values.length; }
    function deviation(values) { const mean = average(values); return Math.sqrt(average(values.map(value => (value - mean) ** 2))); }
    return Object.freeze({ record, cancel });
  }

  return Object.freeze({ create });
})();
