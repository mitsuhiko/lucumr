# -*- coding: utf-8 -*-
"""
rstblog.modules.pygments
~~~~~~~~~~~~~~~~~~~~~~~~

Adds support for pygments.

:copyright: (c) 2010 by Armin Ronacher.
:license: BSD, see LICENSE for more details.
"""

from rstblog.signals import before_file_processed, before_build_finished

from docutils import nodes
from docutils.parsers.rst import Directive, directives

from pygments import highlight
from pygments.lexers import get_lexer_by_name, TextLexer
from pygments.lexers.php import PhpLexer
from pygments.formatters import HtmlFormatter
from pygments.styles import get_style_by_name


html_formatter = None


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


def inject_stylesheet(context, **kwargs):
    context.add_stylesheet("_pygments.css")


def write_stylesheet(builder, **kwargs):
    with builder.open_static_file("_pygments.css", "w") as f:
        f.write(html_formatter.get_style_defs())


def setup(builder):
    global html_formatter
    style = get_style_by_name(builder.config.root_get("modules.pygments.style"))
    html_formatter = HtmlFormatter(style=style)
    directives.register_directive("code-block", CodeBlock)
    directives.register_directive("sourcecode", CodeBlock)
    before_file_processed.connect(inject_stylesheet)
    before_build_finished.connect(write_stylesheet)
