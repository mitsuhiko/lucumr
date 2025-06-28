# -*- coding: utf-8 -*-
"""
    rstblog.config
    ~~~~~~~~~~~~~~

    Holds the configuration and can read it from another file.

    :copyright: (c) 2010 by Armin Ronacher.
    :license: BSD, see LICENSE for more details.
"""
from __future__ import absolute_import
import yaml
import six


missing = object()


class Config(object):
    """A stacked config."""

    def __init__(self):
        self.stack = []

    def __getitem__(self, key):
        for layer in reversed(self.stack):
            rv = layer.get(key, missing)
            if rv is not missing:
                return rv
        raise KeyError(key)

    def get(self, key, default=None):
        try:
            return self[key]
        except KeyError:
            return default

    def list_entries(self, key):
        rv = {}
        prefix = key + '.'
        for layer in self.stack:
            for key, value in six.iteritems(layer):
                if key.startswith(prefix):
                    rv[key] = value
        return rv

    def merged_get(self, key):
        result = None
        for layer in reversed(self.stack):
            rv = layer.get(key, missing)
            if rv is not missing:
                if result is None:
                    result = rv
                else:
                    if isinstance(result, list):
                        result.extend(rv)
                    elif isinstance(result, dict):
                        result.update(rv)
                    else:
                        raise ValueError('expected list or dict')
        return result

    def root_get(self, key, default=None):
        return self.stack[0].get(key, default)

    def add_from_dict(self, d):
        """Returns a new config from this config with another layer added
        from a given dictionary.
        """
        layer = {}
        rv = Config()
        rv.stack = self.stack + [layer]
        def _walk(d, prefix):
            for key, value in six.iteritems(d):
                if isinstance(value, dict):
                    _walk(value, prefix + key + '.')
                else:
                    layer[prefix + key] = value
        _walk(d, '')
        return rv

    def add_from_file(self, fd):
        """Returns a new config from this config with another layer added
        from a given config file.
        """
        d = yaml.safe_load(fd)
        if not d:
            return
        if not isinstance(d, dict):
            raise ValueError('Configuration has to contain a dict')
        return self.add_from_dict(d)

    def pop(self):
        self.stack.pop()
