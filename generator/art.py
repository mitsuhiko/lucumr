"""Build-time data for the generative header/footer artwork.

The artwork itself is drawn in the browser (``blog/static/art/``).  This module
supplies what it is drawn from:

* the tag table: what each tag means for the artwork (hand-authored),
* tag statistics and a 2D layout of the tags by co-occurrence,
* a per-post "shape": the sequence of blocks the post is made of.

See ``ART.md`` at the repository root for the whole picture.
"""

import json
import re
from collections import defaultdict
from math import cos, pi, sin, sqrt
from pathlib import Path

from markupsafe import Markup, escape

# role: "register" tags decide how something is drawn (the hand), "subject"
#       tags decide what is drawn, "project" tags are small signature accents.
# pigment/color: a real watercolour pigment and its mid-tone on white paper.
# loose: 0 = tight, ruled, dry ... 1 = loose, wet, wandering.
# energy: 0 = calm, sparse ... 1 = agitated, dense.
# note: the intended character, for whoever draws it.
# fmt: off
TAGS = {
    # register
    "thoughts": ("register", "graphite", "#6b7280", 0.8, 0.3, "the ground everything else sits on: a soft grey wash, a wandering hand"),
    "life": ("register", "yellow ochre", "#c9963a", 0.9, 0.25, "warm, personal, unhurried; the loosest hand"),
    "politics": ("register", "alizarin crimson", "#a8233a", 0.5, 0.9, "heavy pressure, agitated, urgent"),
    "business": ("register", "green gold", "#8a8f2a", 0.35, 0.5, "measured, ledger-like, deliberate"),
    "community": ("register", "cadmium orange", "#e07b2a", 0.7, 0.65, "many small marks gathering together"),
    "culture": ("register", "rose madder", "#c8527a", 0.75, 0.5, "soft, blooming, human"),
    "history": ("register", "sepia", "#6b4a32", 0.6, 0.2, "aged, faded, archival"),
    "announcement": ("register", "cadmium yellow deep", "#f0a81e", 0.4, 0.85, "bright, a burst, look here"),
    "tutorial": ("register", "naples yellow", "#d9b866", 0.1, 0.35, "ruled guide lines, steps, the most precise hand"),
    "conferences": ("register", "scarlet lake", "#d8452e", 0.6, 0.75, "crowded, lively, on stage"),
    "covid19": ("register", "terre verte", "#7a8f6a", 0.65, 0.4, "muted, isolated, distanced"),
    # subject
    "python": ("subject", "cobalt blue", "#306998", 0.6, 0.4, "soft, curved, indented; blue with a touch of yellow"),
    "rust": ("subject", "burnt sienna", "#a8431a", 0.25, 0.55, "iron oxide: angular, granulating, strict"),
    "ai": ("subject", "manganese violet", "#7d5ba6", 0.7, 0.7, "diffuse, cloud-like, layered, emergent"),
    "society": ("subject", "viridian", "#2e8a78", 0.6, 0.55, "people at a distance: a town, a crowd, the threads between them; the wide view"),
    "engineering": ("subject", "indigo", "#2f3e6b", 0.2, 0.4, "blueprint: construction lines, grids, structure"),
    "opensource": ("subject", "sap green", "#5d8a2f", 0.65, 0.5, "growth, branching, a commons"),
    "web": ("subject", "cerulean blue", "#3d8fc4", 0.55, 0.5, "sky, boxes inside boxes, links"),
    "tooling": ("subject", "raw umber", "#7a5c3a", 0.3, 0.45, "the workbench: wood and iron"),
    "security": ("subject", "payne's grey", "#3b4856", 0.15, 0.6, "hard edges, dense hatching, locked"),
    "packaging": ("subject", "burnt umber", "#8a5a3c", 0.3, 0.35, "cardboard, boxes, stacking"),
    "unicode": ("subject", "sumi ink", "#23262b", 0.45, 0.4, "ink, glyphs, calligraphic strokes"),
    "javascript": ("subject", "hansa yellow", "#e8c91e", 0.6, 0.8, "bright, restless, curly"),
    "api": ("subject", "cobalt teal", "#1f9e9a", 0.25, 0.4, "interfaces, sockets, clean joins"),
    "vcs": ("subject", "pyrrole orange", "#e2542e", 0.35, 0.5, "branching and merging lines"),
    "types": ("subject", "ultramarine", "#2b3fa0", 0.1, 0.3, "crystalline, lattices, exact"),
    "networking": ("subject", "phthalo blue", "#145a8c", 0.4, 0.65, "nodes and edges, signals travelling"),
    "databases": ("subject", "prussian blue", "#1c3f5e", 0.2, 0.25, "deep, layered, settled"),
    "os": ("subject", "neutral tint", "#55505c", 0.25, 0.35, "low level, layered, kernel and shell"),
    "hardware": ("subject", "phthalo green", "#1f7a55", 0.15, 0.4, "circuit board: traces and right angles"),
    "c": ("subject", "davy's grey", "#5f6b66", 0.1, 0.45, "bare metal, plain, sharp"),
    "go": ("subject", "cobalt turquoise", "#2ab3cf", 0.45, 0.6, "simple, parallel lanes"),
    "async": ("subject", "lavender", "#8f8fd0", 0.5, 0.75, "interleaved, leaving and rejoining"),
    "games": ("subject", "opera rose", "#e0457f", 0.7, 0.85, "playful, saturated"),
    "design": ("subject", "ultramarine violet", "#6a4fa0", 0.6, 0.4, "composed, balanced, intentional"),
    "wsgi": ("subject", "olive green", "#6f7a3a", 0.3, 0.3, "plumbing between layers"),
    # project
    "flask": ("project", "ivory black", "#2e2c2a", 0.5, 0.4, "a small flask in ink"),
    "jinja": ("project", "vermilion", "#c8321e", 0.4, 0.4, "the red of a shrine gate"),
    "django": ("project", "hooker's green", "#1e4d3a", 0.3, 0.3, "deep green"),
    "sentry": ("project", "dioxazine purple", "#4b2d73", 0.3, 0.5, "deep purple, watchful"),
    "pi": ("project", "cobalt violet", "#9a4fb0", 0.5, 0.6, "a small circle, never quite closed"),
    "earendil": ("project", "quinacridone gold", "#c8901e", 0.6, 0.5, "a star"),
}
# fmt: on

