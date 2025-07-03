import hashlib
import json
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

from generator.config import CONFIG

SOCIAL_PREVIEW_VERSION = 6


class SocialPreviewGenerator:
    """Generate social media preview images for blog posts."""

    def __init__(self, project_folder):
        self.project_folder = Path(project_folder)
        self.width = 1200
        self.height = 630
        self.padding = 80
        self.avatar_size = 80
        self.content_width = self.width - (2 * self.padding)

        self.background_color = "#1b3156"  # Dark blue from CSS
        self.text_color = "#dce7f3"  # Light text color
        self.header_color = "#96afda"  # Header color
        self.author_color = "#aec3d6"  # Faded color for author

        self.fonts = self._load_fonts()
        self.avatar = self._load_avatar()
        self.cache_file = (
            self.project_folder / ".generator_cache" / "social_preview_cache.json"
        )
        self.cache_file.parent.mkdir(exist_ok=True)
        self.cache = self._load_cache()

    def _load_fonts(self):
        """Load WOFF2 fonts directly using Pillow's native support."""
        fonts = {}
        fonts_dir = self.project_folder / "static" / "fonts"

        lora_600_path = (
            fonts_dir
            / "lora-v35-cyrillic_cyrillic-ext_latin_latin-ext_math_symbols-600.woff2"
        )
        fonts["title"] = ImageFont.truetype(str(lora_600_path), 64)
        fonts["title_medium"] = ImageFont.truetype(str(lora_600_path), 56)
        fonts["title_small"] = ImageFont.truetype(str(lora_600_path), 48)

        merriweather_path = fonts_dir / "merriweather-v30-latin-regular.woff2"
        fonts["body"] = ImageFont.truetype(str(merriweather_path), 38)
        fonts["body_small"] = ImageFont.truetype(str(merriweather_path), 34)
        fonts["author"] = ImageFont.truetype(str(merriweather_path), 28)

        return fonts

    def _load_avatar(self):
        """Load avatar image with fallback."""
        avatar_path = self.project_folder / "static" / "avatar-large.jpg"
        avatar = Image.open(avatar_path)

        # Draw mask on original 960x960 image for better antialiasing
        mask = Image.new("L", avatar.size, 0)
        mask_draw = ImageDraw.Draw(mask)
        mask_draw.ellipse((0, 0) + avatar.size, fill=255)

        avatar.putalpha(mask)
        return avatar.resize(
            (self.avatar_size, self.avatar_size), Image.Resampling.BICUBIC
        )

    def _load_cache(self):
        """Load cache from disk."""
        try:
            if self.cache_file.exists():
                with open(self.cache_file, "r") as f:
                    return json.load(f)
        except (json.JSONDecodeError, OSError):
            pass
        return {}

    def save_cache(self):
        """Save cache to disk."""
        with open(self.cache_file, "w") as f:
            json.dump(self.cache, f, indent=2)

    def _get_content_hash(self, post):
        """Generate hash for post content and metadata."""
        content_data = {
            "title": post.title,
            "summary": post.summary,
            "version": SOCIAL_PREVIEW_VERSION,
        }
        content_str = json.dumps(content_data, sort_keys=True)
        return hashlib.sha256(content_str.encode()).hexdigest()

    def should_regenerate(self, post, output_path):
        """Check if social preview should be regenerated."""
        if not output_path.exists():
            return True

        cache_key = str(output_path.relative_to(self.project_folder))
        current_hash = self._get_content_hash(post)
        cached_hash = self.cache.get(cache_key, {}).get("content_hash")

        return cached_hash != current_hash

    def _wrap_text(self, text, font, max_width):
        """Wrap text to fit within max_width."""
        if not text:
            return []

        dummy_img = Image.new("RGB", (1, 1))
        dummy_draw = ImageDraw.Draw(dummy_img)

        words = text.split()
        if not words:
            return []

        lines = []
        current_line = []

        for word in words:
            test_line = " ".join(current_line + [word])
            bbox = dummy_draw.textbbox((0, 0), test_line, font=font)
            width = bbox[2] - bbox[0]

            if width <= max_width or not current_line:
                current_line.append(word)
            else:
                if current_line:
                    lines.append(" ".join(current_line))
                current_line = [word]

        if current_line:
            lines.append(" ".join(current_line))

        return lines

    def _get_text_height(self, text, font):
        """Get the height of text."""
        dummy_img = Image.new("RGB", (1, 1))
        dummy_draw = ImageDraw.Draw(dummy_img)
        bbox = dummy_draw.textbbox((0, 0), text, font=font)
        return bbox[3] - bbox[1]

    def _select_title_font(self, title):
        """Select appropriate title font size based on title length."""
        if len(title) <= 30:
            return self.fonts["title"]
        elif len(title) <= 50:
            return self.fonts["title_medium"]
        else:
            return self.fonts["title_small"]

    def _generate_preview(self, title, summary, output_path):
        """Generate a social media preview image."""
        img = Image.new("RGB", (self.width, self.height), self.background_color)
        draw = ImageDraw.Draw(img)

        y = self.padding

        title_font = self._select_title_font(title)
        title_lines = self._wrap_text(title, title_font, self.content_width)

        for line in title_lines:
            draw.text((self.padding, y), line, fill=self.header_color, font=title_font)
            y += self._get_text_height(line, title_font) + 10

        y += 30

        if summary:
            summary_font = (
                self.fonts["body"] if len(summary) <= 100 else self.fonts["body_small"]
            )
            summary_lines = self._wrap_text(summary, summary_font, self.content_width)

            for line in summary_lines:
                draw.text(
                    (self.padding, y), line, fill=self.text_color, font=summary_font
                )
                y += self._get_text_height(line, summary_font) + 8

        author_text = CONFIG["author"]
        author_font = self.fonts["author"]

        bbox = draw.textbbox((0, 0), author_text, font=author_font)
        author_text_width = bbox[2] - bbox[0]
        author_text_height = bbox[3] - bbox[1]

        avatar_space = 92 if self.avatar else 0
        total_author_width = author_text_width + avatar_space

        author_section_x = self.width - self.padding - total_author_width
        author_y = (
            self.height - self.padding - max(author_text_height, self.avatar_size)
        )

        if self.avatar:
            avatar_y = self.height - self.padding - self.avatar_size
            img.paste(self.avatar, (author_section_x, avatar_y), self.avatar)
            text_x = author_section_x + self.avatar_size + 28
        else:
            text_x = author_section_x

        text_y = (
            author_y + (self.avatar_size - author_text_height) // 2
            if self.avatar
            else author_y
        )

        draw.text(
            (text_x, text_y), author_text, fill=self.author_color, font=author_font
        )

        output_path.parent.mkdir(parents=True, exist_ok=True)
        img.save(output_path, "PNG", optimize=True)

        return output_path

    def _update_cache(self, post, output_path):
        """Update cache entry for generated preview."""
        cache_key = str(output_path.relative_to(self.project_folder))
        self.cache[cache_key] = {"content_hash": self._get_content_hash(post)}

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
        """Get the full path for a post's social preview image."""
        filename = self.get_social_preview_filename(post)
        return self.project_folder / "_build" / "social" / filename

    def get_social_preview_url(self, post):
        """Get the URL for a post's social preview image."""
        filename = self.get_social_preview_filename(post)
        return f"{CONFIG['site_url'].rstrip('/')}/social/{filename}"

    def generate_for_post(self, post):
        """Generate preview image for a blog post."""
        output_path = self.get_social_preview_path(post)
        if not self.should_regenerate(post, output_path):
            return False

        result = self._generate_preview(
            title=post.title, summary=post.summary, output_path=output_path
        )

        if result:
            self._update_cache(post, output_path)

        return True
