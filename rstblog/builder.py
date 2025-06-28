# -*- coding: utf-8 -*-
"""
rstblog.builder
~~~~~~~~~~~~~~~

The building components.

:copyright: (c) 2010 by Armin Ronacher.
:license: BSD, see LICENSE for more details.
"""

import re
import os
import posixpath
from fnmatch import fnmatch
from urllib.parse import urlparse

from docutils.core import publish_parts

from jinja2 import Environment, FileSystemLoader
from markupsafe import Markup

from babel import Locale, dates

from werkzeug.routing import Map, Rule
from urllib.parse import unquote as url_unquote

# Inline functionality - no more signals or modules
from datetime import datetime, date, timezone
from urllib.parse import urljoin
from math import log
from jinja2 import pass_context
from feedgen.feed import FeedGenerator

# Pygments imports
from docutils import nodes
from docutils.parsers.rst import Directive, directives, roles
from pygments import highlight
from pygments.lexers import get_lexer_by_name, TextLexer
from pygments.lexers.php import PhpLexer
from pygments.formatters import HtmlFormatter
from pygments.styles import get_style_by_name

# LaTeX imports
import tempfile
import shutil
from hashlib import sha1
from subprocess import Popen, PIPE
from markupsafe import escape
from docutils import utils

from rstblog.utils import Pagination
from rstblog.programs import RSTProgram, CopyProgram


OUTPUT_FOLDER = "_build"
builtin_programs = {"rst": RSTProgram, "copy": CopyProgram}
url_parts_re = re.compile(r"\$(\w+|{[^}]+})")

# Global variables for inlined functionality
html_formatter = None


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
            # Inline: after_file_prepared functionality
            self._after_file_prepared()
            if self.public:
                # Inline: after_file_published functionality
                self._after_file_published()

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
        # Inline: before_file_processed functionality
        self._before_file_processed()
        if self.needs_build:
            self.build()

    def _before_file_processed(self):
        """Inline functionality for before_file_processed signal"""
        pass  # Currently no functionality needed here

    def build(self):
        # Inline: before_file_built functionality
        self._before_file_built()
        self.program.run()

    def _after_file_prepared(self):
        """Inline functionality for after_file_prepared signal"""
        # Pygments: inject stylesheet
        self.add_stylesheet("_pygments.css")

    def _after_file_published(self):
        """Inline functionality for after_file_published signal"""
        # Blog: process blog entry
        self._process_blog_entry()
        # Tags: remember tags
        self._remember_tags()

    def _before_file_built(self):
        """Inline functionality for before_file_built signal"""
        pass  # Currently no functionality needed here

    def _process_blog_entry(self):
        """Process blog entry (from blog module)"""
        if self.pub_date is None:
            pattern = self.config.get(
                "modules.blog.pub_date_match", "/<int:year>/<int:month>/<int:day>/"
            )
            if pattern is not None:
                rv = test_pattern(self.slug, pattern)
                if rv is not None:
                    self.pub_date = datetime(*rv)

        if self.pub_date is not None:
            self.builder.get_storage("blog").setdefault(
                self.pub_date.year, {}
            ).setdefault(("0%d" % self.pub_date.month)[-2:], []).append(self)

    def _remember_tags(self):
        """Remember tags for this context (from tags module)"""
        tags = self.config.merged_get("tags") or []
        storage = self.builder.get_storage("tags")
        by_file = storage.setdefault("by_file", {})
        by_file[self.source_filename] = tags
        by_tag = storage.setdefault("by_tag", {})
        for tag in tags:
            by_tag.setdefault(tag, []).append(self)
        self.tags = frozenset(tags)


# === INLINED BLOG FUNCTIONALITY ===


class MonthArchive(object):
    def __init__(self, builder, year, month, entries):
        self.builder = builder
        self.year = year
        self.month = month
        self.entries = entries
        entries.sort(key=lambda x: x.pub_date, reverse=True)

    @property
    def month_name(self):
        return self.builder.format_date(
            date(int(self.year), int(self.month), 1), format="MMMM"
        )

    @property
    def count(self):
        return len(self.entries)


