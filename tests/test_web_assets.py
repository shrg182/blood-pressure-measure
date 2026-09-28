from importlib.resources import files
from pathlib import Path


def test_mobile_web_assets_are_packaged():
    web = files("blood_measure").joinpath("web")

    for asset in (
        "index.html",
        "dashboard.html",
        "pulse.html",
        "recovery.html",
        "breathing.html",
        "waveform.html",
        "oxygen.html",
        "usage.html",
        "styles.css",
        "app.js",
        "dashboard.js",
        "measurement-store.js",
        "pulse.js",
        "recovery.js",
        "breathing.js",
        "fingertip-recorder.js",
        "camera-support.js",
        "respiration-analysis.js",
        "waveform.js",
        "oxygen.js",
        "ppg-analysis.js",
        "usage.js",
        "version.js",
        "manifest.webmanifest",
        "service-worker.js",
        "icon.svg",
        "icon-maskable.svg",
        "icon-192.png",
        "icon-512.png",
        "icon-maskable-512.png",
    ):
        assert web.joinpath(asset).is_file()


def test_interface_describes_camera_bp_limitation():
    html = files("blood_measure").joinpath("web", "usage.html").read_text()

    assert "cannot directly measure blood pressure" in html
    assert "validated upper-arm cuff" in html


def test_usage_page_reports_running_version_and_can_check_for_updates():
    web = files("blood_measure").joinpath("web")
    usage = web.joinpath("usage.html").read_text()
    javascript = web.joinpath("usage.js").read_text()
    version = web.joinpath("version.js").read_text()
    app = web.joinpath("app.js").read_text()

    assert 'id="versionDetails"' in usage
    assert 'id="checkUpdateButton"' in usage
    assert 'version: "0.9.3"' in version
    assert "registration.update()" in javascript
    assert 'format: "blood-measure-v2"' in app
    assert "window.BLOOD_MEASURE_BUILD" in app


def test_readme_version_matches_web_application():
    readme = Path(__file__).parents[1].joinpath("README.md").read_text()
    version = files("blood_measure").joinpath("web", "version.js").read_text()

    assert "Current version: 0.9.3" in readme
    assert 'version: "0.9.3"' in version


def test_dashboard_aggregates_versioned_measurement_sessions():
    web = files("blood_measure").joinpath("web")
    dashboard = web.joinpath("dashboard.html").read_text()
    javascript = web.joinpath("dashboard.js").read_text()
    store = web.joinpath("measurement-store.js").read_text()
    manifest = web.joinpath("manifest.webmanifest").read_text()

    assert 'id="totalCount"' in dashboard
    assert 'data-i18n="breathing"' in dashboard
    assert "BloodMeasureStore.getSummary()" in javascript
    assert 'schemaVersion: 1' in store
    assert 'type: "cuff-comparison"' in store
    assert 'type: "pulse-analysis"' in store
    assert '"start_url": "dashboard.html"' in manifest


def test_camera_results_have_history_separate_from_cuff_pairs():
    web = files("blood_measure").joinpath("web")
    html = web.joinpath("index.html").read_text()
    javascript = web.joinpath("app.js").read_text()
    dashboard = web.joinpath("dashboard.js").read_text()

    assert 'id="measurementHistorySection"' in html
    assert 'id="historySection"' in html
    assert 'record("camera-measurement"' in javascript
    assert "function renderMeasurementHistory" in javascript
    assert 'removeType("camera-measurement")' in javascript
    assert 'session.type === "camera-measurement"' in dashboard


def test_recovery_test_records_three_timed_pulse_stages():
    web = files("blood_measure").joinpath("web")
    html = web.joinpath("recovery.html").read_text()
    javascript = web.joinpath("recovery.js").read_text()

    assert 'data-step="0"' in html
    assert 'data-step="1"' in html
    assert 'data-step="2"' in html
    assert "[0,60,120]" in javascript
    assert 'record("pulse-recovery"' in javascript
    assert "oneMinuteDrop" in javascript
    assert "not a fitness or heart diagnosis" in html


def test_respiratory_rate_is_experimental_and_quality_gated():
    web = files("blood_measure").joinpath("web")
    html = web.joinpath("breathing.html").read_text()
    page = web.joinpath("breathing.js").read_text()
    analysis = web.joinpath("respiration-analysis.js").read_text()

    assert "90-SECOND RECORDING" in html
    assert "not a respiratory diagnosis" in html
    assert "recorder.record(90)" in page
    assert 'record("respiratory-rate"' in page
    assert "for (let rate = 6; rate <= 30" in analysis
    assert "best.confidence < .35" in analysis
    assert 'method: "ppg-respiratory-modulation-v1"' in analysis


