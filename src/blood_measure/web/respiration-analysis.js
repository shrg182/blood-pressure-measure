"use strict";

window.BloodMeasureRespiration = (() => {
  class RespirationError extends Error { constructor(code) { super(code); this.code = code; } }

  function analyze(frames) {
    if (frames.length < 200) throw new RespirationError("notEnoughFrames");
    const duration = frames.at(-1).timestamp - frames[0].timestamp;
    if (duration < 60) throw new RespirationError("tooShort");
    const trimmed = frames.filter(frame => frame.timestamp >= frames[0].timestamp + 3 && frame.timestamp <= frames.at(-1).timestamp - 1);
    const timestamps = trimmed.map(frame => frame.timestamp);
    const frameIntervals = timestamps.slice(1).map((value, index) => value - timestamps[index]);
    const sampleRate = 1 / median(frameIntervals);
    const channels = ["red", "green", "blue"].map(name => ({ name, values: trimmed.map(frame => frame[name]) }))
      .filter(channel => average(channel.values) > 8 && average(channel.values) < 252);
    if (!channels.length) throw new RespirationError("exposure");
    const candidates = channels.map(channel => analyzeChannel(channel, timestamps, sampleRate)).filter(Boolean);
    if (!candidates.length) throw new RespirationError("noBreathingSignal");
    candidates.sort((left, right) => right.confidence - left.confidence);
    const best = candidates[0];
    if (best.confidence < .35) throw new RespirationError("lowBreathingQuality");
    return { breathsPerMinute: best.rate, confidence: best.confidence, channel: best.channel, durationSeconds: duration, method: "ppg-respiratory-modulation-v1" };
  }

  function analyzeChannel(channel, timestamps, sampleRate) {
    const smooth = movingAverage(channel.values, Math.max(3, Math.round(sampleRate * 1.5)));
    const baseline = movingAverage(smooth, Math.max(5, Math.round(sampleRate * 12)));
    const signal = smooth.map((value, index) => value - baseline[index]);
    const scale = Math.sqrt(average(signal.map(value => value * value)));
    if (scale < .03) return null;
    const powers = [];
    for (let rate = 6; rate <= 30; rate += .25) {
      let real = 0, imaginary = 0;
      signal.forEach((value, index) => {
        const window = .5 - .5 * Math.cos(2 * Math.PI * index / Math.max(1, signal.length - 1));
        const phase = 2 * Math.PI * rate / 60 * (timestamps[index] - timestamps[0]);
        real += value / scale * window * Math.cos(phase);
        imaginary += value / scale * window * Math.sin(phase);
      });
      powers.push({ rate, power: real * real + imaginary * imaginary });
    }
    powers.sort((left, right) => right.power - left.power);
    const peak = powers[0];
    const competitor = powers.find(item => Math.abs(item.rate - peak.rate) >= 2) || { power: 0 };
    const confidence = Math.max(0, Math.min(1, 1 - competitor.power / peak.power));
    return { rate: Number(peak.rate.toFixed(1)), confidence, channel: channel.name };
  }

  function movingAverage(values, size) {
    const radius = Math.floor(size / 2), prefix = [0];
    values.forEach(value => prefix.push(prefix.at(-1) + value));
    return values.map((_, index) => { const start = Math.max(0, index - radius), end = Math.min(values.length, index + radius + 1); return (prefix[end] - prefix[start]) / (end - start); });
  }
  function average(values) { return values.reduce((sum, value) => sum + value, 0) / values.length; }
  function median(values) { const sorted = [...values].sort((a, b) => a - b); return sorted[Math.floor(sorted.length / 2)]; }
  return Object.freeze({ analyze, RespirationError });
})();
