"""Local HTTP/HTTPS server for the mobile fingertip PPG interface."""

import argparse
import ssl
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from importlib.resources import files
from pathlib import Path


class BloodMeasureHandler(SimpleHTTPRequestHandler):
    """Static handler with conservative browser security headers."""

    def end_headers(self) -> None:
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Referrer-Policy", "no-referrer")
        self.send_header("Permissions-Policy", "camera=(self)")
        super().end_headers()


def main() -> None:
    parser = argparse.ArgumentParser(description="Serve the Blood Measure mobile interface.")
    parser.add_argument("--host", default="127.0.0.1", help="Address to listen on")
    parser.add_argument("--port", default=8000, type=int, help="Port to listen on")
    parser.add_argument("--certfile", type=Path, help="TLS certificate in PEM format")
    parser.add_argument("--keyfile", type=Path, help="TLS private key in PEM format")
    args = parser.parse_args()
    if bool(args.certfile) != bool(args.keyfile):
        parser.error("--certfile and --keyfile must be supplied together")

    web_root = files("blood_measure").joinpath("web")
    handler = partial(BloodMeasureHandler, directory=str(web_root))
    server = ThreadingHTTPServer((args.host, args.port), handler)
    scheme = "http"
    if args.certfile and args.keyfile:
        context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
        context.load_cert_chain(args.certfile, args.keyfile)
        server.socket = context.wrap_socket(server.socket, server_side=True)
        scheme = "https"

    display_host = "localhost" if args.host in {"127.0.0.1", "::1"} else args.host
    print(f"Blood Measure is available at {scheme}://{display_host}:{args.port}")
    print("Press Ctrl+C to stop.")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
