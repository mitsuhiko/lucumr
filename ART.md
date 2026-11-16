# Header and footer artwork

The header and footer of every page are drawn in the browser, from the post:
its tags, a seed from its slug, its date and the shape of its text.  How it
looks is a *variant*.  The blog's look is `ridgeline`: the landscape of
*Ridgeline and strata* in the header over the notebook page of *Sketchbook
margins* in the footer.  Both of those stay selectable on their own (each with
its own header and footer); the old metaballs (`classic`) stay as a fallback.
The other proposals (wash, atlas, trace) are shelved in `art-shelf/`, with a
README on how to bring one back.  The general style is pencil and watercolour.

## Files

| File | What |
|---|---|
| `generator/art.py` | Build side: the tag table (`TAGS`), tag statistics and layout, the per-post record. |
| `generator/art_facets.json` | The questions the classifier is asked, and the range each score is stretched over. |
| `scripts/art-classify.js`, `scripts/art-facets` | Classify posts (a codemode script for a p2 session), then write the answers into the frontmatter. |
| `blog/static/art/core.js` | `LucumrArt`: registry, `combine`, mounting, resize/theme/visibility/frames, utilities. |
| `blog/static/art/site.js` | Boots the artwork on the blog (`DEFAULT = 'ridgeline'`) and follows htmx navigation. |
| `blog/static/art/ridgeline.js` | The blog's look: `strata`'s header over `sketchbook`'s footer (`LucumrArt.combine`). |
| `blog/static/art/strata.js` | *Ridgeline and strata*: a landscape (header) over its geological section (footer). |
| `blog/static/art/sketchbook.js` | *Sketchbook margins*: pencil doodles over watercolour, a margin strip (header) and a notebook page (footer). |
| `blog/static/art/classic.js` | The original metaballs, as a variant: the fallback. |
| `art-shelf/` | Shelved proposals (wash, atlas, trace), the old placeholder, and the retired debug tools (`tools/`: the switcher panel and the lab): not built, not loaded; see its README. |
| `_build/static/art/data.js` | Generated: tag data for every page. |
| `scripts/art-shot` | Screenshots a page with headless Chrome. |

A page carries its record in `<span id="art-post" hidden data-…>` inside
`div.body`, because `div.body` is what htmx swaps: the canvases stay, and the
variant is told about the new post.

## The variant contract

```js
LucumrArt.register('strata', {
  title: 'Ridgeline and strata',
  create(env) {
    // called once per mount (a page has one)
    return {
      setPost(post, info) {},   // the post to draw; info.initial is true for the first one
      resize() {},              // a surface changed size or pixel ratio
      setTheme(dark) {},        // light/dark changed
      frame(now, dt) {},        // draw; return true (next frame), seconds (later) or false
      destroy() {}              // remove listeners; the canvases are removed for you
    };
  }
});
```

All methods are optional.  After `setPost` and `resize` (and after
`env.invalidate()`) `frame` is called on the next animation frame; after
`setTheme` it is called at once, in the same task (see Switching themes
below), so it must draw the whole picture in the new theme right then.  What
it returns decides when it is called again:

- `true`: on the next animation frame (painting in, a transition);
- a number: in that many seconds, on the animation frame after (ambient motion
  at a low rate: `1 / 15` is 15 frames a second, `8` is "in eight seconds");
  a call to `env.invalidate()` meanwhile brings the frame forward;
- `false` (or nothing): not until something changes.

It is not called while the page is hidden or neither band is on screen (the
core parks the mount and wakes it when the page or a band shows again).  A
variant with two bands checks `surface.visible` itself: one of them may be off
screen while the other is not.  `now` is in seconds, `dt` is the time since the
previous frame (at most 0.1).

`LucumrArt.combine(name, { title, header: 'strata', footer: 'sketchbook' })`
registers a variant made of two others: each draws its one band, with an env
whose other band is `null`, and is driven as if it were alone; the combined
`frame` asks again as soon as either part does.  The parts must be loaded
first.  A mount that asks for a variant that is not loaded (one shelved, but
remembered by a browser) gets `ridgeline` (`FALLBACK` in core.js), then
`classic`.

