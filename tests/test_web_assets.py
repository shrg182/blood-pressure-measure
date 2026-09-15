from importlib.resources import files


def test_mobile_web_assets_are_packaged():
    web = files("blood_measure").joinpath("web")

    for asset in (
        "index.html",
        "styles.css",
        "app.js",
        "manifest.webmanifest",
        "service-worker.js",
        "icon.svg",
        "icon-maskable.svg",
    ):
        assert web.joinpath(asset).is_file()


def test_interface_describes_camera_bp_limitation():
    html = files("blood_measure").joinpath("web", "index.html").read_text()

    assert "does not directly measure blood pressure" in html
    assert "validated upper-arm cuff" in html


def test_interface_has_visible_measurement_failure_state():
    javascript = files("blood_measure").joinpath("web", "app.js").read_text()

    assert 'resultTitle.textContent = "Measurement unsuccessful"' in javascript
    assert "result.hidden = false" in javascript
