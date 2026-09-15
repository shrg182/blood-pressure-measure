"""Signal processing for camera-based fingertip photoplethysmography (PPG).

This module intentionally estimates pulse rate only. Blood pressure cannot be
derived safely from a phone camera signal without a separately developed and
clinically validated calibration model.
"""

from __future__ import annotations

from dataclasses import dataclass
from math import sqrt
from statistics import fmean, median
from typing import Iterable, Sequence


@dataclass(frozen=True)
class RGBSample:
    """Mean RGB intensity for one camera frame."""

    timestamp: float
    red: float
    green: float
    blue: float


@dataclass(frozen=True)
class PPGResult:
    """Result from a fingertip PPG recording."""

    heart_rate_bpm: float
    sample_rate_hz: float
    duration_seconds: float
    signal_quality: float


class PPGSignalError(ValueError):
    """Raised when a recording is too short or unreliable to process."""


def analyze_fingertip_ppg(samples: Iterable[RGBSample]) -> PPGResult:
    """Validate a recording and estimate heart rate from its green channel.

    The caller should pass the mean RGB value of a central region of each
    camera frame. A recording of at least eight seconds is required.
    """

    frames = list(samples)
    if len(frames) < 40:
        raise PPGSignalError("Not enough camera frames; record for at least 8 seconds")

    timestamps = [frame.timestamp for frame in frames]
    intervals = [b - a for a, b in zip(timestamps, timestamps[1:])]
    if any(interval <= 0 for interval in intervals):
        raise PPGSignalError("Frame timestamps must be strictly increasing")

    duration = timestamps[-1] - timestamps[0]
    if duration < 8.0:
        raise PPGSignalError("Recording is too short; record for at least 8 seconds")

    typical_interval = median(intervals)
    sample_rate = 1.0 / typical_interval
    if not 5.0 <= sample_rate <= 120.0:
        raise PPGSignalError("Camera frame rate is outside the supported range")

    timing_jitter = _coefficient_of_variation(intervals)
    if timing_jitter > 0.25:
        raise PPGSignalError("Camera frame timing is too irregular")

    green = [frame.green for frame in frames]
    mean_green = fmean(green)
    if mean_green < 8.0:
        raise PPGSignalError("Finger contact is too dark or the flash is unavailable")

    clipped_fraction = sum(value <= 1.0 or value >= 254.0 for value in green) / len(green)
    if clipped_fraction > 0.2:
        raise PPGSignalError("Camera signal is overexposed or underexposed")

    window = max(3, round(sample_rate * 0.75))
    baseline = _moving_average(green, window)
    detrended = [value - local_mean for value, local_mean in zip(green, baseline)]
    scale = sqrt(fmean(value * value for value in detrended))
    if scale < 0.15:
        raise PPGSignalError("No reliable pulse waveform was detected")

    normalized = [value / scale for value in detrended]
    min_lag = max(1, round(sample_rate * 60.0 / 200.0))
    max_lag = min(len(normalized) // 2, round(sample_rate * 60.0 / 40.0))
    correlations = [(_autocorrelation(normalized, lag), lag) for lag in range(min_lag, max_lag + 1)]
    strongest_correlation = max(correlation for correlation, _ in correlations)
    # Autocorrelation also peaks at whole multiples of the true pulse period.
    # Prefer the earliest lag whose peak is essentially as strong as the best
    # one so a fast pulse is not mistaken for a subharmonic.
    correlation, best_lag = next(
        (correlation, lag)
        for index, (correlation, lag) in enumerate(correlations)
        if correlation >= strongest_correlation * 0.95
        and (index == 0 or correlation >= correlations[index - 1][0])
        and (index == len(correlations) - 1 or correlation >= correlations[index + 1][0])
    )
    if correlation < 0.25:
        raise PPGSignalError("Pulse waveform quality is too low; keep the finger still")

    correlation_index = best_lag - min_lag
    refined_lag = float(best_lag)
    if 0 < correlation_index < len(correlations) - 1:
        previous = correlations[correlation_index - 1][0]
        current = correlations[correlation_index][0]
        following = correlations[correlation_index + 1][0]
        curvature = previous - 2.0 * current + following
        if curvature:
            refined_lag += 0.5 * (previous - following) / curvature

    heart_rate = 60.0 * sample_rate / refined_lag
    quality = max(0.0, min(1.0, correlation * (1.0 - timing_jitter)))
    return PPGResult(
        heart_rate_bpm=round(heart_rate, 1),
        sample_rate_hz=round(sample_rate, 2),
        duration_seconds=round(duration, 2),
        signal_quality=round(quality, 3),
    )


def _moving_average(values: Sequence[float], window: int) -> list[float]:
    radius = window // 2
    prefix = [0.0]
    for value in values:
        prefix.append(prefix[-1] + value)
    return [
        (prefix[min(len(values), index + radius + 1)] - prefix[max(0, index - radius)])
        / (min(len(values), index + radius + 1) - max(0, index - radius))
        for index in range(len(values))
    ]


def _autocorrelation(values: Sequence[float], lag: int) -> float:
    left = values[:-lag]
    right = values[lag:]
    numerator = sum(a * b for a, b in zip(left, right))
    left_energy = sum(value * value for value in left)
    right_energy = sum(value * value for value in right)
    denominator = sqrt(left_energy * right_energy)
    return numerator / denominator if denominator else 0.0


def _coefficient_of_variation(values: Sequence[float]) -> float:
    average = fmean(values)
    variance = fmean((value - average) ** 2 for value in values)
    return sqrt(variance) / average
