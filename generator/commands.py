from http.server import HTTPServer, SimpleHTTPRequestHandler

from generator.builder import Builder
from generator.watcher import BackgroundBuilder


HOST = "127.0.0.1"
PORT = 5000


def main_build():
    """Entry point for build-blog command."""
    Builder().build()


def main_serve():
    """Entry point for serve-blog command with background file watching."""
    background_builder = BackgroundBuilder()
    output_dir = background_builder.builder.output_folder

    class Handler(SimpleHTTPRequestHandler):
        def handle_one_request(self):
            try:
                super().handle_one_request()
            except (BrokenPipeError, ConnectionResetError):
                pass

        def log_message(self, format, *args):
            pass

    # Start background builder and file watcher
    background_builder.start()

    try:
        print(f"Serving on http://{HOST}:{PORT}/")
        HTTPServer(
            (HOST, PORT), lambda *args: Handler(*args, directory=str(output_dir))
        ).serve_forever()
    except KeyboardInterrupt:
        background_builder.stop()
    except Exception as e:
        print(f"Server error: {e}")
        background_builder.stop()
        raise
