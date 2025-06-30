# Armin Ronacher's Blog

My personal blog hosted at [lucumr.pocoo.org](https://lucumr.pocoo.org).

## About

This is a static blog built with a tiny custom static site generator that processes reStructuredText content. The blog spans 18+ years of technical writing (2007-) covering programming, software engineering, open source development, and technology insights.

This blog was originally using reStructuredText and was converted to Markdown with Claude Code.  If there are regressions, the original commit that still had RST files is [c11c06c](https://github.com/mitsuhiko/lucumr/commit/c11c06c9b55aecd397227eb1a7f478f469b99351).

## Content Structure

- **Blog Posts**: `blog/YYYY/MM-DD-post-name.md` in Markdown format
- **Other Posts**: `blog/name.md` in Markdown format
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

# Format Python code
make format
```

Built and maintained by [Armin Ronacher](https://github.com/mitsuhiko).
