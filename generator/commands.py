from http.server import HTTPServer, SimpleHTTPRequestHandler

from generator.builder import Builder, CONFIG
from generator.watcher import BackgroundBuilder


def main_build():
    """Entry point for build-blog command."""
    builder = Builder()
    builder.build()


def main_serve():
    """Entry point for serve-blog command with background file watching."""
    host = "127.0.0.1"  # Try localhost instead of 0.0.0.0
    port = 5000

    # Create background builder with file watcher
    background_builder = BackgroundBuilder(".")
    output_dir = background_builder.project_folder / CONFIG["output_folder"]

    class Handler(SimpleHTTPRequestHandler):
        def do_GET(self):
            # No more building on request - just serve static files
            try:
                super().do_GET()
            except (BrokenPipeError, ConnectionResetError):
                pass

        def log_message(self, format, *args):
            # Suppress request logging
            pass

    # Start background builder and file watcher
    background_builder.start()

    try:
        print(f"Serving on http://{host}:{port}/")
        HTTPServer(
            (host, port), lambda *args: Handler(*args, directory=str(output_dir))
        ).serve_forever()
    except KeyboardInterrupt:
        background_builder.stop()
    except Exception as e:
        print(f"Server error: {e}")
        background_builder.stop()
        raise