# The facets: hidden classifications of a post (its mood, its imagery, how much
# conflict is in it...), made by a classifier model and kept in the post's
# frontmatter under ``facets:``.  art_facets.json has the questions that were
# asked, and for every score the range that the middle 90% of the posts fall
# into: scores are stretched over that range so that they use all of 0..1.
FACETS = json.loads(
    (Path(__file__).parent / "art_facets.json").read_text(encoding="utf-8")
)


def post_facets(post):
    """A post's facets as the artwork gets them: scores stretched to 0..1."""
    return stretch_facets(getattr(post, "facets", None) or {})


def stretch_facets(raw):
    """Facets as written in a frontmatter (or in ``PAGES``), for the browser."""
    facets = {}
    for name, question in FACETS["questions"].items():
        value = raw.get(name)
        if question["type"] == "choice" and isinstance(value, dict):
            facets[name] = {
                label: p for label, p in value.items() if label in question["criteria"]
            }
        elif question["type"] == "score" and isinstance(value, (int, float)):
            low, high = FACETS["ranges"].get(name, (0.0, 1.0))
            facets[name] = round(min(max((value - low) / (high - low), 0.0), 1.0), 3)
    return facets


def facet_definitions():
    """The facets and their labels, for the browser."""
    return {
        name: {"type": "choice", "labels": list(question["criteria"])}
        if question["type"] == "choice"
        else {"type": "score"}
        for name, question in FACETS["questions"].items()
    }


