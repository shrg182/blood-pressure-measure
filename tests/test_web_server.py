import sys

import pytest

from blood_measure import web_server


def test_requires_certificate_and_key_together(monkeypatch):
    monkeypatch.setattr(sys, "argv", ["blood-measure-web", "--certfile", "cert.pem"])

    with pytest.raises(SystemExit) as error:
        web_server.main()

    assert error.value.code == 2
