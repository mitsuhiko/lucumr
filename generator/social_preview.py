"""Social preview cards (og:image) for blog posts.

A card is light, like the page: the post's header artwork across the top,
dissolving into the paper, the title and summary below it, and the author.
The artwork is drawn by the blog's own scripts (strata.js), run in Node with a
Skia canvas instead of a browser (``generator/social_art.js``); Pillow sets
the text.  Without Node (or its ``@napi-rs/canvas``, see package.json) a card
is made without the artwork, and made again on the next build.
"""

import hashlib
import json
import re
import shutil
import subprocess
import tempfile
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

from generator import art
from generator.config import CONFIG

SOCIAL_PREVIEW_VERSION = 9

WIDTH, HEIGHT = 1200, 630
PAD = 72
# the band of artwork at the top (CSS pixels, drawn at BAND_DPR and scaled down)
BAND_HEIGHT = 215
BAND_DPR = 2
# where the text starts (the band has dissolved into the paper by then)
TEXT_TOP = 208
AVATAR = 54
FOOTER_TOP = HEIGHT - 48 - AVATAR

TITLE_SIZES = (58, 52, 46, 42, 38)
SUMMARY_SIZES = (32, 30, 28)
TITLE_LEADING = 1.16
SUMMARY_LEADING = 1.5
GAP = 20

# the artwork's code: a change to it draws every card again
ART_SCRIPTS = ("art/core.js", "art/strata.js")
RENDERER = Path(__file__).parent / "social_art.js"

_LIGHT_DARK = re.compile(
    r"(--[\w-]+)\s*:\s*light-dark\(\s*(#[0-9a-fA-F]{3,6})\s*,\s*(#[0-9a-fA-F]{3,6})\s*\)"
)
_MARKDOWN = [
    (re.compile(r"!?\[([^\]]*)\]\([^)]*\)"), r"\1"),
    (re.compile(r"[`*_]"), ""),
]


def plain(text):
    """Markdown inline text as plain text."""
    text = text or ""
    for pattern, repl in _MARKDOWN:
        text = pattern.sub(repl, text)
    return " ".join(text.split())


