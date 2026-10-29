import queue
import threading
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from urllib.parse import urlparse
from pathlib import Path

from generator.builder import Builder
from generator.watcher import BackgroundBuilder


HOST = "127.0.0.1"
PORT = 5001

# Global dictionary to track reload events by connection ID
RELOAD_EVENTS = {}
RELOAD_EVENTS_LOCK = threading.Lock()

RELOAD_SCRIPT = """
<script>
(function() {
  console.log('Live reload enabled');
  const eventSource = new EventSource('/sse');

  eventSource.onmessage = function(event) {
    if (event.data === 'reload') {
      console.log('Reloading page due to file changes...');
      location.reload();
    }
  };

  eventSource.onerror = function(event) {
    console.log('Live reload connection error, retrying...');
    setTimeout(() => location.reload(), 1000);
  };
})();
</script>
"""


class LiveReloadHandler(SimpleHTTPRequestHandler):
    """HTTP handler with live reload support via SSE."""

    def __init__(self, *args, **kwargs):
        try:
            super().__init__(*args, **kwargs)
        except (ConnectionResetError, BrokenPipeError):
            pass

    def do_GET(self):
        """Handle GET requests with SSE support and JS injection."""
        try:
            if self.path == "/sse":
                self.handle_sse()
            else:
                # Handle regular file requests with potential JS injection
                self.handle_file_with_reload()
        except (ConnectionResetError, BrokenPipeError):
            pass

    def handle_sse(self):
        """Handle Server-Sent Events for live reload."""
        self.send_response(200)
        self.send_header("Content-Type", "text/event-stream")
        self.send_header("Cache-Control", "no-cache")
        self.send_header("Connection", "keep-alive")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()

        # Register this connection
        connection_id = id(self)

        try:
            # Send initial connection message
            self.wfile.write(b"data: connected\n\n")
            self.wfile.flush()

            # Create a reload event for this specific connection
            reload_event = threading.Event()

            # Store the event so notify_reload can signal it
            with RELOAD_EVENTS_LOCK:
                RELOAD_EVENTS[connection_id] = reload_event

            # Wait for reload signal
            while True:
                try:
                    # Wait for reload event with timeout
                    if reload_event.wait(timeout=0.1):
                        self.wfile.write(b"data: reload\n\n")
                        self.wfile.flush()
                        break  # Exit after sending reload signal
                    else:
                        # Send periodic keepalive
                        try:
                            self.wfile.write(b": keepalive\n\n")
                            self.wfile.flush()
                        except BrokenPipeError:
                            break
                except (BrokenPipeError, ConnectionResetError):
                    break
        finally:
            # Unregister this connection
            with RELOAD_EVENTS_LOCK:
                RELOAD_EVENTS.pop(connection_id, None)

    def handle_file_with_reload(self):
        """Handle regular file requests, injecting reload script into HTML."""
        # Parse the URL to get the file path
        parsed_path = urlparse(self.path)
        file_path = parsed_path.path.lstrip("/")

        if not file_path:
            file_path = "index.html"
        elif file_path.endswith("/"):
            file_path = file_path + "index.html"

        full_path = Path(self.directory) / file_path

        try:
            if full_path.exists() and full_path.is_file():
                if file_path.endswith(".html"):
                    # Inject live reload script into HTML files
                    content = full_path.read_text(encoding="utf-8")

                    # Inject script before closing </body> tag, or at end if no </body>
                    if "</body>" in content:
                        content = content.replace("</body>", f"{RELOAD_SCRIPT}</body>")
                    else:
                        content += RELOAD_SCRIPT

                    self.send_response(200)
                    self.send_header("Content-Type", "text/html; charset=utf-8")
                    self.send_header(
                        "Content-Length", str(len(content.encode("utf-8")))
                    )
                    self.end_headers()
                    self.wfile.write(content.encode("utf-8"))
                elif self.headers.get("Range"):
                    # Byte ranges, so that audio and video can seek
                    self.handle_range(full_path)
                else:
                    # For non-HTML files, serve normally
                    super().do_GET()
            else:
                # File not found
                super().do_GET()
        except Exception:
            # Fall back to default behavior
            super().do_GET()

    def handle_range(self, full_path):
        """Serve a single byte range (``Range: bytes=start-end``) of a file."""
        size = full_path.stat().st_size
        try:
            unit, _, spec = self.headers["Range"].partition("=")
            first, _, last = spec.split(",")[0].strip().partition("-")
            if unit.strip() != "bytes":
                raise ValueError(unit)
            if first:
                start, end = int(first), int(last) if last else size - 1
            else:
                start, end = max(0, size - int(last)), size - 1
            end = min(end, size - 1)
            if start > end:
                raise ValueError(spec)
        except ValueError:
            self.send_response(416)
            self.send_header("Content-Range", f"bytes */{size}")
            self.end_headers()
            return
        self.send_response(206)
        self.send_header("Content-Type", self.guess_type(str(full_path)))
        self.send_header("Accept-Ranges", "bytes")
        self.send_header("Content-Range", f"bytes {start}-{end}/{size}")
        self.send_header("Content-Length", str(end - start + 1))
        # so that a browser never mixes parts of an older version of the file in
        self.send_header(
            "Last-Modified", self.date_time_string(int(full_path.stat().st_mtime))
        )
        self.send_header("Cache-Control", "no-cache")
        self.end_headers()
        with full_path.open("rb") as f:
            f.seek(start)
            remaining = end - start + 1
            while remaining > 0:
                chunk = f.read(min(65536, remaining))
                if not chunk:
                    break
                self.wfile.write(chunk)
                remaining -= len(chunk)

    def log_message(self, format, *args):
        """Suppress log messages."""
        pass


# Python guesses audio/mp4a-latm for .m4a, which not every browser plays
LiveReloadHandler.extensions_map = {
    **SimpleHTTPRequestHandler.extensions_map,
    ".m4a": "audio/mp4",
}


def notify_reload():
    """Signal all SSE clients to reload."""
    with RELOAD_EVENTS_LOCK:
        # Signal all active connections exactly once
        for connection_id, event in list(RELOAD_EVENTS.items()):
            event.set()
        # Clear events after signaling
        RELOAD_EVENTS.clear()


def main_build():
    """Entry point for build-blog command."""
    Builder().build()


def main_serve():
    """Entry point for serve-blog command with background file watching and live reload."""
    # Create background builder with reload notification callback
    background_builder = BackgroundBuilder(on_build_complete=notify_reload)
    output_dir = background_builder.builder.output_folder

    # Start background builder and file watcher
    background_builder.start()

    try:
        print(f"Serving on http://{HOST}:{PORT}/ with live reload")
        # Use ThreadingHTTPServer for concurrent request handling
        server = ThreadingHTTPServer(
            (HOST, PORT),
            lambda *args: LiveReloadHandler(*args, directory=str(output_dir)),
        )
        # Allow reuse of address to avoid "Address already in use" errors
        server.allow_reuse_address = True
        server.serve_forever()
    except KeyboardInterrupt:
        background_builder.stop()
    except Exception as e:
        print(f"Server error: {e}")
        background_builder.stop()
        raise
