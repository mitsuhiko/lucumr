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
| `generator/social_art.js` | Draws strata's header for the social preview cards in Node, with a Skia canvas (`@napi-rs/canvas`, see `package.json`) instead of a browser; `generator/social_preview.py` sets the card around it. |

The social preview cards (og:image) are light: the header over the title.
Outside a browser there is no WebGL, so strata develops a still picture by day
with `develop()`, the day's fragment shader on the CPU (also used by a browser
without WebGL).  It has to stay in step with `fragmentSource(false)`: compare a
card's band with `scripts/art-shot` of the same post (they differ by about one
level in 255).  The night has no CPU medium.  `make serve` does not make the
cards; `make build` does, again for every post whenever core.js, strata.js or
the stylesheet change (some 80 s on eight cores).

A page carries its record in `<span id="art-post" hidden data-…>` inside
`div.body`, because `div.body` is what htmx swaps: the canvases stay, and the
variant is told about the new post.

Pages that are not posts get a record too, so they are not all drawn alike:

- Markdown pages (`blog/about.md`, `projects.md`, `ai-transparency.md`,
  `404.md`) have a frontmatter with `art: {tags: [...]}` (tags for the
  artwork only: they do not show on the page or in the tag lists) and
  `facets:` like a post's.  `scripts/art-classify.js` classifies pages as well
  as posts.
- Pages rendered from templates (the front page and `/page/N/`, the archive
  with every year and month, the tag cloud, talks) take theirs from
  `PAGES` in `generator/art.py`, picked by the `art_page` the builder passes
  to the template.  Their facets are written by hand, in the frontmatter's
  format.  Their seed comes from the URL, so `/2015/` and `/2016/` differ.
- A tag page draws its tag.  Anything else has no tags: the blog's blues.

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
  (0..1), read from the custom properties of style-2025.css (so a change
  there reaches the artwork): `paper` (`--background-color`), `ink`
  (`--text-color`), `primary`, `secondary`, `header`, `faded`, `border`.
  Derived from them in OKLab, in the hue of the navy (`--header-color`):
  `graphite` (the pencil), `chalk` (white pencil on navy), `shade` (deep
  blue-grey), `sky`, `mist`.  A colour of the page is never written into a
  variant; take it from here.
- `env.invalidate()`: ask for a frame (e.g. from a pointer event).
- `env.util`: `hash`, `rng`, `noise1`, `noise2`, `fbm2`, `clamp`, `lerp`,
  `smoothstep`, `hex`, `css`, `toHex`, `hsl`, the colour helpers below, and
  `gl.program`, `gl.quad`, `gl.texture`.

Colours are mixed in OKLab, where equal steps look equal and lightness is
the lightness one sees: `mix(a, b, t)` (so a pigment mixed with white or the
navy keeps its hue), `blend(colors, weights)`, `lightness(c)` (0..1; use it,
not a weighted sum of RGB), `chroma(c)`, `saturate(c, k)` (chroma scaled, the
lightness kept), `relight(c, L, k)` (the same hue at lightness L),
`tone(like, L, C)` (the hue of `like` at L and C: the blog's blues at any
depth), `lch(L, C, h)`, `lab(c)` and `rgb(lab)`.  Colours outside sRGB give up
chroma, not hue or lightness.