_FENCE_RE = re.compile(r"^\s*(```|~~~)")
_HEADING_RE = re.compile(r"^(#{1,6})\s")
_LIST_RE = re.compile(r"^\s*([-*+]|\d+[.)])\s")
_LINK_RE = re.compile(r"\]\(")
MAX_SHAPE_BLOCKS = 400


def post_shape(markdown):
    """The blocks a post is made of, in order, as ``(type, size)`` pairs.

    Types: ``h`` heading (size: level), ``p`` paragraph (words), ``c`` code
    block (lines), ``l`` list (items), ``q`` quote (words), ``i`` image (1),
    ``t`` table (rows), ``x`` raw HTML such as an embedded demo (lines).
    The post title (the first ``# heading``) is left out.
    """
    blocks = []
    kind = None
    size = 0
    seen_title = False

    def flush():
        nonlocal kind, size
        if kind is not None and size > 0:
            blocks.append((kind, size))
        kind, size = None, 0

    def feed(new_kind, amount):
        nonlocal kind, size
        if kind != new_kind:
            flush()
            kind = new_kind
        size += amount

    in_fence = False
    for line in markdown.split("\n"):
        if _FENCE_RE.match(line):
            if in_fence:
                in_fence = False
                flush()
            else:
                flush()
                in_fence = True
                kind, size = "c", 0
            continue
        if in_fence:
            size += 1
            continue
        stripped = line.strip()
        if not stripped:
            flush()
            continue
        heading = _HEADING_RE.match(stripped)
        if heading:
            flush()
            if len(heading.group(1)) == 1 and not seen_title:
                seen_title = True
            else:
                blocks.append(("h", len(heading.group(1))))
            continue
        words = len(stripped.split())
        if stripped.startswith(">"):
            feed("q", max(1, words - 1))
        elif stripped.startswith("!["):
            flush()
            blocks.append(("i", 1))
        elif stripped.startswith("|"):
            feed("t", 1)
        elif _LIST_RE.match(line):
            feed("l", 1)
        elif kind == "l":
            pass  # continuation line of a list item
        elif stripped.startswith("<") and kind != "p":
            feed("x", 1)
        elif line.startswith("    ") and kind in (None, "c"):
            feed("c", 1)
        else:
            feed("p", words)
    flush()
    return blocks[:MAX_SHAPE_BLOCKS]


def encode_shape(blocks):
    return " ".join(f"{kind}{size}" for kind, size in blocks)


def post_record(post):
    """What the artwork knows about a post."""
    return {
        "kind": "post" if post.pub_date else "page",
        "slug": post.slug,
        "title": post.title,
        "date": post.pub_date.strftime("%Y-%m-%d") if post.pub_date else "",
        # a page has no tags of its own: ``art: {tags: [...]}`` in its
        # frontmatter gives it some for the artwork alone
        "tags": list((getattr(post, "art", None) or {}).get("tags") or post.tags or []),
        "shape": encode_shape(post_shape(post.content)),
        "links": len(_LINK_RE.findall(post.content)),
        "facets": post_facets(post),
    }


