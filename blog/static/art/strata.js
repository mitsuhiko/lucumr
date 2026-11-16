// Proposal 2: Ridgeline and strata.
//
// The header is a landscape: layered ridges in watercolour with a pencil
// outline, one range per subject tag, the loudest in front, the others fading
// back.  The footer is the same place cut open: a geological section whose
// surface is the front ridge, with one stratum per tag (the loudest deepest),
// each hatched after the conventions of geological maps and after the tag.
//
//   subject tags   what the ridge is (jagged, rolling, billowing, a wall,
//                  buttes, steps, crystals, ink) and how its rock is hatched
//   register tags  the sky and its weather, the soil draped over the section,
//                  and the hand: how loose the line, how wet the wash
//   project tags   a small labelled thing on the ridge, and again as a find
//                  at the bottom of a borehole
//   slug           folds, faults, where everything stands
//   date           snow on the heights in winter; yellowed, foxed paper and
//                  a fainter line for old posts
//   text           code makes dikes, a long text thinner beds (and, for a
//                  post without facets, headings make faults)
//
// The facets (what a classifier read in the text) tell posts with the same
// tags apart; each drives one thing:
//
//   ai           what stands behind the cloud of an `ai` post: its sub-topic's
//                own form in a second pigment (agents: stacked steps in
//                indigo, models: crystals, writing: ink towers, community: a
//                green commons …), and every other `ai` bed in the section
//   mood         the weather: worry and anger a bank of dark cloud (anger
//                with rain), hope a low sun, reflection mist in the valleys,
//                matter-of-fact a ruled horizon, conflict weather on one side
//   valence      value and saturation: a heavy sky and greyed, heavier
//                washes … hardly any sky, clear pigment
//   scale        the viewing distance: a close-up of a few large forms (self)
//                … a wide view of many small ones (society)
//   time         which way everything leans and the beds dip (back: left,
//                ahead: right), where the light stands; looking back also
//                ages the paper
//   tension      how high the land is lifted; in the section the faults,
//                their throw and how tight the folds are
//   certainty    one firm line … a broken one, felt for again beside itself
//   imagery      (only when sure) one motif on the ridge and again in the
//                section: a lake, smoke, a cairn, wind, a wood, a tower going
//                up, a path, a star, veins, people
//   stance       the gesture: plumb lines and a string (builder), spot
//                heights with a note (teacher), strokes of the rubber
//                (critic), driving strokes across the sky (advocate), older
//                paper (witness)
//   actor        who is there: one figure, a group, masts and a wire, a
//                works, boundary posts and a flag; an idea leaves it empty
//   ending       the edge towards the page: a firm ground line (resolved),
//                with a scale (practical), runs of wash down the page (call),
//                a long ragged trailing off and an unfinished section (open)
//   personal     warmth in the air and the sky
//   humor        a stray flourish: a paper plane and the loop it flew
//   technical    how ruled the line is, how fully the hatching is filled in
//   (energy and wander are already in post.energy and post.loose: pressure
//   and hatching, looseness and wetness)
//
// The geometry is drawn with seeded 2D canvases into two layers (wash, pencil)
// in "world" pixels: x from the centre of the band, the band 150 (header) or
// 450 (footer) high.  Everything is placed per cell of the world x axis, so a
// wider band shows more of the same picture.  A fragment shader then turns the
// layers into the medium (wet edges, pigment collecting at the rim,
// granulation, the tooth of the paper) and paints the picture in: the pencil
// first, then the washes.
//
// The dark theme is the same land at night, and its medium is light instead
// of pigment (see ART.md, "Two themes"): the navy page is the dark, the
// pencil is chalk, and what the wash layer holds is added to the navy as
// light (U.glow for every pigment, U.shine in the shader).  The sky's light
// lies along the horizon (nightSky), each range catches it along its crest
// and falls into shadow below, a shade darker than the page (crestLight),
// the beds of the section glow along their tops, and the mist is pale.
(function() {
  'use strict';

  const U = LucumrArt.util;
  const clamp = U.clamp, lerp = U.lerp, smooth = U.smoothstep, mix = U.mix, css = U.css;
  const noise1 = U.noise1, noise2 = U.noise2;
  const HEADER_H = 150, FOOTER_H = 450;
  const DURATION = 2.6;     // painting in: the pencil, then the washes
  // A new post in the header: first the old colour soaks into the paper
  // (LIFT seconds), leaving the old pencil on bare paper, then the new
  // picture paints in.
  const LIFT = 0.9;
  // Frames per second of the air once the picture is painted: as few as keep
  // the clouds from stepping (at most AIR_STEP CSS px a frame), from rates
  // that divide the display's 60 or 120 Hz evenly.
  const AIR_RATES = [12, 15, 20, 30], AIR_STEP = 0.8;
  const TAU = Math.PI * 2;
  const WHITE = [1, 1, 1];

  // ---- what each tag looks like -------------------------------------------
  //
  // [silhouette of the ridge, hatching of the rock, sky (register tags) or a
  // detail on the slopes (subject tags)]
  const STYLES = {
    thoughts: ['rolling', 'dots', 'overcast'],
    life: ['rolling', 'sparse', 'glow'],
    politics: ['jagged', 'hatch', 'storm'],
    business: ['mesa', 'ledger', 'ruled'],
    community: ['rolling', 'crowd', 'birds'],
    culture: ['rolling', 'rings', 'blooms'],
    history: ['rolling', 'laminae', 'faded'],
    announcement: ['cone', 'bursts', 'burst'],
    tutorial: ['terrace', 'steps', 'guides'],
    conferences: ['jagged', 'crowd', 'bunting'],
    covid19: ['rolling', 'sparse', 'fog'],

    python: ['rolling', 'python', 'fields'],
    rust: ['jagged', 'bands', ''],
    ai: ['cloud', 'wavy', ''],
    society: ['rolling', 'made', 'houses'],
    engineering: ['mesa', 'grid', 'construction'],
    opensource: ['rolling', 'sprigs', 'trees'],
    web: ['rolling', 'boxes', 'lanes'],
    tooling: ['mesa', 'grain', ''],
    security: ['wall', 'bricks', ''],
    packaging: ['terrace', 'blocks', ''],
    unicode: ['ink', 'glyphs', ''],
    javascript: ['jagged', 'curls', ''],
    api: ['wall', 'sockets', ''],
    vcs: ['jagged', 'gitgraph', ''],
    types: ['crystal', 'lattice', ''],
    networking: ['jagged', 'nodes', 'masts'],
    databases: ['mesa', 'lanes', ''],
    os: ['mesa', 'shells', ''],
    hardware: ['terrace', 'traces', ''],
    c: ['jagged', 'plus', ''],
    go: ['rolling', 'lanes', 'lanes'],
    async: ['cloud', 'interleave', ''],
    games: ['jagged', 'rings', ''],
    design: ['cone', 'sparse', ''],
    wsgi: ['rolling', 'pipes', '']
  };
  const FALLBACK_ROCKS = ['dots', 'dashes', 'plus', 'pebbles', 'wavy', 'lanes', 'vees', 'hatch'];

  function styleOf(tag) {
    if (tag.style) return tag.style;
    const known = STYLES[tag.name];
    if (known) return known;
    const r = U.rng('strata:' + tag.name);
    const family = tag.loose > 0.58 ? (tag.energy > 0.6 ? 'cloud' : 'rolling')
      : tag.loose < 0.4 ? (tag.energy > 0.5 ? 'jagged' : 'mesa')
        : r.pick(['rolling', 'jagged', 'mesa', 'cone']);
    return [family, r.pick(FALLBACK_ROCKS), ''];
  }

  // No tags (index, about): three calm ranges in the blog's own blues.
  const HOUSE = [
    { name: '~near', house: ['header', 'primary', 0.55], role: 'subject', loose: 0.7, energy: 0.3, weight: 0.4, style: ['rolling', 'lanes', ''] },
    { name: '~mid', house: ['primary', 'paper', 0.25], role: 'subject', loose: 0.75, energy: 0.3, weight: 0.35, style: ['rolling', 'dashes', ''] },
    { name: '~far', house: ['border', 'primary', 0.2], role: 'subject', loose: 0.5, energy: 0.45, weight: 0.25, style: ['jagged', 'dots', ''] }
  ];

  // ---- small things --------------------------------------------------------

  function irand(i, j, s) {
    let h = Math.imul(i | 0, 374761393) ^ Math.imul(j | 0, 668265263) ^ Math.imul(s | 0, 1274126177);
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    h ^= h >>> 16;
    h = Math.imul(h, 2246822507);
    h ^= h >>> 13;
    return (h >>> 0) / 4294967296;
  }
  function cellRng(seed, k) {
    return U.rng((seed ^ Math.imul((k | 0) + 0x632BE5AB, 0x9E3779B1)) >>> 0);
  }
  function memo(fn) {
    const map = new Map();
    return function(k) {
      let v = map.get(k);
      if (v === undefined) { v = fn(k); map.set(k, v); }
      return v;
    };
  }

  // A profile from nodes: cell(k) gives [x, h] pairs inside cell k, in order.
  function piecewise(cw, cell) {
    return function(X) {
      const k = Math.floor(X / cw);
      let a = null;
      for (let c = k - 1; c <= k + 1; c++) {
        const list = cell(c);
        for (let i = 0; i < list.length; i++) {
          const b = list[i];
          if (b[0] >= X) {
            if (!a) return b[1];
            return a[1] + (b[1] - a[1]) * (X - a[0]) / Math.max(1e-6, b[0] - a[0]);
          }
          a = b;
        }
      }
      return a ? a[1] : 0;
    };
  }

  // ---- silhouettes ---------------------------------------------------------
  //
  // Each family returns { h(X) } in 0..A, plus what its details need.

  const FAMILIES = {
    // soft hills
    rolling: function(seed, A, sc, tag) {
      const L = (150 + 190 * tag.loose) * sc;
      return {
        h: function(X) {
          const n = 0.52 * noise1(X / L, seed) + 0.36 * noise1(X / (L * 0.43) + 9.1, seed + 1) + 0.12 * noise1(X / (L * 0.17) + 3.7, seed + 2);
          return A * (0.5 + 0.5 * Math.tanh(2.6 * n));
        }
      };
    },

    // angular peaks: straight lines between peaks, shoulders and valleys
    jagged: function(seed, A, sc, tag) {
      const cw = (78 + 64 * tag.loose) * sc;
      const env = function(X) { return 0.7 + 0.3 * noise1(X / (640 * sc), seed + 11); };
      const raw = memo(function(k) {
        const r = cellRng(seed, k);
        const xp = (k + 0.2 + 0.36 * r()) * cw, e = env(xp);
        return {
          xp: xp, hp: A * e * (0.55 + 0.45 * r()),
          xv: (k + 0.74 + 0.2 * r()) * cw, hv: A * e * (0.04 + 0.24 * r()),
          a: r(), b: r(), c: r(), d: r()
        };
      });
      const cell = memo(function(k) {
        const p = raw(k - 1), q = raw(k);
        const xs = lerp(k * cw, q.xp, 0.2 + 0.5 * q.a);
        const ts = (xs - p.xv) / (q.xp - p.xv);
        const xr = lerp(q.xp, q.xv, 0.3 + 0.4 * q.c);
        const tr = (xr - q.xp) / (q.xv - q.xp);
        return [
          [xs, lerp(p.hv, q.hp, ts) + (q.b - 0.5) * 0.4 * (q.hp - p.hv)],
          [q.xp, q.hp],
          [xr, lerp(q.hp, q.hv, tr) + (q.d - 0.45) * 0.45 * (q.hp - q.hv)],
          [q.xv, q.hv]
        ];
      });
      const line = piecewise(cw, cell);
      const rough = (0.6 + 1.4 * tag.energy) * sc;
      return {
        cw: cw, raw: raw,
        h: function(X) {
          const i = Math.floor(X / (7 * sc)), f = X / (7 * sc) - i;
          return clamp(line(X) + rough * (lerp(irand(i, 3, seed), irand(i + 1, 3, seed), f) - 0.5), 0, A);
        }
      };
    },

    // table mountains and buttes: a cap of hard rock, a cliff under it, scree below
    mesa: function(seed, A, sc, tag) {
      const cw = 112 * sc;
      const base = function(X) { return A * (0.1 + 0.06 * noise1(X / (160 * sc), seed + 2)); };
      const butte = memo(function(k) {
        const r = cellRng(seed, k);
        const big = noise1(k * 0.63, seed + 5) > -0.15;       // mesas stand together, spires between them
        const H = A * (big ? 0.7 + 0.3 * r() : 0.38 + 0.36 * r());
        const ch = H * (0.26 + 0.2 * r());
        return {
          on: r() < 0.82, cx: (k + 0.2 + 0.6 * r()) * cw, H: H, ch: ch,
          wt: (big ? 14 + 44 * r() * r() : 3 + 8 * r()) * sc,     // half the width of the cap
          run: (H - ch) * (0.9 + 0.8 * r()),                      // how far the scree runs out
          tilt: (r() - 0.5) * 0.07
        };
      });
      const one = function(b, X) {
        const d = Math.abs(X - b.cx), side = X > b.cx ? 1 : -1;
        if (d <= b.wt) return b.H + (X - b.cx) * b.tilt;
        const lip = b.H + side * b.wt * b.tilt, e = d - b.wt;
        if (e <= 1.5 * sc) return lip - b.ch * e / (1.5 * sc);
        const t = (e - 1.5 * sc) / b.run;
        return t >= 1 ? 0 : (lip - b.ch) * Math.pow(1 - t, 1.5);
      };
      return {
        cw: cw, butte: butte, one: one,
        h: function(X) {
          let m = base(X);
          const k = Math.floor(X / cw);
          for (let c = k - 2; c <= k + 2; c++) {
            const b = butte(c);
            if (b.on) m = Math.max(m, one(b, X));
          }
          return clamp(m + 0.7 * sc * noise1(X / (6 * sc), seed + 3), 0, A);
        }
      };
    },

    // a wall of rock: level, jointed, cleft
    wall: function(seed, A, sc, tag) {
      const cw = 84 * sc;
      const level = memo(function(k) {
        const q = noise1(k * 0.57, seed + 5), r = irand(k, 7, seed);
        return A * (q < -0.5 ? 0.22 + 0.1 * r : 0.56 + 0.44 * r);
      });
      const raw = memo(function(k) {
        return { xe: (k + 0.2 + 0.6 * irand(k, 9, seed)) * cw, from: level(k - 1), to: level(k) };
      });
      const cell = memo(function(k) {
        const q = raw(k), d = q.to - q.from, m = Math.abs(d);
        if (m < 0.5) return [[q.xe, q.to]];
        const scree = Math.min(0.1 * cw, 0.08 * m), run = 0.03 * m;
        return d > 0
          ? [[q.xe - scree - run, q.from], [q.xe - run, q.from + 0.3 * d], [q.xe, q.to]]
          : [[q.xe, q.from], [q.xe + run, q.to - 0.3 * d], [q.xe + run + scree, q.to]];
      });
      const cleft = memo(function(k) {
        const r = cellRng(seed + 3, k);
        return { on: r() < 0.5, x: (k + r()) * cw, w: (2 + 3 * r()) * sc, depth: 0.25 + 0.4 * r() };
      });
      const line = piecewise(cw, cell);
      return {
        cw: cw, raw: raw,
        h: function(X) {
          let y = line(X) + 0.25 * sc * noise1(X / (7 * sc), seed + 3);
          // joints: small square notches along the top, and here and there a cleft
          if (irand(Math.floor(X / (7 * sc)), 13, seed) < 0.16) y -= 2.6 * sc;
          const k = Math.floor(X / cw);
          for (let c = k - 1; c <= k + 1; c++) {
            const f = cleft(c), d = Math.abs(X - f.x);
            if (f.on && d < f.w) y -= y * f.depth * Math.pow(1 - d / f.w, 0.7);
          }
          return clamp(y, 0, A);
        }
      };
    },

    // steps: stacked slabs, each set in from the one below
    terrace: function(seed, A, sc, tag) {
      const cw = 124 * sc;
      const base = function(X) { return A * (0.08 + 0.04 * noise1(X / (150 * sc), seed + 2)); };
      const stack = memo(function(k) {
        const r = cellRng(seed, k);
        const n = 3 + r.int(4), H = A * (0.5 + 0.5 * r());
        return {
          on: r() < 0.86, cx: (k + 0.2 + 0.6 * r()) * cw, H: H, n: n, riser: H * 0.88 / n,
          top: (5 + 15 * r()) * sc, tread: (6 + 7 * r()) * sc, skew: (r() - 0.5) * 0.5
        };
      });
      const one = function(z, X) {
        // (the steps are a little wider on one side than the other)
        const d = Math.abs(X - z.cx) * (X > z.cx ? 1 + z.skew : 1 - z.skew);
        if (d <= z.top) return z.H;
        const j = Math.floor((d - z.top) / z.tread) + 1;
        return j > z.n ? 0 : z.H - j * z.riser;
      };
      return {
        cw: cw, stack: stack, one: one,
        h: function(X) {
          let m = base(X);
          const k = Math.floor(X / cw);
          for (let c = k - 1; c <= k + 1; c++) {
            const z = stack(c);
            if (z.on) m = Math.max(m, one(z, X));
          }
          return m;
        }
      };
    },

    // billows: towers of cloud, each a heap of circles
    cloud: function(seed, A, sc, tag) {
      const cw = 58 * sc;
      const base = function(X) { return A * (0.16 + 0.18 * (0.5 + 0.5 * noise1(X / (400 * sc), seed))); };
      const puff = memo(function(k) {
        const r = cellRng(seed, k);
        const cx = (k + r()) * cw;
        const big = smooth(-0.5, 0.6, noise1(cx / (260 * sc), seed + 7));     // the towers stand in groups
        const rad = (13 + 30 * r() * big) * sc * (0.55 + A / 120);
        const cy = base(cx) + A * 0.5 * big * r() - rad * 0.3;
        const circles = [{ cx: cx, cy: cy, r: rad }];
        const n = 2 + r.int(3);
        for (let i = 0; i < n; i++) {
          const an = (r() - 0.5) * 2.4, lr = rad * (0.34 + 0.3 * r());
          circles.push({ cx: cx + Math.sin(an) * rad * 0.82, cy: cy + Math.cos(an) * rad * 0.72, r: lr });
        }
        return circles;
      });
      return {
        cw: cw, puff: puff, base: base,
        h: function(X) {
          let m = base(X);
          const k = Math.floor(X / cw);
          for (let c = k - 2; c <= k + 2; c++) {
            const list = puff(c);
            for (let i = 0; i < list.length; i++) {
              const p = list[i], d = X - p.cx;
              if (Math.abs(d) < p.r) m = Math.max(m, p.cy + Math.sqrt(p.r * p.r - d * d));
            }
          }
          return Math.min(m, A);
        }
      };
    },

    // a cluster of prisms with pointed ends
    crystal: function(seed, A, sc, tag) {
      const cw = 30 * sc;
      const env = function(X) { return 0.55 + 0.45 * noise1(X / (380 * sc), seed + 11); };
      const gem = memo(function(k) {
        const r = cellRng(seed, k);
        const cx = (k + 0.5 + (r() - 0.5) * 0.8) * cw, big = r() < 0.38;
        const H = A * env(cx) * (big ? 0.66 + 0.34 * r() : 0.26 + 0.34 * r());
        const w = (big ? 16 + 12 * r() : 8 + 9 * r()) * sc;
        const lean = (r() - 0.5) * (big ? 0.3 : 0.9);
        const tip = Math.min(H * 0.6, w * (0.6 + 0.7 * r())), s = H - tip;
        const edge = (r() - 0.5) * 0.5;    // where the middle edge of the prism runs
        return {
          H: H, cx: cx, w: w, edge: edge,
          pts: [[cx - w / 2, 0], [cx - w / 2 + lean * s, s], [cx + lean * H, H], [cx + w / 2 + lean * s, s], [cx + w / 2, 0]],
          mid: [cx + edge * w + lean * s, s], foot: [cx + edge * w, 0]
        };
      });
      const base = function(X) { return A * (0.1 + 0.05 * noise1(X / (90 * sc), seed + 2)); };
      return {
        cw: cw, gem: gem, base: base,
        h: function(X) {
          let m = base(X);
          const k = Math.floor(X / cw);
          for (let c = k - 3; c <= k + 3; c++) {
            const p = gem(c).pts;
            for (let i = 0; i < 4; i++) {
              const a = p[i], b = p[i + 1];
              const lo = Math.min(a[0], b[0]), hi = Math.max(a[0], b[0]);
              if (X < lo || X > hi || hi - lo < 1e-6) continue;
              m = Math.max(m, a[1] + (b[1] - a[1]) * (X - a[0]) / (b[0] - a[0]));
            }
          }
          return m;
        }
      };
    },

    // karst towers, for the brush
    ink: function(seed, A, sc, tag) {
      const cw = 58 * sc;
      const env = function(X) { return 0.66 + 0.34 * noise1(X / (420 * sc), seed + 11); };
      const tower = memo(function(k) {
        const r = cellRng(seed, k);
        const cx = (k + r()) * cw;
        return { cx: cx, w: (15 + 20 * r()) * sc, H: A * env(cx) * (0.35 + 0.65 * r()), p: 0.4 + 0.45 * r(), on: r() < 0.86 };
      });
      return {
        cw: cw, tower: tower,
        h: function(X) {
          let m = A * (0.07 + 0.05 * noise1(X / (70 * sc), seed + 2));
          const k = Math.floor(X / cw);
          for (let c = k - 2; c <= k + 2; c++) {
            const t = tower(c), d = (X - t.cx) / t.w;
            if (t.on && Math.abs(d) < 1) m = Math.max(m, t.H * Math.pow(1 - d * d, t.p));
          }
          return m;
        }
      };
    },

    // one composed mountain at a time
    cone: function(seed, A, sc, tag) {
      const cw = 430 * sc;
      const peak = memo(function(k) {
        const r = cellRng(seed, k);
        return { cx: (k + 0.25 + 0.5 * r()) * cw, H: A * (0.72 + 0.28 * r()), w: (64 + 40 * r()) * sc };
      });
      return {
        cw: cw, peak: peak,
        h: function(X) {
          let m = A * (0.12 + 0.12 * (0.5 + 0.5 * noise1(X / (190 * sc), seed + 2)));
          const k = Math.floor(X / cw);
          for (let c = k - 1; c <= k + 1; c++) {
            const p = peak(c), d = Math.abs(X - p.cx);
            const crater = p.H * (0.9 + 0.012 * noise1(X / 3, seed + 4));
            m = Math.max(m, Math.min(p.H * Math.exp(-d / p.w) * 1.06, crater));
          }
          return m;
        }
      };
    }
  };
  const FAMILY_SCALE = { rolling: 0.86, jagged: 1, mesa: 0.82, wall: 0.8, terrace: 0.8, cloud: 0.95, crystal: 1.05, ink: 1.1, cone: 1.05 };
  const SNOWY = { jagged: 1, cone: 1, crystal: 0.6, ink: 0.5, rolling: 0.5 };

  // ---- the facets: what the classifier read in the text ---------------------
  //
  // Posts with the same tags share their rock and their pigments; the facets
  // decide the rest.  Everything here has a neutral value, which is what a
  // post without facets (and a tag or index page) gets.

  // The many `ai` posts are told apart by what stands behind the cloud: the
  // sub-topic's own form, in a second pigment.  [silhouette, pigment, detail, loose]
  const AI_FORMS = {
    agents: ['terrace', '#2f3e6b', '', 0.2],        // work stacked up step by step
    models: ['crystal', '#2b3fa0', '', 0.1],        // lattices
    local: ['mesa', '#1f7a55', '', 0.3],            // one's own ground
    society: ['jagged', '#a8233a', '', 0.4],        // a contested range
    community: ['rolling', '#5d8a2f', 'trees', 0.65],   // a commons
    writing: ['ink', '#23262b', '', 0.45],          // ink
    risk: ['jagged', '#3b4856', '', 0.25],          // dark peaks
    business: ['wall', '#8a8f2a', '', 0.3]          // a ledge
  };
  const ZOOM = { self: 1.55, craft: 1.12, community: 0.92, industry: 0.76, society: 0.62 };

  function character(post) {
    const known = !!(post.facets && post.facets.known && post.score && post.share);
    const score = function(name, neutral) { return known ? post.score(name, neutral) : neutral; };
    const share = function(name, label) { return known ? post.share(name, label) : 0; };
    const shares = function(name, labels) {
      const out = {};
      labels.forEach(function(label) { out[label] = share(name, label); });
      return out;
    };
    // scale: the viewing distance, blended by probability (in octaves)
    let zoom = 0, sum = 0;
    Object.keys(ZOOM).forEach(function(label) {
      const p = share('scale', label);
      zoom += p * Math.log(ZOOM[label]);
      sum += p;
    });
    zoom = Math.exp(zoom * Math.min(1, sum) / (sum || 1));
    const end = shares('ending', ['resolved', 'open', 'call', 'practical']);
    const imagery = known && post.top ? post.top('imagery', 0.6) : null;
    const forms = Object.keys(AI_FORMS).map(function(label) { return { label: label, p: share('ai', label) }; })
      .filter(function(f) { return f.p >= 0.2; })
      .sort(function(a, b) { return b.p - a.p; });
    return {
      known: known,
      valence: score('valence', 0.55), tension: score('tension', 0.35), certainty: score('certainty', 0.65),
      personal: score('personal', 0.4), humor: score('humor', 0.2), technical: score('technical', 0.5),
      mood: shares('mood', ['hopeful', 'worried', 'angry', 'reflective', 'playful', 'matter_of_fact', 'conflicted']),
      zoom: zoom,
      lean: share('time', 'future') - share('time', 'past'),     // -1 looks back … 1 looks ahead
      past: share('time', 'past'),
      end: end,
      stance: shares('stance', ['builder', 'teacher', 'critic', 'advocate', 'observer', 'witness']),
      actor: shares('actor', ['individual', 'group', 'company', 'machine', 'state', 'idea']),
      edge: known ? clamp(0.5 + 0.5 * (end.resolved + end.practical) - 0.5 * end.open, 0, 1) : 0.5,
      imagery: imagery === 'none' ? null : imagery,
      forms: forms
    };
  }

  // ---- the air: what keeps moving once the picture is painted ---------------
  //
  // Shadows of clouds pass over the land, and mist drifts along the valleys
  // between the ranges.  Both only lift or deepen the pigment that is there
  // (the paper stays paper), come and go around the painted picture and never
  // add up.  The wind blows the way the post looks (time: back is left, ahead
  // right), as fast as the post is agitated; the mood decides how much mist
  // there is and how deep the shadows are.
  function air(post, C, ridges, skyKind, seed) {
    const m = C.mood;
    const dir = C.lean > 0.12 ? 1 : C.lean < -0.12 ? -1 : (irand(seed, 3, 7) < 0.5 ? -1 : 1);
    const gloom = clamp(0.9 * m.worried + 0.7 * m.angry + 0.5 * m.conflicted + 1.5 * Math.max(0, 0.4 - C.valence), 0, 1);
    const light = clamp(0.95 * m.hopeful + 0.5 * m.playful + 1.5 * Math.max(0, C.valence - 0.72), 0, 1);
    const wind = lerp(7, 18, post.energy) * (1 + 0.3 * m.angry);
    const heights = ridges.slice(1).concat(ridges.slice(0, 1)).map(function(r) { return r.yMist; }).slice(0, 4);
    while (heights.length < 4) heights.push(-1000);
    return {
      wind: dir * wind,                       // world px per second, the shadows
      drift: dir * wind * 0.65,               // the mist, a little slower
      shadow: clamp(0.36 + 0.2 * gloom + 0.08 * C.tension - 0.08 * light, 0.3, 0.56),
      sun: 0.15 + 0.12 * light,               // how much the gaps between the clouds brighten
      mist: clamp(0.52 + 0.35 * m.reflective + (skyKind === 'fog' ? 0.25 : 0) + 0.15 * m.worried - 0.15 * m.matter_of_fact, 0.4, 0.9),
      heights: heights
    };
  }

  // ---- the scene: what follows from the post alone -------------------------

  function buildScene(post) {
    const seed = post.seed | 0;
    const house = !post.tags.length;
    const lead = house ? HOUSE : post.lead;
    const subjects = lead.filter(function(t) { return t.role === 'subject'; });
    const registers = house ? [] : post.tags.filter(function(t) { return t.role === 'register'; });
    const leadRegisters = lead.filter(function(t) { return t.role === 'register'; });
    const projects = house ? [] : post.tags.filter(function(t) { return t.role === 'project'; });

    // Who gets a ridge: the subjects; without any, whatever there is.
    let fronts = subjects.length ? subjects : lead.filter(function(t) { return t.role !== 'project'; });
    if (!fronts.length) fronts = lead.slice();
    // (With subjects about, the register tags are the sky, the soil and the hand.)
    const list = fronts.map(function(t) { return { tag: t, echo: false }; });
    const C = character(post);

    // `ai`: what part of it the post is about stands behind the cloud.
    const ai = house ? null : fronts.find(function(t) { return t.name === 'ai'; });
    const forms = !ai ? [] : C.forms.map(function(f) {
      const form = AI_FORMS[f.label];
      return {
        p: f.p,
        tag: {
          name: 'ai:' + f.label, role: 'subject', rgb: mix(ai.rgb, U.hex(form[1]), 0.86), weight: ai.weight,
          loose: form[3], energy: ai.energy, style: [form[0], 'wavy', form[2]]
        }
      };
    });
    // A landscape wants depth: fewer than three tags are echoed further back
    // (a wide view, `scale` towards society, has one range more).
    const want = Math.max(3, Math.min(5, list.length + (C.zoom < 0.8 ? 1 : 0) + (forms.length && forms[0].p >= 0.4 ? 1 : 0)));
    for (let i = 0; list.length < want; i++) {
      const form = forms[i];
      if (form) list.push({ tag: form.tag, echo: false, form: form.p });
      else list.push({ tag: fronts[i % fronts.length], echo: true });
    }

    const date = post.date;
    // snow: from the season (0 is new year)
    const season = typeof post.season === 'number' ? post.season : date ? date.getUTCMonth() / 12 : null;
    const snow = season === null ? 0 : smooth(0.42, 0.95, 0.5 + 0.5 * Math.cos(TAU * (season - 0.04)));
    const sky = registers[0] || null;
    const skyKind = sky ? styleOf(sky)[2] || 'overcast' : 'clear';
    let age = date ? smooth(1.5, 19, post.age) : 0;
    if (registers.some(function(t) { return t.name === 'history'; })) age = Math.max(age, 0.7);
    age = Math.max(age, 0.6 * C.past, 0.4 * C.stance.witness);       // looking back, remembering: older paper

    // tension lifts the land; scale is how near we stand
    const relief = clamp(1 + (C.tension - 0.35) * 0.9, 0.78, 1.42);
    const hand = {
      loose: post.loose, energy: post.energy,
      // technical: ruled and measured … free
      wobble: (0.12 + 0.3 * post.loose + 1.5 * post.loose * post.loose) * lerp(1.3, 0.7, C.technical),
      width: 0.8 + 0.35 * post.energy,
      // certainty: one firm line … a searched, overdrawn one
      firm: C.certainty,
      press: (0.6 + 0.4 * post.energy) * (1 - 0.3 * age) * lerp(0.86, 1.1, C.certainty)
    };

    const n = list.length;
    const ridges = list.map(function(item, i) {
      const tag = item.tag, style = styleOf(tag);
      const t = n > 1 ? i / (n - 1) : 0;
      const family = FAMILIES[style[0]] ? style[0] : 'rolling';
      const A = lerp(70, 40, t) * (0.8 + 0.4 * tag.energy) * FAMILY_SCALE[family] * (item.echo ? 0.85 : 1) *
        relief * (0.88 + 0.12 * C.zoom);
      const sc = lerp(1, 0.6, t) * C.zoom;
      const rseed = (U.hash(seed + ':ridge:' + i + ':' + tag.name)) | 0;
      const prof = FAMILIES[family](rseed, A, sc, tag);
      // where the crest runs on average, so every family sits at its depth
      let mean = 0;
      for (let X = -800; X < 800; X += 16) mean += prof.h(X) / 100;
      const crest = Math.max(lerp(80, 32, t), 6 - mean + A * 0.92);       // (a tall far range sits lower)
      return {
        i: i, t: t, tag: tag, family: family, detail: style[2], echo: item.echo, form: item.form || 0,
        seed: rseed, A: A, sc: sc, prof: prof,
        yBase: crest + mean,
        yTop: crest + mean - A,
        yMist: family === 'ink' ? crest + mean + 8 : crest + Math.max(mean, A * 0.4) + lerp(38, 16, t)
      };
    });

    // The ground: the surface follows the front ridge, flatter.
    const front = ridges[0];
    const surface = function(X) { return 158 - 1.4 * front.prof.h(X) * Math.min(1, 64 * clamp(relief, 0.8, 1.22) / front.A); };
    const drapes = [];
    let depth = 0;
    (subjects.length ? leadRegisters.slice().reverse() : []).forEach(function(tag, i) {
      const th = tag.name === 'thoughts' ? 13 : 10;
      drapes.push({ tag: tag, style: styleOf(tag), d0: depth, d1: depth + th, seed: (U.hash(seed + ':drape:' + i)) | 0 });
      depth += th;
    });
    if (!drapes.length) depth = 3.5;
    const drapeDepth = depth;

    const rocks = (subjects.length ? subjects : fronts).slice().reverse();   // the loudest lies deepest
    const total = rocks.reduce(function(acc, t) { return acc + t.weight; }, 0) || 1;
    const SPAN = 330;
    let v = 0;
    const fr = post.rng('folds');
    const words = post.stats.words || 600;
    const bedScale = lerp(1.25, 0.7, smooth(300, 4000, words)) * lerp(1, C.zoom, 0.7);
    const strata = rocks.map(function(tag, i) {
      const th = SPAN * (0.42 / rocks.length + 0.58 * tag.weight / total);
      const r = post.rng('beds:' + i);
      const first = i === 0, last = i === rocks.length - 1;
      const v0 = first ? -260 : v, v1 = last ? 900 : v + th;
      const beds = [];
      let b = v0;
      while (b < v1) {
        const next = Math.min(v1, b + (first && b < 0 ? 70 : r.range(16, 44) * bedScale));
        beds.push({ v0: b, v1: v1 - next < 9 ? v1 : next, tone: r.range(0.5, 1.2), hue: r.range(-1, 1) });
        b = beds[beds.length - 1].v1;
      }
      v += th;
      return {
        tag: tag, style: styleOf(tag), v0: v0, v1: v1, top: first ? null : v0, beds: beds, seed: (U.hash(seed + ':rock:' + i)) | 0,
        form: tag === ai && forms.length ? forms[0] : null
      };
    });
    // Tags past the fifth only tint: thin seams between the beds.
    const seams = (house ? [] : post.rest).map(function(tag, i) {
      return { tag: tag, v: SPAN * (0.18 + 0.66 * ((i * 0.618 + fr()) % 1)) };
    });

    const fold = {
      a0: 16 + 22 * fr(), a1: (16 + 40 * fr() * (0.6 + 0.8 * post.energy)) * (C.known ? 0.6 + 1.1 * C.tension : 1),
      l1: (330 + 380 * fr()) * C.zoom, a2: 3 + 6 * fr(),
      shear: (fr() - 0.5) * 0.9, s0: (seed + 300) | 0, s1: (seed + 301) | 0, s2: (seed + 302) | 0,
      dip: 46 * C.lean          // the beds dip the way the post looks
    };
    const S0 = 132;
    const FC = 430 * Math.pow(C.zoom, 0.8);
    // faults: the conflict in the post (without facets: its headings)
    const faultChance = C.known ? clamp(0.06 + 0.86 * C.tension, 0.06, 0.92)
      : post.shape.length ? clamp(0.25 + 0.09 * post.stats.headings, 0.25, 0.8) : 0.4;
    const slipScale = (0.7 + 0.6 * post.energy) * (C.known ? 0.55 + 1.1 * C.tension : 1);
    const fault = memo(function(c) {
      const r = cellRng(seed + 77, c);
      if (r() > faultChance) return null;
      return {
        x: (c + 0.15 + 0.7 * r()) * FC,
        slope: (r() < 0.5 ? -1 : 1) * (0.18 + 0.35 * r()),
        slip: (r() < 0.5 ? -1 : 1) * (7 + 15 * r()) * slipScale
      };
    });
    const Y = function(x, vv) {
      let y = S0 + vv + fold.a0 * noise1(x / 940, fold.s0) + fold.a1 * noise1((x + fold.shear * vv) / fold.l1, fold.s1) +
        fold.a2 * noise1(x / 91 + vv * 0.004, fold.s2) - fold.dip * Math.tanh(x / 620);
      const kc = Math.floor(x / FC);
      for (let c = kc - 2; c <= kc + 2; c++) {
        const f = fault(c);
        if (!f) continue;
        const d = x - (f.x + f.slope * (y - 130));
        y += (d > 0 ? 0.5 : -0.5) * f.slip * Math.exp(-Math.abs(d) / 300);
      }
      return y;
    };
    const DC = 610;
    const codeShare = post.stats.code / (post.stats.code + post.stats.words / 9 + 1);
    const dike = memo(function(c) {
      const r = cellRng(seed + 131, c);
      if (r() > clamp(codeShare * 1.6, 0, 0.7)) return null;
      return { x: (c + 0.2 + 0.6 * r()) * DC, slope: (r() - 0.5) * 0.5, w: 2.5 + 3 * r(), top: 190 + 130 * r(), seed: (seed + c * 13) | 0 };
    });

    // Project tags: a marker on the ridge, a borehole and a find below it.
    const sr = post.rng('signs');
    const signs = projects.slice(0, 3).map(function(tag, i) {
      let x = (sr() - 0.5) * 300 + (i - (Math.min(projects.length, 3) - 1) / 2) * 120;
      // onto a height nearby
      let best = x, top = -1;
      for (let d = -50; d <= 50; d += 2) {
        const h = front.prof.h(x + d);
        if (h > top) { top = h; best = x + d; }
      }
      return { tag: tag, x: best, depth: 150 + 130 * sr(), seed: (U.hash(seed + ':sign:' + i)) | 0 };
    });

    return {
      seed: seed, house: house, hand: hand, ridges: ridges, sky: sky, skyKind: skyKind, registers: registers,
      snow: snow, age: age, signs: signs, C: C, air: air(post, C, ridges, skyKind, seed),
      actorX: (post.rng('actor')() - 0.5) * 260,
      motif: C.imagery ? { kind: C.imagery, x: (post.rng('motif')() - 0.5) * 320, seed: (U.hash(seed + ':motif')) | 0 } : null,
      shear: 0.4 * C.lean,          // the forms lean the way the post looks: back or ahead
      ground: {
        surface: surface, drapes: drapes, drapeDepth: drapeDepth, strata: strata, seams: seams, Y: Y, S0: S0,
        fault: fault, FC: FC, dike: dike, DC: DC,
        clip: function(X) { return surface(X) + drapeDepth; }
      }
    };
  }

  // ---- drawing tools -------------------------------------------------------

  function clearLayer(ctx) {
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = 'source-over';
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.restore();
  }
  function blit(dst, src, alpha) {
    dst.save();
    dst.setTransform(1, 0, 0, 1, 0, 0);
    dst.globalAlpha = alpha === undefined ? 1 : alpha;
    dst.drawImage(src.canvas, 0, 0);
    dst.restore();
  }
  function softBlob(ctx, x, y, rx, ry, color, alpha) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(rx, ry);
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
    g.addColorStop(0, css(color, alpha));
    g.addColorStop(0.5, css(color, alpha * 0.6));
    g.addColorStop(1, css(color, 0));
    ctx.fillStyle = g;
    ctx.fillRect(-1, -1, 2, 2);
    ctx.restore();
  }
  function cells(P, cw, cb, pad) {
    pad = pad || 0;
    for (let k = Math.floor(P.X0 / cw) - pad; k <= Math.floor(P.X1 / cw) + pad; k++) cb(k);
  }

  // The pigment as it goes on this paper: on white as it is, on the navy as
  // light of its hue (U.glow).
  function pigment(P, tag) {
    let c = tag.house ? mix(P.pal[tag.house[0]], P.pal[tag.house[1]], tag.house[2]) : tag.rgb;
    // a bleak post is painted with greyed pigments: the cool grey of the same lightness
    const grey = Math.max(0, 0.6 - P.scene.C.valence) * 0.85;
    if (grey > 0) c = mix(c, U.tone(P.pal.shade, U.lightness(c), 0.012), grey);
    return P.dark ? U.glow(c, P.pal.paper) : c;
  }
  // The same for a colour that is not a tag's (given for white paper).
  function onPaper(P, c) { return P.dark ? U.glow(c, P.pal.paper) : c; }
  // On the navy the wash layer holds light: a colour is how much light there
  // is (dim() leaves k of it), the alpha how much of the place is taken.
  function dim(c, k) { return [c[0] * k, c[1] * k, c[2] * k]; }
  function tinted(P, color, amount) { return mix(P.graphite, color, amount === undefined ? 0.3 : amount); }

  // A long pencil line y = fn(X): pressure comes and goes, parts are gone over twice.
  function drawFn(P, fn, o) {
    const ctx = o.ctx || P.pencil;
    const RUN = 12, STEP = o.step || 2;
    const seed = o.seed | 0;
    const wob = o.wobble === undefined ? P.hand.wobble : o.wobble;
    const lo = o.x0 === undefined ? P.X0 : Math.max(P.X0, o.x0), hi = o.x1 === undefined ? P.X1 : Math.min(P.X1, o.x1);
    // certainty: an assertive post gets one firm line, a searching one is
    // felt for: broken, and tried again a little to the side
    const firm = P.hand.firm, doubt = clamp((0.55 - firm) / 0.55, 0, 1);
    const passes = o.retrace === false ? 1 : firm > 0.85 ? 1 : doubt > 0.25 ? (doubt > 0.7 ? 4 : 3) : 2;
    const breaks = (o.breaks || 0) + 0.09 * doubt;
    ctx.save();
    ctx.strokeStyle = css(o.color || P.graphite);
    ctx.lineWidth = (o.width || 1) * P.lw;
    ctx.lineCap = 'butt';
    for (let pass = 0; pass < passes; pass++) {
      const stray = pass > 1 ? (1 + 2.2 * doubt) * (pass === 2 ? 1 : -1.3) : 0;
      for (let X = Math.floor(lo / RUN) * RUN; X < hi; X += RUN) {
        const n = noise1(X / 47 + pass * 13.7, seed + 3);
        if (pass === 1 && n < 0.05) continue;
        if (pass > 1 && noise1(X / 83 + pass * 7.1, seed + 11) < 0.1 - 0.5 * doubt) continue;
        if (breaks && noise1(X / 61 + 5.3, seed + 5 + pass) > 1 - 2 * breaks) continue;
        ctx.globalAlpha = clamp(o.weight * P.hand.press * (pass > 1 ? 0.4 : pass ? 0.55 : passes === 1 && o.retrace !== false ? 1 : 0.8) * (0.78 + 0.34 * n), 0, 1);
        ctx.beginPath();
        let pen = false, py = 0;
        for (let x = Math.max(X, lo); x <= Math.min(X + RUN, hi) + 1e-6; x += STEP) {
          const y = fn(x);
          if (y === null) { pen = false; continue; }
          if (pen && o.jump && Math.abs(y - py) > o.jump) pen = false;
          py = y;
          const xx = x + wob * noise1(x / 19 + pass * 3.1, seed + 7);
          const yy = y + wob * noise1(x / 23 + pass * 5.7, seed + 9) + (pass > 1 ? stray * (0.6 + 0.4 * noise1(x / 70, seed + 13 + pass)) : pass * 0.35);
          if (pen) ctx.lineTo(xx, yy); else { ctx.moveTo(xx, yy); pen = true; }
        }
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  // A short pencil stroke through points; curve: rounded through the midpoints.
  function drawPoly(P, pts, o) {
    const ctx = o.ctx || P.pencil;
    const wob = (o.wobble === undefined ? P.hand.wobble : o.wobble) * 0.7;
    const seed = o.seed | 0;
    ctx.save();
    ctx.strokeStyle = css(o.color || P.graphite);
    ctx.lineWidth = (o.width || 1) * P.lw;
    ctx.lineCap = 'round';
    for (let pass = 0; pass < (o.retrace ? 2 : 1); pass++) {
      ctx.globalAlpha = clamp(o.weight * P.hand.press * (pass ? 0.5 : 1), 0, 1);
      const q = pts.map(function(p, i) {
        return [p[0] + wob * (irand(i, pass, seed) - 0.5) * 2, p[1] + wob * (irand(i, pass + 9, seed) - 0.5) * 2];
      });
      ctx.beginPath();
      ctx.moveTo(q[0][0], q[0][1]);
      if (o.curve && q.length > 2) {
        for (let i = 1; i < q.length - 1; i++) {
          ctx.quadraticCurveTo(q[i][0], q[i][1], (q[i][0] + q[i + 1][0]) / 2, (q[i][1] + q[i + 1][1]) / 2);
        }
        ctx.lineTo(q[q.length - 1][0], q[q.length - 1][1]);
      } else {
        for (let i = 1; i < q.length; i++) ctx.lineTo(q[i][0], q[i][1]);
      }
      if (o.close) ctx.closePath();
      if (o.fill) { ctx.fillStyle = css(o.fill, o.fillAlpha === undefined ? 1 : o.fillAlpha); ctx.fill(); }
      ctx.stroke();
    }
    ctx.restore();
  }

  // Many small marks at once, in three pressures.
  function Batch() {
    this.p = [new Path2D(), new Path2D(), new Path2D()];
    this.d = new Path2D();
  }
  Batch.prototype.seg = function(x0, y0, x1, y1, b) {
    const p = this.p[b === undefined ? 1 : ((b % 3) + 3) % 3];
    p.moveTo(x0, y0);
    p.lineTo(x1, y1);
  };
  Batch.prototype.poly = function(pts, b, close) {
    const p = this.p[b === undefined ? 1 : ((b % 3) + 3) % 3];
    p.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) p.lineTo(pts[i][0], pts[i][1]);
    if (close) p.closePath();
  };
  Batch.prototype.dot = function(x, y) {
    this.d.moveTo(x, y);
    this.d.lineTo(x + 0.01, y + 0.01);
  };
  Batch.prototype.flush = function(P, color, weight, width, ctx) {
    ctx = ctx || P.pencil;
    ctx.save();
    ctx.strokeStyle = css(color);
    ctx.lineCap = 'round';
    ctx.lineWidth = (width || 1) * P.lw;
    const levels = [0.6, 0.8, 1];
    for (let i = 0; i < 3; i++) {
      ctx.globalAlpha = clamp(weight * P.hand.press * levels[i], 0, 1);
      ctx.stroke(this.p[i]);
    }
    ctx.lineWidth = (width || 1) * P.lw * 1.7;
    ctx.globalAlpha = clamp(weight * P.hand.press, 0, 1);
    ctx.stroke(this.d);
    ctx.restore();
  };

  // Lettering by hand, one stroke at a time: [advance, strokes...] on a grid
  // with the baseline at 0, the x-height at 4, ascenders at 7.
  const LETTERS = {
    a: [4.8, [[3.2, 3], [2, 4], [0.8, 3.6], [0.2, 2], [0.8, 0.4], [2, 0], [3.2, 1]], [[3.2, 4], [3.2, 0.6], [3.9, 0]]],
    d: [4.8, [[3.2, 3], [2, 4], [0.8, 3.6], [0.2, 2], [0.8, 0.4], [2, 0], [3.2, 1]], [[3.2, 7], [3.2, 0.6], [3.9, 0]]],
    e: [4.4, [[0.4, 2.1], [3.3, 2.2], [3.1, 3.4], [2, 4], [0.8, 3.5], [0.3, 2], [0.8, 0.5], [2, 0], [3.3, 0.8]]],
    f: [3.4, [[3, 6.6], [2.2, 7], [1.4, 6.2], [1.4, 0]], [[0.3, 4], [2.8, 4]]],
    g: [4.8, [[3.2, 3], [2, 4], [0.8, 3.6], [0.2, 2], [0.8, 0.4], [2, 0], [3.2, 1]], [[3.2, 4], [3.2, -1.8], [2.2, -3], [0.8, -2.6]]],
    i: [2.4, [[1, 4], [1, 0]], [[1, 5.6], [1.1, 5.9]]],
    j: [2.8, [[1.4, 4], [1.4, -2], [0.6, -3], [-0.2, -2.6]], [[1.4, 5.6], [1.5, 5.9]]],
    k: [4.2, [[0.6, 7], [0.6, 0]], [[3, 4], [0.6, 1.6]], [[1.5, 2.4], [3.2, 0]]],
    l: [2.4, [[0.8, 7], [0.8, 0.6], [1.5, 0]]],
    n: [4.4, [[0.6, 4], [0.6, 0]], [[0.6, 2.8], [1.8, 4], [2.9, 3.4], [3.1, 2], [3.1, 0]]],
    o: [4.6, [[2, 4], [0.7, 3.4], [0.3, 2], [0.8, 0.5], [2, 0], [3.2, 0.6], [3.6, 2], [3.2, 3.5], [2, 4]]],
    p: [4.6, [[0.6, 4], [0.6, -3]], [[0.6, 3], [1.8, 4], [3, 3.4], [3.4, 2], [3, 0.6], [1.8, 0], [0.6, 0.9]]],
    r: [3.5, [[0.6, 4], [0.6, 0]], [[0.6, 2.6], [1.6, 3.8], [2.8, 3.8]]],
    s: [4, [[3, 3.4], [2, 4], [0.9, 3.6], [0.7, 2.7], [1.8, 2], [2.9, 1.4], [2.9, 0.5], [1.8, 0], [0.5, 0.6]]],
    t: [3.6, [[1.4, 6], [1.4, 0.8], [2, 0], [2.8, 0.3]], [[0.3, 4], [2.8, 4]]],
    y: [4.2, [[0.4, 4], [1.9, 0.2]], [[3.4, 4], [1.6, -1.2], [0.8, -2.8], [0, -2.6]]]
  };
  function letter(P, text, x, y, u, o) {
    let cx = x;
    for (let c = 0; c < text.length; c++) {
      const g = LETTERS[text[c]];
      if (!g) { cx += 3 * u; continue; }
      for (let s = 1; s < g.length; s++) {
        drawPoly(P, g[s].map(function(p) { return [cx + (p[0] + 0.2 * p[1]) * u, y - p[1] * u]; }), {
          weight: o.weight, color: o.color, seed: o.seed + c * 7 + s, curve: true, wobble: 0.25, width: 0.85
        });
      }
      cx += g[0] * u;
    }
    return cx;
  }

  // ---- the header: sky and ridges ------------------------------------------

  function paintSky(P) {
    const sc = P.scene, w = P.wash, kind = sc.skyKind, seed = sc.seed;
    // the register's pigment, well thinned with the grey of the air
    const thin = function(c) {
      if (P.dark) return U.tinge(c, onPaper(P, [0.92, 0.72, 0.48]), 0.5 * P.warmth);
      c = mix(c, kind === 'storm' ? U.tone(P.pal.shade, 0.4, 0.035) : U.tone(P.pal.sky, 0.72, 0.04), kind === 'storm' ? 0.6 : 0.4);
      return mix(c, [0.92, 0.72, 0.48], 0.5 * P.warmth);
    };
    const base = sc.sky ? thin(pigment(P, sc.sky)) : P.dark ? thin(P.air) : P.air;
    const second = sc.registers[1] ? thin(pigment(P, sc.registers[1])) : null;
    const strength = { clear: 0.11, overcast: 0.19, glow: 0.2, storm: 0.3, ruled: 0.13, birds: 0.15, blooms: 0.1, faded: 0.16, burst: 0.14, guides: 0.11, bunting: 0.14, fog: 0.2 }[kind] || 0.14;
    // valence: a bleak post has a heavy sky, a joyful one hardly any
    const a = strength * lerp(1.8, 0.5, sc.C.valence);
    const flat = kind === 'ruled' || kind === 'guides';

    if (P.dark) {
      nightSky(P, base, second, strength);
    } else {
      // a graded wash from the top edge
      const g = w.createLinearGradient(0, 0, 0, 84);
      g.addColorStop(0, css(base, a));
      g.addColorStop(0.45, css(base, a * 0.6));
      g.addColorStop(1, css(base, 0));
      w.fillStyle = g;
      w.fillRect(P.X0, -2, P.X1 - P.X0, 88);
      if (second) {
        cells(P, 170, function(k) {
          const r = cellRng(seed + 41, k);
          softBlob(w, (k + r()) * 170, 6 + 30 * r(), 70 + 60 * r(), 12 + 14 * r(), second, a * 0.9);
        }, 1);
      }
    }
    // clouds: paper left open, a little pigment pooled underneath
    if (!flat) {
      cells(P, 84, function(k) {
        const r = cellRng(seed + 43, k);
        const x = (k + r()) * 84, y = 4 + 40 * r(), rx = 36 + 70 * r(), ry = 5 + 11 * r();
        if (r() < (kind === 'clear' ? 0.45 : 0.75)) {
          w.globalCompositeOperation = 'destination-out';
          softBlob(w, x, y, rx, ry, WHITE, 0.55 + 0.4 * r());
          w.globalCompositeOperation = 'source-over';
          if (kind === 'overcast' || kind === 'storm' || kind === 'faded') softBlob(w, x + 8, y + ry * 0.9, rx * 0.8, ry * 0.7, base, a * 0.7);
        }
      }, 2);
    }

    if (kind === 'storm') {
      // (at night a cloud is what hides the light: it covers, and shines very little)
      const dark = P.dark ? dim(base, 0.12) : mix(base, P.pal.shade, 0.55);
      cells(P, 120, function(k) {
        const r = cellRng(seed + 45, k);
        softBlob(w, (k + r()) * 120, 2 + 16 * r(), 60 + 70 * r(), 10 + 16 * r(), dark, 0.2 + 0.25 * r());
      }, 1);
      // rain, pressed hard
      const B = new Batch();
      cells(P, 22, function(k) {
        const r = cellRng(seed + 47, k);
        if (noise1(k * 0.23, seed + 49) < -0.05) return;
        const n = 2 + r.int(3);
        for (let i = 0; i < n; i++) {
          const x = (k + r()) * 22, y = 8 + 44 * r(), len = 9 + 12 * r();
          B.seg(x, y, x - len * 0.38, y + len, r.int(3));
        }
      });
      B.flush(P, tinted(P, base, 0.35), 0.5, 1);
    } else if (kind === 'glow' || kind === 'burst') {
      // one sun, near the middle (the next is a long way off)
      const sun = pigment(P, sc.sky);
      cells(P, 3600, function(k) {
        const r = cellRng(seed + 51, k);
        const x = k * 3600 + (r() - 0.5) * 560, y = kind === 'glow' ? 34 + 8 * r() : 22 + 8 * r(), rad = kind === 'glow' ? 9 : 7;
        softBlob(w, x, y, 70, 32, sun, 0.3);
        if (kind === 'glow') {
          // the sun is the paper
          w.globalCompositeOperation = 'destination-out';
          softBlob(w, x, y, rad * 1.5, rad * 1.5, WHITE, 1);
          w.globalCompositeOperation = 'source-over';
          if (P.dark) softBlob(w, x, y, rad, rad, mix(sun, WHITE, 0.5), 0.8);
          drawPoly(P, circle(x, y, rad, 0.2, TAU - 0.5, 14), { weight: 0.3, seed: seed + k, curve: true, color: tinted(P, sun, 0.5) });
        } else {
          w.fillStyle = css(sun, 0.75);
          w.beginPath();
          w.arc(x, y, rad, 0, TAU);
          w.fill();
          const B = new Batch();
          for (let i = 0; i < 14; i++) {
            const an = i / 14 * TAU + 0.2 * r(), r0 = rad + 4 + 2 * r(), r1 = r0 + 6 + 12 * r();
            B.seg(x + Math.cos(an) * r0, y + Math.sin(an) * r0, x + Math.cos(an) * r1, y + Math.sin(an) * r1, r.int(3));
          }
          B.flush(P, tinted(P, sun, 0.6), 0.55, 1);
          drawPoly(P, circle(x, y, rad, 0, TAU, 14), { weight: 0.45, seed: seed + k, curve: true, color: tinted(P, sun, 0.5) });
        }
      }, 1);
    } else if (kind === 'blooms') {
      cells(P, 96, function(k) {
        const r = cellRng(seed + 53, k);
        const x = (k + r()) * 96, y = 8 + 34 * r(), rad = 14 + 20 * r();
        softBlob(w, x, y, rad * 1.3, rad, base, 0.26);
        w.globalCompositeOperation = 'destination-out';
        softBlob(w, x + 2, y + 1, rad * 0.7, rad * 0.55, WHITE, 0.5);    // the backrun: pigment pushed to the rim
        w.globalCompositeOperation = 'source-over';
      }, 1);
    } else if (kind === 'ruled' || kind === 'guides') {
      const color = tinted(P, base, 0.45);
      const levels = kind === 'ruled' ? [13, 22, 31] : sc.ridges.map(function(R) { return R.yTop + 2; }).concat([8]);
      levels.forEach(function(y, i) {
        drawFn(P, function() { return y; }, { weight: 0.2, seed: seed + i * 5, wobble: 0.1, color: color, retrace: false, breaks: 0.06, width: 0.8 });
      });
      const B = new Batch();
      if (kind === 'ruled') cells(P, 48, function(k) { B.seg(k * 48, 10, k * 48, 34, 0); });
      B.flush(P, color, kind === 'ruled' ? 0.22 : 0.42, 0.8);
    } else if (kind === 'birds') {
      const B = new Batch();
      cells(P, 430, function(k) {
        const r = cellRng(seed + 55, k);
        const cx = (k + 0.2 + 0.6 * r()) * 430, cy = 16 + 14 * r(), n = 9 + r.int(9);
        for (let i = 0; i < n; i++) {
          const x = cx + r.gauss() * 26 + i * 1.5, y = cy + r.gauss() * 6 - Math.abs(r.gauss()) * 2, s = 1.6 + 1.4 * r();
          B.poly([[x - s, y - s * 0.5], [x, y], [x + s, y - s * 0.6]], r.int(3));
        }
      }, 1);
      B.flush(P, tinted(P, base, 0.35), 0.6, 0.9);
    } else if (kind === 'bunting') {
      cells(P, 360, function(k) {
        const r = cellRng(seed + 57, k);
        const xa = (k + 0.1 + 0.2 * r()) * 360, xb = xa + 150 + 120 * r(), ya = 9 + 9 * r(), yb = 9 + 9 * r(), sag = 9 + 8 * r();
        const at = function(t) { return [lerp(xa, xb, t), lerp(ya, yb, t) + sag * 4 * t * (1 - t)]; };
        const line = [];
        for (let i = 0; i <= 16; i++) line.push(at(i / 16));
        drawPoly(P, line, { weight: 0.4, seed: seed + k, curve: true });
        const n = Math.floor((xb - xa) / 8);
        for (let i = 1; i < n; i++) {
          const p = at(i / n), c = pigment(P, sc.registers[i % sc.registers.length]);
          w.fillStyle = css(i % 3 === 1 ? mix(c, WHITE, 0.3) : c, 0.7);
          w.beginPath();
          w.moveTo(p[0] - 1.8, p[1] + 0.3);
          w.lineTo(p[0] + 1.8, p[1] + 0.3);
          w.lineTo(p[0] + 0.3 * (r() - 0.5), p[1] + 5);
          w.fill();
        }
      }, 1);
    }
  }

  // Where the light stands at night: the sun of a `glow` or `burst` sky, else
  // the side the post looks to (where paintMood has its low sun).  One every
  // LIGHTS world pixels, the one in the middle near the middle.
  const LIGHTS = 3600;
  function lightAt(P, k) {
    const sc = P.scene, C = sc.C;
    if (sc.skyKind === 'glow' || sc.skyKind === 'burst') return k * LIGHTS + (cellRng(sc.seed + 51, k)() - 0.5) * 560;
    const side = C.lean !== 0 ? (C.lean > 0 ? 1 : -1) : (irand(sc.seed, 1, 5) < 0.5 ? -1 : 1);
    return k * LIGHTS + side * (150 + 190 * cellRng(sc.seed + 205, k)());
  }

  // The sky at night.  Its light lies along the horizon, behind the furthest
  // range, brightest where the light stands (the day has gone down there, or
  // the moon is about to come up), and is gone overhead: there the navy is
  // the sky, with a few stars, the more the lighter the post's heart.
  function nightSky(P, base, second, strength) {
    const sc = P.scene, w = P.wash, seed = sc.seed, C = sc.C, m = C.mood;
    const far = sc.ridges[sc.ridges.length - 1], yh = far.yTop + far.A * 0.7;
    const gloom = clamp(0.9 * m.worried + 0.7 * m.angry + 0.5 * m.conflicted + 1.5 * Math.max(0, 0.4 - C.valence), 0, 1);
    const a = clamp((0.2 + 1.2 * strength) * lerp(0.7, 1.2, C.valence), 0, 0.7);
    const g = w.createLinearGradient(0, yh - 60, 0, yh + 44);
    [[0, 0], [0.25, 0.07], [0.42, 0.3], [0.56, 0.75], [0.66, 1], [0.8, 0.6], [1, 0]].forEach(function(s) {
      g.addColorStop(s[0], css(base, a * s[1]));
    });
    w.fillStyle = g;
    w.fillRect(P.X0, yh - 60, P.X1 - P.X0, 104);
    cells(P, LIGHTS, function(k) { softBlob(w, lightAt(P, k), yh + 4, 330, 30, base, a * 0.8); }, 1);
    if (second) {
      cells(P, 170, function(k) {
        const r = cellRng(seed + 41, k);
        softBlob(w, (k + r()) * 170, yh - 22 + 24 * r(), 70 + 60 * r(), 8 + 9 * r(), second, a * 0.7);
      }, 1);
    }
    const clear = clamp(1.15 - 1.3 * gloom - (sc.skyKind === 'fog' || sc.skyKind === 'storm' ? 0.6 : sc.skyKind === 'overcast' ? 0.25 : 0), 0, 1);
    if (clear > 0.05) {
      const star = mix(P.pal.chalk, base, 0.25);
      cells(P, 40, function(k) {
        const r = cellRng(seed + 67, k);
        const n = r() < 0.75 * clear ? 1 + (r() < 0.3 * clear ? 1 : 0) : 0;
        for (let i = 0; i < n; i++) {
          const x = (k + r()) * 40, y = 3 + (yh - 12) * Math.pow(r(), 1.3), mag = Math.pow(r(), 2.2);
          w.fillStyle = css(star, clamp(0.3 + 0.6 * mag, 0, 1) * (0.5 + 0.5 * clear));
          w.beginPath();
          w.arc(x, y, 0.45 + 0.5 * mag, 0, TAU);
          w.fill();
        }
      }, 1);
    }
  }

  function circle(x, y, r, a0, a1, n) {
    const pts = [];
    for (let i = 0; i <= n; i++) {
      const a = lerp(a0, a1, i / n);
      pts.push([x + Math.cos(a) * r, y + Math.sin(a) * r]);
    }
    return pts;
  }

  function ridgeLook(P, R) {
    const pig = pigment(P, R.tag), t = R.t;
    // (bleak: heavier washes; bright: lighter)
    const quiet = (R.echo ? 0.72 : R.form ? 0.74 + 0.26 * R.form : 1) * (1 + (0.55 - P.scene.C.valence) * 0.4);
    if (P.dark) {
      // the range's light (less of it further back), and how solid it stands
      const color = dim(pig, lerp(1, 0.6, t) / Math.sqrt(quiet));
      return {
        color: color, alpha: clamp(lerp(0.92, 0.5, t) * quiet, 0, 1), shade: dim(color, 0.45),
        line: mix(P.graphite, pig, 0.3), weight: lerp(0.95, 0.35, t) * quiet
      };
    }
    // (what an `ai` post is about keeps more of its pigment than a mere echo)
    const color = mix(pig, P.air, 0.6 * t * (R.form ? 0.45 : 1));
    return {
      color: color, alpha: lerp(0.56, R.form ? 0.34 : 0.18, Math.pow(t, 0.8)) * quiet * (R.family === 'ink' ? 0.7 : 1), shade: mix(color, U.tone(P.pal.shade, 0.2, 0.041), 0.45),
      line: mix(P.graphite, pig, 0.3), weight: lerp(0.95, 0.32, t) * quiet
    };
  }

  function paintRidge(P, R) {
    const tmp = P.tmp, w = P.wash, hand = P.hand, seed = R.seed;
    const look = ridgeLook(P, R);
    const STEP = 2;
    const x0 = Math.floor(P.X0 / STEP) * STEP - 80, x1 = P.X1 + 80;
    const yOf = function(X) { return R.yBase - R.prof.h(X); };
    const drift = 0.3 + 2.6 * hand.loose;       // the wash does not keep to the line
    const yWash = function(X) { return yOf(X) + drift * noise1(X / 33, seed + 71); };
    const soft = R.family === 'cloud' ? 2.6 : R.family === 'rolling' ? 0.5 + hand.loose : 0;
    const env = { P: P, R: R, look: look, yOf: yOf, yWash: yWash, tmp: tmp };
    // time: everything leans the way the post looks (back: to the left)
    const lean = P.scene.shear, X0 = P.X0, X1 = P.X1;
    if (lean) {
      P.X0 -= 70;
      P.X1 += 70;
      [tmp, w, P.pencil].forEach(function(c) {
        c.save();
        c.transform(1, 0, -lean, 1, lean * R.yBase, 0);
      });
    }
    if (R.family === 'rolling') {
      if (!R.fold) R.fold = FAMILIES.rolling(seed + 99, R.A * 0.8, R.sc * 0.62, R.tag);
      env.yInner = function(X) { return Math.max(yOf(X) + 4 * R.sc, R.yBase - R.fold.h(X) + R.A * 0.3); };
    }

    clearLayer(tmp);
    const sil = new Path2D();
    sil.moveTo(x0, P.H + 10);
    for (let X = x0; X <= x1; X += STEP) sil.lineTo(X, yWash(X));
    sil.lineTo(x1, P.H + 10);
    sil.closePath();

    tmp.save();
    tmp.fillStyle = css(look.color);
    const layers = soft > 0 ? 5 : 1;
    for (let i = 0; i < layers; i++) {
      tmp.save();
      tmp.translate(0, i * soft);
      tmp.globalAlpha = 1 - Math.pow(1 - look.alpha, 1 / layers);
      tmp.fill(sil);
      tmp.restore();
    }
    // a second glaze lower down, so the crest keeps a lighter band
    tmp.globalCompositeOperation = 'source-atop';
    if (R.family === 'rolling') {
      // a nearer fold of the same hills, a shade darker
      const inner = new Path2D();
      inner.moveTo(x0, P.H + 10);
      for (let X = x0; X <= x1; X += STEP) inner.lineTo(X, env.yInner(X) + drift * noise1(X / 29, seed + 73));
      inner.lineTo(x1, P.H + 10);
      inner.closePath();
      tmp.globalAlpha = 0.2;
      tmp.fillStyle = css(look.shade);
      tmp.fill(inner);
    } else if (R.family === 'cloud' || R.family === 'cone') {
      tmp.save();
      tmp.translate(0, 5 + 5 * R.sc + 2 * noise1(R.i * 3.3, seed));
      tmp.rotate(0.004 * noise1(R.i, seed + 1));
      tmp.globalAlpha = 0.22;
      tmp.fillStyle = css(look.shade);
      tmp.fill(sil);
      tmp.restore();
    }
    if (P.dark) crestLight(env, sil);
    const detail = DETAILS[R.family];
    if (detail && detail.wash) detail.wash(env);
    snow(env);
    // mist: the wash runs out towards the valley
    tmp.globalCompositeOperation = 'destination-out';
    tmp.globalAlpha = 1;
    const g = tmp.createLinearGradient(0, R.yTop, 0, R.yMist);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(0.3, 'rgba(0,0,0,0.1)');
    g.addColorStop(0.7, 'rgba(0,0,0,0.6)');
    g.addColorStop(1, 'rgba(0,0,0,1)');
    tmp.fillStyle = g;
    tmp.fillRect(x0, R.yTop - 6, x1 - x0, P.H + 30);
    const misty = R.family === 'cloud' ? 0.95 : P.scene.skyKind === 'fog' ? 0.6 : 0.25 * hand.loose;
    if (misty > 0.05) {
      cells(P, 70, function(k) {
        const r = cellRng(seed + 61, k);
        if (r() > 0.4 + 0.5 * misty) return;
        softBlob(tmp, (k + r()) * 70, R.yBase - R.A * (0.05 + 0.75 * r()), 40 + 90 * r(), 8 + 16 * r(), WHITE, misty * (0.5 + 0.5 * r()));
      }, 2);
    }
    tmp.restore();

    // what lies behind is covered where this ridge is solid
    w.save();
    w.globalCompositeOperation = 'destination-out';
    const lift = w.createLinearGradient(0, R.yTop, 0, R.yMist);
    const cover = R.family === 'cloud' ? 0.55 : 0.92;
    lift.addColorStop(0, 'rgba(0,0,0,' + cover + ')');
    lift.addColorStop(0.55, 'rgba(0,0,0,' + cover * 0.8 + ')');
    lift.addColorStop(1, 'rgba(0,0,0,0)');
    w.fillStyle = lift;
    w.fill(sil);
    w.restore();
    blit(w, tmp);

    // the same for the pencil behind: rub it out, lightly
    P.pencil.save();
    P.pencil.globalCompositeOperation = 'destination-out';
    const rub = P.pencil.createLinearGradient(0, R.yTop, 0, R.yMist);
    rub.addColorStop(0, 'rgba(0,0,0,' + cover * 0.9 + ')');
    rub.addColorStop(0.6, 'rgba(0,0,0,' + cover * 0.6 + ')');
    rub.addColorStop(1, 'rgba(0,0,0,0)');
    P.pencil.fillStyle = rub;
    P.pencil.translate(0, 1.5);
    P.pencil.fill(sil);
    P.pencil.restore();

    if (R.family !== 'ink' && R.family !== 'crystal') {
      // (a cloud has no outline where it is only haze)
      drawFn(P, R.family !== 'cloud' ? yOf : function(X) { return R.prof.h(X) - R.prof.base(X) > 1.5 ? yOf(X) : null; }, {
        seed: seed, weight: look.weight * (R.family === 'cloud' ? 0.6 : 1), color: look.line,
        breaks: R.family === 'cloud' ? 0.4 : 0.05 + 0.14 * hand.loose,
        wobble: R.family === 'mesa' || R.family === 'wall' || R.family === 'terrace' ? hand.wobble * 0.4 : undefined
      });
    }
    if (detail && detail.pencil) detail.pencil(env);
    const extra = EXTRAS[R.detail];
    if (extra && !R.echo) extra(env);
    if (lean) {
      [tmp, w, P.pencil].forEach(function(c) { c.restore(); });
      P.X0 = X0;
      P.X1 = X1;
    }
  }

  // At night a range is lit along its crest, from the sky behind it; below,
  // its body falls into shadow: the light is taken away in steps that follow
  // the crest (what is left of the layer's alpha is the silhouette).
  function crestLight(env, sil) {
    const P = env.P, R = env.R, tmp = env.tmp, n = 18;
    const reach = (R.family === 'cloud' ? 30 : 22) * R.sc + 0.12 * R.A;
    tmp.save();
    tmp.globalCompositeOperation = 'source-atop';
    tmp.fillStyle = '#000';
    for (let i = 0; i < n; i++) {
      tmp.save();
      tmp.translate(0, 1.5 + reach * Math.pow((i + 0.3) / n, 1.4));
      tmp.globalAlpha = 0.135;
      tmp.fill(sil);
      tmp.restore();
    }
    // and less of it the further the range runs from where the light is
    const x0 = P.X0 - 90, x1 = P.X1 + 90, g = tmp.createLinearGradient(x0, 0, x1, 0), stops = Math.ceil((x1 - x0) / 150);
    for (let i = 0; i <= stops; i++) {
      const X = lerp(x0, x1, i / stops), d = (X - lightAt(P, Math.round(X / LIGHTS))) / 800;
      g.addColorStop(i / stops, 'rgba(0,0,0,' + (0.42 * (1 - Math.exp(-d * d))).toFixed(3) + ')');
    }
    tmp.fillStyle = g;
    tmp.fillRect(x0, -20, x1 - x0, P.H + 60);
    tmp.restore();
  }

  // Snow in the winter months: the paper left unpainted on the heights.
  function snow(env) {
    const P = env.P, R = env.R, tmp = env.tmp;
    const s = P.scene.snow * (SNOWY[R.family] || 0) * (1 - 0.4 * R.t);
    if (s < 0.08) return;
    const line = R.A * (1 - 0.62 * s);
    const path = new Path2D();
    let top = [], bottom = [];
    const close = function() {
      if (top.length > 2) {
        path.moveTo(top[0][0], top[0][1]);
        for (let i = 1; i < top.length; i++) path.lineTo(top[i][0], top[i][1]);
        for (let i = bottom.length - 1; i >= 0; i--) path.lineTo(bottom[i][0], bottom[i][1]);
        path.closePath();
      }
      top = [];
      bottom = [];
    };
    for (let X = Math.floor(P.X0 / 2) * 2 - 4; X <= P.X1 + 4; X += 2) {
      const d = (R.prof.h(X) - line) * 0.85;
      if (d > 0.6) {
        const y = env.yOf(X);
        top.push([X, y - 3]);
        bottom.push([X, y + d * (R.family === 'rolling' ? 0.5 + 0.2 * noise1(X / 9, R.seed + 5) : 0.45 + 0.75 * irand(Math.floor(X / 4), 5, R.seed)) + 0.5]);
      } else close();
    }
    close();
    tmp.save();
    if (P.dark) {
      // (what is the paper left white by day is the brightest thing at night)
      tmp.globalCompositeOperation = 'source-atop';
      tmp.fillStyle = css(P.pal.chalk, 0.55);
    } else {
      tmp.globalCompositeOperation = 'destination-out';
      tmp.fillStyle = 'rgba(0,0,0,0.88)';
    }
    tmp.fill(path);
    tmp.restore();
  }

  // What each family adds: `wash` on the ridge's own layer (kept inside its
  // silhouette), `pencil` on top.
  const DETAILS = {
    jagged: {
      wash: function(env) {
        const P = env.P, R = env.R, tmp = env.tmp;
        R.spurs = new Map();
        tmp.fillStyle = css(env.look.shade);
        cells(P, R.prof.cw, function(k) {
          const q = R.prof.raw(k), r = cellRng(R.seed + 17, k);
          const xp = q.xp, yp = env.yOf(xp), drop = q.hp - q.hv;
          if (drop < 5) return;
          // the spur: a rib running down from the peak
          const pts = [[xp, yp]];
          const n = 3 + r.int(3), reach = drop * (0.75 + 0.5 * r());
          let x = xp, y = yp;
          for (let i = 0; i < n; i++) {
            x += ((i % 2 ? 1 : -1) * (2.5 + 7 * r()) - 2) * R.sc;
            y += reach / n * (0.7 + 0.6 * r());
            pts.push([x, y]);
          }
          R.spurs.set(k, pts);
          // the side away from the light
          const path = new Path2D();
          path.moveTo(xp, yp - 2);
          for (let X = xp; X <= q.xv; X += 2) path.lineTo(X, env.yWash(X) - 1);
          path.lineTo(q.xv + 2, env.yOf(q.xv) + reach * 0.5);
          for (let i = pts.length - 1; i >= 0; i--) path.lineTo(pts[i][0], pts[i][1]);
          path.closePath();
          tmp.globalAlpha = 0.24 + 0.16 * r();
          tmp.fill(path);
        }, 1);
      },
      pencil: function(env) {
        const P = env.P, R = env.R, B = new Batch();
        cells(P, R.prof.cw, function(k) {
          const pts = R.spurs.get(k);
          if (!pts) return;
          const q = R.prof.raw(k), r = cellRng(R.seed + 19, k);
          drawPoly(P, pts, { weight: env.look.weight * 0.62, color: env.look.line, seed: R.seed + k, retrace: r() < 0.4 });
          // hatching on the shaded face, with the slope
          let dx = q.xv - q.xp, dy = env.yOf(q.xv) - env.yOf(q.xp);
          const len = Math.hypot(dx, dy) || 1;
          dx /= len;
          dy /= len;
          const n = Math.round((3 + 5 * P.hand.energy) * (0.6 + 0.6 * r()));
          for (let i = 0; i < n; i++) {
            const t = (i + 0.3 + 0.5 * r()) / n * (pts.length - 1);
            const a = pts[Math.floor(t)], b = pts[Math.min(pts.length - 1, Math.floor(t) + 1)], f = t - Math.floor(t);
            const sx = lerp(a[0], b[0], f) + 1.2, sy = lerp(a[1], b[1], f) + 0.5;
            const l = Math.min(len * 0.55, (6 + 12 * r()) * R.sc);
            B.seg(sx, sy, sx + dx * l, sy + dy * l, r.int(3));
          }
        }, 1);
        B.flush(P, env.look.line, env.look.weight * 0.5, 0.85);
      }
    },

    rolling: {
      pencil: function(env) {
        const P = env.P, R = env.R, B = new Batch();
        // the nearer fold, where it stands clear of the crest
        drawFn(P, function(X) { const y = env.yInner(X); return y - env.yOf(X) > 4.5 * R.sc ? y : null; }, {
          seed: R.seed + 15, weight: env.look.weight * 0.55, color: env.look.line, breaks: 0.16 + 0.1 * P.hand.loose
        });
        // a few strokes following the fall of the hill
        cells(P, 44 * R.sc, function(k) {
          const r = cellRng(R.seed + 21, k);
          if (r() > 0.25 + 0.4 * P.hand.energy) return;
          const x = (k + r()) * 44 * R.sc;
          const slope = (env.yOf(x + 4) - env.yOf(x - 4)) / 8;
          if (slope < 0.06) return;         // only on the side away from the light
          const n = 2 + r.int(3);
          for (let i = 0; i < n; i++) {
            const sx = x + i * 4 * R.sc, sy = env.yOf(sx) + (4 + 4 * r()) * R.sc, l = (7 + 10 * r()) * R.sc;
            B.poly([[sx, sy], [sx + l * 0.5, sy + l * 0.5 * slope + l * 0.12], [sx + l, sy + l * slope + l * 0.5]], r.int(3));
          }
        });
        B.flush(P, env.look.line, env.look.weight * 0.42, 0.85);
      }
    },

    cloud: {
      pencil: function(env) {
        // curls inside the billows, never a whole outline
        const P = env.P, R = env.R;
        cells(P, R.prof.cw, function(k) {
          const r = cellRng(R.seed + 23, k);
          R.prof.puff(k).forEach(function(p, i) {
            if (p.r < 7 * R.sc || r() > 0.45) return;
            const a0 = Math.PI * (1.05 + 0.35 * r()), rr = p.r * (0.55 + 0.3 * r());
            const pts = circle(p.cx, R.yBase - p.cy + p.r * 0.12, rr, a0, a0 + Math.PI * (0.35 + 0.4 * r()), 7);
            drawPoly(P, pts, { weight: env.look.weight * 0.45, color: env.look.line, seed: R.seed + k * 7 + i, curve: true });
          });
        }, 1);
      }
    },

    mesa: {
      wash: function(env) {
        // the cap rock a shade darker, and the side away from the light
        const P = env.P, R = env.R, tmp = env.tmp, sc = R.sc;
        tmp.fillStyle = css(env.look.shade);
        cells(P, R.prof.cw, function(k) {
          const b = R.prof.butte(k);
          if (!b.on) return;
          const top = R.yBase - b.H, foot = top + b.ch, in0 = Math.min(b.wt, 5 * sc);
          tmp.globalAlpha = 0.1;
          tmp.fillRect(b.cx - b.wt - 2, top - 3, 2 * b.wt + 4, b.ch + 3);
          tmp.globalAlpha = 0.24;
          tmp.beginPath();
          tmp.moveTo(b.cx + b.wt - in0, top - 3);
          tmp.lineTo(b.cx + b.wt + 3, top - 3);
          tmp.lineTo(b.cx + b.wt + 3 + b.run, R.yBase + 4);
          tmp.lineTo(b.cx + b.wt * 0.3, R.yBase + 4);
          tmp.lineTo(b.cx + b.wt - in0, foot);
          tmp.fill();
        }, 2);
      },
      pencil: function(env) {
        const P = env.P, R = env.R, B = new Batch(), sc = R.sc;
        // only where this butte is the one in front
        const mine = function(b, x) { return Math.abs(R.prof.h(x) - R.prof.one(b, x)) < 2.2; };
        cells(P, R.prof.cw, function(k) {
          const b = R.prof.butte(k), r = cellRng(R.seed + 25, k);
          if (!b.on) return;
          const top = R.yBase - b.H, foot = top + b.ch;
          // the foot of the cap
          for (let x = b.cx - b.wt + 1; x < b.cx + b.wt - 3; x += 7 * sc) {
            if (r() < 0.3 || !mine(b, x)) continue;
            B.seg(x, foot + 0.6 * (r() - 0.5), Math.min(b.cx + b.wt, x + 6 * sc), foot + 0.6 * (r() - 0.5), 0);
          }
          // joints in the cliff, closer on the dark side
          for (let x = b.cx - b.wt + 1.5; x < b.cx + b.wt; x += (x > b.cx + b.wt * 0.4 ? 2.1 : 4.6) * sc * (0.7 + 0.6 * r())) {
            if (!mine(b, x)) continue;
            B.seg(x, top + 1.2 + 1.5 * r(), x + 0.5 * (r() - 0.5), top + b.ch * (0.45 + 0.55 * r()), r.int(3));
          }
          // a few strokes down the scree
          [-1, 1].forEach(function(side) {
            const n = 2 + r.int(3);
            for (let i = 0; i < n; i++) {
              const t = 0.08 + 0.5 * r(), x = b.cx + side * (b.wt + 1.5 * sc + t * b.run), y = R.yBase - R.prof.one(b, x), l = (4 + 7 * r()) * sc;
              const x2 = x + side * l, y2 = R.yBase - R.prof.one(b, x2);
              if (mine(b, x)) B.seg(x, y + 2.5 * sc, x2, y2 + 2.5 * sc + l * 0.35, side > 0 ? 1 : 0);
            }
          });
        }, 2);
        B.flush(P, env.look.line, env.look.weight * 0.55, 0.85);
      }
    },

    wall: {
      wash: function(env) {
        const P = env.P, R = env.R, tmp = env.tmp;
        tmp.fillStyle = css(env.look.shade);
        cells(P, R.prof.cw, function(k) {
          const q = R.prof.raw(k), d = q.to - q.from;
          if (d > -4) return;              // the faces turned from the light: where it drops to the right
          const yt = R.yBase - q.from, yb = R.yBase - q.to, inset = Math.min(9 * R.sc, R.prof.cw * 0.12);
          tmp.globalAlpha = 0.3;
          tmp.beginPath();
          tmp.moveTo(q.xe + 2, yt - 2);
          tmp.lineTo(q.xe + 4, yb + 2);
          tmp.lineTo(q.xe - inset, yb + 6);
          tmp.lineTo(q.xe - inset, yt + 2);
          tmp.fill();
        }, 1);
      },
      pencil: function(env) {
        const P = env.P, R = env.R, B = new Batch();
        // courses of rock, low in the wall
        [0.25, 0.45].forEach(function(level, i) {
          const y = R.yBase - R.A * level + 0.8 * noise1(i * 9.1, R.seed);
          drawFn(P, function(X) { return env.yOf(X) < y - 2.5 ? y + 0.6 * noise1(X / 40, R.seed + i) : null; }, {
            seed: R.seed + 30 + i, weight: env.look.weight * 0.3, color: env.look.line, breaks: 0.25, retrace: false, width: 0.8
          });
        });
        // dense hatching all along under the rim
        const step = 2.5 * R.sc;
        for (let i = Math.floor(P.X0 / step); i * step < P.X1; i++) {
          if (irand(i, 3, R.seed) < 0.22) continue;
          const x = i * step, y = env.yOf(x), l = (4 + 10 * irand(i, 4, R.seed)) * R.sc;
          B.seg(x, y + 1.5, x - 0.5, y + 1.5 + l, 1 + (irand(i, 5, R.seed) < 0.4 ? 1 : 0));
        }
        B.flush(P, env.look.line, env.look.weight * 0.55, 0.85);
      }
    },

    terrace: {
      wash: function(env) {
        // the side away from the light
        const P = env.P, R = env.R, tmp = env.tmp;
        tmp.fillStyle = css(env.look.shade);
        tmp.globalAlpha = 0.2;
        cells(P, R.prof.cw, function(k) {
          const z = R.prof.stack(k);
          if (!z.on) return;
          const reach = (z.top + z.n * z.tread) / (1 + z.skew);
          tmp.fillRect(z.cx + z.top * 0.4, R.yBase - z.H - 3, reach, z.H + 12);
        }, 1);
      },
      pencil: function(env) {
        // every slab's edge, carried across the stack
        const P = env.P, R = env.R, B = new Batch();
        cells(P, R.prof.cw, function(k) {
          const z = R.prof.stack(k), r = cellRng(R.seed + 39, k);
          if (!z.on) return;
          for (let j = 1; j <= z.n; j++) {
            const y = R.yBase - z.H + j * z.riser, half = z.top + (j - 1) * z.tread;
            const xa = z.cx - half / (1 - z.skew) + 1.5, xb = z.cx + half / (1 + z.skew) - 1.5;
            for (let x = xa; x < xb; x += 9 * R.sc) {
              if (r() < 0.3 || Math.abs(R.prof.h(x) - R.prof.one(z, x)) > 1) continue;
              B.seg(x, y + 0.5 * (r() - 0.5), Math.min(xb, x + 8 * R.sc), y + 0.5 * (r() - 0.5), r.int(2));
            }
          }
        }, 1);
        B.flush(P, env.look.line, env.look.weight * 0.45, 0.8);
      }
    },

    crystal: {
      wash: function(env) {
        const P = env.P, R = env.R, tmp = env.tmp;
        const gems = [];
        cells(P, R.prof.cw, function(k) { gems.push(R.prof.gem(k)); }, 3);
        gems.sort(function(a, b) { return b.H - a.H || a.cx - b.cx; });
        R.gems = gems;
        const at = function(p) { return [p[0], R.yBase - p[1]]; };
        gems.forEach(function(g) {
          const p = g.pts.map(at), mid = at(g.mid), foot = at(g.foot);
          // each prism is its own little wash, over the ones behind
          tmp.globalCompositeOperation = 'source-over';
          tmp.globalAlpha = 1;
          const path = new Path2D();
          path.moveTo(p[0][0], p[0][1] + 30);
          p.forEach(function(q) { path.lineTo(q[0], q[1]); });
          path.lineTo(p[4][0], p[4][1] + 30);
          path.closePath();
          tmp.save();
          tmp.globalCompositeOperation = 'destination-out';
          tmp.fillStyle = 'rgba(0,0,0,0.85)';
          tmp.fill(path);
          tmp.restore();
          tmp.fillStyle = css(env.look.color, env.look.alpha * 0.85);
          tmp.fill(path);
          // the facets away from the light
          tmp.fillStyle = css(env.look.shade, 0.3);
          tmp.beginPath();
          tmp.moveTo(p[2][0], p[2][1]);
          tmp.lineTo(p[3][0], p[3][1]);
          tmp.lineTo(p[4][0], p[4][1] + 30);
          tmp.lineTo(foot[0], foot[1] + 30);
          tmp.lineTo(mid[0], mid[1]);
          tmp.fill();
        });
        tmp.globalCompositeOperation = 'source-atop';
      },
      pencil: function(env) {
        const P = env.P, R = env.R;
        const at = function(p) { return [p[0], R.yBase - p[1]]; };
        // nearest last, each rubbing out what it covers
        R.gems.forEach(function(g, i) {
          const p = g.pts.map(at), mid = at(g.mid), foot = at(g.foot);
          const c = P.pencil;
          c.save();
          c.globalCompositeOperation = 'destination-out';
          c.fillStyle = 'rgba(0,0,0,0.9)';
          c.beginPath();
          c.moveTo(p[0][0], p[0][1] + 14);
          p.forEach(function(q) { c.lineTo(q[0], q[1]); });
          c.lineTo(p[4][0], p[4][1] + 14);
          c.fill();
          c.restore();
          const o = { weight: env.look.weight * 0.9, color: env.look.line, seed: R.seed + i, wobble: P.hand.wobble * 0.3 };
          const drop = Math.min(g.H * 0.75, 16 * R.sc + g.H * 0.3);
          const down = function(q, f) { return [q[0], q[1] + drop * (f || 1)]; };
          drawPoly(P, [down(p[0]), p[1], p[2], p[3], down(p[4])], o);
          o.weight *= 0.6;
          drawPoly(P, [p[2], mid, down(foot, 0.8)], o);
          drawPoly(P, [p[1], mid, p[3]], o);
        });
      }
    },

    ink: {
      wash: function(env) {
        // dry brush on the flanks of the towers
        const P = env.P, R = env.R, tmp = env.tmp;
        const ink = P.dark ? P.pal.chalk : U.tone(P.pal.shade, 0.17, 0.012);
        tmp.strokeStyle = css(ink);
        tmp.lineCap = 'round';
        cells(P, R.prof.cw, function(k) {
          const t = R.prof.tower(k), r = cellRng(R.seed + 27, k);
          if (!t.on || t.H < R.A * 0.3) return;
          const n = 2 + r.int(4);
          for (let i = 0; i < n; i++) {
            const x = t.cx + (0.15 + 0.6 * r()) * t.w, y = env.yOf(x) + 3 + (t.H * 0.5) * r();
            tmp.globalAlpha = 0.25 + 0.3 * r();
            tmp.lineWidth = (0.8 + 1.6 * r()) * R.sc;
            tmp.beginPath();
            tmp.moveTo(x, y);
            tmp.lineTo(x + (2 + 3 * r()) * R.sc, y + (4 + 6 * r()) * R.sc);
            tmp.stroke();
          }
        }, 1);
      },
      pencil: function(env) {
        // the outline is a brush: it swells and thins and runs dry
        const P = env.P, R = env.R, w = P.wash;
        const ink = P.dark ? P.pal.chalk : U.tone(P.pal.shade, 0.17, 0.012);
        w.save();
        w.strokeStyle = css(ink);
        w.lineCap = 'round';
        const RUN = 6;
        for (let X = Math.floor(P.X0 / RUN) * RUN; X < P.X1; X += RUN) {
          const n = noise1(X / 31, R.seed + 3), dry = noise1(X / 57, R.seed + 4);
          if (dry > 0.55 - 0.3 * R.t) continue;
          const slope = (env.yOf(X + RUN) - env.yOf(X)) / RUN;
          w.lineWidth = Math.max(0.5, (1.1 + 1.3 * n + 1.2 * clamp(slope, 0, 1.5)) * R.sc);
          w.globalAlpha = clamp((0.7 + 0.3 * n) * lerp(0.9, 0.35, R.t) * (R.echo ? 0.7 : 1), 0, 1);
          w.beginPath();
          for (let x = X; x <= X + RUN; x += 2) w.lineTo(x, env.yOf(x) + 0.4);
          w.stroke();
        }
        w.restore();
      }
    },

    cone: {
      pencil: function(env) {
        // gullies running down from the crater
        const P = env.P, R = env.R, B = new Batch();
        cells(P, R.prof.cw, function(k) {
          const p = R.prof.peak(k), r = cellRng(R.seed + 29, k);
          const y0 = R.yBase - p.H * 0.9;
          for (let i = 0; i < 7; i++) {
            const dx = (i - 3 + 0.6 * (r() - 0.5)) * p.w * 0.11, l = p.H * (0.2 + 0.3 * r());
            B.poly([[p.cx + dx, y0 + 1.5 + Math.abs(dx) * 0.2], [p.cx + dx * 1.9, y0 + l * 0.5], [p.cx + dx * 3.2, y0 + l]], r.int(3));
          }
        }, 1);
        B.flush(P, env.look.line, env.look.weight * 0.45, 0.85);
      }
    }
  };
  
  // What a single tag adds to its ridge.
  const EXTRAS = {
    trees: function(env) {
      const P = env.P, R = env.R, B = new Batch(), w = P.wash;
      const green = pigment(P, R.tag);
      cells(P, 7 * R.sc, function(k) {
        const r = cellRng(R.seed + 33, k);
        if (noise1(k * 0.11, R.seed + 34) < 0.05 || r() < 0.3) return;
        const x = (k + r()) * 7 * R.sc, y = env.yOf(x) + 0.5, h = (3.5 + 4 * r()) * R.sc;
        B.seg(x, y, x + 0.3, y - h, 1);
        B.poly([[x - h * 0.3, y - h * 0.45], [x, y - h * 1.05], [x + h * 0.32, y - h * 0.4]], r.int(3));
        w.fillStyle = css(green, 0.45);
        w.beginPath();
        w.ellipse(x + 0.5, y - h * 0.7, h * 0.32, h * 0.42, 0, 0, TAU);
        w.fill();
      });
      B.flush(P, env.look.line, env.look.weight * 0.7, 0.8);
    },
    lanes: function(env) {
      // parallel lines under the crest
      const P = env.P, R = env.R;
      for (let i = 1; i <= 3; i++) {
        drawFn(P, function(X) { return env.yOf(X) + i * 4.2 * R.sc + 0.6 * noise1(X / 50, R.seed + i); }, {
          seed: R.seed + 40 + i, weight: env.look.weight * (0.5 - 0.1 * i), color: env.look.line, breaks: 0.12 + 0.07 * i, retrace: false, width: 0.8
        });
      }
    },
    fields: function(env) {
      // terraced fields: short lines, each set in from the last
      const P = env.P, R = env.R, B = new Batch();
      cells(P, 58 * R.sc, function(k) {
        const r = cellRng(R.seed + 35, k);
        if (r() < 0.45) return;
        const x = (k + r()) * 58 * R.sc, n = 3 + r.int(3);
        let indent = 0;
        for (let i = 0; i < n; i++) {
          indent += r() < 0.6 ? 3 * R.sc : -3 * R.sc * (indent > 0 ? 1 : 0);
          const y = env.yOf(x) + (7 + i * 3.6) * R.sc, l = (9 + 12 * r()) * R.sc;
          B.seg(x + indent, y, x + indent + l, y + 0.3 * (r() - 0.5), r.int(3));
        }
        if (R.tag.name === 'python' && r() < 0.5) softBlob(P.wash, x + 12 * R.sc, env.yOf(x) + 13 * R.sc, 17 * R.sc, 8 * R.sc, onPaper(P, [0.93, 0.74, 0.2]), 0.4);
      });
      B.flush(P, env.look.line, env.look.weight * 0.5, 0.85);
    },
    masts: function(env) {
      // masts on the peaks, a wire from one to the next
      const P = env.P, R = env.R, B = new Batch();
      let prev = null;
      cells(P, R.prof.cw, function(k) {
        const q = R.prof.raw(k);
        if (q.hp < R.A * 0.45) { prev = null; return; }
        const x = q.xp, y = env.yOf(x), h = 6 * R.sc;
        B.seg(x, y, x, y - h, 2);
        B.seg(x - 1.4, y - h * 0.75, x + 1.4, y - h * 0.75, 1);
        B.dot(x, y - h);
        if (prev) {
          const pts = [];
          for (let i = 0; i <= 8; i++) {
            const t = i / 8;
            pts.push([lerp(prev[0], x, t), lerp(prev[1], y - h, t) + 3.5 * 4 * t * (1 - t)]);
          }
          B.poly(pts, 0);
        }
        prev = [x, y - h];
      }, 1);
      B.flush(P, env.look.line, env.look.weight * 0.7, 0.75);
    },
    houses: function(env) {
      // villages along the crest, a spire now and then; the open land between
      const P = env.P, R = env.R, B = new Batch(), w = P.wash;
      const roofs = pigment(P, R.tag);
      cells(P, 11 * R.sc, function(k) {
        const r = cellRng(R.seed + 39, k);
        if (noise1(k * 0.06, R.seed + 38) < 0.05 || r() < 0.2) return;
        const hw = (4.2 + 2.6 * r()) * R.sc, x = (k + r() * 0.3) * 11 * R.sc;
        const y = Math.max(env.yOf(x), env.yOf(x + hw)) + 1, h = (3.6 + 3.6 * r()) * R.sc, roof = hw * 0.5;
        B.poly([[x, y], [x, y - h], [x + hw / 2, y - h - roof], [x + hw, y - h], [x + hw, y]], r.int(3));
        if (r() < 0.12) {
          // the church
          B.seg(x + hw / 2, y - h - roof, x + hw / 2, y - h - roof - 7 * R.sc, 1);
          B.seg(x + hw / 2 - 1.4, y - h - roof - 5 * R.sc, x + hw / 2 + 1.4, y - h - roof - 5 * R.sc, 1);
        }
        w.fillStyle = css(roofs, 0.45);
        w.beginPath();
        w.moveTo(x, y - h);
        w.lineTo(x + hw / 2, y - h - roof);
        w.lineTo(x + hw, y - h);
        w.fill();
      });
      B.flush(P, env.look.line, env.look.weight * 0.7, 0.8);
    },
    construction: function(env) {
      // the draughtsman's lines: the cap carried past its corners, drops to a datum, a centre mark
      const P = env.P, R = env.R, B = new Batch();
      cells(P, R.prof.cw, function(k) {
        const b = R.prof.butte(k), r = cellRng(R.seed + 37, k);
        if (!b.on || b.wt < 8 * R.sc) return;
        const y = R.yBase - b.H;
        [-1, 1].forEach(function(side) {
          const x = b.cx + side * b.wt;
          B.seg(x, y - side * b.wt * b.tilt, x + side * (6 + 8 * r()), y - side * b.wt * b.tilt, 0);
          for (let yy = y + b.ch + 3; yy < R.yBase + 6; yy += 4.5) B.seg(x, yy, x, yy + 2.2, 0);
        });
        B.seg(b.cx - 1.6, y - 4.5, b.cx + 1.6, y - 4.5, 1);
        B.seg(b.cx, y - 6.1, b.cx, y - 2.9, 1);
      }, 1);
      B.flush(P, env.look.line, env.look.weight * 0.55, 0.7);
    }
  };

  // mood: the weather of the post, blended by how sure the classifier was
  function paintMood(P) {
    const sc = P.scene, C = sc.C, w = P.wash, seed = sc.seed, m = C.mood;
    // the light is where the post looks: ahead (right) or back
    const side = C.lean !== 0 ? (C.lean > 0 ? 1 : -1) : (irand(seed, 1, 5) < 0.5 ? -1 : 1);
    // worry, anger, bleakness: a bank of dark cloud hanging from the top edge
    const gloom = clamp(0.9 * m.worried + 0.7 * m.angry + 0.5 * m.conflicted + 1.5 * Math.max(0, 0.4 - C.valence), 0, 1);
    if (gloom > 0.08) {
      const dark = P.dark ? [0, 0, 0] : mix(P.air, U.tone(P.pal.shade, 0.345, 0.036), 0.72);
      cells(P, 96, function(k) {
        const r = cellRng(seed + 201, k);
        const x = (k + r()) * 96;
        // a conflicted post has its weather on one side only
        const part = m.conflicted > 0.3 ? smooth(-120, 160, -side * x) : 1;
        softBlob(w, x, 1 + 20 * r() * gloom, 60 + 80 * r(), 9 + 20 * r() * gloom, dark, (0.14 + 0.3 * r()) * gloom * part);
        if (r() < 0.6) softBlob(w, x + 30 * (r() - 0.5), 22 + 26 * r() * gloom, 40 + 50 * r(), 5 + 7 * r(), dark, 0.16 * gloom * part);
      }, 2);
    }
    // anger: rain, pressed hard, driven the way the post leans
    if (m.angry > 0.2 && sc.skyKind !== 'storm') {
      const B = new Batch();
      cells(P, 20, function(k) {
        const r = cellRng(seed + 203, k);
        if (noise1(k * 0.21, seed + 204) < 0.35 - 0.7 * m.angry) return;
        const n = 1 + r.int(3);
        for (let i = 0; i < n; i++) {
          const x = (k + r()) * 20, y = 8 + 46 * r(), len = 9 + 12 * r();
          B.seg(x, y, x + side * len * 0.4, y + len, r.int(3));
        }
      });
      B.flush(P, P.graphite, 0.3 + 0.35 * m.angry, 1);
    }
    // hope, play, brightness: a low sun, on the side the post looks to
    const light = clamp(0.95 * m.hopeful + 0.5 * m.playful + 1.5 * Math.max(0, C.valence - 0.72), 0, 1);
    if (light > 0.15 && sc.skyKind !== 'glow' && sc.skyKind !== 'burst') {
      const r = cellRng(seed + 205, 0);
      const x = side * (150 + 190 * r()), y = lerp(50, 30, light), warm = onPaper(P, [0.96, 0.72, 0.36]);
      softBlob(w, x, y, 150 + 80 * light, 34 + 16 * light, warm, 0.38 * light);
      softBlob(w, x, y, 46, 22, onPaper(P, [0.97, 0.6, 0.4]), 0.3 * light);
      if (light > 0.4) {
        // the sun is the paper
        w.globalCompositeOperation = 'destination-out';
        softBlob(w, x, y, 11, 11, WHITE, 1);
        w.globalCompositeOperation = 'source-over';
        if (P.dark) softBlob(w, x, y, 7, 7, mix(warm, WHITE, 0.5), 0.85);
        drawPoly(P, circle(x, y, 7, 0.3, TAU - 0.4, 14), { weight: 0.3, seed: seed + 9, curve: true, color: tinted(P, warm, 0.5) });
      }
    }
    // matter of fact: a ruled horizon
    if (m.matter_of_fact > 0.45) {
      const y = sc.ridges[sc.ridges.length - 1].yBase + 3;
      drawFn(P, function() { return y; }, { weight: 0.26 * m.matter_of_fact, seed: seed + 207, wobble: 0.1, retrace: false, breaks: 0.05, width: 0.8 });
    }
    // humour: a stray flourish, a paper plane and the loop it flew
    if (C.humor > 0.5) {
      const r = cellRng(seed + 231, 0), k = 0.7 + 0.8 * (C.humor - 0.5) * 2;
      const x0 = -side * (90 + 260 * r()) - 70 * k, y0 = 15 + 9 * r(), pts = [];
      for (let i = 0; i <= 44; i++) {
        const t = i / 44, loop = smooth(0.3, 0.74, t) * TAU;
        pts.push([x0 + 150 * k * t + 10 * k * Math.sin(loop), y0 - 7 * k * Math.sin(Math.PI * t) + 9 * k * (1 - Math.cos(loop)) * 0.5 + 3 * t]);
      }
      drawPoly(P, pts, { weight: 0.42, seed: seed + 232, curve: true, wobble: 0.3, width: 0.8 });
      const e = pts[pts.length - 1];
      drawPoly(P, [[e[0] + 7 * k, e[1] - 0.6], [e[0] - 1, e[1] - 3 * k], [e[0] + 0.8 * k, e[1] - 0.4], [e[0] - 1.6, e[1] + 2.2 * k]], {
        weight: 0.8, seed: seed + 233, close: true, wobble: 0.15, width: 0.85
      });
    }
  }

  // After the ridges: weather that lies in front of them.
  function paintWeather(P) {
    const sc = P.scene, w = P.wash;
    if (sc.skyKind === 'fog') {
      w.save();
      w.globalCompositeOperation = 'destination-out';
      cells(P, 130, function(k) {
        const r = cellRng(sc.seed + 63, k);
        softBlob(w, (k + r()) * 130, 52 + 46 * r(), 90 + 90 * r(), 5 + 7 * r(), WHITE, 0.5 + 0.35 * r());
      }, 2);
      w.restore();
    }
    // a reflective post: stillness, mist lying in the valleys
    const still = sc.C.mood.reflective;
    if (still > 0.3) {
      [w, P.pencil].forEach(function(ctx, n) {
        ctx.save();
        ctx.globalCompositeOperation = 'destination-out';
        cells(P, 150, function(k) {
          const r = cellRng(sc.seed + 65, k);
          softBlob(ctx, (k + r()) * 150, 64 + 40 * r(), 110 + 130 * r(), 4 + 7 * r(), WHITE, (0.3 + 0.5 * r()) * still * (n ? 0.6 : 1));
        }, 2);
        ctx.restore();
      });
    }
  }

  // ending: how the picture ends towards the page.  (An open ending just
  // trails off: the shader's fade is long and ragged for it.)
  function paintEdge(P) {
    const sc = P.scene, end = sc.C.end, w = P.wash, front = sc.ridges[0];
    const floor = Math.min(front.yBase + 9, 116);
    const closed = Math.max(end.resolved, end.practical);
    if (closed > 0.4) {
      // resolved: the land stands on a firm ground line, nothing runs on below it
      // (the wash still dissolves below the line, only sooner)
      [w, P.pencil].forEach(function(ctx) {
        ctx.save();
        ctx.globalCompositeOperation = 'destination-out';
        const g = ctx.createLinearGradient(0, floor + 1, 0, floor + 17);
        g.addColorStop(0, 'rgba(0,0,0,' + 0.35 * closed + ')');
        g.addColorStop(1, 'rgba(0,0,0,' + smooth(0.4, 0.75, closed) * 0.95 + ')');
        ctx.fillStyle = g;
        ctx.fillRect(P.X0, floor + 1, P.X1 - P.X0, P.H);
        ctx.restore();
      });
      drawFn(P, function() { return floor; }, { weight: 0.8 * closed, seed: sc.seed + 211, wobble: P.hand.wobble * 0.3, breaks: 0.02, width: 1.1 });
      if (end.practical > 0.4) {
        // practical: squared off, with a scale along the ground line
        const B = new Batch();
        cells(P, 10, function(k) { B.seg(k * 10, floor + 1.4, k * 10, floor + (k % 5 === 0 ? 6.5 : 3.4), k % 5 === 0 ? 2 : 0); });
        B.flush(P, P.graphite, 0.55 * end.practical, 0.8);
      }
    }
    if (end.call > 0.3) {
      // a call to the reader: the wash runs on down the page
      const look = ridgeLook(P, front);
      w.save();
      w.strokeStyle = css(look.color);
      w.fillStyle = css(look.color);
      w.lineCap = 'round';
      cells(P, 58, function(k) {
        const r = cellRng(sc.seed + 221, k);
        if (r() > 0.2 + 0.7 * end.call) return;
        const x = (k + r()) * 58, y0 = front.yBase - 2 + 10 * r(), len = (18 + 30 * r()) * (0.6 + 0.6 * end.call), wd = 1.1 + 1.3 * r();
        w.globalAlpha = 0.55;
        w.lineWidth = wd;
        w.beginPath();
        w.moveTo(x, y0);
        w.lineTo(x + 0.8 * (r() - 0.5), y0 + len);
        w.stroke();
        w.globalAlpha = 0.75;
        w.beginPath();
        w.ellipse(x, y0 + len, wd * 0.9, wd * 1.3, 0, 0, TAU);
        w.fill();
      }, 1);
      w.restore();
    }
  }

  // stance: the gesture of the hand, over the finished landscape
  function paintStance(P) {
    const sc = P.scene, st = sc.C.stance, seed = sc.seed, front = sc.ridges[0];
    const side = sc.C.lean < 0 ? -1 : 1;
    if (st.critic > 0.35) {
      // the critic cuts: strokes of the rubber through wash and line
      [P.wash, P.pencil].forEach(function(ctx) {
        ctx.save();
        ctx.globalCompositeOperation = 'destination-out';
        ctx.lineCap = 'round';
        ctx.strokeStyle = '#000';
        cells(P, 104, function(k) {
          const r = cellRng(seed + 241, k);
          if (r() > 0.25 + 0.75 * st.critic) return;
          const x = (k + r()) * 104, y = 34 + 40 * r(), len = 34 + 44 * r();
          for (let i = 0; i < 2; i++) {
            ctx.globalAlpha = (0.35 + 0.4 * r()) * st.critic;
            ctx.lineWidth = 1.6 + 2.6 * r();
            ctx.beginPath();
            ctx.moveTo(x + i * 5, y + i * 2);
            ctx.lineTo(x + i * 5 - side * len * 0.45, y + i * 2 + len);
            ctx.stroke();
          }
        }, 1);
        ctx.restore();
      });
    }
    if (st.advocate > 0.35) {
      // the advocate pushes: long strokes driving one way across the sky
      const B = new Batch();
      cells(P, 150, function(k) {
        const r = cellRng(seed + 243, k);
        if (r() > 0.3 + 0.7 * st.advocate) return;
        const x = (k + r()) * 150, y = 7 + 26 * r(), n = 3 + r.int(3);
        for (let i = 0; i < n; i++) {
          const l = 50 + 60 * r(), a = x + side * i * 9, b = y + i * 4.4;
          B.poly([[a, b + 3], [a + side * l * 0.5, b + 0.5], [a + side * l, b - 3.5 - 2 * r()]], r.int(3));
        }
      }, 1);
      B.flush(P, P.graphite, 0.34 * st.advocate + 0.1, 0.85);
    }
    if (st.teacher > 0.35) {
      // the teacher points things out: a spot height on a summit, a leader, a note
      const B = new Batch();
      cells(P, 210 * sc.C.zoom, function(k) {
        const r = cellRng(seed + 245, k);
        if (r() > 0.35 + 0.6 * st.teacher) return;
        const p = onCrest(sc, highest(sc, (k + 0.5) * 210 * sc.C.zoom, 60)), x = p[0], y = p[1] - 3.5;
        B.poly([[x - 2.6, y], [x, y - 4.4], [x + 2.6, y], [x - 2.6, y]], 2);
        B.seg(x + 1.5, y - 4.6, x + 9, y - 12, 1);
        B.seg(x + 9, y - 12, x + 26, y - 12, 1);
        // (a note in a hand too small to read)
        const pts = [];
        for (let i = 0; i < 13; i++) pts.push([x + 10 + i * 1.2, y - 14.5 + (i % 2 ? -1.3 : 0.9) * (0.4 + r())]);
        B.poly(pts, 0);
      }, 1);
      B.flush(P, P.graphite, 0.3 + 0.45 * st.teacher, 0.8);
    }
    if (st.builder > 0.35) {
      // the builder sets out: plumb lines under the summits, a string between pegs
      const B = new Batch(), yString = Math.max(6, front.yTop - 3);
      cells(P, 170 * sc.C.zoom, function(k) {
        const r = cellRng(seed + 247, k);
        const p = onCrest(sc, highest(sc, (k + 0.5) * 170 * sc.C.zoom, 50));
        for (let y = yString; y < front.yBase + 6; y += 5) B.seg(p[0], y, p[0], y + 2.4, 0);
        B.seg(p[0] - 2.2, yString - 2.2, p[0] + 2.2, yString + 2.2, 2);
        B.seg(p[0] - 2.2, yString + 2.2, p[0] + 2.2, yString - 2.2, 2);
        if (r() < 0.5) B.seg(p[0] - 3, front.yBase + 6, p[0] + 3, front.yBase + 6, 1);
      }, 1);
      B.flush(P, P.graphite, 0.25 + 0.4 * st.builder, 0.8);
      drawFn(P, function() { return yString; }, { weight: 0.3 * st.builder, seed: seed + 249, wobble: 0.15, breaks: 0.3, retrace: false, width: 0.8 });
    }
  }

  // actor: who is in the picture.  One figure, a group, the masts of a
  // machine, a company's works, the marks of a state; an idea leaves it empty.
  function people(P, B, at, n, spread, r, tall) {
    for (let i = 0; i < n; i++) {
      const p = at(n === 1 ? 0 : r.gauss() * spread), h = (tall ? 5.2 : 3.4) + 1.2 * r();
      B.seg(p[0], p[1] + 0.3, p[0] + 0.3 * (r() - 0.5), p[1] - h, 2);
      B.dot(p[0], p[1] - h - 1.4);
      if (tall) B.seg(p[0] + 2.2, p[1] + 0.3, p[0] + 2.6, p[1] - h * 0.9, 1);     // a staff
    }
  }
  function paintActor(P, at, x0) {
    const sc = P.scene, a = sc.C.actor, r = cellRng(sc.seed + 251, 0), B = new Batch();
    if (a.individual > 0.5) people(P, B, function(d) { return at(x0 + d); }, 1, 0, r, true);
    if (a.group > 0.5) people(P, B, function(d) { return at(x0 + d); }, 5 + r.int(4), 16, r, false);
    if (a.machine > 0.5) {
      // masts at even distances, a wire from one to the next
      let prev = null;
      for (let i = -3; i <= 3; i++) {
        const p = at(x0 + i * 64), h = 7.5;
        B.seg(p[0], p[1], p[0], p[1] - h, 2);
        B.seg(p[0] - 1.8, p[1] - h * 0.8, p[0] + 1.8, p[1] - h * 0.8, 1);
        if (prev) {
          const pts = [];
          for (let n = 0; n <= 8; n++) pts.push([lerp(prev[0], p[0], n / 8), lerp(prev[1], p[1] - h, n / 8) + 16 * (n / 8) * (1 - n / 8)]);
          B.poly(pts, 0);
        }
        prev = [p[0], p[1] - h];
      }
    }
    if (a.company > 0.5) {
      // the works: sheds and a chimney
      const p = at(x0);
      B.poly([[p[0] - 9, p[1]], [p[0] - 9, p[1] - 5], [p[0] - 5, p[1] - 7.5], [p[0] - 5, p[1] - 5], [p[0] - 1, p[1] - 7.5], [p[0] - 1, p[1] - 5], [p[0] + 3, p[1] - 7.5], [p[0] + 3, p[1]]], 2);
      B.poly([[p[0] + 5, p[1]], [p[0] + 5.4, p[1] - 13], [p[0] + 7.4, p[1] - 13], [p[0] + 7.8, p[1]]], 2);
      B.poly([[p[0] + 6.4, p[1] - 14], [p[0] + 8, p[1] - 17], [p[0] + 11, p[1] - 18.5], [p[0] + 15, p[1] - 18]], 0);
    }
    if (a.state > 0.5) {
      // a boundary: posts, and a flag on the highest of them
      for (let i = -2; i <= 2; i++) {
        const p = at(x0 + i * 46);
        B.seg(p[0], p[1], p[0], p[1] - (i ? 4 : 13), 2);
        if (!i) B.poly([[p[0], p[1] - 13], [p[0] + 7, p[1] - 11.4], [p[0], p[1] - 9.4]], 2);
      }
    }
    B.flush(P, P.graphite, 0.9, 0.9);
  }

  // imagery: the images the author himself uses, as one small motif on the
  // front ridge (only when the classifier was sure of it)
  function vein(ctx, x, y, dx, dy, depth, r) {
    // a branching thread (blood, roots, rivulets)
    const n = 3 + r.int(4);
    ctx.beginPath();
    ctx.moveTo(x, y);
    for (let i = 0; i < n; i++) {
      x += dx * (5 + 4 * r()) + 3 * (r() - 0.5);
      y += dy * (5 + 4 * r()) + 3 * (r() - 0.5);
      ctx.lineTo(x, y);
      if (depth > 0 && r() < 0.38) {
        ctx.stroke();
        const t = (r() < 0.5 ? -1 : 1) * (0.5 + 0.4 * r());
        ctx.lineWidth *= 0.8;
        vein(ctx, x, y, dx * Math.cos(t) - dy * Math.sin(t), dx * Math.sin(t) + dy * Math.cos(t), depth - 1, r);
        ctx.lineWidth /= 0.8;
        ctx.beginPath();
        ctx.moveTo(x, y);
      }
    }
    ctx.stroke();
  }
  function highest(scene, x, reach) {
    const front = scene.ridges[0];
    let best = x, top = -1;
    for (let d = -reach; d <= reach; d += 2) {
      const h = front.prof.h(x + d);
      if (h > top) { top = h; best = x + d; }
    }
    return best;
  }
  function tree(P, B, x, y, h, color) {
    B.seg(x, y, x + 0.3, y - h, 1);
    B.poly([[x - h * 0.3, y - h * 0.45], [x, y - h * 1.05], [x + h * 0.32, y - h * 0.4]], 2);
    P.wash.fillStyle = css(color, 0.5);
    P.wash.beginPath();
    P.wash.ellipse(x + 0.5, y - h * 0.7, h * 0.34, h * 0.44, 0, 0, TAU);
    P.wash.fill();
  }
  function tower(P, x, y, seed) {
    // a tower still going up: floors, and scaffolding above the last one
    const o = { weight: 0.9, seed: seed, wobble: 0.2, width: 0.9 }, h = 27, wd = 4;
    P.wash.fillStyle = css(onPaper(P, [0.45, 0.42, 0.44]), 0.35);
    P.wash.fillRect(x - wd, y - h, wd * 2, h + 1);
    drawPoly(P, [[x - wd, y + 1], [x - wd, y - h], [x + wd, y - h], [x + wd, y + 1]], Object.assign({ retrace: true }, o));
    for (let i = 1; i < 6; i++) drawPoly(P, [[x - wd, y - i * 4.5], [x + wd, y - i * 4.5]], Object.assign({}, o, { weight: 0.5 }));
    drawPoly(P, [[x - wd, y - h], [x - wd - 0.4, y - h - 8]], o);
    drawPoly(P, [[x + wd, y - h], [x + wd + 0.4, y - h - 6]], o);
    drawPoly(P, [[x - wd - 0.4, y - h - 5], [x + wd + 0.4, y - h - 4]], Object.assign({}, o, { weight: 0.6 }));
    drawPoly(P, [[x - wd, y - h - 0.5], [x + wd, y - h - 4]], Object.assign({}, o, { weight: 0.45 }));
  }
  const MOTIFS = {
    water: function(P, M) {         // a lake at the foot of the range
      const front = P.scene.ridges[0], w = P.wash, B = new Batch(), y0 = front.yBase + 3;
      const blue = onPaper(P, [0.3, 0.54, 0.74]);
      cells(P, 46, function(k) {
        const r = cellRng(M.seed, k);
        const x = (k + r()) * 46;
        w.globalCompositeOperation = 'destination-out';
        softBlob(w, x, y0 + 9, 60, 9, WHITE, 0.55);
        w.globalCompositeOperation = 'source-over';
        softBlob(w, x, y0 + 7 + 4 * r(), 44 + 30 * r(), 5 + 3 * r(), blue, 0.4);
        for (let i = 0; i < 3; i++) {
          const a = (k + r()) * 46, b = y0 + 2 + 15 * r() * r(), l = 5 + 16 * r();
          B.seg(a, b, a + l, b + 0.4 * (r() - 0.5), r.int(3));
        }
      }, 1);
      B.flush(P, tinted(P, blue, 0.5), 0.5, 0.8);
    },
    fire: function(P, M) {          // smoke from the summit
      const p = onCrest(P.scene, highest(P.scene, M.x, 90)), w = P.wash, r = cellRng(M.seed, 1), side = P.scene.shear < 0 ? -1 : 1;
      const grey = onPaper(P, [0.4, 0.38, 0.4]), pts = [];
      for (let i = 0; i < 10; i++) {
        const x = p[0] + side * i * i * 0.55 + 2.5 * Math.sin(i * 1.3 + r() * 6), y = p[1] - 2 - i * 4.6;
        pts.push([x, y]);
        softBlob(w, x, y, 3 + i * 1.9, 2.5 + i * 1.1, grey, 0.26);
      }
      drawPoly(P, pts, { weight: 0.45, seed: M.seed, curve: true });
      softBlob(w, p[0], p[1] - 1, 7, 4, onPaper(P, [0.9, 0.33, 0.1]), 0.8);
    },
    stone: function(P, M) {         // a cairn
      const p = onCrest(P.scene, highest(P.scene, M.x, 90));
      [[5, 0], [3.8, 3.2], [2.6, 5.8], [1.5, 7.9]].forEach(function(s, i) {
        drawPoly(P, circle(p[0] + (i % 2 ? 0.6 : -0.4), p[1] - 1.4 - s[1], s[0], 0, TAU, 9).map(function(q) { return [q[0], p[1] - 1.4 - s[1] + (q[1] - (p[1] - 1.4 - s[1])) * 0.42]; }),
          { weight: 0.85, seed: M.seed + i, close: true, wobble: 0.3, fill: onPaper(P, [0.55, 0.53, 0.5]), fillAlpha: 0.35 });
      });
    },
    air: function(P, M) {           // the wind, drawn
      for (let i = 0; i < 4; i++) {
        const r = cellRng(M.seed, i), x = M.x - 250 + i * 110 + 50 * r(), y = 9 + i * 7 + 6 * r(), l = 90 + 80 * r();
        const pts = [[x, y], [x + l * 0.4, y - 4], [x + l * 0.8, y + 1], [x + l, y + 4]];
        circle(x + l - 1, y + 8.5, 4.5, -Math.PI / 2, Math.PI * 0.9, 6).forEach(function(q) { pts.push(q); });
        drawPoly(P, pts, { weight: 0.36, seed: M.seed + i, curve: true, width: 0.8 });
      }
    },
    growth: function(P, M) {        // a wood on the ridge
      const B = new Batch(), green = onPaper(P, [0.36, 0.54, 0.18]);
      for (let i = -24; i <= 24; i++) {
        const r = cellRng(M.seed, i), x = M.x + i * 8 + 5 * r();
        if (r() > 1.15 - Math.abs(i) / 26 || r() < 0.2) continue;
        const p = onCrest(P.scene, x);
        tree(P, B, p[0], p[1] + 0.5, 4.5 + 5 * r(), green);
      }
      B.flush(P, tinted(P, green, 0.4), 0.8, 0.8);
    },
    building: function(P, M) {      // a tower going up
      const p = onCrest(P.scene, highest(P.scene, M.x, 70));
      tower(P, p[0], p[1], M.seed);
    },
    road: function(P, M) {          // a path over the range
      const B = new Batch(), front = P.scene.ridges[0];
      for (let x = M.x - 190; x < M.x + 190; x += 7.5) {
        const drop = function(a) { return 9 + 7 * Math.sin((a - M.x) / 41) + 16 * smooth(120, 190, Math.abs(a - M.x)); };
        const a = onCrest(P.scene, x), b = onCrest(P.scene, x + 4.4);
        if (a[1] + drop(x) < front.yMist - 6) B.seg(a[0], a[1] + drop(x), b[0], b[1] + drop(x + 4.4), 2);
      }
      B.flush(P, P.graphite, 0.75, 0.95);
    },
    light: function(P, M) {         // a star low over the range
      if (P.scene.skyKind === 'glow' || P.scene.skyKind === 'burst') return;
      const x = M.x, y = 20, w = P.wash, B = new Batch(), r = cellRng(M.seed, 2), warm = onPaper(P, [0.96, 0.74, 0.3]);
      softBlob(w, x, y, 44, 22, warm, 0.4);
      for (let i = 0; i < 12; i++) {
        const an = i / 12 * TAU + 0.2 * r(), r0 = 4 + r(), r1 = r0 + (i % 3 === 0 ? 11 : 4) + 4 * r();
        B.seg(x + Math.cos(an) * r0, y + Math.sin(an) * r0, x + Math.cos(an) * r1, y + Math.sin(an) * r1, r.int(3));
      }
      B.flush(P, tinted(P, warm, 0.5), 0.6, 0.85);
    },
    body: function(P, M) {          // veins down the flank
      const w = P.wash, red = onPaper(P, [0.62, 0.1, 0.18]);
      w.save();
      w.strokeStyle = css(red);
      w.lineCap = 'round';
      w.globalAlpha = 0.7;
      for (let i = -1; i <= 1; i++) {
        const r = cellRng(M.seed, i), p = onCrest(P.scene, highest(P.scene, M.x + i * 95, 40));
        w.lineWidth = 1.1;
        vein(w, p[0], p[1] + 2, 0.25 * (r() - 0.5), 1, 3, r);
      }
      w.restore();
    },
    crowd: function(P, M) {         // people on the ridge
      const B = new Batch(), r = cellRng(M.seed, 3), n = 11 + r.int(8);
      for (let i = 0; i < n; i++) {
        const p = onCrest(P.scene, M.x + r.gauss() * 46), h = 3 + 1.2 * r();
        B.seg(p[0], p[1] + 0.3, p[0] + 0.3 * (r() - 0.5), p[1] - h, 2);
        B.dot(p[0], p[1] - h - 1.3);
      }
      B.flush(P, P.graphite, 0.9, 0.85);
    }
  };

  // What a project tag leaves: something small standing at (x, y), in its
  // pigment and in pencil.  Returns where its name goes.
  function glyph(P, sign, x, y) {
    const w = P.wash, name = sign.tag.name;
    const c = pigment(P, sign.tag), line = tinted(P, c, 0.5);
    const o = { weight: 0.95, color: line, seed: sign.seed, wobble: 0.2, width: 0.9 };
    const dab = function(path, alpha) { w.fillStyle = css(c, alpha === undefined ? 0.75 : alpha); w.fill(path); };
    let lx = x + 7, ly = y - 3;
    if (name === 'jinja') {
      // a shrine gate
      const p = new Path2D();
      p.rect(x - 4.2, y - 9.5, 1.4, 10.5);
      p.rect(x + 2.8, y - 9.5, 1.4, 10.5);
      p.rect(x - 6.5, y - 11.6, 13, 1.8);
      p.rect(x - 5, y - 7.6, 10, 1.2);
      dab(p, 0.85);
      drawPoly(P, [[x - 7, y - 12.2], [x - 3, y - 11.6], [x + 3, y - 11.6], [x + 7, y - 12.2]], o);
      drawPoly(P, [[x - 3.6, y - 9.5], [x - 3.8, y + 1]], o);
      drawPoly(P, [[x + 3.6, y - 9.5], [x + 3.8, y + 1]], o);
      lx = x + 9;
    } else if (name === 'pi') {
      // a small circle, never quite closed
      softBlob(w, x, y - 6, 9, 9, c, 0.4);
      drawPoly(P, circle(x, y - 6, 6, 0.5, TAU - 0.35, 16), Object.assign({}, o, { curve: true, retrace: true }));
      lx = x + 9;
    } else if (name === 'earendil') {
      // a star
      softBlob(w, x, y - 7, 10, 10, c, 0.5);
      const pts = [];
      for (let i = 0; i < 8; i++) {
        const a = i / 8 * TAU - Math.PI / 2, rr = i % 2 ? 1.8 : (i % 4 ? 5 : 7.5);
        pts.push([x + Math.cos(a) * rr, y - 7 + Math.sin(a) * rr]);
      }
      drawPoly(P, pts, Object.assign({}, o, { close: true, fill: c, fillAlpha: 0.5 }));
      lx = x + 9;
    } else if (name === 'flask') {
      const fill = new Path2D();
      fill.moveTo(x - 2.9, y - 3.4);
      fill.lineTo(x - 4.4, y - 0.4);
      fill.lineTo(x + 4.4, y - 0.4);
      fill.lineTo(x + 2.9, y - 3.4);
      dab(fill);
      drawPoly(P, [[x - 1.4, y - 10], [x - 1.4, y - 6.4], [x - 4.4, y - 0.4], [x + 4.4, y - 0.4], [x + 1.4, y - 6.4], [x + 1.4, y - 10]], Object.assign({}, o, { retrace: true }));
      drawPoly(P, [[x - 2.2, y - 10.2], [x + 2.2, y - 10.2]], o);
    } else if (name === 'django') {
      // a dark fir
      const p = new Path2D();
      p.moveTo(x, y - 14);
      p.lineTo(x - 4, y - 2.5);
      p.lineTo(x + 4, y - 2.5);
      dab(p);
      drawPoly(P, [[x, y + 0.5], [x, y - 14]], o);
      for (let i = 0; i < 4; i++) drawPoly(P, [[x - 1.2 - i, y - 11 + i * 2.8], [x, y - 12.4 + i * 2.8], [x + 1.2 + i, y - 11 + i * 2.8]], o);
    } else if (name === 'sentry') {
      // a watchtower
      const p = new Path2D();
      p.rect(x - 2.2, y - 9, 4.4, 9.5);
      dab(p, 0.6);
      drawPoly(P, [[x - 2.4, y + 0.5], [x - 2.2, y - 9], [x - 3.6, y - 9.2], [x - 3.6, y - 12], [x + 3.6, y - 12], [x + 3.6, y - 9.2], [x + 2.2, y - 9], [x + 2.4, y + 0.5]], o);
      drawPoly(P, [[x - 0.6, y - 5.5], [x + 0.6, y - 5.5]], o);
    } else {
      // a survey flag
      const p = new Path2D();
      p.moveTo(x + 0.4, y - 13);
      p.lineTo(x + 7, y - 11);
      p.lineTo(x + 0.4, y - 8.6);
      dab(p);
      drawPoly(P, [[x, y + 1], [x + 0.2, y - 13.4]], o);
      drawPoly(P, [[x + 0.4, y - 13], [x + 7, y - 11], [x + 0.4, y - 8.6]], o);
      lx = x + 9;
    }
    if (LETTERS[name[0]]) letter(P, name, lx, ly, 1.05, { weight: 0.75, color: line, seed: sign.seed + 5 });
  }

  // Where the front ridge's crest above world x is drawn (the ridges lean).
  function onCrest(scene, x) {
    const front = scene.ridges[0], h = front.prof.h(x);
    return [x + scene.shear * h, front.yBase - h];
  }

  // On the ridge (a circle or a star: in the sky above it).
  function paintSign(P, sign, index) {
    const name = sign.tag.name;
    const p = onCrest(P.scene, sign.x);
    glyph(P, sign, p[0], name === 'pi' || name === 'earendil' ? Math.min(p[1] - 16, 36) - index * 4 : p[1]);
  }

  function paintHeader(P) {
    const sc = P.scene;
    paintSky(P);
    paintMood(P);
    for (let i = sc.ridges.length - 1; i >= 0; i--) paintRidge(P, sc.ridges[i]);
    if (sc.motif && MOTIFS[sc.motif.kind]) MOTIFS[sc.motif.kind](P, sc.motif);
    paintActor(P, function(x) { return onCrest(sc, x); }, sc.actorX);
    paintWeather(P);
    paintStance(P);
    paintEdge(P);
    sc.signs.forEach(function(sign, i) { paintSign(P, sign, i); });
  }

  // ---- the footer: the section ---------------------------------------------

  // The hatchings, after the conventions of geological sections and after
  // what the tag is.  `k` is the rock painter (see paintRock).
  const ROCKS = {
    dots: function(k) {          // sand
      k.grid(6.4, 6, function(x, y, i, j) {
        if (k.rnd(i, j, 1) < 0.22) return;
        k.B.dot(x + (k.rnd(i, j, 2) - 0.5) * 4.6, y + (k.rnd(i, j, 3) - 0.5) * 4.2);
      }, true);
    },
    sparse: function(k) {        // far apart
      k.grid(16, 14, function(x, y, i, j) {
        const a = x + (k.rnd(i, j, 2) - 0.5) * 6, b = y + (k.rnd(i, j, 3) - 0.5) * 5;
        if (k.rnd(i, j, 1) < 0.3) k.B.poly(circle(a, b, 1.6, 0, TAU, 7), 0); else k.B.dot(a, b);
      }, true);
    },
    dashes: function(k) {        // shale
      k.grid(15, 7, function(x, y, i, j, v) {
        const l = 3 + 3 * k.rnd(i, j, 1), s = k.slope(x, v);
        k.B.seg(x - l, y - s * l, x + l, y + s * l, k.b(i, j));
      }, true);
    },
    python: function(k) {        // lines of different lengths, set in step by step
      k.grid(56, 7.5, function(x, y, i, j, v) {
        if (k.rnd(i, j, 1) < 0.16) return;
        const indent = Math.floor(3.99 * (0.5 + 0.5 * noise1(j * 0.83 + i * 13.37, k.seed)));
        const a = x + 3 + indent * 6.5, l = Math.min(47 - indent * 6.5, 9 + 34 * k.rnd(i, j, 2));
        const ya = k.Y(a, v), yb = k.Y(a + l, v);
        if (Math.abs(yb - ya) < l) k.B.seg(a, ya, a + l, yb, k.b(i, j));
      });
    },
    lanes: function(k) {         // parallel, settled
      k.rows(4.7, function(v, j) { k.row(v, { breaks: 0.18, bucket: j % 3 === 0 ? 2 : 1 }); });
    },
    laminae: function(k) {       // fine old layers, and what was buried in them
      k.rows(3.3, function(v, j) { k.row(v, { breaks: 0.25, bucket: j % 4 === 0 ? 1 : 0 }); });
      k.grid(150, 46, function(x, y, i, j) {
        if (k.rnd(i, j, 1) < 0.5) return;
        const a = x + 100 * k.rnd(i, j, 2), b = k.Y(a, j * 46 + 20), pts = [];
        if (!k.vis(a, b)) return;
        for (let t = 0; t < 15; t++) pts.push([a + Math.cos(t * 0.8) * (0.8 + t * 0.42), b + Math.sin(t * 0.8) * (0.8 + t * 0.42)]);
        k.B.poly(pts, 2);
      });
    },
    wavy: function(k) {          // schist
      k.rows(7.4, function(v, j) {
        const ph = k.rnd(j, 0, 5) * 9;
        k.row(v, { breaks: 0.14, step: 2, off: function(x) { return 2.1 * Math.sin(x / 5.2 + ph + 1.5 * noise1(x / 60, k.seed + j)); } });
      });
    },
    bands: function(k) {         // banded iron
      const w = k.P.wash;
      w.save();
      w.clip(k.clip);
      w.strokeStyle = css(k.P.dark ? mix(k.color, WHITE, 0.25) : mix(k.color, [0.2, 0.06, 0.03], 0.45));
      w.lineCap = 'butt';
      k.rows(9.5, function(v, j) {
        const path = new Path2D();
        k.row(v, { path: path, plain: true });
        w.lineWidth = 1.2 + 2.2 * k.rnd(j, 0, 7);
        w.globalAlpha = 0.25 + 0.3 * k.rnd(j, 0, 8);
        w.stroke(path);
        k.row(v + 2.6 + 2 * k.rnd(j, 0, 9), { breaks: 0.2, bucket: 0 });
      });
      w.restore();
      k.grid(21, 9.5, function(x, y, i, j) {
        if (k.rnd(i, j, 1) < 0.45) return;
        k.B.poly([[x - 3.2, y + 6.2], [x, y + 3], [x + 3.2, y + 6.2]], k.b(i, j));
      }, true);
    },
    bricks: function(k) {        // limestone, laid like a wall
      k.rows(9.5, function(v) { k.row(v, { breaks: 0.05 }); });
      k.grid(19, 9.5, function(x, y, i, j, v) {
        k.B.seg(x, y + 0.6, x + 0.4 * (k.rnd(i, j, 1) - 0.5), k.Y(x, v + 9.5) - 0.6, k.b(i, j));
      }, true);
    },
    blocks: function(k) {        // boxes, stacked
      k.grid(31, 15, function(x, y, i, j) {
        const w = 21 + 7 * k.rnd(i, j, 1), h = 10.5 + 2 * k.rnd(i, j, 2), a = x + 2 * (k.rnd(i, j, 3) - 0.5);
        k.B.poly([[a, y + 2], [a + w, y + 2], [a + w, y + 2 + h], [a, y + 2 + h]], k.b(i, j), true);
        k.B.seg(a + w * 0.5 - 2, y + 2, a + w * 0.5 - 2, y + 5, 0);
        k.B.seg(a + w * 0.5 + 2, y + 2, a + w * 0.5 + 2, y + 5, 0);
      }, true);
    },
    boxes: function(k) {         // boxes inside boxes, linked
      k.grid(36, 19, function(x, y, i, j) {
        const a = x + 3 * (k.rnd(i, j, 3) - 0.5), b = y + 3;
        k.B.poly([[a, b], [a + 24, b], [a + 24, b + 13], [a, b + 13]], k.b(i, j), true);
        const u = a + 3 + 6 * k.rnd(i, j, 1), q = b + 3 + 2 * k.rnd(i, j, 2);
        k.B.poly([[u, q], [u + 11, q], [u + 11, q + 6], [u, q + 6]], 0, true);
        if (k.rnd(i, j, 4) < 0.6) k.B.seg(a + 24, b + 6.5, a + 36, b + 6.5 + 3 * (k.rnd(i, j, 5) - 0.5), 0);
      }, true);
    },
    grid: function(k) {          // squared paper
      k.rows(11, function(v, j) { k.row(v, { breaks: 0.04, bucket: j % 5 === 0 ? 2 : 0, wobble: 0.1 }); });
      k.grid(11, 11, function(x, y, i, j, v) {
        k.B.seg(x, y, x, k.Y(x, v + 11), i % 5 === 0 ? 2 : 0);
      });
    },
    lattice: function(k) {       // a crystal lattice
      k.grid(11, 10, function(x, y, i, j, v) {
        const ya = k.Y(x - 5.5, v + 10), yb = k.Y(x + 5.5, v + 10);
        if (Math.abs(ya - y) < 16) k.B.seg(x, y, x - 5.5, ya, 1);
        if (Math.abs(yb - y) < 16) k.B.seg(x, y, x + 5.5, yb, 1);
        if ((i + j) % 4 === 0) k.B.dot(x, y);
      }, true);
    },
    plus: function(k) {          // granite
      k.grid(14, 13, function(x, y, i, j) {
        const a = x + (k.rnd(i, j, 2) - 0.5) * 6, b = y + (k.rnd(i, j, 3) - 0.5) * 6, s = 1.7 + k.rnd(i, j, 4), t = (k.rnd(i, j, 5) - 0.5) * 0.8;
        k.B.seg(a - s, b - s * t, a + s, b + s * t, k.b(i, j));
        k.B.seg(a + s * t, b - s, a - s * t, b + s, k.b(i, j));
      }, true);
    },
    vees: function(k) {
      k.grid(13, 11, function(x, y, i, j) {
        const a = x + (k.rnd(i, j, 2) - 0.5) * 5, b = y + (k.rnd(i, j, 3) - 0.5) * 4;
        k.B.poly([[a - 2, b - 2], [a, b + 1.5], [a + 2, b - 2]], k.b(i, j));
      }, true);
    },
    pebbles: function(k) {       // conglomerate
      k.grid(15, 12, function(x, y, i, j) {
        const a = x + (k.rnd(i, j, 2) - 0.5) * 7, b = y + (k.rnd(i, j, 3) - 0.5) * 5, r = 1.8 + 3.4 * k.rnd(i, j, 4), t = k.rnd(i, j, 5) * 3, pts = [];
        for (let n = 0; n < 9; n++) {
          const an = n / 9 * TAU, ex = Math.cos(an) * r, ey = Math.sin(an) * r * 0.66;
          pts.push([a + ex * Math.cos(t) - ey * Math.sin(t), b + ex * Math.sin(t) + ey * Math.cos(t)]);
        }
        k.B.poly(pts, k.b(i, j), true);
      }, true);
    },
    rings: function(k) {         // blooms
      k.grid(16, 13, function(x, y, i, j) {
        const a = x + (k.rnd(i, j, 2) - 0.5) * 7, b = y + (k.rnd(i, j, 3) - 0.5) * 6, r = 2 + 2 * k.rnd(i, j, 4);
        k.B.poly(circle(a, b, r, k.rnd(i, j, 5) * 6, k.rnd(i, j, 5) * 6 + TAU * 0.9, 9), k.b(i, j));
        if (k.rnd(i, j, 6) < 0.4) k.B.dot(a, b);
      }, true);
    },
    glyphs: function(k) {        // brush strokes that might be writing
      const strokes = [
        [[0, 0], [7, -0.6]], [[3.5, -3], [3.3, 5]], [[5, -3], [1, 4.5]], [[2, -2], [6.5, 4.5]],
        [[0.5, 2.5], [6.5, 2]], [[1, -2.5], [1.2, 4]], [[6, -2.5], [6, 3.5], [4.8, 4.6]], [[1, -3], [6, -3.2]]
      ];
      k.grid(15, 15, function(x, y, i, j) {
        if (k.rnd(i, j, 1) < 0.18) return;
        const a = x + (k.rnd(i, j, 2) - 0.5) * 3, b = y + 5 + (k.rnd(i, j, 3) - 0.5) * 3, n = 2 + Math.floor(k.rnd(i, j, 4) * 3);
        for (let s = 0; s < n; s++) {
          const st = strokes[Math.floor(k.rnd(i, j, 10 + s) * strokes.length)];
          k.B2.poly(st.map(function(p) { return [a + p[0] + 0.8 * (k.rnd(i, j, 20 + s) - 0.5), b + p[1]]; }), 1 + (s % 2));
        }
      }, true);
    },
    curls: function(k) {         // restless
      k.grid(16, 14, function(x, y, i, j) {
        const a = x + (k.rnd(i, j, 2) - 0.5) * 6, b = y + (k.rnd(i, j, 3) - 0.5) * 5, t0 = k.rnd(i, j, 4) * 6, dir = k.rnd(i, j, 5) < 0.5 ? -1 : 1, pts = [];
        for (let n = 0; n < 12; n++) {
          const an = t0 + dir * n * 0.55, r = 0.5 + n * 0.36;
          pts.push([a + Math.cos(an) * r, b + Math.sin(an) * r]);
        }
        k.B.poly(pts, k.b(i, j));
      }, true);
    },
    gitgraph: function(k) {      // lines that branch and merge
      k.rows(10, function(v) { k.row(v, { breaks: 0.3 }); });
      k.grid(31, 10, function(x, y, i, j, v) {
        const a = x + 12 * k.rnd(i, j, 2);
        const ya = k.Y(a, v), up = k.rnd(i, j, 1) < 0.5 ? -10 : 10;
        if (k.rnd(i, j, 3) < 0.55) {
          const yb = k.Y(a + 8, v + up);
          if (Math.abs(yb - ya) < 18) k.B.seg(a, ya, a + 8, yb, 1);
        }
        k.B.dot(a, ya);
      }, true);
    },
    nodes: function(k) {         // nodes and edges
      const at = function(i, j) {
        const x = i * 19 + (j & 1) * 9.5 + (k.rnd(i, j, 2) - 0.5) * 9, v = j * 16 + (k.rnd(i, j, 3) - 0.5) * 8;
        return [x, k.Y(x, v)];
      };
      k.grid(19, 16, function(x, y, i, j) {
        const p = at(i, j);
        if (!k.vis(p[0], p[1])) return;
        k.B.dot(p[0], p[1]);
        if (k.rnd(i, j, 6) < 0.3) k.B.poly(circle(p[0], p[1], 2.2, 0, TAU, 8), 0);
        [[1, 0, 0.6], [0, 1, 0.45], [1, 1, 0.15]].forEach(function(e, n) {
          if (k.rnd(i, j, 7 + n) > e[2]) return;
          const q = at(i + e[0], j + e[1]);
          if (k.vis(q[0], q[1]) && Math.abs(q[1] - p[1]) < 26) k.B.seg(p[0], p[1], q[0], q[1], 0);
        });
      }, true);
    },
    ledger: function(k) {        // ruled, in columns, with entries
      k.rows(9, function(v) { k.row(v, { breaks: 0.03, bucket: 0, wobble: 0.1 }); });
      k.grid(54, 9, function(x, y, i, j, v) { k.B.seg(x, y, x, k.Y(x, v + 9), i % 3 === 0 ? 2 : 0); });
      k.grid(13.5, 9, function(x, y, i, j) {
        if (k.rnd(i, j, 1) < 0.5) return;
        const l = 3 + 6 * k.rnd(i, j, 2);
        k.B.seg(x + 11 - l, y + 5, x + 11, y + 5, 2);
      });
    },
    steps: function(k) {         // stairs
      k.rows(12, function(v) {
        k.row(v, { step: 1, tol: 5, wobble: 0.1, off: function(x) { return -3.5 * (Math.floor(x / 9) % 3 + (Math.floor(x / 9) % 3 < 0 ? 3 : 0)); } });
      });
    },
    hatch: function(k) {         // pressed hard
      k.grid(4.4, 11, function(x, y, i, j, v) {
        if (k.rnd(i, j, 1) < 0.12) return;
        const l = 0.6 + 0.4 * k.rnd(i, j, 2);
        const yb = k.Y(x - 5 * l, v + 11 * l);
        if (Math.abs(yb - y) < 20) k.B.seg(x, y, x - 5 * l, yb, k.b(i, j));
      }, true);
    },
    grain: function(k) {         // wood
      k.rows(4.3, function(v, j) {
        k.row(v, { breaks: 0.16, bucket: j % 3 ? 0 : 1, off: function(x) { return 3.4 * noise2(x / 52, v / 15, k.seed); } });
      });
      k.grid(130, 44, function(x, y, i, j) {
        if (k.rnd(i, j, 1) < 0.5) return;
        const a = x + 90 * k.rnd(i, j, 2), b = k.Y(a, j * 44 + 18);
        if (!k.vis(a, b)) return;
        [2.2, 4.2].forEach(function(r) { k.B.poly(circle(a, b, r, 0, TAU, 10).map(function(p) { return [a + (p[0] - a) * 1.8, p[1]]; }), 1, true); });
      });
    },
    bursts: function(k) {
      k.grid(18, 15, function(x, y, i, j) {
        const a = x + (k.rnd(i, j, 2) - 0.5) * 7, b = y + (k.rnd(i, j, 3) - 0.5) * 6, r = 2 + 1.4 * k.rnd(i, j, 4), t = k.rnd(i, j, 5);
        for (let n = 0; n < 3; n++) {
          const an = t + n * Math.PI / 3;
          k.B.seg(a - Math.cos(an) * r, b - Math.sin(an) * r, a + Math.cos(an) * r, b + Math.sin(an) * r, k.b(i, j));
        }
      }, true);
    },
    made: function(k) {          // made ground: rubble, brick and what people left
      k.grid(16, 12, function(x, y, i, j) {
        const a = x + (k.rnd(i, j, 2) - 0.5) * 6, b = y + 3 + (k.rnd(i, j, 3) - 0.5) * 4, t = k.rnd(i, j, 1);
        if (t < 0.4) {
          const s = 1.8 + 1.4 * k.rnd(i, j, 4);
          k.B.poly([[a, b], [a + s * 1.6, b], [a + s * 1.6, b + s], [a, b + s]], k.b(i, j), true);
        } else if (t < 0.75) {
          k.B.seg(a, b, a + 4 + 3 * k.rnd(i, j, 5), b + (k.rnd(i, j, 6) - 0.5) * 1.5, k.b(i, j));
        } else {
          k.B.dot(a, b);
        }
      }, true);
    },
    crowd: function(k) {         // many small marks gathering
      k.grid(27, 19, function(x, y, i, j) {
        const n = 4 + Math.floor(7 * k.rnd(i, j, 1));
        for (let m = 0; m < n; m++) {
          const a = x + (k.rnd(i, j, 10 + m) + k.rnd(i, j, 30 + m) - 1) * 11, b = y + 4 + (k.rnd(i, j, 50 + m) + k.rnd(i, j, 70 + m) - 1) * 7;
          k.B.seg(a, b, a + 0.4, b - 2 - 1.5 * k.rnd(i, j, 90 + m), m % 3);
        }
      }, true);
    },
    traces: function(k) {        // a circuit board
      k.grid(21, 16, function(x, y, i, j) {
        const a = x + (k.rnd(i, j, 2) - 0.5) * 6, b = y + 3 + (k.rnd(i, j, 3) - 0.5) * 4;
        const l1 = 6 + 10 * k.rnd(i, j, 4), l2 = (4 + 6 * k.rnd(i, j, 5)) * (k.rnd(i, j, 6) < 0.5 ? -1 : 1);
        k.B.poly([[a, b], [a + l1, b], [a + l1 + Math.abs(l2) * 0.5, b + l2 * 0.5], [a + l1 + Math.abs(l2) * 0.5 + 4, b + l2 * 0.5]], k.b(i, j));
        k.B.dot(a, b);
        k.B.poly(circle(a + l1 + Math.abs(l2) * 0.5 + 5.2, b + l2 * 0.5, 1.2, 0, TAU, 6), 1, true);
      }, true);
    },
    shells: function(k) {        // a kernel and its shells
      k.grid(21, 17, function(x, y, i, j) {
        const a = x + (k.rnd(i, j, 2) - 0.5) * 6, b = y + 6 + (k.rnd(i, j, 3) - 0.5) * 5, t = k.rnd(i, j, 4) * TAU;
        k.B.dot(a, b);
        k.B.poly(circle(a, b, 2.6, t, t + 4.2, 8), 1);
        if (k.rnd(i, j, 5) < 0.7) k.B.poly(circle(a, b, 4.9, t + 0.8, t + 4.4, 10), 0);
      }, true);
    },
    sockets: function(k) {       // clean joins: lines with square teeth
      k.rows(11, function(v, j) {
        const ph = j * 7;
        k.row(v, { step: 1, tol: 5, wobble: 0.1, breaks: 0.05, off: function(x) { const m = (((x + ph) % 17) + 17) % 17; return m < 5 ? -3.5 : 0; } });
      });
    },
    pipes: function(k) {         // plumbing between layers
      k.rows(13, function(v) {
        k.row(v, { breaks: 0.06 });
        k.row(v + 3, { breaks: 0.06 });
      });
      k.grid(57, 13, function(x, y, i, j, v) {
        if (k.rnd(i, j, 1) < 0.35) return;
        const a = x + 30 * k.rnd(i, j, 2);
        k.B.seg(a, k.Y(a, v + 3), a, k.Y(a, v + 13), 1);
        k.B.seg(a + 3, k.Y(a + 3, v + 3), a + 3, k.Y(a + 3, v + 13), 1);
      }, true);
    },
    interleave: function(k) {    // leaving the line and rejoining it
      k.grid(29, 8, function(x, y, i, j, v) {
        const l = 9 + 6 * k.rnd(i, j, 1), yb = k.Y(x + l, v);
        if (Math.abs(yb - y) > l) return;
        k.B.seg(x, y, x + l, yb, k.b(i, j));
        if (k.rnd(i, j, 2) < 0.6) {
          const yc = k.Y(x + l + 6, v - 8);
          if (Math.abs(yc - yb) < 16) k.B.seg(x + l, yb, x + l + 6, yc, 0);
        }
      }, true);
    },
    sprigs: function(k) {        // growth
      k.grid(17, 15, function(x, y, i, j) {
        const a = x + (k.rnd(i, j, 2) - 0.5) * 7, b = y + 6 + (k.rnd(i, j, 3) - 0.5) * 5, lean = (k.rnd(i, j, 4) - 0.5) * 3, bk = k.b(i, j);
        k.B.seg(a, b, a + lean, b - 5.5, bk);
        k.B.seg(a + lean * 0.4, b - 2.2, a + lean * 0.4 - 2.6, b - 4.6, bk);
        k.B.seg(a + lean * 0.6, b - 3.2, a + lean * 0.6 + 2.6, b - 5.6, bk);
      }, true);
    }
  };
  const ROCK_WEIGHT = { hatch: 0.62, glyphs: 0.8, grid: 0.4, ledger: 0.4, laminae: 0.4, lanes: 0.42, grain: 0.45, dots: 0.6, bricks: 0.5 };

  function paintRock(P, F, S, clip, lo, hi) {
    const name = ROCKS[S.style[1]] ? S.style[1] : 'dots';
    const color = pigment(P, S.tag);
    const B = new Batch(), B2 = new Batch();
    const wob = P.hand.wobble * 0.55;
    const vis = function(x, y) { return y > F.clip(x) + 1.5 && y < P.H + 3; };
    // the pattern is indicated, not filled in: it runs out here and there
    // (technical: filled in and measured … barely indicated)
    const cover = (P.scene.C.technical - 0.5) * 0.56;
    const there = function(x, v) { return smooth(-0.32 - cover, -0.04 - cover, noise2(x / 120, v / 30, S.seed + 500)); };
    const k = {
      P: P, B: B, B2: B2, seed: S.seed, color: color, clip: clip, Y: F.Y, vis: vis,
      rnd: function(i, j, s) { return irand(i, j, S.seed + s); },
      b: function(i, j) { return Math.floor(irand(i, j, S.seed + 99) * 3); },
      slope: function(x, v) { return clamp((F.Y(x + 4, v) - F.Y(x - 4, v)) / 8, -1, 1); },
      rows: function(dv, cb) {
        for (let j = Math.ceil(lo / dv); j * dv < hi; j++) {
          if (F.S0 + j * dv - 130 > P.H) break;
          cb(j * dv, j);
        }
      },
      // a line along the bedding, lifted where it leaves the rock
      row: function(v, o) {
        o = o || {};
        const step = o.step || 4, path = o.path || B.p[o.bucket === undefined ? 1 : o.bucket];
        const sd = (S.seed + Math.round(v * 7)) | 0, wb = o.plain ? 0 : (o.wobble === undefined ? wob : o.wobble);
        let pen = false, py = 0;
        for (let i = Math.floor(P.X0 / step); i <= Math.ceil(P.X1 / step); i++) {
          const x = i * step;
          let y = F.Y(x, v);
          const gap = there(x, v) < 0.5 || (!o.plain && (!vis(x, y) || (o.breaks && noise1(x / 37 + v * 0.71, sd) > 1 - 2 * o.breaks)));
          if (gap) { pen = false; continue; }
          if (o.off) y += o.off(x);
          y += wb * noise1(x / 21, sd + 1);
          if (pen && Math.abs(y - py) > step * 2.5 + (o.tol || 0)) pen = false;
          if (pen) path.lineTo(x, y); else path.moveTo(x, y);
          pen = true;
          py = y;
        }
      },
      // marks on a grid that follows the bedding
      grid: function(dx, dv, cb, stagger) {
        for (let j = Math.ceil(lo / dv); j * dv < hi; j++) {
          const v = j * dv;
          if (F.S0 + v - 130 > P.H) break;
          const off = stagger ? (j & 1) * dx * 0.5 : 0;
          for (let i = Math.floor((P.X0 - off) / dx) - 1; i <= Math.ceil((P.X1 - off) / dx); i++) {
            const x = i * dx + off, y = F.Y(x, v);
            if (!vis(x, y) || irand(i, j, S.seed + 777) >= there(x, v)) continue;
            cb(x, y, i, j, v);
          }
        }
      }
    };
    ROCKS[name](k);
    const weight = (ROCK_WEIGHT[name] || 0.5) * (P.dark ? 0.9 : 1);
    P.pencil.save();
    P.pencil.clip(clip);
    B.flush(P, tinted(P, color, 0.4), weight, 0.85);
    B2.flush(P, P.dark ? P.pal.chalk : mix(P.graphite, P.pal.ink, 0.5), weight, 1.5);
    P.pencil.restore();
  }

  function paintFooter(P) {
    const sc = P.scene, F = sc.ground, w = P.wash, hand = P.hand;
    const STEP = 3;
    const xs = [];
    for (let X = Math.floor(P.X0 / STEP) * STEP - 6; X <= P.X1 + 6; X += STEP) xs.push(X);
    const bottom = P.H + 12;
    const below = function(fn) {
      const p = new Path2D();
      p.moveTo(xs[0], bottom);
      xs.forEach(function(X) { p.lineTo(X, fn(X)); });
      p.lineTo(xs[xs.length - 1], bottom);
      p.closePath();
      return p;
    };
    const clip = below(F.clip);
    const band = function(top, base) {
      const p = new Path2D();
      xs.forEach(function(X, i) { const y = top(X); if (i) p.lineTo(X, y); else p.moveTo(X, y); });
      for (let i = xs.length - 1; i >= 0; i--) p.lineTo(xs[i], Math.min(bottom, base(xs[i])));
      p.closePath();
      return p;
    };

    // the rock: one wash per bed, each a little different
    w.save();
    w.clip(clip);
    F.strata.forEach(function(S) {
      const color = pigment(P, S.tag);
      S.beds.forEach(function(bed, i) {
        let c = P.dark ? dim(color, 1 + 0.2 * Math.min(0, bed.hue))
          : bed.hue > 0 ? mix(color, [1, 0.9, 0.7], 0.1 * bed.hue) : mix(color, P.pal.header, -0.12 * bed.hue);
        if (S.tag.name === 'python' && i % 4 === 2) c = mix(c, onPaper(P, [0.93, 0.74, 0.2]), 0.7);
        // `ai`: every other bed in the pigment of what the post is about
        if (S.form && i % 2 === 1) c = mix(c, pigment(P, S.form.tag), 0.35 + 0.6 * S.form.p);     // blue with a touch of yellow
        w.fillStyle = css(c);
        w.globalAlpha = clamp((P.dark ? 0.6 : 0.28) * bed.tone * (1 + (0.55 - sc.C.valence) * 0.5), 0, 1);
        const sd = S.seed + i * 17, gap = 0.5 + 0.9 * hand.loose;
        const top = function(X) { return F.Y(X, bed.v0) + gap * (0.6 + noise1(X / 27, sd)); };
        const base = function(X) { return F.Y(X, bed.v1) - gap * (0.6 + noise1(X / 27, sd + 1)); };
        w.fill(band(top, base));
        if (P.dark) {
          // underground the light is in the rock: every bed glows along its
          // top and goes dark towards the bed below (as the ranges above do)
          const reach = Math.min(bed.v1 - bed.v0, 60);
          w.globalCompositeOperation = 'source-atop';
          w.fillStyle = '#000';
          w.globalAlpha = 0.3;
          for (let n = 0; n < 5; n++) {
            const d = reach * (0.06 + 0.78 * Math.pow(n / 4, 1.25));
            w.fill(band(function(X) { return top(X) + d; }, base));
          }
          w.globalCompositeOperation = 'source-over';
        }
      });
    });
    // places the brush missed
    w.globalCompositeOperation = 'destination-out';
    w.globalAlpha = 1;
    cells(P, 120, function(c) {
      const r = cellRng(sc.seed + 151, c);
      for (let i = 0; i < 3; i++) softBlob(w, (c + r()) * 120, 90 + 380 * r(), 30 + 70 * r(), 6 + 16 * r(), WHITE, 0.2 + 0.35 * r());
    }, 1);
    w.globalCompositeOperation = 'source-over';
    // seams: the tags that only tint
    F.seams.forEach(function(seam, i) {
      const path = new Path2D();
      xs.forEach(function(X, n) { const y = F.Y(X, seam.v); if (n) path.lineTo(X, y); else path.moveTo(X, y); });
      w.strokeStyle = css(pigment(P, seam.tag));
      w.globalAlpha = P.dark ? 0.85 : 0.7;
      w.lineWidth = 2.6 + (i % 2);
      w.stroke(path);
    });
    // dikes: where code has pushed up through the beds
    const dikes = [];
    cells(P, F.DC, function(c) {
      const d = F.dike(c);
      if (!d) return;
      const left = [], right = [];
      for (let y = d.top; y <= bottom; y += 6) {
        const t = smooth(d.top, d.top + 40, y), cx = d.x + d.slope * (y - 280) + 5 * noise1(y / 40, d.seed);
        left.push([cx - d.w * t * 0.5 + 1.2 * noise1(y / 9, d.seed + 1), y]);
        right.push([cx + d.w * t * 0.5 + 1.2 * noise1(y / 9, d.seed + 2), y]);
      }
      const path = new Path2D();
      left.forEach(function(p, i) { if (i) path.lineTo(p[0], p[1]); else path.moveTo(p[0], p[1]); });
      for (let i = right.length - 1; i >= 0; i--) path.lineTo(right[i][0], right[i][1]);
      path.closePath();
      w.globalCompositeOperation = 'destination-out';
      w.globalAlpha = 0.8;
      w.fill(path);
      w.globalCompositeOperation = 'source-over';
      w.globalAlpha = P.dark ? 0.4 : 0.42;
      w.fillStyle = css(U.tone(P.pal.shade, P.dark ? 0.83 : 0.385, 0.035));
      w.fill(path);
      dikes.push({ left: left, right: right, path: path, seed: d.seed });
    }, 1);
    w.restore();

    // what the weather laid on top: the register tags, draped over the surface
    F.drapes.forEach(function(D) {
      w.fillStyle = css(pigment(P, D.tag));
      w.globalAlpha = P.dark ? 0.6 : 0.42;
      w.fill(band(
        function(X) { return F.surface(X) + D.d0 + 0.6; },
        function(X) { return F.surface(X) + D.d1 + 1.2 * noise1(X / 23, D.seed); }
      ));
    });
    if (!F.drapes.length) {
      w.fillStyle = css(P.dark ? dim(P.pal.chalk, 0.5) : mix(P.graphite, [0.5, 0.4, 0.25], 0.5));
      w.globalAlpha = 0.3;
      w.fill(band(function(X) { return F.surface(X) + 0.3; }, function(X) { return F.surface(X) + F.drapeDepth + 0.5; }));
    }
    // weathered near the surface, full strength at depth
    w.save();
    w.globalCompositeOperation = 'destination-out';
    w.globalAlpha = 1;
    // (an open ending leaves the upper part hardly painted at all)
    const open = sc.C.end.open;
    const g = w.createLinearGradient(0, 40, 0, 330);
    g.addColorStop(0, 'rgba(0,0,0,' + (0.55 + 0.4 * open) + ')');
    g.addColorStop(0.45, 'rgba(0,0,0,' + (0.3 + 0.45 * open) + ')');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    w.fillStyle = g;
    w.fillRect(P.X0 - 4, 0, P.X1 - P.X0 + 8, 330);
    w.restore();

    // ---- pencil ----
    const jump = 5;
    F.strata.forEach(function(S) {
      const color = tinted(P, pigment(P, S.tag), 0.35);
      const lo = Math.max(S.v0, -260), hi = Math.min(S.v1, P.H);
      paintRock(P, F, S, clip, lo, hi);
      S.beds.forEach(function(bed, i) {
        const contact = i === 0;
        if (contact && S.top === null) return;
        drawFn(P, function(X) { const y = F.Y(X, bed.v0); return y > F.clip(X) + 1 ? y : null; }, {
          seed: S.seed + i * 3, weight: contact ? 0.85 : 0.3, color: contact ? P.graphite : color, jump: jump,
          breaks: contact ? 0.03 : 0.25, retrace: contact, width: contact ? 1.05 : 0.8
        });
      });
    });
    // faults: a line through everything
    cells(P, F.FC, function(c) {
      const f = F.fault(c);
      if (!f) return;
      const pts = [];
      for (let y = 40; y <= bottom; y += 8) {
        const x = f.x + f.slope * (y - 130);
        if (y > F.clip(x) - 2) pts.push([x, y]);
      }
      if (pts.length > 1) drawPoly(P, pts, { weight: 0.7, seed: sc.seed + c, retrace: true, width: 1.05 });
    }, 2);
    dikes.forEach(function(d) {
      P.pencil.save();
      P.pencil.clip(clip);
      drawPoly(P, d.left, { weight: 0.45, seed: d.seed });
      drawPoly(P, d.right, { weight: 0.45, seed: d.seed + 1 });
      const B = new Batch();
      for (let i = 1; i < d.left.length; i += 2) {
        const a = d.left[i], b = d.right[i];
        if (b[0] - a[0] > 2.5) B.seg(a[0] + 0.8, a[1], b[0] - 0.8, b[1] - 2.5 + 5 * irand(i, 1, d.seed), i % 3);
      }
      B.flush(P, P.graphite, 0.35, 0.8);
      P.pencil.restore();
    });

    // the drapes and their hatching
    F.drapes.forEach(function(D, n) {
      const color = pigment(P, D.tag);
      const B = new Batch(), name = D.style[1];
      cells(P, 5.5, function(i) {
        for (let j = 0; j < 2; j++) {
          if (irand(i, j, D.seed) < 0.25) continue;
          const x = (i + irand(i, j, D.seed + 1)) * 5.5, y = F.surface(x) + D.d0 + 2.2 + (D.d1 - D.d0 - 4) * irand(i, j, D.seed + 2);
          if (name === 'dots' || name === 'sparse' || name === 'rings') B.dot(x, y);
          else if (name === 'hatch') B.seg(x + 1.5, y - 2.5, x - 1.5, y + 2.5, j);
          else if (name === 'ledger' || name === 'steps' || name === 'laminae') B.seg(x - 2.5, y, x + 2.5, y, j);
          else if (name === 'bursts') { B.seg(x - 1.5, y, x + 1.5, y, j); B.seg(x, y - 1.5, x, y + 1.5, j); }
          else B.seg(x, y - 1.2, x + 0.5, y + 1.2, j);
        }
      });
      B.flush(P, tinted(P, color, 0.4), 0.6, 0.85);
      drawFn(P, function(X) { return F.surface(X) + D.d1; }, {
        seed: D.seed + 3, weight: n === F.drapes.length - 1 ? 0.7 : 0.4, breaks: 0.08, color: tinted(P, color, 0.3)
      });
    });
    if (!F.drapes.length) {
      drawFn(P, F.clip, { seed: sc.seed + 5, weight: 0.4, breaks: 0.2, retrace: false });
    }
    // the surface itself, and what grows on it
    drawFn(P, F.surface, { seed: sc.seed + 7, weight: 1, width: 1.15, breaks: 0.02 });
    const grass = new Batch();
    cells(P, 4, function(i) {
      const r = irand(i, 1, sc.seed + 11);
      if (noise1(i * 0.07, sc.seed + 12) < 0.1 || r < 0.45) return;
      const x = (i + r) * 4, y = F.surface(x);
      grass.seg(x, y - 0.3, x + (irand(i, 2, sc.seed) - 0.4) * 2, y - 2 - 2.6 * irand(i, 3, sc.seed), i % 3);
    });
    grass.flush(P, P.graphite, 0.55, 0.8);

    if (sc.motif && BELOW[sc.motif.kind]) BELOW[sc.motif.kind](P, sc.motif, clip);
    paintActor(P, function(x) { return [x, F.surface(x)]; }, sc.actorX);
    sc.signs.forEach(function(sign) { paintFind(P, sign); });
  }

  // The motif again, where the section cuts through it.
  const BELOW = {
    water: function(P, M) {         // a tarn in the lowest hollow
      const F = P.scene.ground, w = P.wash, blue = onPaper(P, [0.3, 0.54, 0.74]);
      let xl = M.x, low = -1;
      for (let d = -220; d <= 220; d += 3) if (F.surface(M.x + d) > low) { low = F.surface(M.x + d); xl = M.x + d; }
      const level = low - 8;
      let a = xl, b = xl;
      while (F.surface(a - 2) > level && xl - a < 260) a -= 2;
      while (F.surface(b + 2) > level && b - xl < 260) b += 2;
      const path = new Path2D();
      path.moveTo(a, level);
      for (let x = a; x <= b; x += 2) path.lineTo(x, F.surface(x) - 0.5);
      path.lineTo(b, level);
      path.closePath();
      w.fillStyle = css(blue, P.dark ? 0.7 : 0.55);
      w.fill(path);
      drawPoly(P, [[a, level], [b, level]], { weight: 0.8, seed: M.seed, color: tinted(P, blue, 0.5), wobble: 0.15 });
      const B = new Batch();
      for (let i = 0; i < 6; i++) {
        const r = cellRng(M.seed, i), x = lerp(a, b, 0.15 + 0.6 * r()), y = level + 2 + 4 * r();
        if (y < F.surface(x) - 1.5) B.seg(x, y, x + 5 + 8 * r(), y, 1);
      }
      B.flush(P, tinted(P, blue, 0.5), 0.5, 0.8);
    },
    fire: function(P, M, clip) {    // what feeds it: a body of melt rising from below
      const w = P.wash, hot = onPaper(P, [0.88, 0.32, 0.1]), left = [], right = [];
      for (let y = 250; y <= P.H + 12; y += 8) {
        const t = smooth(250, 330, y), half = (4 + 44 * t * t) * (0.8 + 0.2 * noise1(y / 30, M.seed));
        const cx = M.x + 10 * noise1(y / 60, M.seed + 1);
        left.push([cx - half, y]);
        right.push([cx + half, y]);
      }
      const path = new Path2D();
      left.forEach(function(p, i) { if (i) path.lineTo(p[0], p[1]); else path.moveTo(p[0], p[1]); });
      for (let i = right.length - 1; i >= 0; i--) path.lineTo(right[i][0], right[i][1]);
      path.closePath();
      w.save();
      w.clip(clip);
      w.globalCompositeOperation = 'destination-out';
      w.globalAlpha = 0.85;
      w.fill(path);
      w.globalCompositeOperation = 'source-over';
      w.globalAlpha = P.dark ? 0.8 : 0.6;
      w.fillStyle = css(hot);
      w.fill(path);
      w.restore();
      drawPoly(P, left, { weight: 0.6, seed: M.seed, curve: true });
      drawPoly(P, right, { weight: 0.6, seed: M.seed + 1, curve: true });
    },
    stone: function(P, M) {         // boulders lying on the ground
      const F = P.scene.ground;
      for (let i = 0; i < 6; i++) {
        const r = cellRng(M.seed, 10 + i), x = M.x + (r() - 0.5) * 260, rad = 2 + 4 * r(), y = F.surface(x) - rad * 0.55;
        drawPoly(P, circle(x, y, rad, 0, TAU, 9).map(function(q) { return [q[0], y + (q[1] - y) * 0.62]; }),
          { weight: 0.85, seed: M.seed + i, close: true, wobble: 0.35, fill: onPaper(P, [0.55, 0.53, 0.5]), fillAlpha: 0.4 });
      }
    },
    growth: function(P, M) {        // the wood, and its roots
      const F = P.scene.ground, B = new Batch(), green = onPaper(P, [0.36, 0.54, 0.18]);
      P.pencil.save();
      P.pencil.strokeStyle = css(tinted(P, green, 0.3));
      P.pencil.lineCap = 'round';
      for (let i = -24; i <= 24; i++) {
        const r = cellRng(M.seed, i), x = M.x + i * 8 + 5 * r();
        if (r() > 1.15 - Math.abs(i) / 26 || r() < 0.2) continue;
        const y = F.surface(x);
        tree(P, B, x, y + 0.3, 6 + 7 * r(), green);
        P.pencil.globalAlpha = 0.5;
        P.pencil.lineWidth = 0.8 * P.lw;
        vein(P.pencil, x, y + 1, 0.3 * (r() - 0.5), 1, 2, r);
      }
      P.pencil.restore();
      B.flush(P, tinted(P, green, 0.4), 0.85, 0.85);
    },
    building: function(P, M) {      // the tower, and what it stands on
      const F = P.scene.ground, x = highest(P.scene, M.x, 70), y = F.surface(x), B = new Batch();
      tower(P, x, y, M.seed);
      for (let i = -1; i <= 1; i++) B.seg(x + i * 3.4, y + 1, x + i * 3.4, y + 20 + 5 * Math.abs(i), 2);
      B.seg(x - 6, y + 9, x + 6, y + 9, 1);
      B.flush(P, P.graphite, 0.8, 0.9);
    },
    road: function(P, M) {          // the path, as stakes along the ground
      const F = P.scene.ground, B = new Batch();
      for (let x = M.x - 190; x <= M.x + 190; x += 19) {
        const y = F.surface(x);
        B.seg(x, y, x, y - 4.5, 2);
        if (x + 19 <= M.x + 190) B.seg(x + 5, y - 6 + (F.surface(x + 5) - y), x + 13, F.surface(x + 13) - 6, 0);
      }
      B.flush(P, P.graphite, 0.75, 0.9);
    },
    body: function(P, M, clip) {    // veins through the rock
      const w = P.wash, red = onPaper(P, [0.62, 0.1, 0.18]);
      w.save();
      w.clip(clip);
      w.strokeStyle = css(red);
      w.lineCap = 'round';
      w.globalAlpha = P.dark ? 0.75 : 0.55;
      for (let i = -2; i <= 2; i++) {
        const r = cellRng(M.seed, 20 + i);
        w.lineWidth = 1.2;
        vein(w, M.x + i * 120 + 60 * (r() - 0.5), P.H + 4, 0.5 * (r() - 0.5), -1.6, 4, r);
      }
      w.restore();
    },
    crowd: function(P, M) {         // the people, on the ground
      const F = P.scene.ground, B = new Batch(), r = cellRng(M.seed, 3), n = 11 + r.int(8);
      for (let i = 0; i < n; i++) {
        const x = M.x + r.gauss() * 46, y = F.surface(x), h = 4 + 1.6 * r();
        B.seg(x, y, x + 0.3 * (r() - 0.5), y - h, 2);
        B.dot(x, y - h - 1.5);
      }
      B.flush(P, P.graphite, 0.9, 0.9);
    }
  };

  // A project tag below ground: a flag, a borehole, and what it struck.
  function paintFind(P, sign) {
    const F = P.scene.ground, w = P.wash;
    const c = pigment(P, sign.tag), line = tinted(P, c, 0.45);
    const x = sign.x, y0 = F.surface(x), y1 = y0 + sign.depth;
    const o = { weight: 0.9, color: line, seed: sign.seed + 11, wobble: 0.2 };
    // flag
    w.fillStyle = css(c, P.dark ? 0.9 : 0.8);
    w.beginPath();
    w.moveTo(x + 0.4, y0 - 15);
    w.lineTo(x + 7.5, y0 - 12.6);
    w.lineTo(x + 0.4, y0 - 10.2);
    w.fill();
    drawPoly(P, [[x, y0 + 1], [x + 0.2, y0 - 15.4]], Object.assign({}, o, { retrace: true }));
    drawPoly(P, [[x + 0.4, y0 - 15], [x + 7.5, y0 - 12.6], [x + 0.4, y0 - 10.2]], o);
    // the hole
    const B = new Batch();
    for (let y = y0 + 2; y < y1 - 20; y += 5) {
      B.seg(x - 1.3, y, x - 1.3, y + 3, 1);
      B.seg(x + 1.3, y + 1, x + 1.3, y + 4, 1);
    }
    B.flush(P, P.graphite, 0.75, 0.8);
    // the find, in a clearing rubbed into the hatching
    const rub = function(ctx, r, a) {
      ctx.save();
      ctx.globalCompositeOperation = 'destination-out';
      softBlob(ctx, x + 8, y1 - 5, r * 1.5, r, WHITE, a);
      ctx.restore();
    };
    rub(P.pencil, 20, 1);
    rub(w, 19, 0.75);
    glyph(P, sign, x, y1);
  }

  // Paints one band into its two layers.
  function paint(scene, surface, env, maxSize) {
    const cw = surface.canvas.width, ch = surface.canvas.height;
    const f = Math.min(1, maxSize / cw);
    const lw = Math.max(2, Math.round(cw * f)), lh = Math.max(2, Math.round(ch * f));
    const worldH = surface.kind === 'footer' ? FOOTER_H : HEADER_H;
    const k = lh / worldH;
    const make = function() {
      const c = document.createElement('canvas');
      c.width = lw;
      c.height = lh;
      const ctx = c.getContext('2d');
      ctx.setTransform(k, 0, 0, k, lw / 2, 0);
      ctx.lineJoin = 'round';
      return ctx;
    };
    const pal = env.palette(), dark = env.dark;
    const css1 = surface.height / worldH;      // CSS pixels per world pixel
    const P = {
      wash: make(), pencil: make(), tmp: make(), k: k, H: worldH,
      X0: -lw / 2 / k - 4, X1: lw / 2 / k + 4,
      dark: dark, pal: pal, scene: scene, hand: scene.hand,
      lw: 1 / Math.pow(Math.min(1, css1), 0.6),
      graphite: pal.graphite
    };
    const sky = scene.sky ? pigment(P, scene.sky) : null;
    // warmth: hope and play, and how personal the post is
    const C = scene.C;
    P.warmth = clamp(0.6 * C.mood.hopeful + 0.4 * C.mood.playful + 0.9 * Math.max(0, C.personal - 0.45), 0, 1);
    // (at night, without a register: the blue of the hour, as light)
    P.air = dark ? U.glow(pal.sky, pal.paper) : (sky ? mix(pal.sky, sky, 0.35) : pal.sky);
    if (!dark) P.air = mix(P.air, [0.9, 0.76, 0.56], 0.45 * P.warmth);
    if (surface.kind === 'footer') paintFooter(P); else paintHeader(P);
    P.tmp.canvas.width = 0;
    return { wash: P.wash.canvas, pencil: P.pencil.canvas };
  }

  // ---- the medium: a shader over the two layers ----------------------------

  const VERTEX = 'attribute vec2 a_position; void main() { gl_Position = vec4(a_position, 0.0, 1.0); }';
  // The two themes are two media, so each has its own pair of programs (made
  // when the theme is first drawn): `night` picks the lines that differ.  By
  // day the wash is pigment, it multiplies the paper; at night it is light,
  // added to the navy (U.LIGHT_GLSL: shine()).
  //
  // What both programs of a theme share: noise, and the air (see air()) over
  // a finished colour.  u_amb: strength (0: none), shadow, mist, sun; u_off:
  // how far the two layers of cloud and of mist have drifted (world px);
  // u_mix: how the layers are blended (each starts over while it is not
  // shown, so the drift never has to jump); u_mistY: the valleys.
  const common = function(night) { return `
    #ifdef GL_FRAGMENT_PRECISION_HIGH
    precision highp float;
    #else
    precision mediump float;
    #endif
    uniform vec2 u_res;
    uniform float u_scale;
    uniform vec3 u_paper, u_mist;
    uniform vec4 u_amb, u_off, u_mistY;
    uniform vec2 u_mix;

    float hash(vec2 p) {
      vec3 p3 = fract(vec3(p.xyx) * .1031);
      p3 += dot(p3, p3.yzx + 33.33);
      return fract((p3.x + p3.y) * p3.z);
    }
    float vnoise(vec2 p) {
      vec2 i = floor(p), f = fract(p);
      f = f * f * (3. - 2. * f);
      return mix(mix(hash(i), hash(i + vec2(1., 0.)), f.x),
                 mix(hash(i + vec2(0., 1.)), hash(i + vec2(1., 1.)), f.x), f.y);
    }
    float fbm(vec2 p) {
      return .5 * vnoise(p) + .3 * vnoise(p * 2.03 + 7.1) + .2 * vnoise(p * 4.1 + 3.3);
    }
    // two drifting layers of noise, blended so that the contrast stays the same
    float drifting(vec2 p, float a, float b, float w, float size) {
      float na = fbm(vec2(p.x - a, p.y) / size);
      float nb = fbm(vec2(p.x - b, p.y) / size + vec2(17.3, 9.1));
      return (mix(na, nb, w) - .5) / sqrt(w * w + (1. - w) * (1. - w)) + .5;
    }
    float valley(float y, float at) {
      float d = (y - at) / 11.;
      return exp(-d * d);
    }
    // (open: how much of the picture stands here, 0 where the band has
    // dissolved into the page; only the night's mist asks)
    vec3 ambient(vec3 color, vec2 wp${night ? ', float open' : ''}) {
      if (u_amb.x <= 0.) return color;
      vec3 d = color - u_paper;
      // where there is paint (the paper, and the fade into the page, stay)
      float paint = smoothstep(.015, .1, length(d));
      // the shadows of clouds passing over, and the light between them
      float c = drifting(vec2(wp.x, wp.y * 1.7), u_off.x, u_off.y, u_mix.x, 190.);
      float shade = smoothstep(.5, .6, c) * u_amb.y - (1. - smoothstep(.38, .48, c)) * u_amb.w;
      // mist along the valleys: wisps that lift the pigment where they pass
      // (at night they veil the light behind them, and have a little of their
      // own: u_mist is then the navy with the night's light on it)
      float band = min(1., valley(wp.y, u_mistY.x) + valley(wp.y, u_mistY.y) + valley(wp.y, u_mistY.z) + valley(wp.y, u_mistY.w));
      float m = band * smoothstep(.46, .66, drifting(vec2(wp.x, wp.y * 6.), u_off.z, u_off.w, u_mix.y, 150.)) * u_amb.z * u_amb.x;
      vec3 lit = u_paper + d * (1. + shade * u_amb.x);
      ${night ? `
      vec3 hazed = u_paper + (lit - u_paper) * (1. - .5 * m);
      return clamp(mix(color, hazed, paint) + (u_mist - u_paper) * m * open * open * open, 0., 1.);
      ` : `
      // in the cloud's shadow the light is cooler, a little darker even on pale paint
      lit = mix(lit, lit * vec3(.82, .86, .95), paint * max(shade, 0.) * u_amb.x);
      vec3 hazed = u_paper + (lit - u_paper) * (1. - m);
      return clamp(mix(color, hazed, paint), 0., 1.);
      `}
    }
  `; };
  // The settled picture, cached in a texture: only the air is drawn over it.
  // (the cache's alpha says where the picture stands: see `open`)
  const ambientSource = function(night) { return common(night) + `
    uniform sampler2D u_cache;
    void main() {
      vec2 frag = gl_FragCoord.xy;
      vec2 wp = vec2(frag.x - .5 * u_res.x, u_res.y - frag.y) / u_scale;
      ${night ? `
      vec4 settled = texture2D(u_cache, frag / u_res);
      gl_FragColor = vec4(ambient(settled.rgb, wp, settled.a), 1.);
      ` : `
      gl_FragColor = vec4(ambient(texture2D(u_cache, frag / u_res).rgb, wp), 1.);
      `}
    }
  `; };
  const fragmentSource = function(night) { return common(night) + (night ? U.LIGHT_GLSL : '') + `
    uniform float u_footer, u_t, u_lift, u_loose, u_age, u_fox, u_edge, u_chalk${night ? ', u_cached' : ''};
    uniform vec3 u_yellow, u_foxing;
    uniform sampler2D u_washA, u_pencilA, u_washB, u_pencilB;

    // The old picture's colour soaking into the paper (u_lift 0..1): it
    // stays where it is and pales, in patches where the paper drinks first,
    // thin pigment before dense, the last of it in the tooth; while it soaks
    // it spreads a little (see main()).  (soak: how soon the paper takes it
    // here, set in main())
    float soak;
    vec4 lifted(vec2 uv) {
      vec4 c = texture2D(u_washA, uv);
      if (u_lift <= 0.) return c;
      if (u_lift >= 1.) return vec4(0.);
      float hold = .6 * soak + .4 * min(c.a * 1.6, 1.);
      float gone = u_lift * 1.4 - .3;
      return c * smoothstep(gone - .02, gone + .3, hold) * (1. - smoothstep(.45, 1., u_lift));
    }
    vec4 wash(vec2 uv, float m) {
      return mix(lifted(uv), texture2D(u_washB, uv), m);
    }

    void main() {
      vec2 frag = gl_FragCoord.xy;
      vec2 uv = frag / u_res;
      // world pixels: x from the centre, y down from the top
      vec2 wp = vec2(frag.x - .5 * u_res.x, u_res.y - frag.y) / u_scale;
      vec2 sp = wp + vec2(311., 57.);     // the same sheet for every post
      float y01 = wp.y * u_scale / u_res.y;

      float tooth = .55 * vnoise(sp * 1.9) + .45 * vnoise(sp * .71 + 31.);
      float blot = fbm(sp / 46.);
      soak = clamp((.5 * fbm(sp / 70.) + .3 * fbm(sp / 19. + 3.) + .2 * tooth - .5) * 1.8 + .5, 0., 1.);
      float soaking = u_lift > 0. && u_lift < 1. ? u_lift : 0.;

      // painting in: the pencil first, left to right, then the washes bloom
      float mp = smoothstep(0., .12, u_t * 2.5 - uv.x - .3 * vnoise(sp / 60.));
      float mw = smoothstep(0., .3, (u_t - .2) * 2.2 - .5 * uv.x - .8 * fbm(sp / 110. + 5.));

      // the paper, a little yellowed and foxed when it is old
      vec3 paper = u_paper;
      float edge = u_footer > .5 ? smoothstep(0., .5, y01) : 1. - smoothstep(.3, 1., y01);
      paper *= mix(vec3(1.), u_yellow, u_age * edge * (.55 + .6 * blot));
      // foxing: a few small brown spots
      vec2 fp = sp + vec2(u_fox, u_fox * .37);
      vec2 fc = floor(fp / 64.);
      float fh = hash(fc + 3.7);
      vec2 fo = (fc + .15 + .7 * vec2(hash(fc + 11.3), hash(fc + 27.9))) * 64.;
      float fd = length(fp - fo) / (1. + 3.2 * hash(fc + 41.1));
      float fox = (1. - smoothstep(.3, 1.4, fd + .7 * (vnoise(fp * .8) - .5))) * step(fh, .4);
      paper = mix(paper, paper * u_foxing, fox * u_age * edge * .55);
      vec3 color = paper;

      // the wash: its edge wanders, bleeds, and collects pigment at the rim
      vec2 px = u_scale / u_res;
      vec2 warp = (vec2(fbm(sp / 27.), fbm(sp / 27. + vec2(41., 17.))) - .5) * (1.5 + 4.5 * u_loose)
                + (vec2(vnoise(sp / 4.), vnoise(sp / 4. + 9.)) - .5) * (.5 + .9 * u_loose);
      vec2 wuv = uv + warp * px * vec2(1., -1.);
      vec4 c0 = wash(wuv, mw);
      vec4 near = vec4(0.), far = vec4(0.);
      float reach = 2.5 + 4.5 * u_loose + 3. * soaking;
      for (int i = 0; i < 6; i++) {
        float a = 1.0472 * float(i) + .3;
        vec2 d = vec2(cos(a), sin(a));
        near += wash(wuv + d * 1.5 * px, mw);
        far += wash(wuv + vec2(d.y, -d.x) * reach * px, mw);
      }
      near /= 6.;
      far /= 6.;
      vec4 c = mix(c0, far, .2 + .4 * u_loose + .3 * soaking);
      // (soaking in, the paint leaves no rims)
      float rim = (max(c0.a - near.a, 0.) * 1.6 + max(c0.a - far.a, 0.) * .7) * (1. - soaking);
      ${night ? `
      // light: what the layer holds is added to the navy (its rim glows, as
      // pigment would collect there); where it only covers, a silhouette
      float gain = (1. + rim / (c0.a + .1)) * (.82 + .36 * blot) * (1. + .5 * mw * (1. - mw) * 4.);
      gain *= 1. + .2 * (tooth - .5);
      color = shine(color, vec4(min(c.rgb * gain, vec3(1.)), c.a));
      ` : `
      float dens = c.a * (1. + rim / (c0.a + .1));
      dens *= .78 + .44 * blot;
      dens *= 1. + (.55 + .3 * u_loose) * (tooth - .5);
      dens *= 1. + .5 * mw * (1. - mw) * 4.;
      dens = clamp(dens, 0., 1.3);
      vec3 pig = c.rgb / max(c.a, .001);
      color *= pow(max(pig, vec3(.02)), vec3(dens));
      `}

      // the pencil: graphite on the same tooth
      vec4 p = mix(texture2D(u_pencilA, uv), texture2D(u_pencilB, uv), mp);
      float grain = vnoise(sp * 2.6 + 11.);
      float pa = clamp(p.a * (.5 + .95 * smoothstep(.22, .78, .6 * grain + .4 * tooth)), 0., 1.);
      vec3 pc = p.rgb / max(p.a, .001);
      // (u_chalk: on the navy the pencil is chalk, it covers; graphite darkens)
      if (u_chalk > .5) color = mix(color, pc, pa);
      else color *= 1. - pa * (1. - pc);

      // towards the page there is only paper
      float fade = u_footer > .5
        ? smoothstep(.0, .13, y01 + (blot - .5) * .05)
        : 1. - smoothstep(mix(.5, .76, u_edge), mix(1., .95, u_edge), y01 + (blot - .5) * mix(.3, .06, u_edge));
      ${night ? `
      // (light shows on the navy long after pigment on white has gone: at the
      // very edge nothing is left of it, whatever the ragged fade says)
      fade *= u_footer > .5 ? smoothstep(0., .025, y01) : 1. - smoothstep(.93, .995, y01);
      // (into the cache the alpha says where the picture stands; the canvas has none)
      gl_FragColor = vec4(ambient(mix(u_paper, color, fade), wp, fade), mix(1., fade, u_cached));
      ` : `
      gl_FragColor = vec4(ambient(mix(u_paper, color, fade), wp), 1.);
      `}
    }
  `; };

  const AGED = {
    day: { yellow: [1, 0.974, 0.895], foxing: [0.84, 0.72, 0.52] },
    night: { yellow: [0.94, 0.96, 0.97], foxing: [1.2, 1.16, 1.08] }
  };

  // ---- the medium without a GPU: the day's finished picture ----------------
  //
  // fragmentSource(false) for a picture that is painted in, with nothing
  // soaking in and no air (u_t = 1, u_lift = 1, u_amb.x = 0), pixel by pixel
  // on the CPU.  It is drawn for a still picture where there is no WebGL: a
  // browser without it, and the social preview cards, which are rendered
  // outside a browser (generator/social_art.js).  Keep it in step with the
  // shader.  (The night has no CPU medium: it is drawn plainly.)
  function fract(x) { return x - Math.floor(x); }
  function ghash(x, y) {
    let a = fract(x * 0.1031), b = fract(y * 0.1031), c = a;
    const d = a * (b + 33.33) + b * (c + 33.33) + c * (a + 33.33);
    a += d; b += d; c += d;
    return fract((a + b) * c);
  }
  function gnoise(x, y) {
    const ix = Math.floor(x), iy = Math.floor(y);
    let fx = x - ix, fy = y - iy;
    fx = fx * fx * (3 - 2 * fx);
    fy = fy * fy * (3 - 2 * fy);
    const a = ghash(ix, iy), b = ghash(ix + 1, iy), c = ghash(ix, iy + 1), d = ghash(ix + 1, iy + 1);
    return (a + (b - a) * fx) + ((c + (d - c) * fx) - (a + (b - a) * fx)) * fy;
  }
  function gfbm(x, y) {
    return 0.5 * gnoise(x, y) + 0.3 * gnoise(x * 2.03 + 7.1, y * 2.03 + 7.1) + 0.2 * gnoise(x * 4.1 + 3.3, y * 4.1 + 3.3);
  }
  // A layer as the shader sees it: premultiplied, filtered linearly, clamped
  // to its edge.  (u, v) are texture coordinates with v from the top.
  function sampler(canvas) {
    const w = canvas.width, h = canvas.height;
    const src = canvas.getContext('2d').getImageData(0, 0, w, h).data;
    const px = new Float32Array(w * h * 4);
    for (let i = 0; i < px.length; i += 4) {
      const a = src[i + 3] / 255;
      px[i] = src[i] / 255 * a;
      px[i + 1] = src[i + 1] / 255 * a;
      px[i + 2] = src[i + 2] / 255 * a;
      px[i + 3] = a;
    }
    return function(u, v, out) {
      const x = u * w - 0.5, y = v * h - 0.5;
      const x0 = Math.floor(x), y0 = Math.floor(y), fx = x - x0, fy = y - y0;
      const xa = clamp(x0, 0, w - 1), xb = clamp(x0 + 1, 0, w - 1);
      const ya = clamp(y0, 0, h - 1) * w, yb = clamp(y0 + 1, 0, h - 1) * w;
      const i00 = (ya + xa) * 4, i01 = (ya + xb) * 4, i10 = (yb + xa) * 4, i11 = (yb + xb) * 4;
      for (let k = 0; k < 4; k++) {
        const top = px[i00 + k] + (px[i01 + k] - px[i00 + k]) * fx;
        const bottom = px[i10 + k] + (px[i11 + k] - px[i10 + k]) * fx;
        out[k] = top + (bottom - top) * fy;
      }
    };
  }
  // Develops the two layers onto ctx (W x H device pixels) as the day's shader would.
  function develop(ctx, layers, scene, paper, footer) {
    const W = ctx.canvas.width, H = ctx.canvas.height;
    const wash = sampler(layers.wash), pencil = sampler(layers.pencil);
    const scale = H / (footer ? FOOTER_H : HEADER_H);
    const pu = scale / W, pv = scale / H;
    const loose = scene.hand.loose, age = scene.age, edgeK = scene.C.edge;
    const fox = (scene.seed >>> 0) % 977, yellow = AGED.day.yellow, foxing = AGED.day.foxing;
    const reach = 2.5 + 4.5 * loose, spread = 0.2 + 0.4 * loose;
    const warpA = 1.5 + 4.5 * loose, warpB = 0.5 + 0.9 * loose, toothK = 0.55 + 0.3 * loose;
    const fadeLo = lerp(0.5, 0.76, edgeK), fadeHi = lerp(1, 0.95, edgeK), fadeR = lerp(0.3, 0.06, edgeK);
    const dirs = [];
    for (let i = 0; i < 6; i++) {
      const a = 1.0472 * i + 0.3;
      dirs.push([Math.cos(a), Math.sin(a)]);
    }
    const out = ctx.createImageData(W, H), data = out.data;
    const c0 = [0, 0, 0, 0], s = [0, 0, 0, 0], near = [0, 0, 0, 0], far = [0, 0, 0, 0], p = [0, 0, 0, 0];
    const col = [0, 0, 0];
    for (let y = 0; y < H; y++) {
      const v = (y + 0.5) / H, spy = (y + 0.5) / scale + 57, y01 = v;
      const edge = footer ? smooth(0, 0.5, y01) : 1 - smooth(0.3, 1, y01);
      for (let x = 0; x < W; x++) {
        const u = (x + 0.5) / W, spx = (x + 0.5 - 0.5 * W) / scale + 311;
        const tooth = 0.55 * gnoise(spx * 1.9, spy * 1.9) + 0.45 * gnoise(spx * 0.71 + 31, spy * 0.71 + 31);
        const blot = gfbm(spx / 46, spy / 46);

        // the paper, a little yellowed and foxed when it is old
        const yk = age * edge * (0.55 + 0.6 * blot);
        const fpx = spx + fox, fpy = spy + fox * 0.37;
        const fcx = Math.floor(fpx / 64), fcy = Math.floor(fpy / 64);
        const fh = ghash(fcx + 3.7, fcy + 3.7);
        let fk = 0;
        if (fh <= 0.4) {
          const fox_x = (fcx + 0.15 + 0.7 * ghash(fcx + 11.3, fcy + 11.3)) * 64;
          const fox_y = (fcy + 0.15 + 0.7 * ghash(fcx + 27.9, fcy + 27.9)) * 64;
          const fd = Math.hypot(fpx - fox_x, fpy - fox_y) / (1 + 3.2 * ghash(fcx + 41.1, fcy + 41.1));
          fk = (1 - smooth(0.3, 1.4, fd + 0.7 * (gnoise(fpx * 0.8, fpy * 0.8) - 0.5))) * age * edge * 0.55;
        }
        for (let k = 0; k < 3; k++) {
          const pk = paper[k] * lerp(1, yellow[k], yk);
          col[k] = lerp(pk, pk * foxing[k], fk);
        }

        // the wash: its edge wanders, bleeds, and collects pigment at the rim
        // (texture v runs from the top: the shader's y is flipped)
        const wx = (gfbm(spx / 27, spy / 27) - 0.5) * warpA + (gnoise(spx / 4, spy / 4) - 0.5) * warpB;
        const wy = (gfbm(spx / 27 + 41, spy / 27 + 17) - 0.5) * warpA + (gnoise(spx / 4 + 9, spy / 4 + 9) - 0.5) * warpB;
        const wu = u + wx * pu, wv = v + wy * pv;
        wash(wu, wv, c0);
        near[0] = near[1] = near[2] = near[3] = far[0] = far[1] = far[2] = far[3] = 0;
        for (let i = 0; i < 6; i++) {
          const dx = dirs[i][0], dy = dirs[i][1];
          wash(wu + dx * 1.5 * pu, wv - dy * 1.5 * pv, s);
          near[3] += s[3];
          wash(wu + dy * reach * pu, wv + dx * reach * pv, s);
          for (let k = 0; k < 4; k++) far[k] += s[k];
        }
        const nearA = near[3] / 6;
        const ca = lerp(c0[3], far[3] / 6, spread);
        const rim = Math.max(c0[3] - nearA, 0) * 1.6 + Math.max(c0[3] - far[3] / 6, 0) * 0.7;
        let dens = ca * (1 + rim / (c0[3] + 0.1));
        dens *= 0.78 + 0.44 * blot;
        dens *= 1 + toothK * (tooth - 0.5);
        dens = clamp(dens, 0, 1.3);
        const inv = 1 / Math.max(ca, 0.001);
        for (let k = 0; k < 3; k++) {
          const pig = lerp(c0[k], far[k] / 6, spread) * inv;
          col[k] *= Math.pow(Math.max(pig, 0.02), dens);
        }

        // the pencil: graphite on the same tooth
        pencil(u, v, p);
        const grain = gnoise(spx * 2.6 + 11, spy * 2.6 + 11);
        const pa = clamp(p[3] * (0.5 + 0.95 * smooth(0.22, 0.78, 0.6 * grain + 0.4 * tooth)), 0, 1);
        const pinv = 1 / Math.max(p[3], 0.001);
        for (let k = 0; k < 3; k++) col[k] *= 1 - pa * (1 - p[k] * pinv);

        // towards the page there is only paper
        const fade = footer
          ? smooth(0, 0.13, y01 + (blot - 0.5) * 0.05)
          : 1 - smooth(fadeLo, fadeHi, y01 + (blot - 0.5) * fadeR);
        const o = (y * W + x) * 4;
        for (let k = 0; k < 3; k++) data[o + k] = Math.round(clamp(lerp(paper[k], col[k], fade), 0, 1) * 255);
        data[o + 3] = 255;
      }
    }
    ctx.putImageData(out, 0, 0);
  }

  function Stage(surface, env) {
    const stage = {
      surface: surface, t: 1, start: null, dirty: true, seen: false, painted: false, gl: null, ctx: null, layers: null,
      lead: false,        // a new post: the old colour soaks in first
      lift: 1,            // how far it has (1: gone, or there was none)
      fresh: false,       // what is on the canvas is up to date (when nothing moves)
      airSince: null,     // when the air began to move (it fades in once)
      due: 0              // when the air wants its next frame
    };
    const canvas = surface.canvas;
    let gl = null, textures = null, cache = null;
    let sets = {};      // the programs of each theme, once it has been drawn

    function blank() {
      const t = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, t);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(4));
      return t;
    }
    function upload(texture, source) {
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    }
    const AIR = ['res', 'scale', 'paper', 'mist', 'amb', 'off', 'mix', 'mistY'];
    function locations(program, names) {
      const out = {};
      names.forEach(function(name) { out[name] = gl.getUniformLocation(program, 'u_' + name); });
      return out;
    }
    // The programs of the theme being drawn: { main, uniforms } and, once
    // the air moves, { air, airUniforms }.  (Should a theme's not compile,
    // the other theme's are used: the wrong medium, but a picture.)
    function programs() {
      const night = !!env.dark, key = night ? 'night' : 'day';
      if (sets[key]) return sets[key];
      try {
        const set = { main: U.gl.program(gl, VERTEX, fragmentSource(night)), night: night };
        U.gl.quad(gl, set.main, 'a_position');
        set.uniforms = locations(set.main, AIR.concat(['footer', 't', 'lift', 'loose', 'age', 'fox', 'edge', 'yellow', 'foxing', 'chalk', 'cached', 'washA', 'pencilA', 'washB', 'pencilB']));
        sets[key] = set;
      } catch (error) {
        const other = sets[night ? 'day' : 'night'];
        if (!other) throw error;
        console.warn('strata: no shader for this theme', error);
        sets[key] = other;
      }
      return sets[key];
    }
    // only the landscape has air; without the second program it stands still
    function airOf(set) {
      if (set.air === undefined) {
        set.air = null;
        try {
          set.air = U.gl.program(gl, VERTEX, ambientSource(set.night));
          U.gl.quad(gl, set.air, 'a_position');
          set.airUniforms = locations(set.air, AIR.concat(['cache']));
        } catch (error) {
          console.warn('strata: no air', error);
          set.air = null;
        }
      }
      return set.air;
    }
    function init() {
      sets = {};
      programs();
      textures = { washA: blank(), pencilA: blank(), washB: blank(), pencilB: blank() };
      stage.maxSize = Math.min(gl.getParameter(gl.MAX_TEXTURE_SIZE) || 2048, 6144);
      cache = null;
    }
    // The finished picture in a texture of the canvas's size (false if there
    // cannot be one: then nothing moves).
    function ensureCache() {
      const w = canvas.width, h = canvas.height;
      if (cache && cache.w === w && cache.h === h) return true;
      if (!cache) cache = { tex: gl.createTexture(), fbo: gl.createFramebuffer(), w: 0, h: 0, valid: false };
      gl.bindTexture(gl.TEXTURE_2D, cache.tex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.bindFramebuffer(gl.FRAMEBUFFER, cache.fbo);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, cache.tex, 0);
      const ok = gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE;
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      cache.w = w;
      cache.h = h;
      cache.valid = false;
      if (!ok) stage.noCache = true;
      return ok;
    }
    // Whether this band moves once it is painted.
    stage.airy = function() {
      return !!(gl && surface.kind === 'header' && !env.still && !stage.lost && !stage.noCache && airOf(programs()));
    };
    // The drift: two layers each of cloud and mist, each starting over once
    // a period, half a period apart; a layer is not shown when it starts
    // over.  The layers move by the wind of the moment, so a new post (with
    // other weather) changes the wind and does not make the clouds jump.
    const PERIODS = [90, 90, 140, 140], SHIFTS = [0, 0.5, 0, 0.5];
    const drift = { at: null, phase: [0, 0, 0, 0], off: [0, 0, 0, 0] };
    //
    // On a new post the weather fades out with the old colour and in again
    // with the new (weather()): what it is like (clouds, sun, the valleys the
    // mist lies in) changes while none is shown, so nothing slides up or
    // down; only the wind turns gradually, so the clouds keep moving.
    function weather() {
      if (!stage.lead || stage.t >= 1) return 1;
      return Math.max(1 - smooth(0, 0.7, stage.lift), smooth(0.45, 1, stage.t));
    }
    function airNow(now) {
      const a = stage.scene.air, b = (stage.before || stage.scene).air, e = smooth(0, 1, stage.t);
      const shown = stage.lead && stage.lift < 1 ? b : a;
      const k = function(key) { return lerp(b[key], a[key], e); };
      const dt = drift.at === null ? 0 : clamp(now - drift.at, 0, 1);
      drift.at = now;
      const wind = [k('wind'), k('wind'), k('drift'), k('drift')];
      for (let i = 0; i < 4; i++) {
        const phase = (now / PERIODS[i] + SHIFTS[i]) % 1;
        drift.off[i] = phase < drift.phase[i] ? wind[i] * phase * PERIODS[i] : drift.off[i] + wind[i] * dt;
        drift.phase[i] = phase;
      }
      return {
        shadow: shown.shadow, sun: shown.sun, mist: shown.mist, heights: shown.heights,
        mix: [Math.abs(2 * drift.phase[0] - 1), Math.abs(2 * drift.phase[2] - 1)]
      };
    }
    function setAir(u, strength, air) {
      const sign = env.dark ? -0.8 : 1;
      const pal = env.palette();
      const mist = env.dark ? U.shine(pal.paper, U.glow(pal.sky, pal.paper), 0.36) : pal.mist;
      gl.uniform3f(u.mist, mist[0], mist[1], mist[2]);
      gl.uniform4f(u.amb, strength, air.shadow * sign, air.mist, air.sun * sign);
      gl.uniform4f(u.off, drift.off[0], drift.off[1], drift.off[2], drift.off[3]);
      gl.uniform2f(u.mix, air.mix[0], air.mix[1]);
      gl.uniform4f(u.mistY, air.heights[0], air.heights[1], air.heights[2], air.heights[3]);
    }
    try {
      gl = canvas.getContext('webgl', { alpha: false, antialias: false, depth: false, stencil: false });
      if (gl) init();
    } catch (error) {
      console.warn('strata: no shader, drawing plainly', error);
      gl = null;
    }
    if (!gl) {
      stage.ctx = canvas.getContext('2d');
      stage.maxSize = 4096;
    } else {
      canvas.addEventListener('webglcontextlost', function(event) { event.preventDefault(); stage.lost = true; });
      canvas.addEventListener('webglcontextrestored', function() {
        try { init(); } catch (e) { return; }
        stage.lost = false;
        stage.dirty = true;
        stage.t = 1;
        env.invalidate();
      });
    }
    stage.gl = gl;

    // The picture that is up becomes the one painted over.
    stage.turn = function() {
      if (!gl || !stage.painted) return;
      let x = textures.washA; textures.washA = textures.washB; textures.washB = x;
      x = textures.pencilA; textures.pencilA = textures.pencilB; textures.pencilB = x;
      stage.held = true;
    };
    // Once it is painted over, the old picture is let go.
    stage.release = function() {
      stage.held = false;
      if (!gl || stage.lost) return;
      [textures.washA, textures.pencilA].forEach(function(texture) {
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
        gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(4));
      });
    };
    stage.repaint = function(scene) {
      if (surface.width < 2 || surface.height < 2) return;
      const layers = paint(scene, surface, env, stage.maxSize);
      if (gl) {
        upload(textures.washB, layers.wash);
        upload(textures.pencilB, layers.pencil);
        layers.wash.width = 0;
        layers.pencil.width = 0;
      } else {
        stage.layers = layers;
      }
      // the hand and the paper of the picture before, to move on from
      // (unless the picture before was never shown: then the one before it stays)
      if (stage.scene !== scene && !stage.keep) stage.before = stage.scene ? stage.scene : scene;
      stage.keep = false;
      stage.scene = scene;
      stage.painted = true;
      stage.dirty = false;
      stage.fresh = false;
      if (cache) cache.valid = false;
    };
    stage.draw = function(now) {
      const scene = stage.scene;
      if (!scene || stage.lost) return;
      stage.fresh = true;
      const worldH = surface.kind === 'footer' ? FOOTER_H : HEADER_H;
      const paper = env.palette().paper;
      if (!gl) {
        const ctx = stage.ctx, W = canvas.width, H = canvas.height;
        if (!ctx || !stage.layers) return;
        // a still picture by day: the medium, on the CPU
        if (env.still && !env.dark && stage.t >= 1) {
          develop(ctx, stage.layers, scene, paper, surface.kind === 'footer');
          return;
        }
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.globalAlpha = 1;
        ctx.fillStyle = css(paper);
        ctx.fillRect(0, 0, W, H);
        ctx.globalAlpha = stage.t;
        // (the night's layer is light: added, not laid over)
        if (env.dark) ctx.globalCompositeOperation = 'screen';
        ctx.drawImage(stage.layers.wash, 0, 0, W, H);
        ctx.globalCompositeOperation = 'source-over';
        ctx.drawImage(stage.layers.pencil, 0, 0, W, H);
        ctx.globalAlpha = 1;
        const footer = surface.kind === 'footer';
        const g = ctx.createLinearGradient(0, footer ? 0 : H * 0.66, 0, footer ? H * 0.13 : H);
        g.addColorStop(footer ? 0 : 1, css(paper, 1));
        g.addColorStop(footer ? 1 : 0, css(paper, 0));
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, W, H);
        return;
      }
      const strength = stage.airy() && stage.airSince !== null ? smooth(0, 3, now - stage.airSince) * weather() : 0;
      const air = airNow(now);
      if (strength > 0 && stage.t >= 1 && ensureCache()) {
        // settled: the picture once into the cache, then only the air over it
        if (!cache.valid) {
          gl.bindFramebuffer(gl.FRAMEBUFFER, cache.fbo);
          drawPicture(0, air, true);
          gl.bindFramebuffer(gl.FRAMEBUFFER, null);
          cache.valid = true;
        }
        const set = programs(), airUniforms = set.airUniforms;
        gl.useProgram(airOf(set));
        gl.viewport(0, 0, canvas.width, canvas.height);
        gl.uniform2f(airUniforms.res, canvas.width, canvas.height);
        gl.uniform1f(airUniforms.scale, canvas.height / worldH);
        gl.uniform3f(airUniforms.paper, paper[0], paper[1], paper[2]);
        setAir(airUniforms, strength, air);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, cache.tex);
        gl.uniform1i(airUniforms.cache, 0);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        return;
      }
      if (cache) cache.valid = false;
      drawPicture(strength, air);
    };
    // The whole picture, painting in or not, with the air at `strength`.
    function drawPicture(strength, air, cached) {
      const scene = stage.scene;
      const worldH = surface.kind === 'footer' ? FOOTER_H : HEADER_H;
      const paper = env.palette().paper;
      const uniforms = programs().uniforms;
      gl.useProgram(programs().main);
      setAir(uniforms, strength, air);
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform2f(uniforms.res, canvas.width, canvas.height);
      gl.uniform1f(uniforms.scale, canvas.height / worldH);
      gl.uniform1f(uniforms.footer, surface.kind === 'footer' ? 1 : 0);
      gl.uniform1f(uniforms.cached, cached ? 1 : 0);
      gl.uniform1f(uniforms.chalk, programs().night ? 1 : 0);
      gl.uniform1f(uniforms.t, stage.t);
      gl.uniform1f(uniforms.lift, stage.lift);
      const before = stage.before || scene, ease = smooth(0, 1, stage.t);
      gl.uniform1f(uniforms.loose, lerp(before.hand.loose, scene.hand.loose, ease));
      gl.uniform1f(uniforms.age, lerp(before.age, scene.age, ease));
      gl.uniform1f(uniforms.edge, lerp(before.C.edge, scene.C.edge, ease));
      gl.uniform1f(uniforms.fox, (scene.seed >>> 0) % 977);
      // what age does to the paper: it yellows and gets brown spots; the navy dims, its spots are pale
      const old = programs().night ? AGED.night : AGED.day;
      gl.uniform3f(uniforms.yellow, old.yellow[0], old.yellow[1], old.yellow[2]);
      gl.uniform3f(uniforms.foxing, old.foxing[0], old.foxing[1], old.foxing[2]);
      gl.uniform3f(uniforms.paper, paper[0], paper[1], paper[2]);
      ['washA', 'pencilA', 'washB', 'pencilB'].forEach(function(name, i) {
        gl.activeTexture(gl.TEXTURE0 + i);
        gl.bindTexture(gl.TEXTURE_2D, textures[name]);
        gl.uniform1i(uniforms[name], i);
      });
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }
    return stage;
  }

  // ---- the variant ---------------------------------------------------------

  LucumrArt.register('strata', {
    title: 'Ridgeline and strata',
    create: function(env) {
      const stages = env.surfaces.map(function(surface) { return Stage(surface, env); });
      let scene = null;

      // Each band is painted in when it comes into view.  The stages keep their
      // own watch: the core only wakes a mount that was parked with nothing on
      // screen, so a footer scrolled to after the header has finished would
      // never be asked to draw, and surface.visible starts out true.
      const watcher = new IntersectionObserver(function(entries) {
        entries.forEach(function(entry) {
          const stage = stages.find(function(s) { return s.surface.el === entry.target; });
          if (!stage) return;
          stage.seen = entry.isIntersecting;
          if (stage.seen && (stage.dirty || stage.t < 1 || stage.airy())) env.invalidate();
        });
      }, { threshold: 0 });
      stages.forEach(function(stage) { watcher.observe(stage.surface.el); });

      // the air's frame rate for a band: the faster the wind, the more frames
      function airRate(stage) {
        const air = stage.scene.air;
        const speed = Math.max(Math.abs(air.wind), Math.abs(air.drift)) * stage.surface.height / HEADER_H;
        for (let i = 0; i < AIR_RATES.length; i++) if (speed / AIR_RATES[i] <= AIR_STEP) return AIR_RATES[i];
        return AIR_RATES[AIR_RATES.length - 1];
      }

      return {
        setPost: function(post, info) {
          scene = buildScene(post);
          stages.forEach(function(stage) {
            stage.dirty = true;
            // (another post while the old colour is still soaking in: it goes on
            // soaking in, and this one is painted in after it instead)
            if (stage.lead && stage.lift < 1 && !env.still) {
              stage.painted = false;
              stage.keep = true;
              return;
            }
            if (!info.initial) stage.turn();
            // only the header soaks in (the footers still paint over)
            stage.lead = !!stage.held && stage.surface.kind === 'header' && !env.still;
            stage.lift = stage.lead ? 0 : 1;
            stage.painted = false;
            stage.t = env.still ? 1 : 0;
            stage.start = null;
          });
        },
        resize: function() { stages.forEach(function(stage) { stage.dirty = true; }); },
        setTheme: function() { stages.forEach(function(stage) { stage.dirty = true; }); },
        // While a band paints in: every frame.  Then, where there is air, a
        // frame at airRate(); elsewhere none.
        frame: function(now) {
          if (!scene) return false;
          let more = false;
          stages.forEach(function(stage) {
            if (!env.still && !stage.seen) return;
            if (stage.dirty) stage.repaint(scene);
            if (stage.dirty) return;
            // by the clock, so a slow first frame does not stretch the painting-in
            if (stage.t < 1 && stage.start === null) stage.start = now;
            if (stage.t < 1) {
              const since = now - stage.start;
              stage.lift = stage.lead ? clamp(since / LIFT, 0, 1) : 1;
              stage.t = env.still ? 1 : clamp((since - (stage.lead ? LIFT : 0)) / DURATION, 0.001, 1);
            }
            if (stage.t < 1) {
              stage.draw(now);
              more = true;
              return;
            }
            if (!stage.airy()) {
              if (!stage.fresh) stage.draw(now);
              if (stage.held) stage.release();
              return;
            }
            if (stage.airSince === null) stage.airSince = now;
            if (!stage.fresh || now >= stage.due - 0.005) {
              stage.draw(now);
              stage.due = now + 1 / airRate(stage);
            }
            if (stage.held) stage.release();
            const wait = Math.max(0, stage.due - now);
            if (more !== true) more = typeof more === 'number' ? Math.min(more, wait) : wait;
          });
          return more;
        },
        destroy: function() { watcher.disconnect(); }
      };
    }
  });
})();
