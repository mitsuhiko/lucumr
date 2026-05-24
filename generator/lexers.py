from pygments.lexers.php import PhpLexer


class PhpInlineLexer(PhpLexer):
    """PHP lexer variant that starts in inline PHP mode."""

    name = "PHP Inline"
    aliases = ["phpinline"]
    filenames = []
    mimetypes = []

    def __init__(self, **options):
        options.setdefault("startinline", True)
        super().__init__(**options)