# The pages the generator renders from templates (no markdown, so no
# frontmatter): what the artwork draws for them, as a post's frontmatter would
# have it.  ``tags`` as ``tags:``, ``facets`` as ``facets:`` (the raw answers:
# choices as label probabilities, scores in 0..1 before stretching).  The seed
# comes from the URL, so every page of a kind (/page/2/, /2015/) differs.
# Markdown pages (about, projects, ...) carry the same in their frontmatter,
# under ``art: {tags: [...]}`` and ``facets:``.
PAGES = {
    # the blog's front page and its later pages: what the blog is mostly about
    "index": {
        "kind": "index",
        "tags": ["thoughts", "python", "rust", "ai", "opensource"],
        "facets": {
            "mood": {"reflective": 0.5, "hopeful": 0.3, "matter_of_fact": 0.2},
            "scale": {"craft": 0.5, "community": 0.3, "industry": 0.2},
            "time": {"present": 0.6, "future": 0.25, "past": 0.15},
            "ai": {"not_ai": 0.6, "agents": 0.4},
            "imagery": {"none": 1},
            "stance": {"builder": 0.5, "observer": 0.3, "teacher": 0.2},
            "ending": {"open": 0.6, "resolved": 0.4},
            "tension": 0.35,
            "certainty": 0.7,
            "valence": 0.6,
            "energy": 0.45,
            "wander": 0.4,
            "personal": 0.5,
            "humor": 0.2,
            "technical": 0.6,
        },
    },
    # the archive and every year and month: looking back
    "archive": {
        "kind": "index",
        "tags": ["history", "python", "web", "opensource"],
        "facets": {
            "mood": {"reflective": 0.8, "matter_of_fact": 0.2},
            "scale": {"craft": 0.4, "community": 0.4, "self": 0.2},
            "time": {"past": 0.9, "present": 0.1},
            "ai": {"not_ai": 1},
            "imagery": {"none": 1},
            "stance": {"witness": 0.6, "observer": 0.4},
            "ending": {"resolved": 1},
            "tension": 0.1,
            "certainty": 0.8,
            "valence": 0.55,
            "energy": 0.25,
            "wander": 0.35,
            "personal": 0.4,
            "humor": 0.1,
            "technical": 0.5,
        },
    },
    # the tag cloud: many small things gathered
    "tags": {
        "kind": "index",
        "tags": ["community", "opensource", "thoughts"],
        "facets": {
            "mood": {"playful": 0.5, "matter_of_fact": 0.5},
            "scale": {"community": 0.7, "craft": 0.3},
            "time": {"present": 1},
            "ai": {"not_ai": 1},
            "imagery": {"crowd": 0.8, "none": 0.2},
            "stance": {"observer": 1},
            "ending": {"open": 1},
            "tension": 0.05,
            "certainty": 0.6,
            "valence": 0.65,
            "energy": 0.55,
            "wander": 0.6,
            "personal": 0.2,
            "humor": 0.4,
            "technical": 0.3,
        },
    },
    # talks: on stage, teaching
    "talks": {
        "kind": "page",
        "tags": ["conferences", "python", "rust", "opensource"],
        "facets": {
            "mood": {"hopeful": 0.5, "playful": 0.3, "matter_of_fact": 0.2},
            "scale": {"community": 0.8, "craft": 0.2},
            "time": {"past": 0.7, "present": 0.3},
            "ai": {"not_ai": 0.8, "agents": 0.2},
            "imagery": {"light": 0.7, "none": 0.3},
            "stance": {"teacher": 0.7, "advocate": 0.3},
            "ending": {"call": 0.6, "resolved": 0.4},
            "tension": 0.1,
            "certainty": 0.85,
            "valence": 0.75,
            "energy": 0.65,
            "wander": 0.3,
            "personal": 0.4,
            "humor": 0.35,
            "technical": 0.55,
        },
    },
}


def page_record(name):
    """What the artwork knows about a page rendered from a template."""
    page = PAGES[name]
    return {
        "kind": page.get("kind", "page"),
        "tags": list(page.get("tags") or []),
        "facets": stretch_facets(page.get("facets") or {}),
    }


def marker(record):
    """The hidden element inside ``div.body`` that carries a page's record.

    It lives inside ``div.body`` because that is what htmx swaps on navigation
    and what it restores from its history cache.
    """

    def text(value):
        if isinstance(value, list):
            return " ".join(value)
        if isinstance(value, dict):
            return json.dumps(value, separators=(",", ":"))
        return value

    attrs = "".join(
        f' data-{key}="{escape(text(value))}"'
        for key, value in record.items()
        if value not in ("", None, [], {})
    )
    return Markup(f'<span id="art-post" hidden{attrs}></span>')


def cooccurrence(posts):
    counts = defaultdict(int)
    pairs = defaultdict(lambda: defaultdict(int))
    for post in posts:
        tags = list(dict.fromkeys(post.tags or []))
        for tag in tags:
            counts[tag] += 1
            for other in tags:
                if other != tag:
                    pairs[tag][other] += 1
    return counts, pairs


