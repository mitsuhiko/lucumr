from http.server import HTTPServer, SimpleHTTPRequestHandler

from generator.builder import Builder, CONFIG


def main_build():
    """Entry point for build-blog command."""
    builder = Builder()
    builder.build()


def main_serve():
    """Entry point for serve-blog command."""
    host = "0.0.0.0"
    port = 5000

    builder = Builder()
    output_dir = builder.project_folder / CONFIG["output_folder"]

    class Handler(SimpleHTTPRequestHandler):
        def do_GET(self):
            builder.build()
            try:
                super().do_GET()
            except (BrokenPipeError, ConnectionResetError):
                pass

        def log_message(self, format, *args):
            pass

    print(f"Serving on http://{host}:{port}/")
    HTTPServer(
        (host, port), lambda *args: Handler(*args, directory=str(output_dir))
    ).serve_forever()
