# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is Armin Ronacher's personal blog (lucumr.pocoo.org) built with rstblog, a custom static site generator that processes reStructuredText content. The blog spans 18+ years of content (2007-2025) and demonstrates modern web standards with dark/light mode support.

## Important Transition Information

This repository is really old, but we are going to migrate it over to modern Python with UV. So, some of the information that you're given here in this CLAUDE.md file might actually be a little bit confusing.

## Development Commands

The makefile is currently not functional.

```bash
# Core development workflow
make serve    # Start development server for local testing
make build    # Generate static site to blog/_build/
make clean    # Remove build artifacts
```

## Development Workflow Reminders

- Remember to run `make format` after all changes

## Architecture

### Content Structure
- **Main content**: `blog/` directory contains all posts and site configuration
- **Blog posts**: Organized as `blog/YYYY/MM/DD/post-name.rst` in reStructuredText format
- **Static assets**: `blog/static/` contains CSS, fonts, images, and avatars
- **Templates**: `blog/_templates/` contains Jinja2 HTML templates
- **Configuration**: `blog/config.yml` defines rstblog modules and site metadata

### Post Format
Blog posts are written in reStructuredText with frontmatter:

```rst
public: yes
tags: [tag1, tag2]
summary: Brief description for feeds

Post Title
==========

Content in reStructuredText format...
```

### Build System
- **rstblog**: Custom static site generator that processes RST content
- **Jinja2**: Template engine for HTML generation
- **Pygments**: Syntax highlighting with "tango" style
- **Output**: Static files generated to `blog/_build/` (gitignored)

### Frontend Features
- Responsive design with mobile-first approach
- Dark/light mode switching with system preference detection
- Modern CSS using custom properties and light-dark() function
- Progressive enhancement with JavaScript for theme persistence
- Web fonts with preloading for performance

### Special Pages
- `blog/about.rst` - Author biography and contact
- `blog/projects.rst` - Portfolio and projects
- `blog/talks.rst` - Speaking engagements
- `blog/404.rst` - Custom error page

## Content Management

### Drafts
- Unpublished content goes in `_trash/` directory
- Move to appropriate date folder when ready to publish

### Development Workflow
1. Write content in RST format in appropriate `blog/YYYY/MM/DD/` directory
2. Use `make serve` to preview changes locally
3. Run `make build` to generate static site