`env`:

- `env.header`, `env.footer`, `env.surfaces`: the bands.  A surface is
  `{ kind: 'header' | 'footer', canvas, width, height, dpr, visible, el }`.
  `width`/`height` are CSS pixels; `canvas.width`/`height` are already
  `width * dpr`.  The canvas is fresh: take a `2d` or a `webgl` context from it.
  A mount may have only one of the two bands (the other is `null`).
- `env.dark`: whether to draw for the dark theme, read it when you draw.
- `env.still`: draw the finished picture at once and do not animate (reduced
  motion, screenshots).
- `env.palette()`: the page's colours for the current theme as `[r, g, b]`
  (0..1): `paper` (the page background), `ink`, `primary`, `secondary`,
  `header`, `faded`, `border`.
- `env.invalidate()`: ask for a frame (e.g. from a pointer event).
- `env.util`: `hash`, `rng`, `noise1`, `noise2`, `fbm2`, `clamp`, `lerp`,
  `smoothstep`, `hex`, `css`, `mix`, `hsl`, `toHex`, and `gl.program`,
  `gl.quad`, `gl.texture`.

`post` (from `LucumrArt.describe`):

- `kind`: `post`, `page`, `tag` (a tag's page: one tag) or `index` (no tags).
- `tags`: the tags, loudest first.  Each is `{ name, role, pigment, color, rgb,
  loose, energy, note, count, weight, order, x, y, near, known }`.  `weight` is
  the tag's share by rarity (they sum to 1): `thoughts` is on 145 of 232 posts
  and says little, `unicode` is on 12 and says a lot.  `order` is the position
  the author gave it.  `x`, `y` (0..1) place the tag on a plane where tags that
  are used together sit together; `near` lists `[tag, posts in common]`.
- `lead` (the first five, which get their own voice), `rest` (which only tint),
  and `register`, `subject`, `project` (the tags by role).
- `loose`, `energy` (0..1): the hand for the whole post, from the register tags
  and, where the post has them, from the facets `wander` and `energy`.
- `seed` and `rng(label)`: random numbers that depend only on the slug; take
  one generator per purpose (`post.rng('ridges')`).
- `date`, `year`, `age` (years), `slug`, `title`.
- `facets`, `score()`, `share()`, `top()`, `season`: see Facets below.
- `shape`: the post's blocks in order, `{ t, n }`: `h` heading (level), `p`
  paragraph (words), `c` code (lines), `l` list (items), `q` quote (words),
  `i` image, `t` table (rows), `x` raw HTML (lines).  `stats`: `words`, `code`,
  `headings`, `blocks`, `links`.  Empty for tag and index pages.

## Switching themes

The bands used to flicker when the theme changed: the page faded its colours
over 300 ms with a CSS transition while the canvases switched at once (on the
next animation frame), so for a moment a navy band sat on a still white page,
edges and all.  Now:

- The core redraws the bands synchronously when the theme really changes
  (`themeChanged` in core.js: from the `data-theme` observer, a microtask, or
  the `prefers-color-scheme` listener, before the frame's paint).  Switching
  between `auto` and the theme the system already has redraws nothing.
- A switch in the footer (`selectTheme(theme, true)` in layout.html) runs in a
  view transition: the browser crossfades a snapshot of the old page into the
  new one over 300 ms, and since the bands are already redrawn when the new
  snapshot is taken, page and artwork fade as one picture.
- There is no CSS colour transition any more.  Without view transitions (older
  browsers), with reduced motion, or when the system theme changes, page and
  bands flip together in one frame.

## Facets

Tags alone do not tell posts apart: 31 of the 35 posts of 2026 are tagged
`ai`.  So every post also has *facets*: what a classifier model (Jev) answered
about its text.  They live in the post's frontmatter under `facets:`, next to
the tags, are never shown to readers, and can be corrected by hand.  A new post
gets them by running `scripts/art-classify.js` (in a p2 session, in codemode)
and then `scripts/art-facets`; without them it is drawn from its tags only.

`post.facets` has them (`post.facets.known` is false for a post without, and
for tag and index pages).  A choice is `{ top, p, mix }`: the most likely label,
its probability, and the probability of every label, so a post can be 60%
`worried` and 40% `reflective`.  A score is 0..1 (stretched so that the posts
use the whole range) or `null`.  Use the helpers: `post.score('tension', 0.3)`
(with a fallback), `post.share('mood', 'worried')` (0..1), `post.top('imagery',
0.6)` (the top label if it is at least that probable, else `null`).

| Facet | Values | What it is for |
|---|---|---|
| `mood` | hopeful, worried, angry, reflective, playful, matter_of_fact, conflicted | weather, light, colour temperature |
| `scale` | self, craft, community, industry, society | viewing distance: a close-up of one thing … a wide view of many |
| `time` | past, present, future | direction: where the light comes from, which way things lean or flow, ageing |
| `ai` | agents, models, local, society, community, writing, risk, business, not_ai | tells the many `ai` posts apart: a second pigment, another form |
| `imagery` | water, fire, stone, air, growth, building, road, light, body, crowd, none | the images the author himself uses ("The Tower Keeps Rising" is `building`): the motif.  Often `none` or unsure: only use it when `p` is high |
| `stance` | builder, teacher, critic, advocate, observer, witness | the gesture: constructing, ruling lines, cutting, pushing, watching, remembering |
| `actor` | individual, group, company, machine, state, idea | what populates the picture: one mark or many, organic or mechanical |
| `ending` | resolved, open, call, practical | how the picture ends at its edge: closed, trailing off, pointing on, squared off |
| `tension` | 0 no conflict … 1 the conflict is the whole post | faults, breaks, pigments that resist each other instead of blending |
| `certainty` | 0 searching … 1 assertive | one firm line … a searched, overdrawn one |
| `valence` | 0 bleak … 1 joyful | value and saturation: dark and heavy … bright and light |
| `energy` | 0 very calm … 1 very agitated | (already blended into `post.energy`) |
| `wander` | 0 strictly structured … 1 freely associative | (already blended into `post.loose`) |
| `personal` | 0 impersonal … 1 intimate | warmth, the hand showing, closeness |
| `humor` | 0 earnest … 1 playful | lightness, a stray flourish |
| `technical` | 0 none … 1 deeply technical | ruled, measured, constructed … free |

`post.season` (0..1 through the year, from the date; `null` without one) is
there too.  Posts that share exactly the same tags (`ai` and `thoughts`, say)
must not look alike.

## What every variant has to get right

- **Facets.** Two posts with the same tags must be clearly different pictures,
  and different in a way that means something: the facets decide that, not only
  the seed.  The tags still decide what family a picture belongs to.

- **Roles.** Register tags (`thoughts`, `life`, `tutorial`, `politics`…) decide
  how it is drawn, subject tags (`rust`, `python`, `ai`…) what is drawn, project
  tags (`flask`, `jinja`, `pi`…) are a small signature.  The `note` of a tag
  says what it should feel like.  Tags the table does not know still have a
  colour and values, derived from their name.
- **Composition.** No tags (index, about): a calm house look in the blog's
  blues.  One tag (a tag's page): that tag in pure form.  Up to five lead tags
  each recognisable; more than five must not break.
- **Deterministic.** The same post is the same picture on every visit and at
  every width (resizing reveals more of it rather than reshuffling it).  All
  randomness comes from `post.rng()`.
- **Paper.** The band touches the outer edge of the page and dissolves into
  `palette().paper` towards the content: no hard edge at the bottom of the
  header or the top of the footer.
- **Two themes.** Light is white paper.  Dark is navy (`#1b3156`), where
  transparent watercolour does not work: it needs its own medium (chalk,
  gouache, white pencil on blue paper).  A switch is not a paint-in: the
  finished picture is redrawn in the other theme in one frame (see below).
- **Sizes.** Header 185px (124px below 800px wide), footer 450px (300px).  Any
  width from 320px to an ultrawide monitor.  Header and footer belong together.
- **Motion.** Paint in once (two or three seconds at most).  A new post
  (`info.initial === false`) is a transition from the old picture, not a cut.
  With `env.still` (also set for `prefers-reduced-motion`) the first frame is
  the finished picture and nothing moves after it.
- **Ambient motion.** After that, a little life may stay, if it is ambient:
  subtle, never pulling the eye from the text, no layout shift.  It moves
  around the finished picture and comes back to it (it must not drift the
  composition away); the post's facets decide its pace and amount.  It has to
  be cheap: keep the finished picture (a texture, a copy of the box that
  changes) and redraw only what moves, at a low rate (return seconds from
  `frame`, see above), and nothing for a band that is off screen.  Without
  ambient motion, return `false` and cost nothing.
- **One file.** A variant is its one file: plain script, no modules, no build
  step, no dependencies, no network.

## The blog's look: ridgeline

`ridgeline` is `strata`'s header over `sketchbook`'s footer.  What keeps
moving once they are painted:

- **Header: weather over the land.**  The shadows of clouds pass over the
  ridges, and wisps of mist drift along the valleys between the ranges (both
  only deepen, cool or lift the pigment that is there: the paper stays
  paper; on the navy paper the mist is pale).  The wind blows the way the
  post looks (facet `time`: back is left, ahead right), as fast as the post
  is agitated (`post.energy`, 11–28 px a second, faster when angry); worry,
  anger, conflict and bleakness deepen the shadows, hope brightens the light
  between them, a reflective post (and the `fog` sky of `covid19`) has more
  mist, a matter-of-fact one less.  The settled picture is rendered once into
  a texture; a second, small shader draws only the air over it, 12 frames a
  second.  The air fades in over three seconds after the first paint-in and
  goes on through transitions (the wind changes with the post, the clouds do
  not jump).  The drift is two layers of noise each, each starting over once
  a period while it is not shown, so it can run forever without growing
  numbers.  (`air()` and `AMBIENT` in strata.js.)  Only the landscape has air:
  strata's own footer, the section underground, stands still.
- **Footer: the washes flow.**  The watercolour under the drawings is still
  wet: a slow wave runs through it, the colour rising and sinking by some
  10–16 px and gathering in slanted bands that travel with the wave (and
  thinning between them), while the pencil lines stay where they are.  Two
  waves, a long and a short one, run against each other so it does not look
  mechanical; the motion is placed from the middle of the band (the same at
  every width) and only ever moves the washes around where they were painted
  (at the start it is exactly the painted wash, and it fades in over 2.5 s).
  Energy sets the height and the speed, a reflective post is calmer, the
  direction follows `time`.  Wash and pencil are kept as layers once the page
  is painted; a frame puts them together again (the wash in 6 px columns,
  each lifted by the wave, and once more through a moving mask for the
  pooling), 12 frames a second.  (`flowOf()`, `flowWash()` and `air()` in
  sketchbook.js; this also runs for sketchbook's own header.)  The pencil
  drawings never move.

Measured with headless Chrome on a post page at 1400×900, DPR 2 (Apple M5
Max, 25 s each): with the header in view, 12 frames a second, 0.6% of a core
on the main thread and 3.6% of a core for all of Chrome's processes together
(a still page: 0–2.6%); with only the footer in view, 1% on the main thread
and 4.6% in all.  `classic` (now throttled to 30 frames a second through the
same mechanism, before at 60) takes 1.4% on the main thread and 8% in all.
Keeping the footer's two layers costs memory: two canvases of the band's
size (about 10 MB each at 1400 px and DPR 2).

## Looking at it

`make serve` serves the site on http://127.0.0.1:5001/ and copies changed
static files within a second.

- `?art=strata` selects another loaded variant (it is remembered,
  `?art=ridgeline` goes back); `?still` shows the finished picture without any
  motion.
- `scripts/art-shot OUT.png '/2026/1/14/minijinja-go-port/?art=strata&still'`
  screenshots a page.  It prints what the page wrote to the console.
