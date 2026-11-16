// Proposal 5: The post draws itself.
//
// The artwork is a trace of the post's own structure (post.shape), read from
// left to right like a line of handwriting: prose becomes cursive loops whose
// length follows the word count, code becomes hatched blocks, headings are
// ruled bars, lists short stacked dashes, quotes are barred and slanted,
// images a small washed frame, links underlines.  The header is the whole
// post on one line, the footer the same trace large, as a manuscript page.
//
//   register tags  the instrument and the hand (2H pencil ... loaded brush)
//   subject tags   the pigments of the washes under the trace, by tag weight
//   project tags   a small mark at the end of the line
//
// The facets (what a classifier read in the text) are the voice of that hand,
// each one thing (see voiceFor):
//
//   scale, personal  how large the hand is: held close ... seen from afar
//   time             the lean: backhand for the past, forward for the future;
//                    and a lead that has browned for the past
//   certainty        one firm line ... a searched, overdrawn one
//   tension          faults in the rows and dry veins through the washes
//   valence          the value of the washes: heavy and grey ... light and clear
//   mood             the temperature of the pigments, the light along the edge
//   ai               a second pigment
//   actor            a machine writes evenly, a group in several hands
//   stance           the writer's marks: construction lines (builder), a red
//                    margin and ruled underlines (teacher), cuts, strikes and
//                    rings (critic), climbing rows, pressed underlines and
//                    arrows (advocate), wide spacing and notes between the
//                    lines (observer), rubbed-out writing (witness)
//   technical        a measured page: guide lines with a rule's divisions
//   humor            the pen swings back under a word, a curl after a paragraph
//   ending           how the line stops: full stop and closing stroke, dots
//                    trailing off, an arrow, a ticked box
//   imagery          a small pencil vignette where the line begins (if sure)
//   energy, wander   are in post.energy and post.loose already
//   post.season      a seasonal light here and there along the edge
//
// Everything is laid out in "virtual" pixels: the band at its desktop height,
// a row of the trace ROW wide and centred like the text column.  A narrower
// window crops the rows on the right, a wider one shows more paper and wash:
// nothing is laid out again when the width changes.
//
// Drawing: the strokes go to an off-screen 2D canvas, the wash is a small map
// of pigment and amount; a fragment shader turns the map into watercolour
// (or, on the dark paper, chalk) and lays the strokes over it with the grain
// of the paper.
(function() {
  'use strict';
  const U = LucumrArt.util;
  const clamp = U.clamp, lerp = U.lerp, smoothstep = U.smoothstep, mix = U.mix;
  const TAU = Math.PI * 2;

  const ROW = 1040;        // length of one row of the trace
  const MARGIN = 24;       // left margin once the window is narrower than a row
  const REACH = 1500;      // how far rules and washes run on beyond a row
  const HEIGHT = { header: 150, footer: 450 };
  const DURATION = 2.4;    // seconds to write the picture in
  const FADE = 0.7;        // seconds for the old picture to lift off
  const WASH_SCALE = 4;    // the wash map is this much smaller than the band
  const CELL = 64;         // the wash under the trace is gathered in cells this wide

  // ---- the hand ----------------------------------------------------------

  // What each register tag puts in the hand.  width: css px, dark: pressure,
  // grain: how much paper shows through, ruled: guide lines, tint: how much of
  // the tag's pigment is in the lead (0 graphite, 1 pure colour).
  const REGISTERS = {
    tutorial:     { width: 0.7,  dark: 0.86, grain: 0.3,  ruled: 1.0, tint: 0.0 },
    business:     { width: 0.85, dark: 0.85, grain: 0.5,  ruled: 0.55, tint: 0.1, ledger: 1 },
    thoughts:     { width: 1.0,  dark: 0.8, grain: 0.8,  ruled: 0,   tint: 0.0 },
    life:         { width: 3.3,  dark: 0.62, grain: 0.12, ruled: 0,   tint: 0.92, brush: 1 },
    culture:      { width: 2.4,  dark: 0.56, grain: 0.18, ruled: 0,   tint: 0.9, brush: 1 },
    politics:     { width: 1.65, dark: 0.96, grain: 0.55, ruled: 0,   tint: 0.14, stress: 1 },
    community:    { width: 1.1,  dark: 0.72, grain: 0.7,  ruled: 0,   tint: 0.5 },
    history:      { width: 1.7,  dark: 0.74, grain: 0.22, ruled: 0.3, tint: 0.85, nib: 1 },
    announcement: { width: 1.4,  dark: 0.86, grain: 0.5,  ruled: 0,   tint: 0.3 },
    conferences:  { width: 1.25, dark: 0.8,  grain: 0.6,  ruled: 0,   tint: 0.3 },
    covid19:      { width: 0.8,  dark: 0.5,  grain: 0.85, ruled: 0,   tint: 0.35, apart: 1.6 }
  };
  const GRAPHITE = [0.19, 0.2, 0.235];
  const CHALK = [0.86, 0.9, 0.96];

  // ---- the voice --------------------------------------------------------

  // What a classifier read in the post's text (ART.md, "Facets"), turned into
  // what the hand does with it.  Everything is blended by probability; a post
  // without facets gets the neutral value of each.
  const SCALE_ZOOM = { self: 1.45, craft: 1.08, community: 0.94, industry: 0.83, society: 0.76 };
  const MOOD_LIGHT = {          // the weather along the outer edge
    hopeful: U.hex('#f0c24e'), worried: U.hex('#4f5b73'), angry: U.hex('#b0262d'),
    reflective: U.hex('#7397bd'), playful: U.hex('#ee6c9f'), conflicted: U.hex('#7c5a88')
  };
  const AI_PIGMENT = {          // a second pigment that tells the ai posts apart
    agents: U.hex('#1d8c84'), models: U.hex('#2c47a6'), local: U.hex('#b8763a'), society: U.hex('#b4475f'),
    community: U.hex('#dd7a33'), writing: U.hex('#5b4636'), risk: U.hex('#b3312a'), business: U.hex('#8a8f2a')
  };

  function voiceFor(post) {
    const known = !!(post.facets && post.facets.known && post.score && post.share);
    const score = function(name, fallback) { return known ? post.score(name, fallback) : fallback; };
    const share = function(name, label) { return known ? post.share(name, label) : 0; };
    const v = { known: known };

    // scale and personal: how close the page is held, so how large the hand is
    let zoom = 0, sum = 0;
    Object.keys(SCALE_ZOOM).forEach(function(label) {
      zoom += share('scale', label) * SCALE_ZOOM[label];
      sum += share('scale', label);
    });
    v.zoom = (sum > 1 ? zoom / sum : zoom + (1 - sum)) * lerp(0.9, 1.14, score('personal', 0.5));
    // time: which way the writing leans, and whether the lead has browned
    v.lean = share('time', 'future') - share('time', 'past');
    v.past = share('time', 'past');
    // certainty: one firm line, or a searched and overdrawn one
    v.certainty = score('certainty', 0.7);
    v.search = known ? 1 - v.certainty : 0;
    // tension: faults in the rows, cracks in the wash
    v.tension = score('tension', 0);
    const heat = share('mood', 'angry') + 0.5 * share('mood', 'worried') + 0.6 * share('mood', 'conflicted');
    v.agitation = clamp(v.tension * (0.3 + 0.7 * heat) + 0.4 * share('mood', 'angry'), 0, 1);
    // actor: a machine writes evenly, a group writes in several hands
    v.mech = clamp(share('actor', 'machine') + 0.6 * share('actor', 'company') + 0.6 * share('actor', 'state'), 0, 1);
    v.many = clamp(share('actor', 'group') + 0.7 * share('actor', 'company') + 0.8 * share('actor', 'state'), 0, 1);
    v.technical = score('technical', 0);
    v.humor = clamp(score('humor', 0) * 0.85 + 0.5 * share('mood', 'playful'), 0, 1);
    // valence: the value of the washes, heavy and grey or light and clear
    v.valence = score('valence', 0.55);
    // mood: the temperature of the pigments and the light at the outer edge
    v.temperature = clamp(share('mood', 'hopeful') + share('mood', 'playful') + 0.7 * share('mood', 'angry') -
      share('mood', 'worried') - 0.55 * share('mood', 'reflective') - 0.3 * share('mood', 'conflicted'), -1, 1);
    let light = [0, 0, 0], strength = 0;
    Object.keys(MOOD_LIGHT).forEach(function(label) {
      const p = share('mood', label);
      light = [light[0] + MOOD_LIGHT[label][0] * p, light[1] + MOOD_LIGHT[label][1] * p, light[2] + MOOD_LIGHT[label][2] * p];
      strength += p;
    });
    v.light = strength > 0.01 ? [light[0] / strength, light[1] / strength, light[2] / strength] : null;
    v.lightShare = Math.min(1, strength);
    // stance: the marks the writer leaves on his own page
    v.stance = {};
    ['builder', 'teacher', 'critic', 'advocate', 'observer', 'witness'].forEach(function(label) {
      v.stance[label] = share('stance', label);
    });
    // the season of its date: winter blue, spring green, summer gold, autumn russet
    if (known && typeof post.season === 'number') {
      const SEASONS = [[0.58, 0.7, 0.86], [0.52, 0.74, 0.44], [0.96, 0.8, 0.36], [0.8, 0.44, 0.22]];
      const at = (((post.season - 0.04) % 1) + 1) % 1 * 4, i = Math.floor(at) % 4;
      v.season = mix(SEASONS[i], SEASONS[(i + 1) % 4], smoothstep(0, 1, at - Math.floor(at)));
    }
    v.ending = known ? post.top('ending', 0.4) : null;
    const imagery = known ? post.top('imagery', 0.6) : null;
    v.imagery = imagery === 'none' ? null : imagery;
    v.ai = [];
    Object.keys(AI_PIGMENT).forEach(function(label) {
      const p = share('ai', label);
      if (p >= 0.12) v.ai.push({ rgb: AI_PIGMENT[label], share: p });
    });
    return v;
  }

  function handFor(post) {
    const loose = post.loose, energy = post.energy;
    const hand = {
      width: 0.75 + 0.4 * loose, dark: 0.72 + 0.26 * energy, grain: 0.45 + 0.4 * loose,
      ruled: smoothstep(0.34, 0.12, loose), tint: 0,
      brush: 0, nib: 0, ledger: 0, stress: 0, apart: 1, pigment: null
    };
    const top = post.register.filter(function(t) { return REGISTERS[t.name]; })[0];
    if (top) {
      Object.assign(hand, REGISTERS[top.name]);
      hand.pigment = top.rgb;
      // the other tags of the post lean on the instrument a little
      hand.dark = lerp(hand.dark, 0.68 + 0.3 * energy, 0.3);
    }
    const voice = hand.voice = voiceFor(post);
    hand.fat = hand.brush || hand.nib;
    hand.slant = voice.known ? 0.2 + 0.4 * voice.lean + 0.14 * (energy - 0.4) : 0.1 + 0.42 * energy;
    hand.round = smoothstep(0.1, 0.6, loose) * (1 - 0.55 * voice.mech);
    hand.wobble = (0.03 + 0.5 * loose * loose) * (1 - 0.85 * voice.mech) * lerp(1.5, 0.65, voice.certainty);
    hand.jitter = (0.05 + 0.2 * loose) * (1 - 0.88 * voice.mech);
    hand.dark *= lerp(0.84, 1.08, voice.certainty);
    hand.ruled = Math.max(hand.ruled, 0.9 * smoothstep(0.6, 0.95, voice.technical));
    hand.spread = 0.88 + 0.3 * loose;
    hand.contrast = 0.5 + 0.45 * energy;
    // old posts have faded a little
    hand.dark *= 1 - 0.18 * smoothstep(4, 16, post.age);
    return hand;
  }

  // ---- pigments ----------------------------------------------------------

  const HOUSE = [
    { rgb: U.hex('#115ca1'), share: 0.5 },
    { rgb: U.hex('#4d8fd0'), share: 0.3 },
    { rgb: U.hex('#1b3156'), share: 0.2 }
  ];

  // The pigments of the washes with their shares: the subject tags by weight;
  // registers and projects only tint, unless there is nothing else.
  // mood: warm light or cool light on a pigment
  function temper(rgb, temperature) {
    const t = Math.abs(temperature) * 0.55;
    const to = temperature > 0 ? [1.08, 0.97, 0.74] : [0.8, 0.95, 1.12];
    return [clamp(rgb[0] * lerp(1, to[0], t), 0, 1), clamp(rgb[1] * lerp(1, to[1], t), 0, 1), clamp(rgb[2] * lerp(1, to[2], t), 0, 1)];
  }

  function pigmentsFor(post, voice) {
    if (!post.tags.length) return HOUSE;
    const subjects = post.subject.length > 0;
    const others = subjects || post.register.length > 0;
    const list = post.tags.filter(function(tag) {
      return tag.role !== 'project' || !others;        // a project only signs
    }).map(function(tag) {
      let share = tag.weight;
      if (tag.role === 'register' && subjects) share *= 0.3;
      if (post.rest.indexOf(tag) >= 0) share *= 0.35;
      return { rgb: tag.rgb, share: share, loose: tag.loose };
    });
    let sum = list.reduce(function(acc, p) { return acc + p.share; }, 0);
    list.forEach(function(p) { p.share /= sum; });
    // what the post says about AI brings a pigment of its own
    voice.ai.forEach(function(extra) { list.push({ rgb: extra.rgb, share: extra.share * 0.62, loose: 0.5 }); });
    sum = list.reduce(function(acc, p) { return acc + p.share; }, 0);
    list.forEach(function(p) {
      p.share /= sum;
      p.rgb = temper(p.rgb, voice.temperature);
    });
    return list.sort(function(a, b) { return b.share - a.share; });
  }

  // `count` stretches of the trace, each with one pigment, as many of each as
  // its share says (every pigment at least once while there is room).
  function zonesFor(pigs, count, rand) {
    const zones = [];
    const want = pigs.map(function(p) { return p.share * count; });
    for (let i = 0; i < count; i++) {
      let best = 0;
      for (let j = 1; j < want.length; j++) if (want[j] > want[best]) best = j;
      zones.push(pigs[best]);
      want[best] -= 1;
      if (zones.length <= pigs.length) want[best] -= 0.25;
    }
    for (let i = zones.length - 1; i > 0; i--) {
      const j = rand.int(i + 1);
      const tmp = zones[i]; zones[i] = zones[j]; zones[j] = tmp;
    }
    return zones;
  }

  // ---- letters -----------------------------------------------------------

  // A letter is one or more loops of a cycloid: [height, loop, advance, shape,
  // extra] in x-heights.  loop > 0 makes the pen travel backwards at the top
  // (e, l) or, for a negative height, at the bottom (g, y); shape < 1 gives
  // arcades (n, m), > 1 garlands (u, w); extra 1 is a dot, 2 a cross stroke.
  // Nothing here is legible, but a word keeps its silhouette.
  const GLYPHS = {
    a: [[1, 0.46, 0.94, 1]], c: [[0.95, 0.26, 0.74, 1]], e: [[1, 0.34, 0.78, 1]],
    o: [[1, 0.48, 0.92, 1]], s: [[0.85, 0.18, 0.68, 1.2]], l: [[2.25, 0.3, 0.8, 1]],
    t: [[1.85, 0, 0.62, 1.6, 2]], i: [[1, 0, 0.56, 1.7, 1]], n: [[1, 0, 0.92, 0.7]],
    r: [[0.82, 0, 0.74, 0.6]], m: [[1, 0, 0.78, 0.7], [1, 0, 0.78, 0.7]],
    u: [[1, 0, 0.92, 1.6]], v: [[1, 0, 0.78, 2.2]], w: [[1, 0, 0.74, 1.7], [1, 0, 0.74, 1.7]],
    z: [[0.85, 0, 0.74, 1.2]], x: [[1, 0.24, 0.8, 1, 3]],
    h: [[2.25, 0.3, 0.8, 1], [1, 0, 0.9, 0.7]], k: [[2.25, 0.3, 0.8, 1], [0.9, 0.2, 0.76, 1]],
    b: [[2.25, 0.3, 0.8, 1], [1, 0.42, 0.9, 1]], d: [[1, 0.46, 0.9, 1], [2.15, 0.04, 0.6, 1.5]],
    f: [[2.25, 0.3, 0.72, 1], [-1.4, 0.24, 0.7, 1]], g: [[1, 0.44, 0.9, 1], [-1.5, 0.3, 0.76, 1]],
    y: [[1, 0, 0.9, 1.6], [-1.5, 0.3, 0.76, 1]], j: [[-1.5, 0.3, 0.7, 1, 1]],
    p: [[-1.35, 0, 0.5, 1.6], [1, 0.12, 0.9, 0.7]], q: [[1, 0.44, 0.9, 1], [-1.4, 0.26, 0.7, 1]],
    '~': [[0.55, 0, 5.2, 1]], '-': [[0.3, 0, 3.4, 1]]
  };
  // letters as often as English has them
  const FREQUENT = 'eeeeeeeeeeeeettttttttttaaaaaaaaaoooooooiiiiiiinnnnnnnsssssshhhhhhrrrrrr' +
    'ddddlllllcccuuummmwwfffggyypbvkjxqz';
  const LOOP = 0.62;

  const EVEN = 'nmunmuinwnmu';      // what a machine writes: the same stroke again and again

  function randomLetters(count, rand, mech) {
    let out = '';
    for (let i = 0; i < count; i++) {
      out += rand() < (mech || 0) * 0.72 ? EVEN[rand.int(EVEN.length)] : FREQUENT[rand.int(FREQUENT.length)];
    }
    return out;
  }

  // The pen's path for a word, in x-heights, y up, starting at x = 0 on the
  // baseline.  Returns { path: [x, y, ...], extras: [[x, y, ...]], width }.
  function writeWord(chars, hand, rand, options) {
    options = options || {};
    const path = [0, 0], extras = [];
    const slant = hand.slant + (options.slant || 0);
    const round = 0.3 + 0.7 * hand.round;
    const calm = options.calm ? 0.5 : 1;
    let x = 0, first = true;
    for (let ci = 0; ci < chars.length; ci++) {
      const loops = GLYPHS[chars[ci]] || GLYPHS.n;
      for (let li = 0; li < loops.length; li++) {
        const spec = loops[li];
        const wave = spec[2] > 2;
        let h = spec[0] * (1 + calm * hand.jitter * (rand() * 2 - 1) * (Math.abs(spec[0]) > 1.2 ? 0.7 : 1.3));
        let adv = spec[2] * hand.spread * (1 + calm * hand.jitter * 1.2 * (rand() * 2 - 1));
        const loop = spec[1] * (0.45 + 0.55 * hand.round) * (1 + calm * hand.jitter * (rand() * 2 - 1));
        if (first && options.capital && h > 0) { h = Math.max(h * 1.15, 1.9 + 0.3 * rand()); adv *= 1.15; }
        const steps = wave ? 16 : Math.abs(h) > 1.5 ? 12 : 9;
        for (let i = 1; i <= steps; i++) {
          const t = i / steps * TAU;
          const tri = t < Math.PI ? t / Math.PI : 2 - t / Math.PI;
          let f = lerp(tri, (1 - Math.cos(t)) / 2, wave ? 1 : round);
          f = Math.pow(f, spec[3]);
          const px = x + adv * (t / TAU) + loop * LOOP * Math.sin(t);
          const py = h * f;
          path.push(px + slant * py, py);
        }
        const mid = x + adv * 0.5;
        if (spec[4] === 1) {
          const dy = 1.5 + 0.25 * rand(), dx = mid + slant * dy + 0.15 * (rand() - 0.3);
          extras.push([dx, dy, dx + 0.1, dy - 0.07]);
        } else if (spec[4] === 2) {
          const dy = 1.18 + 0.12 * rand(), reach = 0.42 + 0.2 * rand();
          extras.push([mid + slant * dy - reach, dy - 0.03, mid + slant * dy + reach * 1.2, dy + 0.06]);
        } else if (spec[4] === 3) {
          extras.push([mid - 0.3, 0.92, mid + slant + 0.2, 0.1]);
        }
        x += adv;
        first = false;
      }
    }
    return { path: path, extras: extras, width: x };
  }

  // ---- composing a scene -------------------------------------------------

  // A scene is what a band shows, in virtual pixels relative to the start of
  // the rows: strokes ({ p: [x, y, pressure, ...], w, a, c, x0, x1, row }) in
  // the order they are written, and wash deposits ({ x, y, rx, ry, a, c }).
  function Composer(post, kind, hand, geo) {
    this.post = post;
    this.kind = kind;
    this.hand = hand;
    this.geo = geo;
    this.xh = geo.xh;
    this.strokes = [];
    this.deposits = [];
    this.row = 0;
    this.x = 0;
    this.grid = {};          // how much was written where: row:cell -> { prose, code, r, g, b }
    this.noiseSeed = post.seed % 9973 + (kind === 'footer' ? 500 : 0);
  }

  Composer.prototype = {
    // the baseline of a row wanders with a loose hand
    drift: function(row, x) {
      const hand = this.hand;
      return hand.wobble * this.xh * (1.5 * U.noise1(x * 0.0032 + row * 7.31, this.noiseSeed) +
        0.5 * U.noise1(x * 0.011 + row * 3.7, this.noiseSeed + 5)) -
        (this.climb || 0) * (clamp(x, -200, ROW + 200) - ROW / 2);
    },

    // tension: the row breaks and slips, like strata along a fault
    fault: function(row, x) {
      const amount = smoothstep(0.3, 1, this.hand.voice.tension);
      if (!amount) return 0;
      const span = 150 + 170 * lattice(row, 3, this.noiseSeed);
      const piece = Math.floor((x + 400 * lattice(row, 5, this.noiseSeed)) / span);
      return (lattice(piece, row, this.noiseSeed) - 0.5) * 2.1 * amount * this.xh;
    },

    // points: [x, y, ...] relative to the baseline of the current row, y down
    stroke: function(points, options) {
      options = options || {};
      const n = points.length / 2;
      const slip = options.level || options.mark ? 0 : this.fault(this.row, points[0]);
      const p = new Float32Array(n * 3);
      const contrast = options.flat ? 0 : this.hand.contrast;
      let x0 = Infinity, x1 = -Infinity;
      for (let i = 0; i < n; i++) {
        const x = points[i * 2], y = points[i * 2 + 1];
        const a = Math.max(0, i - 1), b = Math.min(n - 1, i + 1);
        const dx = points[b * 2] - points[a * 2], dy = points[b * 2 + 1] - points[a * 2 + 1];
        const down = dy / (Math.hypot(dx, dy) || 1);       // 1: a downstroke
        let pressure = 0.66 + 0.34 * contrast * down;
        pressure *= 0.9 + 0.2 * U.noise1(x * 0.09 + i * 0.13, this.noiseSeed + 11);
        if (!options.blunt) {
          if (i === 0) pressure *= 0.5;
          else if (i === n - 1) pressure *= 0.45;
          else if (i === 1 || i === n - 2) pressure *= 0.8;
        }
        if (options.pressure) pressure *= options.pressure[Math.min(options.pressure.length - 1, i)];
        p[i * 3] = x;
        p[i * 3 + 1] = y + slip + (options.level ? 0 : this.drift(this.row, x));
        p[i * 3 + 2] = clamp(pressure, 0.08, 1.2);
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
      }
      const s = {
        p: p, row: this.row, x0: x0, x1: x1,
        w: options.width || 1, a: options.alpha || 1, c: options.color || null,
        pencil: !!options.pencil, early: !!options.early, abs: !!options.abs
      };
      this.strokes.push(s);
      return s;
    },

    // a straight ruled line (three points, so it has a little life)
    rule: function(xa, ya, xb, yb, options) {
      const bow = (options && options.bow || 0) * this.xh;
      const nx = -(yb - ya), ny = xb - xa, len = Math.hypot(nx, ny) || 1;
      return this.stroke([xa, ya, (xa + xb) / 2 + nx / len * bow, (ya + yb) / 2 + ny / len * bow, xb, yb],
        Object.assign({ flat: true, pencil: true, pressure: [0.75, 1, 0.7] }, options));
    },

    deposit: function(x, y, rx, ry, amount, color) {
      this.deposits.push({
        x: x, y: y + this.drift(this.row, x), rx: rx, ry: ry, a: amount, c: color || this.pigment().rgb,
        row: this.row
      });
    },

    pigment: function() { return this.zone || this.geo.pigs[0]; },

    // remember that something was written from xa to xb (for the wash)
    inked: function(xa, xb, what, weight) {
      const rgb = this.pigment().rgb;
      for (let cell = Math.floor(xa / CELL); cell <= Math.floor(xb / CELL); cell++) {
        const part = (Math.min(xb, (cell + 1) * CELL) - Math.max(xa, cell * CELL)) / CELL * weight;
        if (part <= 0) continue;
        const key = this.row + ':' + cell;
        const entry = this.grid[key] || (this.grid[key] = { row: this.row, cell: cell, prose: 0, code: 0, sum: 0, r: 0, g: 0, b: 0 });
        entry[what] += part;
        entry.sum += part; entry.r += rgb[0] * part; entry.g += rgb[1] * part; entry.b += rgb[2] * part;
      }
    },

    // The wash under the trace: pools where much was written, most under
    // code; a slow tide decides which stretches of prose get any at all.
    pools: function(rand) {
      const xh = this.xh, pitch = this.geo.pitch;
      Object.keys(this.grid).forEach(function(key) {
        const e = this.grid[key];
        const tide = smoothstep(0.42, 0.78, 0.5 + 0.5 * U.noise2(e.cell * CELL * 0.0052, e.row * pitch * 0.0095, this.noiseSeed + 77));
        const amount = Math.min(1, Math.min(0.42, e.prose * (0.02 + 0.4 * tide * tide)) + e.code * (0.34 + 0.36 * tide));
        if (amount < 0.08) return;
        this.row = e.row;
        this.xh = xh;
        this.deposit((e.cell + 0.3 + 0.4 * rand()) * CELL, (-1.0 + 0.8 * (rand() - 0.5)) * xh,
          CELL * (1.0 + 0.5 * rand()), Math.max(2.8 * xh, pitch * (0.85 + 0.45 * rand())), amount,
          [e.r / e.sum, e.g / e.sum, e.b / e.sum]);
      }, this);
      this.grid = {};
    },

    // move to the next row when `width` does not fit any more
    room: function(width) {
      if (this.x > 0 && this.x + width > ROW) {
        this.row++;
        this.x = this.geo.rand() * this.xh * 2;
        return true;
      }
      return false;
    },

    // one word of letters at the pen; returns its width
    word: function(chars, options) {
      options = options || {};
      const scale = this.xh * (options.scale || 1);
      const w = writeWord(chars, this.hand, this.geo.rand, options);
      const width = w.width * scale;
      if (!options.stay) this.room(width);
      const ox = this.x, oy = options.dy || 0;
      const pts = new Array(w.path.length);
      for (let i = 0; i < w.path.length; i += 2) {
        pts[i] = ox + w.path[i] * scale;
        pts[i + 1] = oy - w.path[i + 1] * scale;
      }
      this.stroke(pts, { alpha: options.alpha, color: options.color, width: options.width, blunt: options.joined });
      // certainty: an unsure hand goes over its words again
      const search = options.joined ? 0 : this.hand.voice.search;
      for (let pass = 0; pass < 2; pass++) {
        if (this.geo.rand() >= (pass ? search - 0.45 : search * 0.9)) break;
        const again = pts.slice(), grow = 1 + 0.07 * (this.geo.rand() - 0.3);
        const dx = (this.geo.rand() - 0.5) * 0.34 * scale, dy = (this.geo.rand() - 0.5) * 0.3 * scale;
        for (let i = 0; i < again.length; i += 2) {
          again[i] = ox + (again[i] - ox) * grow + dx;
          again[i + 1] = oy + (again[i + 1] - oy) * grow + dy;
        }
        this.stroke(again, { alpha: (options.alpha || 1) * 0.6, color: options.color, width: (options.width || 1) * 0.9 });
      }
      for (let e = 0; e < w.extras.length; e++) {
        const ex = w.extras[e];
        this.stroke([ox + ex[0] * scale, oy - ex[1] * scale, ox + ex[2] * scale, oy - ex[3] * scale],
          { alpha: options.alpha, color: options.color, blunt: true, flat: true, width: (options.width || 1) * 1.1 });
      }
      this.x += width;
      return width;
    }
  };

  function lattice(a, b, seed) {
    let h = Math.imul(a | 0, 374761393) ^ Math.imul(b | 0, 668265263) ^ Math.imul(seed | 0, 2147483647);
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  }

  function unitsOf(block) {
    switch (block.t) {
      case 'p': case 'q': return block.n;
      case 'c': return block.n * 1.5;
      case 'l': return block.n * 4;
      case 't': return block.n * 3;
      case 'i': return 12;
      case 'h': return 4;
      default: return 1;
    }
  }

  const LETTERS_PER_WORD = 4.6;
  const CODE_WIDTH = 7;      // x-heights of hatching per line of code

  // The post's blocks written out at a compression of `c` real words per
  // drawn word.  Returns the composer; composer.row tells whether it fitted.
  function writeTrace(post, kind, hand, geo, c) {
    geo.rand = post.rng('trace:' + kind);
    const washRand = post.rng('trace:wash:' + kind);
    const k = new Composer(post, kind, hand, geo);
    const xh = geo.xh, rand = geo.rand;
    const shape = post.shape;
    const gap = 1.15 * xh * hand.apart * (1 + 0.4 * hand.voice.stance.observer);   // an observer keeps his distance
    const mean = LETTERS_PER_WORD * (1 + clamp((c - 1) / 5, 0, 3.6));
    const topLevel = shape.reduce(function(acc, b) { return b.t === 'h' ? Math.min(acc, b.n) : acc; }, 6);
    const linkChance = clamp(post.stats.links * c / Math.max(post.stats.words, 40) * 1.2, 0, 0.22);
    let units = 0;
    const total = shape.reduce(function(acc, b) { return acc + unitsOf(b); }, 0) || 1;
    const carry = { p: 0, c: 0, l: 0 };
    let fresh = true;          // nothing since the last break: no paragraph gap needed
    const voice = hand.voice, stance = voice.stance;
    k.climb = 0.02 * stance.advocate;        // an advocate's lines push upwards as they go
    // actor: a group writes in several hands, which take turns by paragraph
    const hands = [{}];
    for (let i = Math.round(voice.many * 2.4); i > 0; i--) {
      hands.push({ slant: (rand() - 0.5) * 0.7, scale: 0.8 + 0.42 * rand(), alpha: 0.72 + 0.36 * rand(), width: 0.8 + 0.5 * rand() });
    }

    // The marks a writer leaves on his own page (stance), each over one word.
    function underline(x, width, pressed) {
      for (let u = 0; u < (pressed ? 2 : 1); u++) {
        const y = (0.5 + 0.22 * u + 0.1 * rand()) * xh;
        k.rule(x - 0.3 * xh, y, x + width + 0.4 * xh, y - (pressed ? 0.05 + 0.1 * rand() : 0) * xh,
          pressed ? { alpha: 0.95, width: 1.2, bow: 0.05 } : { alpha: 0.7, width: 0.85 });
      }
    }
    function strike(x, width) {
      const y = -0.5 * xh;
      k.stroke([x - 0.3 * xh, y + 0.1 * xh, x + width * 0.35, y - 0.12 * xh, x + width * 0.7, y + 0.1 * xh, x + width + 0.35 * xh, y - 0.1 * xh],
        { flat: true, alpha: 0.95, width: 1.1 });
    }
    function ring(x, width) {
      const pts = [], cx = x + width / 2, rx = width / 2 + 0.55 * xh, ry = 1.25 * xh, from = rand() * TAU;
      for (let i = 0; i <= 22; i++) {
        const a = from + i / 20 * TAU, g = 1 + 0.06 * i / 22;
        pts.push(cx + Math.cos(a) * rx * g, -0.45 * xh + Math.sin(a) * ry * g);
      }
      k.stroke(pts, { flat: true, alpha: 0.8, width: 0.95 });
    }
    function corners(x, width) {
      const a = x - 0.35 * xh, b = x + width + 0.35 * xh, top = -1.75 * xh, bottom = 0.45 * xh, arm = 0.7 * xh;
      k.stroke([a + arm, top, a, top, a, top, a, top + arm], { flat: true, pencil: true, alpha: 0.75, width: 0.85 });
      k.stroke([b - arm, bottom, b, bottom, b, bottom, b, bottom - arm], { flat: true, pencil: true, alpha: 0.75, width: 0.85 });
    }
    function gloss(x, width) {
      // a note between the lines, small and light
      const keep = k.x, text = randomLetters(2 + rand.int(4), rand);
      k.x = x + width * 0.2;
      k.word(text, { stay: true, scale: 0.52, dy: -2.15 * xh, alpha: 0.7, width: 0.8, joined: true });
      k.x = keep;
    }
    function paraph(x, width) {
      // humour: the pen swings back under the word it has just written
      const end = x + width;
      k.stroke([end, 0, end + 0.9 * xh, 0.35 * xh, end + 0.5 * xh, 0.95 * xh, x + width * 0.45, 0.8 * xh, x + width * 0.1, 1.0 * xh,
        x - 0.2 * xh, 0.7 * xh], { alpha: 0.9, pressure: [0.9, 1, 1.1, 1, 0.8, 0.4] });
    }
    function annotate(x, width) {
      const wide = width > 2.5 * xh, r = rand();
      let at = 0;
      const chance = function(p) { at += p; return r < at; };
      if (!wide) return;
      if (chance(0.085 * stance.teacher)) underline(x, width, false);
      else if (chance(0.05 * stance.critic + 0.05 * voice.search * (0.3 + voice.tension))) strike(x, width);
      else if (chance(0.03 * stance.critic)) ring(x, width);
      else if (chance(0.06 * stance.advocate + 0.1 * voice.agitation + (hand.stress ? 0.07 : 0))) underline(x, width, true);
      else if (chance(0.055 * stance.builder)) corners(x, width);
      else if (chance(0.06 * stance.observer)) gloss(x, width);
      else if (chance(0.1 * voice.humor)) paraph(x, width);
    }

    function prose(block, quote) {
      let letters = block.n * LETTERS_PER_WORD / c + carry.p;
      if (letters < 2) { carry.p = letters; return; }
      if (!fresh) k.x += gap * (quote ? 1.2 : 1.5);
      let first = true;
      // builder: a construction line dropped where the paragraph is set out
      if (!quote && rand() < 0.5 * stance.builder * clamp(6 / c, 0.25, 1)) {
        const x = k.x - 0.5 * xh, reach = geo.pitch * (0.7 + 1.2 * rand());
        k.rule(x, reach * 0.8, x, -reach - 2 * xh, { alpha: 0.5, width: 0.75, level: true });
        k.rule(x - 0.6 * xh, -2.6 * xh, x + 0.6 * xh, -2.6 * xh, { alpha: 0.55, width: 0.75 });
      }
      // critic: a cut through the line
      if (!quote && rand() < 0.3 * stance.critic * clamp(6 / c, 0.25, 1)) {
        const x = k.x + xh * (1 + 4 * rand());
        k.stroke([x, 1.3 * xh, x + 1.6 * xh, -0.8 * xh, x + 3.4 * xh, -3.2 * xh], { flat: true, alpha: 1.05, width: 1.25, pressure: [1.2, 1, 0.5] });
      }
      const who = hands[rand.int(hands.length)];
      const options = quote
        ? { slant: 0.32, scale: 0.9, alpha: 0.82, dy: 0 }
        : { slant: who.slant, scale: who.scale, alpha: who.alpha, width: who.width };
      // witness: what was written here before and rubbed out
      if (!quote && rand() < 0.45 * stance.witness && k.x < ROW - 14 * xh) {
        const keep = k.x;
        k.x += xh * (1 + 3 * rand());
        for (let i = 2 + rand.int(3); i > 0 && k.x < ROW - 8 * xh; i--) {
          k.word(randomLetters(3 + rand.int(6), rand), { stay: true, dy: -0.48 * geo.pitch, alpha: 0.3, width: 1.5, scale: 1.05, joined: true });
          k.x += gap;
        }
        k.x = keep;
      }
      const bar = function() {
        k.rule(k.x + 0.2 * xh, 0.7 * xh, k.x + 0.45 * xh, -2.15 * xh, { width: 1.5, alpha: 0.75 });
        k.x += 1.5 * xh;
      };
      if (quote) { k.room(8 * xh); bar(); }
      while (letters >= 2) {
        let len = Math.max(1, Math.round(mean * (0.4 + 1.2 * rand())));
        if (letters - len < 2.5) len = Math.round(letters);
        letters -= len;
        const text = randomLetters(len, rand, voice.mech);
        options.capital = first && !quote;
        // measure first so a quote can set its bar on a new row
        const probe = len * 0.85 * hand.spread * xh * (options.scale || 1);
        if (k.room(probe) && quote) bar();
        options.stay = true;
        const startX = k.x;
        const width = k.word(text, options);
        if (rand() < linkChance) {
          const y = (0.42 + 0.1 * rand()) * xh;
          k.rule(startX + 0.2 * xh, y, startX + width - 0.1 * xh, y + (rand() - 0.5) * 0.12 * xh,
            { alpha: 0.5, width: 0.8, bow: 0.04 });
        }
        annotate(startX, width);
        k.inked(startX, startX + width, 'prose', quote ? 0.7 : 1);
        k.x += gap * (0.85 + 0.3 * rand());
        first = false;
      }
      carry.p = letters;
      fresh = false;
      // advocate: the paragraph points on; humour: it ends in a curl
      const sparse = clamp(4 / c, 0.2, 1);      // on a compressed line a paragraph is only a word or two
      if (!quote && rand() < 0.22 * stance.advocate * sparse) {
        const x = k.x - gap * 0.3, y = -0.55 * xh;
        k.stroke([x, y, x + 1.1 * xh, y - 0.03 * xh, x + 2.2 * xh, y], { flat: true, alpha: 0.9 });
        k.stroke([x + 1.6 * xh, y - 0.5 * xh, x + 2.2 * xh, y, x + 2.2 * xh, y, x + 1.6 * xh, y + 0.5 * xh], { flat: true, alpha: 0.9 });
        k.x += 2.6 * xh;
      } else if (!quote && rand() < 0.16 * smoothstep(0.35, 1, voice.humor) * sparse) {
        const pts = [], cx = k.x + 0.6 * xh, cy = -0.7 * xh;
        for (let i = 0; i <= 26; i++) {
          const a = i / 26 * TAU * 2.2, r = (0.12 + 0.75 * i / 26) * xh;
          pts.push(cx + Math.cos(a) * r, cy + Math.sin(a) * r * 0.9);
        }
        k.stroke(pts, { flat: true, alpha: 0.85 });
        k.x += 2.2 * xh;
      }
    }

    function code(block) {
      let width = block.n * CODE_WIDTH * xh / c + carry.c;
      if (width < 2.4 * xh) { carry.c = width; return; }
      carry.c = 0;
      if (!fresh) k.x += gap * 0.9;
      const pitch = (0.5 + 0.14 * hand.round) * xh * (hand.fat ? 1.5 : 1);
      const top = -2.0 * xh, bottom = 0.28 * xh, height = bottom - top;
      const lean = height * 0.55;                 // x travelled by a hatch from bottom to top
      const cross = block.n >= 22;
      while (width > 0) {
        if (ROW - k.x < 3.2 * xh) { k.row++; k.x = rand() * xh; }
        const w = Math.min(width, ROW - k.x);
        const xa = k.x, xb = k.x + w;
        const over = function() { return (0.25 + 0.55 * rand()) * xh; };
        k.rule(xa - over(), top, xb + over(), top + (rand() - 0.5) * 0.08 * xh, { alpha: 0.7, width: 0.9 });
        k.rule(xa - over(), bottom, xb + over(), bottom + (rand() - 0.5) * 0.08 * xh, { alpha: 0.7, width: 0.9 });
        for (let pass = 0; pass < (cross ? 2 : 1); pass++) {
          const dir = pass ? -1 : 1;
          const step = pitch * (pass ? 1.9 : 1);
          for (let hx = xa - lean + step * 0.5; hx < xb; hx += step * (0.86 + 0.28 * rand())) {
            // the hatch runs from (hx, bottom) to (hx + lean, top); keep the part inside the block
            let t0 = clamp((xa - hx) / lean, 0, 1), t1 = clamp((xb - hx) / lean, 0, 1);
            if (t1 - t0 < 0.12) continue;
            const j = hand.wobble * 0.5 + 0.03;
            t0 -= (t0 > 0 ? 0 : 0.06 * rand()); t1 += (t1 < 1 ? 0 : 0.07 * rand());
            let ax = hx + lean * t0, bx = hx + lean * t1;
            if (dir < 0) { ax = xa + xb - ax; bx = xa + xb - bx; }
            k.rule(ax + (rand() - 0.5) * j * xh, bottom - height * t0, bx + (rand() - 0.5) * j * xh, bottom - height * t1,
              { alpha: pass ? 0.7 : 1.1, width: pass ? 0.9 : 1.12, pressure: [0.9, 1, 0.85], bow: (rand() - 0.5) * 0.12 * (0.3 + hand.round) });
          }
        }
        k.inked(xa, xb, 'code', 1);
        k.x = xb;
        width -= w;
      }
      k.x += gap * 0.9;
      fresh = false;
    }

    function heading(block) {
      const major = block.n <= topLevel;
      if (!major && c > 14) return;
      if (k.x > 0) k.x += gap * 0.9;
      k.room(5 * xh);
      const lean = 0.06 * xh * (rand() - 0.5);
      const top = -(major ? 3.0 : 2.0) * xh, bottom = (major ? 1.1 : 0.5) * xh;
      k.rule(k.x + lean, bottom, k.x - lean, top, { width: major ? 1.25 : 1, alpha: 0.95, bow: 0.01 });
      if (major && stance.builder > 0.25) {
        // builder: the section is set out with a long construction line
        const reach = geo.pitch * (0.9 + 1.3 * stance.builder);
        k.rule(k.x + 0.2 * xh, reach, k.x + 0.2 * xh, -reach - 2 * xh, { alpha: 0.2 + 0.4 * stance.builder, width: 0.75, level: true });
      }
      if (major) {
        k.rule(k.x + 0.42 * xh + lean, bottom - 0.25 * xh, k.x + 0.42 * xh - lean, top + 0.3 * xh, { width: 0.8, alpha: 0.6 });
        // a short ruled foot, like a bar line on its stave
        k.rule(k.x - 0.5 * xh, bottom, k.x + 2.2 * xh, bottom, { width: 0.8, alpha: 0.55 });
      }
      k.x += (major ? 1.5 : 1.1) * xh;
      fresh = true;
    }

    function list(block) {
      let items = block.n / Math.max(1, c / 2.5) + carry.l;
      if (items < 1.5) { carry.l = items; return; }
      carry.l = 0;
      items = Math.min(12, Math.round(items));
      if (!fresh) k.x += gap;
      const slots = [-1.95, -1.2, -0.45];
      for (let done = 0; done < items;) {
        k.room(6 * xh);
        let widest = 0;
        for (let s = 0; s < slots.length && done < items; s++, done++) {
          const y = slots[s] * xh, len = (2.6 + 3.2 * rand()) * xh;
          const x = k.x + 0.12 * xh * (rand() - 0.5);
          k.stroke([x, y - 0.1 * xh, x + 0.22 * xh, y + 0.1 * xh, x + 0.05 * xh, y + 0.12 * xh], { blunt: true, flat: true, width: 1.7, alpha: 1.1 });
          k.stroke([x + 0.95 * xh, y + 0.05 * xh, x + 0.95 * xh + len * 0.5, y + (rand() - 0.5) * 0.24 * xh, x + 0.95 * xh + len, y + (rand() - 0.5) * 0.16 * xh],
            { flat: true, alpha: 1.1, width: 1.1, pressure: [1.2, 1.3, 1.1] });
          widest = Math.max(widest, len + 0.95 * xh);
        }
        k.inked(k.x, k.x + widest, 'prose', 0.8);
        k.x += widest + 1.2 * xh;
      }
      k.x += gap * 0.5;
      fresh = false;
    }

    function image() {
      const w = 3.5 * xh, h = 2.5 * xh, base = 0.3 * xh;
      if (!fresh) k.x += gap;
      k.room(w + gap);
      const xa = k.x, xb = k.x + w, o = function() { return (0.15 + 0.3 * rand()) * xh; };
      k.rule(xa - o(), base, xb + o(), base, { alpha: 0.8 });
      k.rule(xa - o(), base - h, xb + o(), base - h, { alpha: 0.8 });
      k.rule(xa, base + o(), xa, base - h - o(), { alpha: 0.8 });
      k.rule(xb, base + o(), xb, base - h - o(), { alpha: 0.8 });
      k.deposit(xa + w / 2, base - h / 2, w * 0.8, h * 0.62, 1);
      k.x = xb + gap;
      fresh = false;
    }

    function table(block) {
      const rows = clamp(Math.round(block.n / Math.max(1, c / 3)), 2, 5);
      const w = 4.6 * xh, top = -2.1 * xh, pitch = 2.3 * xh / (rows - 1);
      if (!fresh) k.x += gap;
      k.room(w + gap);
      for (let r = 0; r < rows; r++) k.rule(k.x - 0.2 * xh, top + r * pitch, k.x + w + 0.2 * xh, top + r * pitch, { alpha: 0.75, width: 0.85 });
      [0, 0.36, 0.7, 1].forEach(function(f) {
        k.rule(k.x + w * f, top - 0.2 * xh, k.x + w * f, top + (rows - 1) * pitch + 0.2 * xh, { alpha: 0.6, width: 0.8 });
      });
      k.inked(k.x, k.x + w, 'prose', 1);
      k.x += w + gap;
      fresh = false;
    }

    function raw() {
      if (c > 5) return;
      if (!fresh) k.x += gap * 0.6;
      k.room(3 * xh);
      const x = k.x, y = -0.6 * xh;
      k.stroke([x + 0.6 * xh, y - 0.6 * xh, x + 0.6 * xh, y - 0.6 * xh, x, y, x, y, x + 0.6 * xh, y + 0.6 * xh], { flat: true, alpha: 0.6, pencil: true });
      k.stroke([x + 1.1 * xh, y - 0.6 * xh, x + 1.1 * xh, y - 0.6 * xh, x + 1.7 * xh, y, x + 1.7 * xh, y, x + 1.1 * xh, y + 0.6 * xh], { flat: true, alpha: 0.6, pencil: true });
      k.x += 1.7 * xh + gap * 0.6;
      fresh = false;
    }

    // imagery: the picture the author himself uses, small, where the line begins
    if (voice.imagery) {
      k.zone = geo.zones[0];
      motif(k, voice.imagery, k.x + 2 * xh, 0.2 * xh, 3.9 * xh);
      k.x += 5.2 * xh;
    }

    for (let i = 0; i < shape.length; i++) {
      const block = shape[i];
      k.zone = geo.zones[Math.min(geo.zones.length - 1, Math.floor(units / total * geo.zones.length))];
      switch (block.t) {
        case 'p': prose(block, false); break;
        case 'q': prose(block, true); break;
        case 'c': code(block); break;
        case 'h': heading(block); break;
        case 'l': list(block); break;
        case 'i': image(); break;
        case 't': table(block); break;
        default: raw();
      }
      units += unitsOf(block);
    }

    // ending: how the line stops
    if (voice.known) {
      k.room(5 * xh);
      const x = k.x - gap * 0.35;
      const dot = function(dx, alpha) {
        k.stroke([x + dx, -0.16 * xh, x + dx + 0.15 * xh, -0.04 * xh], { blunt: true, flat: true, width: 1.7, alpha: alpha });
      };
      if (voice.ending === 'open') {
        // it trails off
        dot(0.2 * xh, 1); dot(1.3 * xh, 0.8); dot(2.6 * xh, 0.6); dot(4.2 * xh, 0.4);
        const pts = [];
        for (let i = 0; i <= 14; i++) pts.push(x + (5.6 + i * 0.75) * xh, (-0.12 - 0.16 * Math.sin(i * 1.3) * (1 - i / 16)) * xh);
        k.stroke(pts, { flat: true, alpha: 0.8, pressure: [0.9, 0.85, 0.8, 0.72, 0.64, 0.56, 0.48, 0.4, 0.33, 0.27, 0.22, 0.18, 0.14, 0.1, 0.08] });
        k.x += 8 * xh;
      } else if (voice.ending === 'call') {
        // it points on
        k.stroke([x + 0.5 * xh, -0.6 * xh, x + 2.6 * xh, -0.66 * xh, x + 4.6 * xh, -0.6 * xh], { flat: true, width: 1.2, alpha: 1.05 });
        k.stroke([x + 3.7 * xh, -1.25 * xh, x + 4.6 * xh, -0.6 * xh, x + 4.6 * xh, -0.6 * xh, x + 3.7 * xh, 0.05 * xh], { flat: true, width: 1.2, alpha: 1.05 });
        k.x += 5.2 * xh;
      } else if (voice.ending === 'practical') {
        // it is squared off and ticked
        const a = x + 0.6 * xh, b = a + 1.7 * xh, top = -1.6 * xh, bottom = 0.1 * xh;
        k.stroke([a, top, b, top, b, top, b, bottom, b, bottom, a, bottom, a, bottom, a, top - 0.1 * xh], { flat: true, pencil: true, alpha: 0.95 });
        k.stroke([a + 0.3 * xh, -0.85 * xh, a + 0.75 * xh, -0.3 * xh, a + 0.75 * xh, -0.3 * xh, b + 0.5 * xh, -2.2 * xh], { flat: true, width: 1.2, alpha: 1.05 });
        k.x += 3.4 * xh;
      } else if (voice.ending === 'resolved') {
        // a full stop and a closing stroke under it all
        dot(0.2 * xh, 1.1);
        k.rule(x + 1.2 * xh, -0.5 * xh, x + 4.4 * xh, -0.56 * xh, { width: 1.2, alpha: 1 });
        k.rule(x + 1.5 * xh, -0.14 * xh, x + 4.0 * xh, -0.2 * xh, { width: 0.9, alpha: 0.8 });
        k.x += 5 * xh;
      } else {
        dot(0.2 * xh, 1);
        k.x += xh;
      }
    }

    // the project tags sign at the end of the line
    if (post.project.length) {
      const size = 2.5 * xh;
      k.x += gap * 1.6;
      k.room(post.project.length * size * 1.5);
      post.project.forEach(function(tag) {
        signature(k, tag, k.x + size * 0.6, 0.1 * xh, size);
        k.x += size * 1.5;
      });
    }
    k.end = { row: k.row, x: k.x };
    k.pools(washRand);
    return k;
  }

  // ---- signatures --------------------------------------------------------

  // A project's mark, drawn in its pigment in a box `size` high standing on
  // the baseline at x (its centre).  Coordinates below: x -0.5..0.5, y 0..1 up.
  function signature(k, tag, cx, base, size) {
    const color = tag.rgb;
    const rand = k.geo.rand;
    const wob = function() { return (rand() - 0.5) * 0.035; };
    const line = function(points, options) {
      const pts = [];
      for (let i = 0; i < points.length; i += 2) {
        const point = [cx + (points[i] + wob()) * size, base - (points[i + 1] + wob()) * size];
        pts.push(point[0], point[1]);
        // doubled points keep a corner a corner
        if (options && options.sharp && i > 0 && i < points.length - 2) pts.push(point[0], point[1]);
      }
      k.stroke(pts, Object.assign({ color: color, flat: true, width: 1.25, alpha: 1.1, mark: true }, options));
    };
    const arc = function(x, y, rx, ry, from, to, options) {
      const pts = [], steps = Math.max(8, Math.round(Math.abs(to - from) * 5));
      for (let i = 0; i <= steps; i++) {
        const a = lerp(from, to, i / steps), grow = 1 + (options && options.grow || 0) * i / steps;
        pts.push(x + Math.cos(a) * rx * grow, y + Math.sin(a) * ry * grow);
      }
      line(pts, options);
    };
    switch (tag.name) {
      case 'flask':
        line([-0.15, 1, -0.15, 0.62, -0.48, 0.1, -0.42, 0, 0.42, 0, 0.48, 0.1, 0.15, 0.62, 0.15, 1], { sharp: true });
        line([-0.24, 1, 0.24, 1.01]);
        line([-0.31, 0.33, -0.1, 0.37, 0.1, 0.31, 0.31, 0.35], { width: 0.9 });
        arc(0.03, 1.22, 0.05, 0.05, 0, TAU, { width: 0.8 });
        arc(-0.08, 1.42, 0.035, 0.035, 0, TAU, { width: 0.8 });
        break;
      case 'jinja':
        line([-0.62, 0.93, -0.3, 0.85, 0, 0.83, 0.3, 0.85, 0.62, 0.93], { width: 2.1 });
        line([-0.46, 0.6, 0.46, 0.61], { width: 1.5 });
        line([-0.29, 0.84, -0.36, 0], { width: 1.7 });
        line([0.29, 0.84, 0.36, 0], { width: 1.7 });
        break;
      case 'pi':
        arc(0, 0.45, 0.4, 0.4, 0.75, 0.75 + TAU - 0.5, { grow: 0.1, width: 1.4 });
        break;
      case 'earendil':
        line([0, -0.2, 0, 0.48, 0, 1.2], { pressure: [0.3, 1.1, 0.3] });
        line([-0.52, 0.48, 0, 0.5, 0.52, 0.48], { pressure: [0.3, 1.1, 0.3] });
        line([-0.2, 0.28, 0, 0.49, 0.2, 0.7], { pressure: [0.3, 1, 0.3], width: 0.9 });
        line([-0.2, 0.7, 0, 0.49, 0.2, 0.28], { pressure: [0.3, 1, 0.3], width: 0.9 });
        break;
      case 'sentry':
        line([-0.56, 0.42, -0.26, 0.72, 0.05, 0.8, 0.34, 0.68, 0.56, 0.42]);
        line([-0.56, 0.42, -0.2, 0.2, 0.1, 0.16, 0.38, 0.26, 0.56, 0.42]);
        arc(0.02, 0.48, 0.13, 0.14, 0, TAU * 1.6, { grow: -0.5, width: 1.3 });
        break;
      case 'django':
        arc(-0.12, 0.13, 0.2, 0.14, 0.4, 0.4 + TAU * 1.7, { grow: -0.55, width: 1.5 });
        line([0.07, 0.17, 0.08, 1.02], { width: 1.2 });
        line([0.08, 1.02, 0.3, 0.82, 0.36, 0.6, 0.27, 0.45], { width: 1.2 });
        break;
      default:
        // a seal for a project nobody has drawn a mark for
        line([-0.3, 0.1, -0.3, 0.8, 0.3, 0.8, 0.3, 0.1, -0.34, 0.1], { sharp: true });
        arc(0, 0.45, 0.12, 0.12, 0, TAU);
    }
    k.deposit(cx, base - size * 0.45, size * 0.9, size * 0.8, 0.45, color);
  }

  // The author's own imagery as a small pencil vignette in a box `size` high
  // standing on the baseline at x (its centre): x -0.5..0.5, y 0..1 up.
  function motif(k, name, cx, base, size) {
    const rand = k.geo.rand;
    const line = function(points, options) {
      const pts = [];
      for (let i = 0; i < points.length; i += 2) {
        pts.push(cx + (points[i] + (rand() - 0.5) * 0.03) * size, base - (points[i + 1] + (rand() - 0.5) * 0.03) * size);
      }
      k.stroke(pts, Object.assign({ flat: true, pencil: true, alpha: 1.05, width: 1.05 }, options));
    };
    const arc = function(x, y, rx, ry, from, to, options) {
      const pts = [], steps = Math.max(6, Math.round(Math.abs(to - from) * 4));
      for (let i = 0; i <= steps; i++) {
        const a = lerp(from, to, i / steps);
        pts.push(x + Math.cos(a) * rx, y + Math.sin(a) * ry);
      }
      line(pts, options);
    };
    switch (name) {
      case 'water':
        [0.2, 0.45, 0.7].forEach(function(y, i) {
          line([-0.5 + i * 0.06, y, -0.3, y + 0.09, -0.1, y, 0.1, y - 0.09, 0.3, y, 0.46 - i * 0.05, y + 0.07]);
        });
        break;
      case 'fire':
        line([0, 0, -0.3, 0.16, -0.33, 0.45, -0.14, 0.7, -0.1, 0.5, 0.04, 0.78, 0.02, 1.02, 0.26, 0.7, 0.34, 0.4, 0.26, 0.14, 0, 0]);
        line([0, 0.08, -0.12, 0.26, -0.02, 0.46, 0.12, 0.28, 0, 0.08], { alpha: 0.7 });
        break;
      case 'stone':
        line([-0.42, 0.05, -0.5, 0.3, -0.3, 0.56, 0.05, 0.62, 0.36, 0.48, 0.48, 0.2, 0.3, 0.02, -0.42, 0.05]);
        line([-0.2, 0.4, 0.0, 0.3, 0.12, 0.42], { alpha: 0.6 });
        line([0.2, 0.62, 0.34, 0.86, 0.52, 0.8, 0.5, 0.6], { alpha: 0.8 });
        break;
      case 'air':
        arc(0.1, 0.62, 0.22, 0.2, -2.4, 3.6);
        line([-0.5, 0.42, -0.1, 0.4, 0.2, 0.41, 0.32, 0.56]);
        line([-0.42, 0.18, 0.0, 0.2, 0.44, 0.16], { alpha: 0.7 });
        break;
      case 'growth':
        line([0, 0, -0.03, 0.4, 0.03, 0.72, 0, 1.02]);
        line([-0.02, 0.36, -0.3, 0.52, -0.44, 0.8, -0.16, 0.66, -0.02, 0.36]);
        line([0.03, 0.6, 0.26, 0.68, 0.42, 0.96, 0.14, 0.86, 0.03, 0.6]);
        break;
      case 'building':
        line([-0.34, 0, -0.34, 0.4, -0.34, 0.4, 0.34, 0.4, 0.34, 0.4, 0.34, 0, 0.34, 0, -0.4, 0]);
        line([-0.24, 0.4, -0.24, 0.72, -0.24, 0.72, 0.24, 0.72, 0.24, 0.72, 0.24, 0.4]);
        line([-0.13, 0.72, -0.13, 0.98, -0.13, 0.98, 0.13, 0.98, 0.13, 0.98, 0.13, 0.72]);
        line([0.0, 0.98, 0.0, 1.2], { alpha: 0.7 });
        break;
      case 'road':
        line([-0.5, 0, -0.2, 0.5, -0.03, 0.95]);
        line([0.5, 0, 0.2, 0.5, 0.05, 0.95]);
        line([0, 0.05, 0, 0.22], { alpha: 0.8 }); line([0.005, 0.36, 0.01, 0.5], { alpha: 0.7 }); line([0.01, 0.62, 0.012, 0.72], { alpha: 0.6 });
        break;
      case 'light':
        arc(0, 0.5, 0.17, 0.17, 0, TAU * 1.08);
        for (let i = 0; i < 9; i++) {
          const a = i / 9 * TAU + 0.2, r = 0.3 + 0.06 * (i % 2);
          line([Math.cos(a) * 0.26, 0.5 + Math.sin(a) * 0.26, Math.cos(a) * (r + 0.2), 0.5 + Math.sin(a) * (r + 0.2)], { alpha: 0.75 });
        }
        break;
      case 'body':
        arc(0, 0.8, 0.15, 0.17, -1.4, TAU - 1.2);
        line([-0.42, 0, -0.36, 0.34, -0.14, 0.56, 0.14, 0.56, 0.36, 0.34, 0.42, 0]);
        break;
      case 'crowd':
        [[-0.3, 0.3], [0.02, 0.26], [0.32, 0.32], [-0.14, 0.66], [0.18, 0.68]].forEach(function(at) {
          arc(at[0], at[1] + 0.12, 0.09, 0.1, -1.2, TAU - 1.3, { alpha: 0.9 });
          line([at[0] - 0.15, at[1] - 0.22, at[0] - 0.1, at[1] - 0.02, at[0] + 0.1, at[1] - 0.02, at[0] + 0.15, at[1] - 0.22], { alpha: 0.75 });
        });
        break;
    }
    k.deposit(cx, base - size * 0.5, size * 0.85, size * 0.7, 0.36);
  }

  // ---- the scenes --------------------------------------------------------

  // Guide lines for the precise hands, and the wash along the outer edge.
  function dress(k, post, kind, hand, geo, rows, baseOf) {
    const xh = geo.xh;
    const footer = kind === 'footer';
    const washRand = post.rng('trace:edge:' + kind);
    const guides = [];
    const save = k.strokes;
    k.strokes = guides;
    if (hand.ruled > 0.05) {
      const levels = hand.ruled > 0.8 ? [[0, 0.52], [-1, 0.27], [-2.25, 0.22]] : [[0, 0.4 * hand.ruled + 0.1]];
      for (let r = 0; r < rows; r++) {
        k.row = r;
        const rowXh = geo.xhOf ? geo.xhOf(r) : xh;
        levels.forEach(function(level) {
          const pts = [];
          for (let x = -REACH; x <= ROW + REACH; x += 90) pts.push(x, level[0] * rowXh);
          k.stroke(pts, { flat: true, pencil: true, alpha: level[1], width: 0.75, early: true, level: true, blunt: true });
        });
      }
    }
    // technical: the page is measured, a rule with its divisions under every row
    const measured = smoothstep(0.62, 0.95, hand.voice.technical);
    if (measured > 0) {
      for (let r = 0; r < rows; r++) {
        k.row = r;
        const rowXh = geo.xhOf ? geo.xhOf(r) : xh;
        for (let x = 0, i = 0; x <= ROW; x += 13, i++) {
          const len = (i % 5 ? 0.3 : 0.62) * rowXh;
          k.stroke([x, 0.55 * rowXh, x, 0.55 * rowXh + len], { flat: true, pencil: true, alpha: (0.3 + 0.4 * measured) * (i % 5 ? 0.8 : 1.1), width: 0.75, early: true, level: true, blunt: true });
        }
      }
    }
    if (hand.voice.stance.teacher > 0.3 && !hand.ledger) {
      // teacher: the margin of an exercise book, ruled in red pencil
      const pts = [], top = footer ? baseOf(0) - 6 * xh : -4, bottom = footer ? HEIGHT.footer + 4 : baseOf(rows - 1) + 6 * xh;
      for (let y = top; y < bottom; y += 40) pts.push(-13, y);
      pts.push(-13, bottom);
      k.stroke(pts, { flat: true, pencil: true, alpha: 0.75 * hand.voice.stance.teacher, width: 0.9, early: true, level: true, blunt: true, abs: true, color: [0.74, 0.2, 0.2] });
    }
    if (hand.ledger) {
      // the margin of a ledger, in red ink
      const top = footer ? baseOf(0) - 5 * xh : -4, bottom = footer ? HEIGHT.footer + 4 : baseOf(rows - 1) + 4 * xh;
      [-15, -11].forEach(function(x, i) {
        const pts = [];
        for (let y = top; y <= bottom; y += 40) pts.push(x, y);
        pts.push(x, bottom);
        k.stroke(pts, { flat: true, pencil: true, alpha: i ? 0.3 : 0.42, width: 0.8, early: true, level: true, blunt: true, abs: true, color: [0.72, 0.2, 0.22] });
      });
    }
    k.strokes = guides.concat(save);

    // rows to band coordinates
    k.strokes.forEach(function(s) {
      if (s.abs) return;
      const base = baseOf(s.row);
      for (let i = 1; i < s.p.length; i += 3) s.p[i] += base;
    });
    k.deposits.forEach(function(d) { d.y += baseOf(d.row); });

    // the wash that touches the outer edge of the page
    const zones = geo.zones;
    const seed = k.noiseSeed + 300;
    const voice = hand.voice;
    // valence: a bleak post hangs heavy from the edge, a joyful one barely touches it
    const heavy = lerp(1.38, 0.7, voice.valence);
    for (let x = -REACH; x <= ROW + REACH; x += 56) {
      const inside = x > -80 && x < ROW + 80;
      const zone = zones[clamp(Math.floor(x / ROW * zones.length), 0, zones.length - 1)];
      const n1 = 0.5 + 0.5 * U.noise1(x * 0.0041, seed), n2 = 0.5 + 0.5 * U.noise1(x * 0.0093 + 40, seed);
      const depth = (footer ? 46 + 88 * n1 : 22 + 32 * n1) * heavy;
      const amount = (footer ? 0.4 + 0.48 * n2 : 0.34 + 0.44 * n2) * (inside ? 1 : 0.85);
      // mood: the light along the edge, in patches between the pigments
      const mood = voice.light ? voice.lightShare * smoothstep(-0.25, 0.35, U.noise1(x * 0.0037 + 9, seed + 7)) * 0.8 : 0;
      // and the season the post was written in, here and there
      const season = voice.season ? smoothstep(0.1, 0.6, U.noise1(x * 0.0029 + 70, seed + 13)) * 0.6 : 0;
      k.deposits.push({
        x: x + 20 * (washRand() - 0.5), y: footer ? HEIGHT.footer + 8 : -8,
        rx: 70 + 50 * washRand(), ry: depth, a: amount, c: mix(mood ? mix(zone.rgb, voice.light, mood) : zone.rgb, voice.season || zone.rgb, season), edge: true
      });
    }
  }

  function traceScene(post, kind, hand, pigs) {
    const footer = kind === 'footer';
    const total = post.shape.reduce(function(acc, b) { return acc + unitsOf(b); }, 0);
    const size = smoothstep(Math.log(150), Math.log(3600), Math.log(total + 1));
    // the hand is larger for a short post, and for one held close (scale, personal)
    const zoom = hand.voice.zoom;
    const grow = footer ? clamp(lerp(1.5, 0.84, size) * zoom, 0.74, 1.8) : clamp(lerp(1.25, 0.9, size) * zoom, 0.74, 1.5);
    const geo = { xh: (footer ? 6.3 : 6.8) * grow, pigs: pigs };
    geo.pitch = (footer ? 36 : 34) * grow;
    const last = footer ? 406 : 0, first = footer ? 92 : 62;
    geo.rows = footer ? Math.floor((last - first) / geo.pitch) + 1 : 1;
    geo.zones = zonesFor(pigs, clamp(Math.round(3 + post.shape.length / 9), Math.min(pigs.length, 9), 9), post.rng('trace:zones'));

    // how much the post has to be compressed to fit the rows
    const xh = geo.xh;
    const marks = post.project.length ? (post.project.length * 3.8 + 3) * xh : 0;
    const capacity = geo.rows * ROW * 0.94 - marks;
    let variable = 0, fixed = 0;
    post.shape.forEach(function(b) {
      if (b.t === 'p' || b.t === 'q') { variable += b.n * (LETTERS_PER_WORD * 0.85 * hand.spread + 1.15 * hand.apart) * xh; fixed += 0.6 * xh; }
      else if (b.t === 'c') variable += b.n * CODE_WIDTH * xh;
      else if (b.t === 'l') variable += b.n * 2 * xh;
      else if (b.t === 'h') fixed += 2.6 * xh;
      else if (b.t === 'i' || b.t === 't') fixed += 6 * xh;
    });
    let c = Math.max(1, variable / Math.max(capacity - fixed, capacity * 0.3));
    let k = null;
    for (let attempt = 0; attempt < 7; attempt++) {
      k = writeTrace(post, kind, hand, geo, c);
      const used = k.end.row * ROW + k.end.x, target = geo.rows * ROW - marks * 0.2;
      if (used > target) c *= Math.max(1.04, Math.min(1.5, used / (target * 0.97)));
      else if (c > 1 && used < target * 0.86 && attempt < 5) c = Math.max(1, c * used / (target * 0.95));
      else break;
    }

    const rows = Math.min(k.end.row + 1, geo.rows + 1);
    const baseOf = footer
      ? function(row) { return last - (rows - 1 - row) * geo.pitch; }
      : function(row) { return first + row * geo.pitch; };
    dress(k, post, kind, hand, geo, rows, baseOf);
    return finish(k, post, hand, pigs, { rows: rows, base: baseOf(0), pitch: geo.pitch, across: false });
  }

  // Without a shape there is nothing to trace, and the tags are written
  // themselves: each as the silhouette of its name in its own pigment, joined
  // into one unbroken line like an exercise in a copybook.  One tag gets one
  // large line in the footer, several tags a few rows.  No tags at all is the
  // house line: swell in the blog's blue, receding towards the text.
  function lineScene(post, kind, hand, pigs) {
    const footer = kind === 'footer';
    const tags = post.lead.slice().sort(function(a, b) { return a.order - b.order; });
    const house = !tags.length;
    const lines = [];        // { y, xh, presence }
    if (!footer) {
      lines.push({ y: 64, xh: house ? 8.6 : tags.length > 1 ? 8.2 : 9.4, presence: 1 });
    } else if (house) {
      for (let i = 0, y = 404, scale = 1; i < 7; i++, scale *= 0.8) {
        lines.unshift({ y: y, xh: 12 * scale, presence: Math.pow(scale, 0.8) });
        y -= 62 * scale;
      }
    } else if (tags.length === 1) {
      lines.push({ y: 336, xh: 21, presence: 1 });
    } else {
      for (let i = 0; i < 3; i++) lines.push({ y: 404 - (2 - i) * 84, xh: 13, presence: 0.55 + 0.225 * i });
    }
    const geo = { xh: lines[0].xh, pigs: pigs, pitch: 60, xhOf: function(row) { return lines[row].xh; } };
    geo.rand = post.rng('trace:line:' + kind);
    geo.zones = zonesFor(pigs, clamp(pigs.length * 2, 3, 9), post.rng('trace:zones'));
    const k = new Composer(post, kind, hand, geo);
    const rand = geo.rand;
    const washRand = post.rng('trace:wash:' + kind);

    lines.forEach(function(line, row) {
      const xh = line.xh;
      k.row = row;
      k.xh = xh;
      geo.pitch = xh * 3.4;
      const width = Math.sqrt(xh / 8.6);
      let index = row;
      k.x = -REACH - rand() * 30 * xh;
      while (k.x < ROW + REACH) {
        const start = k.x;
        if (house) {
          const count = 3 + rand.int(4);
          let text = '';
          for (let i = 0; i < count; i++) text += rand() < 0.1 ? (rand() < 0.6 ? 'e' : 'l') : rand() < 0.3 ? '-' : '~';
          k.word(text, { stay: true, calm: true, alpha: line.presence, width: width, color: pigs[rand() < 0.7 ? 0 : 1].rgb });
          k.x += xh * (1.5 + 5 * rand());
          continue;
        }
        const tag = tags[index % tags.length];
        k.zone = { rgb: tag.rgb };
        const name = tag.name.toLowerCase().replace(/[^a-z]/g, 'n') || 'n';
        // the pen runs on from one word into the next
        k.word(name + (rand() < 0.5 ? '-' : '~'), { stay: true, calm: true, alpha: line.presence, width: width, color: tag.rgb, joined: true });
        k.inked(start, k.x, 'prose', 0.9);
        if (tag.role === 'project' && index % 3 === 1) {
          k.x += 1.6 * xh;
          signature(k, tag, k.x + 1.4 * xh, 0, 2.3 * xh);
          k.x += 4.4 * xh;
        }
        index++;
      }
      k.pools(washRand);
    });
    k.grid = {};
    const baseOf = function(row) { return lines[Math.min(row, lines.length - 1)].y; };
    dress(k, post, kind, hand, geo, lines.length, baseOf);
    return finish(k, post, hand, pigs, { rows: lines.length, base: baseOf(0), pitch: 60, across: true });
  }

  function finish(k, post, hand, pigs, layout) {
    let loose = 0;
    pigs.forEach(function(p) { loose += p.share * (p.loose === undefined ? 0.5 : p.loose); });
    return {
      strokes: k.strokes, deposits: k.deposits, hand: hand, layout: layout,
      wet: loose * (1 - 0.75 * hand.voice.tension),    // loose pigments bleed, strict ones granulate
      gran: 1 - loose,
      value: lerp(1.36, 0.72, hand.voice.valence),      // valence: heavy and grey, or light and clear
      clear: lerp(0.6, 1.2, smoothstep(0.05, 0.9, hand.voice.valence)),
      tension: smoothstep(0.3, 1, hand.voice.tension),
      seed: (post.seed % 1000) / 10
    };
  }

  function buildScene(post, kind) {
    const hand = handFor(post);
    const pigs = pigmentsFor(post, hand.voice);
    if (post.shape.length) return traceScene(post, kind, hand, pigs);
    // a copybook line is written in colour, and calmly
    if (!hand.fat) { hand.width = Math.max(hand.width, 1.05); hand.dark = Math.max(hand.dark, 0.78); }
    hand.wobble *= 0.6;
    return lineScene(post, kind, hand, pigs);
  }

  // ---- the shader --------------------------------------------------------

  const VERTEX = 'attribute vec2 a_position; void main() { gl_Position = vec4(a_position, 0.0, 1.0); }';

  const FRAGMENT = `
    #ifdef GL_FRAGMENT_PRECISION_HIGH
    precision highp float;
    #else
    precision mediump float;
    #endif
    uniform vec2 u_res;          // device pixels
    uniform float u_dpr;
    uniform float u_s;           // css pixels per virtual pixel
    uniform float u_x0;          // where the rows start, virtual pixels from the left edge
    uniform float u_footer;
    uniform float u_dark;
    uniform vec3 u_paper;
    uniform float u_progress;    // 0..1, the picture being written
    uniform float u_old;         // 1..0, the previous picture lifting off
    uniform float u_seed;
    uniform float u_grain;       // how much the paper breaks the strokes up
    uniform float u_inkWet;      // 1: the strokes are paint, not pencil
    uniform float u_gran;
    uniform float u_wet;
    uniform float u_value;       // how much pigment (valence)
    uniform float u_clear;       // how clear the pigment is (valence)
    uniform float u_tension;     // cracks in the wash
    uniform vec4 u_rows;         // first baseline, pitch, rows, 1 if the lines run edge to edge
    uniform float u_width;       // band width in virtual pixels
    uniform sampler2D u_ink;
    uniform sampler2D u_wash;
    uniform sampler2D u_inkOld;
    uniform sampler2D u_washOld;

    float hash(vec2 p) {
      vec3 p3 = fract(vec3(p.xyx) * 0.1031);
      p3 += dot(p3, p3.yzx + 33.33);
      return fract((p3.x + p3.y) * p3.z);
    }
    float vnoise(vec2 p) {
      vec2 i = floor(p), f = fract(p);
      f = f * f * (3.0 - 2.0 * f);
      return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
                 mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
    }
    float fbm(vec2 p) {
      float sum = 0.0, amp = 0.5;
      for (int i = 0; i < 4; i++) {
        sum += amp * vnoise(p);
        p = p * 2.03 + 19.7;
        amp *= 0.5;
      }
      return sum / 0.9375;
    }

    // when the pen reaches a place (0..0.76), the same sum the strokes use
    float penTime(vec2 v) {
      if (u_rows.w > 0.5) return clamp((v.x + u_x0) / u_width, 0.0, 1.0) * 0.7;
      float rows = u_rows.z;
      float row = clamp(floor((v.y - u_rows.x) / u_rows.y + 0.62), 0.0, rows - 1.0);
      float span = rows > 1.5 ? 0.42 : 0.72;
      float start = rows > 1.5 ? row / (rows - 1.0) * (0.74 - span) : 0.0;
      return start + clamp(v.x / ${ROW}.0, -0.05, 1.05) * span;
    }

    // one layer of paint from a map of pigment (rgb) and amount (a)
    vec3 wash(vec3 col, sampler2D map, vec2 v, vec2 uv, float presence, float tooth) {
      vec2 sd = vec2(u_seed * 1.37, u_seed * 0.71);
      // the paint does not stay where it was put
      vec2 warp = vec2(fbm(v * 0.0085 + sd), fbm(v * 0.0085 + sd + 31.7)) - 0.5;
      vec2 fine = vec2(vnoise(v * 0.055 + sd), vnoise(v * 0.055 - sd + 9.1)) - 0.5;
      vec2 offset = warp * 38.0 + fine * 5.0;
      vec4 t = texture2D(map, uv + offset * u_s * u_dpr / u_res * vec2(1.0, -1.0));
      float d = t.a * presence;
      if (d < 0.01) return col;
      vec3 pig = clamp(t.rgb / max(t.a, 0.004), 0.0, 1.0);
      // a bleak post is painted in greyed, heavy pigment, a joyful one in clear colour
      pig = clamp(mix(vec3(dot(pig, vec3(0.3, 0.59, 0.11))), pig, 0.9 * u_clear), 0.0, 1.0);
      pig = mix(pig * vec3(0.68, 0.7, 0.78), pig, clamp((u_clear - 0.58) * 3.5, 0.0, 1.0));
      // under tension the washes do not meet: dry veins run through them
      if (u_tension > 0.02) {
        float vein = abs(fbm(v * 0.0068 + sd + 91.0) - 0.5);
        float vein2 = abs(fbm(v * 0.0105 - sd + 47.0) - 0.5);
        float open = smoothstep(0.3, 0.62, fbm(v * 0.0037 + sd + 5.0));      // they open and close
        d *= mix(1.0, smoothstep(0.0, 0.032 * u_tension * open + 0.0005, min(vein, vein2 + 0.014)), 0.92);
      }

      float wet = smoothstep(0.32, 0.68, fbm(v * 0.0055 - sd + 4.0)) * (0.35 + 0.65 * u_wet);
      float soft = mix(0.015, 0.2, wet);
      float e1 = d + (fbm(v * 0.028 + sd + 7.0) - 0.5) * 0.11;
      float body = smoothstep(0.2, 0.2 + soft, e1);
      float rim = body * (1.0 - smoothstep(0.2 + soft, 0.2 + soft + 0.045, e1)) * (1.0 - wet);
      // a second glaze where there was more water, with its own edge
      float e2 = d + (fbm(v * 0.019 - sd + 13.0) - 0.5) * 0.24;
      float soft2 = mix(0.02, 0.16, 1.0 - wet);
      float deep = smoothstep(0.5, 0.5 + soft2, e2);
      float rim2 = deep * (1.0 - smoothstep(0.5 + soft2, 0.5 + soft2 + 0.04, e2)) * wet;
      float pool = 0.62 + 0.7 * fbm(v * 0.013 + sd - 21.0);
      // backruns: lighter blooms with a crisp edge
      float bloomField = fbm(v * 0.021 + sd + 55.0);
      float bloom = smoothstep(0.6, 0.63, bloomField) * (1.0 - smoothstep(0.63, 0.8, bloomField));

      if (u_dark < 0.5) {
        float amount = (body * 0.17 + rim * 0.15 + deep * 0.13 + rim2 * 0.09) * pool;
        amount += body * smoothstep(0.2, 1.0, d) * 0.12;
        amount *= 1.0 - 0.35 * bloom * body;
        // pigment settles in the hollows of the paper
        amount *= 1.0 + (u_gran * 1.3 + 0.25) * (tooth - 0.5);
        amount = clamp(amount * u_value, 0.0, 1.0);
        return col * pow(max(pig, vec3(0.04)), vec3(amount * 1.15));
      }
      // dark paper: chalk and gouache, dragged over the tooth
      float lum = dot(pig, vec3(0.3, 0.59, 0.11));
      vec3 chalk = mix(pig, vec3(1.0), 0.32 + 0.4 * smoothstep(0.5, 0.1, lum));
      chalk = mix(vec3(dot(chalk, vec3(0.3, 0.59, 0.11))), chalk, 1.15);
      float cover = smoothstep(0.16, 0.42, e1) * 0.27 + deep * 0.2;
      cover *= pool * mix(1.0, u_value, 0.6);
      float drag = smoothstep(0.28, 0.72, tooth + cover * 1.1 - 0.12);
      cover *= mix(1.0, drag * 1.5, 0.8);
      return mix(col, chalk, clamp(cover, 0.0, 0.85));
    }

    vec3 strokes(vec3 col, sampler2D map, vec2 uv, float presence, float tooth, float pool) {
      vec4 t = texture2D(map, uv);
      float a = t.a * presence;
      if (a < 0.004) return col;
      vec3 rgb = clamp(t.rgb / max(t.a, 0.004), 0.0, 1.0);
      float grain = clamp(u_grain + 0.18 * u_dark, 0.0, 1.0);
      // graphite catches on the tooth; pressure fills the hollows
      float bite = smoothstep(0.18, 0.82, tooth * 0.95 + a * 0.62);
      float pencil = a * mix(1.0, bite * 1.25, grain);
      float paint = a * (0.74 + 0.4 * pool);
      vec3 over = mix(col, rgb, clamp(pencil, 0.0, 1.0));
      vec3 glaze = u_dark > 0.5 ? mix(col, rgb, clamp(paint, 0.0, 1.0)) : col * mix(vec3(1.0), rgb, clamp(paint * 1.1, 0.0, 1.0));
      return mix(over, glaze, u_inkWet);
    }

    void main() {
      vec2 css = vec2(gl_FragCoord.x, u_res.y - gl_FragCoord.y) / u_dpr;
      vec2 v = vec2(css.x / u_s - u_x0, css.y / u_s);
      vec2 uv = gl_FragCoord.xy / u_res;
      float height = mix(${HEIGHT.header}.0, ${HEIGHT.footer}.0, u_footer);
      float yn = mix(v.y, height - v.y, u_footer) / height;      // 0 at the outer edge, 1 at the text

      vec2 sd = vec2(u_seed * 1.37, u_seed * 0.71);
      float ragged = (fbm(vec2(v.x * 0.006, 2.3) + sd) - 0.5) * 0.24;
      float washFade = 1.0 - smoothstep(mix(0.4, 0.5, u_footer), 0.96, yn + ragged);
      float inkFade = 1.0 - smoothstep(mix(0.72, 0.5, u_footer), mix(0.985, 0.93, u_footer), yn);
      float inner = 1.0 - smoothstep(0.9, 1.0, yn);

      // the tooth of the paper, in css pixels so it is the same grain everywhere
      vec2 g = vec2(css.x - u_x0 * u_s, css.y);
      float tooth = 0.62 * vnoise(g * 0.85) + 0.38 * vnoise(g * 0.33 + 17.3);
      float pool = fbm(v * 0.03 + sd + 80.0);

      float reveal = smoothstep(0.0, 0.2, u_progress - penTime(v));
      vec3 col = u_paper;
      if (u_old > 0.002) col = wash(col, u_washOld, v, uv, u_old * washFade, tooth);
      col = wash(col, u_wash, v, uv, reveal * washFade, tooth);
      col *= 1.0 + (tooth - 0.5) * 0.028 * inner * (1.0 - yn);
      if (u_old > 0.002) col = strokes(col, u_inkOld, uv, u_old * u_old * inkFade, tooth, pool);
      col = strokes(col, u_ink, uv, inkFade, tooth, pool);
      col = mix(u_paper, col, inner);
      gl_FragColor = vec4(col, 1.0);
    }
  `;

  // ---- drawing -----------------------------------------------------------

  function luminance(c) { return 0.3 * c[0] + 0.59 * c[1] + 0.11 * c[2]; }

  function Band(env, surface) {
    this.env = env;
    this.surface = surface;
    this.scene = null;
    this.progress = 0;
    this.old = 0;
    this.started = false;
    this.dirty = true;
    this.ink = document.createElement('canvas');
    this.map = document.createElement('canvas');
    this.setup();
    const self = this;
    this.onLost = function(event) { event.preventDefault(); self.gl = null; };
    this.onRestored = function() { self.setup(); self.dirty = true; env.invalidate(); };
    surface.canvas.addEventListener('webglcontextlost', this.onLost);
    surface.canvas.addEventListener('webglcontextrestored', this.onRestored);
  }

  Band.prototype = {
    setup: function() {
      const canvas = this.surface.canvas;
      let gl = null;
      if (!this.flat) {
        try { gl = canvas.getContext('webgl', { alpha: false, antialias: false, depth: false, stencil: false }); } catch (error) {}
      }
      this.gl = gl;
      if (!gl) {
        this.flat = canvas.getContext('2d');
        return;
      }
      const program = U.gl.program(gl, VERTEX, FRAGMENT);
      gl.useProgram(program);
      U.gl.quad(gl, program, 'a_position');
      this.uniforms = {};
      ['res', 'dpr', 's', 'x0', 'footer', 'dark', 'paper', 'progress', 'old', 'seed', 'grain', 'inkWet',
        'gran', 'wet', 'value', 'clear', 'tension', 'rows', 'width', 'ink', 'wash', 'inkOld', 'washOld'].forEach(function(name) {
        this.uniforms[name] = gl.getUniformLocation(program, 'u_' + name);
      }, this);
      this.textures = {};
      ['ink', 'wash', 'inkOld', 'washOld'].forEach(function(name, unit) {
        const texture = gl.createTexture();
        gl.activeTexture(gl.TEXTURE0 + unit);
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(4));
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        this.textures[name] = { texture: texture, unit: unit };
        gl.uniform1i(this.uniforms[name], unit);
      }, this);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
    },

    upload: function(name, source) {
      const gl = this.gl, entry = this.textures[name];
      gl.activeTexture(gl.TEXTURE0 + entry.unit);
      gl.bindTexture(gl.TEXTURE_2D, entry.texture);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
    },

    // The picture so far becomes the old one, which then lifts off.
    retire: function() {
      if (!this.gl || !this.scene || !this.started) return;
      const gl = this.gl, t = this.textures;
      [['ink', 'inkOld'], ['wash', 'washOld']].forEach(function(pair) {
        const a = t[pair[0]], b = t[pair[1]];
        const texture = a.texture; a.texture = b.texture; b.texture = texture;
        [a, b].forEach(function(entry) {
          gl.activeTexture(gl.TEXTURE0 + entry.unit);
          gl.bindTexture(gl.TEXTURE_2D, entry.texture);
        });
      });
      this.old = 1;
    },

    // sizes and the place of the rows in the band
    measure: function() {
      const surface = this.surface;
      this.s = surface.height / HEIGHT[surface.kind];
      this.widthV = surface.width / this.s;
      this.x0 = Math.max(MARGIN, (this.widthV - ROW) / 2);
    },

    // when the pen reaches x on a row (the shader has the same sum)
    penTime: function(row, x) {
      const layout = this.scene.layout;
      if (layout.across) return clamp((x + this.x0) / this.widthV, 0, 1) * 0.7 + row * 0.012;
      const span = layout.rows > 1 ? 0.42 : 0.72;
      const start = layout.rows > 1 ? Math.min(row, layout.rows - 1) / (layout.rows - 1) * (0.74 - span) : 0;
      return start + clamp(x / ROW, -0.05, 1.05) * span;
    },

    // Everything that depends on size, theme or scene: the wash map, the
    // colours and the order of the strokes.
    prepare: function() {
      const surface = this.surface, scene = this.scene, dark = this.env.dark;
      this.measure();
      const w = surface.canvas.width, h = surface.canvas.height;
      if (this.ink.width !== w) this.ink.width = w;
      if (this.ink.height !== h) this.ink.height = h;
      const ictx = this.ink.getContext('2d');
      ictx.setTransform(1, 0, 0, 1, 0, 0);
      ictx.clearRect(0, 0, w, h);

      // the wash map
      const mw = Math.max(2, Math.ceil(surface.width / WASH_SCALE)), mh = Math.max(2, Math.ceil(surface.height / WASH_SCALE));
      this.map.width = mw;
      this.map.height = mh;
      const mctx = this.map.getContext('2d');
      const k = this.s / WASH_SCALE;
      const lo = -this.x0 - 200, hi = this.widthV - this.x0 + 200;
      scene.deposits.forEach(function(d) {
        if (d.x + d.rx < lo || d.x - d.rx > hi) return;
        mctx.setTransform(d.rx * k, 0, 0, d.ry * k, (d.x + this.x0) * k, d.y * k);
        const gradient = mctx.createRadialGradient(0, 0, 0, 0, 0, 1);
        const a = Math.min(1, d.a);
        gradient.addColorStop(0, U.css(d.c, a));
        gradient.addColorStop(0.45, U.css(d.c, a * 0.72));
        gradient.addColorStop(1, U.css(d.c, 0));
        mctx.fillStyle = gradient;
        mctx.fillRect(-1, -1, 2, 2);
      }, this);
      if (this.gl) this.upload('wash', this.map);

      // the strokes that can be seen, with their colour and their time
      const hand = scene.hand;
      // a coloured lead is darker than its wash, most so for the pale pigments
      const deepen = function(color) {
        return mix(color, [0, 0, 0], 0.14 + 0.5 * smoothstep(0.42, 0.85, luminance(color)));
      };
      // time: a post about the past is written in a lead that has browned
      const graphite = mix(GRAPHITE, [0.38, 0.27, 0.19], 0.75 * hand.voice.past);
      const lead = hand.pigment && hand.tint > 0 ? mix(graphite, deepen(hand.pigment), hand.tint) : graphite;
      const tone = function(color) {
        if (!dark) return color;
        const lum = luminance(color);
        return mix(color, [1, 1, 1], clamp(0.3 + (0.55 - lum) * 0.9, 0.3, 0.82));
      };
      const chalk = mix(CHALK, [0.93, 0.84, 0.7], 0.75 * hand.voice.past);
      const leadColor = dark ? (hand.tint > 0.2 ? tone(lead) : mix(chalk, tone(lead), hand.tint)) : lead;
      this.list = [];
      scene.strokes.forEach(function(s) {
        if (s.x1 < lo || s.x0 > hi) return;
        const t0 = s.early ? 0 : this.penTime(s.row, s.x0), t1 = s.early ? 0.3 : this.penTime(s.row, s.x1);
        this.list.push({
          s: s, t0: t0, t1: Math.max(t1, t0 + 0.012), done: 0,
          color: U.css(s.c ? tone(dark ? s.c : deepen(s.c)) : leadColor)
        });
      }, this);
      this.touched = true;
      this.dirty = false;
    },

    // Draws what the pen has written up to `progress` and was not drawn yet.
    write: function(progress) {
      const ctx = this.ink.getContext('2d');
      const scene = this.scene, hand = scene.hand;
      const scale = this.surface.dpr * this.s;
      ctx.setTransform(scale, 0, 0, scale, this.x0 * scale, 0);
      // a pencil does not get thinner on a small band
      const unit = 1 / Math.sqrt(this.s) / Math.sqrt(this.s);
      const dark = this.env.dark;
      for (let li = 0; li < this.list.length; li++) {
        const item = this.list[li];
        const s = item.s, n = s.p.length / 3;
        if (item.done >= n || progress < item.t0) continue;
        const fat = hand.fat && !s.pencil;
        let upto = Math.min(n, Math.ceil((progress - item.t0) / (item.t1 - item.t0) * n));
        if (fat && upto < n) continue;          // a brush stroke appears whole
        if (upto - item.done < 1) continue;
        if (upto < n && upto - item.done < 2) continue;
        ctx.strokeStyle = ctx.fillStyle = item.color;
        const alpha = s.a * hand.dark * (dark ? 0.92 : 1);
        if (fat) this.fat(ctx, s, alpha, hand, unit);
        else this.thin(ctx, s, item.done, upto, alpha, (s.pencil && hand.fat ? 0.85 : hand.width) * s.w * unit);
        item.done = upto;
        this.touched = true;
      }
    },

    // a pencil line: pieces of a smooth curve, each as dark as the pressure there
    thin: function(ctx, s, from, upto, alpha, width) {
      const p = s.p, n = p.length / 3;
      ctx.lineCap = 'butt';
      ctx.lineJoin = 'round';
      let level = -1, open = false;
      // piece i runs from halfway between points i - 1 and i to halfway between i and i + 1
      for (let i = from; i < upto; i++) {
        const x = p[i * 3], y = p[i * 3 + 1];
        const q = Math.round(clamp(p[i * 3 + 2], 0, 1.2) * 10);
        if (q !== level) {
          if (open) ctx.stroke();
          level = q;
          ctx.globalAlpha = clamp(alpha * (0.25 + 0.75 * q / 10), 0, 1);
          ctx.lineWidth = width * (0.72 + 0.4 * q / 10);
          ctx.beginPath();
          open = true;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.moveTo((p[i * 3 - 3] + x) / 2, (p[i * 3 - 2] + y) / 2);
        }
        if (i === 0) {
          if (n === 2) ctx.lineTo(p[3], p[4]);
          else ctx.lineTo((x + p[3]) / 2, (y + p[4]) / 2);
        } else if (i === n - 1) {
          ctx.lineTo(x, y);
        } else {
          ctx.quadraticCurveTo(x, y, (x + p[i * 3 + 3]) / 2, (y + p[i * 3 + 4]) / 2);
        }
      }
      if (open) ctx.stroke();
      ctx.globalAlpha = 1;
    },

    // a brush or a broad nib: the stroke as an outline that swells and thins
    fat: function(ctx, s, alpha, hand, unit) {
      const p = s.p, n = p.length / 3;
      const base = hand.width * s.w * unit * 0.5;
      const left = [], right = [];
      let smooth = p[2];
      for (let i = 0; i < n; i++) {
        const a = Math.max(0, i - 1), b = Math.min(n - 1, i + 1);
        let dx = p[b * 3] - p[a * 3], dy = p[b * 3 + 1] - p[a * 3 + 1];
        const len = Math.hypot(dx, dy) || 1;
        dx /= len; dy /= len;
        let half;
        if (hand.nib) {
          // a broad nib held at about 35 degrees
          half = base * (0.16 + 0.84 * Math.abs(dx * 0.57 + dy * 0.82));
        } else {
          smooth = lerp(smooth, p[i * 3 + 2], 0.5);
          half = base * (0.14 + 0.86 * smooth * smooth);
        }
        const end = Math.min(i, n - 1 - i);
        if (n > 3 && end < 2) half *= end === 0 ? 0.25 : 0.7;
        left.push(p[i * 3] - dy * half, p[i * 3 + 1] + dx * half);
        right.push(p[i * 3] + dy * half, p[i * 3 + 1] - dx * half);
      }
      ctx.globalAlpha = clamp(alpha * 0.9, 0, 1);
      ctx.beginPath();
      const curve = function(points, reverse) {
        const count = points.length / 2;
        for (let j = 0; j < count; j++) {
          const i = reverse ? count - 1 - j : j;
          const next = reverse ? i - 1 : i + 1;
          const x = points[i * 2], y = points[i * 2 + 1];
          if (j === 0 && !reverse) ctx.moveTo(x, y);
          else if (j === 0 || j === count - 1) ctx.lineTo(x, y);
          else ctx.quadraticCurveTo(x, y, (x + points[next * 2]) / 2, (y + points[next * 2 + 1]) / 2);
        }
      };
      curve(left, false);
      curve(right, true);
      ctx.closePath();
      ctx.fill();
      ctx.globalAlpha = 1;
    },

    render: function() {
      const surface = this.surface, scene = this.scene, env = this.env;
      const paper = env.palette().paper;
      if (!this.gl) {
        // without WebGL: the map as a soft tint, the strokes on top
        const ctx = this.flat;
        if (!ctx) return;
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.globalAlpha = 1;
        ctx.fillStyle = U.css(paper);
        ctx.fillRect(0, 0, surface.canvas.width, surface.canvas.height);
        ctx.globalAlpha = 0.32 * smoothstep(0, 0.6, this.progress);
        ctx.drawImage(this.map, 0, 0, surface.canvas.width, surface.canvas.height);
        ctx.globalAlpha = 1;
        ctx.drawImage(this.ink, 0, 0);
        const footer = surface.kind === 'footer', h = surface.canvas.height;
        const fade = ctx.createLinearGradient(0, footer ? 0 : h, 0, footer ? h * 0.5 : h * 0.5);
        fade.addColorStop(0, U.css(paper, 1));
        fade.addColorStop(1, U.css(paper, 0));
        ctx.fillStyle = fade;
        ctx.fillRect(0, 0, surface.canvas.width, h);
        return;
      }
      const gl = this.gl, u = this.uniforms;
      if (this.touched) {
        this.upload('ink', this.ink);
        this.touched = false;
      }
      gl.viewport(0, 0, surface.canvas.width, surface.canvas.height);
      gl.uniform2f(u.res, surface.canvas.width, surface.canvas.height);
      gl.uniform1f(u.dpr, surface.dpr);
      gl.uniform1f(u.s, this.s);
      gl.uniform1f(u.x0, this.x0);
      gl.uniform1f(u.width, this.widthV);
      gl.uniform1f(u.footer, surface.kind === 'footer' ? 1 : 0);
      gl.uniform1f(u.dark, env.dark ? 1 : 0);
      gl.uniform3f(u.paper, paper[0], paper[1], paper[2]);
      gl.uniform1f(u.progress, this.progress);
      gl.uniform1f(u.old, this.old);
      gl.uniform1f(u.seed, scene.seed);
      gl.uniform1f(u.grain, scene.hand.grain);
      gl.uniform1f(u.inkWet, scene.hand.brush ? 1 : scene.hand.nib ? 0.55 : 0);
      gl.uniform1f(u.gran, scene.gran);
      gl.uniform1f(u.wet, scene.wet);
      gl.uniform1f(u.value, scene.value);
      gl.uniform1f(u.clear, scene.clear);
      gl.uniform1f(u.tension, scene.tension);
      gl.uniform4f(u.rows, scene.layout.base, scene.layout.pitch, scene.layout.rows, scene.layout.across ? 1 : 0);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    },

    destroy: function() {
      this.surface.canvas.removeEventListener('webglcontextlost', this.onLost);
      this.surface.canvas.removeEventListener('webglcontextrestored', this.onRestored);
    }
  };

  LucumrArt.register('trace', {
    title: 'The post draws itself',
    create: function(env) {
      const bands = env.surfaces.map(function(surface) { return new Band(env, surface); });
      // a band that was off screen writes itself when it is first seen
      const watcher = new IntersectionObserver(function(entries) {
        if (entries.some(function(entry) { return entry.isIntersecting; })) env.invalidate();
      }, { threshold: 0 });
      env.surfaces.forEach(function(surface) { watcher.observe(surface.el); });

      return {
        setPost: function(post, info) {
          bands.forEach(function(band) {
            if (!info.initial) band.retire();
            band.scene = buildScene(post, band.surface.kind);
            band.progress = 0;
            band.started = false;
            band.dirty = true;
          });
        },
        resize: function() {
          bands.forEach(function(band) { band.dirty = true; band.old = 0; });
        },
        setTheme: function() {
          bands.forEach(function(band) { band.dirty = true; });
        },
        frame: function(now, dt) {
          let more = false;
          bands.forEach(function(band) {
            if (!band.scene) return;
            if (!band.started) {
              if (!env.still && !band.surface.visible) return;
              band.started = true;
            }
            if (env.still) { band.progress = 1; band.old = 0; }
            if (band.dirty) band.prepare();
            band.write(band.progress);
            band.render();
            if (band.progress < 1 || band.old > 0) {
              band.progress = Math.min(1, band.progress + dt / DURATION);
              band.old = Math.max(0, band.old - dt / FADE);
              more = true;
            }
          });
          return more;
        },
        destroy: function() {
          watcher.disconnect();
          bands.forEach(function(band) { band.destroy(); });
        }
      };
    }
  });
})();
