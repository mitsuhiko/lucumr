import os
import re
import shutil
import json
import hashlib
from datetime import datetime, timezone
from collections import defaultdict
from fnmatch import fnmatch
from math import log, ceil
from pathlib import Path

from jinja2 import Environment, FileSystemLoader

from generator.pagination import Pagination
from generator.config import CONFIG
from generator import markup


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

        # Determine file type
        self.file_type = "markdown" if source_path.endswith(".md") else "rst"

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

        # Parse content for title if not in frontmatter
        self.content = "\n".join(lines[content_start:])
        if "title" not in frontmatter:
            extracted_title = markup.extract_title_from_content(
                self.content, self.file_type
            )
            if extracted_title:
                self.title = extracted_title

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
            basename = Path(self.source_path).stem
            # For new format, extract slug from MONTH-DAY-SLUG pattern
            if "posts/" in self.source_path:
                match = re.search(r"\d{2}-\d{2}-(.+)$", basename)
                if match:
                    basename = match.group(1)
            return f"/{self.pub_date.year}/{self.pub_date.month:02d}/{self.pub_date.day:02d}/{basename}/"
        else:
            # Non-blog pages
            rel_path = Path(self.source_path).with_suffix("").as_posix()
            return f"/{rel_path}/"

    @property
    def output_path(self):
        """Output file path."""
        slug = self.slug.strip("/")
        if not slug:
            return str(Path(CONFIG["output_folder"]) / "index.html")
        return str(Path(CONFIG["output_folder"]) / slug / "index.html")

    def render_rst(self):
        """Render RST content to HTML."""
        result = markup.render_rst(self.content)
        # Use self.title as fallback if no title extracted
        if not result["title"]:
            result["title"] = self.title
        return result

    def render_markdown(self):
        """Render Markdown content to HTML."""
        return markup.render_markdown(self.content, self.title)

    def render_content(self):
        """Render content based on file type."""
        return markup.render_content(self.content, self.file_type, self.title)

    def render_summary(self):
        """Render summary as HTML."""
        return markup.render_summary(self.summary)

    def to_metadata(self):
        """Extract metadata for caching (without complex objects)."""
        return {
            "title": self.title,
            "summary": self.summary,
            "pub_date": self.pub_date.isoformat() if self.pub_date else None,
            "tags": self.tags,
            "public": self.public,
            "file_type": self.file_type,
            "content": self.content,
        }

    @classmethod
    def from_metadata(cls, source_path, metadata, builder, content):
        """Create BlogPost from cached metadata, re-parsing content."""
        post = cls.__new__(cls)
        post.source_path = source_path
        post.builder = builder
        post.title = metadata["title"]
        post.summary = metadata["summary"]
        post.pub_date = (
            datetime.fromisoformat(metadata["pub_date"])
            if metadata["pub_date"]
            else None
        )
        post.tags = metadata["tags"]
        post.public = metadata["public"]
        post.file_type = metadata["file_type"]

        # Re-parse content to extract body (skip header)
        post._parse_content(content)
        return post


class ContentCache:
    """Simplified content cache with reduced complexity."""

    def __init__(self, project_folder):
        self.project_folder = project_folder
        self.cache_file = (
            self.project_folder / ".generator_cache" / "content_cache.json"
        )
        self.cache_file.parent.mkdir(exist_ok=True)
        self.cache = self._load_cache()

    def _load_cache(self):
        """Load cache from disk."""
        try:
            return (
                json.loads(self.cache_file.read_text())
                if self.cache_file.exists()
                else {}
            )
        except (json.JSONDecodeError, OSError):
            return {}

    def get_cached_metadata(self, filepath, content):
        """Get cached metadata if content unchanged, None if needs parsing."""
        content_hash = hashlib.sha256(content.encode()).hexdigest()
        cached_entry = self.cache.get(filepath, {})

        if cached_entry.get("content_hash") == content_hash:
            return cached_entry.get("metadata")
        return None

    def cache_metadata(self, filepath, content, metadata):
        """Cache parsed metadata without storing content."""
        content_hash = hashlib.sha256(content.encode()).hexdigest()
        # Don't store content in cache - we'll re-parse it when loading
        clean_metadata = {k: v for k, v in metadata.items() if k != "content"}
        self.cache[filepath] = {
            "content_hash": content_hash,
            "metadata": clean_metadata,
        }

    def cleanup_deleted_files(self, existing_files):
        """Remove cache entries for files that no longer exist."""
        deleted = set(self.cache.keys()) - existing_files
        for filepath in deleted:
            self.cache.pop(filepath, None)
        return deleted

    def save(self):
        """Save cache to disk."""
        try:
            self.cache_file.write_text(json.dumps(self.cache, indent=2, default=str))
        except OSError as e:
            print(f"Warning: Could not save cache: {e}")