def test_irregular_pulse_screen_is_conservative_and_non_diagnostic():
    web = files("blood_measure").joinpath("web")
    html = web.joinpath("pulse.html").read_text()
    page = web.joinpath("pulse.js").read_text()
    analysis = web.joinpath("ppg-analysis.js").read_text()

    assert "Irregular pulse detected" in page
    assert "Inconclusive" in page
    assert "cannot diagnose atrial fibrillation" in html
    assert "function assessRhythm" in analysis
    assert "usable.length < 30" in analysis
    assert "morphology.consistency < .55" in analysis
    assert 'classification: "inconclusive"' in analysis
    assert 'id="rhythmCard"' in html
    assert "function buildScreening" in page
    assert "15 * 60 * 1000" in page
    assert 'status: priorIrregular ? "repeatedIrregular" : "repeatIrregular"' in page
    assert "reasonLowSignalQuality" in page


def test_waveform_lab_reports_only_relative_morphology():
    web = files("blood_measure").joinpath("web")
    html = web.joinpath("waveform.html").read_text()
    page = web.joinpath("waveform.js").read_text()
    analysis = web.joinpath("ppg-analysis.js").read_text()

    assert "Normalized average pulse wave" in html
    assert "do not measure arterial stiffness" in html
    assert "function analyzeMorphology" in analysis
    assert "averageBeat" in analysis
    assert "widthHalfMaxFraction" in analysis
    assert 'record("waveform-analysis"' in page


def test_oxygen_log_keeps_manual_fallback_for_bluetooth_meters():
    web = files("blood_measure").joinpath("web")
    html = web.joinpath("oxygen.html").read_text()
    javascript = web.joinpath("oxygen.js").read_text()
    dashboard = web.joinpath("dashboard.html").read_text()

    assert 'id="oxygenForm"' in html
    assert 'id="spo2"' in html
    assert "Manual entry always remains available" in html
    assert "the phone camera does not measure SpO₂" in html
    assert 'PLX_SERVICE="00001822-0000-1000-8000-00805f9b34fb"' in javascript
    assert "if(!navigator.bluetooth)" in javascript
    assert "decodeSfloat" in javascript
    assert 'record("oxygen-saturation"' in javascript
    assert 'href="oxygen.html"' in dashboard


def test_oxygen_reading_can_add_camera_pulse_reference_without_changing_spo2():
    web = files("blood_measure").joinpath("web")
    html = web.joinpath("oxygen.html").read_text()
    javascript = web.joinpath("oxygen.js").read_text()
    store = web.joinpath("measurement-store.js").read_text()

    assert 'id="cameraReferenceSection"' in html
    assert "does not measure, validate, or adjust SpO₂" in html
    assert "cameraRecorder.record(15)" in javascript
    assert 'method:"camera-ppg-pulse-reference-v1"' in javascript
    assert "pulseDifference" in javascript
    assert "updateData(cameraTargetId,{cameraReference})" in javascript
    assert "function updateData" in store
    assert html.index('id="cameraReferenceSection"') < html.index('id="oxygenForm"')
    assert 'id="cameraReferenceButton"' in html and "disabled" in html
    assert 'id="cameraTargetSummary"' in html
    assert "function updateCameraTargetDisplay" in javascript
    assert 'spo2Input.value=""' in javascript
    assert 'pulseInput.value=""' in javascript
    assert "form.reset()" not in javascript


def test_interface_offers_persistent_ivory_theme():
    web = files("blood_measure").joinpath("web")
    html = web.joinpath("index.html").read_text()
    css = web.joinpath("styles.css").read_text()
    javascript = web.joinpath("app.js").read_text()

    assert '<option value="ivory"' in html
    assert ':root[data-theme="ivory"]' in css
    assert 'const THEME_KEY = "blood-measure-theme"' in javascript
    assert "localStorage.setItem(THEME_KEY, themeSelect.value)" in javascript


def test_interface_offers_persistent_sheets_theme():
    web = files("blood_measure").joinpath("web")
    html = web.joinpath("index.html").read_text()
    usage = web.joinpath("usage.html").read_text()
    css = web.joinpath("styles.css").read_text()

    assert '<option value="sheets"' in html
    assert '<option value="sheets"' in usage
    assert ':root[data-theme="sheets"]' in css


def test_android_install_has_raster_icons_and_result_feedback():
    web = files("blood_measure").joinpath("web")
    manifest = web.joinpath("manifest.webmanifest").read_text()
    javascript = web.joinpath("app.js").read_text()

    assert '"sizes": "192x192"' in manifest
    assert manifest.count('"sizes": "512x512"') >= 2
    assert '"type": "image/svg+xml"' not in manifest
    assert 'choice.outcome === "accepted"' in javascript
    assert 'installStatus.textContent = t("installComplete")' in javascript