class YearArchive(object):
    def __init__(self, builder, year, months):
        self.year = year
        self.months = [
            MonthArchive(builder, year, month, entries)
            for month, entries in months.items()
        ]
        self.months.sort(key=lambda x: -int(x.month))
        self.count = sum(len(x.entries) for x in self.months)


def test_pattern(path, pattern):
    from werkzeug.routing import Rule, Map
    from werkzeug.exceptions import NotFound

    pattern = "/" + pattern.strip("/") + "/<path:extra>"
    adapter = Map([Rule(pattern)]).bind("dummy.invalid")
    try:
        endpoint, values = adapter.match(path.strip("/"))
    except NotFound:
        return
    return values["year"], values["month"], values["day"]


# === INLINED TAGS FUNCTIONALITY ===


class Tag(object):
    def __init__(self, name, count):
        self.name = name
        self.count = count
        self.size = 100 + log(count or 1) * 20


# === INLINED PYGMENTS FUNCTIONALITY ===


class CodeBlock(Directive):
    has_content = True
    required_arguments = 1
    optional_arguments = 0
    final_argument_whitespace = False

    def run(self):
        try:
            name = self.arguments[0]
            if name == "phpinline":
                lexer = PhpLexer(startinline=True)
            else:
                lexer = get_lexer_by_name(name)
        except ValueError:
            lexer = TextLexer()
        code = "\n".join(self.content)
        formatted = highlight(code, lexer, html_formatter)
        return [nodes.raw("", formatted, format="html")]


# === INLINED LATEX FUNCTIONALITY ===

DOC_WRAPPER = r"""
\documentclass[12pt]{article}
\usepackage[utf8x]{inputenc}
\usepackage{amsmath}
\usepackage{amsthm}
\usepackage{amssymb}
\usepackage{amsfonts}
%%\usepackage{mathpazo}
\usepackage{bm}
\usepackage[active]{preview}
\pagestyle{empty}
\begin{document}
\begin{preview}
%s
\end{preview}
\end{document}
"""

_depth_re = re.compile(rb"\[\d+ depth=(-?\d+)\]")


def wrap_displaymath(math):
    ret = []
    for part in math.split("\n\n"):
        ret.append("\\begin{split}%s\\end{split}\\notag" % part)
    return "\\begin{gather}\n" + "\\\\".join(ret) + "\n\\end{gather}"


def find_depth(stdout):
    for line in stdout.splitlines():
        m = _depth_re.match(line)
        if m:
            return int(m.group(1))


def render_math(context, math):
    relname = "_math/%s.png" % sha1(math.encode("utf-8")).hexdigest()
    full_filename = context.builder.get_full_static_filename(relname)
    url = context.builder.get_static_url(relname)

    if os.path.isfile(full_filename):
        os.remove(full_filename)

    latex = DOC_WRAPPER % wrap_displaymath(math)

    depth = None
    tempdir = tempfile.mkdtemp()
    try:
        tf = open(os.path.join(tempdir, "math.tex"), "wb")
        tf.write(latex.encode("utf-8"))
        tf.close()

        ltx_args = ["latex", "--interaction=nonstopmode", "math.tex"]

        curdir = os.getcwd()
        os.chdir(tempdir)

        try:
            p = Popen(ltx_args, stdout=PIPE, stderr=PIPE)
            stdout, stderr = p.communicate()
        finally:
            os.chdir(curdir)

        if p.returncode != 0:
            raise Exception(
                "latex exited with error:\n[stderr]\n%s\n"
                "[stdout]\n%s" % (stderr, stdout)
            )

        directory = os.path.dirname(full_filename)
        if not os.path.isdir(directory):
            os.makedirs(directory)
        dvipng_args = [
            "dvipng",
            "-o",
            full_filename,
            "-T",
            "tight",
            "-z9",
            "-D",
            str(
                int(
                    context.builder.config.root_get("modules.latex.font_size", 16)
                    * 72.27
                    / 10
                )
            ),
            "-bg",
            "Transparent",
            "--depth",
            os.path.join(tempdir, "math.dvi"),
        ]
        p = Popen(dvipng_args, stdout=PIPE, stderr=PIPE)
        stdout, stderr = p.communicate()
        if p.returncode != 0:
            raise Exception(
                "dvipng exited with error:\n[stderr]\n%s\n"
                "[stdout]\n%s" % (stderr, stdout)
            )
        depth = find_depth(stdout)
    finally:
        try:
            shutil.rmtree(tempdir)
        except (IOError, OSError):
            pass

    return url, depth


