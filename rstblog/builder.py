# -*- coding: utf-8 -*-
"""
rstblog.builder
~~~~~~~~~~~~~~~

The building components.

:copyright: (c) 2010 by Armin Ronacher.
:license: BSD, see LICENSE for more details.
"""

from __future__ import absolute_import
from __future__ import print_function
import re
import os
import posixpath
from fnmatch import fnmatch
from six.moves.urllib.parse import urlparse

from docutils.core import publish_parts

from jinja2 import Environment, FileSystemLoader
from markupsafe import Markup

from babel import Locale, dates

from werkzeug.routing import Map, Rule
from urllib.parse import unquote as url_unquote

from rstblog.signals import (
    before_file_processed,
    before_template_rendered,
    before_build_finished,
    before_file_built,
    after_file_prepared,
    after_file_published,
)
from rstblog.modules import find_module
from rstblog.programs import RSTProgram, CopyProgram
import six


OUTPUT_FOLDER = "_build"
builtin_programs = {"rst": RSTProgram, "copy": CopyProgram}
builtin_templates = os.path.join(os.path.dirname(__file__), "templates")
url_parts_re = re.compile(r"\$(\w+|{[^}]+})")


class Context(object):
    """Per rendering information"""

    def __init__(self, builder, config, source_filename, prepare=False):
        self.builder = builder
        self.config = config
        self.title = "Untitled"
        self.summary = None
        self.pub_date = None
        self.source_filename = source_filename
        self.links = []
        self.program_name = self.config.get("program")
        if self.program_name is None:
            self.program_name = self.builder.guess_program(config, source_filename)
        self.program = self.builder.programs[self.program_name](self)
        self.destination_filename = os.path.join(
            self.builder.prefix_path.lstrip("/"), self.program.get_desired_filename()
        )
        if prepare:
            self.program.prepare()
            after_file_prepared.send(self)
            if self.public:
                after_file_published.send(self)

    @property
    def is_new(self):
        return not os.path.exists(self.full_destination_filename)

    @property
    def public(self):
        return self.config.get("public", True)

    @property
    def slug(self):
        directory, filename = os.path.split(self.source_filename)
        basename, ext = os.path.splitext(filename)
        if basename == "index":
            return posixpath.join(directory, basename).rstrip("/").replace("\\", "/")
        return posixpath.join(directory, basename).replace("\\", "/")

    def make_destination_folder(self):
        folder = self.destination_folder
        if not os.path.isdir(folder):
            os.makedirs(folder)

    def open_source_file(self, mode="rb"):
        return open(self.full_source_filename, mode)

    def open_destination_file(self, mode="wb"):
        self.make_destination_folder()
        return open(self.full_destination_filename, mode)

    @property
    def destination_folder(self):
        return os.path.dirname(self.full_destination_filename)

    @property
    def full_destination_filename(self):
        return os.path.join(
            self.builder.project_folder,
            self.config.get("output_folder") or OUTPUT_FOLDER,
            self.destination_filename,
        )

    @property
    def full_source_filename(self):
        return os.path.join(self.builder.project_folder, self.source_filename)

    @property
    def needs_build(self):
        if self.is_new:
            return True
        src = self.full_source_filename
        dst = self.full_destination_filename
        return os.path.getmtime(dst) < os.path.getmtime(src)

    def get_default_template_context(self):
        slug = self.destination_filename
        if slug.endswith("/index.html"):
            slug = slug[:-10]
        return {
            "source_filename": self.source_filename,
            "program_name": self.program_name,
            "links": self.links,
            "ctx": self,
            "config": self.config,
            "slug": "/" + self.slug.lstrip("/"),
        }

    def render_template(self, template_name, context=None):
        real_context = self.get_default_template_context()
        if context:
            real_context.update(context)
        return self.builder.render_template(template_name, real_context)

    def render_rst(self, contents):
        settings = {
            "initial_header_level": self.config.get("rst_header_level", 2),
            "rstblog_context": self,
        }
        parts = publish_parts(
            source=contents, writer_name="html4css1", settings_overrides=settings
        )
        return {
            "title": Markup(parts["title"]).striptags(),
            "html_title": Markup(parts["html_title"]),
            "fragment": Markup(parts["fragment"]),
        }

    def render_contents(self):
        return self.program.render_contents()

    def render_summary(self):
        if not self.summary:
            return ""
        return self.render_rst(self.summary)["fragment"]

    def add_stylesheet(self, href, type=None, media=None):
        if type is None:
            type = "text/css"
        self.links.append(
            {
                "href": self.builder.get_static_url(href),
                "type": type,
                "media": media,
                "rel": "stylesheet",
            }
        )

    def run(self):
        before_file_processed.send(self)
        if self.needs_build:
            self.build()

    def build(self):
        before_file_built.send(self)
        self.program.run()


class BuildError(ValueError):
    pass


