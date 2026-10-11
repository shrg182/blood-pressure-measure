"""Execute the actual browser store with Node's isolated VM and storage fixture."""
from pathlib import Path
import shutil
import subprocess

import pytest


@pytest.mark.parametrize("script", ["measurement_store.test.cjs", "measurement_result.test.cjs", "usage_updates.test.cjs"])
def test_measurement_store_regressions(script):
    node = shutil.which("node")
    if node is None:
        pytest.skip("Node.js is required for executable measurement-store regression tests")
    result = subprocess.run(
        [node, "--test", f"tests/{script}"],
        cwd=Path(__file__).resolve().parents[1],
        capture_output=True,
        text=True,
    )
    assert result.returncode == 0, result.stdout + result.stderr
