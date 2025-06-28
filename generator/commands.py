import sys
import os
from generator.builder import Builder


def main_build():
    """Entry point for build-blog command."""
    builder = Builder(os.getcwd())
    builder.build()


def main_serve():
    """Entry point for serve-blog command."""
    try:
        builder = Builder(os.getcwd())
        builder.serve(host="0.0.0.0", port=5000)
    except KeyboardInterrupt:
        print("\nShutting down server...")
