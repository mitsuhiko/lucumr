# -*- coding: utf-8 -*-
"""
Simplified RST blog builder - no unnecessary abstractions.
"""

import os
import re
import shutil
from datetime import datetime, timezone
from collections import defaultdict
from fnmatch import fnmatch
from math import log, ceil
from http.server import HTTPServer, SimpleHTTPRequestHandler

from docutils.core import publish_parts
from docutils import nodes
from docutils.parsers.rst import Directive, directives
from pygments import highlight
from pygments.lexers import get_lexer_by_name, TextLexer, PhpLexer
from pygments.formatters import HtmlFormatter
from pygments.styles import get_style_by_name
from jinja2 import Environment, FileSystemLoader
from markupsafe import Markup

from generator.pagination import Pagination

# Configuration - all hardcoded values in one place
CONFIG = {
    "site_title": "Armin Ronacher's Thoughts and Writings",
    "site_url": "http://lucumr.pocoo.org/",
    "author": "Armin Ronacher",
    "subtitle": "Armin Ronacher's personal blog about programming, games and random thoughts that come to his mind.",
    "posts_per_page": 10,
    "ignore_patterns": (".*", "_*", "config.yml", "Makefile", "README", "*.conf"),
    "template_path": "../templates",
    "static_folder": "static",
    "output_folder": "_build",
    "pygments_style": "tango",
}

# Global Pygments formatter
html_formatter = None


class CodeBlock(Directive):
    """Pygments code highlighting directive."""

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


class BlogPost:
    """Represents a single blog post."""

    def __init__(self, source_path, content, builder):
        self.source_path = source_path
        self.builder = builder
        self.title = "Untitled"
        self.summary = None
        self.pub_date = None
        self.tags = []
        self.public = True

        # Parse content
        self._parse_content(content)

        # Extract date from path if not in frontmatter
        if self.pub_date is None:
            self._extract_date_from_path()

    def _parse_content(self, content):
        """Parse frontmatter and RST content."""
        lines = content.split("\n")
        frontmatter = {}
        content_start = 0

        # Simple frontmatter parsing
        for i, line in enumerate(lines):
            if not line.strip():
                content_start = i + 1
                break
            if ":" in line:
                key, value = line.split(":", 1)
                key = key.strip()
                value = value.strip()

                if key == "tags" and value.startswith("[") and value.endswith("]"):
                    # Parse tags: [tag1, tag2, tag3]
                    tags_str = value[1:-1]
                    tags = [tag.strip().strip("'\"") for tag in tags_str.split(",")]
                    frontmatter[key] = [tag for tag in tags if tag]
                elif key == "public":
                    frontmatter[key] = value.lower() == "yes"
                else:
                    frontmatter[key] = value

        # Apply frontmatter
        self.public = frontmatter.get("public", True)
        self.tags = frontmatter.get("tags", [])
        self.summary = frontmatter.get("summary")
        if "title" in frontmatter:
            self.title = frontmatter["title"]

        # Parse RST content for title if not in frontmatter
        rst_content = "\n".join(lines[content_start:])
        if "title" not in frontmatter:
            rst_parts = publish_parts(rst_content, writer_name="html4css1")
            if rst_parts["title"]:
                self.title = Markup(rst_parts["title"]).striptags()

        self.rst_content = rst_content

    def _extract_date_from_path(self):
        """Extract publication date from file path."""
        # New pattern: posts/YEAR/MONTH-DAY-SLUG.rst
        match = re.search(r"posts/(\d{4})/(\d{2})-(\d{2})-", self.source_path)
        if match:
            year, month, day = match.groups()
            self.pub_date = datetime(int(year), int(month), int(day))
        else:
            # Legacy pattern: YYYY/MM/DD/filename.rst (for backward compatibility)
            match = re.search(r"(\d{4})/(\d{1,2})/(\d{1,2})/", self.source_path)
            if match:
                year, month, day = match.groups()
                self.pub_date = datetime(int(year), int(month), int(day))

    @property
    def slug(self):
        """URL slug for this post."""
        if self.pub_date:
            basename = os.path.splitext(os.path.basename(self.source_path))[0]
            # For new format, extract slug from MONTH-DAY-SLUG pattern
            if "posts/" in self.source_path:
                match = re.search(r"\d{2}-\d{2}-(.+)$", basename)
                if match:
                    basename = match.group(1)
            return f"/{self.pub_date.year}/{self.pub_date.month:02d}/{self.pub_date.day:02d}/{basename}/"
        else:
            # Non-blog pages
            rel_path = os.path.splitext(self.source_path)[0]
            return f"/{rel_path}/"

    @property
    def output_path(self):
        """Output file path."""
        slug = self.slug.strip("/")
        if not slug:
            return os.path.join(CONFIG["output_folder"], "index.html")
        return os.path.join(CONFIG["output_folder"], slug, "index.html")

    def render_rst(self):
        """Render RST content to HTML."""
        settings = {
            "initial_header_level": 2,
        }
        parts = publish_parts(
            self.rst_content, writer_name="html4css1", settings_overrides=settings
        )
        return {
            "title": Markup(parts["title"]).striptags()
            if parts["title"]
            else self.title,
            "html_title": Markup(parts["html_title"]) if parts["html_title"] else "",
            "fragment": Markup(parts["fragment"]),
        }

    def render_summary(self):
        """Render summary as HTML."""
        if not self.summary:
            return ""
        parts = publish_parts(self.summary, writer_name="html4css1")
        return Markup(parts["fragment"])


