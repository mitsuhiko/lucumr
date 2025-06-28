# -*- coding: utf-8 -*-
"""
rstblog.modules
~~~~~~~~~~~~~~~

The module interface.

:copyright: (c) 2010 by Armin Ronacher.
:license: BSD, see LICENSE for more details.
"""


def add_module_path(folder):
    """Adds a new search path to the list of search paths."""
    import os

    __path__.append(os.path.abspath(folder))


def find_module(name):
    """Returns the module by the given name or raises an ImportError."""
    import sys

    full_name = "rstblog.modules." + name
    __import__(full_name)
    return sys.modules[full_name]
