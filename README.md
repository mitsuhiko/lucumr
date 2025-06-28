# Lucumr

My personal blog hosted at [lucumr.pocoo.org](https://lucumr.pocoo.org).

## About

This is a static blog built with a tiny custom static site generator that processes reStructuredText content. The blog spans 18+ years of technical writing (2007-) covering programming, software engineering, open source development, and technology insights.

## Content Structure

- **Blog Posts**: `blog/YYYY/MM/DD/post-name.rst` in reStructuredText format
- **Static Assets**: `blog/static/` contains CSS, fonts, images, and avatars
- **Templates**: `blog/_templates/` contains Jinja2 HTML templates

## Development

```bash
# Start development server
make serve

# Generate static site
make build

# Clean build artifacts
make clean

# Format code
make format
```

## Technology Stack

- **Content**: reStructuredText markup
- **Generator**: Custom generator static site generator
- **Templates**: Jinja2
- **Styling**: Modern CSS with custom properties
- **Syntax Highlighting**: Pygments
- **Build**: Python-based toolchain with uv

Built and maintained by [Armin Ronacher](https://github.com/mitsuhiko).