def make_imgtag(url, depth, latex):
    bits = ['<img src="%s" alt="%s"' % (escape(url), escape(latex))]
    if depth is not None:
        bits.append(' style="vertical-align: %dpx"' % -depth)
    bits.append(">")
    return "".join(bits)


class MathDirective(Directive):
    has_content = True
    required_arguments = 0
    optional_arguments = 1
    final_argument_whitespace = True
    option_spec = {"label": directives.unchanged, "nowrap": directives.flag}

    def run(self):
        latex = "\n".join(self.content)
        if self.arguments and self.arguments[0]:
            latex = self.arguments[0] + "\n\n" + latex
        url, _ = render_math(self.state.document.settings.rstblog_context, latex)
        return [
            nodes.raw(
                "",
                '<blockquote class="math">%s</blockquote>'
                % make_imgtag(url, None, latex),
                format="html",
            )
        ]


def math_role(role, rawtext, text, lineno, inliner, options={}, content=[]):
    latex = utils.unescape(text, restore_backslashes=True)
    url, depth = render_math(inliner.document.settings.rstblog_context, latex)
    return [
        nodes.raw(
            "",
            '<span class="math">%s</span>' % make_imgtag(url, depth, latex),
            format="html",
        )
    ], []


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
    default_template_path = "../templates"
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
            loader=FileSystemLoader([template_path]),
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

        # Inline setup - no more module loading
        self._setup_inline_functionality()

    def _setup_inline_functionality(self):
        """Setup all functionality that was previously in separate modules"""
        global html_formatter

        # Setup Pygments
        style = get_style_by_name(
            self.config.root_get("modules.pygments.style", "tango")
        )
        html_formatter = HtmlFormatter(style=style)
        directives.register_directive("code-block", CodeBlock)
        directives.register_directive("sourcecode", CodeBlock)

        # Setup LaTeX
        directives.register_directive("math", MathDirective)
        roles.register_local_role("math", math_role)

        # Setup Blog URLs
        self.register_url(
            "blog_index",
            config_key="modules.blog.index_url",
            config_default="/",
            defaults={"page": 1},
        )
        self.register_url(
            "blog_index",
            config_key="modules.blog.paged_index_url",
            config_default="/page/<page>/",
        )
        self.register_url(
            "blog_archive",
            config_key="modules.blog.archive_url",
            config_default="/archive/",
        )
        self.register_url(
            "blog_archive",
            config_key="modules.blog.year_archive_url",
            config_default="/<year>/",
        )
        self.register_url(
            "blog_archive",
            config_key="modules.blog.month_archive_url",
            config_default="/<year>/<month>/",
        )
        self.register_url(
            "blog_feed", config_key="modules.blog.feed_url", config_default="/feed.atom"
        )

        # Setup Tags URLs
        self.register_url(
            "tag", config_key="modules.tags.tag_url", config_default="/tags/<tag>/"
        )
        self.register_url(
            "tagfeed",
            config_key="modules.tags.tag_feed_url",
            config_default="/tags/<tag>/feed.atom",
        )
        self.register_url(
            "tagcloud", config_key="modules.tags.cloud_url", config_default="/tags/"
        )

        # Setup Jinja globals
        self.jinja_env.globals.update(
            get_recent_blog_entries=self._get_recent_blog_entries,
            get_tags=self._get_tags,
        )

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
        for pattern, program_name in mapping.items():
            if fnmatch(filename, pattern):
                return program_name
        return "copy"

    def render_template(self, template_name, context=None):
        if context is None:
            context = {}
        context["builder"] = self
        context.setdefault("config", self.config)
        tmpl = self.jinja_env.get_template(template_name)
        # Inline: before_template_rendered functionality
        self._before_template_rendered(tmpl, context)
        return tmpl.render(context)

    def _before_template_rendered(self, tmpl, context):
        """Inline functionality for before_template_rendered signal"""
        pass  # Currently no functionality needed here

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

        # Inline: before_build_finished functionality
        self._before_build_finished()

    def debug_serve(self, host="0.0.0.0", port=5000):
        from rstblog.server import Server

        print("Serving on http://%s:%d/" % (host, port))
        try:
            Server(host, port, self).serve_forever()
        except KeyboardInterrupt:
            pass

    def _before_build_finished(self):
        """Inline functionality for before_build_finished signal"""
        # Pygments: write stylesheet
        self._write_pygments_stylesheet()
        # Blog: write blog files
        self._write_blog_files()
        # Tags: write tag files
        self._write_tag_files()

    def _write_pygments_stylesheet(self):
        """Write Pygments CSS stylesheet"""
        with self.open_static_file("_pygments.css", "w") as f:
            f.write(html_formatter.get_style_defs())

    # === BLOG FUNCTIONALITY ===

    def _get_all_entries(self):
        """Returns all blog entries in reverse order"""
        result = []
        storage = self.get_storage("blog")
        years = list(storage.items())
        for year, months in years:
            for month, contexts in months.items():
                result.extend(contexts)
        result.sort(
            key=lambda x: (x.pub_date, x.config.get("day-order", 0)), reverse=True
        )
        return result

    def _get_archive_summary(self):
        """Returns a summary of the stuff in the archives."""
        storage = self.get_storage("blog")
        years = list(storage.items())
        years.sort(key=lambda x: -x[0])
        return [YearArchive(self, year, months) for year, months in years]

    @pass_context
    def _get_recent_blog_entries(self, context, limit=10):
        return self._get_all_entries()[:limit]

    def _write_index_page(self):
        use_pagination = self.config.root_get("modules.blog.use_pagination", True)
        per_page = self.config.root_get("modules.blog.per_page", 10)
        entries = self._get_all_entries()
        pagination = Pagination(self, entries, 1, per_page, "blog_index")
        while 1:
            with self.open_link_file("blog_index", page=pagination.page) as f:
                rv = self.render_template(
                    "blog/index.html",
                    {"pagination": pagination, "show_pagination": use_pagination},
                )
                f.write(rv.encode("utf-8") + b"\n")
                if not use_pagination or not pagination.has_next:
                    break
                pagination = pagination.get_next()

    def _write_archive_pages(self):
        archive = self._get_archive_summary()
        with self.open_link_file("blog_archive") as f:
            rv = self.render_template("blog/archive.html", {"archive": archive})
            f.write(rv.encode("utf-8") + b"\n")

        for entry in archive:
            with self.open_link_file("blog_archive", year=entry.year) as f:
                rv = self.render_template("blog/year_archive.html", {"entry": entry})
                f.write(rv.encode("utf-8") + b"\n")
            for subentry in entry.months:
                with self.open_link_file(
                    "blog_archive", year=entry.year, month=subentry.month
                ) as f:
                    rv = self.render_template(
                        "blog/month_archive.html", {"entry": subentry}
                    )
                    f.write(rv.encode("utf-8") + b"\n")

    def _write_feed(self):
        blog_author = self.config.root_get("author")
        url = self.config.root_get("canonical_url") or "http://localhost/"
        name = self.config.get("feed.name") or "Recent Blog Posts"
        subtitle = self.config.get("feed.subtitle") or "Recent blog posts"

        fg = FeedGenerator()
        fg.id(url)
        fg.title(name)
        fg.link(href=url, rel="alternate")
        fg.link(href=urljoin(url, self.link_to("blog_feed")), rel="self")
        fg.description(subtitle)
        fg.language("en")

        if blog_author:
            fg.author(name=blog_author)

        for entry in self._get_all_entries()[:10]:
            fe = fg.add_entry()
            fe.id(urljoin(url, entry.slug))
            fe.title(entry.title or "Untitled")
            fe.link(href=urljoin(url, entry.slug))
            fe.description(str(entry.render_contents()))
            if entry.pub_date:
                pub_date = entry.pub_date
                if pub_date.tzinfo is None:
                    pub_date = pub_date.replace(tzinfo=timezone.utc)
                fe.published(pub_date)
                fe.updated(pub_date)
            if blog_author:
                fe.author(name=blog_author)

        with self.open_link_file("blog_feed") as f:
            f.write(fg.atom_str(pretty=True))

    def _write_blog_files(self):
        self._write_index_page()
        self._write_archive_pages()
        self._write_feed()

    # === TAGS FUNCTIONALITY ===

    def _get_tag_summary(self):
        storage = self.get_storage("tags")
        by_tag = storage.get("by_tag", {})
        result = []
        for tag, tagged in by_tag.items():
            result.append(Tag(tag, len(tagged)))
        result.sort(key=lambda x: x.count)
        return result

    def _get_tagged_entries(self, tag):
        if isinstance(tag, Tag):
            tag = tag.name
        storage = self.get_storage("tags")
        by_tag = storage.get("by_tag", {})
        return by_tag.get(tag) or []

    @pass_context
    def _get_tags(self, context, limit=50):
        tags = self._get_tag_summary()
        if limit:
            tags.sort(key=lambda x: -x.count)
            tags = tags[:limit]
        tags.sort(key=lambda x: x.name.lower())
        return tags

    def _write_tagcloud_page(self):
        with self.open_link_file("tagcloud") as f:
            rv = self.render_template("tagcloud.html")
            f.write(rv.encode("utf-8") + b"\n")

    def _write_tag_feed(self, tag):
        blog_author = self.config.root_get("author")
        url = self.config.root_get("canonical_url") or "http://localhost/"
        name = f"{self.config.get('feed.name', 'Recent Blog Posts')} - {tag.name}"
        subtitle = f"Recent blog posts tagged with '{tag.name}'"

        fg = FeedGenerator()
        fg.id(urljoin(url, self.link_to("tagfeed", tag=tag.name)))
        fg.title(name)
        fg.link(href=url, rel="alternate")
        fg.link(href=urljoin(url, self.link_to("tagfeed", tag=tag.name)), rel="self")
        fg.description(subtitle)
        fg.language("en")

        if blog_author:
            fg.author(name=blog_author)

        for entry in self._get_tagged_entries(tag)[:10]:
            fe = fg.add_entry()
            fe.id(urljoin(url, entry.slug))
            fe.title(entry.title or "Untitled")
            fe.link(href=urljoin(url, entry.slug))
            fe.description(str(entry.render_contents()))
            if entry.pub_date:
                pub_date = entry.pub_date
                if pub_date.tzinfo is None:
                    pub_date = pub_date.replace(tzinfo=timezone.utc)
                fe.published(pub_date)
                fe.updated(pub_date)
            if blog_author:
                fe.author(name=blog_author)

        with self.open_link_file("tagfeed", tag=tag.name) as f:
            f.write(fg.atom_str(pretty=True))

    def _write_tag_page(self, tag):
        entries = self._get_tagged_entries(tag)
        entries.sort(key=lambda x: (x.title or "").lower())
        with self.open_link_file("tag", tag=tag.name) as f:
            rv = self.render_template("tag.html", {"tag": tag, "entries": entries})
            f.write(rv.encode("utf-8") + b"\n")

    def _write_tag_files(self):
        self._write_tagcloud_page()
        for tag in self._get_tag_summary():
            self._write_tag_page(tag)
            self._write_tag_feed(tag)
