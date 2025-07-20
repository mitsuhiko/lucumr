from pygments import highlight
from pygments.lexers import get_lexer_by_name, TextLexer, PhpLexer
from pygments.formatters import HtmlFormatter
from pygments.styles import get_style_by_name
from markupsafe import Markup
import marko
import smartypants
from marko.ext.gfm import GFM
from marko.ext import footnote
from marko.html_renderer import HTMLRenderer

from generator.config import CONFIG


def highlight_code(code, language):
    """Highlight code using Pygments with shared highlighting logic."""
    try:
        if language == "phpinline":
            lexer = PhpLexer(startinline=True)
        elif language:
            lexer = get_lexer_by_name(language)
        else:
            lexer = TextLexer()
    except ValueError:
        lexer = TextLexer()

    return highlight(code, lexer, html_formatter)


class PygmentsRenderer(HTMLRenderer):
    """Custom Marko renderer that uses Pygments for syntax highlighting."""

    def render_fenced_code(self, element):
        """Render fenced code blocks with Pygments highlighting."""
        code = element.children[0].children if element.children else ""
        if isinstance(code, str):
            language = getattr(element, "lang", None) or ""
            return highlight_code(code, language)
        return super().render_fenced_code(element)

    @staticmethod
    def escape_html(raw: str) -> str:
        # For some reason quotes are always quoted here which causes issues
        # later with smartypants.  So let's undo this.
        return HTMLRenderer.escape_html(raw).replace("&quot;", '"')


def render_markdown(content):
    """Render Markdown content to HTML."""
    # Remove the first heading from content since we render it separately
    content_lines = content.split("\n")
    filtered_lines = []
    found_first_heading = False
    title = None

    for line in content_lines:
        if line.strip().startswith("# ") and not found_first_heading:
            title = line.strip()
            found_first_heading = True
            continue
        filtered_lines.append(line)

    filtered_content = "\n".join(filtered_lines)
    html_content = markdown_to_html(filtered_content)
    html_title = markdown_to_html(title) if title else None
    return {
        "title": html_title.striptags() if html_title else None,
        "html_title": html_title,
        "fragment": html_content,
    }


def render_summary(summary):
    """Render summary as HTML."""
    if not summary:
        return ""
    return markdown_to_html(summary)


def extract_title_from_content(content):
    """Extract title from content"""
    # Extract title from first heading in Markdown
    for line in content.split("\n"):
        line = line.strip()
        if line.startswith("# "):
            return markdown_to_html(line[2:].strip()).striptags()
    return None


def get_pygments_css():
    """Get Pygments CSS styles."""
    return html_formatter.get_style_defs()


def markdown_to_html(content):
    """Convert Markdown content to HTML."""
    return Markup(smartypants.smartypants(markdown_parser(content)))


html_formatter = HtmlFormatter(style=get_style_by_name(CONFIG["pygments_style"]))

markdown_parser = marko.Markdown(
    extensions=[GFM, footnote.make_extension()], renderer=PygmentsRenderer
)
