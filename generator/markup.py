from docutils.core import publish_parts
from docutils import nodes
from docutils.parsers.rst import Directive, directives
from pygments import highlight
from pygments.lexers import get_lexer_by_name, TextLexer, PhpLexer
from pygments.formatters import HtmlFormatter
from pygments.styles import get_style_by_name
from markupsafe import Markup
import marko
from marko.ext.gfm import GFM
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


class CodeBlock(Directive):
    """Pygments code highlighting directive for RST."""

    has_content = True
    required_arguments = 1
    optional_arguments = 0
    final_argument_whitespace = False

    def run(self):
        language = self.arguments[0]
        code = "\n".join(self.content)
        formatted = highlight_code(code, language)
        return [nodes.raw("", formatted, format="html")]


def render_rst(content):
    """Render RST content to HTML."""
    settings = {
        "initial_header_level": 2,
    }
    parts = publish_parts(content, writer_name="html4css1", settings_overrides=settings)
    return {
        "title": Markup(parts["title"]).striptags() if parts["title"] else None,
        "html_title": Markup(parts["html_title"]) if parts["html_title"] else "",
        "fragment": Markup(parts["fragment"]),
    }


def render_markdown(content, title=None):
    """Render Markdown content to HTML."""
    # Remove the first heading from content since we render it separately
    content_lines = content.split("\n")
    filtered_lines = []
    found_first_heading = False

    for line in content_lines:
        if line.strip().startswith("# ") and not found_first_heading:
            found_first_heading = True
            continue
        filtered_lines.append(line)

    filtered_content = "\n".join(filtered_lines)
    html_content = markdown_parser(filtered_content)
    return {
        "title": title,
        "html_title": Markup(f"<h1>{title}</h1>") if title else "",
        "fragment": Markup(html_content),
    }


def render_content(content, file_type, title=None):
    """Render content based on file type."""
    if file_type == "markdown":
        return render_markdown(content, title)
    return render_rst(content)


def render_summary(summary):
    """Render summary as HTML."""
    if not summary:
        return ""
    # Always render summary as Markdown for consistency
    html_content = markdown_parser(summary)
    return Markup(html_content)


def extract_title_from_content(content, file_type):
    """Extract title from content based on file type."""
    if file_type == "rst":
        try:
            rst_parts = publish_parts(content, writer_name="html4css1")
            if rst_parts["title"]:
                return Markup(rst_parts["title"]).striptags()
        except Exception:
            pass
    elif file_type == "markdown":
        # Extract title from first heading in Markdown
        for line in content.split("\n"):
            line = line.strip()
            if line.startswith("# "):
                return line[2:].strip()
    return None


def get_pygments_css():
    """Get Pygments CSS styles."""
    return html_formatter.get_style_defs()


html_formatter = HtmlFormatter(style=get_style_by_name(CONFIG["pygments_style"]))

markdown_parser = marko.Markdown(extensions=[GFM], renderer=PygmentsRenderer)

directives.register_directive("code-block", CodeBlock)
directives.register_directive("sourcecode", CodeBlock)
