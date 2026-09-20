from importlib.resources import files


def test_mobile_web_assets_are_packaged():
    web = files("blood_measure").joinpath("web")

    for asset in (
        "index.html",
        "usage.html",
        "styles.css",
        "app.js",
        "usage.js",
        "manifest.webmanifest",
        "service-worker.js",
        "icon.svg",
        "icon-maskable.svg",
    ):
        assert web.joinpath(asset).is_file()


def test_interface_describes_camera_bp_limitation():
    html = files("blood_measure").joinpath("web", "usage.html").read_text()

    assert "cannot directly measure blood pressure" in html
    assert "validated upper-arm cuff" in html


def test_interface_offers_persistent_ivory_theme():
    web = files("blood_measure").joinpath("web")
    html = web.joinpath("index.html").read_text()
    css = web.joinpath("styles.css").read_text()
    javascript = web.joinpath("app.js").read_text()

    assert '<option value="ivory"' in html
    assert ':root[data-theme="ivory"]' in css
    assert 'const THEME_KEY = "blood-measure-theme"' in javascript
    assert "localStorage.setItem(THEME_KEY, themeSelect.value)" in javascript


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
    javascript = files("blood_measure").joinpath("web", "app.js").read_text()

    assert "requestVideoFrameCallback" in javascript
    assert "function analyzeChannel" in javascript
    assert "function setQualityDisplay" in javascript
    assert "(peak.value - .10) / .50" in javascript


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
