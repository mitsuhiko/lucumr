# -*- coding: utf-8 -*-
"""
    rstblog.server
    ~~~~~~~~~~~~~~

    Development server that rebuilds automatically

    :copyright: (c) 2010 by Armin Ronacher.
    :license: BSD, see LICENSE for more details.
"""
from __future__ import absolute_import
from __future__ import print_function
import os
import sys
import six.moves.urllib.request, six.moves.urllib.parse, six.moves.urllib.error
import posixpath
from six.moves.BaseHTTPServer import HTTPServer
from six.moves.SimpleHTTPServer import SimpleHTTPRequestHandler


class SimpleRequestHandler(SimpleHTTPRequestHandler):

    def do_GET(self):
        if self.server.builder.anything_needs_build():
            print('Detected change, building', file=sys.stderr)
            self.server.builder.run()
        SimpleHTTPRequestHandler.do_GET(self)

    def translate_path(self, path):
        path = path.split('?', 1)[0].split('#', 1)[0]
        path = posixpath.normpath(six.moves.urllib.parse.unquote(path))
        words = path.split('/')
        words = [_f for _f in words if _f]
        path = self.server.builder.default_output_folder
        for word in words:
            drive, word = os.path.splitdrive(word)
            head, word = os.path.split(word)
            if word in (os.curdir, os.pardir):
                continue
            path = os.path.join(path, word)
        return path

    def log_request(self, code='-', size='-'):
        pass

    def log_error(self, *args):
        pass

    def log_message(self, format, *args):
        pass


class Server(HTTPServer):

    def __init__(self, host, port, builder):
        HTTPServer.__init__(self, (host, int(port)), SimpleRequestHandler)
        self.builder = builder
