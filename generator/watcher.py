import time
import threading
from pathlib import Path
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler

from generator.builder import Builder


class BackgroundBuilder:
    """Simple file watcher that triggers builder.build() for any change."""

    def __init__(self, project_folder, debounce_delay=0.5):
        self.project_folder = Path(project_folder)
        self.debounce_delay = debounce_delay
        self.builder = Builder(project_folder)
        self.observer = Observer()
        self.last_change_time = 0
        self.build_thread = None
        self.stop_event = threading.Event()

    def _on_change(self, event):
        """Handle any file system change."""
        if event.is_directory or self.builder.should_ignore(event.src_path):
            return
        self.last_change_time = time.time()

    def _build_loop(self):
        """Background thread that triggers builds after debounce delay."""
        while not self.stop_event.is_set():
            if (
                self.last_change_time > 0
                and time.time() - self.last_change_time > self.debounce_delay
            ):
                try:
                    print("Triggering rebuild...")
                    start_time = time.time()
                    self.builder.build()
                    elapsed = time.time() - start_time
                    print(f"Build completed in {elapsed:.2f}s")
                except Exception as e:
                    print(f"Build failed: {e}")
                finally:
                    self.last_change_time = 0

            time.sleep(0.1)

    def start(self):
        """Start watching for file changes."""
        # Initial build
        print("Performing initial build...")
        self.builder.build()
        print("Initial build complete")

        # Set up file watcher
        handler = FileSystemEventHandler()
        handler.on_created = self._on_change
        handler.on_modified = self._on_change
        handler.on_deleted = self._on_change
        handler.on_moved = self._on_change

        self.observer.schedule(handler, str(self.project_folder), recursive=True)
        self.observer.start()

        # Start build thread
        self.build_thread = threading.Thread(target=self._build_loop, daemon=True)
        self.build_thread.start()

        print("File watcher started")

    def stop(self):
        """Stop the file watcher."""
        self.stop_event.set()
        self.observer.stop()
        self.observer.join()
        if self.build_thread:
            self.build_thread.join(timeout=5)