def test_camera_permission_failure_gives_xiaomi_recovery_steps():
    web = files("blood_measure").joinpath("web")
    support = web.joinpath("camera-support.js").read_text()
    assert "Xiaomi/HyperOS" in support
    assert "Manage apps" in support
    assert "Site settings > Camera" in support
    for page in ("index.html", "pulse.html", "recovery.html", "breathing.html", "waveform.html", "oxygen.html"):
        assert 'src="camera-support.js"' in web.joinpath(page).read_text()


def test_usage_page_keeps_meter_page_concise():
    web = files("blood_measure").joinpath("web")
    meter = web.joinpath("index.html").read_text()
    usage = web.joinpath("usage.html").read_text()

    assert 'href="usage.html"' in meter
    assert "During the recording" in usage
    assert "Privacy and saved readings" in usage
    assert "<details>" not in meter


def test_interface_has_visible_measurement_failure_state():
    javascript = files("blood_measure").joinpath("web", "app.js").read_text()

    assert 'resultTitle.textContent = t("unsuccessful")' in javascript
    assert "result.hidden = false" in javascript


def test_interface_labels_experimental_pressure_estimate():
    web = files("blood_measure").joinpath("web")
    html = web.joinpath("index.html").read_text()
    javascript = web.joinpath("app.js").read_text()

    assert "Experimental blood pressure estimate" in html
    assert "do not use it for diagnosis" in html
    assert "estimateBloodPressure" in javascript
    assert "population-heuristic-v1" in javascript


def test_signal_quality_uses_analyzed_camera_frames():
    web = files("blood_measure").joinpath("web")
    app = web.joinpath("app.js").read_text()
    analysis = web.joinpath("ppg-analysis.js").read_text()

    assert "requestVideoFrameCallback" in app
    assert "window.BloodMeasurePPG.analyze(samples)" in app
    assert "function setQualityDisplay" in app
    assert "const analysisStart = frames[0].timestamp + 1.5" in analysis
    assert "function selectConsensusCandidate" in analysis
    assert "function candidateScore" in analysis
    assert "competition >= .65" in analysis


def test_pulse_analysis_is_separate_and_non_diagnostic():
    web = files("blood_measure").joinpath("web")
    html = web.joinpath("pulse.html").read_text()
    javascript = web.joinpath("pulse.js").read_text()
    analysis = web.joinpath("ppg-analysis.js").read_text()

    assert "60-second recording" in html.lower()
    assert "cannot diagnose atrial fibrillation" in html
    assert "const RECORDING_SECONDS = 60" in javascript
    assert "blood-measure-pulse-sessions-v1" in javascript
    assert "beatIntervalsMs" in analysis
    assert 'format: "blood-measure-pulse-v1"' in javascript
    assert 'id="rmssdValue"' in html
    assert "function calculatePrv" in javascript
    assert "pnn50Percent" in javascript
    assert "not ECG-derived HRV" in html


def test_mismatched_camera_pulse_is_excluded_from_calibration():
    javascript = files("blood_measure").joinpath("web", "app.js").read_text()

    assert "function isUsableComparison" in javascript
    assert "Math.max(15, item.cuff.pulse * .20)" in javascript
    assert 't("savedMismatch")' in javascript


def test_interface_supports_english_and_chinese():
    web = files("blood_measure").joinpath("web")
    html = web.joinpath("index.html").read_text()
    javascript = web.joinpath("app.js").read_text()

    assert 'id="languageButton"' in html
    assert 'data-i18n="startMeasurement"' in html
    assert 'zh: {' in javascript
    assert 'appName: "血压测量"' in javascript
    assert "blood-measure-language" in javascript


def test_personal_calibration_uses_paired_cuff_pulse_safely():
    web = files("blood_measure").joinpath("web")
    html = web.joinpath("index.html").read_text()
    javascript = web.joinpath("app.js").read_text()

    assert 'id="cuffPulse"' in html
    assert 'id="pulseAdjustment"' in html
    assert "function adjustPulse" in javascript
    assert "comparisons.length < 3" in javascript
    assert "Math.max(-20, Math.min(20, median(residuals)))" in javascript
    assert 'method: "personal-median-offset-v1"' in javascript


def test_pressure_calibration_requires_three_references_and_uses_median():
    javascript = files("blood_measure").joinpath("web", "app.js").read_text()

    assert "comparisons.length >= 3" in javascript
    assert "median(residuals.map(item => item.systolic))" in javascript
    assert "median(residuals.map(item => item.diastolic))" in javascript
    assert 'method: comparisons.length >= 3 ? "personal-median-offset-v2"' in javascript
