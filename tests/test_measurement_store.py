"""Execute the actual browser store with Node's isolated VM and storage fixture."""
from pathlib import Path
import shutil
import subprocess

import pytest


def test_measurement_store_regressions():
    node = shutil.which("node")
    if node is None:
        pytest.skip("Node.js is required for executable measurement-store regression tests")
    result = subprocess.run(
        [node, "--test", "tests/measurement_store.test.cjs"],
        cwd=Path(__file__).resolve().parents[1],
        capture_output=True,
        text=True,
    )
    assert result.returncode == 0, result.stdout + result.stderr
