# -*- coding: utf-8 -*-
"""
rstblog.utils
~~~~~~~~~~~~~

Various utilities.

:copyright: (c) 2010 by Armin Ronacher.
:license: BSD, see LICENSE for more details.
"""

from math import ceil

from markupsafe import Markup


class Pagination(object):
    """Internal helper class for paginations"""

    def __init__(self, builder, entries, page, per_page, url_key):
        self.builder = builder
        self.entries = entries
        self.page = page
        self.per_page = per_page
        self.url_key = url_key

    @property
    def total(self):
        return len(self.entries)

    @property
    def pages(self):
        return int(ceil(self.total / float(self.per_page)))

    def get_prev(self):
        return Pagination(
            self.builder, self.entries, self.page - 1, self.per_page, self.url_key
        )

    @property
    def prev_num(self):
        """Number of the previous page."""
        return self.page - 1

    @property
    def has_prev(self):
        """True if a previous page exists"""
        return self.page > 1

    def get_next(self):
        return Pagination(
            self.builder, self.entries, self.page + 1, self.per_page, self.url_key
        )

    @property
    def has_next(self):
        """True if a next page exists."""
        return self.page < self.pages

    @property
    def next_num(self):
        """Number of the next page"""
        return self.page + 1

    def get_slice(self):
        return self.entries[(self.page - 1) * self.per_page : self.page * self.per_page]

    def iter_pages(self, left_edge=2, left_current=2, right_current=5, right_edge=2):
        """Iterates over the page numbers in the pagination.  The four
        parameters control the thresholds how many numbers should be produced
        from the sides.  Skipped page numbers are represented as `None`.
        """
        last = 0
        for num in range(1, self.pages + 1):
            if (
                num <= left_edge
                or (
                    num > self.page - left_current - 1
                    and num < self.page + right_current
                )
                or num > self.pages - right_edge
            ):
                if last + 1 != num:
                    yield None
                yield num
                last = num

    def __str__(self):
        return self.builder.render_template("_pagination.html", {"pagination": self})

    def __html__(self):
        return Markup(str(self))
