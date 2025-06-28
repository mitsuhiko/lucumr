# -*- coding: utf-8 -*-
"""
    rstblog.programs
    ~~~~~~~~~~~~~~~~

    Builtin build programs.

    :copyright: (c) 2010 by Armin Ronacher.
    :license: BSD, see LICENSE for more details.
"""
from __future__ import with_statement
from __future__ import absolute_import
import os
import yaml
import shutil
from datetime import datetime
from io import StringIO
from weakref import ref


class Program(object):

    def __init__(self, context):
        self._context = ref(context)

    @property
    def context(self):
        rv = self._context()
        if rv is None:
            raise RuntimeError('context went away, program is invalid')
        return rv

    def get_desired_filename(self):
        folder, basename = os.path.split(self.context.source_filename)
        simple_name = os.path.splitext(basename)[0]
        if simple_name == 'index':
            suffix = 'index.html'
        else:
            suffix = os.path.join(simple_name, 'index.html')
        return os.path.join(folder, suffix)

    def prepare(self):
        pass

    def render_contents(self):
        return u''

    def run(self):
        raise NotImplementedError()


class CopyProgram(Program):
    """A program that copies a file over unchanged"""

    def run(self):
        self.context.make_destination_folder()
        shutil.copy(self.context.full_source_filename,
                    self.context.full_destination_filename)

    def get_desired_filename(self):
        return self.context.source_filename


class TemplatedProgram(Program):
    default_template = None

    def get_template_context(self):
        return {}

    def run(self):
        template_name = self.context.config.get('template') \
            or self.default_template
        context = self.get_template_context()
        rv = self.context.render_template(template_name, context)
        with self.context.open_destination_file() as f:
            f.write(rv.encode('utf-8') + b'\n')


class RSTProgram(TemplatedProgram):
    """A program that renders an rst file into a template"""
    default_template = 'rst_display.html'
    _fragment_cache = None

    def prepare(self):
        headers = ['---']
        with self.context.open_source_file() as f:
            for line in f:
                line = line.rstrip().decode("utf-8")
                if not line:
                    break
                headers.append(line)
            title = self.parse_text_title(f)

        cfg = yaml.safe_load(StringIO('\n'.join(headers)))
        if cfg:
            if not isinstance(cfg, dict):
                raise ValueError('expected dict config in file "%s", got: %.40r' \
                    % (self.context.source_filename, cfg))
            self.context.config = self.context.config.add_from_dict(cfg)
            self.context.destination_filename = cfg.get(
                'destination_filename',
                self.context.destination_filename)

            title_override = cfg.get('title')
            if title_override is not None:
                title = title_override

            pub_date_override = cfg.get('pub_date')
            if pub_date_override is not None:
                if not isinstance(pub_date_override, datetime):
                    pub_date_override = datetime(pub_date_override.year,
                                                 pub_date_override.month,
                                                 pub_date_override.day)
                self.context.pub_date = pub_date_override

            summary_override = cfg.get('summary')
            if summary_override is not None:
                self.context.summary = summary_override

        if title is not None:
            self.context.title = title

    def parse_text_title(self, f):
        buffer = []
        for line in f:
            line = line.rstrip()
            if not line:
                break
            buffer.append(line)
        return self.context.render_rst(b'\n'.join(buffer).decode('utf-8')).get('title')

    def get_fragments(self):
        if self._fragment_cache is not None:
            return self._fragment_cache
        with self.context.open_source_file() as f:
            while f.readline().strip():
                pass
            rv = self.context.render_rst(f.read().decode('utf-8'))
        self._fragment_cache = rv
        return rv

    def render_contents(self):
        return self.get_fragments()['fragment']

    def get_template_context(self):
        ctx = TemplatedProgram.get_template_context(self)
        ctx['rst'] = self.get_fragments()
        return ctx
