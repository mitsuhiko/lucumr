# -*- coding: utf-8 -*-
"""
rstblog.cli
~~~~~~~~~~~

The command line interface

:copyright: (c) 2010 by Armin Ronacher.
:license: BSD, see LICENSE for more details.
"""

from __future__ import with_statement
from __future__ import absolute_import
from __future__ import print_function
import sys
import os
from rstblog.config import Config
from rstblog.builder import Builder


def get_builder(project_folder):
    """Runs the builder for the given project folder."""
    config_filename = os.path.join(project_folder, "config.yml")
    config = Config()
    if not os.path.isfile(config_filename):
        raise ValueError('root config file "%s" is required' % config_filename)
    with open(config_filename) as f:
        config = config.add_from_file(f)
    return Builder(project_folder, config)


def main():
    """Entrypoint for the console script."""
    if len(sys.argv) not in (1, 2, 3):
        print("usage: rstblog <action> <folder>", file=sys.stderr)
    if len(sys.argv) >= 2:
        action = sys.argv[1]
    else:
        action = "build"
    if len(sys.argv) >= 3:
        folder = sys.argv[2]
    else:
        folder = os.getcwd()
    if action not in ("build", "serve"):
        print("unknown action", action, file=sys.stderr)
    builder = get_builder(folder)

    if action == "build":
        builder.run()
    else:
        builder.debug_serve()