class Builder(object):
    default_ignores = (
        ".*",
        "_*",
        "config.yml",
        "Makefile",
        "README",
        "*.conf",
    )
    default_programs = {"*.rst": "rst"}
    default_template_path = "_templates"
    default_static_folder = "static"

    def __init__(self, project_folder, config):
        self.project_folder = os.path.abspath(project_folder)
        self.config = config
        self.programs = builtin_programs.copy()
        self.modules = []
        self.storage = {}
        self.url_map = Map()
        parsed = urlparse(self.config.root_get("canonical_url"))
        self.prefix_path = parsed.path
        self.url_adapter = self.url_map.bind(
            "dummy.invalid", script_name=self.prefix_path
        )
        self.register_url("page", "/<path:slug>")

        template_path = os.path.join(
            self.project_folder,
            self.config.root_get("template_path") or self.default_template_path,
        )
        self.locale = Locale(self.config.root_get("locale") or "en")
        self.jinja_env = Environment(
            loader=FileSystemLoader([template_path, builtin_templates]),
            autoescape=self.config.root_get("template_autoescape", True),
        )
        self.jinja_env.globals.update(
            link_to=self.link_to,
            format_datetime=self.format_datetime,
            format_date=self.format_date,
            format_time=self.format_time,
        )

        self.static_folder = (
            self.config.root_get("static_folder") or self.default_static_folder
        )

        for module in self.config.root_get("active_modules") or []:
            mod = find_module(module)
            mod.setup(self)
            self.modules.append(mod)

    @property
    def default_output_folder(self):
        return os.path.join(
            self.project_folder, self.config.root_get("output_folder") or OUTPUT_FOLDER
        )

    def link_to(self, _key, **values):
        return self.url_adapter.build(_key, values)

    def get_link_filename(self, _key, **values):
        link = url_unquote(self.link_to(_key, **values).lstrip("/"))
        if not link or link.endswith("/"):
            link += "index.html"
        return os.path.join(self.default_output_folder, link)

    def open_link_file(self, _key, mode="wb", **values):
        filename = self.get_link_filename(_key, **values)
        folder = os.path.dirname(filename)
        if not os.path.isdir(folder):
            os.makedirs(folder)
        return open(filename, mode)

    def register_url(
        self, key, rule=None, config_key=None, config_default=None, **extra
    ):
        if config_key is not None:
            rule = self.config.root_get(config_key, config_default)
        self.url_map.add(Rule(rule, endpoint=key, **extra))

    def get_full_static_filename(self, filename):
        return os.path.join(self.default_output_folder, self.static_folder, filename)

    def get_static_url(self, filename):
        return "/" + posixpath.join(self.static_folder, filename)

    def open_static_file(self, filename, mode="w"):
        full_filename = self.get_full_static_filename(filename)
        folder = os.path.dirname(full_filename)
        if not os.path.isdir(folder):
            os.makedirs(folder)
        return open(full_filename, mode)

    def get_storage(self, module):
        return self.storage.setdefault(module, {})

    def filter_files(self, files, config):
        patterns = config.merged_get("ignore_files")
        if patterns is None:
            patterns = self.default_ignores

        result = []
        for filename in files:
            for pattern in patterns:
                if fnmatch(filename, pattern):
                    break
            else:
                result.append(filename)
        return result

    def guess_program(self, config, filename):
        mapping = config.list_entries("programs") or self.default_programs
        for pattern, program_name in six.iteritems(mapping):
            if fnmatch(filename, pattern):
                return program_name
        return "copy"

    def render_template(self, template_name, context=None):
        if context is None:
            context = {}
        context["builder"] = self
        context.setdefault("config", self.config)
        tmpl = self.jinja_env.get_template(template_name)
        before_template_rendered.send(tmpl, context=context)
        return tmpl.render(context)

    def format_datetime(self, datetime=None, format="medium"):
        return dates.format_datetime(datetime, format, locale=self.locale)

    def format_time(self, time=None, format="medium"):
        return dates.format_time(time, format, locale=self.locale)

    def format_date(self, date=None, format="medium"):
        return dates.format_date(date, format, locale=self.locale)

    def iter_contexts(self, prepare=True):
        last_config = self.config
        cutoff = len(self.project_folder) + 1
        for dirpath, dirnames, filenames in os.walk(self.project_folder):
            local_config = last_config
            local_config_filename = os.path.join(dirpath, "config.yml")
            if os.path.isfile(local_config_filename):
                with open(local_config_filename) as f:
                    local_config = last_config.add_from_file(f)

            dirnames[:] = self.filter_files(dirnames, local_config)
            filenames = self.filter_files(filenames, local_config)

            for filename in filenames:
                yield Context(
                    self,
                    local_config,
                    os.path.join(dirpath[cutoff:], filename),
                    prepare,
                )

    def anything_needs_build(self):
        for context in self.iter_contexts(prepare=False):
            if context.needs_build:
                return True
        return False

    def run(self):
        self.storage.clear()
        contexts = list(self.iter_contexts())

        for context in contexts:
            if context.needs_build:
                key = context.is_new and "A" or "U"
                context.run()
                print(key, context.source_filename)

        before_build_finished.send(self)

    def debug_serve(self, host="0.0.0.0", port=5000):
        from rstblog.server import Server

        print("Serving on http://%s:%d/" % (host, port))
        try:
            Server(host, port, self).serve_forever()
        except KeyboardInterrupt:
            pass
