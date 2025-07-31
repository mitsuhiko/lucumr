import time
import threading
import traceback
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler

from generator.builder import Builder


class BackgroundBuilder:
    """Simple file watcher that triggers builder.build() for any change."""

    def __init__(self, project_folder=None, debounce_delay=0.5, on_build_complete=None):
        self.builder = Builder(project_folder)
        self.debounce_delay = debounce_delay
        self.observer = Observer()
        self.last_change_time = 0
        self.build_thread = None
        self.stop_event = threading.Event()
        self.build_lock = threading.Lock()
        self.is_building = False
        self.on_build_complete = on_build_complete
        # Pass the reload callback to the builder
        self.builder.on_page_rebuilt = on_build_complete

    def _on_change(self, event):
        """Handle any file system change."""
        if event.is_directory or self.builder.should_ignore(event.src_path):
            return
        self.last_change_time = time.time()

    def _build_loop(self):
        """Background thread that triggers builds after debounce delay."""
        while not self.stop_event.is_set():
            should_build = False

            with self.build_lock:
                if (
                    self.last_change_time > 0
                    and time.time() - self.last_change_time > self.debounce_delay
                    and not self.is_building
                ):
                    should_build = True
                    self.is_building = True
                    # Capture the change time that triggered this build
                    build_trigger_time = self.last_change_time

            if should_build:
                try:
                    self.builder.build()
                except Exception:
                    traceback.print_exc()
                finally:
                    with self.build_lock:
                        self.is_building = False
                        # Only reset if no new changes came in during the build
                        if self.last_change_time == build_trigger_time:
                            self.last_change_time = 0

            time.sleep(0.1)

    def start(self):
        """Start watching for file changes."""
        # Initial build
        self.builder.build()

        # Set up file watcher
        handler = FileSystemEventHandler()
        handler.on_created = self._on_change
        handler.on_modified = self._on_change
        handler.on_deleted = self._on_change
        handler.on_moved = self._on_change

        self.observer.schedule(
            handler, str(self.builder.project_folder), recursive=True
        )
        self.observer.start()

        # Start build thread
        self.build_thread = threading.Thread(target=self._build_loop, daemon=True)
        self.build_thread.start()

    def stop(self):
        """Stop the file watcher."""
        self.stop_event.set()
        self.observer.stop()
        self.observer.join()
        if self.build_thread:
            self.build_thread.join(timeout=5)