class Builder:
    """Simplified blog builder without unnecessary abstractions."""

    def __init__(self, project_folder=None):
        if project_folder is None:
            project_folder = os.getcwd()
        project_folder = Path(project_folder).resolve()
        self.project_folder = project_folder
        self.output_folder = project_folder / CONFIG["output_folder"]
        self.posts = []
        self.pages = []
        self.tags = defaultdict(list)
        self.content_cache = ContentCache(project_folder)
        template_path = Path(__file__).parent / "templates"
        self.jinja_env = Environment(
            loader=FileSystemLoader([str(template_path)]), autoescape=True
        )
        self.jinja_env.globals.update(
            link_to=self._link_to,
            format_date=self._format_date,
            get_recent_blog_entries=self._get_recent_posts,
            get_tags=self._get_tags,
        )

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
        elif format in ("full", "long"):
            return date_obj.strftime("%B %d, %Y")
        elif format == "medium":
            return date_obj.strftime("%b %d, %Y")

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

    def should_ignore(self, path):
        """Check if path should be ignored."""
        path_obj = Path(path)
        try:
            relative_path = path_obj.relative_to(self.project_folder)
        except ValueError:
            return True
        for part in relative_path.parts:
            for pattern in CONFIG["ignore_patterns"]:
                if fnmatch(part, pattern):
                    return True
        return False

    def scan_content(self):
        """Scan for content files with caching for unchanged files."""
        # Track existing files for deletion detection
        existing_files = set()

        # Reset collections
        self.posts = []
        self.pages = []
        self.tags = defaultdict(list)

        # Rebuild from cache and parse new/modified files
        for filepath in self.project_folder.rglob("*"):
            if (
                filepath.is_file()
                and not self.should_ignore(filepath.name)
                and (filepath.suffix in (".rst", ".md"))
            ):
                rel_path = filepath.relative_to(self.project_folder)
                existing_files.add(str(rel_path))

                try:
                    content = filepath.read_text(encoding="utf-8")
                    cached_metadata = self.content_cache.get_cached_metadata(
                        str(rel_path), content
                    )

                    if cached_metadata:
                        post = BlogPost.from_metadata(
                            str(rel_path), cached_metadata, self, content
                        )
                    else:
                        post = BlogPost(str(rel_path), content, self)
                        self.content_cache.cache_metadata(
                            str(rel_path), content, post.to_metadata()
                        )

                    if post.public:
                        if post.pub_date:
                            self.posts.append(post)
                            for tag in post.tags:
                                self.tags[tag].append(post)
                        else:
                            self.pages.append(post)

                except Exception as e:
                    print(f"Error processing {rel_path}: {e}")

        deleted_files = self.content_cache.cleanup_deleted_files(existing_files)
        if deleted_files:
            print(f"Removed {len(deleted_files)} deleted files from cache")

        self.posts.sort(key=lambda x: x.pub_date, reverse=True)
        self.content_cache.save()

    def build_post(self, post):
        """Build a single post/page."""
        Path(post.output_path).parent.mkdir(parents=True, exist_ok=True)

        content_data = post.render_content()
        context = {"content": content_data, "ctx": post, "slug": post.slug}

        template_name = (
            "markdown_display.html"
            if post.file_type == "markdown"
            else "rst_display.html"
        )
        html = self.jinja_env.get_template(template_name).render(context)

        Path(post.output_path).write_text(html, encoding="utf-8")

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
                output_path = self.output_folder / "index.html"
            else:
                output_path = self.output_folder / "page" / str(page_num) / "index.html"

            output_path.parent.mkdir(parents=True, exist_ok=True)
            output_path.write_text(html, encoding="utf-8")

    def build_archive_pages(self):
        """Build archive pages."""
        # Group posts by year and month
        by_year = defaultdict(lambda: defaultdict(list))
        for post in self.posts:
            if post.pub_date:
                year = post.pub_date.year
                month = f"{post.pub_date.month:02d}"
                by_year[year][month].append(post)

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
        output_path = self.output_folder / "archive" / "index.html"
        output_path.parent.mkdir(parents=True, exist_ok=True)
        html = self.jinja_env.get_template("blog/archive.html").render(
            {"archive": years_data}
        )
        output_path.write_text(html, encoding="utf-8")

        # Year archives
        for year_data in years_data:
            output_path = self.output_folder / str(year_data["year"]) / "index.html"
            output_path.parent.mkdir(parents=True, exist_ok=True)
            html = self.jinja_env.get_template("blog/year_archive.html").render(
                {"entry": year_data}
            )
            output_path.write_text(html, encoding="utf-8")

            # Month archives
            for month_data in year_data["months"]:
                output_path = (
                    self.output_folder
                    / str(year_data["year"])
                    / month_data["month"]
                    / "index.html"
                )
                output_path.parent.mkdir(parents=True, exist_ok=True)
                html = self.jinja_env.get_template("blog/month_archive.html").render(
                    {"entry": month_data}
                )
                output_path.write_text(html, encoding="utf-8")

    def build_tag_pages(self):
        """Build tag pages and tag cloud."""
        output_path = self.output_folder / "tags" / "index.html"
        output_path.parent.mkdir(parents=True, exist_ok=True)
        html = self.jinja_env.get_template("tagcloud.html").render()
        output_path.write_text(html, encoding="utf-8")

        # Individual tag pages
        for tag_name, tag_posts in self.tags.items():
            tag_posts.sort(key=lambda x: (x.title or "").lower())
            tag_data = {"name": tag_name, "count": len(tag_posts)}

            # Tag page
            output_path = self.output_folder / "tags" / tag_name / "index.html"
            output_path.parent.mkdir(parents=True, exist_ok=True)
            html = self.jinja_env.get_template("tag.html").render(
                {"tag": tag_data, "entries": tag_posts}
            )
            output_path.write_text(html, encoding="utf-8")

            # Tag feed
            self._build_tag_feed(tag_name, tag_posts)

    def build_feeds(self):
        """Build Atom feeds."""
        # Main feed
        recent_posts = self.posts[:10]
        feed_xml = self._generate_atom_feed(
            title=CONFIG["site_title"],
            feed_url=CONFIG["site_url"] + "feed.atom",
            subtitle=CONFIG["subtitle"],
            posts=recent_posts,
        )

        output_path = self.output_folder / "feed.atom"
        output_path.write_text(feed_xml, encoding="utf-8")

    def _build_tag_feed(self, tag_name, tag_posts):
        """Build feed for a specific tag."""
        recent_posts = sorted(
            tag_posts, key=lambda x: x.pub_date or datetime.min, reverse=True
        )[:10]
        feed_xml = self._generate_atom_feed(
            title=f"{CONFIG['site_title']} - {tag_name}",
            feed_url=CONFIG["site_url"] + f"tags/{tag_name}/feed.atom",
            subtitle=f"Recent blog posts tagged with '{tag_name}'",
            posts=recent_posts,
        )

        output_path = self.output_folder / "tags" / tag_name / "feed.atom"
        output_path.parent.mkdir(parents=True, exist_ok=True)
        output_path.write_text(feed_xml, encoding="utf-8")

    def _generate_atom_feed(self, title, feed_url, subtitle, posts):
        """Generate Atom feed XML."""
        now = datetime.now(timezone.utc).isoformat()

        entries = []
        for post in posts:
            if not post.pub_date:
                continue

            post_url = CONFIG["site_url"].rstrip("/") + post.slug
            pub_date = post.pub_date.replace(tzinfo=timezone.utc).isoformat()
            content = str(post.render_content()["fragment"])

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
  <link href="{CONFIG["site_url"]}" />
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
        static_src = self.project_folder / CONFIG["static_folder"]
        static_dst = self.output_folder / CONFIG["static_folder"]

        if not static_src.exists():
            return

        static_dst.mkdir(parents=True, exist_ok=True)
        for src_file in static_src.rglob("*"):
            if src_file.is_file():
                rel_path = src_file.relative_to(static_src)
                dst_file = static_dst / rel_path
                dst_file.parent.mkdir(parents=True, exist_ok=True)

                # Copy if destination doesn't exist or source is newer
                if (
                    not dst_file.exists()
                    or src_file.stat().st_mtime > dst_file.stat().st_mtime
                ):
                    shutil.copy2(src_file, dst_file)
                    print(f"Updated {rel_path}")

    def write_pygments_css(self):
        """Write Pygments stylesheet."""
        css_path = self.output_folder / CONFIG["static_folder"] / "_pygments.css"
        css_path.parent.mkdir(parents=True, exist_ok=True)
        css_path.write_text(markup.get_pygments_css())

    def build(self):
        """Build the site."""
        self.scan_content()

        content_changed = False
        for post in self.posts + self.pages:
            output_path = Path(post.output_path)
            source_path = Path(post.source_path)
            if (
                not output_path.exists()
                or source_path.stat().st_mtime > output_path.stat().st_mtime
            ):
                self.build_post(post)
                print(f"Rebuilt {post.source_path}")
                content_changed = True

        if content_changed:
            print("Building index pages...")
            self.build_index_pages()

            print("Building archive pages...")
            self.build_archive_pages()

            print("Building tag pages...")
            self.build_tag_pages()

            print("Building feeds...")
            self.build_feeds()

        self.copy_static_files()
        self.write_pygments_css()