class Builder:
    """Simplified blog builder without unnecessary abstractions."""

    def __init__(self, project_folder):
        self.project_folder = os.path.abspath(project_folder)
        self.posts = []
        self.pages = []
        self.tags = defaultdict(list)

        # Setup Jinja2
        template_path = os.path.join(self.project_folder, CONFIG["template_path"])
        self.jinja_env = Environment(
            loader=FileSystemLoader([template_path]), autoescape=True
        )
        self.jinja_env.globals.update(
            link_to=self._link_to,
            format_date=self._format_date,
            format_datetime=self._format_datetime,
            get_recent_blog_entries=self._get_recent_posts,
            get_tags=self._get_tags,
        )

        # Setup Pygments
        global html_formatter
        style = get_style_by_name(CONFIG["pygments_style"])
        html_formatter = HtmlFormatter(style=style)
        directives.register_directive("code-block", CodeBlock)
        directives.register_directive("sourcecode", CodeBlock)

    def _link_to(self, endpoint, **kwargs):
        """Simple URL building."""
        if endpoint == "page":
            return kwargs.get("slug", "/")
        elif endpoint == "blog_index":
            page = kwargs.get("page", 1)
            if page == 1:
                return "/"
            return f"/page/{page}/"
        elif endpoint == "blog_archive":
            year = kwargs.get("year")
            month = kwargs.get("month")
            if year and month:
                if isinstance(month, str):
                    return f"/{year}/{month}/"
                else:
                    return f"/{year}/{month:02d}/"
            elif year:
                return f"/{year}/"
            return "/archive/"
        elif endpoint == "blog_feed":
            return "/feed.atom"
        elif endpoint == "tag":
            tag = kwargs.get("tag", "")
            return f"/tags/{tag}/"
        elif endpoint == "tagfeed":
            tag = kwargs.get("tag", "")
            return f"/tags/{tag}/feed.atom"
        elif endpoint == "tagcloud":
            return "/tags/"
        return "/"

    def _format_date(self, date_obj=None, format="medium"):
        """Simple date formatting."""
        if date_obj is None:
            date_obj = datetime.now()
        if not date_obj:
            return ""
        if format == "YYYY":
            return str(date_obj.year)
        elif format == "full":
            return date_obj.strftime("%B %d, %Y")
        elif format == "long":
            return date_obj.strftime("%B %d, %Y")
        elif format == "medium":
            return date_obj.strftime("%b %d, %Y")
        else:
            return date_obj.strftime("%Y-%m-%d")

    def _format_datetime(self, dt, format="medium"):
        """Simple datetime formatting."""
        return self._format_date(dt, format)

    def _get_recent_posts(self, limit=10):
        """Get recent blog posts."""
        blog_posts = [p for p in self.posts if p.pub_date]
        blog_posts.sort(key=lambda x: x.pub_date, reverse=True)
        return blog_posts[:limit]

    def _get_tags(self, limit=50):
        """Get tag cloud data."""
        tags = []
        for tag_name, posts in self.tags.items():
            count = len(posts)
            size = 100 + log(count or 1) * 20
            tags.append({"name": tag_name, "count": count, "size": size})

        tags.sort(key=lambda x: -x["count"])
        if limit:
            tags = tags[:limit]
        tags.sort(key=lambda x: x["name"].lower())
        return tags

    def _should_ignore(self, path):
        """Check if path should be ignored."""
        basename = os.path.basename(path)
        for pattern in CONFIG["ignore_patterns"]:
            if fnmatch(basename, pattern):
                return True
        return False

    def scan_content(self):
        """Scan for content files."""
        self.posts = []
        self.pages = []
        self.tags = defaultdict(list)

        for root, dirs, files in os.walk(self.project_folder):
            # Filter directories
            dirs[:] = [d for d in dirs if not self._should_ignore(d)]

            for filename in files:
                if self._should_ignore(filename) or not filename.endswith(".rst"):
                    continue

                filepath = os.path.join(root, filename)
                rel_path = os.path.relpath(filepath, self.project_folder)

                # Read and parse file
                try:
                    with open(filepath, "r", encoding="utf-8") as f:
                        content = f.read()

                    post = BlogPost(rel_path, content, self)

                    if post.public:
                        if post.pub_date:
                            self.posts.append(post)
                            # Index by tags
                            for tag in post.tags:
                                self.tags[tag].append(post)
                        else:
                            self.pages.append(post)

                except Exception as e:
                    print(f"Error processing {rel_path}: {e}")

        # Sort posts by date
        self.posts.sort(key=lambda x: x.pub_date, reverse=True)

    def build_post(self, post):
        """Build a single post/page."""
        os.makedirs(os.path.dirname(post.output_path), exist_ok=True)

        rst_data = post.render_rst()
        context = {"rst": rst_data, "ctx": post, "slug": post.slug}

        html = self.jinja_env.get_template("rst_display.html").render(context)

        with open(post.output_path, "w", encoding="utf-8") as f:
            f.write(html)

    def build_index_pages(self):
        """Build blog index with pagination."""
        posts_per_page = CONFIG["posts_per_page"]
        total_posts = len(self.posts)
        total_pages = ceil(total_posts / posts_per_page)

        for page_num in range(1, total_pages + 1):
            pagination = Pagination(
                self, self.posts, page_num, posts_per_page, "blog_index"
            )

            context = {"pagination": pagination, "show_pagination": total_pages > 1}

            html = self.jinja_env.get_template("blog/index.html").render(context)

            if page_num == 1:
                output_path = os.path.join(
                    self.project_folder, CONFIG["output_folder"], "index.html"
                )
            else:
                output_path = os.path.join(
                    self.project_folder,
                    CONFIG["output_folder"],
                    "page",
                    str(page_num),
                    "index.html",
                )

            os.makedirs(os.path.dirname(output_path), exist_ok=True)
            with open(output_path, "w", encoding="utf-8") as f:
                f.write(html)

    def build_archive_pages(self):
        """Build archive pages."""
        # Group posts by year and month
        by_year = defaultdict(lambda: defaultdict(list))
        for post in self.posts:
            if post.pub_date:
                year = post.pub_date.year
                month = f"{post.pub_date.month:02d}"
                by_year[year][month].append(post)

        # Build main archive page
        years_data = []
        for year in sorted(by_year.keys(), reverse=True):
            months_data = []
            for month in sorted(by_year[year].keys(), reverse=True):
                month_posts = by_year[year][month]
                month_posts.sort(key=lambda x: x.pub_date, reverse=True)
                month_name = datetime(year, int(month), 1).strftime("%B")
                months_data.append(
                    {
                        "month": month,
                        "month_name": month_name,
                        "year": year,
                        "entries": month_posts,
                        "count": len(month_posts),
                    }
                )

            years_data.append(
                {
                    "year": year,
                    "months": months_data,
                    "count": sum(
                        len(month_data["entries"]) for month_data in months_data
                    ),
                }
            )

        # Main archive
        output_path = os.path.join(
            self.project_folder, CONFIG["output_folder"], "archive", "index.html"
        )
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        html = self.jinja_env.get_template("blog/archive.html").render(
            {"archive": years_data}
        )
        with open(output_path, "w", encoding="utf-8") as f:
            f.write(html)

        # Year archives
        for year_data in years_data:
            output_path = os.path.join(
                self.project_folder,
                CONFIG["output_folder"],
                str(year_data["year"]),
                "index.html",
            )
            os.makedirs(os.path.dirname(output_path), exist_ok=True)
            html = self.jinja_env.get_template("blog/year_archive.html").render(
                {"entry": year_data}
            )
            with open(output_path, "w", encoding="utf-8") as f:
                f.write(html)

            # Month archives
            for month_data in year_data["months"]:
                output_path = os.path.join(
                    self.project_folder,
                    CONFIG["output_folder"],
                    str(year_data["year"]),
                    month_data["month"],
                    "index.html",
                )
                os.makedirs(os.path.dirname(output_path), exist_ok=True)
                html = self.jinja_env.get_template("blog/month_archive.html").render(
                    {"entry": month_data}
                )
                with open(output_path, "w", encoding="utf-8") as f:
                    f.write(html)

    def build_tag_pages(self):
        """Build tag pages and tag cloud."""
        # Tag cloud
        output_path = os.path.join(
            self.project_folder, CONFIG["output_folder"], "tags", "index.html"
        )
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        html = self.jinja_env.get_template("tagcloud.html").render()
        with open(output_path, "w", encoding="utf-8") as f:
            f.write(html)

        # Individual tag pages
        for tag_name, tag_posts in self.tags.items():
            tag_posts.sort(key=lambda x: (x.title or "").lower())
            tag_data = {"name": tag_name, "count": len(tag_posts)}

            # Tag page
            output_path = os.path.join(
                self.project_folder,
                CONFIG["output_folder"],
                "tags",
                tag_name,
                "index.html",
            )
            os.makedirs(os.path.dirname(output_path), exist_ok=True)
            html = self.jinja_env.get_template("tag.html").render(
                {"tag": tag_data, "entries": tag_posts}
            )
            with open(output_path, "w", encoding="utf-8") as f:
                f.write(html)

            # Tag feed
            self._build_tag_feed(tag_name, tag_posts)

    def build_feeds(self):
        """Build Atom feeds."""
        # Main feed
        recent_posts = self.posts[:10]
        feed_xml = self._generate_atom_feed(
            title=CONFIG["site_title"],
            feed_url=CONFIG["site_url"] + "feed.atom",
            site_url=CONFIG["site_url"],
            subtitle=CONFIG["subtitle"],
            posts=recent_posts,
        )

        output_path = os.path.join(
            self.project_folder, CONFIG["output_folder"], "feed.atom"
        )
        with open(output_path, "w", encoding="utf-8") as f:
            f.write(feed_xml)

    def _build_tag_feed(self, tag_name, tag_posts):
        """Build feed for a specific tag."""
        recent_posts = sorted(
            tag_posts, key=lambda x: x.pub_date or datetime.min, reverse=True
        )[:10]
        feed_xml = self._generate_atom_feed(
            title=f"{CONFIG['site_title']} - {tag_name}",
            feed_url=CONFIG["site_url"] + f"tags/{tag_name}/feed.atom",
            site_url=CONFIG["site_url"],
            subtitle=f"Recent blog posts tagged with '{tag_name}'",
            posts=recent_posts,
        )

        output_path = os.path.join(
            self.project_folder, CONFIG["output_folder"], "tags", tag_name, "feed.atom"
        )
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        with open(output_path, "w", encoding="utf-8") as f:
            f.write(feed_xml)

    def _generate_atom_feed(self, title, feed_url, site_url, subtitle, posts):
        """Generate Atom feed XML."""
        now = datetime.now(timezone.utc).isoformat()

        entries = []
        for post in posts:
            if not post.pub_date:
                continue

            post_url = site_url.rstrip("/") + post.slug
            pub_date = post.pub_date.replace(tzinfo=timezone.utc).isoformat()
            content = str(post.render_rst()["fragment"])

            entry_xml = f'''  <entry>
    <id>{post_url}</id>
    <title>{post.title or "Untitled"}</title>
    <link href="{post_url}" />
    <published>{pub_date}</published>
    <updated>{pub_date}</updated>
    <author>
      <name>{CONFIG["author"]}</name>
    </author>
    <content type="html"><![CDATA[{content}]]></content>
  </entry>'''
            entries.append(entry_xml)

        feed_xml = f'''<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <id>{feed_url}</id>
  <title>{title}</title>
  <link href="{site_url}" />
  <link href="{feed_url}" rel="self" />
  <description>{subtitle}</description>
  <language>en</language>
  <updated>{now}</updated>
  <author>
    <name>{CONFIG["author"]}</name>
  </author>
{chr(10).join(entries)}
</feed>'''
        return feed_xml

    def copy_static_files(self):
        """Copy static files to output directory."""
        static_src = os.path.join(self.project_folder, CONFIG["static_folder"])
        static_dst = os.path.join(
            self.project_folder, CONFIG["output_folder"], CONFIG["static_folder"]
        )

        if os.path.exists(static_src):
            if os.path.exists(static_dst):
                shutil.rmtree(static_dst)
            shutil.copytree(static_src, static_dst)

    def write_pygments_css(self):
        """Write Pygments stylesheet."""
        css_path = os.path.join(
            self.project_folder,
            CONFIG["output_folder"],
            CONFIG["static_folder"],
            "_pygments.css",
        )
        os.makedirs(os.path.dirname(css_path), exist_ok=True)
        with open(css_path, "w") as f:
            f.write(html_formatter.get_style_defs())

    def build(self):
        """Build the entire site."""
        print("Scanning content...")
        self.scan_content()

        output_dir = os.path.join(self.project_folder, CONFIG["output_folder"])
        if os.path.exists(output_dir):
            shutil.rmtree(output_dir)
        os.makedirs(output_dir)

        print(f"Building {len(self.posts)} posts and {len(self.pages)} pages...")

        # Build individual posts and pages
        for post in self.posts + self.pages:
            self.build_post(post)
            print(f"Built {post.source_path}")

        # Build index pages
        print("Building index pages...")
        self.build_index_pages()

        # Build archive pages
        print("Building archive pages...")
        self.build_archive_pages()

        # Build tag pages
        print("Building tag pages...")
        self.build_tag_pages()

        # Build feeds
        print("Building feeds...")
        self.build_feeds()

        # Copy static files
        print("Copying static files...")
        self.copy_static_files()

        # Write Pygments CSS
        self.write_pygments_css()

        print("Build complete!")

    def serve(self, host="0.0.0.0", port=5000):
        """Simple development server."""
        output_dir = os.path.join(self.project_folder, CONFIG["output_folder"])

        # Build if needed
        if not os.path.exists(output_dir):
            print("Building before serving...")
            self.build()

        builder = self

        class Handler(SimpleHTTPRequestHandler):
            def do_GET(self):
                # Simple change detection - rebuild if any .rst file is newer
                if builder._needs_rebuild():
                    print("Detected changes, rebuilding...")
                    builder.build()
                super().do_GET()

            def log_message(self, format, *args):
                pass  # Disable logging

        # Serve from output directory
        original_cwd = os.getcwd()
        try:
            os.chdir(output_dir)
            print(f"Serving on http://{host}:{port}/")
            HTTPServer((host, port), Handler).serve_forever()
        except KeyboardInterrupt:
            pass
        finally:
            os.chdir(original_cwd)

    def _needs_rebuild(self):
        """Simple check if any RST files have changed."""
        output_dir = os.path.join(self.project_folder, CONFIG["output_folder"])
        if not os.path.exists(output_dir):
            return True

        build_time = os.path.getmtime(output_dir)

        for root, dirs, files in os.walk(self.project_folder):
            dirs[:] = [d for d in dirs if not self._should_ignore(d)]
            for filename in files:
                if filename.endswith(".rst") and not self._should_ignore(filename):
                    filepath = os.path.join(root, filename)
                    if os.path.getmtime(filepath) > build_time:
                        return True
        return False