def tag_layout(counts, pairs, iterations=600):
    """Place the tags on a plane so that tags used together sit together.

    A deterministic force-directed layout: every pair repels, pairs that
    co-occur attract in proportion to how often they do (cosine similarity).
    Returns ``{tag: (x, y)}`` with both in 0..1.
    """
    names = sorted(counts, key=lambda name: (-counts[name], name))
    n = len(names)
    if n == 0:
        return {}
    if n == 1:
        return {names[0]: (0.5, 0.5)}
    # start on a sunflower spiral, the most used tags in the middle
    pos = []
    for i in range(n):
        r = sqrt((i + 0.5) / n)
        a = i * pi * (3 - sqrt(5))
        pos.append([r * cos(a), r * sin(a)])
    sim = [[0.0] * n for _ in range(n)]
    for i, a in enumerate(names):
        for j, b in enumerate(names):
            if i != j and pairs[a].get(b):
                sim[i][j] = pairs[a][b] / sqrt(counts[a] * counts[b])
    k = 1.0 / sqrt(n)
    for step in range(iterations):
        temp = 0.08 * (1 - step / iterations) + 0.002
        moves = []
        for i in range(n):
            fx = fy = 0.0
            for j in range(n):
                if i == j:
                    continue
                dx = pos[i][0] - pos[j][0]
                dy = pos[i][1] - pos[j][1]
                dist = max(sqrt(dx * dx + dy * dy), 1e-4)
                force = k * k / dist - 3.0 * sim[i][j] * dist * dist / k
                fx += dx / dist * force
                fy += dy / dist * force
            # a weak pull to the middle keeps unconnected tags on the page
            fx -= pos[i][0] * 0.05
            fy -= pos[i][1] * 0.05
            length = max(sqrt(fx * fx + fy * fy), 1e-9)
            scale = min(length, temp) / length
            moves.append((fx * scale, fy * scale))
        for i, (mx, my) in enumerate(moves):
            pos[i][0] += mx
            pos[i][1] += my
    xs = [p[0] for p in pos]
    ys = [p[1] for p in pos]
    span_x = (max(xs) - min(xs)) or 1.0
    span_y = (max(ys) - min(ys)) or 1.0
    return {
        name: (
            round((pos[i][0] - min(xs)) / span_x, 4),
            round((pos[i][1] - min(ys)) / span_y, 4),
        )
        for i, name in enumerate(names)
    }


def tag_data(posts):
    """Everything the browser knows about the tags (the content of data.js)."""
    counts, pairs = cooccurrence(posts)
    layout = tag_layout(counts, pairs)
    tags = {}
    for name in sorted(set(counts) | set(TAGS)):
        entry = {"count": counts.get(name, 0)}
        if name in TAGS:
            role, pigment, color, loose, energy, note = TAGS[name]
            entry.update(
                role=role,
                pigment=pigment,
                color=color,
                loose=loose,
                energy=energy,
                note=note,
            )
        if name in layout:
            entry["x"], entry["y"] = layout[name]
            entry["near"] = sorted(
                pairs[name].items(), key=lambda item: (-item[1], item[0])
            )
        tags[name] = entry
    return {"total": len(posts), "tags": tags, "facets": facet_definitions()}


def write_if_changed(path, text):
    path.parent.mkdir(parents=True, exist_ok=True)
    if not path.exists() or path.read_text(encoding="utf-8") != text:
        path.write_text(text, encoding="utf-8")


def write_data(posts, folder):
    """Write data.js: the tag data every page loads."""
    posts = [post for post in posts if post.pub_date]
    dump = lambda value: json.dumps(value, separators=(",", ":"), ensure_ascii=False)
    write_if_changed(
        folder / "data.js", f"LucumrArt.loadData({dump(tag_data(posts))});\n"
    )
