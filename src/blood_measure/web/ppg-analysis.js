"use strict";

window.BloodMeasurePPG = (() => {
  class PPGError extends Error {
    constructor(code) {
      super(code);
      this.code = code;
    }
  }

  function analyze(frames) {
    if (frames.length < 40) throw new PPGError("notEnoughFrames");
    const duration = frames.at(-1).timestamp - frames[0].timestamp;
    if (duration < 8) throw new PPGError("tooShort");

    // Torch and auto-exposure settling create a large startup transient.
    const analysisStart = frames[0].timestamp + 1.5;
    const analysisEnd = frames.at(-1).timestamp - .25;
    const analysisFrames = frames.filter(frame => frame.timestamp >= analysisStart && frame.timestamp <= analysisEnd);
    if (analysisFrames.length < 40) throw new PPGError("notEnoughFrames");
    const intervals = analysisFrames.slice(1).map((frame, index) => frame.timestamp - analysisFrames[index].timestamp);
    const sampleRate = 1 / median(intervals);
    const intervalMean = average(intervals);
    const timingJitter = standardDeviation(intervals) / intervalMean;
    if (!Number.isFinite(sampleRate) || sampleRate < 5 || sampleRate > 120 || timingJitter > .75) throw new PPGError("lowQuality");

    const channels = ["red", "green", "blue"].map(name => {
      const values = analysisFrames.map(frame => frame[name]);
      const clipped = values.filter(value => value <= 1 || value >= 254).length / values.length;
      return { name, values, clipped };
    });
    const usableChannels = channels.filter(channel => average(channel.values) >= 8 && channel.clipped <= .35);
    if (!usableChannels.length) throw new PPGError("exposure");
    const timestamps = analysisFrames.map(frame => frame.timestamp);
    const candidates = usableChannels.map(channel => analyzeChannel(channel, timestamps, sampleRate)).filter(Boolean);
    if (!candidates.length) throw new PPGError("noPulse");
    const selected = selectConsensusCandidate(candidates);
    if (!selected || selected.ambiguous) throw new PPGError("lowQuality");

    const waveform = downsample(selected.centered.map(value => value / selected.scale), 150).map(value => Number(value.toFixed(4)));
    const confidence = Math.max(0, Math.min(1, .35 * Math.max(0, selected.correlation) + .65 * selected.prominence));
    const beatData = detectBeats(selected.signal, timestamps, selected.bpm);
    const beatIntervalsMs = beatData.intervals.map(seconds => Math.round(seconds * 1000));
    const morphology = analyzeMorphology(selected.signal, timestamps, beatData.peaks);
    const rhythm = assessRhythm(beatIntervalsMs, confidence, morphology);
    return {
      bpm: selected.bpm,
      quality: confidence,
      durationSeconds: duration,
      sampleRateHz: sampleRate,
      channel: selected.name,
      waveform,
      beatIntervalsMs,
      morphology,
      rhythm
    };
  }

  function analyzeChannel(channel, timestamps, sampleRate) {
    const baseline = movingAverage(channel.values, Math.max(3, Math.round(sampleRate * .75)));
    const centered = channel.values.map((value, index) => value - baseline[index]);
    const scale = Math.sqrt(average(centered.map(value => value * value)));
    if (scale < .15) return null;
    const normalized = centered.map(value => value / scale);
    const signal = movingAverage(normalized, Math.max(1, Math.round(sampleRate * .10)));
    const powers = [];
    const origin = timestamps[0];
    for (let bpm = 40; bpm <= 200; bpm += .5) {
      let real = 0, imaginary = 0;
      signal.forEach((value, index) => {
        const window = signal.length > 1 ? .5 - .5 * Math.cos(2 * Math.PI * index / (signal.length - 1)) : 1;
        const phase = 2 * Math.PI * (bpm / 60) * (timestamps[index] - origin);
        real += value * window * Math.cos(phase);
        imaginary += value * window * Math.sin(phase);
      });
      powers.push({ bpm, value: real * real + imaginary * imaginary });
    }
    const peaks = powers.filter((item, index) =>
      (index === 0 || item.value >= powers[index - 1].value) &&
      (index === powers.length - 1 || item.value >= powers[index + 1].value)
    ).sort((left, right) => right.value - left.value);
    if (!peaks.length || peaks[0].value <= 0) return null;
    const strongest = peaks[0];
    const competing = peaks.find(item => Math.abs(item.bpm - strongest.bpm) >= 10);
    const competition = competing ? competing.value / strongest.value : 0;
    const lag = Math.max(1, Math.round(sampleRate * 60 / strongest.bpm));
    return {
      name: channel.name,
      centered,
      scale,
      signal,
      bpm: strongest.bpm,
      correlation: autocorrelation(signal, lag),
      prominence: Math.max(0, 1 - competition),
      ambiguous: competition >= .65
    };
  }

  function selectConsensusCandidate(candidates) {
    const reliable = candidates.filter(candidate => !candidate.ambiguous);
    if (!reliable.length) return null;
    const groups = reliable.map(candidate => reliable.filter(other => Math.abs(other.bpm - candidate.bpm) <= Math.max(5, candidate.bpm * .08)));
    groups.sort((left, right) => right.length - left.length ||
      right.reduce((sum, item) => sum + candidateScore(item), 0) - left.reduce((sum, item) => sum + candidateScore(item), 0));
    return groups[0].reduce((best, candidate) => candidateScore(candidate) > candidateScore(best) ? candidate : best);
  }

  function candidateScore(candidate) {
    const channelPreference = candidate.name === "red" ? 1.05 : candidate.name === "green" ? 1.03 : 1;
    return channelPreference * candidate.prominence * (.5 + .5 * Math.max(0, candidate.correlation));
  }

  function detectBeats(signal, timestamps, bpm) {
    const expected = 60 / bpm;
    const positive = intervalCandidate(signal, timestamps, expected);
    const inverted = intervalCandidate(signal.map(value => -value), timestamps, expected);
    const selected = positive.score >= inverted.score ? positive : inverted;
    return { intervals: selected.intervals, peaks: selected.peaks };
  }

  function intervalCandidate(signal, timestamps, expected) {
    const threshold = average(signal) + .10 * standardDeviation(signal);
    const peaks = [];
    for (let index = 1; index < signal.length - 1; index++) {
      if (signal[index] < threshold || signal[index] < signal[index - 1] || signal[index] < signal[index + 1]) continue;
      const previous = peaks.at(-1);
      if (previous === undefined || timestamps[index] - timestamps[previous] >= expected * .45) peaks.push(index);
      else if (signal[index] > signal[previous]) peaks[peaks.length - 1] = index;
    }
    const intervals = peaks.slice(1).map((index, offset) => timestamps[index] - timestamps[peaks[offset]])
      .filter(value => value >= expected * .55 && value <= expected * 1.55);
    if (!intervals.length) return { intervals: [], peaks: [], score: 0 };
    const closeness = 1 / (1 + standardDeviation(intervals) / average(intervals));
    return { intervals, peaks, score: intervals.length * closeness };
  }

  function analyzeMorphology(signal, timestamps, peaks) {
    const pointCount = 60, beats = [];
    for (let index = 1; index < peaks.length - 1; index++) {
      const start = Math.round((peaks[index - 1] + peaks[index]) / 2);
      const end = Math.round((peaks[index] + peaks[index + 1]) / 2);
      if (end - start < 5) continue;
      const segment = signal.slice(start, end + 1);
      const low = Math.min(...segment), range = Math.max(...segment) - low;
      if (range <= .05) continue;
      beats.push(resample(segment.map(value => (value - low) / range), pointCount));
    }
    if (beats.length < 3) return { beatCount: beats.length, averageBeat: [], consistency: 0, riseTimeFraction: null, widthHalfMaxFraction: null, reflectionIndex: null };
    const template = Array.from({ length: pointCount }, (_, index) => median(beats.map(beat => beat[index])));
    const correlations = beats.map(beat => pearson(beat, template)).filter(Number.isFinite);
    const peakIndex = template.indexOf(Math.max(...template));
    const aboveHalf = template.map((value, index) => value >= .5 ? index : -1).filter(index => index >= 0);
    const secondary = localPeaks(template).filter(index => index >= peakIndex + 6).sort((left, right) => template[right] - template[left])[0];
    return {
      beatCount: beats.length,
      averageBeat: template.map(value => Number(value.toFixed(4))),
      consistency: Number(Math.max(0, Math.min(1, average(correlations))).toFixed(3)),
      riseTimeFraction: Number((peakIndex / (pointCount - 1)).toFixed(3)),
      widthHalfMaxFraction: aboveHalf.length ? Number(((aboveHalf.at(-1) - aboveHalf[0]) / (pointCount - 1)).toFixed(3)) : null,
      reflectionIndex: secondary === undefined ? null : Number((template[secondary] / template[peakIndex]).toFixed(3))
    };
  }

  function assessRhythm(intervals, quality, morphology) {
    const usable = intervals.filter(value => value >= 300 && value <= 2000);
    const artifactFraction = intervals.length ? 1 - usable.length / intervals.length : 1;
    const reasons = [];
    if (usable.length < 30) reasons.push("insufficientIntervals");
    if (quality < .5) reasons.push("lowSignalQuality");
    if (artifactFraction > .2) reasons.push("highArtifacts");
    if (!Number.isFinite(morphology.consistency) || morphology.consistency < .55) reasons.push("lowBeatConsistency");
    if (reasons.length) {
      return { classification: "inconclusive", reasons, usableIntervals: usable.length, artifactFraction, irregularFraction: null, patternCount: 0 };
    }
    const center = median(usable);
    const irregular = usable.filter(value => Math.abs(value - center) > Math.max(120, center * .18)).length;
    let patternCount = 0;
    for (let index = 0; index < usable.length - 1; index++) {
      if (usable[index] < center * .82 && usable[index + 1] > center * 1.18) patternCount++;
    }
    const irregularFraction = irregular / usable.length;
    const coefficientVariation = standardDeviation(usable) / average(usable);
    const classification = irregularFraction >= .30 && coefficientVariation >= .12 || patternCount >= 3 ? "irregular" : "regular";
    return { classification, reasons: [], usableIntervals: usable.length, artifactFraction: Number(artifactFraction.toFixed(3)), irregularFraction: Number(irregularFraction.toFixed(3)), patternCount };
  }

  function resample(values, length) {
    return Array.from({ length }, (_, index) => {
      const position = index * (values.length - 1) / (length - 1), left = Math.floor(position), right = Math.min(values.length - 1, left + 1), fraction = position - left;
      return values[left] * (1 - fraction) + values[right] * fraction;
    });
  }

  function pearson(left, right) {
    const leftMean = average(left), rightMean = average(right);
    let product = 0, leftEnergy = 0, rightEnergy = 0;
    left.forEach((value, index) => { const a = value - leftMean, b = right[index] - rightMean; product += a * b; leftEnergy += a * a; rightEnergy += b * b; });
    return product / Math.sqrt(leftEnergy * rightEnergy);
  }

  function localPeaks(values) {
    const result = [];
    for (let index = 1; index < values.length - 1; index++) if (values[index] > values[index - 1] && values[index] >= values[index + 1]) result.push(index);
    return result;
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
      leftEnergy += values[index] ** 2;
      rightEnergy += values[index + lag] ** 2;
    }
    const energy = Math.sqrt(leftEnergy * rightEnergy);
    return energy ? product / energy : 0;
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

  function average(values) { return values.reduce((sum, value) => sum + value, 0) / values.length; }
  function standardDeviation(values) { const mean = average(values); return Math.sqrt(average(values.map(value => (value - mean) ** 2))); }
  function median(values) { const sorted = [...values].sort((a, b) => a - b); return sorted[Math.floor(sorted.length / 2)]; }

  return { analyze, PPGError };
})();
