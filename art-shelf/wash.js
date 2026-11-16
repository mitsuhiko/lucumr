// Proposal 1: Wet wash.  Abstract watercolour; see ART.md for the contract.
//
// The header is the top edge of a sheet, where the washes hang down from the
// edge; the footer is the bottom of the same sheet, where the paint ran down
// and pooled.  Every lead tag is one pigment:
//
// - subject tags are charges of paint with a habit of their own (TABLE): rust
//   granulates in angular strokes, security dries with hard edges, python
//   bleeds into yellow, ai blooms like a cloud, unicode is ink in water;
// - register tags lay the ground and pick the technique for the whole sheet:
//   wet-on-wet veils, masked panels over ruled pencil lines, a burst, scrubbing;
// - project tags are one deliberate mark: a seal, a dab, an open ring.
//
// The facets (what a classifier read in the text) make posts with the same tags
// different sheets; see readFacets().  ai: what the violet is charged with and
// how it is laid; mood: an underglaze, and how wet the sheet is; scale: one
// large wash close up or many small ones; valence: the load of pigment;
// certainty: firm or bleeding edges, one pencil line or a searched one;
// tension: washes that keep apart, backruns where they meet, breaks in the
// sheet; time: which way the board was tilted, fading; ending: drips that
// trail off, a held edge, one long run, a squared-off end; actor and stance:
// the gesture (a regular beat, many small marks, one charge; scratched out,
// dragged on, built up in layers, ruled); technical: level and measured;
// humor, personal: spatter and a flourish, a note in pencil; imagery, when the
// classifier is sure: the motif of the edge (waves, tongues, blocks ...).
//
// How it is drawn.  The brushwork (where each pigment was put down, where water
// was dropped, where tape masks the paper) is drawn with seeded strokes on a
// small 2D canvas in sheet units, one blurred field per pigment.  A fragment
// shader turns the fields into paint: it warps and frays the edges, lets the
// pigment pool at dried edges, granulate in the paper's tooth, bloom where
// water ran back, and mixes the pigments subtractively on white paper (as
// gouache and chalk on the navy paper of the dark theme).  The dried picture
// is a function of post and position only; time just wets it and dries it.
(function() {
  'use strict';
  const U = LucumrArt.util;
  const clamp = U.clamp, lerp = U.lerp;

  const MT = 1.5;        // sheet units per mask texel
  const MARGIN = 48;     // sheet units of mask around the band
  const CHUNK = 384;     // the mask is built this much wider at a time
  const DUR = 2.6;       // seconds until the sheet is dry
  const TINT = 5, RESIST = 6, WATER = 7;   // mask channels after the five pigments

  // What the paint of a tag does.  f: the form it is laid in, g: granulation,
  // e: hard dried edges, b: backruns/blooms, d: dry brush, s: softness (default:
  // the tag's `loose`), B/sp: a second colour it separates into and how much,
  // fe: feathering (sheet units), tide: drying rings, m: a project's mark.
  const TABLE = {
    // register: how the ground is laid
    thoughts:     { f: 'veil', g: 0.4, e: 0.08, b: 0.6 },
    life:         { f: 'veil', g: 0.25, e: 0.04, b: 1, B: '#e2a25a', sp: 0.5, s: 1 },
    culture:      { f: 'veil', g: 0.1, e: 0.06, b: 1 },
    history:      { f: 'stain', g: 0.7, e: 0.6, b: 0.3, tide: 1 },
    politics:     { f: 'scrub', g: 0.15, e: 0.75, b: 0.1, d: 0.75 },
    business:     { f: 'ledger', g: 0.25, e: 0.6, b: 0 },
    tutorial:     { f: 'flatwash', g: 0.4, e: 0.75, b: 0.15, s: 0.3 },
    announcement: { f: 'burst', g: 0.05, e: 0.55, b: 0.2 },
    community:    { f: 'dabs', g: 0.2, e: 0.5, b: 0.2, size: 4.5 },
    conferences:  { f: 'dabs', g: 0.1, e: 0.55, b: 0.2, size: 7.5 },
    covid19:      { f: 'islands', g: 0.8, e: 0.5, b: 0.3, s: 0.3 },
    // subject: the habit of the pigment
    python:       { f: 'wash', g: 0.4, e: 0.12, b: 0.5, B: '#ecc530', sp: 0.85, scallop: 1 },
    rust:         { f: 'flat', g: 1, e: 0.75, b: 0.05, d: 0.3, lean: 0.24 },
    ai:           { f: 'cloud', g: 0.35, e: 0.06, b: 1 },
    engineering:  { f: 'flat', g: 0.1, e: 0.85, b: 0, lean: 0, grid: 1 },
    opensource:   { f: 'branch', g: 0.15, e: 0.3, b: 0.6, mode: 'grow' },
    web:          { f: 'flat', g: 0.9, e: 0.3, b: 0.4, boxes: 1, s: 0.45 },
    tooling:      { f: 'flat', g: 0.7, e: 0.5, b: 0.1, d: 0.85, horizontal: 1 },
    security:     { f: 'flat', g: 0.25, e: 1, b: 0, lean: 0, tide: 1, hatch: 1 },
    packaging:    { f: 'flat', g: 0.6, e: 0.6, b: 0.1, boxes: 1 },
    unicode:      { f: 'ink', g: 0, e: 0.25, b: 0.4, fe: 1.5, thin: 0.1, s: 0.75 },
    javascript:   { f: 'curl', g: 0, e: 0.35, b: 0.5 },
    api:          { f: 'lanes', g: 0.6, e: 0.7, b: 0.1, n: 2, join: 1 },
    vcs:          { f: 'branch', g: 0.05, e: 0.5, b: 0.2, mode: 'merge' },
    types:        { f: 'flat', g: 1, e: 0.7, b: 0, lattice: 1 },
    networking:   { f: 'branch', g: 0, e: 0.4, b: 0.4, mode: 'net' },
    databases:    { f: 'lanes', g: 0.3, e: 0.7, b: 0.1, strata: 1, tide: 0.8 },
    os:           { f: 'lanes', g: 0.25, e: 0.6, b: 0.1, strata: 1, n: 3 },
    hardware:     { f: 'trace', g: 0, e: 0.7, b: 0 },
    c:            { f: 'flat', g: 0.5, e: 0.85, b: 0, horizontal: 1, single: 1 },
    go:           { f: 'lanes', g: 0.6, e: 0.5, b: 0.2 },
    async:        { f: 'lanes', g: 0.2, e: 0.3, b: 0.3, weave: 1 },
    games:        { f: 'curl', g: 0, e: 0.3, b: 0.6, dots: 1 },
    design:       { f: 'wash', g: 0.6, e: 0.4, b: 0.2, round: 1 },
    wsgi:         { f: 'lanes', g: 0.3, e: 0.5, b: 0.2, pipes: 1, n: 3, B: '#b9a23a', sp: 0.6 },
    // project: the mark
    flask:        { m: 'flask', g: 0, e: 0.6, b: 0 },
    jinja:        { m: 'seal', g: 0.2, e: 0.5, b: 0, d: 0.35 },
    django:       { m: 'dab', g: 0.1, e: 0.6, b: 0 },
    sentry:       { m: 'eye', g: 0, e: 0.6, b: 0 },
    pi:           { m: 'enso', g: 0.3, e: 0.5, b: 0, d: 0.3 },
    earendil:     { m: 'star', g: 0.2, e: 0.5, b: 0 },
    // no tags: the house blues
    'house:blue': { f: 'wash', g: 0.35, e: 0.3, b: 0.7 },
    'house:navy': { f: 'wash', g: 0.25, e: 0.4, b: 0.3, s: 0.5 },
    'house:sky':  { f: 'cloud', g: 0.7, e: 0.08, b: 0.9 }
  };
  const HOUSE = [
    { name: 'house:blue', role: 'subject', rgb: U.hex('#115ca1'), loose: 0.65, energy: 0.3, weight: 0.5 },
    { name: 'house:sky', role: 'subject', rgb: U.hex('#4f97cf'), loose: 0.8, energy: 0.3, weight: 0.3 },
    { name: 'house:navy', role: 'subject', rgb: U.hex('#1b3156'), loose: 0.5, energy: 0.3, weight: 0.2 }
  ];

  // The facets (what a classifier read in the text) as paint.
  // ai: what the violet is charged with.
  const AI_CHARGE = {
    agents: '#2b78c2',      // cerulean: the working blue
    models: '#c2408f',      // quinacridone magenta
    local: '#b0562a',       // burnt sienna: iron, at home
    society: '#b02a3a',     // alizarin crimson
    community: '#5d8a2f',   // sap green
    writing: '#5a4636',     // sepia: ink
    risk: '#26262b',        // lamp black
    business: '#c8901e'     // quinacridone gold
  };
  // ... and how it is laid: worked in strokes, left to bloom, pooled, grown, written
  const AI_FORM = {
    agents: ['flat', { lean: 0.14 }], models: ['cloud', {}], local: ['wash', { round: 1 }], society: ['wash', {}],
    community: ['branch', { mode: 'grow' }], writing: ['ink', {}], risk: ['cloud', {}], business: ['lanes', { strata: 1, n: 3 }]
  };
  // mood: the weather of the sheet, an underglaze [colour, how much of it]
  const MOOD_GLAZE = {
    hopeful: ['#f2c230', 1],          // aureolin: warm light
    worried: ['#4a6078', 1],          // a cold blue-grey
    angry: ['#c5382b', 1],            // cadmium red
    reflective: ['#8f93ad', 0.3],     // hardly a tint
    playful: ['#f28a4a', 1],          // orange
    matter_of_fact: ['#9a9a9a', 0],   // plain paper
    conflicted: ['#7c7a40', 0.85]     // warm and cold at once: olive
  };
  const SCALE_ZOOM = { self: 1.9, craft: 1.25, community: 0.95, industry: 0.75, society: 0.5 };

  // Pigments mixed on the palette: weighted in absorbance, as on the paper.
  function blend(list) {      // [[rgb, weight], ...]
    const k = [0, 0, 0];
    let total = 0;
    list.forEach(function(e) { total += e[1]; });
    if (total <= 0) return null;
    list.forEach(function(e) {
      const a = absorbance(e[0]);
      for (let i = 0; i < 3; i++) k[i] += a[i] * e[1] / total;
    });
    return k.map(function(v) { return Math.exp(-v); });
  }

  // What the facets ask of the paint.  Without facets (tag pages, the index,
  // posts not classified) everything is neutral.
  function readFacets(post) {
    const known = !!(post.facets && post.facets.known);
    const score = function(name, fallback) { return known ? post.score(name, fallback) : fallback; };
    const share = function(name, label) { return known ? post.share(name, label) : 0; };
    const fx = {
      known: known, share: share,
      valence: score('valence', 0.5), certainty: score('certainty', 0.5), tension: score('tension', 0),
      humor: score('humor', 0), technical: score('technical', 0.3), personal: score('personal', 0.4),
      zoom: 1, charge: null, chargeAmount: 0, glaze: null, glazeAmount: 0,
      lean: (share('time', 'future') - share('time', 'past')) * 0.34,
      past: share('time', 'past'),
      open: share('ending', 'open'), resolved: share('ending', 'resolved'),
      call: share('ending', 'call'), practical: share('ending', 'practical'),
      // the gesture: who acts, and how the author stands to it
      regular: share('actor', 'machine') + 0.7 * share('actor', 'company') + 0.4 * share('actor', 'state'),
      many: share('actor', 'group'), one: share('actor', 'individual'),
      layered: share('stance', 'builder'), ruled: share('stance', 'teacher'), cut: share('stance', 'critic'),
      pushed: share('stance', 'advocate'), blotted: share('stance', 'witness'),
      mood: function(label) { return share('mood', label); },
      motif: known ? post.top('imagery', 0.6) : null
    };
    if (fx.motif === 'none') fx.motif = null;
    if (!known) return fx;
    let zoom = 0, total = 0;
    Object.keys(SCALE_ZOOM).forEach(function(label) {
      zoom += Math.log(SCALE_ZOOM[label]) * share('scale', label);
      total += share('scale', label);
    });
    if (total > 0) fx.zoom = Math.exp(zoom / total);
    fx.charge = blend(Object.keys(AI_CHARGE).map(function(label) { return [U.hex(AI_CHARGE[label]), share('ai', label)]; }));
    fx.chargeAmount = fx.charge ? clamp(1 - share('ai', 'not_ai'), 0, 1) : 0;
    const moods = Object.keys(MOOD_GLAZE).map(function(label) {
      const w = share('mood', label) * MOOD_GLAZE[label][1];
      fx.glazeAmount += w;
      return [U.hex(MOOD_GLAZE[label][0]), w];
    });
    fx.glaze = blend(moods);
    return fx;
  }

  // A tag the table does not know: a habit from its name and values.
  function guess(tag) {
    const r = U.rng('wash-habit:' + tag.name);
    const forms = tag.loose > 0.55 ? ['wash', 'cloud', 'wash'] :
      tag.loose < 0.42 ? ['flat', 'lanes', 'flat'] : ['wash', 'curl', 'lanes', 'flat'];
    return {
      f: tag.role === 'register' ? 'veil' : r.pick(forms), m: 'stroke',
      g: r() * 0.8, e: clamp(1.05 - tag.loose * 1.3, 0.05, 0.9), b: tag.loose, lean: r.range(-0.25, 0.25)
    };
  }

  // ---- colour ------------------------------------------------------------

  function toHsl(c) {
    const max = Math.max(c[0], c[1], c[2]), min = Math.min(c[0], c[1], c[2]);
    const l = (max + min) / 2, d = max - min;
    if (d < 1e-5) return [0, 0, l];
    const s = d / (1 - Math.abs(2 * l - 1));
    let h = max === c[0] ? ((c[1] - c[2]) / d + 6) % 6 : max === c[1] ? (c[2] - c[0]) / d + 2 : (c[0] - c[1]) / d + 4;
    return [h / 6, clamp(s, 0, 1), l];
  }
  // The undertone a pigment shows where it runs thin.
  function undertone(rgb) {
    const c = toHsl(rgb);
    return U.hsl((c[0] + 0.045) % 1, c[1] * 0.9, clamp(c[2] + 0.1, 0, 0.8));
  }
  // The same pigment as gouache: body colour that shows on navy paper.
  function gouache(rgb) {
    const c = toHsl(rgb);
    return U.hsl(c[0], Math.min(1, c[1] * 1.05 + 0.04), clamp(0.47 + 0.3 * c[2], 0.5, 0.74));
  }
  function absorbance(rgb) {
    return rgb.map(function(v) { return -Math.log(clamp(v, 0.03, 0.995)); });
  }

  // ---- the plan: what a post is, as paint --------------------------------

  function makePlan(post) {
    const house = !post.tags.length;
    const wet = house ? 0.62 : post.loose, en = house ? 0.3 : post.energy;
    const has = {};
    post.tags.forEach(function(t) { has[t.name] = true; });
    const fx = readFacets(post);
    // mood is also how wet the sheet is; certainty whether an edge is firm or searched
    const damp = (0.5 - fx.certainty) * 0.5 + 0.14 * fx.mood('reflective') + 0.1 * fx.mood('worried') -
      0.22 * fx.mood('matter_of_fact') - 0.12 * fx.mood('angry');
    const pigs = (house ? HOUSE : post.lead).map(function(tag, i) {
      const t = Object.assign({ g: 0.3, b: tag.loose, d: 0, sp: 0.22, sb: 0, fe: 0, tide: 0 }, TABLE[tag.name] || guess(tag));
      if (t.e === undefined) t.e = clamp(1.05 - tag.loose * 1.3, 0.05, 0.9);
      const own = t.s !== undefined ? t.s : tag.loose;
      const pig = {
        name: tag.name, ch: i, role: tag.role, t: t, rgb: tag.rgb,
        rgbB: t.B ? U.hex(t.B) : undertone(tag.rgb),
        softness: clamp(0.6 * own + 0.4 * wet + damp, 0, 1), weight: tag.weight
      };
      // the ai facet: what the violet is charged with, wet in wet
      if (tag.name === 'ai' && fx.chargeAmount > 0.05) {
        pig.rgbB = fx.charge;
        t.sp = fx.chargeAmount;
        t.sb = 0.42;
        pig.forms = Object.keys(AI_FORM).map(function(label) { return [label, fx.share('ai', label)]; });
        // risk and society sit heavier and dry harder, models and writing stay diffuse
        t.e = clamp(t.e + 0.5 * (fx.share('ai', 'risk') + fx.share('ai', 'business') + 0.6 * fx.share('ai', 'society')), 0, 1);
        t.g = clamp(t.g + 0.5 * fx.share('ai', 'local') + 0.3 * fx.share('ai', 'writing'), 0, 1);
      }
      t.d = clamp(t.d + 0.5 * fx.mood('angry') + 0.45 * fx.pushed, 0, 1);
      t.tide = clamp(t.tide + 0.7 * fx.layered, 0, 1);
      if (fx.motif === 'stone') t.g = clamp(t.g + 0.5, 0, 1);
      if (fx.motif === 'stone' || fx.motif === 'building') pig.softness = clamp(pig.softness - 0.35, 0, 1);
      if (fx.motif === 'air' || fx.motif === 'body') t.b = clamp(t.b + 0.5, 0, 1);
      return pig;
    });
    const role = function(name) { return pigs.filter(function(p) { return p.role === name; }); };
    const reg = role('register'), sub = role('subject'), proj = role('project');
    // a project on its own (its tag page) also gets a wash to sit on
    const lone = !sub.length && !reg.length && proj.length;
    if (lone) { proj[0].t.f = 'wash'; sub.push(proj[0]); }
    pigs.forEach(function(p) {
      let k = p.role === 'project' ? (lone ? 0.9 : 1.25) : p.role === 'register' ? (sub.length ? 0.48 : 0.78) : 0.82;
      // valence: bleak is a heavy load of pigment, joyful mostly water and paper
      p.strength = k * lerp(0.86, 1.1, en) * (has.politics ? 1.12 : 1);
    });
    // the underglaze: the tags beyond the fifth, and the mood of the text
    let tint = null;
    const under = [];
    if (post.rest) post.rest.forEach(function(t) { under.push([t.rgb, 0.5 / post.rest.length]); });
    if (fx.glaze && fx.glazeAmount > 0.12) under.push([fx.glaze, fx.glazeAmount]);
    if (under.length) {
      const c = blend(under);
      tint = { name: 'tint', ch: TINT, role: 'tint', rgb: c, rgbB: undertone(c), softness: 0.9,
        strength: clamp(0.2 + 0.3 * fx.glazeAmount, 0.2, 0.44),
        mood: fx.glazeAmount > 0.12,
        t: { f: 'veil', g: 0.3, e: 0.05, b: 0.6, d: 0, sp: 0.2, sb: 0, fe: 0, tide: 0 } };
    }
    const maxw = Math.max.apply(null, sub.map(function(p) { return p.weight; }).concat([1e-6]));
    sub.forEach(function(p) { p.share = p.weight / maxw; });
    reg.forEach(function(p) { p.share = 1; });

    const seedR = post.rng('wash:paper');
    const plan = {
      post: post, wet: wet, en: en, has: has, lone: lone, fx: fx, pigs: pigs, reg: reg, sub: sub, proj: proj, tint: tint,
      all: tint ? pigs.concat([tint]) : pigs,
      aged: clamp((has.history ? 0.55 : clamp((post.age - 10) / 30, 0, 0.25)) + 0.26 * fx.past + 0.2 * (1 - Math.min(1, fx.valence * 2.5)), 0, 0.8),
      seed: [seedR(), seedR()],
      prof: profile(post),
      horizon: post.rng('wash:horizon').range(0.44, 0.6)
    };
    const n = sub.length;
    // scale: one large pool seen close up ... many small washes seen from afar;
    // tension: washes that keep apart instead of running into each other
    const z = fx.zoom, far = clamp((1 - z) * 1.6, 0, 1), deep = lerp(0.82, 1.14, clamp((z - 0.5) / 1.4, 0, 1)) * lerp(1.1, 0.92, fx.valence);
    const apart = clamp(fx.tension * 1.2 - 0.25, 0, 1);
    plan.subSeq = sequence(post, 'sub', sub, (n <= 1 ? 300 : n === 2 ? 250 : n === 3 ? 215 : 185) * z,
      has.covid19 ? 0.9 : clamp(lerp(0.36, 0.14, en) + 0.45 * far - 0.2 * (z > 1 ? 1 : 0), 0.04, 0.9), 0.42 * deep, 0.74 * deep, apart);
    plan.regSeq = sequence(post, 'reg', reg, (reg.length <= 1 ? 520 : reg.length === 2 ? 400 : 330) * Math.sqrt(z),
      has.covid19 ? 0.7 : 0.2 + 0.25 * far, (sub.length ? 0.32 : 0.42) * deep, (sub.length ? 0.56 : 0.72) * deep, apart);
    plan.tintSeq = sequence(post, 'tint', tint ? [tint] : [], 560 * Math.sqrt(z), 0.3, 0.5 * deep, 0.76 * deep, 0);
    return plan;
  }

  // The pigments along the sheet: the loudest first, later rounds shuffled.
  // Laid out from the left, so a wider sheet only adds to it.
  function sequence(post, label, list, baseW, gapP, dLo, dHi, apart) {
    const r = post.rng('wash:seq:' + label);
    const segs = [];
    const order = list.slice();
    let x = -30 - r() * baseW * 0.35, k = 0;
    return function(xmax) {
      while (list.length && x < xmax) {
        const j = k % order.length;
        if (j === 0 && k > 0) {
          for (let i = order.length - 1; i > 0; i--) {
            const o = r.int(i + 1), tmp = order[i];
            order[i] = order[o]; order[o] = tmp;
          }
        }
        const pig = order[j];
        const w = baseW * r.range(0.72, 1.35) * (0.78 + 0.4 * Math.sqrt(pig.share || 1));
        segs.push({ pig: pig, x0: x, x1: x + w, k: k, d: r.range(dLo, dHi), seed: r.int(1e6) });
        x += w + (r.chance(gapP) ? baseW * r.range(0.1, 0.32) : lerp(-w * r.range(0.1, 0.28), r.range(5, 11), apart));
        k++;
      }
      return segs.filter(function(s) { return s.x0 < xmax; });
    };
  }

  // The shape of the text along the sheet: long paragraphs let the wash hang
  // deeper, headings are where the brush was lifted, code is level.
  function profile(post) {
    const spans = [];
    let total = 0;
    post.shape.forEach(function(b) {
      let w = 30, d = 0.85;
      if (b.t === 'h') { w = 18; d = 0.55; }
      else if (b.t === 'p' || b.t === 'q') { w = clamp(b.n * 0.7, 26, 110); d = 0.8 + clamp(b.n / 170, 0, 0.32); }
      else if (b.t === 'c') { w = clamp(b.n * 5, 22, 120); d = 0.96; }
      spans.push([total, d]);
      total += w;
    });
    if (spans.length < 3) return function() { return 1; };
    const at = function(x) {
      const u = ((x % total) + total) % total;
      let lo = 0, hi = spans.length - 1;
      while (lo < hi) {
        const mid = (lo + hi + 1) >> 1;
        if (spans[mid][0] <= u) lo = mid; else hi = mid - 1;
      }
      return spans[lo][1];
    };
    return function(x) { return (at(x - 9) + 2 * at(x) + at(x + 9)) / 4; };
  }

  // ---- brushwork: seeded strokes on the mask ------------------------------
  //
  // Everything is drawn in (x, v): x along the sheet, v the distance from the
  // outer edge of the band (the top of the header, the bottom of the footer).

  function painter(H, flip) {
    const ch = [];
    for (let i = 0; i < 8; i++) ch.push({ soft: [], detail: [] });
    const pencil = [];
    const Y = flip ? function(v) { return H - v; } : function(v) { return v; };
    const path = function(ctx, pts) {
      ctx.beginPath();
      for (let i = 0; i < pts.length; i += 2) {
        if (i) ctx.lineTo(pts[i], Y(pts[i + 1])); else ctx.moveTo(pts[i], Y(pts[i + 1]));
      }
    };
    return {
      ch: ch, pencil: pencil,
      poly: function(c, layer, pts, a, black) {
        ch[c][layer].push(function(ctx) {
          ctx.globalAlpha = a;
          ctx.fillStyle = black ? '#000' : '#fff';
          path(ctx, pts);
          ctx.closePath();
          ctx.fill();
        });
      },
      disc: function(c, layer, x, v, r, a) {
        ch[c][layer].push(function(ctx) {
          ctx.globalAlpha = a;
          ctx.fillStyle = '#fff';
          ctx.beginPath();
          ctx.arc(x, Y(v), r, 0, 6.2832);
          ctx.fill();
        });
      },
      line: function(c, layer, pts, w, a, cap) {
        ch[c][layer].push(function(ctx) {
          ctx.globalAlpha = a;
          ctx.strokeStyle = '#fff';
          ctx.lineWidth = w;
          ctx.lineCap = cap || 'round';
          ctx.lineJoin = 'round';
          path(ctx, pts);
          ctx.stroke();
        });
      },
      // a stroke that changes width along its way (one outline, so it can be thin paint)
      taper: function(c, layer, pts, w0, w1, a) {
        const n = pts.length / 2, left = [], right = [];
        for (let i = 0; i < n; i++) {
          const i0 = Math.max(0, i - 1), i1 = Math.min(n - 1, i + 1);
          const dx = pts[2 * i1] - pts[2 * i0], dv = pts[2 * i1 + 1] - pts[2 * i0 + 1];
          const half = lerp(w0, w1, i / Math.max(1, n - 1)) / 2 / (Math.hypot(dx, dv) || 1);
          left.push(pts[2 * i] - dv * half, pts[2 * i + 1] + dx * half);
          right.push(pts[2 * i + 1] - dx * half, pts[2 * i] + dv * half);
        }
        this.poly(c, layer, left.concat(right.reverse()), a === undefined ? 1 : a);
      },
      // pencil: weight 0..1, wobble in sheet units (a ruled line has almost none)
      rule: function(x0, v0, x1, v1, weight, wobble, seed) {
        pencil.push(function(ctx, lw) {
          const len = Math.hypot(x1 - x0, v1 - v0) || 1, n = Math.max(1, Math.ceil(len / 7));
          const nx = -(v1 - v0) / len, nv = (x1 - x0) / len;
          ctx.lineWidth = lw;
          ctx.lineCap = 'round';
          let px = x0, pv = v0;
          for (let i = 1; i <= n; i++) {
            const t = i / n, off = wobble * U.noise1(t * len / 40 + 3.1, seed);
            const x = lerp(x0, x1, t) + nx * off, v = lerp(v0, v1, t) + nv * off;
            ctx.globalAlpha = weight * (0.66 + 0.34 * U.noise1(t * len / 23, seed + 5));
            ctx.beginPath();
            ctx.moveTo(px, Y(pv));
            ctx.lineTo(x, Y(v));
            ctx.stroke();
            px = x; pv = v;
          }
        });
      }
    };
  }

  // A wash that hangs from the outer edge down to fn(x).
  function hang(P, c, layer, x0, x1, fn, a) {
    const pts = [x0, -MARGIN];
    const n = Math.max(2, Math.ceil((x1 - x0) / 5));
    for (let i = 0; i <= n; i++) {
      const x = lerp(x0, x1, i / n);
      pts.push(x, fn(x));
    }
    pts.push(x1, -MARGIN);
    P.poly(c, layer, pts, a);
  }
  // The lower edge of a hanging wash: lobes, a wandering hand, rounded ends.
  // The facets have a say: a technical text levels it, a machine gives it a
  // regular beat, the author's own imagery its motif.
  function edgeFn(B, seg, depth, opts) {
    const fx = B.plan.fx, seed = seg.seed, w = seg.x1 - seg.x0, motif = fx.motif;
    const level = 1 - 0.6 * clamp((fx.technical - 0.4) / 0.6, 0, 1);
    const wander = (0.16 + 0.3 * B.wet) * level, beat = clamp(fx.regular, 0, 1), period = 26 + (seed % 9);
    const cell = function(i) { return U.noise1(i * 7.31 + 0.5, seed + 31) * 0.5 + 0.5; };
    return function(x) {
      const t = clamp((x - seg.x0) / w, 0, 1);
      const round = B.footer ? 0.4 + 0.6 * Math.pow(Math.sin(Math.PI * t), 0.4) : 0.14 + 0.86 * Math.pow(Math.sin(Math.PI * t), 0.5);
      let v = 0.76 + (B.footer ? 0.1 : 0.2) * level * U.noise1(x / 34, seed) + wander * U.noise1(x / 120, seed + 9);
      // a machine's hand: the same lobe again and again
      v = lerp(v, 0.62 + 0.3 * Math.pow(Math.abs(Math.sin(x * Math.PI / period)), 0.6), beat * 0.85);
      if (opts.scallop) v *= 0.74 + 0.26 * Math.abs(Math.sin(x / 19 + seed));
      if (opts.round) v = 0.95;
      if (!opts.plain) {
        if (motif === 'water') v *= 0.8 + 0.22 * Math.sin(x / 11 + seed) + 0.08 * Math.sin(x / 4.7);
        else if (motif === 'fire') v *= 0.55 + 0.75 * Math.pow(Math.abs(Math.sin(x / 13 + seed + 1.4 * U.noise1(x / 50, seed))), 3);
        else if (motif === 'stone') { const u = x / 30, i = Math.floor(u); v *= 0.55 + 0.6 * lerp(cell(i), cell(i + 1), u - i); }
        else if (motif === 'building') { const i = Math.floor(x / 21); v *= cell(i) > 0.3 ? 0.5 + 0.65 * cell(i * 3 + 1) : 0.3; }
      }
      return depth * v * round * (opts.level ? 1 : B.prof(x));
    };
  }
  function blob(P, c, layer, x, v, rx, ry, irr, a, r) {
    const pts = [], seed = r.int(1e6), rot = r() * 3.14;
    for (let i = 0; i < 20; i++) {
      const th = i / 20 * 6.2832, k = 1 + irr * U.noise1(i * 0.7, seed);
      const px = Math.cos(th) * rx * k, pv = Math.sin(th) * ry * k;
      pts.push(x + px * Math.cos(rot) - pv * Math.sin(rot), v + px * Math.sin(rot) + pv * Math.cos(rot));
    }
    P.poly(c, layer, pts, a);
  }
  function wavy(xa, xb, v, r, amp) {
    const pts = [], seed = r.int(1e6), n = Math.max(1, Math.ceil((xb - xa) / 14));
    for (let i = 0; i <= n; i++) {
      const x = lerp(xa, xb, i / n);
      pts.push(x, v + amp * U.noise1(x / 37, seed));
    }
    return pts;
  }
  // Paint that ran: a drip below a wash (header), a run down the sheet that
  // reaches the pool or dries on the way (footer).
  function run(B, c, x, from, to, r, reaches, lean) {
    const pts = [], seed = r.int(1e6), n = Math.max(2, Math.ceil((to - from) / 6));
    for (let i = 0; i <= n; i++) {
      const v = lerp(from, to, i / n);
      pts.push(x + (B.footer ? 3.5 : 1.5) * U.noise1(v / (B.footer ? 90 : 28), seed) * (i / n) + (lean || 0) * (v - from), v);
    }
    if (B.footer) {
      // it came from further up the sheet: faint and thin at first
      const cut = 2 * Math.floor(n * r.range(0.4, 0.7)), wide = r.range(3.8, 5.6);
      B.P.taper(c, 'detail', pts.slice(0, cut + 2), wide, wide * 0.72, 0.64);
      B.P.taper(c, 'detail', pts.slice(cut), wide * 0.72, 1.8, 0.58);
      if (!reaches) B.P.disc(c, 'detail', x, from - 1, wide * 0.7, 0.95);
    } else {
      B.P.taper(c, 'detail', pts, 4.4, r.range(3.2, 4), 0.85);
      B.P.disc(c, 'detail', pts[pts.length - 2], to, r.range(2.6, 3.4), 1);
    }
  }
  // A rivulet that forks as it goes; returns how far it got.
  function twig(B, c, r, x, v, ang, len, wd, depth) {
    const pts = [x, v], seed = r.int(1e6), n = Math.max(2, Math.round(len / 5));
    for (let i = 1; i <= n; i++) {
      ang += 0.16 * U.noise1(i * 0.6, seed);
      x += Math.cos(ang) * len / n;
      v += Math.sin(ang) * len / n;
      pts.push(x, v);
    }
    B.P.taper(c, 'detail', pts, wd, wd * 0.7);
    let reach = v;
    if (depth > 0 && wd > 2.2) {
      const spread = r.range(0.35, 0.6);
      reach = Math.max(reach, twig(B, c, r, x, v, ang - spread, len * r.range(0.6, 0.8), wd * 0.72, depth - 1));
      if (r.chance(0.85)) reach = Math.max(reach, twig(B, c, r, x, v, ang + spread * r.range(0.7, 1.2), len * r.range(0.55, 0.8), wd * 0.72, depth - 1));
    } else if (r.chance(0.7)) {
      B.P.disc(c, 'soft', x, v, r.range(4, 7) * Math.sqrt(B.Z), 0.6);
    }
    return reach;
  }
  // Where it all ended up: a pool along the bottom edge, deepest at the edge.
  function pool(B, pig, seg, r, k) {
    const P = B.P, c = pig.ch, x0 = seg.x0 - 28, x1 = seg.x1 + 28;
    const ed = edgeFn(B, { x0: x0, x1: x1, seed: seg.seed }, seg.d * 108 * k, {});
    hang(P, c, 'soft', x0, x1, ed, 0.66);
    hang(P, c, 'soft', x0 + r.range(0, 30), x1 - r.range(0, 30), function(x) { return ed(x) * 0.55; }, 0.3);
    hang(P, c, 'soft', x0 + r.range(0, 40), x1 - r.range(0, 40), function(x) { return ed(x) * 0.24; }, 0.32);
    return ed;
  }

  // The forms a subject's paint is laid in.  Each returns how far it reaches
  // inward at x, for what follows it (backruns, drips).
  const FORMS = {
    wash: function(B, pig, seg, r) {
      const P = B.P, c = pig.ch, w = seg.x1 - seg.x0;
      const ed = edgeFn(B, seg, B.depth(seg), pig.t);
      hang(P, c, 'soft', seg.x0, seg.x1, ed, 0.66);
      const a = seg.x0 + w * r.range(0.04, 0.2), b = seg.x1 - w * r.range(0.04, 0.2);
      const k1 = r.range(0.45, 0.68), k2 = r.range(0.16, 0.3);
      hang(P, c, 'soft', a, b, function(x) { return ed(x) * k1; }, 0.32);
      hang(P, c, 'soft', a, b, function(x) { return ed(x) * k2; }, 0.3);
      return ed;
    },

    // ai: a cumulus of wet dabs, with water run back into every lobe
    cloud: function(B, pig, seg, r) {
      const P = B.P, c = pig.ch, w = seg.x1 - seg.x0, D = B.depth(seg);
      const ed = edgeFn(B, seg, D * 0.3, {});
      hang(P, c, 'soft', seg.x0, seg.x1, ed, 0.6);
      const n = Math.max(4, Math.round(w / 34));
      const reach = [];
      for (let i = 0; i < n; i++) {
        const x = seg.x0 + w * (i + 0.5 + r.range(-0.35, 0.35)) / n;
        const rad = D * r.range(0.2, 0.42), v = r.range(0, D * 0.8 - rad * 0.6);
        P.disc(c, 'soft', x, v, rad, 0.6);
        if (r.chance(0.6)) P.disc(c, 'soft', x + r.range(-8, 8), v * 0.5, rad * 0.6, 0.35);
        if (r.chance(0.15 + 0.4 * B.wet)) blob(P, WATER, 'soft', x + r.range(-6, 6), v + rad * 0.35, rad * r.range(0.6, 0.9), rad * r.range(0.4, 0.7), 0.3, 1, r);
        reach.push([x, v + rad]);
      }
      return function(x) {
        let best = D * 0.3, dist = 1e9;
        reach.forEach(function(p) { const d = Math.abs(p[0] - x); if (d < dist) { dist = d; best = p[1]; } });
        return best;
      };
    },

    // unicode: drops of ink into clear water, feathering, with threads
    // that drift away from them
    ink: function(B, pig, seg, r) {
      const P = B.P, c = pig.ch, w = seg.x1 - seg.x0, D = B.depth(seg), z = Math.sqrt(B.Z);
      const ed = edgeFn(B, seg, D * 0.9, {});
      hang(P, c, 'soft', seg.x0, seg.x1, ed, 0.66);
      const n = 1 + Math.floor(w / 120 + r());
      for (let i = 0; i < n; i++) {
        const x = seg.x0 + w * (i + r.range(0.25, 0.75)) / n, v = D * r.range(0.1, 0.4), rad = r.range(7, 12) * z;
        blob(P, c, 'soft', x, v, rad * 1.9, rad * 1.5, 0.3, 0.5, r);
        blob(P, c, 'soft', x + r.range(-3, 3), v + r.range(-2, 4), rad, rad * 0.8, 0.25, 0.9, r);
        for (let j = 2 + r.int(3); j > 0; j--) {
          let ang = r.range(0.2, 0.8) * Math.PI, px = x, pv = v;
          const pts = [x, v], curl = r.range(-0.07, 0.07), seed = r.int(1e6);
          for (let k = 12 + r.int(16); k > 0; k--) {
            ang += curl + 0.3 * U.noise1(k * 0.35, seed);
            ang = lerp(ang, Math.PI / 2, 0.06);
            px += Math.cos(ang) * 3.6 * z;
            pv += Math.sin(ang) * 3.2 * z;
            pts.push(px, pv);
          }
          P.taper(c, 'detail', pts, r.range(4.5, 6.5) * z, 2.2, 0.9);
          if (r.chance(0.6)) blob(P, c, 'soft', px, pv, r.range(5, 9) * z, r.range(4, 6) * z, 0.3, 0.7, r);
        }
      }
      return ed;
    },

    // strokes of a flat brush: leaning (rust), level (tooling, c), boxes
    // (packaging, web), crossing (types)
    flat: function(B, pig, seg, r) {
      const P = B.P, c = pig.ch, t = pig.t, w = seg.x1 - seg.x0, D = B.depth(seg), Z = B.Z;
      if (t.horizontal) {
        const n = t.single ? 1 : 2 + r.int(2);
        let v0 = -MARGIN, reach = 0;
        for (let i = 0; i < n; i++) {
          const v1 = (i ? v0 : 0) + (i ? r.range(11, 20) : r.range(16, 28)) * Z;
          const xa = seg.x0 + (i ? w * r.range(0, 0.25) : 0), xb = seg.x1 - (i ? w * r.range(0, 0.3) : 0);
          const sk = r.range(-5, 5);
          P.poly(c, 'soft', [xa, v0, xb, v0, xb + sk, v1 + r.range(-1.5, 1.5), xa + sk * 0.4, v1], 0.72);
          reach = v1;
          v0 = v1 + r.range(-4, 5);
        }
        return function() { return reach; };
      }
      if (t.boxes) {
        let reach = 0;
        const rows = 1 + r.int(2) + (D > 80 * Z ? 1 : 0);
        let v0 = -MARGIN;
        for (let row = 0; row < rows; row++) {
          const h = r.range(22, 34) * Z, v1 = (row ? v0 : 0) + h;
          let x = seg.x0 + (row ? r.range(0, 0.3) * w : 0);
          const end = seg.x1 - (row ? r.range(0.1, 0.4) * w : 0);
          while (x < end - 16) {
            const bw = Math.min(r.range(30, 68), end - x);
            P.poly(c, 'soft', [x, v0, x + bw, v0, x + bw + r.range(-1, 1), v1, x + r.range(-1, 1), v1 + r.range(-2, 2)], r.range(0.62, 0.8));
            x += bw + r.range(-6, 4);
          }
          reach = v1;
          v0 = v1 + r.range(-3, 3);
        }
        return function() { return reach; };
      }
      if (t.lattice) {       // types: facets, with seams of paper between them
        const step = r.range(28, 38), n = Math.ceil(w / step);
        let top = [], reach = 0;
        for (let i = 0; i <= n + 1; i++) top.push([seg.x0 + i * step, -MARGIN]);
        for (let row = 0; row < 2; row++) {
          const bottom = [];
          for (let i = 0; i <= n; i++) {
            bottom.push([top[i][0] + step * r.range(0.3, 0.7), D * (row ? r.range(0.75, 1.1) : r.range(0.34, 0.58))]);
          }
          const facet = function(a, b, c2) {
            if (row && r.chance(0.42)) return;
            const cx = (a[0] + b[0] + c2[0]) / 3, cv = (a[1] + b[1] + c2[1]) / 3, pts = [];
            [a, b, c2].forEach(function(p) {
              const d = Math.hypot(p[0] - cx, p[1] - cv) || 1, k = Math.max(0, 1 - 2.6 / d);
              pts.push(cx + (p[0] - cx) * k, cv + (p[1] - cv) * k);
            });
            P.poly(c, 'detail', pts, r.pick([0.62, 0.72, 0.85, 0.96]));
            reach = Math.max(reach, cv);
          };
          for (let i = 0; i < n; i++) {
            facet(top[i], top[i + 1], bottom[i]);
            facet(bottom[i], bottom[i + 1], top[i + 1]);
          }
          top = bottom;
        }
        return function() { return reach; };
      }
      const strokes = [];
      const sets = [t.lean || 0];
      sets.forEach(function(lean) {
        const n = Math.max(2, Math.round(w / r.range(40, 62)));
        for (let i = 0; i < n; i++) {
          const cx = seg.x0 + w * (i + 0.5 + r.range(-0.2, 0.2)) / n;
          const sw = w / n * r.range(0.72, 1.25) / 2;
          const L = D * r.range(0.5, 1.05) * B.prof(cx), sk = r.range(-3, 3) + lean * sw;
          P.poly(c, 'soft', [
            cx - sw - lean * MARGIN, -MARGIN, cx + sw - lean * MARGIN, -MARGIN,
            cx + sw + lean * L, L + sk, cx - sw + lean * L, L - sk
          ], r.range(0.64, 0.76));
          strokes.push([cx + lean * L * 0.5, L]);
        }
      });
      if (t.grid) {          // engineering: the construction under it
        const y0 = D * 0.5, s = seg.seed;
        P.rule(seg.x0 - 20, y0, seg.x1 + 24, y0, 0.4, 0.2, s);
        P.rule(seg.x0 - 20, y0 + 22 * Z, seg.x1 + 24, y0 + 22 * Z, 0.3, 0.2, s + 1);
        for (let x = seg.x0 + r.range(0, 22); x < seg.x1 + 10; x += 44) {
          P.rule(x, -4, x, y0 + 30 * Z, 0.3, 0.2, s + x);
        }
      }
      if (t.hatch) {         // security: hatched shut
        const xa = seg.x0 + w * r.range(0.1, 0.5), n = 9 + r.int(8), h = D * r.range(0.5, 0.8);
        for (let i = 0; i < n; i++) {
          const x = xa + i * 4.2 + r.range(-0.6, 0.6);
          P.rule(x, r.range(2, 8), x - h * 0.55, h + r.range(-5, 5), r.range(0.4, 0.62), 0.5, seg.seed + i);
        }
      }
      return function(x) {
        let best = D * 0.6, dist = 1e9;
        strokes.forEach(function(p) { const d = Math.abs(p[0] - x); if (d < dist) { dist = d; best = p[1]; } });
        return best;
      };
    },

    // parallel strokes: lanes (go), strata (databases, os), woven (async),
    // piped together (wsgi), joined (api)
    lanes: function(B, pig, seg, r) {
      const P = B.P, c = pig.ch, t = pig.t, w = seg.x1 - seg.x0, z = Math.sqrt(B.Z);
      const n = t.n || 3 + r.int(2);
      const h = (t.join ? r.range(15, 19) : r.range(10, 14)) * z, gap = t.strata ? -2 : r.range(5.5, 8) * z;
      const mids = [];
      let v = -h * 0.45;
      for (let i = 0; i < n; i++) {
        const mid = v + h / 2;
        mids.push(mid);
        const xa = seg.x0 + (i ? w * r.range(0, 0.25) : 0), xb = seg.x1 - (i ? w * r.range(0, 0.32) : 0);
        if (t.strata) {
          P.line(c, 'soft', wavy(xa, xb, mid, r, 2.2), h + 3, lerp(0.5, 0.82, i / Math.max(1, n - 1)), 'butt');
        } else if (t.join) {
          const xj = lerp(xa, xb, r.range(0.3, 0.7));
          P.poly(c, 'detail', [xa, v, xj - 2.6, v, xj - 2.6, v + h, xa, v + h], 0.82);
          P.poly(c, 'detail', [xj + 2.6, v, xb, v, xb, v + h, xj + 2.6, v + h], 0.82);
        } else if (t.weave) {
          let x = xa;
          while (x < xb) {
            const len = r.range(36, 90), xe = Math.min(xb, x + len);
            const pts = wavy(x, xe, mid, r, 1);
            if (i < n - 1 && r.chance(0.45)) {   // leaves for the next lane
              const step = h + gap;
              for (let k = 1; k <= 5; k++) pts.push(xe + k * 4.5, mid + step * (0.5 - 0.5 * Math.cos(k / 5 * Math.PI)));
            }
            P.line(c, 'detail', pts, h * 0.72, 0.8);
            x = xe + r.range(14, 26);
          }
        } else {
          P.line(c, 'detail', wavy(xa, xb, mid, r, 1.3), h, 0.8);
        }
        v += h + gap;
      }
      if (t.pipes) {
        for (let k = 2 + r.int(3); k > 0; k--) {
          const i = r.int(n - 1), x = seg.x0 + w * r.range(0.3, 0.68);
          P.line(c, 'detail', [x, mids[i], x, mids[i + 1]], r.range(4.5, 6.5), 0.8);
        }
      }
      return function() { return v - gap; };
    },

    // paint that travels in lines: growing (opensource), forking and merging
    // (vcs), nodes and edges (networking)
    branch: function(B, pig, seg, r) {
      const P = B.P, c = pig.ch, t = pig.t, w = seg.x1 - seg.x0, D = B.depth(seg), z = Math.sqrt(B.Z);
      const ed = edgeFn(B, seg, D * 0.26, {});
      let reach = D * 0.9;
      if (t.mode !== 'grow') hang(P, c, 'soft', seg.x0, seg.x1, edgeFn(B, seg, D * 0.5, {}), 0.6);
      if (t.mode === 'merge') {
        const va = r.range(14, 22) * B.Z;
        P.line(c, 'detail', wavy(seg.x0, seg.x1, va, r, 1.5), 3.6 * z, 0.85);
        for (let k = Math.max(1, Math.round(w / 120)); k > 0; k--) {
          const xs = seg.x0 + w * r.range(0.05, 0.5), xe = Math.min(seg.x1 - 6, xs + r.range(60, 150));
          const vb = va + r.range(15, 30) * B.Z * (r.chance(0.8) ? 1 : 1.7);
          const pts = [];
          for (let i = 0; i <= 24; i++) {
            const u = i / 24, bend = Math.min(1, Math.min(u, 1 - u) * 5);
            pts.push(lerp(xs, xe, u), lerp(va, vb, bend * bend * (3 - 2 * bend)));
          }
          P.line(c, 'detail', pts, 3.2 * z, 0.85);
          P.disc(c, 'detail', xs, va, 4.2 * z, 1);
          P.disc(c, 'detail', xe, va, 4.2 * z, 1);
          P.disc(c, 'detail', lerp(xs, xe, r.range(0.35, 0.65)), vb, 3.4 * z, 1);
          reach = Math.max(reach * 0, vb);
        }
        return function() { return reach + 4; };
      }
      if (t.mode === 'net') {
        const nodes = [];
        for (let k = Math.max(4, Math.round(w / 34)); k > 0; k--) {
          nodes.push([seg.x0 + w * r.range(0.03, 0.97), r.range(4, D), r.range(2.8, 6) * z]);
        }
        nodes.forEach(function(a, i) {
          const near = nodes.map(function(b, j) { return [Math.hypot(a[0] - b[0], a[1] - b[1]), j]; })
            .filter(function(e) { return e[1] !== i; }).sort(function(p, q) { return p[0] - q[0]; });
          near.slice(0, 1 + (i % 2)).forEach(function(e) {
            const b = nodes[e[1]];
            P.line(c, 'detail', [a[0], a[1], b[0], b[1]], 2.6 * z, 0.8);
          });
          P.disc(c, 'detail', a[0], a[1], a[2], 1);
          if (i % 3 === 0) P.disc(c, 'soft', a[0], a[1], a[2] * 3.2, 0.5);
          P.line(c, 'detail', [a[0], -8, a[0], a[1]], 2.4 * z, i % 4 === 0 ? 0.8 : 0);
        });
        return function() { return D; };
      }
      hang(P, c, 'soft', seg.x0, seg.x1, ed, 0.68);
      const grow = function(x, v, ang, len, wd, depth) { reach = Math.max(reach, twig(B, c, r, x, v, ang, len, wd, depth)); };
      reach = 0;
      for (let k = Math.max(1, Math.round(w / 90)); k > 0; k--) {
        grow(seg.x0 + w * r.range(0.12, 0.88), -2, Math.PI / 2 + r.range(-0.25, 0.25), D * r.range(0.3, 0.42), 5.2 * z, 3);
      }
      return function() { return reach * 0.8; };
    },

    // restless: curls (javascript), dots (games)
    curl: function(B, pig, seg, r) {
      const P = B.P, c = pig.ch, t = pig.t, w = seg.x1 - seg.x0, D = B.depth(seg), z = Math.sqrt(B.Z);
      const ed = edgeFn(B, seg, D * 0.36, {});
      hang(P, c, 'soft', seg.x0, seg.x1, ed, 0.66);
      if (t.dots) {
        for (let k = Math.round(w / 20); k > 0; k--) {
          const rad = r.range(2.2, 9) * z;
          P.disc(c, rad > 5 ? 'soft' : 'detail', seg.x0 + w * r.range(0.04, 0.96), D * r.range(0.25, 1.05), rad, rad > 5 ? 0.8 : 1);
        }
        return function() { return D; };
      }
      for (let k = Math.max(1, Math.round(w / 75)); k > 0; k--) {
        const R = r.range(6, 11) * z, cx = seg.x0 + w * r.range(0.1, 0.8), adv = r.range(1.6, 3.4) * (r.chance(0.5) ? 1 : -1);
        const drop = (D - 2 * R) / (r.range(2.2, 3.6) * 6.2832), turns = (D - 2 * R) / drop;
        const pts = [];
        for (let a = 0; a < turns; a += 0.3) {
          pts.push(cx + adv * a + R * Math.sin(a), -2 + drop * a + R * (1 - Math.cos(a)));
        }
        if (pts.length > 4) P.taper(c, 'detail', pts, 4.4 * z, 2.6 * z);
      }
      return function() { return D * 0.9; };
    },

    // hardware: traces from a bus at the edge, right angles, pads
    trace: function(B, pig, seg, r) {
      const P = B.P, c = pig.ch, w = seg.x1 - seg.x0, D = B.depth(seg), z = Math.sqrt(B.Z);
      hang(P, c, 'soft', seg.x0, seg.x1, function() { return 9 * B.Z; }, 0.72);
      let x = seg.x0 + r.range(8, 30), reach = 0;
      while (x < seg.x1 - 12) {
        const v1 = D * r.range(0.25, 0.6), dir = r.chance(0.5) ? 1 : -1, len = r.range(14, 60), v2 = v1 + 9 + D * r.range(0.05, 0.35);
        const x2 = x + dir * 9, x3 = x2 + dir * len;
        P.line(c, 'detail', [x, 0, x, v1, x2, v1 + 9, x3, v1 + 9, x3, v2], 3.1 * z, 0.85);
        P.disc(c, 'detail', x3, v2, 3.6 * z, 1);
        reach = Math.max(reach, v2);
        x += r.range(20, 62);
      }
      return function() { return reach; };
    }
  };

  // How a register lays its ground.
  const GROUNDS = {
    // wet-on-wet: a veil that wanders (thoughts, life, culture)
    veil: function(B, pig, seg, r) {
      const ed = edgeFn(B, seg, B.depth(seg), {});
      hang(B.P, pig.ch, 'soft', seg.x0, seg.x1, ed, 0.66);
      const k = r.range(0.4, 0.6), w = seg.x1 - seg.x0;
      hang(B.P, pig.ch, 'soft', seg.x0 + w * r.range(0.1, 0.3), seg.x1 - w * r.range(0.1, 0.3), function(x) { return ed(x) * k; }, 0.26);
      return ed;
    },
    // history: an old stain with its rings, foxed
    stain: function(B, pig, seg, r) {
      const ed = GROUNDS.veil(B, pig, seg, r), w = seg.x1 - seg.x0;
      for (let k = Math.round(w / 34); k > 0; k--) {
        B.P.disc(pig.ch, 'detail', seg.x0 + w * r(), B.depth(seg) * r.range(0, 1.5), r.range(1.3, 2.3), 1);
      }
      return ed;
    },
    // politics: scrubbed on, back and forth, with a loaded brush
    scrub: function(B, pig, seg, r) {
      const P = B.P, c = pig.ch, D = B.depth(seg) * 1.15;
      const ed = edgeFn(B, seg, D * 0.5, {});
      hang(P, c, 'soft', seg.x0, seg.x1, ed, 0.62);
      [['soft', 9, 0.5], ['detail', 3.6, 0.8]].forEach(function(pass) {
        const pts = [];
        let x = seg.x0 + r.range(0, 10), down = false;
        while (x < seg.x1) {
          pts.push(x, down ? D * r.range(0.55, 1.05) * B.prof(x) : r.range(-6, 6));
          x += r.range(5, 11);
          down = !down;
        }
        P.line(c, pass[0], pts, pass[1] * Math.sqrt(B.Z), pass[2]);
      });
      return function(x) { return ed(x) * 1.7; };
    },
    // business: two level bands and entries at measured intervals
    ledger: function(B, pig, seg, r) {
      const P = B.P, c = pig.ch, Z = B.Z, a = 19 * Z, b = a + 5, d = b + 10 * Z;
      P.poly(c, 'soft', [seg.x0, -MARGIN, seg.x1, -MARGIN, seg.x1 - 3, a, seg.x0 + 2, a], 0.72);
      P.poly(c, 'detail', [seg.x0 + 14, b, seg.x1 - 26, b, seg.x1 - 28, d, seg.x0 + 15, d], 0.8);
      for (let x = Math.ceil((seg.x0 + 20) / 46) * 46; x < seg.x1 - 30; x += 46) {
        if (r.chance(0.8)) P.poly(c, 'detail', [x, d + 6, x + 6, d + 6, x + 6, d + 6 + r.range(6, 15) * Z, x, d + 16 * Z], 0.85);
      }
      P.rule(seg.x0 - 12, d + 3, seg.x1 + 12, d + 3, 0.42, 0.2, seg.seed);
      P.rule(seg.x0 - 8, d + 5.5, seg.x1 + 4, d + 5.5, 0.3, 0.2, seg.seed + 1);
      return function() { return d; };
    },
    // tutorial: an even wash, the tape gives it its shape
    flatwash: function(B, pig, seg, r) {
      const D = 132 * B.Z, w = seg.x1 - seg.x0;
      hang(B.P, pig.ch, 'soft', seg.x0, seg.x1, function() { return D; }, 0.7);
      hang(B.P, pig.ch, 'soft', seg.x0 + w * r.range(0, 0.3), seg.x1, function(x) { return D * (0.3 + 0.12 * U.noise1(x / 50, seg.seed)); }, 0.28);
      return function() { return 60 * B.Z; };
    },
    // announcement: a loaded brush flicked at the sheet
    burst: function(B, pig, seg, r) {
      const P = B.P, c = pig.ch, w = seg.x1 - seg.x0, D = B.depth(seg), z = Math.sqrt(B.Z);
      const ed = edgeFn(B, seg, D * 0.3, {});
      hang(P, c, 'soft', seg.x0, seg.x1, ed, 0.6);
      const x = seg.x0 + w * r.range(0.3, 0.7), v = D * r.range(0.3, 0.55), R = r.range(13, 21) * z;
      const core = [], seed = r.int(1e6);
      for (let i = 0; i < 36; i++) {
        const th = i / 36 * 6.2832, spike = Math.pow(Math.abs(U.noise1(i * 1.9, seed)), 2.2);
        const rad = R * (0.6 + 0.2 * U.noise1(i * 0.5, seed + 3) + 1.5 * spike);
        core.push(x + Math.cos(th) * rad, v + Math.sin(th) * rad);
      }
      P.poly(c, 'soft', core, 0.7);
      P.poly(c, 'detail', core, 0.7);
      P.disc(c, 'soft', x, v, R * 0.6, 0.5);
      for (let k = 30 + r.int(30); k > 0; k--) {
        const th = r() * 6.2832, far = Math.pow(r(), 1.6), dist = R * (1.25 + 5.5 * far);
        const rad = Math.max(1.3, R * 0.2 * (1 - far * 0.8) * r.range(0.4, 1.3));
        const px = x + Math.cos(th) * dist, pv = v + Math.sin(th) * dist * 0.8;
        const tail = rad * r.range(0, 2.6) * (1 - far);
        P.line(c, 'detail', [px, pv, px + Math.cos(th) * tail, pv + Math.sin(th) * tail], rad * 2, 1);
      }
      return ed;
    },
    // community, conferences: many small marks, gathering
    dabs: function(B, pig, seg, r) {
      const P = B.P, c = pig.ch, w = seg.x1 - seg.x0, D = B.depth(seg), size = (pig.t.size || 6) * Math.sqrt(B.Z);
      const centres = [seg.x0 + w * r.range(0.15, 0.45), seg.x0 + w * r.range(0.55, 0.9)];
      for (let k = Math.round(w / size * 0.62); k > 0; k--) {
        const x = r.pick(centres) + r.gauss() * w * 0.17, v = Math.abs(r.gauss()) * D * 0.5 - 2;
        P.disc(c, 'detail', x, v, size * r.range(0.6, 1.3), 0.62);
      }
      return function(x) { return D * 0.4; };
    },
    // covid19: islands that keep their distance
    islands: function(B, pig, seg, r) {
      const P = B.P, c = pig.ch, w = seg.x1 - seg.x0, D = B.depth(seg), z = Math.sqrt(B.Z);
      hang(P, c, 'soft', seg.x0, seg.x1, function() { return 7 * B.Z; }, 0.62);
      const n = Math.max(2, Math.round(w / 85));
      for (let i = 0; i < n; i++) {
        const rad = r.range(11, 20) * z;
        blob(P, c, 'soft', seg.x0 + w * (i + 0.5 + r.range(-0.15, 0.15)) / n, D * r.range(0.45, 0.9), rad, rad * r.range(0.7, 1), 0.12, 0.74, r);
      }
      return function() { return 7 * B.Z; };
    }
  };

  // A project's mark: one deliberate gesture.  `up` keeps it upright in the footer.
  const MARKS = {
    stroke: function(P, c, x, v, s, up, r) {
      P.taper(c, 'detail', [x - 11 * s, v + 4 * up * s, x - 3 * s, v, x + 5 * s, v - 2 * up * s, x + 12 * s, v - 5 * up * s], 6.5 * s, 2 * s);
    },
    seal: function(P, c, x, v, s, up, r) {           // jinja: a red seal
      const a = r.range(-0.14, 0.14), h = 8.6 * s, pts = [];
      [[-1, -1], [1, -1.04], [1.03, 1], [-0.98, 1.02]].forEach(function(p) {
        pts.push(x + (p[0] * Math.cos(a) - p[1] * Math.sin(a)) * h, v + (p[0] * Math.sin(a) + p[1] * Math.cos(a)) * h);
      });
      P.poly(c, 'detail', pts, 0.9);
    },
    dab: function(P, c, x, v, s, up, r) {            // django: one press of a round brush
      blob(P, c, 'detail', x, v, 10 * s, 6.5 * s, 0.1, 0.92, r);
    },
    eye: function(P, c, x, v, s, up, r) {            // sentry: watchful
      const pts = [];
      for (let i = 0; i <= 24; i++) pts.push(x + Math.cos(i / 24 * 6.2832) * 8.6 * s, v + Math.sin(i / 24 * 6.2832) * 8.6 * s);
      P.line(c, 'detail', pts, 2.9 * s, 0.9);
      P.disc(c, 'detail', x, v, 3.5 * s, 1);
    },
    enso: function(P, c, x, v, s, up, r) {           // pi: a circle, never quite closed
      const pts = [], a0 = r.range(-0.3, 0.5);
      for (let i = 0; i <= 26; i++) {
        const a = a0 + i / 26 * 5.35;
        pts.push(x + Math.cos(a) * 9.5 * s, v + up * Math.sin(a) * 9.5 * s);
      }
      P.taper(c, 'detail', pts, 4.8 * s, 2.2 * s);
    },
    star: function(P, c, x, v, s, up, r) {           // earendil
      const tilt = r.range(-0.12, 0.12);
      for (let k = 0; k < 8; k++) {
        const a = tilt + k * Math.PI / 4, len = (k % 2 ? 5.5 : k % 4 === 0 ? 10 : 13.5) * s;
        P.taper(c, 'detail', [x, v, x + Math.cos(a) * len * 0.5, v + Math.sin(a) * len * 0.5, x + Math.cos(a) * len, v + Math.sin(a) * len], 3.6 * s, 1.7 * s);
      }
      P.disc(c, 'detail', x, v, 2.4 * s, 1);
    },
    flask: function(P, c, x, v, s, up, r) {          // flask: a small flask, in ink
      const q = function(dx, dy) { return [x + dx * s, v + dy * up * s]; };
      P.poly(c, 'detail', [].concat(q(-2.6, -10), q(2.6, -10), q(2.6, -3), q(8.5, 7), q(7, 9), q(-7, 9), q(-8.5, 7), q(-2.6, -3)), 0.95);
      P.line(c, 'detail', [].concat(q(-4.2, -10.5), q(4.2, -10.5)), 2.4 * s, 0.9);
    }
  };

  // What follows a wash wherever it was laid: water running back into it,
  // paint running out of it, a flick of spatter.
  function extras(B, pig, seg, r, ed, amount) {
    const P = B.P, c = pig.ch, w = seg.x1 - seg.x0, plan = B.plan, fx = plan.fx, z = Math.sqrt(B.Z), zoom = Math.sqrt(fx.zoom);
    // backruns; where the text is tense they sit at the ends, where the washes meet
    let n = Math.floor(pig.t.b * B.wet * w / 150 * r.range(0.5, 1.6) * amount * (1 + 1.2 * fx.blotted) + r() * 0.5 + fx.tension * 1.4);
    for (; n > 0; n--) {
      const at = r.chance(fx.tension * 0.8) ? (r.chance(0.5) ? r.range(0, 0.1) : r.range(0.9, 1)) : r.range(0.1, 0.9);
      const x = seg.x0 + w * at, rad = r.range(12, 28) * z * zoom, v = ed(x) * r.range(0.4, 1);
      blob(P, WATER, 'soft', x, v, rad, rad * r.range(0.55, 0.9), 0.3, 1, r);
      if (r.chance(0.5)) P.disc(WATER, 'soft', x + rad * r.range(-1, 1), v + rad * r.range(-0.4, 0.6), rad * 0.5, 1);
    }
    // one actor: one charge of pigment dropped into the wash; a group: many small marks gathering at its edge
    if (r.chance(fx.one * 0.9)) {
      const x = seg.x0 + w * r.range(0.3, 0.7), rad = r.range(13, 20) * z * zoom;
      blob(P, c, 'soft', x, ed(x) * r.range(0.35, 0.6), rad, rad * 0.8, 0.25, 0.85, r);
    }
    for (n = Math.floor(fx.many * w / 9 * r.range(0.6, 1.2)); n > 0; n--) {
      const x = seg.x0 + w * r(), far = Math.abs(r.gauss()) * 0.5;
      P.disc(c, 'detail', x, ed(x) * (1 + far * 0.6) + 2, r.range(2.2, 4.6) * z, 0.7);
    }
    // an advocate pushes: strokes dragged on past the wash, all one way
    for (n = Math.floor(fx.pushed * w / 26 * r.range(0.6, 1.3)); n > 0; n--) {
      const x = seg.x0 + w * r(), from = ed(x) * r.range(0.5, 0.9), len = r.range(24, 60) * z;
      P.line(c, 'soft', [x, from, x + len * 0.8, from + len * 0.45], r.range(5, 9) * z, 0.5);
    }
    // the author's own images
    if (fx.motif === 'growth' && !B.footer) {
      for (n = Math.max(1, Math.round(w / 110)); n > 0; n--) {
        const x = seg.x0 + w * r.range(0.1, 0.9);
        twig(B, c, r, x, ed(x) * 0.6, Math.PI / 2 + r.range(-0.3, 0.3), r.range(18, 30), 4.6, 2);
      }
    } else if (fx.motif === 'crowd') {
      for (n = Math.round(w / 7); n > 0; n--) {
        const x = seg.x0 + w * r();
        P.disc(c, 'detail', x, ed(x) + Math.abs(r.gauss()) * 9 * z, r.range(2, 3.6) * z, 0.75);
      }
    } else if (fx.motif === 'light') {      // salt thrown into the wet wash, and one sun left white
      for (n = Math.round(w / 5); n > 0; n--) {
        const x = seg.x0 + w * r();
        P.disc(RESIST, 'detail', x, ed(x) * r(), r.range(0.9, 2) * z, 1);
      }
      if (r.chance(0.5)) { const x = seg.x0 + w * r.range(0.25, 0.75); P.disc(RESIST, 'detail', x, ed(x) * 0.45, r.range(8, 13) * z, 1); }
    }
    // paint that ran: how the picture ends.  Open: it trails off; resolved: it holds its edge
    const flow = (0.2 + 0.5 * B.wet + 0.6 * B.en) * (plan.has.politics ? 1.7 : 1) * (plan.has.tutorial ? 0.3 : 1) * amount *
      (fx.known ? 0.5 + 0.8 * fx.open + 0.4 * fx.call - 0.4 * fx.resolved : 1) * (fx.motif === 'water' ? 1.8 : 1);
    const lean = 0;      // the shader leans the whole sheet (time: past, future)
    if (B.footer) {
      n = Math.floor(w / 190 * r.range(0.3, 1.5) * (0.25 + 0.8 * Math.max(0, flow)) + r() * 0.5);
      for (; n > 0; n--) {
        const x = seg.x0 + w * r.range(0.05, 0.95), top = B.H * (r.chance(0.6) ? r.range(0.8, 0.99) : r.range(0.35, 0.8));
        const reaches = r.chance(fx.known ? clamp(0.72 - 0.6 * fx.open + 0.3 * fx.resolved, 0.08, 0.98) : 0.72);
        const from = reaches ? ed(x) * 0.7 : ed(x) + r.range(16, 90);
        if (top - from < 40) continue;
        run(B, c, x, from, top, r, reaches, lean);
        // the run carried water into the drying pool
        if (reaches && r.chance(0.6)) blob(P, WATER, 'soft', x + r.range(-6, 6), ed(x) * r.range(0.6, 0.95), r.range(9, 17), r.range(7, 12), 0.3, 1, r);
      }
    } else {
      n = Math.floor(Math.max(0, flow) * w / 150 * r.range(0.4, 1.5) + r() * 0.45);
      for (; n > 0; n--) {
        const x = seg.x0 + w * r.range(0.12, 0.88), from = ed(x) * 0.7;
        run(B, c, x, from, Math.min(from + r.range(8, 34) * (0.6 + 0.6 * B.wet) * (1 + 0.5 * fx.open), B.H * 0.84), r, false, lean);
      }
      // a call to the reader: one run that goes on, well past the rest
      if (r.chance(fx.call * 0.8)) {
        const x = seg.x0 + w * r.range(0.2, 0.8);
        run(B, c, x, ed(x) * 0.7, B.H * r.range(0.78, 0.86), r, false, lean);
      }
    }
    // spatter: an agitated hand, or a joke
    n = Math.floor((Math.max(0, B.en - 0.45) + Math.max(0, fx.humor - 0.3) * 1.3 + 0.8 * fx.mood('playful')) * w / 14 * r.range(0.3, 1.2) * amount);
    for (; n > 0; n--) {
      const x = seg.x0 + w * r(), far = Math.pow(r(), 1.5);
      P.disc(c, 'detail', x, ed(x) + 3 + far * 46 * B.Z, lerp(2.6, 1.3, far) * r.range(0.7, 1.2), 1);
    }
  }

  // tutorial: tape over everything but a row of panels, stepped, over ruled lines
  function masking(B) {
    const P = B.P, r = B.plan.post.rng('wash:tape'), Z = B.Z, seed = B.plan.post.seed % 9973;
    const levels = [56, 70, 84, 98];
    P.poly(RESIST, 'detail', [-MARGIN, -MARGIN, B.W + MARGIN, -MARGIN, B.W + MARGIN, B.H + MARGIN, -MARGIN, B.H + MARGIN], 1);
    // the panels are the sections of the text: as wide as a section is long,
    // as deep as it has code (a page without text: any row of panels)
    const sections = [];
    let words = 0, code = 0;
    B.plan.post.shape.concat([{ t: 'h', n: 1 }]).forEach(function(b) {
      if (b.t === 'h') {
        if (words + code > 0) sections.push([clamp(40 + words * 0.4 + code * 2.5, 56, 250), code * 6 / (code * 6 + words + 1)]);
        words = code = 0;
      } else if (b.t === 'c') code += b.n;
      else if (b.t === 'p' || b.t === 'q') words += b.n;
      else words += 12;
    });
    let x = -20 - r() * 70, level = 1 + r.int(2), k = 0;
    while (x < B.W + MARGIN) {
      const section = sections.length > 1 ? sections[k % sections.length] : null;
      const w = section ? section[0] : r.range(84, 210);
      const tape = r.range(8, 12) + (section && k % sections.length === sections.length - 1 ? 26 : 0);
      if (section) level = clamp(Math.round(section[1] * 4.4), 0, 3);
      const v = levels[level] * Z;
      k++;
      P.poly(RESIST, 'detail', [x, -MARGIN, x + w, -MARGIN, x + w, v, x, v], 1, true);
      P.rule(x, v - 5, x, v + 11, 0.5, 0.15, seed + x);
      P.rule(x + w, v - 5, x + w, v + 11, 0.5, 0.15, seed + x + 1);
      level = clamp(level + (r.chance(0.5) ? 1 : -1), 0, 3);
      x += w + tape;
    }
    levels.forEach(function(l, i) { P.rule(-10, l * Z, B.W + 10, l * Z, 0.34, 0.22, seed + i); });
  }

  // What the facets add over the whole band: breaks, cuts, a squared-off end,
  // ruled lines, and the pencil.
  function gestures(B, xmax) {
    const P = B.P, plan = B.plan, fx = plan.fx, post = plan.post, footer = B.footer, H = B.H, kind = B.kind;
    const cells = function(label, size, fn) {
      for (let k = -1; k * size < xmax; k++) fn(U.rng(U.hash(post.seed + ':' + label + ':' + kind + ':' + k)), k * size);
    };
    const reach = footer ? 130 : 125;
    // tension: faults, the sheet breaks where the two sides do not meet
    if (fx.tension > 0.45) {
      cells('fault', 380, function(r, x0) {
        for (let n = Math.floor((fx.tension - 0.45) * 2.6 + r()); n > 0; n--) {
          let x = x0 + r() * 380;
          const pts = [], slope = r.range(-0.45, 0.45), seed = r.int(1e6);
          for (let v = -MARGIN; v < reach; v += 6) { x += slope * 6 + 3.2 * U.noise1(v / 14, seed); pts.push(x, v); }
          P.line(RESIST, 'detail', pts, r.range(1.5, 2.3), 1);
        }
      });
    }
    // a critic cuts: lines scratched out of the wet paint
    if (fx.cut > 0.2) {
      cells('cut', 260, function(r, x0) {
        if (!r.chance(fx.cut)) return;
        const x = x0 + r() * 260, v = r.range(4, 30), a = r.range(0.5, 0.9) * (r.chance(0.5) ? 1 : -1);
        for (let i = 4 + r.int(5); i > 0; i--) {
          const o = i * r.range(3.4, 5), len = r.range(30, 80), bow = r.range(-3, 3);
          P.line(RESIST, 'detail', [x + o, v, x + o + Math.cos(a) * len * 0.5 + bow, v + Math.abs(Math.sin(a)) * len * 0.5,
            x + o + Math.cos(a) * len, v + Math.abs(Math.sin(a)) * len], 1.1, 1);
        }
      });
    }
    // imagery road: a path of bare paper through the washes
    if (fx.motif === 'road') {
      const seed = post.seed % 9001, pts = [];
      for (let x = -MARGIN; x < xmax; x += 10) pts.push(x, (footer ? 34 : 30) + 20 * U.noise1(x / 150, seed) + 5 * U.noise1(x / 37, seed + 2));
      P.line(RESIST, 'detail', pts, 4.2, 1);
    }
    // a practical ending: squared off, the wash stops at a ruled line
    const level = post.rng('wash:square').range(footer ? 44 : 50, footer ? 60 : 66);
    if (fx.practical > 0.25 && !plan.has.tutorial) {
      cells('square', 520, function(r, x0) {
        if (!r.chance(fx.practical * 1.15)) return;
        const xa = x0 + r.range(0, 60), xb = x0 + 520 - r.range(0, 60);
        P.poly(RESIST, 'detail', [xa, level, xb, level, xb, H + MARGIN, xa, H + MARGIN], 1);
        P.rule(xa - 9, level + 0.6, xb + 9, level + 0.6, 0.6, 0.15, r.int(1e6));
      });
    }
    // technical, a teacher: ruled and measured
    const ruled = Math.max(clamp((fx.technical - 0.5) * 2, 0, 1), fx.ruled);
    if (ruled > 0.2 && !plan.has.tutorial) {
      const base = level + (footer ? 18 : 14), seed = post.seed % 7717;
      P.rule(-10, base, xmax, base, 0.3 + 0.3 * ruled, 0.15, seed);
      if (ruled > 0.55) P.rule(-10, base + 9, xmax, base + 9, 0.34, 0.15, seed + 1);
      for (let x = (seed % 40); x < xmax; x += 40) {
        const major = Math.round(x / 40) % 5 === 0;
        P.rule(x, base - (major ? 6 : 3), x, base + 1, 0.3 + 0.3 * ruled, 0.1, seed + x);
      }
    }
    // the line the washes were meant to hang to: firm when the author is sure,
    // searched for again and again when he is not
    const vh = plan.horizon * (footer ? 112 : 150);
    const sure = clamp((fx.certainty - 0.5) * 2, -1, 1), tries = sure < -0.3 ? 3 : sure < 0.1 ? 2 : 1;
    cells('pencil', 330, function(r, x0) {
      if (plan.has.tutorial || !r.chance(0.62 + 0.3 * Math.abs(sure))) return;
      const xa = x0 + r.range(0, 150), len = r.range(110, 250) * (1 + 0.6 * Math.max(0, sure));
      const weight = lerp(0.62, 0.42, plan.wet) * (1 + 0.35 * sure);
      for (let i = 0; i < (fx.known ? tries : 1); i++) {
        const o = i ? r.range(-5, 5) : 0;
        P.rule(xa + i * r.range(-14, 14), vh + o + r.range(-1, 1), xa + len, vh + o * 0.4 + r.range(-2, 2), weight * (i ? 0.7 : 1),
          sure > 0.3 ? 0.3 : 1.1 + 1.3 * Math.max(0, -sure), r.int(1e6));
      }
      if (r.chance(0.6)) P.rule(xa + len + 5, vh - 4, xa + len + 5, vh + 5, weight, 0.3, r.int(1e6));
      // the hand showing: a note in the margin, the more personal the text
      if (r.chance(clamp(fx.personal - 0.45, 0, 1) * 1.4)) {
        const sx = xa + r.range(20, len), sv = vh + r.range(8, 16), seed = r.int(1e6);
        let px = sx, pv = sv;
        for (let i = 1; i <= 22; i++) {
          const nx = sx + i * 2.4, nv = sv + 2.6 * Math.sin(i * 1.9 + seed) * (0.5 + 0.5 * U.noise1(i * 0.3, seed));
          P.rule(px, pv, nx, nv, 0.5, 0, seed + i);
          px = nx; pv = nv;
        }
      }
      // a joke: a flourish that has no business there
      if (r.chance(clamp(fx.humor - 0.5, 0, 1) * 1.6)) {
        const cx = xa - 18, seed = r.int(1e6);
        let px = cx, pv = vh;
        for (let i = 1; i <= 30; i++) {
          const a = i * 0.42, nx = cx + i * 0.9 + 6 * Math.sin(a), nv = vh - 2 + 6 * Math.cos(a) - 6;
          P.rule(px, pv, nx, nv, 0.5, 0, seed + i);
          px = nx; pv = nv;
        }
      }
    });
  }

  // One band of the sheet, as brushwork.
  function compose(plan, kind, W) {
    const footer = kind === 'footer', H = footer ? 450 : 150, Z = footer ? 1.15 : 1;
    const P = painter(H, footer), post = plan.post, xmax = W + MARGIN;
    const B = {
      kind: kind, footer: footer, H: H, Z: Z, W: W, P: P, plan: plan, wet: plan.wet, en: plan.en, prof: plan.prof,
      depth: function(seg) { return seg.d * 150 * Z; }
    };
    const rngOf = function(seg) { return U.rng(U.hash(post.seed + ':' + kind + ':' + seg.seed + ':' + seg.k)); };

    // the underglaze (mood, the tags beyond the fifth): a veil that hangs a little deeper than the rest
    if (plan.has.tutorial) masking(B);
    plan.tintSeq(xmax).forEach(function(seg) {
      const r = rngOf(seg), ed = footer ? pool(B, plan.tint, seg, r, 1.25) : GROUNDS.veil(B, plan.tint, seg, r);
      if (plan.tint.mood) extras(B, plan.tint, seg, r, ed, 0.4);
    });
    plan.regSeq(xmax).forEach(function(seg) {
      const r = rngOf(seg), pig = seg.pig;
      const own = !footer || pig.t.f === 'flatwash' || pig.t.f === 'burst';
      const ed = own ? (GROUNDS[pig.t.f] || GROUNDS.veil)(B, pig, seg, r) : pool(B, pig, seg, r, 0.85);
      extras(B, pig, seg, r, ed, plan.sub.length ? 0.5 : 1);
    });
    plan.subSeq(xmax).forEach(function(seg) {
      const r = rngOf(seg), pig = seg.pig;
      let form = pig.t.f, as = pig;
      if (pig.forms && !footer) {       // the ai facet picks the form, stretch by stretch, by its probabilities
        let at = r() * pig.forms.reduce(function(acc, f) { return acc + f[1]; }, 0);
        for (let i = 0; i < pig.forms.length; i++) {
          at -= pig.forms[i][1];
          if (at <= 0) {
            const choice = AI_FORM[pig.forms[i][0]];
            form = choice[0];
            as = Object.assign({}, pig, { t: Object.assign({}, pig.t, choice[1]) });
            break;
          }
        }
      }
      const ed = footer ? pool(B, pig, seg, r, 1) : (FORMS[form] || FORMS.wash)(B, as, seg, r);
      extras(B, pig, seg, r, ed, 1);
    });
    // the marks: one in the first stretch of the sheet, then one every so often
    // (the shader leans the sheet; a mark is drawn leaning the other way, to stand upright)
    const marks = [], shear = plan.fx.lean * (footer ? 1 : -1);
    const lean = function(pts) {
      const out = pts.slice();
      for (let i = 0; i < out.length; i += 2) out[i] += shear * (out[i + 1] - 0);
      return out;
    };
    const upright = {
      poly: function(c, layer, pts, a) { P.poly(c, layer, lean(pts), a); },
      line: function(c, layer, pts, w, a) { P.line(c, layer, lean(pts), w, a); },
      taper: function(c, layer, pts, w0, w1, a) { P.taper(c, layer, lean(pts), w0, w1, a); },
      disc: function(c, layer, x, v, rad, a) { P.disc(c, layer, x + shear * v, v, rad, a); }
    };
    plan.proj.forEach(function(pig, i) {
      const r = post.rng('wash:mark:' + pig.name + ':' + kind);
      let x = r.range(150, 330) + i * 64;
      while (x < xmax) {
        const s = (footer ? 1.6 : 1.3) * r.range(0.95, 1.15) * (plan.lone ? 1.5 : 1);
        const v = footer ? r.range(190, 250) : r.range(0.5, 0.66) * 150;
        (MARKS[pig.t.m] || MARKS.stroke)(upright, pig.ch, x, v, s, footer ? -1 : 1, r);
        marks.push([x + shear * v, v, 17 * s]);
        x += r.range(900, 1300);
      }
    });
    gestures(B, xmax);
    // a mark is made last, on the dry sheet: no tape or break keeps it off
    marks.forEach(function(m) {
      P.ch[RESIST].detail.push(function(ctx) {
        ctx.globalAlpha = 1;
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.arc(m[0] - shear * m[1], footer ? H - m[1] : m[1], m[2], 0, 6.2832);
        ctx.fill();
      });
    });

    const blurs = [3, 3, 3, 3, 3, 8, 1, 4];
    plan.all.forEach(function(p) { blurs[p.ch] = blurOf(p, footer); });
    return { P: P, blurs: blurs };
  }

  function blurOf(pig, footer) { return Math.round(2 + 6 * pig.softness) + (footer ? 1 : 0); }
  // How steep a blurred edge is: field units per sheet unit.
  function slopeOf(radius) { return 0.4 / (MT * Math.sqrt(3 * ((2 * radius + 1) * (2 * radius + 1) - 1) / 12)); }

  // ---- rasterising the brushwork into fields ------------------------------

  let scratch = null;

  function box(src, tmp, w, h, r) {
    const inv = 1 / (2 * r + 1);
    for (let y = 0; y < h; y++) {
      const row = y * w;
      let sum = 0;
      for (let x = 0; x < r && x < w; x++) sum += src[row + x];
      for (let x = 0; x < w; x++) {
        if (x + r < w) sum += src[row + x + r];
        tmp[row + x] = sum * inv;
        if (x - r >= 0) sum -= src[row + x - r];
      }
    }
    for (let x = 0; x < w; x++) {
      let sum = 0;
      for (let y = 0; y < r && y < h; y++) sum += tmp[y * w + x];
      for (let y = 0; y < h; y++) {
        if (y + r < h) sum += tmp[(y + r) * w + x];
        src[y * w + x] = sum * inv;
        if (y - r >= 0) sum -= tmp[(y - r) * w + x];
      }
    }
  }

  // Two RGBA images: channels 0-3 and 4-7.  Each channel is its broad strokes,
  // blurred into a field, with the fine strokes kept crisp on top.
  function rasterize(sheet, mw, mh) {
    if (!scratch) scratch = document.createElement('canvas');
    scratch.width = mw;
    scratch.height = mh;
    const ctx = scratch.getContext('2d', { willReadFrequently: true });
    const n = mw * mh;
    const out = [new Uint8Array(n * 4), new Uint8Array(n * 4)];
    const a = new Float32Array(n), b = new Float32Array(n), tmp = new Float32Array(n);
    const render = function(ops, dst) {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, mw, mh);
      ctx.setTransform(1 / MT, 0, 0, 1 / MT, MARGIN / MT, MARGIN / MT);
      for (let i = 0; i < ops.length; i++) ops[i](ctx);
      const data = ctx.getImageData(0, 0, mw, mh).data;
      for (let i = 0; i < n; i++) dst[i] = data[i * 4];
    };
    for (let c = 0; c < 8; c++) {
      const layer = sheet.P.ch[c];
      if (!layer.soft.length && !layer.detail.length) continue;
      let src = null;
      if (layer.soft.length) {
        render(layer.soft, a);
        for (let pass = 0; pass < 3; pass++) box(a, tmp, mw, mh, sheet.blurs[c]);
        src = a;
      }
      if (layer.detail.length) {
        render(layer.detail, b);
        box(b, tmp, mw, mh, 1);
        if (src) { for (let i = 0; i < n; i++) if (b[i] > a[i]) a[i] = b[i]; }
        else src = b;
      }
      const dst = out[c >> 2], o = c & 3;
      for (let i = 0; i < n; i++) dst[i * 4 + o] = src[i] + 0.5;
    }
    return out;
  }

  // The paper, shared by every sheet: tooth (r), blotches (g) and two smooth
  // fields (b, a), all tileable.
  let paper = null;
  function paperNoise() {
    if (paper) return paper;
    const N = 256, r = U.rng('wash:paper');
    paper = new Uint8Array(N * N * 4);
    const octave = function(dst, period, gain) {
      const grid = new Float32Array(period * period);
      for (let i = 0; i < grid.length; i++) grid[i] = r();
      const step = period / N;
      for (let y = 0; y < N; y++) {
        const v = y * step, iy = Math.floor(v), iy1 = (iy + 1) % period;
        let fy = v - iy;
        fy = fy * fy * (3 - 2 * fy);
        for (let x = 0; x < N; x++) {
          const u = x * step, ix = Math.floor(u), ix1 = (ix + 1) % period;
          let fx = u - ix;
          fx = fx * fx * (3 - 2 * fx);
          const top = grid[iy * period + ix] + (grid[iy * period + ix1] - grid[iy * period + ix]) * fx;
          const bottom = grid[iy1 * period + ix] + (grid[iy1 * period + ix1] - grid[iy1 * period + ix]) * fx;
          dst[y * N + x] += gain * (top + (bottom - top) * fy);
        }
      }
    };
    [[[128, 1], [64, 0.7], [32, 0.3]], [[16, 1], [32, 0.6], [64, 0.35]], [[4, 1], [8, 0.5], [16, 0.25]], [[4, 1], [8, 0.5], [16, 0.25]]]
      .forEach(function(octaves, c) {
        const f = new Float32Array(N * N);
        octaves.forEach(function(o) { octave(f, o[0], o[1]); });
        let lo = 1e9, hi = -1e9;
        for (let i = 0; i < f.length; i++) { lo = Math.min(lo, f[i]); hi = Math.max(hi, f[i]); }
        for (let i = 0; i < f.length; i++) paper[i * 4 + c] = 255 * (f[i] - lo) / (hi - lo);
      });
    return paper;
  }

  // ---- the paint: one fragment shader -------------------------------------

  const VERT = 'attribute vec2 a_position; void main() { gl_Position = vec4(a_position, 0.0, 1.0); }';
  const FRAG = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
uniform vec2 u_res;
uniform float u_px;          // device pixels per sheet unit
uniform float u_css;         // css pixels per sheet unit
uniform float u_height;      // of the band, sheet units
uniform float u_footer, u_dark, u_time, u_old_on, u_lean, u_value;
uniform vec2 u_mask, u_pencil_size, u_seed;
uniform vec4 u_tech;         // warp (broad, middle), aged, pencil
uniform vec3 u_paper, u_lead;
uniform sampler2D u_m0, u_m1, u_noise, u_pencil, u_old;
uniform vec3 u_ka[6];        // light: absorbance; dark: body colour
uniform vec3 u_kb[6];        // the same for the colour it separates into
uniform vec4 u_p1[6];        // softness, dried edge, granulation, strength
uniform vec4 u_p2[6];        // -, dry brush, separation, frayed edge
uniform vec4 u_p3[6];        // width of the dried edge, tide rings, feathering, unevenness
uniform vec4 u_p4[6];        // bloom, how damp the paper must be for it to bleed, the thinnest wash, more of the second colour

float g_cut, g_wet, g_tooth, g_gran, g_bin, g_brim, g_sep, g_ec, g_ef, g_flow, g_damp, g_sum;

// One pigment: from its field to the pigment left on the paper.
vec3 lay(float f, vec3 ka, vec3 kb, vec4 p1, vec4 p2, vec4 p3, vec4 p4) {
  if (p1.w <= 0.0) return vec3(0.0);
  float fn = f + (g_ec * p2.w + g_ef * p3.z) * smoothstep(0.04, 0.3, f) - g_cut;
#ifdef DERIV
  float aa = fwidth(fn) * 0.75;
#else
  float aa = 0.03;
#endif
  // where the paper was still damp the edge bleeds, elsewhere it dries hard
  float bleed = smoothstep(p4.y - 0.1, p4.y + 0.1, g_damp);
  float soft = min(max(p1.x * bleed * (1.0 + g_wet), aa), 0.3);
  float a = smoothstep(0.5 - soft, 0.5 + soft, fn + soft * 0.4);
  float e = max(fn - 0.5, 0.0);
  float dry = 1.0 - g_wet;
  // a dry brush only catches the tooth of the paper where it runs thin
  a *= mix(1.0, smoothstep(0.0, 0.3, g_tooth - 0.56 + e * 3.2), p2.y);
  float load = smoothstep(0.0, 0.5, e);
  // pigment is carried to the edge as the wash dries, and leaves rings behind
  float rim = p1.y * (1.0 - 0.9 * bleed) * exp(-e / p3.x) * dry;
  float ring = e / (p3.x * 5.0);
  float tide = p3.y * pow(0.5 + 0.5 * cos(6.2832 * ring), 6.0) * exp(-ring * 0.7) * step(0.5, ring) * dry * 0.6;
  float body = mix(p4.z, 1.0, load) * (1.0 + p3.w * g_flow);
  // water running back pushes the pigment out to a crinkled edge
  body *= 1.0 - p4.x * 0.62 * g_bin * dry;
  float d = a * (body + rim + tide + p4.x * g_brim * 0.5 * dry);
  d *= 1.0 + p1.z * g_gran * dry * a;
  d *= p1.w * (1.0 + 0.25 * g_wet);
  float s = clamp(p2.z * (1.0 - smoothstep(0.0, 0.14, fn - 0.45) + g_sep * 0.6 - 0.22 + p4.w), 0.0, 1.0);
  g_sum += d;
  return mix(ka, kb, s) * d;
}

void main() {
  vec2 su = vec2(gl_FragCoord.x, u_res.y - gl_FragCoord.y) / u_px;
  float inward = mix(su.y, u_height - su.y, u_footer) / u_height;

  // time: the paint arrives from the top and runs down, bleeds out to its
  // edge, then dries
  float grow = 1.0 - pow(1.0 - clamp(u_time / 1.6, 0.0, 1.0), 2.0);
  float local = clamp(grow * 1.8 - (su.y / u_height) * 0.8, 0.0, 1.0);
  g_wet = 1.0 - smoothstep(0.7, 2.5, u_time);
  g_cut = (1.0 - local) * 1.05 + smoothstep(0.76, 0.98, inward) * 0.8;

  vec4 nl = texture2D(u_noise, su / 610.0 + u_seed);
  vec4 nm = texture2D(u_noise, su / 163.0 + u_seed.yx + 0.37);
  vec4 nh = texture2D(u_noise, vec2(su.x * 0.866 + su.y * 0.5, su.y * 0.866 - su.x * 0.5) / 47.0 - u_seed * 1.3);
  g_tooth = texture2D(u_noise, su * u_css * (1.5 / 256.0)).r;

  // the paper is never flat and the water never still: the strokes wander
  vec2 warp = (nl.ba - 0.5) * u_tech.x + (nm.ba - 0.5) * u_tech.y + (nh.ba - 0.5) * 2.5;
  vec2 muv = (su + ${MARGIN}.0) / u_mask;
  // and the board was tilted: what hangs or runs leans one way
  warp.x -= u_lean * mix(su.y, su.y - u_height, u_footer);
  vec4 m0 = texture2D(u_m0, muv + warp / u_mask);
  vec4 m1 = texture2D(u_m1, muv + warp / u_mask);
  // tape does not wander
  g_cut += smoothstep(0.25, 0.6, texture2D(u_m1, muv).b) * 3.0;

  g_ec = (nm.b - 0.5) * 1.3 + (nh.b - 0.5) * 0.7 + (nm.g - 0.5) * 0.25;
  g_ef = (nh.a - 0.5) * 1.2 + (nh.g - 0.5) * 1.0 + (nm.g - 0.5) * 0.6;
  g_flow = (nl.g - 0.5) * 1.5 + (nm.b - 0.5) * 0.9;
  g_sep = (nl.a - 0.5) * 2.0 + (nh.b - 0.5) * 0.8;
  g_gran = (smoothstep(0.25, 0.8, g_tooth * 0.7 + nh.g * 0.3) - 0.45) * 1.0;
  g_damp = nl.b * 0.7 + nm.a * 0.3;

  // backruns: where water was dropped, with a cauliflower edge
  float billow = abs(nh.a - 0.5) * 2.0;
  float wv = m1.a + (nm.a - 0.5) * 0.8 + (billow - 0.25) * 0.34 + (nh.g - 0.5) * 0.14 - g_wet * 0.7;
  g_bin = smoothstep(0.46, 0.54, wv);
  g_brim = exp(-abs(wv - 0.5) / mix(0.04, 0.16, step(0.5, wv))) * (0.3 + 1.4 * nm.g);

  g_sum = 0.0;
  vec3 acc = vec3(0.0);
  acc += lay(m0.r, u_ka[0], u_kb[0], u_p1[0], u_p2[0], u_p3[0], u_p4[0]);
  acc += lay(m0.g, u_ka[1], u_kb[1], u_p1[1], u_p2[1], u_p3[1], u_p4[1]);
  acc += lay(m0.b, u_ka[2], u_kb[2], u_p1[2], u_p2[2], u_p3[2], u_p4[2]);
  acc += lay(m0.a, u_ka[3], u_kb[3], u_p1[3], u_p2[3], u_p3[3], u_p4[3]);
  acc += lay(m1.r, u_ka[4], u_kb[4], u_p1[4], u_p2[4], u_p3[4], u_p4[4]);
  // the underglaze gives way where pigment was charged in on top of it
  float charged = g_sum;
  vec3 under = lay(m1.g, u_ka[5], u_kb[5], u_p1[5], u_p2[5], u_p3[5], u_p4[5]);
  float keep = exp(-charged * 1.6);
  g_sum = charged + (g_sum - charged) * keep;
  acc += under * keep;

  vec3 col;
  if (u_dark < 0.5) {
    // transparent paint on white paper: every pigment takes its light away
    acc = mix(acc, vec3(dot(acc, vec3(0.3333))) * vec3(0.9, 1.0, 1.14), u_tech.z * 0.7);
    col = u_paper * exp(-acc);
  } else {
    // gouache and chalk on dark paper: body colour, covering as it thickens
    vec3 c = acc / max(g_sum, 0.0001);
    c = mix(c, vec3(dot(c, vec3(0.3333))), u_tech.z * 0.6);
    float cover = 1.0 - exp(-g_sum * 2.1);
    cover *= mix(1.0, smoothstep(0.1, 0.6, g_tooth + g_sum * 0.6), 0.55);
    // thick body colour dries lighter and chalkier than a thin veil of it
    c = mix(c * 0.86, c + 0.08, smoothstep(0.2, 1.3, g_sum)) * u_value;
    col = mix(u_paper, c, cover * 0.94);
  }

  // graphite catches on the tooth
  float pc = texture2D(u_pencil, su / u_pencil_size).r;
  float pa = pc * smoothstep(0.15, 0.7, g_tooth * 0.8 + pc * 0.6) * smoothstep(0.0, 0.5, u_time) * u_tech.w;
  col = mix(col, u_lead, pa);

  // the previous picture, washed out as this one comes
  if (u_old_on > 0.5) {
    vec3 old = texture2D(u_old, gl_FragCoord.xy / u_res).rgb;
    float w = smoothstep(0.0, 1.0, u_time * 0.8 - 0.1 - (nm.b - 0.5) * 0.9 - (nl.a - 0.5) * 0.6);
    if (u_dark < 0.5) col *= mix(old / max(u_paper, vec3(0.004)), vec3(1.0), w);
    else col = mix(old, col, w);
  }
  gl_FragColor = vec4(col, 1.0);
}
`;

  // ---- one band: a canvas, its context, its picture ------------------------

  function Band(env, surface, getPlan) {
    const canvas = surface.canvas, footer = surface.kind === 'footer';
    let gl = null, prog = null, loc = null, tex = null;
    const band = {
      surface: surface, built: '', started: null, done: false, hasOld: false, drawn: false, lost: false,
      chunk: 0, pencilSize: [1, 1]
    };

    function init() {
      gl = canvas.getContext('webgl', { antialias: false, alpha: true, premultipliedAlpha: true });
      if (!gl) return false;
      const deriv = gl.getExtension('OES_standard_derivatives');
      prog = U.gl.program(gl, VERT, (deriv ? '#extension GL_OES_standard_derivatives : enable\n#define DERIV\n' : '') + FRAG);
      gl.useProgram(prog);
      U.gl.quad(gl, prog, 'a_position');
      loc = {};
      const count = gl.getProgramParameter(prog, gl.ACTIVE_UNIFORMS);
      for (let i = 0; i < count; i++) {
        const name = gl.getActiveUniform(prog, i).name.replace(/\[0\]$/, '');
        loc[name] = gl.getUniformLocation(prog, name);
      }
      tex = {};
      ['m0', 'm1', 'noise', 'pencil', 'old'].forEach(function(name, unit) {
        tex[name] = gl.createTexture();
        gl.activeTexture(gl.TEXTURE0 + unit);
        gl.bindTexture(gl.TEXTURE_2D, tex[name]);
        const wrap = name === 'noise' ? gl.REPEAT : gl.CLAMP_TO_EDGE;
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, wrap);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, wrap);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(4));
        gl.uniform1i(loc['u_' + name], unit);
      });
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
      gl.activeTexture(gl.TEXTURE2);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 256, 256, 0, gl.RGBA, gl.UNSIGNED_BYTE, paperNoise());
      band.built = '';
      return true;
    }

    const onLost = function(event) { event.preventDefault(); band.lost = true; };
    const onRestored = function() {
      band.lost = false;
      band.hasOld = false;
      try { init(); } catch (error) { console.error(error); gl = null; }
      band.done = false;
      env.invalidate();
    };
    canvas.addEventListener('webglcontextlost', onLost);
    canvas.addEventListener('webglcontextrestored', onRestored);

    // sheet units: the band is always 150 (450) of them high
    function scale() { return surface.height / (footer ? 450 : 150) || 1; }

    function build() {
      const plan = getPlan(), s = scale();
      const widest = Math.min(4096, gl.getParameter(gl.MAX_TEXTURE_SIZE)) * MT - 2 * MARGIN;
      const W = Math.min(Math.ceil((surface.width / s + 1) / CHUNK) * CHUNK, Math.floor(widest / CHUNK) * CHUNK);
      const pxPerSu = canvas.height / (footer ? 450 : 150);
      const key = [plan.post.key, W, pxPerSu].join('|');
      if (key === band.built) return;
      band.built = key;
      band.chunk = W;
      const H = footer ? 450 : 150;
      const sheet = compose(plan, surface.kind, W);
      const mw = Math.ceil((W + 2 * MARGIN) / MT), mh = Math.ceil((H + 2 * MARGIN) / MT);
      const fields = rasterize(sheet, mw, mh);
      band.mask = [mw * MT, mh * MT];
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
      gl.activeTexture(gl.TEXTURE0);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, mw, mh, 0, gl.RGBA, gl.UNSIGNED_BYTE, fields[0]);
      gl.activeTexture(gl.TEXTURE1);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, mw, mh, 0, gl.RGBA, gl.UNSIGNED_BYTE, fields[1]);

      // the pencil, at the resolution of the screen
      const limit = Math.min(4096, gl.getParameter(gl.MAX_TEXTURE_SIZE));
      const ps = Math.min(pxPerSu, limit / W, 3);
      const pencil = document.createElement('canvas');
      pencil.width = Math.max(1, Math.round(W * ps));
      pencil.height = Math.max(1, Math.round(H * ps));
      const ctx = pencil.getContext('2d');
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, pencil.width, pencil.height);
      ctx.setTransform(ps, 0, 0, ps, 0, 0);
      ctx.strokeStyle = '#fff';
      const lw = Math.max(0.95 / s, 1.3 / ps);
      sheet.P.pencil.forEach(function(op) { op(ctx, lw); });
      band.pencilSize = [W, H];
      gl.activeTexture(gl.TEXTURE3);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, pencil);
    }

    function draw(time) {
      const plan = getPlan(), dark = env.dark, colors = env.palette(), s = scale();
      gl.viewport(0, 0, canvas.width, canvas.height);
      const ka = new Float32Array(18), kb = new Float32Array(18);
      const p1 = new Float32Array(24), p2 = new Float32Array(24), p3 = new Float32Array(24), p4 = new Float32Array(24);
      // a firm edge: the author is sure, the ending resolved; worry pools at the edges too
      // valence: bleak is a heavy load of pigment, joyful mostly water and paper
      // (on dark paper: dim and thin, or bright)
      const load = dark ? lerp(0.8, 1.12, plan.fx.valence) : lerp(1.22, 0.72, plan.fx.valence);
      const fx = plan.fx, firm = lerp(0.7, 1.3, fx.certainty) * (1 + 0.3 * fx.resolved + 0.45 * fx.mood('worried'));
      plan.all.forEach(function(p) {
        const i = p.ch, t = p.t, sf = p.softness, slope = slopeOf(blurOf(p, footer));
        ka.set(dark ? gouache(p.rgb) : absorbance(p.rgb), i * 3);
        kb.set(dark ? gouache(p.rgbB) : absorbance(p.rgbB), i * 3);
        p1.set([
          clamp(lerp(2, 10, sf) * slope, 0.02, 0.3),
          lerp(0.3, 1, t.e) * (dark ? 0.55 : 1) * (footer ? 1.15 : 1) * firm,
          t.g * (dark ? 0.5 : 1),
          p.strength * (1 - 0.25 * plan.aged) * (p.role === 'project' ? 1 : load)
        ], i * 4);
        p2.set([0, clamp(t.d + (dark ? 0.25 : 0), 0, 1), t.sp, Math.min(0.2, lerp(1.4, 5, sf) * slope)], i * 4);
        p3.set([lerp(1.3, 2.4, sf) * slope, Math.max(t.tide, footer ? 0.55 : 0) * (dark ? 0.6 : 1), t.fe * slope, lerp(0.3, 0.7, sf)], i * 4);
        p4.set([t.b * lerp(0.5, 1, plan.wet), lerp(0.78, 0.26, sf), t.thin || 0.5, t.sb || 0], i * 4);
      });
      gl.uniform3fv(loc.u_ka, ka);
      gl.uniform3fv(loc.u_kb, kb);
      gl.uniform4fv(loc.u_p1, p1);
      gl.uniform4fv(loc.u_p2, p2);
      gl.uniform4fv(loc.u_p3, p3);
      gl.uniform4fv(loc.u_p4, p4);
      gl.uniform2f(loc.u_res, canvas.width, canvas.height);
      gl.uniform1f(loc.u_px, canvas.height / (footer ? 450 : 150));
      gl.uniform1f(loc.u_css, s);
      gl.uniform1f(loc.u_height, footer ? 450 : 150);
      gl.uniform1f(loc.u_footer, footer ? 1 : 0);
      gl.uniform1f(loc.u_dark, dark ? 1 : 0);
      gl.uniform1f(loc.u_time, time);
      gl.uniform1f(loc.u_old_on, band.hasOld ? 1 : 0);
      gl.uniform1f(loc.u_lean, fx.lean);
      gl.uniform1f(loc.u_value, lerp(0.76, 1.06, fx.valence));
      gl.uniform2f(loc.u_mask, band.mask[0], band.mask[1]);
      gl.uniform2f(loc.u_pencil_size, band.pencilSize[0], band.pencilSize[1]);
      gl.uniform2f(loc.u_seed, plan.seed[0], plan.seed[1]);
      gl.uniform4f(loc.u_tech, lerp(5, 30, Math.pow(plan.wet, 1.3)), lerp(2, 11, plan.wet), plan.aged, dark ? 0.7 : 0.85);
      gl.uniform3fv(loc.u_paper, colors.paper);
      gl.uniform3fv(loc.u_lead, dark ? U.mix(colors.ink, colors.paper, 0.1) : [0.25, 0.26, 0.29]);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      band.drawn = true;
    }

    band.ok = function() { return !!gl && !band.lost; };
    // Keeps what is on the sheet now, so that the next post can wash it out.
    band.keep = function(now) {
      if (!band.ok() || !band.drawn || !band.built) { band.hasOld = false; return; }
      draw(band.done || band.started === null ? 100 : now - band.started);
      gl.activeTexture(gl.TEXTURE4);
      gl.copyTexImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 0, 0, canvas.width, canvas.height, 0);
      band.hasOld = true;
    };
    // Draws the band at `now`; returns whether it is still wet.
    band.paint = function(now, still) {
      if (!band.ok()) return false;
      build();
      if (band.started === null) band.started = now;
      const time = still ? 100 : now - band.started;
      if (time >= DUR) band.hasOld = false;
      draw(time >= DUR ? 100 : time);
      band.done = time >= DUR;
      return !band.done;
    };
    band.destroy = function() {
      canvas.removeEventListener('webglcontextlost', onLost);
      canvas.removeEventListener('webglcontextrestored', onRestored);
    };

    try { init(); } catch (error) { console.error('wash: no WebGL picture', error); gl = null; }
    return band;
  }

  LucumrArt.register('wash', {
    title: 'Wet wash',
    create: function(env) {
      let plan = null;
      let clock = 0;
      const bands = env.surfaces.map(function(surface) {
        return Band(env, surface, function() { return plan; });
      });
      return {
        setPost: function(post, info) {
          bands.forEach(function(b) {
            if (plan && !info.initial && !env.still && b.surface.visible) b.keep(performance.now() / 1000);
            else b.hasOld = false;
          });
          plan = makePlan(post);
          bands.forEach(function(b) { b.started = null; b.done = false; });
        },
        resize: function() {
          // the canvas was cleared: draw at once (no blank frame), without the old picture
          clock = performance.now() / 1000;
          bands.forEach(function(b) {
            b.hasOld = false;
            b.done = false;
            if (plan && b.drawn && b.started !== null && b.surface.visible && b.surface.width > 0) {
              const dry = clock - b.started >= DUR;
              b.paint(clock, env.still || dry);
            }
          });
        },
        setTheme: function() {
          bands.forEach(function(b) { b.done = false; b.hasOld = false; });
        },
        frame: function() {
          // not the frame's timestamp: under headless Chrome's virtual time
          // (scripts/art-shot) that one hardly advances
          const now = clock = performance.now() / 1000;
          if (!plan) return false;
          let more = false;
          bands.forEach(function(b) {
            if (b.done || !b.surface.visible || !b.surface.width) return;
            const dry = b.started !== null && now - b.started >= DUR;
            more = b.paint(now, env.still || dry) || more;
          });
          return more;
        },
        destroy: function() {
          bands.forEach(function(b) { b.destroy(); });
        }
      };
    }
  });
})();