Pigments (the tags' colours, the sun, a jinja red) are given once, for white
paper.  On the navy page they are not repainted in other colours: one rule
turns each into light (see "The dark theme" below).  `glow(c, ground)` is the
light of a pigment; `shine(ground, light, amount, cover)` what that much of it
looks like on the ground; `LIGHT_GLSL` the same `shine()` for a shader;
`shineLayer(canvas, ground)` the same for a whole 2D canvas painted with
light; `tinge(a, b, t)` turns one light towards another without going through
grey.  `gouache(c, lo, hi, keep)` is for lines only (a coloured pencil on the
navy: lifted to between lo and hi, hue kept, chroma times keep).

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
- **Two themes.** Light is white paper and watercolour.  Dark is the navy
  page (`#1b3156`), where pigment does not work at all: there the same
  picture is drawn with light (see "The dark theme" below).  Neither theme
  may change the other's picture.  A switch is not a paint-in: the finished
  picture is redrawn in the other theme in one frame (see above).
- **Sizes.** Header 185px (124px below 800px wide), footer 450px (300px).  Any
  width from 320px to an ultrawide monitor.  Header and footer belong together.
- **Motion.** Paint in once (two or three seconds at most).  A new post
  (`info.initial === false`) is a transition from the old picture, not a cut.
  In strata's header the old colour first soaks into the paper (0.9 s: it
  stays where it is and pales, in patches where the paper drinks first, thin
  pigment before dense, the last of it in the tooth), leaving the old pencil
  drawing; then the new picture paints in as on a first visit, the pencil
  sweeping over the old lines and the washes blooming after it (2.6 s).  A
  post that comes while the colour is still soaking in waits for it.  The
  footers still paint the new picture over the old.
  A post that comes while a picture is still painting in does not finish
  it: what is on the paper at that moment becomes the old picture
  (`flattenSource` in strata.js), and its colour soaks in while the new
  picture already paints in over it, without waiting (in either band;
  sketchbook's footer crossfades from a copy of its canvas as it was).
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

## The dark theme: light instead of pigment

Watercolour works by taking light away from white paper: where pigment lies,
less comes back.  The navy page has no light to take away, and it is a strong
colour itself: whatever is mixed onto it (thinned pigment, gouache, chalk
catching on the paper's tooth) ends up between its own colour and the navy's,
so an orange goes grey, pink and purple both go mauve, and everything painted
is lighter than the paper under a sky that has no light in it.  So the dark
theme does not paint.  It is the same drawing at night:

- **The navy is the dark**, and stays exactly the page's colour wherever
  nothing is lit.  The pencil is chalk (`palette().chalk`, `graphite`); it
  carries the drawing, as it did before.
- **What is a wash by day is light at night.**  Where pigment would lie, light
  is added; where washes overlap, it gets brighter; where pigment would
  collect at a rim, the rim glows.  The layers are painted as they are by day
  (the same shapes from the same random numbers), only their colours go
  through `glow` and the medium is `shine` instead of a multiplication.
- **One rule for every pigment: `glow(c, ground)`.**  The hue is kept.  Light
  is purer than pigment (chroma times 1.33, but held under 0.15: no neon) and
  as bright as its hue is by nature (L 0.66 for a deep blue … 0.8 for a
  yellow), always below the page's text.  Two kinds of pigment would drown in
  the navy and are handled there: a blue near the navy's own hue (within some
  40°) is turned a little further away from it, lighter and purer, so `python`
  and `types` stay two blues; a grey or black (`thoughts`, `unicode`, `flask`)
  has no hue, and grey light on navy is a haze, so it takes the navy's hue:
  moonlight.
- **One rule for light on the ground: `shine(ground, light, amount, cover)`.**
  Lightness adds up as light does (the cubes of OKLab's L add), so a little
  light hardly shows, a glow ends in the navy itself, and no fade passes
  through a grey haze.  The colour is not mixed towards the light's: the
  navy's own chroma leaves as the light comes, and the light's hue is there
  before its brightness is (an ember: dark, but already orange; at
  `SHINE.ember` of the full lightness it has all its chroma).  A light from
  the other side of the colour circle bows out round the grey on the warm
  side (navy, plum, ember, orange: how a sky goes dark).  `cover` is how much
  of the place something stands in: where there is more cover than light, it
  is a silhouette, at most 15% darker than the page, never a hole.  Nothing
  the washes do is lighter than L 0.85 (the text is 0.92).
- **A layer of light** is premultiplied like any canvas: the colour is the
  light, the alpha the cover.  `css(dim(c, k), a)` is `k` of a light over `a`
  of the place; black with an alpha is a silhouette; `destination-out` opens
  the navy again (the mist, a cloud in front of the afterglow).  A shader
  calls `shine()` from `LIGHT_GLSL` per pixel (strata).  A 2D variant paints
  its lights with `screen` into a layer and calls `shineLayer(canvas, paper)`
  once: a shared offscreen WebGL canvas turns the layer into an ordinary one
  that, drawn over the page, gives `shine()` for every pixel (sketchbook; the
  flow then moves that layer as before).  Without WebGL the layer stays as it
  was painted: plain colour, a little duller.

What that makes of the two bands:

- **The landscape (strata's header) is the same land at blue hour.**  The
  sky's light lies along the horizon behind the furthest range, in the
  register's colour (warmed towards a low sun by hope and closeness, through
  rose, not through grey), brightest where the light stands: the sun of a
  `glow` or `burst` sky, else the side the post looks to (`lightAt`).  Overhead
  the navy is the sky, with a few stars, the more the lighter the post's
  heart; none under storm or fog.  Clouds are what hides the light.  Every
  range catches the light along its crest, in its tag's colour, and falls
  into shadow below (`crestLight`); further from where the light stands there
  is less of it.  Snow, the paper left white by day, is the brightest thing
  at night.  The details (trees, fields, a lake, bunting, signs) are small
  lights, painted with the alphas they have by day.
- **The air at night:** the shadows of clouds dim the light they pass over
  (never add grey); the mist veils the light behind it and has a little of
  its own, the navy with the night's blue on it, only where the picture
  stands (the cached picture's alpha says where).
- **The section (strata's footer):** underground the light is in the rock:
  every bed glows along its top and goes dark towards the bed below.
- **The notebook (sketchbook's footer and header):** every wash is a glow
  under the chalk drawing, laid on in glazes as the wash is, the smallest in
  its middle; a wash with an edge has a rim that glows; the wider a wash is
  spread, the fainter (the big washes at the edge of the page are a low
  afterglow, the small ones under the doodles are the accents).  A tinted
  shape (a house, a row of figures) is a lit one.  The grain of the paper is
  in the light only.

strata keeps the two media apart as two pairs of shader programs, one for each
theme, made when the theme is first drawn (`fragmentSource(night)`,
`ambientSource(night)`): the day's source has no line of the night's in it, so
work on the dark theme cannot move a pixel of the light one.  (It could, before:
one more branch in a shared shader changed how the compiler rounded, by one
step in a handful of pixels.)  The first switch to a theme compiles its
programs once, some 20–40 ms.

To check that the light theme is unchanged, shoot the same pages with the old
files and the new ones and compare them pixel by pixel; an old post differs by
a pixel or two from one minute to the next on its own (its paper ages with the
clock), so compare two shots of the same files first.

## The blog's look: ridgeline

`ridgeline` is `strata`'s header over `sketchbook`'s footer.  What keeps
moving once they are painted:

- **Header: weather over the land.**  The shadows of clouds pass over the
  ridges, and wisps of mist drift along the valleys between the ranges (both
  only deepen, cool or lift the pigment that is there: the paper stays
  paper; at night they dim and veil the light, see above).  The wind blows
  the way the post looks (facet `time`: back is left, ahead right), as fast as
  the post
  is agitated (`post.energy`, 7–18 px a second, faster when angry); worry,
  anger, conflict and bleakness deepen the shadows, hope brightens the light
  between them, a reflective post (and the `fog` sky of `covid19`) has more
  mist, a matter-of-fact one less.  The settled picture is rendered once into
  a texture; a second, small shader draws only the air over it, 12 to 30
  frames a second: as few as keep a cloud from moving more than 0.8 CSS px
  between two frames (12 for a calm post, 30 for an angry one; rates that
  divide 60 and 120 Hz, `AIR_RATES`).  The air fades in over three seconds after the first paint-in.  On
  a new post it fades out with the old colour and in again with the new, and
  what it is like (shadows, sun, the valleys the mist lies in) changes while
  none is shown, so no wisp slides up or down; the drift goes on throughout
  and only the wind turns gradually (the clouds do not jump).  The drift is
  two layers of noise each, each starting over once a period while it is not
  shown, so it can run forever without growing numbers.  (`air()` and `AMBIENT` in strata.js.)  Only the landscape has air:
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
Max, 25 s each): with the header in view, 12 frames a second (a calm post),
0.6% of a core on the main thread and 3.6% of a core for all of Chrome's
processes together (a still page: 0–2.6%); with only the footer in view, 1% on the main thread
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
  screenshots a page.  It prints what the page wrote to the console.  The page
  follows the system's theme unless `THEME` says otherwise:
  `THEME=dark scripts/art-shot /tmp/dark.png '/?still'` (or `THEME=light`).
