# Shelved artwork variants

The header/footer artwork (see `ART.md`) was built as five competing proposals.
The blog now uses `ridgeline` (the header of *Ridgeline and strata* over the
footer of *Sketchbook margins*); these did not make it and live here, outside
`blog/`, so they are neither copied into the build nor loaded by any page.
They are kept complete and working against the variant contract in `ART.md`.

| File | What it is |
|---|---|
| `wash.js` | Proposal 1, *Wet wash*: abstract watercolour.  The header is the top edge of a sheet the washes hang down from, the footer the bottom where the paint ran and pooled; one pigment per lead tag, a fragment shader for the wet medium. |
| `atlas.js` | Proposal 3, *Atlas*: the blog as an island where every tag is a peak (placed by the tags it shares posts with); the header is a strip of the map through the post's place, the footer the wider sheet with the route over its summits. |
| `trace.js` | Proposal 5, *The post draws itself*: a trace of the post's own structure (`post.shape`) read like handwriting: prose as cursive loops, code as hatched blocks, headings as ruled bars, over washes in the tags' pigments. |
| `placeholder.js` | The stand-in that was shown for variants not built yet (`LucumrArt.placeholder(title)`); also the smallest complete example of the variant contract. |

## Restoring one

1. Move the file back: `git mv art-shelf/wash.js blog/static/art/wash.js`
   (or a plain `mv` while it is uncommitted).
2. Add its script tag after `core.js`/`data.js` and before `site.js` in
   `generator/templates/layout.html`:
   `<script src="/static/art/wash.js"></script>`
   (and, if the lab is restored too, before `lab.js` in `lab.html`).
3. Pick it with `?art=wash` on any page.  To make it the blog's look, change `DEFAULT` in
   `blog/static/art/site.js` (and `FALLBACK` in `core.js`).

They only paint in and stop (`frame()` returns `true`/`false`); the ambient
motion that `ridgeline` has (`frame()` returning seconds, see `ART.md`) was
never added to them.

## Retired tools (`tools/`)

| File | What it was |
|---|---|
| `switcher.js` | The floating "Artwork" panel at the bottom right of every page: pick a variant, override tags, facets and seed (stored in `sessionStorage` under `art-override`). |
| `lab.html`, `lab.js` | The lab: one variant drawn for many posts at once (`?variant=`, `same=ai+thoughts`, `nofacets=1`, …); needed `posts.js` (every post's record), which the build no longer writes. |

| `site.js` | The `blog/static/art/site.js` they worked with: the override, the `LucumrArt.site` API and the `art:change` event. |

To bring them back: move `switcher.js`, `lab.html` and `lab.js` to
`blog/static/art/`, replace `blog/static/art/site.js` with `tools/site.js`, add
`<script src="/static/art/switcher.js"></script>` after `site.js` in
`layout.html`, and have `write_data()` in `generator/art.py` write `posts.js`
again (`LucumrArt.posts = [post_record(post) for post in posts]`).
