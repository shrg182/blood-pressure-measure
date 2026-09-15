import math

import pytest

from blood_measure.ppg import PPGSignalError, RGBSample, analyze_fingertip_ppg


def recording(*, bpm: float = 72.0, seconds: float = 12.0, fps: float = 30.0):
    return [
        RGBSample(
            timestamp=index / fps,
            red=180.0,
            green=120.0 + 4.0 * math.sin(2.0 * math.pi * (bpm / 60.0) * index / fps),
            blue=60.0,
        )
        for index in range(round(seconds * fps) + 1)
    ]


def test_estimates_heart_rate_from_clean_ppg():
    result = analyze_fingertip_ppg(recording(bpm=72.0))

    assert result.heart_rate_bpm == pytest.approx(72.0, abs=1.5)
    assert result.sample_rate_hz == pytest.approx(30.0)
    assert result.signal_quality > 0.7


@pytest.mark.parametrize("bpm", [45.0, 60.0, 90.0, 120.0, 160.0])
def test_estimates_across_supported_pulse_range(bpm):
    result = analyze_fingertip_ppg(recording(bpm=bpm))

    assert result.heart_rate_bpm == pytest.approx(bpm, abs=2.0)


def test_rejects_short_recording():
    with pytest.raises(PPGSignalError, match="too short"):
        analyze_fingertip_ppg(recording(seconds=4.0))


def test_rejects_flat_signal():
    frames = [RGBSample(index / 30.0, 180.0, 120.0, 60.0) for index in range(301)]

    with pytest.raises(PPGSignalError, match="No reliable pulse"):
        analyze_fingertip_ppg(frames)
