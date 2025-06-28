# -*- coding: utf-8 -*-
"""
rstblog.modules.blog
~~~~~~~~~~~~~~~~~~~~

The blog component.

:copyright: (c) 2010 by Armin Ronacher.
:license: BSD, see LICENSE for more details.
"""

from __future__ import with_statement

from __future__ import absolute_import
from datetime import datetime, date, timezone
from six.moves.urllib.parse import urljoin

from jinja2 import pass_context

from werkzeug.routing import Rule, Map
from werkzeug.exceptions import NotFound
from feedgen.feed import FeedGenerator

from rstblog.signals import after_file_published, before_build_finished
from rstblog.utils import Pagination
import six


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
            for month, entries in six.iteritems(months)
        ]
        self.months.sort(key=lambda x: -int(x.month))
        self.count = sum(len(x.entries) for x in self.months)


def test_pattern(path, pattern):
    pattern = "/" + pattern.strip("/") + "/<path:extra>"
    adapter = Map([Rule(pattern)]).bind("dummy.invalid")
    try:
        endpoint, values = adapter.match(path.strip("/"))
    except NotFound:
        return
    return values["year"], values["month"], values["day"]


def process_blog_entry(context):
    if context.pub_date is None:
        pattern = context.config.get(
            "modules.blog.pub_date_match", "/<int:year>/<int:month>/<int:day>/"
        )
        if pattern is not None:
            rv = test_pattern(context.slug, pattern)
            if rv is not None:
                context.pub_date = datetime(*rv)

    if context.pub_date is not None:
        context.builder.get_storage("blog").setdefault(
            context.pub_date.year, {}
        ).setdefault(("0%d" % context.pub_date.month)[-2:], []).append(context)


def get_all_entries(builder):
    """Returns all blog entries in reverse order"""
    result = []
    storage = builder.get_storage("blog")
    years = list(storage.items())
    for year, months in years:
        for month, contexts in six.iteritems(months):
            result.extend(contexts)
    result.sort(key=lambda x: (x.pub_date, x.config.get("day-order", 0)), reverse=True)
    return result


def get_archive_summary(builder):
    """Returns a summary of the stuff in the archives."""
    storage = builder.get_storage("blog")
    years = list(storage.items())
    years.sort(key=lambda x: -x[0])
    return [YearArchive(builder, year, months) for year, months in years]


@pass_context
def get_recent_blog_entries(context, limit=10):
    return get_all_entries(context["builder"])[:limit]


def write_index_page(builder):
    use_pagination = builder.config.root_get("modules.blog.use_pagination", True)
    per_page = builder.config.root_get("modules.blog.per_page", 10)
    entries = get_all_entries(builder)
    pagination = Pagination(builder, entries, 1, per_page, "blog_index")
    while 1:
        with builder.open_link_file("blog_index", page=pagination.page) as f:
            rv = builder.render_template(
                "blog/index.html",
                {"pagination": pagination, "show_pagination": use_pagination},
            )
            f.write(rv.encode("utf-8") + b"\n")
            if not use_pagination or not pagination.has_next:
                break
            pagination = pagination.get_next()


def write_archive_pages(builder):
    archive = get_archive_summary(builder)
    with builder.open_link_file("blog_archive") as f:
        rv = builder.render_template("blog/archive.html", {"archive": archive})
        f.write(rv.encode("utf-8") + b"\n")

    for entry in archive:
        with builder.open_link_file("blog_archive", year=entry.year) as f:
            rv = builder.render_template("blog/year_archive.html", {"entry": entry})
            f.write(rv.encode("utf-8") + b"\n")
        for subentry in entry.months:
            with builder.open_link_file(
                "blog_archive", year=entry.year, month=subentry.month
            ) as f:
                rv = builder.render_template(
                    "blog/month_archive.html", {"entry": subentry}
                )
                f.write(rv.encode("utf-8") + b"\n")


def write_feed(builder):
    blog_author = builder.config.root_get("author")
    url = builder.config.root_get("canonical_url") or "http://localhost/"
    name = builder.config.get("feed.name") or "Recent Blog Posts"
    subtitle = builder.config.get("feed.subtitle") or "Recent blog posts"

    # Create feed generator
    fg = FeedGenerator()
    fg.id(url)
    fg.title(name)
    fg.link(href=url, rel="alternate")
    fg.link(href=urljoin(url, builder.link_to("blog_feed")), rel="self")
    fg.description(subtitle)
    fg.language("en")

    if blog_author:
        fg.author(name=blog_author)

    # Add entries
    for entry in get_all_entries(builder)[:10]:
        fe = fg.add_entry()
        fe.id(urljoin(url, entry.slug))
        fe.title(entry.title or "Untitled")
        fe.link(href=urljoin(url, entry.slug))
        fe.description(six.text_type(entry.render_contents()))
        if entry.pub_date:
            # Ensure timezone awareness (assume UTC if naive)
            pub_date = entry.pub_date
            if pub_date.tzinfo is None:
                pub_date = pub_date.replace(tzinfo=timezone.utc)
            fe.published(pub_date)
            fe.updated(pub_date)
        if blog_author:
            fe.author(name=blog_author)

    # Write atom feed
    with builder.open_link_file("blog_feed") as f:
        f.write(fg.atom_str(pretty=True))


def write_blog_files(builder):
    write_index_page(builder)
    write_archive_pages(builder)
    write_feed(builder)


def setup(builder):
    after_file_published.connect(process_blog_entry)
    before_build_finished.connect(write_blog_files)
    builder.register_url(
        "blog_index",
        config_key="modules.blog.index_url",
        config_default="/",
        defaults={"page": 1},
    )
    builder.register_url(
        "blog_index",
        config_key="modules.blog.paged_index_url",
        config_default="/page/<page>/",
    )
    builder.register_url(
        "blog_archive",
        config_key="modules.blog.archive_url",
        config_default="/archive/",
    )
    builder.register_url(
        "blog_archive",
        config_key="modules.blog.year_archive_url",
        config_default="/<year>/",
    )
    builder.register_url(
        "blog_archive",
        config_key="modules.blog.month_archive_url",
        config_default="/<year>/<month>/",
    )
    builder.register_url(
        "blog_feed", config_key="modules.blog.feed_url", config_default="/feed.atom"
    )
    builder.jinja_env.globals.update(get_recent_blog_entries=get_recent_blog_entries)
