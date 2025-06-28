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


from rstblog.utils import Pagination
import yaml
import shutil
from datetime import datetime
from io import StringIO


OUTPUT_FOLDER = "_build"
url_parts_re = re.compile(r"\$(\w+|{[^}]+})")

# Global variables for inlined functionality
html_formatter = None


class Context(object):
    """Per rendering information"""

    def __init__(self, builder, source_filename, prepare=False):
        self.builder = builder
        self.title = "Untitled"
        self.summary = None
        self.pub_date = None
        self.source_filename = source_filename
        self.links = []
        # No config - always guess program from filename
        self.program_name = self.builder.guess_program(source_filename)
        # Inline program logic
        self._fragment_cache = None  # For RST files
        self.destination_filename = os.path.join(
            self.builder.prefix_path.lstrip("/"), self._get_desired_filename()
        )
        if prepare:
            self._prepare()
            # Inline: after_file_prepared functionality
            self._after_file_prepared()
            if self.public:
                # Inline: after_file_published functionality
                self._after_file_published()

    def _get_desired_filename(self):
        """Inline get_desired_filename logic from programs"""
        if self.program_name == "copy":
            # CopyProgram logic
            return self.source_filename
        else:
            # RSTProgram logic (default)
            folder, basename = os.path.split(self.source_filename)
            simple_name = os.path.splitext(basename)[0]
            if simple_name == "index":
                suffix = "index.html"
            else:
                suffix = os.path.join(simple_name, "index.html")
            return os.path.join(folder, suffix)

    def _prepare(self):
        """Inline prepare logic from programs"""
        if self.program_name == "copy":
            # CopyProgram has no prepare logic
            pass
        else:
            # RSTProgram prepare logic
            headers = ["---"]
            with self.open_source_file() as f:
                for line in f:
                    line = line.rstrip().decode("utf-8")
                    if not line:
                        break
                    headers.append(line)
                title = self._parse_text_title(f)

            # Parse frontmatter without config system
            cfg = yaml.safe_load(StringIO("\n".join(headers)))
            if cfg:
                if not isinstance(cfg, dict):
                    raise ValueError(
                        'expected dict config in file "%s", got: %.40r'
                        % (self.source_filename, cfg)
                    )

                # Handle destination filename override
                self.destination_filename = cfg.get(
                    "destination_filename", self.destination_filename
                )

                # Handle title override
                title_override = cfg.get("title")
                if title_override is not None:
                    title = title_override

                # Handle pub_date override
                pub_date_override = cfg.get("pub_date")
                if pub_date_override is not None:
                    if not isinstance(pub_date_override, datetime):
                        pub_date_override = datetime(
                            pub_date_override.year,
                            pub_date_override.month,
                            pub_date_override.day,
                        )
                    self.pub_date = pub_date_override

                # Handle summary override
                summary_override = cfg.get("summary")
                if summary_override is not None:
                    self.summary = summary_override

            if title is not None:
                self.title = title

    def _parse_text_title(self, f):
        """Parse title from RST content"""
        buffer = []
        for line in f:
            line = line.rstrip()
            if not line:
                break
            buffer.append(line)
        return self.render_rst(b"\n".join(buffer).decode("utf-8")).get("title")

    def _get_fragments(self):
        """Get RST fragments with caching"""
        if self._fragment_cache is not None:
            return self._fragment_cache
        with self.open_source_file() as f:
            while f.readline().strip():
                pass
            rv = self.render_rst(f.read().decode("utf-8"))
        self._fragment_cache = rv
        return rv

    def _get_template_context(self):
        """Get template context for rendering"""
        ctx = {}
        if self.program_name != "copy":
            # RSTProgram template context logic
            ctx["rst"] = self._get_fragments()
        return ctx

    @property
    def is_new(self):
        return not os.path.exists(self.full_destination_filename)

    @property
    def public(self):
        # Extract public flag from frontmatter
        return self._extract_public_from_file()

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
            OUTPUT_FOLDER,  # Hardcoded output folder
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
            "slug": "/" + self.slug.lstrip("/"),
        }

    def render_template(self, template_name, context=None):
        real_context = self.get_default_template_context()
        if context:
            real_context.update(context)
        return self.builder.render_template(template_name, real_context)

    def render_rst(self, contents):
        settings = {
            "initial_header_level": 2,  # Hardcoded header level
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
        """Inline render_contents logic from programs"""
        if self.program_name == "copy":
            # CopyProgram has no render_contents (returns empty string)
            return ""
        else:
            # RSTProgram render_contents logic
            return self._get_fragments()["fragment"]

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
        if self.needs_build:
            self.build()

    def build(self):
        """Inline program.run() logic"""
        if self.program_name == "copy":
            # CopyProgram run logic
            self.make_destination_folder()
            shutil.copy(self.full_source_filename, self.full_destination_filename)
        else:
            # TemplatedProgram/RSTProgram run logic
            frontmatter = self._extract_frontmatter()
            template_name = frontmatter.get(
                "template", "rst_display.html"
            )  # RSTProgram default
            context = self._get_template_context()
            rv = self.render_template(template_name, context)
            with self.open_destination_file() as f:
                f.write(rv.encode("utf-8") + b"\n")

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

    def _process_blog_entry(self):
        """Process blog entry (from blog module)"""
        if self.pub_date is None:
            # Hardcoded pattern since config doesn't override it
            rv = test_pattern(self.slug, "/<int:year>/<int:month>/<int:day>/")
            if rv is not None:
                self.pub_date = datetime(*rv)

        if self.pub_date is not None:
            self.builder.get_storage("blog").setdefault(
                self.pub_date.year, {}
            ).setdefault(("0%d" % self.pub_date.month)[-2:], []).append(self)

    def _remember_tags(self):
        """Remember tags for this context (from tags module)"""
        # Extract tags from frontmatter in RST files
        tags = self._extract_tags_from_file()
        storage = self.builder.get_storage("tags")
        by_file = storage.setdefault("by_file", {})
        by_file[self.source_filename] = tags
        by_tag = storage.setdefault("by_tag", {})
        for tag in tags:
            by_tag.setdefault(tag, []).append(self)
        self.tags = frozenset(tags)

    def _extract_frontmatter(self):
        """Extract frontmatter from RST file"""
        if hasattr(self, "_cached_frontmatter"):
            return self._cached_frontmatter

        try:
            with open(self.full_source_filename, "r", encoding="utf-8") as f:
                content = f.read()

            # Simple frontmatter parser
            lines = content.split("\n")
            frontmatter = {}
            for line in lines:
                if line.strip() == "":
                    break  # End of frontmatter
                if ":" in line:
                    key, value = line.split(":", 1)
                    key = key.strip()
                    value = value.strip()

                    if key == "tags" and value.startswith("[") and value.endswith("]"):
                        # Parse tags: [tag1, tag2, tag3]
                        tags_str = value[1:-1]  # Remove brackets
                        tags = [tag.strip() for tag in tags_str.split(",")]
                        tags = [tag.strip("'\"") for tag in tags]  # Remove quotes
                        frontmatter[key] = tags
                    elif key == "public":
                        frontmatter[key] = value.lower() == "yes"
                    else:
                        frontmatter[key] = value

            self._cached_frontmatter = frontmatter
            return frontmatter
        except Exception:
            self._cached_frontmatter = {}
            return {}

    def _extract_tags_from_file(self):
        """Extract tags from RST file frontmatter"""
        frontmatter = self._extract_frontmatter()
        return frontmatter.get("tags", [])

    def _extract_public_from_file(self):
        """Extract public flag from RST file frontmatter"""
        frontmatter = self._extract_frontmatter()
        return frontmatter.get("public", True)  # Default to public


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
    """Extract year/month/day from path using the hardcoded blog pattern"""
    from werkzeug.routing import Rule, Map
    from werkzeug.exceptions import NotFound

    # Since pattern is always "/<int:year>/<int:month>/<int:day>/", simplify
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

    def __init__(self, project_folder):
        self.project_folder = os.path.abspath(project_folder)
        self.storage = {}
        self.url_map = Map()
        # Hardcoded canonical URL
        parsed = urlparse("http://lucumr.pocoo.org/")
        self.prefix_path = parsed.path
        self.url_adapter = self.url_map.bind(
            "dummy.invalid", script_name=self.prefix_path
        )
        self.register_url("page", "/<path:slug>")

        # Hardcoded template path
        template_path = os.path.join(self.project_folder, self.default_template_path)
        # Hardcoded locale
        self.locale = Locale("en")
        self.jinja_env = Environment(
            loader=FileSystemLoader([template_path]),
            autoescape=True,  # Hardcoded autoescape
        )
        self.jinja_env.globals.update(
            link_to=self.link_to,
            format_datetime=self.format_datetime,
            format_date=self.format_date,
            format_time=self.format_time,
        )

        # Hardcoded static folder
        self.static_folder = self.default_static_folder

        # Inline setup - no more module loading
        self._setup_inline_functionality()

    def _setup_inline_functionality(self):
        """Setup all functionality that was previously in separate modules"""
        global html_formatter

        # Setup Pygments
        style = get_style_by_name("tango")  # Hardcoded from config
        html_formatter = HtmlFormatter(style=style)
        directives.register_directive("code-block", CodeBlock)
        directives.register_directive("sourcecode", CodeBlock)

        # Setup Blog URLs (hardcoded since no custom config)
        self.register_url("blog_index", "/", defaults={"page": 1})
        self.register_url("blog_index", "/page/<page>/")
        self.register_url("blog_archive", "/archive/")
        self.register_url("blog_archive", "/<year>/")
        self.register_url("blog_archive", "/<year>/<month>/")
        self.register_url("blog_feed", "/feed.atom")

        # Setup Tags URLs (hardcoded since no custom config)
        self.register_url("tag", "/tags/<tag>/")
        self.register_url("tagfeed", "/tags/<tag>/feed.atom")
        self.register_url("tagcloud", "/tags/")

        # Setup Jinja globals
        self.jinja_env.globals.update(
            get_recent_blog_entries=self._get_recent_blog_entries,
            get_tags=self._get_tags,
        )

    @property
    def default_output_folder(self):
        return os.path.join(self.project_folder, OUTPUT_FOLDER)

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

    def register_url(self, key, rule, **extra):
        """Register a URL rule - no config support"""
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

    def filter_files(self, files):
        """Filter files using hardcoded ignore patterns"""
        patterns = self.default_ignores  # Hardcoded ignore patterns

        result = []
        for filename in files:
            for pattern in patterns:
                if fnmatch(filename, pattern):
                    break
            else:
                result.append(filename)
        return result

    def guess_program(self, filename):
        """Guess program based on filename - hardcoded mapping"""
        mapping = self.default_programs  # {"*.rst": "rst"}
        for pattern, program_name in mapping.items():
            if fnmatch(filename, pattern):
                return program_name
        return "copy"

    def render_template(self, template_name, context=None):
        if context is None:
            context = {}
        context["builder"] = self
        tmpl = self.jinja_env.get_template(template_name)
        return tmpl.render(context)

    def format_datetime(self, datetime=None, format="medium"):
        return dates.format_datetime(datetime, format, locale=self.locale)

    def format_time(self, time=None, format="medium"):
        return dates.format_time(time, format, locale=self.locale)

    def format_date(self, date=None, format="medium"):
        return dates.format_date(date, format, locale=self.locale)

    def iter_contexts(self, prepare=True):
        cutoff = len(self.project_folder) + 1
        for dirpath, dirnames, filenames in os.walk(self.project_folder):
            # No config - use hardcoded filtering
            dirnames[:] = self.filter_files(dirnames)
            filenames = self.filter_files(filenames)

            for filename in filenames:
                yield Context(
                    self,
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
            key=lambda x: (x.pub_date, 0),
            reverse=True,  # No day-order config
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
        # Hardcoded defaults since config doesn't override them
        use_pagination = True
        per_page = 10
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
        # Hardcoded values
        blog_author = "Armin Ronacher"
        url = "http://lucumr.pocoo.org/"
        name = "Armin Ronacher's Thoughts and Writings"
        subtitle = "Armin Ronacher's personal blog about programming, games and random thoughts that come to his mind."

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
        # Hardcoded values
        blog_author = "Armin Ronacher"
        url = "http://lucumr.pocoo.org/"
        name = f"Armin Ronacher's Thoughts and Writings - {tag.name}"
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