class SocialPreviewGenerator:
    """Generate social media preview images for blog posts."""

    def __init__(self, project_folder):
        self.project_folder = Path(project_folder)
        self.static_folder = self.project_folder / CONFIG["static_folder"]
        self.colors = self._load_colors()
        self.fonts_dir = self.static_folder / "fonts"
        self._fonts = {}
        self.avatar = self._load_avatar()
        self.cache_file = (
            self.project_folder / ".generator_cache" / "social_preview_cache.json"
        )
        self.cache_file.parent.mkdir(exist_ok=True)
        self.cache = self._load_cache()
        self.art_hash = self._art_hash()

    # ---- resources -------------------------------------------------------

    def _load_colors(self):
        """The light theme's colours from style-2025.css."""
        css = (self.static_folder / "style-2025.css").read_text(encoding="utf-8")
        return {name: light for name, light, _ in _LIGHT_DARK.findall(css)}

    def _font(self, kind, size):
        key = (kind, size)
        if key not in self._fonts:
            name = {
                "title": "lora-v35-cyrillic_cyrillic-ext_latin_latin-ext_math_symbols-600.woff2",
                "body": "merriweather-v30-latin-regular.woff2",
            }[kind]
            self._fonts[key] = ImageFont.truetype(str(self.fonts_dir / name), size)
        return self._fonts[key]

    def _load_avatar(self):
        avatar = Image.open(self.static_folder / "avatar-large.jpg").convert("RGB")
        # the mask on the large image, for a smooth edge
        mask = Image.new("L", avatar.size, 0)
        ImageDraw.Draw(mask).ellipse((0, 0) + avatar.size, fill=255)
        avatar.putalpha(mask)
        return avatar.resize((AVATAR, AVATAR), Image.Resampling.LANCZOS)

    def _art_hash(self):
        digest = hashlib.sha256()
        for name in ART_SCRIPTS + ("style-2025.css",):
            digest.update((self.static_folder / name).read_bytes())
        digest.update(RENDERER.read_bytes())
        return digest.hexdigest()

    # ---- cache -----------------------------------------------------------

    def _load_cache(self):
        try:
            if self.cache_file.exists():
                with open(self.cache_file, "r") as f:
                    return json.load(f)
        except (json.JSONDecodeError, OSError):
            pass
        return {}

    def save_cache(self):
        with open(self.cache_file, "w") as f:
            json.dump(self.cache, f, indent=2)

    def _get_content_hash(self, post):
        """What a card is made from.

        The tag statistics (how often a tag is used, data.js) are left out:
        they change with every new post, and a card stays as it was made.
        """
        record = art.post_record(post)
        content_data = {
            "title": post.title,
            "summary": post.summary,
            "date": post.pub_date.isoformat() if post.pub_date else None,
            "record": record,
            "tags": {name: art.TAGS.get(name) for name in record["tags"]},
            "art": self.art_hash,
            "version": SOCIAL_PREVIEW_VERSION,
        }
        content_str = json.dumps(content_data, sort_keys=True, default=str)
        return hashlib.sha256(content_str.encode()).hexdigest()

    def _cache_key(self, output_path):
        return str(output_path.relative_to(self.project_folder))

    def should_regenerate(self, post, output_path):
        if not output_path.exists():
            return True
        cached = self.cache.get(self._cache_key(output_path), {})
        return cached.get("content_hash") != self._get_content_hash(post)

    # ---- paths -----------------------------------------------------------

    def get_social_preview_filename(self, post):
        """Get the filename for a post's social preview image."""
        if post.pub_date:
            date_prefix = post.pub_date.strftime("%Y-%m-%d")
            slug_parts = post.slug.strip("/").split("/")
            if len(slug_parts) >= 4:
                slug_name = slug_parts[-1]
            else:
                slug_name = post.source_path.replace("/", "-").replace(".md", "")
            filename = f"{date_prefix}-{slug_name}-social.png"
        else:
            filename = (
                f"{post.source_path.replace('/', '-').replace('.md', '')}-social.png"
            )
        return filename

    def get_social_preview_path(self, post):
        filename = self.get_social_preview_filename(post)
        return self.project_folder / "_build" / "social" / filename

    def get_social_preview_url(self, post):
        filename = self.get_social_preview_filename(post)
        return f"{CONFIG['site_url'].rstrip('/')}/social/{filename}"

    # ---- the artwork -----------------------------------------------------

    def render_bands(self, posts, data_js, folder):
        """The header artwork of each post, as PNGs in folder (None if it failed)."""
        node = shutil.which("node")
        if not node:
            print("Social previews: no node, the cards are made without artwork")
            return None
        items = [
            {"record": art.post_record(post), "out": str(folder / f"{i}.png")}
            for i, post in enumerate(posts)
        ]
        job = {
            "static": str(self.static_folder),
            "data": str(data_js),
            "width": WIDTH,
            "height": BAND_HEIGHT,
            "dpr": BAND_DPR,
            "items": items,
        }
        job_path = folder / "job.json"
        job_path.write_text(json.dumps(job), encoding="utf-8")
        result = subprocess.run(
            [node, str(RENDERER), str(job_path)],
            cwd=RENDERER.parent,
            capture_output=True,
            text=True,
            check=False,
        )
        if result.returncode != 0:
            print("Social previews: the artwork failed, the cards are made without it")
            print(result.stderr.strip()[-2000:])
            return None
        return [Path(item["out"]) for item in items]

    # ---- the card --------------------------------------------------------

    def _wrap(self, text, font, max_width):
        words = text.split()
        lines, line = [], []
        for word in words:
            candidate = " ".join(line + [word])
            if not line or font.getlength(candidate) <= max_width:
                line.append(word)
            else:
                lines.append(" ".join(line))
                line = [word]
        if line:
            lines.append(" ".join(line))
        return lines

    def _balanced(self, text, font, max_width):
        """Wrapped like text-wrap: balance (as the page's h1)."""
        lines = self._wrap(text, font, max_width)
        if len(lines) < 2:
            return lines
        lo, hi = max_width / len(lines), max_width
        while hi - lo > 2:
            mid = (lo + hi) / 2
            if len(self._wrap(text, font, mid)) > len(lines):
                lo = mid
            else:
                hi = mid
        return self._wrap(text, font, hi)

    def _truncate(self, lines, font, max_width, count):
        lines = lines[:count]
        last = lines[-1]
        while last and font.getlength(last + "…") > max_width:
            last = last.rsplit(" ", 1)[0] if " " in last else last[:-1]
        lines[-1] = last.rstrip(",.;:") + "…"
        return lines

    def _layout(self, title, summary):
        """Sizes and lines of title and summary that fit between band and footer."""
        width = WIDTH - 2 * PAD
        room = FOOTER_TOP - 30 - TEXT_TOP
        fallback = None
        for title_size in TITLE_SIZES:
            title_font = self._font("title", title_size)
            title_lines = self._balanced(title, title_font, width)
            if len(title_lines) > 3:
                continue
            title_height = len(title_lines) * title_size * TITLE_LEADING
            if not summary:
                if title_height <= room:
                    return title_font, title_lines, None, []
                continue
            rest = room - title_height - GAP
            for summary_size in SUMMARY_SIZES:
                summary_font = self._font("body", summary_size)
                lines = self._wrap(summary, summary_font, width)
                fits = int(rest // (summary_size * SUMMARY_LEADING))
                if len(lines) <= fits:
                    return title_font, title_lines, summary_font, lines
                if fits >= 2 and fallback is None and summary_size == SUMMARY_SIZES[-1]:
                    lines = self._truncate(lines, summary_font, width, fits)
                    fallback = (title_font, title_lines, summary_font, lines)
        if fallback:
            return fallback
        title_font = self._font("title", TITLE_SIZES[-1])
        title_lines = self._truncate(
            self._balanced(title, title_font, width), title_font, width, 3
        )
        return title_font, title_lines, None, []

    def _compose(self, post, band_path, output_path):
        c = self.colors
        img = Image.new("RGB", (WIDTH, HEIGHT), c["--background-color"])
        if band_path is not None:
            band = Image.open(band_path).convert("RGB")
            img.paste(band.resize((WIDTH, BAND_HEIGHT), Image.Resampling.LANCZOS))
        draw = ImageDraw.Draw(img)

        title = plain(post.title)
        summary = plain(post.summary)
        title_font, title_lines, summary_font, summary_lines = self._layout(
            title, summary
        )
        # a short text sits a little above the middle of its room
        used = len(title_lines) * title_font.size * TITLE_LEADING
        if summary_lines:
            used += GAP + len(summary_lines) * summary_font.size * SUMMARY_LEADING
        y = TEXT_TOP + max(0, FOOTER_TOP - 30 - TEXT_TOP - used) * 0.35
        size = title_font.size
        for line in title_lines:
            draw.text((PAD, y), line, font=title_font, fill=c["--header-color"])
            y += size * TITLE_LEADING
        if summary_lines:
            y += GAP
            size = summary_font.size
            for line in summary_lines:
                draw.text((PAD, y), line, font=summary_font, fill=c["--text-color"])
                y += size * SUMMARY_LEADING

        # the author, and the date on the other side
        img.paste(self.avatar, (PAD, FOOTER_TOP), self.avatar)
        small = self._font("body", 24)
        middle = FOOTER_TOP + AVATAR / 2
        draw.text(
            (PAD + AVATAR + 18, middle),
            CONFIG["author"],
            font=small,
            fill=c["--faded-color"],
            anchor="lm",
        )
        if post.pub_date:
            date = f"{post.pub_date:%B} {post.pub_date.day}, {post.pub_date.year}"
            draw.text(
                (WIDTH - PAD, middle),
                date,
                font=small,
                fill=c["--faded-color"],
                anchor="rm",
            )

        output_path.parent.mkdir(parents=True, exist_ok=True)
        img.save(output_path, "PNG", optimize=True)

    # ---- all of it -------------------------------------------------------

    def generate(self, posts, data_js):
        """Make the cards of the posts that need one; returns (made, skipped)."""
        todo = [
            post
            for post in posts
            if self.should_regenerate(post, self.get_social_preview_path(post))
        ]
        if not todo:
            return 0, len(posts)
        with tempfile.TemporaryDirectory(prefix="social-art-") as tmp:
            bands = self.render_bands(todo, data_js, Path(tmp))
            for i, post in enumerate(todo):
                output_path = self.get_social_preview_path(post)
                self._compose(post, bands[i] if bands else None, output_path)
                key = self._cache_key(output_path)
                if bands:
                    self.cache[key] = {"content_hash": self._get_content_hash(post)}
                else:
                    self.cache.pop(key, None)
                print(f"Generated social preview for: {post.title}")
        return len(todo), len(posts) - len(todo)
