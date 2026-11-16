// Proposal 4: Sketchbook margins.
//
// Pencil doodles, as an engineer leaves them in the margins of a notebook,
// over a loose watercolour wash.  On the dark theme the pencil is white and
// the wash is chalk rubbed onto blue paper.
//
// - Every tag has a doodle: `def(tag, aspect, draw)` further down, one small
//   function over the stroke helpers of `Pen`.  Subject tags are a drawing,
//   register tags handwriting (they also decide the hand, through post.loose
//   and post.energy, and write the notes between the drawings), project tags
//   a small stamp in their own colour.  A tag nobody described gets a figure
//   from its name, labelled; a page without tags the blog's blues.
// - The facets of a post (what a classifier said about its text) tell posts
//   with the same tags apart: see reading().  They decide which form the `ai`
//   doodle takes, how close the view is, the weather of the wash, what is
//   struck out, the line, the notes, the cup rings, the ruled scale.
// - The header is a margin strip, the footer the notebook page: the same
//   doodles larger and with more detail, smaller studies above them, and the
//   date of the post written between.
// - A band is laid out from its middle outwards in units of its height, and
//   every slot draws from its own seed: a wider window shows more slots, it
//   does not reshuffle the ones that were there.
// - Drawn on 2D canvases, wash and pencil as separate layers.  Once it is
//   painted the washes flow: a slow wave runs through them under the pencil
//   lines (see flowOf() and air()), a few frames a second.
(function() {
  'use strict';
  const U = LucumrArt.util;
  const TAU = Math.PI * 2;
  const lerp = U.lerp, clamp = U.clamp, noise1 = U.noise1, smoothstep = U.smoothstep;
  const END = 2.6;      // seconds until the picture is finished

  // ---- geometry ------------------------------------------------------------

  // Catmull-Rom through `pts`, sampled about every `step`.
  function spline(pts, closed, step) {
    const out = [], n = pts.length;
    if (n < 3 && !closed) {
      return pts.map(function(q) { return [q[0], q[1]]; });
    }
    const at = function(i) { return closed ? pts[((i % n) + n) % n] : pts[clamp(i, 0, n - 1)]; };
    const segs = closed ? n : n - 1;
    for (let i = 0; i < segs; i++) {
      const p0 = at(i - 1), p1 = at(i), p2 = at(i + 1), p3 = at(i + 2);
      const m = Math.max(2, Math.ceil(Math.hypot(p2[0] - p1[0], p2[1] - p1[1]) / step));
      for (let j = 0; j < m; j++) {
        const t = j / m, t2 = t * t, t3 = t2 * t;
        out.push([
          0.5 * (2 * p1[0] + (p2[0] - p0[0]) * t + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 +
            (3 * p1[0] - p0[0] - 3 * p2[0] + p3[0]) * t3),
          0.5 * (2 * p1[1] + (p2[1] - p0[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 +
            (3 * p1[1] - p0[1] - 3 * p2[1] + p3[1]) * t3)
        ]);
      }
    }
    const last = closed ? pts[0] : pts[n - 1];
    out.push([last[0], last[1]]);
    return out;
  }

  function ngon(x, y, r, n, rot) {
    const out = [];
    for (let i = 0; i < n; i++) {
      const a = (rot || 0) + i / n * TAU;
      out.push([x + Math.cos(a) * r, y + Math.sin(a) * r]);
    }
    return out;
  }
  function rectPts(x, y, w, h) { return [[x, y], [x + w, y], [x + w, y + h], [x, y + h]]; }
  // a cheap isometric projection for boxes
  function iso(x, y, z) { return [(x - y) * 0.866, (x + y) * 0.5 - z]; }

  // ---- lettering -----------------------------------------------------------
  // Block capitals as an engineer letters a drawing: strokes on a 4x6 grid,
  // "xy" pairs; ~ is a curve through the points, . a dot.
  const FONT = {
    A: '002640 1232', B: '0006 ~062635342303 ~033342413000', C: '~4536160501103041',
    D: '0006 ~062644422000', E: '40000646 0333', F: '000646 0333', G: '~4536160501103041 414323',
    H: '0006 4046 0343', J: '~3631201001', K: '0006 4602 1340', L: '060040', M: '0006234640',
    N: '00064046', O: '~26050120414526', P: '0006 ~062635342303', Q: '~26050120414526 2240',
    R: '0006 ~062635342303 2340', S: '~453616050413334241301001', T: '2026 0646', U: '~060110304146',
    V: '062046', W: '0610233046', X: '0046 0640', Y: '062346 2320', Z: '06460040',
    0: '~26050120414526', 2: '~051636454300 0040', 3: '~05163645443313 ~334241301001', 4: '30360242',
    5: '460603 ~03244341301001', 6: '~453616050110304142331302', 7: '064610',
    8: '~26050423424120010223444526', 9: '~011030414536160504133344',
    '+': '0343 2125', '-': '0343', '=': '0444 0242', '<': '450341', '>': '054301', '/': '0046',
    '*': '2125 0442 0244', '?': '~05163645442322 .20', '&': '~4014152635340201102042',
    '#': '1016 3036 0444 0242', '(': '~36141230', ')': '~16343210', '[': '36161030', ']': '16363010',
    '_': '0040', '^': '042644', '~': '~02133243',
    I: '1016', 1: '041610', '.': '.10', ':': '.10 .14', '!': '1612 .10', '|': '1016', "'": '1614'
  };
  const NARROW = "I1.:!|'";

  // ---- the hand ------------------------------------------------------------

  // loose/energy (0..1) to what the pencil does
  // `read` is what the facets say (see reading()): an assertive post is one
  // firm line, a searching one is drawn lightly and several times over.
  function makeHand(loose, energy, read) {
    const hand = baseHand(loose, energy);
    if (read && read.known) {
      const sure = read.certainty;
      hand.twice = lerp(hand.twice, lerp(0.85, 0.03, sure), 0.65);
      hand.thrice = clamp((0.45 - sure) * 1.2, 0, 0.5);
      hand.press *= lerp(0.84, 1.14, sure);
      hand.jit *= lerp(1.5, 0.8, sure);
    }
    return hand;
  }
  function baseHand(loose, energy) {
    return {
      loose: loose, energy: energy,
      wobble: lerp(0.3, 1.9, loose),        // px a line strays
      jit: lerp(0.3, 1.3, loose),           // px an end point misses
      bow: lerp(0.004, 0.022, loose),       // how much a straight line bends
      over: lerp(4.5, 0.8, loose),          // px a precise hand overshoots corners
      twice: lerp(0.1, 0.62, energy),       // how often a line is drawn twice
      thrice: 0,                            // ... and of those, how often a third time
      press: lerp(0.82, 1.18, energy)       // pressure
    };
  }

  // A pen draws in a doodle's own coordinates (the doodle is about 2 high,
  // -1..1, y down) and records wobbly strokes in pixels.  `sink` gets strokes,
  // `washes` gets the bits of colour a doodle puts under itself.
  function Pen(sink, washes, rand, hand, tf, detail, tag, extra) {
    this.sink = sink;
    this.washes = washes;
    this.r = rand;
    this.hand = hand;
    this.tf = tf;                 // { x, y, s, rot }
    this.cos = Math.cos(tf.rot);
    this.sin = Math.sin(tf.rot);
    this.d = detail;              // 0 header (small), 1 footer (large, more detail)
    this.tag = tag;
    this.px = 1 / tf.s;           // one pixel in local units
    this.amp = clamp(tf.s / 75, 0.5, 1.25);
    this.lw = 0.86 + 0.26 * this.amp;
    this.st = extra.st || { n: 0, seed: rand.int(1 << 20) };
    this.ex = extra;              // { press, post, color, slant, mirror, st }
  }
  const P = Pen.prototype;

  P.pt = function(x, y) {
    const t = this.tf;
    return [t.x + (x * this.cos - y * this.sin) * t.s, t.y + (x * this.sin + y * this.cos) * t.s];
  };
  // a pen for a part: moved, scaled, turned
  P.sub = function(x, y, s, rot) {
    const o = this.pt(x, y);
    const pen = new Pen(this.sink, this.washes, this.r, this.hand,
      { x: o[0], y: o[1], s: this.tf.s * (s || 1), rot: this.tf.rot + (rot || 0) },
      this.d, this.tag, Object.assign({}, this.ex, { st: this.st }));
    pen.amp = this.amp;
    pen.lw = this.lw;
    return pen;
  };

  // The one place strokes are made: `pts` are pixels, dense.
  P._emit = function(pts, o) {
    o = o || {};
    const n = pts.length;
    if (n < 2) return;
    const hand = this.hand;
    const cum = new Float32Array(n);
    let total = 0;
    for (let i = 1; i < n; i++) {
      total += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
      cum[i] = total;
    }
    if (total < 0.01) return;
    const pr = (o.w === undefined ? 1 : o.w) * hand.press * (this.ex.press || 1);
    const amp = hand.wobble * this.amp * (o.wob === undefined ? 1 : o.wob) * Math.min(1, Math.sqrt(total / 50));
    const seed = this.st.seed + (this.st.n++) * 17;
    const half = this.lw * (0.34 + 0.38 * Math.min(pr, 1.8));
    const xs = new Float32Array(n), ys = new Float32Array(n), ws = new Float32Array(n);
    const lead = Math.min(6, total * 0.3) + 0.01;
    for (let i = 0; i < n; i++) {
      const s = cum[i];
      xs[i] = pts[i][0] + amp * (noise1(s * 0.03, seed) - noise1(0, seed) * 0.6);
      ys[i] = pts[i][1] + amp * (noise1(s * 0.03, seed + 5) - noise1(0, seed + 5) * 0.6);
      const taper = Math.min(1, 0.45 + s / lead * 0.55, 0.35 + (total - s) / lead * 0.65);
      ws[i] = half * taper * (0.86 + 0.3 * noise1(s * 0.07, seed + 9) + 0.14 * (1 - s / total));
    }
    this.sink.push({
      xs: xs, ys: ys, ws: ws, len: total, t0: 0, t1: 0,
      a: clamp(0.26 + 0.5 * pr, 0.12, 1),
      rgb: o.c ? (o.c === 1 ? this.tag.rgb : o.c) : (this.ex.color || null)
    });
  };

  P._passes = function(o) {
    if (o.twice === false) return 1;
    if (o.twice === true) return 2;
    const light = o.w !== undefined && o.w < 0.6;
    if (this.r() >= this.hand.twice * (light ? 0.3 : 1)) return 1;
    return this.hand.thrice && this.r() < this.hand.thrice ? 3 : 2;
  };
  function second(o) {
    const c = {};
    for (const k in o) c[k] = o[k];
    c.w = (o.w === undefined ? 1 : o.w) * 0.72;
    return c;
  }

  // a line between two pixel points, as a hand draws it
  P._line = function(a, b, o, pass) {
    const r = this.r, h = this.hand;
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (len < 0.3) return;
    const ux = (b[0] - a[0]) / len, uy = (b[1] - a[1]) / len;
    const over = (o.over === undefined ? h.over : o.over) * Math.min(1, len / 30);
    const j = h.jit * this.amp * (pass ? 1.7 : 1) * Math.min(1, len / 12);
    const e0 = r.range(-0.2, 1) * over, e1 = r.range(-0.2, 1) * over;
    const ax = a[0] - ux * e0 + r.gauss() * j, ay = a[1] - uy * e0 + r.gauss() * j;
    const bx = b[0] + ux * e1 + r.gauss() * j, by = b[1] + uy * e1 + r.gauss() * j;
    const bow = r.gauss() * h.bow * len * (o.wob === undefined ? 1 : o.wob);
    const n = Math.max(2, Math.ceil(len / 3) + 1);
    const pts = [];
    for (let i = 0; i < n; i++) {
      const t = i / (n - 1), k = bow * 4 * t * (1 - t);
      pts.push([lerp(ax, bx, t) - uy * k, lerp(ay, by, t) + ux * k]);
    }
    this._emit(pts, pass ? second(o) : o);
  };

  P.line = function(x1, y1, x2, y2, o) {
    o = o || {};
    const a = this.pt(x1, y1), b = this.pt(x2, y2), n = this._passes(o);
    for (let k = 0; k < n; k++) this._line(a, b, o, k);
  };
  // straight segments; { closed }, { join } keeps the pencil on the paper
  P.path = function(pts, o) {
    o = o || {};
    const self = this;
    const px = pts.map(function(q) { return self.pt(q[0], q[1]); });
    if (o.closed) px.push(px[0]);
    if (o.join) {
      const dense = [];
      for (let i = 0; i + 1 < px.length; i++) {
        const a = px[i], b = px[i + 1];
        const m = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 3));
        for (let j = 0; j < m; j++) dense.push([lerp(a[0], b[0], j / m), lerp(a[1], b[1], j / m)]);
      }
      dense.push(px[px.length - 1]);
      const n = this._passes(o);
      for (let k = 0; k < n; k++) this._emit(dense, k ? second(o) : o);
      return;
    }
    for (let i = 0; i + 1 < px.length; i++) {
      const n = this._passes(o);
      for (let k = 0; k < n; k++) this._line(px[i], px[i + 1], o, k);
    }
  };
  P.rect = function(x, y, w, h, o) { this.path(rectPts(x, y, w, h), Object.assign({ closed: true }, o)); };
  P.box = function(cx, cy, w, h, o) { this.rect(cx - w / 2, cy - h / 2, w, h, o); };

  // a smooth curve through local points
  P.curve = function(pts, o) {
    o = o || {};
    const self = this, r = this.r, n = this._passes(o);
    const j = this.hand.jit * this.amp;
    for (let k = 0; k < n; k++) {
      const px = pts.map(function(q) {
        const v = self.pt(q[0], q[1]);
        const jj = j * (k ? 1.5 : 0.6);
        return [v[0] + r.gauss() * jj, v[1] + r.gauss() * jj];
      });
      const dense = spline(px, !!o.closed, 3);
      if (o.closed) {       // a closed shape drawn by hand overlaps its start a little
        const extra = Math.min(dense.length - 1, 2 + r.int(4));
        for (let i = 1; i <= extra; i++) dense.push(dense[i]);
      }
      this._emit(dense, k ? second(o) : o);
    }
  };

  // ellipse / circle: never quite closed, or closed twice
  P.ellipse = function(x, y, rx, ry, rot, o) {
    o = o || {};
    const r = this.r, c = this.pt(x, y), s = this.tf.s, h = this.hand;
    const n = this._passes(o);
    for (let k = 0; k < n; k++) {
      const RX = rx * s * (1 + r.gauss() * 0.03 * (0.4 + h.loose)), RY = ry * s * (1 + r.gauss() * 0.03 * (0.4 + h.loose));
      const big = Math.max(RX, RY);
      const a0 = o.a0 !== undefined ? o.a0 : r() * TAU;
      const sweep = o.sweep !== undefined ? o.sweep : TAU + r.range(0.08, 0.5) * Math.min(1, big / 5);
      const drift = o.sweep !== undefined ? 0 : r.range(-0.05, 0.05) * (0.4 + h.loose);
      const ang = (rot || 0) + this.tf.rot;
      const ca = Math.cos(ang), sa = Math.sin(ang);
      const m = Math.max(6, Math.ceil(Math.abs(sweep) * big / 2.5));
      const ox = r.gauss() * h.jit * 0.5 * this.amp, oy = r.gauss() * h.jit * 0.5 * this.amp;
      const pts = [];
      for (let i = 0; i <= m; i++) {
        const t = i / m, a = a0 + sweep * t, q = 1 + drift * (t - 0.5);
        const ex = Math.cos(a) * RX * q, ey = Math.sin(a) * RY * q;
        pts.push([c[0] + ox + ex * ca - ey * sa, c[1] + oy + ex * sa + ey * ca]);
      }
      this._emit(pts, k ? second(o) : o);
    }
  };
  P.circle = function(x, y, rad, o) { this.ellipse(x, y, rad, rad, 0, o); };
  P.arc = function(x, y, rad, a0, a1, o) {
    this.ellipse(x, y, rad, rad, 0, Object.assign({ a0: a0, sweep: a1 - a0 }, o));
  };

  // a pressed dot
  P.dot = function(x, y, o) {
    o = o || {};
    const c = this.pt(x, y), r = this.r, rad = (o.r || 1.1) * (0.7 + 0.4 * this.amp);
    const a0 = r() * TAU, pts = [];
    const turns = Math.max(1.2, rad / 0.9);
    const m = Math.ceil(turns * 8);
    for (let i = 0; i <= m; i++) {
      const t = i / m, a = a0 + t * turns * TAU, q = rad * (1 - 0.85 * t);
      pts.push([c[0] + Math.cos(a) * q, c[1] + Math.sin(a) * q]);
    }
    this._emit(pts, { w: o.w || 1.25, wob: 0, c: o.c });
  };
  // a small circle, { fill } scribbles it in
  P.node = function(x, y, rad, o) {
    o = o || {};
    this.circle(x, y, rad, o);
    if (o.fill) this.dot(x, y, { r: rad * this.tf.s * 0.8 / (0.7 + 0.4 * this.amp), c: o.c, w: 1 });
  };

  P.dash = function(x1, y1, x2, y2, o) {
    o = o || {};
    const a = this.pt(x1, y1), b = this.pt(x2, y2), r = this.r;
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (len < 1) return;
    const ux = (b[0] - a[0]) / len, uy = (b[1] - a[1]) / len;
    const d = (o.dash || 5) * (0.8 + 0.3 * this.amp), g = (o.gap || 3.2) * (0.8 + 0.3 * this.amp);
    const oo = Object.assign({}, o, { twice: false, over: 0 });
    let s = 0, i = 0;
    while (s < len) {
      const dl = (o.dot && i % 2 ? 1.2 : d) * r.range(0.8, 1.2);
      const e = Math.min(len, s + dl);
      this._line([a[0] + ux * s, a[1] + uy * s], [a[0] + ux * e, a[1] + uy * e], oo, 0);
      s = e + g * r.range(0.8, 1.2);
      i++;
    }
  };

  // the two strokes of an arrow head at (x2, y2)
  P.head = function(x1, y1, x2, y2, o) {
    o = o || {};
    const a = this.pt(x1, y1), b = this.pt(x2, y2);
    const ang = Math.atan2(b[1] - a[1], b[0] - a[0]);
    const l = (o.head || 6) * (0.75 + 0.35 * this.amp);
    const oo = Object.assign({}, o, { over: 0, twice: false });
    for (let s = -1; s <= 1; s += 2) {
      const q = ang + Math.PI + s * this.r.range(0.38, 0.55);
      this._line([b[0] + Math.cos(q) * l, b[1] + Math.sin(q) * l], b, oo, 0);
    }
  };
  P.arrow = function(x1, y1, x2, y2, o) {
    o = o || {};
    if (o.dashed) this.dash(x1, y1, x2, y2, o);
    else this.line(x1, y1, x2, y2, Object.assign({ over: 0 }, o));
    this.head(x1, y1, x2, y2, o);
    if (o.both) this.head(x2, y2, x1, y1, o);
  };

  // parallel strokes inside one or several closed loops (even-odd)
  P.hatch = function(loops, ang, o) {
    o = o || {};
    if (typeof loops[0][0] === 'number') loops = [loops];
    const self = this, r = this.r;
    const L = loops.map(function(l) { return l.map(function(q) { return self.pt(q[0], q[1]); }); });
    // the shading falls the other way when the post looks back (ex.mirror)
    const a = (this.ex.mirror ? Math.PI - ang : ang) + this.tf.rot + r.range(-0.07, 0.07);
    const dx = Math.cos(a), dy = Math.sin(a), nx = -dy, ny = dx;
    let lo = Infinity, hi = -Infinity;
    L.forEach(function(l) {
      l.forEach(function(q) {
        const d = q[0] * nx + q[1] * ny;
        lo = Math.min(lo, d);
        hi = Math.max(hi, d);
      });
    });
    const sp = (o.sp || 3.3) * (0.7 + 0.5 * this.amp);
    const oo = { w: o.w || 0.55, over: 0, c: o.c, wob: 0.6, twice: false };
    let flip = false;
    for (let d = lo + sp * r.range(0.3, 0.8); d < hi; d += sp * r.range(0.75, 1.25)) {
      const hits = [];
      L.forEach(function(l) {
        for (let i = 0; i < l.length; i++) {
          const A = l[i], B = l[(i + 1) % l.length];
          const da = A[0] * nx + A[1] * ny - d, db = B[0] * nx + B[1] * ny - d;
          if ((da < 0) !== (db < 0)) {
            const t = da / (da - db);
            hits.push((A[0] + (B[0] - A[0]) * t) * dx + (A[1] + (B[1] - A[1]) * t) * dy);
          }
        }
      });
      hits.sort(function(x, y) { return x - y; });
      for (let i = 0; i + 1 < hits.length; i += 2) {
        let s0 = hits[i] + r.range(-0.6, 1.4), s1 = hits[i + 1] - r.range(-0.6, 1.4);
        if (s1 - s0 < 1.2) continue;
        if (o.ragged) s1 = lerp(s0, s1, r.range(1 - o.ragged, 1));
        const A = [nx * d + dx * s0, ny * d + dy * s0], B = [nx * d + dx * s1, ny * d + dy * s1];
        if (flip) this._line(B, A, oo, 0); else this._line(A, B, oo, 0);
        flip = !flip;
      }
    }
  };

  // zigzag between two points (a resistor, a spring)
  P.zig = function(x1, y1, x2, y2, amp, n, o) {
    const pts = [[x1, y1]];
    const dx = x2 - x1, dy = y2 - y1, len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len, ny = dx / len;
    for (let i = 0; i < n; i++) {
      const t = (i + 0.5) / n, s = i % 2 ? -1 : 1;
      pts.push([x1 + dx * t + nx * amp * s, y1 + dy * t + ny * amp * s]);
    }
    pts.push([x2, y2]);
    this.path(pts, Object.assign({ join: true }, o));
  };
  // going back and forth over something: crossing out, filling in
  P.scribble = function(x1, y1, x2, y2, amp, o) {
    o = o || {};
    const a = this.pt(x1, y1), b = this.pt(x2, y2), r = this.r;
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    const ux = (b[0] - a[0]) / len, uy = (b[1] - a[1]) / len;
    const A = amp * this.tf.s, pitch = (o.pitch || 3.2) * (0.7 + 0.5 * this.amp);
    const n = Math.max(3, Math.round(len / pitch));
    const ctl = [];
    for (let i = 0; i <= n; i++) {
      const t = i / n, s = (i % 2 ? -1 : 1) * A * r.range(0.6, 1.1);
      ctl.push([a[0] + ux * len * t - uy * s + ux * s * 0.5, a[1] + uy * len * t + ux * s + uy * s * 0.5]);
    }
    this._emit(spline(ctl, false, 2.5), { w: o.w || 0.9, c: o.c, wob: 0.4 });
  };

  // a line of cursive-like loops: handwriting too far away to read
  P.scrawl = function(x, y, w, o) {
    o = o || {};
    const r = this.r, h = o.h || 0.09, adv = h * 0.78;
    const slant = o.slant === undefined ? (this.ex.slant === undefined ? 0.28 : this.ex.slant) : o.slant;
    let cx = x;
    const end = x + w;
    while (cx < end - adv) {
      const letters = Math.min(1 + r.int(7), Math.max(1, Math.floor((end - cx) / adv)));
      const pts = [];
      for (let i = 0; i < letters; i++) {
        const kind = r();
        const hh = h * (kind < 0.16 ? r.range(1.7, 2.1) : kind < 0.26 ? -r.range(0.7, 1) : r.range(0.7, 1.1));
        const loop = kind < 0.26 ? r.range(0.25, 0.5) : r.chance(0.45) ? r.range(0.2, 0.5) : r.range(0, 0.12);
        for (let j = 0; j < 8; j++) {
          const u = j / 8;
          const yy = hh * (0.5 - 0.5 * Math.cos(TAU * u));
          const xx = cx + adv * (i + u) + loop * adv * Math.sin(TAU * u) + slant * yy;
          pts.push(this.pt(xx, y - yy));
        }
      }
      pts.push(this.pt(cx + adv * letters, y));
      this._emit(spline(pts, false, 2.2), { w: o.w || 0.85, c: o.c, wob: 0.5 });
      if (r.chance(0.3)) this.dot(cx + adv * r.range(0.3, letters), y - h * 1.6, { r: 0.7, c: o.c, w: 0.9 });
      cx += adv * (letters + r.range(1, 1.7));
    }
    return cx;
  };

  // block capitals; x, y is the left end of the baseline, h the cap height
  P.text = function(str, x, y, h, o) {
    o = o || {};
    str = String(str).toUpperCase();
    const u = h / 6, r = this.r;
    const adv = function(ch) { return ch === ' ' ? 3 : NARROW.indexOf(ch) >= 0 ? 3.3 : 5.7; };
    let w = 0;
    for (let i = 0; i < str.length; i++) w += adv(str[i]);
    let cx = o.align === 'c' ? x - w * u / 2 : o.align === 'r' ? x - w * u : x;
    const oo = { w: o.w || 0.85, c: o.c, twice: false, over: 0, wob: 0.45, join: true };
    const self = this;
    for (let i = 0; i < str.length; i++) {
      const ch = str[i], g = FONT[ch];
      const by = y + r.gauss() * u * 0.25, sx = 1 + r.gauss() * 0.05;
      if (g) {
        g.split(' ').forEach(function(tok) {
          if (tok[0] === '.') {
            self.dot(cx + (+tok[1]) * u, by - (+tok[2]) * u, { r: 0.8, c: o.c });
            return;
          }
          const smooth = tok[0] === '~';
          if (smooth) tok = tok.slice(1);
          const pts = [];
          for (let k = 0; k < tok.length; k += 2) {
            pts.push([cx + (+tok[k]) * u * sx + r.gauss() * u * 0.12, by - (+tok[k + 1]) * u + r.gauss() * u * 0.12]);
          }
          if (smooth) self.curve(pts, oo); else self.path(pts, oo);
        });
      }
      cx += adv(ch) * u;
    }
    return w * u;
  };

  // colour under the pencil: a loop (or loops) of local points, loosely filled
  P.tint = function(loops, o) {
    o = o || {};
    if (typeof loops[0][0] === 'number') loops = [loops];
    const self = this, r = this.r;
    const off = (1 + 2.5 * this.hand.loose) * this.amp;
    const ox = r.gauss() * off, oy = r.gauss() * off;
    this.washes.push({
      k: 'poly', seed: r.int(1 << 30), rgb: o.rgb || this.tag.rgb, a: o.a === undefined ? 0.5 : o.a,
      evenodd: !!o.evenodd, rough: o.rough === undefined ? 1 : o.rough,
      loops: loops.map(function(l) {
        return l.map(function(q) {
          const v = self.pt(q[0], q[1]);
          return [v[0] + ox, v[1] + oy];
        });
      })
    });
  };
  // the ring a cup leaves
  P.ring = function(x, y, rad, o) {
    o = o || {};
    const c = this.pt(x, y);
    this.washes.push({
      k: 'ring', seed: this.r.int(1 << 30), rgb: o.rgb || this.tag.rgb, a: o.a === undefined ? 0.5 : o.a,
      x: c[0], y: c[1], r: rad * this.tf.s
    });
  };

  // ---- doodles -------------------------------------------------------------
  // def(tag, aspect, draw): `draw(p, r)` draws inside x -aspect..aspect,
  // y -1..1.  Several definitions for a tag are variants, picked by the seed.

  const DOODLES = {};
  function def(name, aspect, draw) {
    (DOODLES[name] = DOODLES[name] || []).push({ a: aspect, draw: draw });
  }
  const C = { w: 0.36, twice: false };          // construction line
  const L = { w: 0.62 };                        // light
  const B = { w: 1.4 };                         // heavy
  const K = { c: 1 };                           // the tag's coloured pencil
  function opt() { return Object.assign.apply(null, [{}].concat(Array.prototype.slice.call(arguments))); }

  // ---- subject tags: what is drawn

  // vcs: a branch-and-merge graph
  def('vcs', 1.7, function(p, r) {
    const a = 1.55, y0 = r.range(0.05, 0.3), n = 5 + r.int(2) + p.d;
    const xs = [];
    for (let i = 0; i < n; i++) xs.push(lerp(-a * 0.86, a * 0.78, i / (n - 1)) + r.range(-0.05, 0.05));
    p.line(-a, y0, a * 0.92, y0, { w: 1.1 });
    const branches = 1 + r.int(2) + p.d;
    for (let b = 0; b < branches; b++) {
      const i0 = r.int(n - 2), i1 = Math.min(n - 1, i0 + 2 + r.int(2));
      const up = (b + (r.chance(0.5) ? 1 : 0)) % 2 ? 1 : -1;
      const yb = y0 + up * (0.4 + 0.26 * (b >> 1) + r.range(0, 0.14));
      const x0 = xs[i0], x1 = xs[i1], open = i1 === n - 1 && r.chance(0.6);
      const ramp = function(xa, ya, xb, yb2) {
        const out = [];
        for (let k = 0; k <= 6; k++) { const t = k / 6; out.push([lerp(xa, xb, t), lerp(ya, yb2, t * t * (3 - 2 * t))]); }
        return out;
      };
      const xe = open ? x1 + 0.12 : Math.max(x0 + 0.5, x1 - 0.4);
      let pts = ramp(x0, y0, x0 + 0.4, yb);
      if (open) pts.push([xe, yb + r.range(-0.03, 0.03)]);
      else pts = pts.concat(ramp(xe, yb, xe + 0.4, y0));
      p.curve(pts, { c: 1, w: 1.15 });
      const m = 1 + r.int(2 + p.d);
      for (let j = 0; j < m; j++) {
        p.node(lerp(x0 + 0.4, xe, (j + 0.5) / m), yb, 0.065, { c: 1, fill: r.chance(0.5) });
      }
      if (open) p.head(xe - 0.2, yb, xe + 0.06, yb, K);
      if (p.d && b === 0) p.text(r.pick(['FIX', 'WIP', 'DEV', 'V2']), x0 + 0.42, yb + up * 0.26 + 0.07, 0.12, L);
    }
    xs.forEach(function(x, i) { p.node(x, y0, 0.072, { fill: i === n - 1 || r.chance(0.3) }); });
    p.head(a * 0.6, y0, a * 0.97, y0, {});
    if (p.d) {
      p.text('MAIN', -a, y0 + 0.3, 0.12, L);
      xs.forEach(function(x) { p.line(x, y0 + 0.14, x, y0 + 0.2, C); });
    }
  });

  // unicode: a glyph with its construction lines
  const GLYPHS = {
    // skeletons in x-heights: x right, y up, baseline 0
    n: { w: 0.78, s: [[[0, 1], [0, 0]], [[0, 0.68], [0.22, 0.95], [0.48, 1.02], [0.7, 0.86], [0.76, 0.55], [0.76, 0]]] },
    o: { w: 0.86, s: [[[0.43, 1.02], [0.1, 0.84], [0, 0.5], [0.1, 0.16], [0.43, -0.02], [0.76, 0.16], [0.86, 0.5], [0.76, 0.84]]], closed: true },
    e: { w: 0.82, s: [[[0.04, 0.52], [0.8, 0.52], [0.72, 0.85], [0.44, 1.02], [0.12, 0.84], [0, 0.5], [0.12, 0.15], [0.44, -0.02], [0.78, 0.2]]] },
    a: { w: 0.76, s: [[[0.1, 0.8], [0.38, 1.02], [0.66, 0.88], [0.72, 0.6], [0.72, 0]],
      [[0.72, 0.56], [0.4, 0.6], [0.08, 0.42], [0.04, 0.2], [0.24, -0.02], [0.5, 0.06], [0.72, 0.3]]] },
    u: { w: 0.78, s: [[[0, 1], [0, 0.35], [0.1, 0.08], [0.36, -0.02], [0.6, 0.12], [0.76, 0.4]], [[0.76, 1], [0.76, 0]]] },
    'ß': { w: 0.78, s: [[[0, -0.02], [0, 1.4], [0.14, 1.7], [0.4, 1.76], [0.62, 1.55], [0.55, 1.2], [0.34, 0.98], [0.62, 0.75],
      [0.74, 0.4], [0.56, 0.08], [0.3, -0.02], [0.16, 0.1]]] },
    s: { w: 0.66, s: [[[0.62, 0.82], [0.36, 1.02], [0.1, 0.9], [0.08, 0.66], [0.32, 0.52], [0.58, 0.38], [0.6, 0.14], [0.34, -0.02], [0.04, 0.14]]] },
    c: { w: 0.74, s: [[[0.72, 0.8], [0.44, 1.02], [0.12, 0.84], [0, 0.5], [0.12, 0.15], [0.44, -0.02], [0.74, 0.2]]] }
  };
  const MARKS = ['diaeresis', 'acute', 'grave', 'tilde', 'ring', 'caron', 'macron', 'cedilla', 'none'];
  const CODEPOINTS = ['U+00E4', 'U+0301', 'U+00DF', 'U+1E9E', 'U+0308', 'U+00F1', 'U+FEFF', 'U+200D', 'U+0142', 'U+00E9'];
  def('unicode', 1.2, function(p, r) {
    const a = 1.15;
    const name = r.pick(Object.keys(GLYPHS)), g = GLYPHS[name];
    const u = 0.62, base = 0.42, x0 = -g.w * u / 2 + r.range(-0.1, 0.1);
    const G = function(q) { return [x0 + q[0] * u, base - q[1] * u]; };
    // guides: baseline, x-height, ascender, descender; side bearings
    p.line(-a, base, a, base, opt(L, { twice: false }));
    p.line(-a, base - u, a, base - u, C);
    p.line(-a * 0.9, base - u * 1.76, a * 0.9, base - u * 1.76, C);
    p.dash(-a * 0.9, base + u * 0.62, a * 0.9, base + u * 0.62, C);
    const lsb = x0 - 0.12, rsb = x0 + g.w * u + 0.12;
    p.line(lsb, -1, lsb, 0.92, C);
    p.line(rsb, -1, rsb, 0.92, C);
    // the glyph as a broad nib leaves it: the skeleton shifted both ways
    const nx = 0.085 * u * 1.6, ny = -0.05 * u * 1.6;
    g.s.forEach(function(sk) {
      const A = sk.map(function(q) { const v = G(q); return [v[0] + nx / 2, v[1] + ny / 2]; });
      const Bk = sk.map(function(q) { const v = G(q); return [v[0] - nx / 2, v[1] - ny / 2]; });
      const sa = spline(A, !!g.closed, 0.03), sb = spline(Bk, !!g.closed, 0.03);
      if (g.closed) {
        p.tint([sa, sb], { a: 0.75 });
        p.tint([sa.concat(sb.slice().reverse())], { a: 0.5 });
      } else {
        p.tint([sa.concat(sb.slice().reverse())], { a: 0.8 });
      }
      p.curve(A, { closed: !!g.closed });
      p.curve(Bk, { closed: !!g.closed });
      if (!g.closed) {
        p.line(A[0][0], A[0][1], Bk[0][0], Bk[0][1], { over: 0 });
        p.line(A[A.length - 1][0], A[A.length - 1][1], Bk[Bk.length - 1][0], Bk[Bk.length - 1][1], { over: 0 });
      }
    });
    // a combining mark above (or below), with its dotted anchor in the footer
    const mark = name === 'ß' ? 'none' : r.pick(MARKS);
    const mx = x0 + g.w * u * 0.5, my = base - u * 1.36;
    if (mark === 'diaeresis') {
      p.dot(mx - 0.13, my, { r: 1.7, w: 1.3 });
      p.dot(mx + 0.13, my, { r: 1.7, w: 1.3 });
    } else if (mark === 'acute') p.line(mx - 0.06, my + 0.08, mx + 0.12, my - 0.1, B);
    else if (mark === 'grave') p.line(mx + 0.06, my + 0.08, mx - 0.12, my - 0.1, B);
    else if (mark === 'tilde') p.curve([[mx - 0.2, my + 0.03], [mx - 0.08, my - 0.06], [mx + 0.08, my + 0.04], [mx + 0.2, my - 0.05]], B);
    else if (mark === 'ring') p.circle(mx, my - 0.02, 0.09, {});
    else if (mark === 'caron') p.path([[mx - 0.14, my - 0.08], [mx, my + 0.06], [mx + 0.14, my - 0.08]], opt(B, { join: true }));
    else if (mark === 'macron') p.line(mx - 0.18, my, mx + 0.18, my, B);
    else if (mark === 'cedilla') p.curve([[mx, base + 0.02], [mx - 0.02, base + 0.14], [mx + 0.08, base + 0.2], [mx - 0.02, base + 0.3], [mx - 0.1, base + 0.27]], {});
    if (mark !== 'none' && mark !== 'cedilla' && p.d) {
      p.dash(mx - 0.3, my - 0.16, mx + 0.3, my - 0.16, opt(C, { dash: 2, gap: 2.5 }));
    }
    // measure of the x-height, a code point
    const ax = rsb + 0.14;
    p.arrow(ax, base - 0.02, ax, base - u + 0.02, opt(L, { both: true, head: 4 }));
    if (p.d) {
      p.text('X', ax + 0.07, base - u * 0.4, 0.1, L);
      p.text(r.pick(CODEPOINTS), -a, base + u * 0.62 + 0.22, 0.11, L);
      p.line(lsb, 0.86, rsb, 0.86, C);
      p.head(lsb + 0.2, 0.86, lsb, 0.86, opt(C, { head: 4 }));
      p.head(rsb - 0.2, 0.86, rsb, 0.86, opt(C, { head: 4 }));
    }
  });

  // databases: stacked cylinders
  def('databases', 0.85, function(p, r) {
    const n = 2 + r.int(2), rx = r.range(0.52, 0.62), ry = 0.17, top = -0.62, hgt = 1.3 / n;
    p.line(0, -0.95, 0, 0.98, opt(C, { dash: 1 }));
    for (let i = 0; i < n; i++) {
      const y = top + i * hgt;
      if (i === 0) p.ellipse(0, y, rx, ry, 0, {});
      p.line(-rx, y, -rx, y + hgt, {});
      p.line(rx, y, rx, y + hgt, {});
      p.ellipse(0, y + hgt, rx, ry, 0, { a0: -0.1, sweep: Math.PI + 0.2 });
      // shade the right side
      const loop = [];
      for (let k = 0; k <= 8; k++) {
        const q = lerp(0.1, 1.25, k / 8);
        loop.push([Math.cos(q) * rx, y + 0.02 + Math.sin(q) * ry]);
      }
      for (let k = 8; k >= 0; k--) {
        const q = lerp(0.1, 1.25, k / 8);
        loop.push([Math.cos(q) * rx, y + hgt - 0.03 + Math.sin(q) * ry]);
      }
      p.hatch(loop, Math.PI / 2 + 0.2, { sp: 3 });
      if (p.d) p.dash(-rx * 0.7, y + hgt * 0.62, rx * 0.1, y + hgt * 0.62, opt(C, { dash: 3 }));
    }
    p.tint([[-rx, top], [rx, top], [rx, top + hgt * n + ry], [-rx, top + hgt * n + ry]], { a: 0.35 });
    if (p.d) {
      p.arrow(rx + 0.45, top + 0.1, rx + 0.08, top + 0.25, opt(L, { head: 4 }));
      p.text(r.pick(['WAL', 'IDX', 'PG', 'ROWS']), rx + 0.2, top + 0.02, 0.11, L);
    }
  });
  // databases: a B-tree
  def('databases', 1.5, function(p, r) {
    const cell = 0.2, hgt = 0.22;
    const node = function(cx, cy, keys) {
      const w = cell * keys, x = cx - w / 2;
      p.rect(x, cy - hgt / 2, w, hgt, {});
      for (let i = 1; i < keys; i++) p.line(x + i * cell, cy - hgt / 2, x + i * cell, cy + hgt / 2, { over: 0.5 });
      for (let i = 0; i < keys; i++) {
        if (p.d) p.text(String(1 + r.int(98)), x + (i + 0.5) * cell, cy + 0.045, 0.085, opt(L, { align: 'c' }));
        else p.line(x + (i + 0.25) * cell, cy, x + (i + 0.75) * cell, cy, C);
      }
      return { x: x, y: cy, w: w, keys: keys };
    };
    const root = node(r.range(-0.1, 0.1), -0.7, 2 + r.int(2));
    const kids = root.keys + 1, span = 2.6;
    const leaves = [];
    for (let i = 0; i < kids; i++) {
      const cx = lerp(-span / 2, span / 2, (i + 0.5) / kids), k = 2 + r.int(2);
      const child = node(cx, -0.02, Math.min(k, 3));
      p.line(root.x + i * cell, root.y + hgt / 2, cx, child.y - hgt / 2, opt(L, { over: 0 }));
      p.dot(root.x + i * cell, root.y + hgt / 2, { r: 0.9 });
      leaves.push(child);
    }
    p.tint(rectPts(root.x, root.y - hgt / 2, root.w, hgt), { a: 0.5 });
    // a hint of the level below
    leaves.forEach(function(c, i) {
      if (!p.d && i % 2) return;
      for (let j = 0; j <= c.keys; j += 1 + r.int(2)) {
        const x = c.x + j * cell, tx = x + (j - c.keys / 2) * 0.12;
        p.line(x, c.y + hgt / 2, tx, 0.56, opt(C, { over: 0 }));
        if (p.d) p.rect(tx - 0.11, 0.58, 0.22, 0.15, L); else p.line(tx - 0.08, 0.58, tx + 0.08, 0.58, L);
      }
    });
    if (p.d) p.hatch(rectPts(leaves[0].x, leaves[0].y - hgt / 2, leaves[0].w, hgt), 0.9, { sp: 3.5 });
  });

  // networking: nodes and edges, a signal travelling
  def('networking', 1.35, function(p, r) {
    const a = 1.25, nodes = [], n = 6 + r.int(3) + 2 * p.d;
    for (let tries = 0; nodes.length < n && tries < 200; tries++) {
      const q = [r.range(-a, a), r.range(-0.85, 0.85)];
      if (nodes.every(function(o) { return Math.hypot(o[0] - q[0], o[1] - q[1]) > 0.5; })) nodes.push(q);
    }
    const edges = [];
    nodes.forEach(function(q, i) {
      const near = nodes.map(function(o, j) { return [Math.hypot(o[0] - q[0], o[1] - q[1]), j]; })
        .filter(function(e) { return e[1] !== i; }).sort(function(x, y) { return x[0] - y[0]; });
      near.slice(0, 1 + r.int(2)).forEach(function(e) {
        const key = Math.min(i, e[1]) + ':' + Math.max(i, e[1]);
        if (edges.indexOf(key) < 0 && e[0] < 1.5) {
          edges.push(key);
          const o = nodes[e[1]];
          if (r.chance(0.2)) p.dash(q[0], q[1], o[0], o[1], L);
          else p.line(q[0], q[1], o[0], o[1], opt(L, { over: 0 }));
          if (r.chance(0.35)) {       // a packet on its way
            const t = r.range(0.3, 0.7), x = lerp(q[0], o[0], t), y = lerp(q[1], o[1], t);
            const ang = Math.atan2(o[1] - q[1], o[0] - q[0]);
            const s = p.sub(x, y, 1, ang);
            s.rect(-0.06, -0.045, 0.12, 0.09, K);
            s.line(-0.12, -0.03, -0.22, -0.03, opt(C, K));
            s.line(-0.12, 0.03, -0.26, 0.03, opt(C, K));
          }
        }
      });
    });
    const hub = r.int(nodes.length);
    nodes.forEach(function(q, i) {
      const rad = i === hub ? 0.12 : r.range(0.06, 0.09);
      p.node(q[0], q[1], rad, { fill: i !== hub && r.chance(0.55) });
      if (i === hub) {
        p.tint(ngon(q[0], q[1], 0.3, 12), { a: 0.5 });
        const a0 = r() * TAU;
        for (let k = 1; k <= 2 + p.d; k++) p.arc(q[0], q[1], 0.12 + k * 0.09, a0, a0 + 1.3, L);
      }
    });
  });

  // types: a lattice (top, bottom, what lies between)
  def('types', 1.0, function(p, r) {
    const rows = [1, 2 + r.int(2), 2 + r.int(2 + p.d), 1];
    if (!p.d && r.chance(0.5)) rows.splice(2, 1);
    const ys = rows.map(function(_, i) { return lerp(-0.82, 0.82, i / (rows.length - 1)); });
    const pos = rows.map(function(n, i) {
      const out = [];
      for (let k = 0; k < n; k++) out.push([n === 1 ? 0 : lerp(-0.72, 0.72, k / (n - 1)) * (n === 2 ? 0.6 : 1), ys[i]]);
      return out;
    });
    for (let i = 0; i + 1 < pos.length; i++) {
      pos[i].forEach(function(q, qi) {
        pos[i + 1].forEach(function(o, oi) {
          const full = pos[i].length === 1 || pos[i + 1].length === 1;
          const rel = pos[i].length > 1 ? qi / (pos[i].length - 1) : 0.5, rel2 = pos[i + 1].length > 1 ? oi / (pos[i + 1].length - 1) : 0.5;
          if (full || Math.abs(rel - rel2) < 0.6) p.line(q[0], q[1], o[0], o[1], { over: 0 });
        });
      });
    }
    pos.forEach(function(row, i) {
      row.forEach(function(q) { p.node(q[0], q[1], 0.06, { fill: i === 0 || i === pos.length - 1 || r.chance(0.25) }); });
    });
    // top and bottom, as the symbols
    p.line(0.2, -0.97, 0.2, -0.86, L);
    p.line(0.13, -0.97, 0.27, -0.97, L);
    p.line(0.2, 0.86, 0.2, 0.97, L);
    p.line(0.13, 0.97, 0.27, 0.97, L);
    const mid = pos[1];
    p.tint([pos[0][0], mid[mid.length - 1], pos[pos.length - 1][0], mid[0]], { a: 0.3 });
    if (p.d) {
      const q = r.pick(mid);
      p.text(r.pick(['T', 'A', 'INT', 'STR']), q[0] + 0.1, q[1] - 0.08, 0.1, L);
    }
  });
  // types: a crystal, cubes sharing faces
  def('types', 1.1, function(p, r) {
    const s = 0.42, cells = [[0, 0, 0], [1, 0, 0], [0, 1, 0]];
    if (r.chance(0.6)) cells.push([0, 0, 1]);
    if (p.d) cells.push(r.pick([[1, 1, 0], [1, 0, 1], [0, 1, 1]]));
    const o = iso(0.8, 0.8, 0.6);
    const q = function(x, y, z) { const v = iso(x * s, y * s, z * s); return [v[0] - o[0] * s, v[1] - o[1] * s + 0.2]; };
    cells.forEach(function(c) {
      const x = c[0], y = c[1], z = c[2];
      const v = [q(x, y, z), q(x + 1, y, z), q(x + 1, y + 1, z), q(x, y + 1, z), q(x, y, z + 1), q(x + 1, y, z + 1), q(x + 1, y + 1, z + 1), q(x, y + 1, z + 1)];
      [[4, 5], [5, 6], [6, 7], [7, 4], [1, 5], [2, 6], [3, 7], [1, 2], [2, 3]].forEach(function(e) {
        p.line(v[e[0]][0], v[e[0]][1], v[e[1]][0], v[e[1]][1], { over: 2 });
      });
      [[0, 1], [0, 3], [0, 4]].forEach(function(e) { p.dash(v[e[0]][0], v[e[0]][1], v[e[1]][0], v[e[1]][1], opt(C, { dash: 3 })); });
      if (r.chance(0.6)) p.hatch([v[1], v[2], v[6], v[5]], 1.2, { sp: 3.2 });
      v.forEach(function(k, i) { if (i !== 0 && r.chance(0.5)) p.dot(k[0], k[1], { r: 1.3 }); });
    });
    const t = q(0, 0, 1), t2 = q(1, 1, 1);
    p.tint([q(0, 0, 1), q(1, 0, 1), q(1, 1, 1), q(0, 1, 1)], { a: 0.45 });
    if (p.d) p.dash(t[0], t[1], t2[0], t2[1], C);
  });

  // rust: gears
  function gear(p, r, cx, cy, R, teeth, phase, o) {
    const depth = Math.min(0.14, R * 0.26), ro = R + depth * 0.5, ri = R - depth * 0.5;
    p.circle(cx, cy, R, opt(C, { twice: false }));
    const step = TAU / teeth, pts = [];
    for (let i = 0; i < teeth; i++) {
      const a = phase + i * step;
      [[-0.25, ri], [-0.16, ro], [0.16, ro], [0.25, ri]].forEach(function(k) {
        pts.push([cx + Math.cos(a + k[0] * step) * k[1], cy + Math.sin(a + k[0] * step) * k[1]]);
      });
    }
    p.path(pts, opt({ closed: true, over: 1.2 }, o));
    p.circle(cx, cy, R * 0.34, o);
    p.circle(cx, cy, R * 0.15, o);
    p.dash(cx - ro - 0.12, cy, cx + ro + 0.12, cy, opt(C, { dot: true, dash: 7 }));
    p.dash(cx, cy - ro - 0.12, cx, cy + ro + 0.12, opt(C, { dot: true, dash: 7 }));
    return pts;
  }
  def('rust', 1.3, function(p, r) {
    const R1 = r.range(0.5, 0.6), t1 = 9 + r.int(4), cx = -0.45, cy = r.range(-0.05, 0.15);
    const t2 = 6 + r.int(3), R2 = R1 * t2 / t1, ang = r.range(-0.7, 0.3);
    const d = R1 + R2 + 0.01, c2x = cx + Math.cos(ang) * d, c2y = cy + Math.sin(ang) * d;
    const ph = r() * TAU;
    const g1 = gear(p, r, cx, cy, R1, t1, ph, {});
    gear(p, r, c2x, c2y, R2, t2, ang + Math.PI + TAU / t2 / 2 - (ph - ang) * t1 / t2, {});
    p.hatch([ngon(cx, cy, R1 * 0.34, 16), ngon(cx, cy, R1 * 0.15, 10)], 0.8, { sp: 2.8 });
    p.tint(g1, { a: 0.5 });
    p.tint(ngon(c2x, c2y, R2, 14), { a: 0.3 });
    if (p.d) {
      p.arc(cx, cy, R1 + 0.2, -2.4, -1.3, L);
      p.head(cx + Math.cos(-1.5) * (R1 + 0.2), cy + Math.sin(-1.5) * (R1 + 0.2), cx + Math.cos(-1.3) * (R1 + 0.2), cy + Math.sin(-1.3) * (R1 + 0.2), L);
      p.text('Z=' + t1, cx - 0.2, cy + R1 + 0.33, 0.1, L);
      p.line(cx, cy, c2x, c2y, C);
    }
  });
  // rust: who owns what, who borrows, for how long
  def('rust', 1.4, function(p, r) {
    const bw = 0.5, bh = 0.3;
    p.rect(-1.25, -0.75, bw, bh, {});
    p.text(r.pick(['A', 'X', 'S', 'V']), -1.0, -0.54, 0.13, { align: 'c' });
    p.rect(0.5, -0.75, bw * 1.3, bh, B);
    p.hatch(rectPts(0.5, -0.75, bw * 1.3, bh), 0.8, { sp: 3.4 });
    p.tint(rectPts(0.5, -0.75, bw * 1.3, bh), { a: 0.55 });
    p.arrow(-1.25 + bw + 0.04, -0.6, 0.46, -0.6, {});
    const n = 2 + p.d;
    for (let i = 0; i < n; i++) {
      const y = -0.1 + i * 0.42, x = -1.05 + i * 0.3 + r.range(-0.05, 0.05);
      const mut = i === n - 1 && r.chance(0.6);
      p.rect(x, y, bw * (mut ? 1.3 : 0.9), bh * 0.85, L);
      p.text(mut ? '&MUT' : '&', x + bw * (mut ? 0.65 : 0.45), y + 0.2, 0.13, opt(K, { align: 'c' }));
      p.curve([[x + bw * (mut ? 1.3 : 0.9) + 0.03, y + 0.12], [x + bw + 0.6, y + 0.05], [0.72 + i * 0.1, -0.2], [0.75 + i * 0.1, -0.43]], opt(K, { w: 0.8 }));
      p.head(0.72 + i * 0.1, -0.25, 0.75 + i * 0.1, -0.43, K);
    }
    // lifetimes as brackets
    const lx = 1.28;
    p.path([[lx - 0.06, -0.8], [lx, -0.8], [lx, 0.6], [lx - 0.06, 0.6]], { join: true });
    p.text("'A", lx + 0.05, -0.05, 0.1, L);
    if (p.d) {
      p.path([[lx - 0.22, -0.05], [lx - 0.16, -0.05], [lx - 0.16, 0.55], [lx - 0.22, 0.55]], opt(L, { join: true }));
    }
  });

  // python: an indentation staircase
  def('python', 1.15, function(p, r) {
    const n = 6 + r.int(2) + p.d, lh = 1.7 / n, ind = 0.3, x0 = -1.05;
    const levels = [];
    let level = 0, dir = 1;
    for (let i = 0; i < n; i++) {
      levels.push(level);
      if (level >= 3 || (level > 0 && r.chance(0.25))) dir = -dir;
      level = clamp(level + (r.chance(0.8) ? dir : 0), i === 0 ? 1 : 0, 3);
      if (level === 0) dir = 1;
    }
    levels.forEach(function(lv, i) {
      const y = -0.85 + (i + 0.5) * lh, opens = i + 1 < n && levels[i + 1] > lv;
      let cx = x0 + lv * ind;
      const words = 1 + r.int(3);
      for (let k = 0; k < words; k++) {       // the tokens of a line, too far away to read
        const wl = r.range(0.12, 0.38);
        p.line(cx, y, cx + wl, y + r.range(-0.01, 0.01), opt(opens ? B : {}, { over: 0 }));
        cx += wl + 0.07;
      }
      if (opens) {
        p.dot(cx, y - lh * 0.16, { r: 1.1 });
        p.dot(cx, y + lh * 0.1, { r: 1.1 });
      }
    });
    // the guides along each level of indentation
    for (let lv = 1; lv <= 3; lv++) {
      let from = -1;
      for (let i = 0; i <= n; i++) {
        const inside = i < n && levels[i] >= lv;
        if (inside && from < 0) from = i;
        if (!inside && from >= 0) {
          const x = x0 + (lv - 1) * ind + 0.04;
          p.line(x, -0.85 + from * lh + lh * 0.1, x, -0.85 + i * lh - lh * 0.1, opt(K, { w: 0.75 }));
          p.tint(rectPts(x, -0.85 + from * lh, ind - 0.06, (i - from) * lh), { a: 0.3, rgb: lv === 2 ? [0.95, 0.78, 0.25] : null });
          from = -1;
        }
      }
    }
    if (p.d) p.line(x0 - 0.08, -0.9, x0 - 0.08, 0.9, C);
  });
  // python: a coiling curve
  def('python', 1.05, function(p, r) {
    const dir = r.chance(0.5) ? 1 : -1, turns = r.range(2.0, 2.6), a0 = r() * TAU, R = 0.84, N = 150;
    const mid = [];
    for (let i = 0; i <= N; i++) {      // from the tail in the middle out to the head
      const t = i / N, a = a0 + dir * t * turns * TAU, rad = R * (0.16 + 0.84 * t) * (t > 0.9 ? 1 + (t - 0.9) * 1.6 : 1);
      mid.push([Math.cos(a) * rad * 1.1, Math.sin(a) * rad * 0.92]);
    }
    const left = [], right = [];
    for (let i = 0; i <= N; i++) {
      const a = mid[Math.max(0, i - 1)], b = mid[Math.min(N, i + 1)];
      const d = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1, t = i / N;
      const w = 0.092 * Math.min(1, 0.1 + t * 2.5) * (t > 0.94 ? 1 + Math.sin((t - 0.94) / 0.06 * Math.PI) * 0.35 : 1);
      const nx = -(b[1] - a[1]) / d, ny = (b[0] - a[0]) / d;
      left.push([mid[i][0] + nx * w, mid[i][1] + ny * w]);
      right.push([mid[i][0] - nx * w, mid[i][1] - ny * w]);
    }
    p.tint(left.concat(right.slice().reverse()), { a: 0.6 });
    const thin = function(pts) { return pts.filter(function(_, i) { return i % 5 === 0 || i === pts.length - 1; }); };
    p.curve(thin(left), {});
    p.curve(thin(right), {});
    // the head, an eye, bands across the back
    const hm = mid[N], pm = mid[N - 6];
    const dx = hm[0] - pm[0], dy = hm[1] - pm[1], dl = Math.hypot(dx, dy) || 1;
    p.curve([left[N], [hm[0] + dx / dl * 0.1, hm[1] + dy / dl * 0.1], right[N]], {});
    p.dot(mid[N - 3][0] + dy / dl * 0.03, mid[N - 3][1] - dx / dl * 0.03, { r: 1.2 });
    for (let i = 14 + r.int(6); i < N - 10; i += 5 + r.int(5)) {
      p.line(left[i][0], left[i][1], right[i + 1][0], right[i + 1][1], opt(L, { over: 0 }));
      if (r.chance(0.3)) p.tint([left[i], left[i + 4], right[i + 4], right[i]], { a: 0.7, rgb: [0.95, 0.78, 0.25] });
    }
    if (p.d) {
      p.dash(-1, 0, 1, 0, opt(C, { dot: true }));
      p.dash(0, -0.95, 0, 0.95, opt(C, { dot: true }));
    }
  });

  // web: boxes inside boxes
  def('web', 1.3, function(p, r) {
    const x = -1.2, y = -0.85, w = 2.4, h = 1.7;
    p.rect(x, y, w, h, {});
    p.line(x, y + 0.22, x + w, y + 0.22, {});
    for (let i = 0; i < 3; i++) p.circle(x + 0.12 + i * 0.13, y + 0.11, 0.04, L);
    p.rect(x + 0.55, y + 0.06, w - 0.75, 0.1, L);
    const side = r.chance(0.5), sw = 0.6;
    const cx = side ? x + sw + 0.1 : x + 0.1, cw = w - 0.2 - (side ? sw : 0);
    if (side) {
      p.rect(x + 0.08, y + 0.32, sw - 0.06, h - 0.42, L);
      for (let i = 0; i < 4 + p.d * 2; i++) p.line(x + 0.16, y + 0.48 + i * 0.16, x + 0.16 + r.range(0.2, 0.4), y + 0.48 + i * 0.16, K);
    }
    // an image placeholder, crossed
    const ih = r.range(0.45, 0.6), iw = cw * r.range(0.45, 0.62);
    p.rect(cx, y + 0.32, iw, ih, {});
    p.line(cx, y + 0.32, cx + iw, y + 0.32 + ih, opt(L, { over: 0 }));
    p.line(cx + iw, y + 0.32, cx, y + 0.32 + ih, opt(L, { over: 0 }));
    p.tint(rectPts(cx, y + 0.32, iw, ih), { a: 0.5 });
    // text lines, a link underlined
    const tx = cx + iw + 0.1, tw = cw - iw - 0.1;
    for (let i = 0; i < 3; i++) p.scrawl(tx, y + 0.46 + i * 0.17, tw * r.range(0.6, 1), { h: 0.05, w: 0.7 });
    const by = y + 0.32 + ih + 0.14;
    for (let i = 0; i < 2 + p.d; i++) {
      const yy = by + i * 0.15;
      if (yy > y + h - 0.2) break;
      p.scrawl(cx, yy + 0.06, cw * r.range(0.55, 0.95), { h: 0.05, w: 0.7 });
    }
    p.rect(cx + cw - 0.5, y + h - 0.24, 0.42, 0.15, K);
    p.line(cx, y + h - 0.1, cx + 0.4, y + h - 0.1, K);
    if (p.d) {
      p.rect(cx + 0.03, y + 0.36, iw * 0.4, ih * 0.4, C);
      p.text('<A>', cx, y + h - 0.14, 0.09, L);
    }
  });

  // web: pages that link to each other
  def('web', 1.4, function(p, r) {
    const n = 3 + (p.d ? 1 : 0), pages = [];
    for (let i = 0; i < n; i++) {
      const w = r.range(0.48, 0.6), h = r.range(0.62, 0.8);
      const x = lerp(-1.3, 1.3 - w, n === 1 ? 0.5 : i / (n - 1)) + r.range(-0.04, 0.04), y = r.range(-0.9, 0.9 - h);
      const g = p.sub(x, y, 1, r.range(-0.08, 0.08));
      g.rect(0, 0, w, h, {});
      g.line(0, 0.1, w, 0.1, L);
      const rows = Math.floor((h - 0.2) / 0.11), link = 1 + r.int(Math.max(1, rows - 1));
      let anchor = null;
      for (let k = 0; k < rows; k++) {
        const yy = 0.22 + k * 0.11, ww = w * r.range(0.45, 0.8);
        if (k === link) {
          g.line(0.06, yy, 0.06 + ww * 0.6, yy, opt(K, B));
          anchor = g.pt(0.06 + ww * 0.6, yy);
        } else {
          g.line(0.06, yy, 0.06 + ww, yy, L);
        }
      }
      if (i === 1) g.tint(rectPts(0, 0, w, h), { a: 0.5 });
      pages.push({ x: x, y: y, w: w, h: h, anchor: anchor, pen: g });
    }
    // the links, as pixels turned back into this doodle's coordinates
    const inv = function(v) {
      const dx = (v[0] - p.tf.x) / p.tf.s, dy = (v[1] - p.tf.y) / p.tf.s;
      return [dx * p.cos + dy * p.sin, -dx * p.sin + dy * p.cos];
    };
    pages.forEach(function(pg, i) {
      const to = pages[(i + 1) % n];
      if (!pg.anchor || (i === n - 1 && !p.d)) return;
      const a = inv(pg.anchor), b = inv(to.pen.pt(i === n - 1 ? to.w * 0.5 : 0, i === n - 1 ? to.h : to.h * 0.3));
      const bend = (i % 2 ? 1 : -1) * r.range(0.15, 0.35);
      const m = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2 + bend];
      p.curve([a, m, b], K);
      p.head(m[0], m[1], b[0], b[1], opt(K, { head: 4.5 }));
    });
  });

  // security: a padlock, hatched
  def('security', 0.8, function(p) {
    const bw = 1.05, bh = 0.85, by = -0.1, R = 0.33;
    p.rect(-bw / 2, by, bw, bh, B);
    p.arc(0, by - 0.22, R, Math.PI, TAU, B);
    p.arc(0, by - 0.22, R - 0.11, Math.PI, TAU, {});
    p.line(-R, by - 0.22, -R, by, B);
    p.line(R, by - 0.22, R, by, B);
    p.line(-R + 0.11, by - 0.22, -R + 0.11, by, {});
    p.line(R - 0.11, by - 0.22, R - 0.11, by, {});
    const ky = by + bh * 0.42;
    p.circle(0, ky, 0.1, {});
    p.path([[-0.04, ky + 0.08], [-0.07, ky + 0.3], [0.07, ky + 0.3], [0.04, ky + 0.08]], { join: true });
    const hole = ngon(0, ky + 0.06, 0.16, 8);
    p.hatch([rectPts(-bw / 2, by, bw, bh), hole], 0.75, { sp: 3.1, w: 0.5 });
    if (p.d) p.hatch([rectPts(-bw / 2, by + bh * 0.55, bw, bh * 0.45), hole], -0.75, { sp: 3.8, w: 0.45 });
    p.tint(rectPts(-bw / 2, by, bw, bh), { a: 0.55 });
    p.line(-bw / 2 - 0.2, by + bh, bw / 2 + 0.25, by + bh, C);
    if (p.d) {
      p.line(-bw / 2, by, -bw / 2, by - 0.75, C);
      p.line(bw / 2, by, bw / 2, by - 0.75, C);
      p.dot(-bw / 2 + 0.1, by + 0.1, { r: 1.3 });
      p.dot(bw / 2 - 0.1, by + 0.1, { r: 1.3 });
    }
  });
  // security: a key, and what its cuts measure
  def('security', 1.5, function(p, r) {
    const g = p.sub(0, 0, 1, r.range(-0.3, 0.15));
    const bx = -0.98, R = 0.34, top = -0.12, bot = 0.13, x0 = bx + R * 0.92, x1 = 1.3;
    g.circle(bx, 0, R, B);
    g.circle(bx - 0.1, 0, 0.1, {});
    g.hatch([ngon(bx, 0, R, 18), ngon(bx - 0.1, 0, 0.1, 10)], 0.8, { sp: 3 });
    const cuts = [[x0, top], [x0 + 0.2, top]], depths = [];
    let x = x0 + 0.2;
    while (x < x1 - 0.3) {
      const d = r.range(0.03, 0.15);
      cuts.push([x + 0.05, top + d], [x + 0.11, top + d]);
      depths.push([x + 0.08, d]);
      x += 0.165;
      cuts.push([x, top + r.range(0, 0.02)]);
    }
    cuts.push([x1 - 0.1, top + 0.03], [x1, 0.03], [x1 - 0.1, bot], [x0, bot]);
    g.path(cuts, opt(B, { join: true }));
    g.line(x0 + 0.08, 0.06, x1 - 0.16, 0.06, L);
    g.dash(bx - R - 0.15, 0, x1 + 0.15, 0, opt(C, { dot: true, dash: 7 }));
    g.tint(cuts, { a: 0.5 });
    g.tint(ngon(bx, 0, R, 14), { a: 0.35 });
    depths.forEach(function(d, i) {
      g.line(d[0], top + d[1] - 0.02, d[0], top - 0.2, C);
      if (p.d) g.text(String(Math.round(d[1] * 50)), d[0], top - 0.25, 0.09, opt(L, { align: 'c' }));
      else if (i % 2 === 0) g.line(d[0] - 0.03, top - 0.2, d[0] + 0.03, top - 0.2, L);
    });
    if (p.d) g.line(x0 + 0.2, top - 0.2, x - 0.1, top - 0.2, C);
  });

  // ai: layers of connected dots
  def('ai', 1.3, function(p, r) {
    const layers = 3 + r.int(2), cols = [];
    for (let i = 0; i < layers; i++) {
      const n = i === 0 || i === layers - 1 ? 2 + r.int(2) : 3 + r.int(2 + p.d), x = lerp(-1.05, 1.05, i / (layers - 1));
      const col = [];
      for (let k = 0; k < n; k++) col.push([x + r.range(-0.05, 0.05), (n === 1 ? 0 : lerp(-0.2 * n, 0.2 * n, k / (n - 1))) + r.range(-0.04, 0.04)]);
      cols.push(col);
    }
    for (let i = 0; i + 1 < layers; i++) {
      cols[i].forEach(function(q) {
        cols[i + 1].forEach(function(o) {
          const strong = r.chance(0.2);
          if (strong || r.chance(0.85)) p.line(q[0], q[1], o[0], o[1], strong ? opt(K, { over: 0, w: 0.95 }) : opt(C, { over: 0 }));
        });
      });
    }
    cols.forEach(function(col, i) {
      col.forEach(function(q) { p.node(q[0], q[1], 0.075, { fill: r.chance(i === 0 ? 0.2 : 0.45) }); });
    });
    const mid = cols[1 + r.int(layers - 2)];
    p.tint(ngon(mid[0][0], 0, 0.5, 12), { a: 0.35 });
    if (p.d) {
      const last = cols[layers - 1];
      last.forEach(function(q) { p.arrow(q[0] + 0.1, q[1], q[0] + 0.3, q[1], opt(L, { head: 4 })); });
      p.dash(mid[0][0] - 0.12, -0.95, mid[0][0] - 0.12, 0.95, C);
    }
  });
  // the outline of a cloud: bumps along an ellipse
  function cloudShape(p, r, cx, cy, w, h, o) {
    const n = 6 + r.int(3), anchors = [], pts = [];
    for (let i = 0; i < n; i++) {
      const a = (i + r.range(-0.22, 0.22)) / n * TAU;
      anchors.push([cx + Math.cos(a) * w, cy + Math.sin(a) * h * (Math.sin(a) > 0 ? 0.75 : 1)]);
    }
    for (let i = 0; i < n; i++) {
      const A = anchors[i], Z = anchors[(i + 1) % n];
      const mx = (A[0] + Z[0]) / 2, my = (A[1] + Z[1]) / 2, rad = Math.hypot(Z[0] - A[0], Z[1] - A[1]) / 2;
      const a0 = Math.atan2(A[1] - my, A[0] - mx);
      for (let k = 0; k < 8; k++) {
        const a = a0 + k / 8 * Math.PI;
        pts.push([mx + Math.cos(a) * rad, my + Math.sin(a) * rad * 0.85]);
      }
    }
    p.path(pts, opt({ closed: true, join: true }, o));
    return pts;
  }
  // a head and shoulders
  function person(p, x, y, s, o) {
    p.circle(x, y - s * 1.4, s, o);
    p.arc(x, y + s * 1.1, s * 1.7, Math.PI * 1.12, Math.PI * 1.88, o);
  }

  // ai: a scribbled cloud, things coming out of it
  def('ai', 1.35, function(p, r) {
    const back = r.chance(0.5) ? -1 : 1;
    cloudShape(p, r, back * 0.35, -0.2, 0.6, 0.3, L);
    const hull = cloudShape(p, r, -back * 0.1, 0.08, 0.85, 0.42, { twice: true });
    p.tint(hull, { a: 0.5, rough: 2 });
    // something going round inside
    const pts = [], turns = 2 + r.int(2), a0 = r() * TAU;
    for (let i = 0; i <= turns * 12; i++) {
      const t = i / (turns * 12), a = a0 + t * turns * TAU;
      pts.push([-back * 0.1 + Math.cos(a) * (0.5 - 0.3 * t) + Math.sin(a * 2.3) * 0.06, 0.08 + Math.sin(a) * (0.2 - 0.1 * t)]);
    }
    p.curve(pts.filter(function(_, i) { return i % 2 === 0; }), C);
    // and what comes out of it
    const sparks = 2 + r.int(3) + p.d * 2;
    for (let i = 0; i < sparks; i++) {
      const a = -Math.PI * r.range(0.05, 0.95), d = r.range(1.12, 1.4), x = -back * 0.1 + Math.cos(a) * d * 0.9, y = 0.08 + Math.sin(a) * d * 0.5, s = r.range(0.04, 0.075);
      if (y < -0.95) continue;
      p.line(x - s, y, x + s, y, K);
      p.line(x, y - s * 1.3, x, y + s * 1.3, K);
    }
    for (let i = 0; i < 3; i++) p.dot(-back * 0.1 - 0.25 + i * 0.25 + r.range(-0.03, 0.03), 0.72 + i * 0.03 * back, { r: 1.3 });
  });

  // The `ai` facet tells the many ai posts apart: what kind of ai post it is
  // decides the form ('ai:<label>'; `models` and posts without facets get the
  // two above).

  // agents: a loop that goes round and round, and the tools it reaches for
  def('ai:agents', 1.35, function(p, r) {
    const n = 3 + r.int(2), cx = -0.3, cy = r.range(-0.05, 0.05), a0 = r() * TAU, RX = 0.7, RY = 0.6, at = [];
    for (let i = 0; i < n; i++) {
      const a = a0 + i / n * TAU;
      at.push([cx + Math.cos(a) * RX, cy + Math.sin(a) * RY, a]);
    }
    const words = ['PLAN', 'ACT', 'LOOK', 'FIX'], gap = 0.42 * 3 / n;
    at.forEach(function(q, i) {
      p.box(q[0], q[1], 0.44, 0.24, i === 0 ? B : {});
      if (p.d) p.text(words[i % 4], q[0], q[1] + 0.05, 0.1, opt(L, { align: 'c' }));
      else p.line(q[0] - 0.12, q[1], q[0] + 0.12, q[1], L);
      const pts = [];
      for (let k = 0; k <= 6; k++) {
        const a = lerp(q[2] + gap, q[2] + TAU / n - gap, k / 6);
        pts.push([cx + Math.cos(a) * RX * 1.04, cy + Math.sin(a) * RY * 1.04]);
      }
      p.curve(pts, K);
      p.head(pts[5][0], pts[5][1], pts[6][0], pts[6][1], opt(K, { head: 4.5 }));
    });
    p.tint(ngon(cx, cy, 0.45, 12), { a: 0.5 });
    const from = at.reduce(function(best, q) { return q[0] > best[0] ? q : best; });
    const tools = 2 + r.int(2);
    for (let i = 0; i < tools; i++) {
      const y = lerp(-0.6, 0.6, i / (tools - 1)) + r.range(-0.05, 0.05), x = 0.98 + r.range(0, 0.12);
      p.dash(from[0] + 0.24, from[1], x - 0.03, y, opt(L, { dash: 3 }));
      p.rect(x, y - 0.1, 0.2, 0.2, {});
      if (r.chance(0.5)) p.hatch(rectPts(x, y - 0.1, 0.2, 0.2), 0.8, { sp: 3 });
      else p.zig(x + 0.03, y, x + 0.17, y, 0.04, 3, L);
    }
    if (p.d) p.text('X' + (3 + r.int(40)), cx - 0.12, cy + 0.06, 0.12, {});
  });

  // local: the machine under the desk, and no cloud
  def('ai:local', 1.15, function(p, r) {
    const x = -0.6 + r.range(-0.08, 0.08), y = -0.12, w = 0.95, h = 0.85;
    p.rect(x, y, w, h, B);
    p.rect(x + 0.08, y + 0.08, w - 0.16, h * 0.52, {});
    const nodes = [[x + 0.22, y + 0.2], [x + 0.22, y + 0.4], [x + 0.48, y + 0.16], [x + 0.48, y + 0.3], [x + 0.48, y + 0.44], [x + 0.74, y + 0.3]];
    [[0, 2], [0, 3], [1, 3], [1, 4], [0, 4], [1, 2], [2, 5], [3, 5], [4, 5]].forEach(function(e) {
      p.line(nodes[e[0]][0], nodes[e[0]][1], nodes[e[1]][0], nodes[e[1]][1], opt(C, { over: 0 }));
    });
    nodes.forEach(function(q) { p.node(q[0], q[1], 0.035, { fill: r.chance(0.5), c: 1 }); });
    for (let i = 0; i < 3; i++) p.line(x + 0.12, y + h * 0.72 + i * 0.07, x + w * 0.55, y + h * 0.72 + i * 0.07, L);
    p.circle(x + w - 0.16, y + h - 0.16, 0.05, K);
    p.tint(rectPts(x, y, w, h), { a: 0.55 });
    p.line(x - 0.25, y + h, x + w + 0.4, y + h, {});
    p.hatch([[x + w, y + h], [x + w + 0.3, y + h], [x + w, y + h - 0.2]], 0.3, { sp: 3 });
    p.curve([[x, y + h * 0.7], [x - 0.2, y + h * 0.75], [x - 0.3, y + h * 0.95], [x - 0.6, y + h - 0.03]], {});
    const cx = x + w + 0.25, cy = -0.6;
    cloudShape(p, r, cx, cy, 0.36, 0.17, L);
    p.line(cx - 0.42, cy + 0.24, cx + 0.42, cy - 0.24, opt(B, K));
    p.line(cx - 0.42, cy - 0.22, cx + 0.42, cy + 0.22, K);
  });

  // society, community: people, and what joins them
  function peopleNet(p, r, hub) {
    const n = (hub ? 7 : 5) + r.int(3) + p.d * 2, pts = [];
    for (let i = 0; i < n; i++) {
      const a = (i + r.range(-0.3, 0.3)) / n * TAU, d = r.range(0.72, 1);
      pts.push([Math.cos(a) * d * 1.2, Math.sin(a) * d * 0.7 + 0.1]);
    }
    if (hub) {      // everyone through the one machine in the middle
      pts.forEach(function(q) {
        p.line(q[0] * 0.84, (q[1] - 0.1) * 0.84 + 0.08, q[0] * 0.2, (q[1] - 0.1) * 0.2 + 0.08, opt(r.chance(0.3) ? K : L, { over: 0 }));
      });
      p.box(0, 0.08, 0.3, 0.3, B);
      p.hatch(rectPts(-0.15, -0.07, 0.3, 0.3), 0.8, { sp: 2.6 });
      p.tint(ngon(0, 0.08, 0.5, 10), { a: 0.5 });
    } else {        // each other
      pts.forEach(function(q, i) {
        const o = pts[(i + 1) % n];
        p.line(lerp(q[0], o[0], 0.14), lerp(q[1], o[1], 0.14), lerp(q[0], o[0], 0.86), lerp(q[1], o[1], 0.86), opt(K, { over: 0, w: 0.8 }));
        if (r.chance(0.4)) {
          const o2 = pts[(i + 2 + r.int(n - 3)) % n];
          p.dash(lerp(q[0], o2[0], 0.15), lerp(q[1], o2[1], 0.15), lerp(q[0], o2[0], 0.85), lerp(q[1], o2[1], 0.85), L);
        }
      });
      p.tint(ngon(0, 0.1, 0.7, 10), { a: 0.35 });
    }
    pts.forEach(function(q) { person(p, q[0], q[1], 0.075, {}); });
  }
  def('ai:society', 1.45, function(p, r) { peopleNet(p, r, true); });
  def('ai:community', 1.4, function(p, r) { peopleNet(p, r, false); });

  // writing: a paragraph in two hands, one written and one set
  def('ai:writing', 1.4, function(p, r) {
    const rows = 5 + p.d, lh = 1.5 / rows, a = 1.2, h = Math.min(0.1, lh * 0.34);
    p.line(-a - 0.1, -0.85, -a - 0.1, 0.85, opt(K, { w: 0.7 }));
    let last = [0, 0];
    for (let i = 0; i < rows; i++) {
      const y = -0.68 + i * lh + lh * 0.3, w = (i === rows - 1 ? r.range(0.45, 0.7) : r.range(0.85, 1)) * a * 2;
      if (i % 2 === 0) {
        last = [p.scrawl(-a, y, w, { h: h }), y];
      } else {
        let x = -a;
        while (x < -a + w - 0.1) {
          const wl = r.range(0.1, 0.32);
          p.line(x, y - h * 0.4, Math.min(x + wl, -a + w), y - h * 0.4, opt(K, { over: 0, wob: 0.3, w: 1.1 }));
          x += wl + 0.06;
        }
        last = [x, y];
      }
    }
    p.line(last[0] + 0.03, last[1] - h * 1.5, last[0] + 0.03, last[1] + h * 0.3, B);       // where it goes on
    const cy = -0.68 + lh * 1.3, cx = r.range(-0.6, 0.4);
    p.path([[cx - 0.05, cy + 0.03], [cx, cy - 0.07], [cx + 0.05, cy + 0.03]], { join: true });
    p.scrawl(cx - 0.1, cy - lh * 0.62, 0.4, { h: h * 0.7, w: 0.7 });
    p.tint(rectPts(-a, -0.68 + lh * 0.7, a * 2, lh * 0.8), { a: 0.4 });
    if (rows > 3) p.tint(rectPts(-a, -0.68 + lh * 2.7, a * 1.7, lh * 0.8), { a: 0.4 });
  });

  // risk: the same layers, with a fault through them
  def('ai:risk', 1.35, function(p, r) {
    const xs = [-1.05, -0.45, 0.3, 0.95], cols = xs.map(function(x, i) {
      const n = i === 0 || i === 3 ? 2 + r.int(2) : 3 + r.int(2), col = [];
      for (let k = 0; k < n; k++) col.push([x + r.range(-0.04, 0.04), lerp(-0.18 * n, 0.18 * n, n === 1 ? 0.5 : k / (n - 1)) + 0.12]);
      return col;
    });
    for (let i = 0; i < 3; i++) {
      cols[i].forEach(function(q) {
        cols[i + 1].forEach(function(o) {
          if (i !== 1) { p.line(q[0], q[1], o[0], o[1], opt(C, { over: 0 })); return; }
          // across the fault nothing holds
          const t = r.range(0.25, 0.4), u = r.range(0.65, 0.8);
          p.line(q[0], q[1], lerp(q[0], o[0], t), lerp(q[1], o[1], t) + r.range(-0.03, 0.03), opt(L, { over: 0 }));
          if (r.chance(0.6)) p.line(lerp(q[0], o[0], u), lerp(q[1], o[1], u) + r.range(0.02, 0.1), o[0], o[1], opt(L, { over: 0 }));
        });
      });
    }
    cols.forEach(function(col) { col.forEach(function(q) { p.node(q[0], q[1], 0.07, { fill: r.chance(0.4) }); }); });
    const crack = [];
    for (let i = 0; i <= 8; i++) crack.push([-0.07 + (i % 2 ? 0.09 : -0.07) + r.range(-0.03, 0.03), lerp(-0.95, 0.98, i / 8)]);
    p.path(crack, opt(B, K, { join: true, twice: true }));
    p.tint(crack.concat([[0.25, 0.98], [0.2, -0.95]]), { a: 0.6 });
    const tx = 0.78, ty = -0.72;
    p.path([[tx, ty - 0.2], [tx + 0.22, ty + 0.16], [tx - 0.22, ty + 0.16]], opt(B, K, { closed: true }));
    p.text('!', tx, ty + 0.11, 0.2, opt(B, K, { align: 'c' }));
  });

  // business: a curve that only goes up, and where it is said to go next
  def('ai:business', 1.3, function(p, r) {
    const x0 = -1.05, y0 = 0.72, w = 1.9, h = 1.4;
    p.arrow(x0, y0, x0 + w + 0.2, y0, { head: 4.5 });
    p.arrow(x0, y0, x0, y0 - h - 0.15, { head: 4.5 });
    const n = 5 + r.int(3), pts = [], steep = r.range(2, 3);
    for (let i = 0; i < n; i++) {
      const t = (i + 0.6) / n, v = Math.pow(t, steep) * h * 0.78 + 0.06 + r.range(0, 0.05);
      const bx = x0 + 0.12 + i * (w - 0.3) / n, bw = (w - 0.3) / n * 0.62;
      p.rect(bx, y0 - v, bw, v, L);
      if (i % 2) p.hatch(rectPts(bx, y0 - v, bw, v), 0.8, { sp: 3 });
      pts.push([bx + bw / 2, y0 - v - 0.06]);
      p.line(bx + bw / 2, y0, bx + bw / 2, y0 + 0.05, C);
    }
    p.curve(pts, opt(B, K));
    const end = pts[n - 1];
    p.dash(end[0], end[1], end[0] + 0.28, end[1] - 0.5, K);
    p.text('?', end[0] + 0.3, end[1] - 0.45, 0.18, K);
    p.tint(pts.concat([[end[0], y0], [pts[0][0], y0]]), { a: 0.45 });
    if (p.d) p.dash(x0, end[1], end[0], end[1], C);
  });

  // The images the author uses himself (the `imagery` facet, when the
  // classifier is sure of it) are a drawing of their own among the others.

  def('~img:water', 1.4, function(p, r) {
    const n = 3 + r.int(2) + p.d;
    for (let i = 0; i < n; i++) {
      const y = lerp(-0.35, 0.7, i / (n - 1)), pts = [], ph = r() * TAU, k = r.range(2.2, 3.2);
      for (let j = 0; j <= 28; j++) {
        const t = j / 28, sn = Math.sin(ph + t * k * TAU);
        pts.push([lerp(-1.3, 1.3, t), y + sn * 0.09 - Math.pow(Math.max(0, sn), 3) * 0.1 * (1 - i / n)]);
      }
      p.curve(pts, i === 0 ? {} : L);
    }
    // one that breaks
    const bx = r.range(-0.6, 0.3), curl = [];
    for (let i = 0; i <= 30; i++) {
      const t = i / 30, a = -Math.PI * 0.95 + t * TAU * 1.25, q = 0.42 * (1 - 0.72 * t);
      curl.push([bx + Math.cos(a) * q * 1.2 + t * 0.2, -0.45 + Math.sin(a) * q]);
    }
    p.curve(curl.filter(function(_, i) { return i % 2 === 0; }), { twice: true });
    for (let i = 0; i < 4; i++) p.dot(bx + 0.5 + r.range(0, 0.4), -0.75 + r.range(0, 0.35), { r: 1.2 });
    p.tint(rectPts(-1.25, -0.3, 2.5, 0.95), { a: 0.45, rough: 2 });
  });
  def('~img:fire', 0.95, function(p, r) {
    const lean = r.range(-0.15, 0.15);
    const flame = function(s, o) {
      const pts = [[-0.34 * s, 0.5], [-0.46 * s, 0.12], [-0.2 * s, -0.25 * s], [-0.26 * s + lean, -0.55 * s], [lean * 2, -0.95 * s], [0.14 * s + lean, -0.5 * s],
        [0.3 * s, -0.3 * s], [0.44 * s, 0.1], [0.34 * s, 0.5]];
      p.curve(pts, o);
      return spline(pts, false, 0.06);
    };
    p.tint(flame(1, { twice: true }), { a: 0.6 });
    p.tint(flame(0.55, K), { a: 0.7, rgb: [0.95, 0.78, 0.25] });
    for (let s = -1; s <= 1; s += 2) {
      p.line(-0.6 * s, 0.56, 0.6 * s, 0.82, B);
      p.line(-0.62 * s, 0.68, 0.58 * s, 0.94, {});
      p.ellipse(0.6 * s, 0.88, 0.03, 0.065, 0, {});
    }
    for (let i = 0; i < 3 + p.d * 2; i++) p.dot(lean * 2 + r.range(-0.3, 0.3), -1 + r.range(-0.1, 0.25), { r: 1, c: 1 });
  });
  def('~img:stone', 1.0, function(p, r) {
    const stones = [[0.02, 0.6, 0.72, 0.3], [-0.06, 0.08, 0.5, 0.25], [0.05, -0.34, 0.33, 0.19], [-0.02, -0.66, 0.2, 0.13]];
    stones.forEach(function(q) {
      const cx = q[0] + r.range(-0.07, 0.07), pts = [];
      for (let i = 0; i < 8; i++) {
        const a = i / 8 * TAU + r.range(-0.15, 0.15), k = r.range(0.86, 1.1);
        pts.push([cx + Math.cos(a) * q[2] * k, q[1] + Math.sin(a) * q[3] * k]);
      }
      const loop = spline(pts, true, 0.06);
      p.tint(loop, { a: 0.55 });
      p.curve(pts, { closed: true });
      p.hatch(loop.filter(function(v) { return v[1] > q[1] + q[3] * 0.1 || v[0] > cx + q[2] * 0.5; }), 0.5, { sp: 3.2 });
    });
    p.line(-0.95, 0.92, 0.95, 0.93, L);
  });
  def('~img:air', 1.45, function(p, r) {
    const n = 3 + p.d;
    for (let i = 0; i < n; i++) {
      const y = lerp(-0.55, 0.6, i / (n - 1)), x0 = -1.35 + r.range(0, 0.4), len = r.range(1.4, 2.1), pts = [];
      for (let j = 0; j <= 10; j++) pts.push([x0 + len * j / 10, y + Math.sin(j / 10 * 3 + i) * 0.06]);
      const cx = x0 + len, cy = y - 0.16, turns = r.range(1.1, 1.6);
      for (let j = 1; j <= 14; j++) {
        const t = j / 14, a = Math.PI / 2 - t * turns * TAU, q = 0.16 * (1 - 0.7 * t);
        pts.push([cx + Math.cos(a) * q, cy + Math.sin(a) * q]);
      }
      p.curve(pts, i % 2 ? L : {});
      if (r.chance(0.6)) p.dash(x0 + 0.1, y + 0.12, x0 + len * 0.5, y + 0.14, C);
    }
    p.tint(rectPts(-1.1, -0.4, 2.0, 0.7), { a: 0.3, rough: 3 });
  });
  def('~img:growth', 0.95, function(p, r) { DOODLES.opensource[0].draw(p, r); });
  def('~img:building', 0.9, function(p, r) {
    const floors = 4 + r.int(2) + p.d, fh = 1.6 / floors, w = 0.42, built = floors - 1 - r.int(2);
    for (let i = 0; i < floors; i++) {
      const y = 0.88 - (i + 1) * fh, o = i < built ? {} : null;
      if (o) {
        p.rect(-w, y, w * 2, fh, o);
        for (let k = 0; k < 3; k++) p.rect(-w + 0.1 + k * 0.26, y + fh * 0.3, 0.14, fh * 0.4, L);
        if (i % 2 === 0) p.tint(rectPts(-w, y, w * 2, fh), { a: 0.55 });
      } else {      // not there yet: only the frame
        p.dash(-w, y + fh, -w, y, {});
        p.dash(w, y + fh, w, y, {});
        p.dash(-w, y, w, y, L);
      }
    }
    // scaffolding up one side, a crane over the top
    const sx = w + 0.2;
    p.line(sx, 0.9, sx, -0.75, L);
    p.line(w + 0.04, 0.9, w + 0.04, -0.75, L);
    for (let y = 0.88; y > -0.6; y -= fh) {
      p.line(w + 0.04, y, sx, y - fh, C);
      p.line(sx, y, w + 0.04, y - fh, C);
    }
    p.line(-w - 0.3, -0.95, -w - 0.3, 0.9, {});
    p.line(-w - 0.5, -0.9, 0.5, -0.9, {});
    p.line(-w - 0.3, -0.78, -w - 0.12, -0.9, L);
    const hx = r.range(-0.2, 0.3);
    p.line(hx, -0.9, hx, -0.9 + r.range(0.15, 0.3), K);
    p.line(-0.9, 0.9, 0.9, 0.91, L);
  });
  def('~img:road', 1.4, function(p, r) {
    const hy = -0.3, vx = r.range(-0.35, 0.35), near = 0.62;
    p.line(-1.35, hy, 1.35, hy + r.range(-0.02, 0.02), {});
    p.line(vx - near - 0.25, 0.95, vx - 0.015, hy, B);
    p.line(vx + near + 0.25, 0.95, vx + 0.015, hy, B);
    p.tint([[vx - near - 0.25, 0.95], [vx, hy], [vx + near + 0.25, 0.95]], { a: 0.45 });
    for (let i = 0; i < 6; i++) {       // the line down the middle, shorter with the distance
      const t0 = 1 - Math.pow(0.6, i) * 0.97, t1 = 1 - Math.pow(0.6, i) * 0.74;
      p.line(vx, lerp(0.95, hy, t0), vx, lerp(0.95, hy, t1), opt(K, { w: 1.1, over: 0 }));
    }
    for (let i = 0; i < 5; i++) {       // posts along it, and the wire between them
      const t = 1 - Math.pow(0.58, i) * 0.85, t2 = 1 - Math.pow(0.58, i + 1) * 0.85;
      const x = lerp(vx + near + 0.55, vx, t), y = lerp(0.95, hy, t), hh = 0.85 * (1 - t);
      p.line(x, y, x, y - hh, {});
      p.line(x - hh * 0.12, y - hh * 0.9, x + hh * 0.12, y - hh * 0.9, L);
      if (i < 4) p.line(x, y - hh * 0.9, lerp(vx + near + 0.55, vx, t2), lerp(0.95, hy, t2) - 0.85 * (1 - t2) * 0.9, C);
    }
    // far hills to one side, something small on the way
    p.curve([[-1.35, hy - 0.05], [-1.0, hy - 0.28], [-0.65, hy - 0.12], [-0.3, hy - 0.2], [vx - 0.1, hy]], L);
    p.arrow(vx, hy - 0.5, vx, hy - 0.1, opt(C, { head: 4 }));
    p.dot(vx, hy, { r: 1.3 });
  });
  def('~img:light', 1.1, function(p, r) {
    // a ball, the light on it and the shadow it throws
    const side = r.chance(0.5) ? 1 : -1, R = 0.5, cx = -side * 0.15, cy = 0.12, la = -Math.PI / 2 - side * 0.75;
    p.circle(cx, cy, R, {});
    const shade = [];
    for (let i = 0; i <= 12; i++) { const a = la + Math.PI * 0.55 + i / 12 * Math.PI * 0.9; shade.push([cx + Math.cos(a) * R, cy + Math.sin(a) * R]); }
    for (let i = 12; i >= 0; i--) { const a = la + Math.PI * 0.55 + i / 12 * Math.PI * 0.9; shade.push([cx + Math.cos(a) * R * 0.98 - Math.cos(la) * R * 0.5 * Math.sin(i / 12 * Math.PI), cy + Math.sin(a) * R * 0.98 - Math.sin(la) * R * 0.5 * Math.sin(i / 12 * Math.PI)]); }
    p.hatch(shade, 0.9, { sp: 2.8 });
    p.ellipse(cx + side * 0.55, cy + R + 0.02, 0.5, 0.09, 0, L);
    p.hatch(ngon(cx + side * 0.55, cy + R + 0.02, 0.45, 12).map(function(q) { return [q[0], cy + R + 0.02 + (q[1] - cy - R - 0.02) * 0.2]; }), 0.2, { sp: 2.6 });
    p.line(-1, cy + R, 1, cy + R + 0.01, L);
    for (let i = -1; i <= 1; i++) {
      const ox = Math.cos(la + Math.PI / 2) * i * 0.2, oy = Math.sin(la + Math.PI / 2) * i * 0.2;
      p.arrow(cx + Math.cos(la) * 1.25 + ox, cy + Math.sin(la) * 1.25 + oy, cx + Math.cos(la) * 0.7 + ox, cy + Math.sin(la) * 0.7 + oy, opt(K, { head: 4 }));
    }
    p.tint(ngon(cx + Math.cos(la) * 0.2, cy + Math.sin(la) * 0.2, R * 0.75, 12), { a: 0.6 });
    p.circle(cx + Math.cos(la) * R * 0.5, cy + Math.sin(la) * R * 0.5, 0.07, C);
  });
  def('~img:body', 0.75, function(p, r) {
    // the jointed figure one learns to draw people from
    const lean = r.range(-0.12, 0.12), step = r.range(0.1, 0.3) * (r.chance(0.5) ? 1 : -1);
    const neck = [lean, -0.56], hip = [lean * 0.3, 0.02];
    p.ellipse(lean * 1.3, -0.72, 0.1, 0.13, lean, {});
    p.ellipse((neck[0] + hip[0]) / 2, -0.32, 0.17, 0.21, lean, L);
    p.ellipse(hip[0], 0.02, 0.15, 0.09, 0, L);
    p.curve([neck, [(neck[0] + hip[0]) / 2 - lean * 0.3, -0.28], hip], {});
    const limb = function(from, a1, l1, a2, l2) {
      const k = [from[0] + Math.sin(a1) * l1, from[1] + Math.cos(a1) * l1], e = [k[0] + Math.sin(a2) * l2, k[1] + Math.cos(a2) * l2];
      p.line(from[0], from[1], k[0], k[1], { over: 0 });
      p.line(k[0], k[1], e[0], e[1], { over: 0 });
      p.circle(k[0], k[1], 0.03, L);
      p.circle(from[0], from[1], 0.035, L);
      return e;
    };
    limb([neck[0] - 0.18, -0.5], -0.3 - step, 0.27, -step * 2 + 0.2, 0.26);
    limb([neck[0] + 0.18, -0.5], 0.3 + step, 0.27, step * 2 + 0.5, 0.26);
    const f1 = limb([hip[0] - 0.1, 0.04], step, 0.42, step * 0.4 - 0.1, 0.42), f2 = limb([hip[0] + 0.1, 0.04], -step, 0.42, -step * 0.4 + 0.1, 0.42);
    p.line(neck[0] - 0.2, -0.5, neck[0] + 0.2, -0.5, {});
    p.line(f1[0] - 0.05, f1[1], f1[0] + 0.1, f1[1], {});
    p.line(f2[0] - 0.05, f2[1], f2[0] + 0.1, f2[1], {});
    p.line(-0.6, 0.92, 0.6, 0.92, C);
    p.dash(lean * 1.3, -0.95, hip[0], 0.9, opt(C, { dot: true }));
    p.tint(ngon((neck[0] + hip[0]) / 2, -0.3, 0.3, 10), { a: 0.5 });
  });
  def('~img:crowd', 1.4, function(p, r) { DOODLES.community[0].draw(p, r); });

  // engineering: a dimensioned part
  def('engineering', 1.4, function(p, r) {
    const w = r.range(1.5, 1.9), h = r.range(0.75, 0.95), x = -w / 2 - 0.1, y = -h / 2 + 0.08;
    const cut = r.range(0.25, 0.4);
    const outline = [[x, y], [x + w - cut, y], [x + w, y + cut], [x + w, y + h], [x, y + h]];
    p.path(outline, opt(B, { closed: true, over: 5 }));
    const hx = x + h * 0.5, hy = y + h * 0.5, hr = h * r.range(0.2, 0.28);
    p.circle(hx, hy, hr, {});
    p.dash(hx - hr - 0.2, hy, hx + hr + 0.2, hy, opt(C, { dot: true, dash: 6 }));
    p.dash(hx, hy - hr - 0.2, hx, hy + hr + 0.2, opt(C, { dot: true, dash: 6 }));
    const sx = x + w * 0.52, sw = w * 0.28, sh = h * 0.22, sy = y + h * 0.62;
    p.rect(sx, sy, sw, sh, {});
    p.hatch(rectPts(sx, sy, sw, sh), 0.8, { sp: 3 });
    p.tint(outline, { a: 0.35 });
    // dimensions
    const dy = y - 0.3;
    p.line(x, y - 0.06, x, dy - 0.08, C);
    p.line(x + w, y + cut - 0.06, x + w, dy - 0.08, C);
    p.arrow(x + 0.02, dy, x + w - 0.02, dy, opt(L, { both: true, head: 4 }));
    p.text(String(20 + r.int(70)), x + w / 2, dy - 0.05, 0.11, opt(L, { align: 'c' }));
    const dx = x + w + 0.28;
    p.line(x + w + 0.05, y + h, dx + 0.08, y + h, C);
    p.line(x + w + 0.05, y + cut, dx + 0.08, y + cut, C);
    p.arrow(dx, y + cut + 0.02, dx, y + h - 0.02, opt(L, { both: true, head: 4 }));
    if (p.d) {
      p.text(String(8 + r.int(30)), dx + 0.06, y + h / 2 + cut / 2 + 0.05, 0.1, L);
      p.line(hx + hr * 0.7, hy - hr * 0.7, hx + hr + 0.35, hy - hr - 0.3, L);
      p.text('R' + (3 + r.int(6)), hx + hr + 0.38, hy - hr - 0.3, 0.1, L);
      p.line(x - 0.25, y + h, x + w + 0.2, y + h, C);
    }
  });
  // engineering: a truss
  def('engineering', 1.6, function(p, r) {
    const n = 3 + r.int(2), w = 2.8, x0 = -w / 2, yb = 0.35, yt = -0.35, bay = w / n;
    p.line(x0, yb, x0 + w, yb, B);
    p.line(x0 + bay / 2, yt, x0 + w - bay / 2, yt, B);
    for (let i = 0; i < n; i++) {
      const xa = x0 + i * bay, xm = xa + bay / 2;
      p.line(xa, yb, xm, yt, {});
      p.line(xm, yt, xa + bay, yb, {});
      p.node(xm, yt, 0.04, { fill: true });
      p.node(xa, yb, 0.04, { fill: true });
      if (i === Math.floor(n / 2)) p.tint([[xa, yb], [xm, yt], [xa + bay, yb]], { a: 0.5 });
    }
    p.node(x0 + w, yb, 0.04, { fill: true });
    // supports and a load
    p.path([[x0, yb], [x0 - 0.12, yb + 0.2], [x0 + 0.12, yb + 0.2]], { closed: true });
    p.hatch(rectPts(x0 - 0.2, yb + 0.21, 0.4, 0.09), 0.9, { sp: 2.6 });
    p.circle(x0 + w, yb + 0.1, 0.09, {});
    p.line(x0 + w - 0.2, yb + 0.21, x0 + w + 0.2, yb + 0.21, {});
    const lx = x0 + bay * (0.5 + r.int(n));
    p.arrow(lx, yt - 0.5, lx, yt - 0.06, opt(K, { w: 1.2 }));
    if (p.d) {
      p.text('F', lx + 0.08, yt - 0.35, 0.12, K);
      p.arrow(x0, yb + 0.5, x0 + w, yb + 0.5, opt(L, { both: true, head: 4 }));
      p.line(x0, yb + 0.3, x0, yb + 0.58, C);
      p.line(x0 + w, yb + 0.3, x0 + w, yb + 0.58, C);
      p.text('L', 0, yb + 0.46, 0.1, opt(L, { align: 'c' }));
    }
  });

  // opensource: something growing, branching
  def('opensource', 0.95, function(p, r) {
    const leaf = function(x, y, ang, len) {
      const s = p.sub(x, y, len, ang);
      const up = [[0, 0], [0.3, -0.24], [0.7, -0.2], [1, 0]], dn = [[0, 0], [0.3, 0.22], [0.7, 0.2], [1, 0]];
      s.curve(up, {});
      s.curve(dn, {});
      s.line(0.02, 0, 0.8, 0, L);
      s.tint(spline(up, false, 0.1).concat(spline(dn, false, 0.1).reverse()), { a: 0.6 });
      if (p.d) for (let i = 1; i < 4; i++) s.line(i * 0.2, 0, i * 0.2 + 0.12, (i % 2 ? -1 : 1) * 0.12, C);
    };
    const grow = function(x, y, ang, len, depth) {
      const bend = r.range(-0.35, 0.35);
      const mx = x + Math.cos(ang + bend * 0.5) * len * 0.5, my = y + Math.sin(ang + bend * 0.5) * len * 0.5;
      const ex = x + Math.cos(ang + bend) * len, ey = y + Math.sin(ang + bend) * len;
      p.curve([[x, y], [mx, my], [ex, ey]], depth > 1 ? {} : L);
      if (depth > 1) p.curve([[x + 0.025, y], [mx + 0.02, my], [ex, ey]], L);
      if (depth === 0 || len < 0.2) {
        leaf(ex, ey, ang + bend + r.range(-0.3, 0.3), r.range(0.2, 0.3));
        return;
      }
      const kids = 2 + (r.chance(0.3) ? 1 : 0);
      for (let i = 0; i < kids; i++) {
        const spread = (i - (kids - 1) / 2) * r.range(0.7, 1.0);
        grow(ex, ey, ang + bend + spread, len * r.range(0.6, 0.75), depth - 1);
      }
      if (r.chance(0.7)) leaf(mx, my, ang + (r.chance(0.5) ? 1 : -1) * r.range(0.6, 1), r.range(0.18, 0.26));
    };
    grow(r.range(-0.1, 0.1), 0.92, -Math.PI / 2 + r.range(-0.12, 0.12), 0.62, 2);
    p.line(-0.5, 0.93, 0.5, 0.93, L);
    p.hatch(rectPts(-0.4, 0.94, 0.8, 0.06), 1, { sp: 3 });
  });

  // tooling: a spanner and a nut
  def('tooling', 1.3, function(p, r) {
    const s = p.sub(-0.1, 0.05, 1, r.range(-0.5, -0.2));
    const hw = 0.085;
    s.line(-0.72, -hw, 0.62, -hw, {});
    s.line(-0.72, hw, 0.62, hw, {});
    s.dash(-1.2, 0, 1.25, 0, opt(C, { dot: true, dash: 7 }));
    // the open jaw
    s.arc(0.88, 0, 0.3, 0.55, TAU - 0.55, B);
    s.path([[0.88 + Math.cos(0.55) * 0.3, -Math.sin(0.55) * 0.3], [0.86, -0.13], [0.86, 0.13], [0.88 + Math.cos(0.55) * 0.3, Math.sin(0.55) * 0.3]], opt(B, { join: true }));
    s.circle(-0.9, 0, 0.24, B);
    s.path(ngon(-0.9, 0, 0.13, 6, 0.2), { closed: true });
    s.hatch(rectPts(-0.6, -hw, 1.1, hw * 2), 1.1, { sp: 4, ragged: 0.4 });
    s.tint([[-1.12, -0.2], [1.15, -0.28], [1.15, 0.28], [-1.12, 0.2]], { a: 0.4 });
    // the nut
    const nx = r.range(0.55, 0.8), ny = r.range(0.5, 0.62);
    p.path(ngon(nx, ny, 0.26, 6, r() * 1), opt(B, { closed: true }));
    p.circle(nx, ny, 0.13, {});
    p.circle(nx, ny, 0.26, C);
    p.dash(nx - 0.38, ny, nx + 0.38, ny, opt(C, { dot: true }));
    p.dash(nx, ny - 0.36, nx, ny + 0.36, opt(C, { dot: true }));
    if (p.d) {
      p.text('M' + r.pick([6, 8, 10, 12]), nx + 0.3, ny + 0.3, 0.1, L);
      p.hatch([ngon(nx, ny, 0.26, 6, 0), ngon(nx, ny, 0.13, 10)], 0.7, { sp: 3 });
    }
  });
  // tooling: a bolt, side on
  def('tooling', 1.3, function(p, r) {
    const s = p.sub(0, 0, 1, r.range(-0.25, 0.25));
    const hh = 0.36, hw = 0.3, sh = 0.17, x0 = -1.0, xe = 1.05;
    s.rect(x0, -hh, hw, hh * 2, B);
    s.line(x0, -hh * 0.4, x0 + hw, -hh * 0.4, L);
    s.line(x0, hh * 0.4, x0 + hw, hh * 0.4, L);
    s.line(x0 + hw, -sh, xe, -sh, {});
    s.line(x0 + hw, sh, xe, sh, {});
    s.line(xe, -sh, xe + 0.06, -sh * 0.7, {});
    s.line(xe, sh, xe + 0.06, sh * 0.7, {});
    s.line(xe + 0.06, -sh * 0.7, xe + 0.06, sh * 0.7, {});
    const from = x0 + hw + r.range(0.3, 0.5);
    for (let x = from; x < xe - 0.02; x += 0.085) s.line(x, -sh, x + 0.05, sh, opt(L, { over: 0.6 }));
    s.dash(x0 - 0.2, 0, xe + 0.25, 0, opt(C, { dot: true, dash: 7 }));
    s.hatch(rectPts(x0, 0, hw, hh), 0.8, { sp: 2.8 });
    s.tint(rectPts(x0, -hh, xe - x0, hh * 2), { a: 0.35 });
    // a nut riding on it
    const nx = r.range(0.25, 0.55);
    s.rect(nx, -hh * 0.9, 0.24, hh * 1.8, B);
    s.line(nx, -hh * 0.35, nx + 0.24, -hh * 0.35, L);
    s.line(nx, hh * 0.35, nx + 0.24, hh * 0.35, L);
    if (p.d) {
      s.arrow(from, sh + 0.25, xe, sh + 0.25, opt(L, { both: true, head: 4 }));
      s.line(from, sh + 0.05, from, sh + 0.32, C);
      s.text('M' + r.pick([6, 8, 10]) + 'X' + r.pick([30, 40, 55]), from + 0.05, sh + 0.45, 0.1, L);
    }
  });

  // packaging: boxes, stacked
  def('packaging', 1.2, function(p, r) {
    const box = function(x, y, z, w, d, h, open) {
      const q = function(a, b, c) { const v = iso(x + a, y + b, z + c); return [v[0], v[1] + 0.32]; };
      const A = q(0, d, 0), Bq = q(w, d, 0), Cq = q(w, 0, 0), D = q(0, d, h), E = q(w, d, h), F = q(w, 0, h), G = q(0, 0, h);
      p.tint([A, Bq, Cq, F, G, D], { a: 0.45 });
      p.path([D, E, F, G], opt({ closed: true, over: 2 }));
      p.path([D, A, Bq, E], { over: 2 });
      p.path([Bq, Cq, F], { over: 2 });
      p.hatch([Bq, Cq, F, E], 1.1, { sp: 3.3 });
      // the tape over the top and down the front
      const t0 = q(w / 2, 0, h), t1 = q(w / 2, d, h), t2 = q(w / 2, d, h * 0.6);
      if (open) {
        const f1 = q(0, d, h), f2 = q(-w * 0.1, d + d * 0.35, h + h * 0.25), f3 = q(w * 0.9, d + d * 0.35, h + h * 0.25);
        p.path([f1, f2, f3, E], L);
        const g1 = q(w * 1.1, -d * 0.3, h + h * 0.3), g2 = q(w * 0.1, -d * 0.3, h + h * 0.3);
        p.path([F, g1, g2, G], L);
      } else {
        p.line(t0[0], t0[1], t1[0], t1[1], K);
        p.line(t1[0], t1[1], t2[0], t2[1], K);
      }
      return { top: [D, E, F, G], front: [A, Bq, E, D] };
    };
    const w1 = r.range(0.75, 0.9), d1 = r.range(0.7, 0.85), h1 = r.range(0.45, 0.6);
    const b1 = box(-0.1, 0.05, 0, w1, d1, h1, false);
    const w2 = w1 * r.range(0.5, 0.7), d2 = d1 * r.range(0.5, 0.7);
    box(-0.1 + r.range(0, w1 - w2), 0.05 + r.range(0, d1 - d2), h1, w2, d2, r.range(0.3, 0.42), r.chance(0.5));
    if (p.d || r.chance(0.4)) box(-0.1 + w1 + 0.12, 0.25, 0, 0.42, 0.42, 0.36, false);
    if (p.d) {
      const f = b1.front, mx = (f[0][0] + f[1][0]) / 2 - 0.1, my = (f[0][1] + f[2][1]) / 2 + 0.1;
      p.arrow(mx, my + 0.1, mx, my - 0.1, opt(L, { head: 4 }));
      p.arrow(mx + 0.1, my + 0.14, mx + 0.1, my - 0.06, opt(L, { head: 4 }));
      p.line(-1.1, 0.96, 1.1, 0.97, C);
    }
  });

  // javascript: curly, restless
  def('javascript', 1.15, function(p, r) {
    const brace = function(x, dir, h) {
      p.curve([[x + dir * 0.2, -h], [x + dir * 0.06, -h * 0.9], [x + dir * 0.08, -h * 0.25], [x - dir * 0.08, 0],
        [x + dir * 0.08, h * 0.25], [x + dir * 0.06, h * 0.9], [x + dir * 0.2, h]], B);
    };
    brace(-0.95, 1, 0.88);
    brace(0.95, -1, 0.88);
    if (p.d || r.chance(0.5)) { brace(-0.68, 1, 0.5); brace(0.68, -1, 0.5); }
    // a spring that will not sit still
    const pts = [], n = 5 + r.int(4), y0 = r.range(-0.2, 0.2);
    for (let i = 0; i <= n * 10; i++) {
      const t = i / (n * 10), a = t * n * TAU;
      pts.push([lerp(-0.5, 0.42, t) + Math.sin(a) * 0.13, y0 + Math.cos(a) * (0.2 + 0.1 * Math.sin(t * 5)) - 0.1 + t * 0.2]);
    }
    p.curve(pts.filter(function(_, i) { return i % 2 === 0; }), K);
    p.tint(rectPts(-0.6, -0.4, 1.2, 0.8), { a: 0.5 });
    // => ; ()
    const ay = r.chance(0.5) ? 0.6 : -0.6;
    p.line(-0.25, ay - 0.04, 0.05, ay - 0.04, {});
    p.line(-0.25, ay + 0.04, 0.05, ay + 0.04, {});
    p.path([[0.02, ay - 0.12], [0.2, ay], [0.02, ay + 0.12]], { join: true });
    if (p.d) {
      p.text('()', -0.35, -ay + 0.07, 0.14, {});
      p.dot(0.3, -ay - 0.02, { r: 1.2 });
      p.line(0.3, -ay + 0.05, 0.27, -ay + 0.12, {});
      p.text('!', 0.45, -ay + 0.07, 0.14, L);
    }
  });

  // javascript: the loop that never rests, and what queues for it
  def('javascript', 1.3, function(p, r) {
    const cx = 0.45, cy = r.range(-0.05, 0.1), R = 0.55, a0 = r() * TAU;
    for (let k = 0; k < 2; k++) {
      const s = a0 + k * Math.PI + 0.25, e = s + Math.PI - 0.5;
      p.arc(cx, cy, R, s, e, opt(B, K, { twice: true }));
      p.head(cx + Math.cos(e - 0.3) * R, cy + Math.sin(e - 0.3) * R, cx + Math.cos(e) * R, cy + Math.sin(e) * R, opt(B, K));
    }
    p.tint(ngon(cx, cy, R, 14), { a: 0.5 });
    // a curl in the middle, a queue waiting to get in
    const pts = [];
    for (let i = 0; i <= 36; i++) {
      const t = i / 36, a = t * 3.5 * TAU;
      pts.push([cx - 0.22 + t * 0.44 + Math.sin(a) * 0.09, cy + Math.cos(a) * 0.12]);
    }
    p.curve(pts, {});
    const n = 3 + r.int(2) + p.d;
    for (let i = 0; i < n; i++) {
      const x = cx - R - 0.3 - i * 0.24, y = cy + r.range(-0.03, 0.03);
      if (x < -1.25) break;
      p.rect(x, y - 0.1, 0.18, 0.2, i === 0 ? B : {});
      if (r.chance(0.5)) p.hatch(rectPts(x, y - 0.1, 0.18, 0.2), 0.8, { sp: 3 });
    }
    p.arrow(cx - R - 0.1, cy, cx - R + 0.12, cy, { head: 4.5 });
    p.curve([[cx + R * 0.7, cy - R * 0.8], [cx + R, cy - R * 1.3], [cx + R * 0.4, cy - R * 1.5]], L);
    if (p.d) {
      p.text('()=>', -1.2, cy - 0.3, 0.12, L);
      p.text('{}', cx + R + 0.1, cy + 0.5, 0.14, {});
    }
  });

  // api: a plug and its socket
  def('api', 1.45, function(p, r) {
    const gap = r.range(0.14, 0.3), y = r.range(-0.1, 0.1);
    // the plug
    const px = -gap / 2 - 0.2;
    p.path([[px - 0.5, y - 0.3], [px - 0.08, y - 0.3], [px, y - 0.22], [px, y + 0.22], [px - 0.08, y + 0.3], [px - 0.5, y + 0.3]], opt(B, { closed: true }));
    p.rect(px, y - 0.17, 0.2, 0.07, {});
    p.rect(px, y + 0.1, 0.2, 0.07, {});
    p.hatch(rectPts(px - 0.5, y - 0.3, 0.14, 0.6), 0.8, { sp: 2.6 });
    p.curve([[px - 0.5, y], [px - 0.72, y + 0.02], [px - 0.9, y + 0.3], [-1.42, y + 0.36 + r.range(-0.2, 0.2)]], {});
    p.curve([[px - 0.5, y + 0.07], [px - 0.7, y + 0.1], [px - 0.86, y + 0.38], [-1.42, y + 0.44 + r.range(-0.2, 0.2)]], L);
    // the socket
    const sx = gap / 2 + 0.2;
    p.rect(sx, y - 0.42, 0.62, 0.84, B);
    p.rect(sx + 0.02, y - 0.17, 0.22, 0.07, {});
    p.rect(sx + 0.02, y + 0.1, 0.22, 0.07, {});
    p.hatch([rectPts(sx, y - 0.42, 0.62, 0.84), rectPts(sx, y - 0.19, 0.26, 0.38)], 0.8, { sp: 3.2 });
    p.tint(rectPts(sx, y - 0.42, 0.62, 0.84), { a: 0.5 });
    p.tint(rectPts(px - 0.5, y - 0.3, 0.5, 0.6), { a: 0.35 });
    p.curve([[sx + 0.62, y], [sx + 0.85, y - 0.03], [1.1, y - 0.3], [1.42, y - 0.32 + r.range(-0.15, 0.15)]], {});
    p.arrow(px + 0.22, y - 0.5, sx - 0.02, y - 0.5, opt(K, { head: 4 }));
    if (p.d) {
      p.arrow(sx - 0.02, y + 0.5, px + 0.22, y + 0.5, opt(K, { head: 4, dashed: true }));
      p.text(r.pick(['GET', 'V1', 'RPC', 'PUT']), px - 0.15, y - 0.52, 0.1, L);
      p.text(r.pick(['200', 'OK', '404']), sx + 0.05, y + 0.72, 0.1, L);
      p.dash(0, y - 0.8, 0, y + 0.8, C);
    }
  });
  // api: two parts and the join between them
  def('api', 1.3, function(p, r) {
    const y = -0.45, h = 0.9, tab = 0.2, ty = y + h * r.range(0.3, 0.5);
    const left = [[-1.1, y], [0, y], [0, ty], [tab, ty - 0.05], [tab, ty + 0.25], [0, ty + 0.2], [0, y + h], [-1.1, y + h]];
    const g = r.range(0.06, 0.16);
    const right = [[1.1, y], [g, y], [g, ty], [g + tab, ty - 0.05], [g + tab, ty + 0.25], [g, ty + 0.2], [g, y + h], [1.1, y + h]];
    p.path(left, opt(B, { closed: true }));
    p.path(right, opt({ closed: true }));
    p.hatch(left, 0.8, { sp: 3.4 });
    p.tint(left, { a: 0.45 });
    p.arrow(-0.8, y - 0.2, 0.8, y - 0.2, opt(K, { head: 4 }));
    p.arrow(0.8, y + h + 0.2, -0.8, y + h + 0.2, opt(K, { head: 4, dashed: true }));
    if (p.d) {
      p.text(r.pick(['REQ', 'GET', 'CALL']), -0.3, y - 0.26, 0.1, L);
      p.text(r.pick(['RES', '200', 'OK']), -0.2, y + h + 0.42, 0.1, L);
      p.scrawl(0.4, y + 0.3, 0.55, { h: 0.05, w: 0.6 });
      p.scrawl(0.4, y + 0.5, 0.4, { h: 0.05, w: 0.6 });
    }
  });

  // hardware: a chip and its traces
  def('hardware', 1.45, function(p, r) {
    const pins = 4 + r.int(2), cw = 0.62, ch = pins * 0.2 + 0.1, cx = r.range(-0.25, 0.25), cy = r.range(-0.1, 0.1);
    p.rect(cx - cw / 2, cy - ch / 2, cw, ch, B);
    p.arc(cx, cy - ch / 2, 0.07, 0, Math.PI, {});
    p.hatch(rectPts(cx - cw / 2, cy - ch / 2, cw, ch), 0.8, { sp: 4.5, w: 0.45 });
    p.tint(rectPts(cx - cw / 2, cy - ch / 2, cw, ch), { a: 0.55 });
    p.dot(cx - cw / 2 + 0.09, cy - ch / 2 + 0.09, { r: 1.2 });
    for (let side = -1; side <= 1; side += 2) {
      for (let i = 0; i < pins; i++) {
        const y = cy - ch / 2 + 0.15 + i * 0.2, x = cx + side * cw / 2;
        p.line(x, y, x + side * 0.1, y, opt(B, { over: 0 }));
        if (r.chance(0.2)) continue;
        // out, a 45 degree jog, on to a pad
        const run = r.range(0.1, 0.35), jog = (i - (pins - 1) / 2) * r.range(0.1, 0.22);
        const x1 = x + side * (0.1 + run), x2 = x1 + side * Math.abs(jog), y2 = y + jog;
        const xe = clamp(x2 + side * r.range(0.1, 0.5), -1.38, 1.38);
        if (Math.abs(y2) > 0.9) continue;
        p.path([[x + side * 0.1, y], [x1, y], [x2, y2], [xe, y2]], opt(K, { join: true, w: 0.85 }));
        const kind = r();
        if (kind < 0.55) p.node(xe + side * 0.04, y2, 0.04, { c: 1 });
        else if (kind < 0.75) p.rect(xe, y2 - 0.04, side * 0.09, 0.08, K);
      }
    }
    // a resistor, drawn as the zigzag
    if (p.d) {
      const ry = cy + ch / 2 + 0.22;
      if (ry < 0.9) {
        p.line(cx - 0.6, ry, cx - 0.3, ry, {});
        p.zig(cx - 0.3, ry, cx + 0.2, ry, 0.06, 6, {});
        p.line(cx + 0.2, ry, cx + 0.5, ry, {});
        p.line(cx + 0.5, ry - 0.08, cx + 0.5, ry + 0.08, B);
        p.line(cx + 0.56, ry - 0.08, cx + 0.56, ry + 0.08, B);
        p.text('R1', cx - 0.15, ry + 0.2, 0.09, L);
      }
      p.text('U' + (1 + r.int(8)), cx - 0.1, cy + 0.05, 0.1, {});
    }
  });

  // async: interleaved timelines
  def('async', 1.6, function(p, r) {
    const lanes = 3 + (p.d && r.chance(0.5) ? 1 : 0), a = 1.5, ys = [];
    for (let i = 0; i < lanes; i++) ys.push(lerp(-0.6, 0.6, lanes === 1 ? 0.5 : i / (lanes - 1)));
    let x = -a, lane = r.int(lanes);
    const starts = ys.map(function() { return -a; });
    ys.forEach(function(y) {
      p.line(-a - 0.02, y - 0.07, -a - 0.02, y + 0.07, {});
    });
    while (x < a - 0.15) {
      const run = Math.min(a - x, r.range(0.3, 0.7));
      const y = ys[lane];
      if (x > starts[lane] + 0.02) p.dash(starts[lane], y, x, y, opt(L, { dash: 3 }));
      p.line(x, y, x + run, y, opt(B, K, { over: 0 }));
      p.tint(rectPts(x, y - 0.07, run, 0.14), { a: 0.6 });
      starts[lane] = x + run;
      x += run;
      if (x >= a - 0.15) break;
      let next = r.int(lanes - 1);
      if (next >= lane) next++;
      // the hand-over
      const y2 = ys[next];
      p.curve([[x, y], [x + 0.08, lerp(y, y2, 0.3)], [x + 0.03, lerp(y, y2, 0.75)], [x + 0.06, y2 - Math.sign(y2 - y) * 0.03]], L);
      p.head(x + 0.03, lerp(y, y2, 0.6), x + 0.06, y2 - Math.sign(y2 - y) * 0.03, opt(L, { head: 4 }));
      p.node(x, y, 0.035, { fill: true });
      lane = next;
      x += 0.07;
    }
    ys.forEach(function(y, i) {
      if (starts[i] < a - 0.05) p.dash(starts[i], y, a, y, opt(L, { dash: 3 }));
      p.head(a - 0.2, y, a + 0.04, y, opt(L, { head: 4 }));
    });
    if (p.d) p.text('T', a - 0.1, ys[lanes - 1] + 0.3, 0.1, L);
  });

  // go: parallel lanes, things passed between them
  def('go', 1.5, function(p, r) {
    const lanes = 3 + r.int(2), a = 1.4, ys = [];
    for (let i = 0; i < lanes; i++) ys.push(lerp(-0.7, 0.7, i / (lanes - 1)));
    const forks = [];
    ys.forEach(function(y, i) {
      const x0 = i === 0 ? -a : -a + r.range(0.15, 0.9);
      forks.push(x0);
      p.line(x0, y, a, y, i === 0 ? B : {});
      if (i > 0) {     // spawned from the lane above
        p.curve([[x0 - 0.3, ys[i - 1]], [x0 - 0.12, ys[i - 1] + 0.05], [x0 - 0.08, y - 0.06], [x0, y]], {});
      }
      p.head(a - 0.2, y, a + 0.05, y, { head: 5 });
      const n = 1 + r.int(2 + p.d);
      for (let k = 0; k < n; k++) {
        const bx = lerp(Math.max(x0, -a) + 0.1, a - 0.5, (k + r.range(0.1, 0.9)) / n), bw = r.range(0.15, 0.3);
        p.rect(bx, y - 0.07, bw, 0.14, {});
        p.tint(rectPts(bx, y - 0.07, bw, 0.14), { a: 0.7 });
        if (r.chance(0.5)) p.hatch(rectPts(bx, y - 0.07, bw, 0.14), 0.9, { sp: 2.6 });
      }
    });
    // channels
    const n = 2 + r.int(2) + p.d;
    for (let k = 0; k < n; k++) {
      const i = r.int(lanes - 1), x = r.range(Math.max(forks[i], forks[i + 1]) + 0.1, a - 0.2);
      const down = r.chance(0.6);
      const y1 = down ? ys[i] : ys[i + 1], y2 = down ? ys[i + 1] : ys[i];
      p.arrow(x, y1, x, y2 - Math.sign(y2 - y1) * 0.02, opt(K, { head: 4.5 }));
      p.node(x, y1, 0.035, { c: 1, fill: true });
    }
    if (p.d) p.text('GO', -a + 0.02, ys[0] - 0.14, 0.13, {});
  });

  // os: rings, the kernel in the middle
  def('os', 1.0, function(p, r) {
    const rings = 3 + (p.d ? 1 : 0), R = 0.9;
    for (let i = 0; i < rings; i++) p.circle(0, 0, R * (i + 1) / rings, i === 0 ? B : {});
    p.hatch(ngon(0, 0, R / rings, 14), 0.8, { sp: 2.4, w: 0.65 });
    p.tint(ngon(0, 0, R / rings, 14), { a: 0.7 });
    p.tint([ngon(0, 0, R * 2 / rings, 18), ngon(0, 0, R / rings, 14)], { a: 0.3, evenodd: true });
    for (let i = 1; i < rings; i++) {
      const n = 2 + i + r.int(2), a0 = r() * TAU;
      for (let k = 0; k < n; k++) {
        const a = a0 + k / n * TAU, r0 = R * i / rings, r1 = R * (i + 1) / rings;
        p.line(Math.cos(a) * r0, Math.sin(a) * r0, Math.cos(a) * r1, Math.sin(a) * r1, opt(L, { over: 0 }));
      }
    }
    const a = r.range(-0.9, -0.4);
    p.arrow(Math.cos(a) * R * 1.12, Math.sin(a) * R * 1.12, Math.cos(a) * R * 0.4, Math.sin(a) * R * 0.4, opt(K, { head: 4.5 }));
    if (p.d) {
      p.text('K', -0.06, 0.06, 0.12, B);
      p.text('SYSCALL', Math.cos(a) * R * 1.12 - 0.1, Math.sin(a) * R * 1.12 - 0.05, 0.085, L);
    }
  });
  // os: the address space, stack and heap growing at each other
  def('os', 0.8, function(p, r) {
    const x = -0.4, w = 0.7, top = -0.92, cuts = [0, 0.16, 0.42, 0.66, 0.84, 1];
    p.rect(x, top, w, 1.84, {});
    for (let i = 1; i < cuts.length - 1; i++) {
      const y = top + cuts[i] * 1.84 + r.range(-0.03, 0.03);
      cuts[i] = (y - top) / 1.84;
      if (i === 2 || i === 3) p.dash(x, y, x + w, y, {}); else p.line(x, y, x + w, y, { over: 1 });
    }
    const band = function(i) { return rectPts(x, top + cuts[i] * 1.84, w, (cuts[i + 1] - cuts[i]) * 1.84); };
    p.hatch(band(0), 0.8, { sp: 2.6, w: 0.65 });
    p.hatch(band(4), -0.8, { sp: 3.4 });
    p.hatch(band(1), 0.8, { sp: 4.2, w: 0.45 });
    p.tint(band(0), { a: 0.6 });
    p.tint(band(3), { a: 0.35 });
    const ym = top + (cuts[2] + cuts[3]) / 2 * 1.84;
    p.arrow(x + w * 0.35, top + cuts[2] * 1.84 - 0.1, x + w * 0.35, ym - 0.02, opt(K, { head: 4 }));
    p.arrow(x + w * 0.65, top + cuts[3] * 1.84 + 0.1, x + w * 0.65, ym + 0.02, opt(K, { head: 4 }));
    for (let i = 0; i < cuts.length; i++) p.line(x + w, top + cuts[i] * 1.84, x + w + 0.08, top + cuts[i] * 1.84, C);
    if (p.d) {
      p.text('0XFF', x + w + 0.12, top + 0.1, 0.085, L);
      p.text('0X00', x + w + 0.12, top + 1.84, 0.085, L);
      p.text('>_', x + w + 0.14, 0.05, 0.12, {});
    }
  });

  // c: cells of memory and something pointing at them
  def('c', 1.45, function(p, r) {
    const n = 5 + r.int(3), cw = 2.5 / n, x0 = -1.25, y = -0.45, ch = 0.36;
    p.line(x0 - 0.1, y, x0 + n * cw + 0.12, y, { over: 4 });
    p.line(x0 - 0.1, y + ch, x0 + n * cw + 0.12, y + ch, { over: 4 });
    for (let i = 0; i <= n; i++) p.line(x0 + i * cw, y, x0 + i * cw, y + ch, { over: 2 });
    const word = r.pick(['HELLO', 'ARMIN', 'ABCDE', 'LUCUMR', 'FOO']);
    const target = r.int(n - 1);
    for (let i = 0; i < n; i++) {
      const cx = x0 + (i + 0.5) * cw;
      if (i < n - 1 && i < word.length) p.text(word[i], cx, y + ch * 0.75, ch * 0.5, opt(L, { align: 'c' }));
      else if (i === Math.min(n - 1, word.length)) {
        p.line(cx - 0.1, y + ch * 0.25, cx - 0.02, y + ch * 0.75, L);
        p.text('0', cx + 0.02, y + ch * 0.75, ch * 0.5, L);
        p.hatch(rectPts(x0 + i * cw, y, cw, ch), 0.8, { sp: 3 });
      }
      if (p.d) p.text(String(i), cx, y - 0.08, 0.075, opt(C, { align: 'c' }));
    }
    p.tint(rectPts(x0 + target * cw, y, cw, ch), { a: 0.6 });
    // the pointer
    const px = x0 + target * cw + r.range(-0.3, 0.6), py = 0.5;
    p.rect(px, py, 0.36, 0.28, B);
    p.dot(px + 0.18, py + 0.14, { r: 1.5 });
    const tx = x0 + (target + 0.5) * cw;
    p.curve([[px + 0.18, py + 0.14], [lerp(px + 0.18, tx, 0.3), py - 0.1], [tx + 0.02, y + ch + 0.22], [tx, y + ch + 0.04]], K);
    p.head(tx + 0.02, y + ch + 0.25, tx, y + ch + 0.04, opt(K, { head: 5 }));
    p.text('*P', px - 0.3, py + 0.22, 0.12, {});
    if (p.d && target + 1 < n) {
      const t2 = x0 + (target + 1.5) * cw;
      p.dash(px + 0.36, py + 0.1, t2, y + ch + 0.06, opt(L, { dash: 3 }));
      p.text('P+1', t2 + 0.05, py + 0.05, 0.09, L);
    }
  });

  // games: noughts and crosses
  def('games', 1.0, function(p, r) {
    const s = 0.56, g = p.sub(0, 0, 1, r.range(-0.12, 0.12));
    g.line(-s / 2, -s * 1.5, -s / 2 + r.range(-0.03, 0.03), s * 1.5, {});
    g.line(s / 2, -s * 1.5, s / 2 + r.range(-0.03, 0.03), s * 1.5, {});
    g.line(-s * 1.5, -s / 2, s * 1.5, -s / 2 + r.range(-0.03, 0.03), {});
    g.line(-s * 1.5, s / 2, s * 1.5, s / 2 + r.range(-0.03, 0.03), {});
    const line = r.pick([[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]]);
    for (let i = 0; i < 9; i++) {
      const cx = (i % 3 - 1) * s, cy = (Math.floor(i / 3) - 1) * s, win = line.indexOf(i) >= 0;
      if (!win && r.chance(0.35)) continue;
      if (win) {
        g.line(cx - 0.17, cy - 0.17, cx + 0.17, cy + 0.17, K);
        g.line(cx + 0.17, cy - 0.17, cx - 0.17, cy + 0.17, K);
      } else {
        g.circle(cx, cy, 0.17, {});
      }
    }
    const A = line[0], Z = line[2];
    const ax = (A % 3 - 1) * s, ay = (Math.floor(A / 3) - 1) * s, zx = (Z % 3 - 1) * s, zy = (Math.floor(Z / 3) - 1) * s;
    const dx = zx - ax, dy = zy - ay, dl = Math.hypot(dx, dy);
    g.line(ax - dx / dl * 0.3, ay - dy / dl * 0.3, zx + dx / dl * 0.3, zy + dy / dl * 0.3, opt(K, { twice: true }));
    g.tint(rectPts(-s / 2, -s / 2, s, s), { a: 0.55 });
    g.tint(rectPts((line[0] % 3 - 1.5) * s, (Math.floor(line[0] / 3) - 1.5) * s, s, s), { a: 0.5 });
  });
  // games: a die, mid roll
  def('games', 1.0, function(p, r) {
    const s = 0.62, rot = r.range(-0.5, 0.5);
    const q = function(x, y, z) {
      const X = x * Math.cos(rot) - y * Math.sin(rot), Y = x * Math.sin(rot) + y * Math.cos(rot);
      const v = iso(X * s, Y * s, z * s);
      return [v[0], v[1] + 0.3];
    };
    const face = function(pts, pips, hatch) {
      p.path(pts, { closed: true, over: 1.5 });
      const at = function(u, v) {
        return [lerp(lerp(pts[0][0], pts[1][0], u), lerp(pts[3][0], pts[2][0], u), v), lerp(lerp(pts[0][1], pts[1][1], u), lerp(pts[3][1], pts[2][1], u), v)];
      };
      const spots = { 1: [[0.5, 0.5]], 2: [[0.25, 0.25], [0.75, 0.75]], 3: [[0.25, 0.25], [0.5, 0.5], [0.75, 0.75]],
        4: [[0.25, 0.25], [0.75, 0.25], [0.25, 0.75], [0.75, 0.75]], 5: [[0.25, 0.25], [0.75, 0.25], [0.5, 0.5], [0.25, 0.75], [0.75, 0.75]],
        6: [[0.25, 0.2], [0.25, 0.5], [0.25, 0.8], [0.75, 0.2], [0.75, 0.5], [0.75, 0.8]] }[pips];
      if (hatch) p.hatch(pts, 1.1, { sp: 3.6, w: 0.45 });
      spots.forEach(function(sp) { const v = at(sp[0], sp[1]); p.dot(v[0], v[1], { r: 2.2, c: 1 }); });
    };
    const a = r.int(6) + 1, b = a % 6 + 1, c = (a + 2) % 6 + 1;
    face([q(-0.5, -0.5, 1), q(0.5, -0.5, 1), q(0.5, 0.5, 1), q(-0.5, 0.5, 1)], a, false);
    face([q(-0.5, 0.5, 1), q(0.5, 0.5, 1), q(0.5, 0.5, 0), q(-0.5, 0.5, 0)], b, false);
    face([q(0.5, 0.5, 1), q(0.5, -0.5, 1), q(0.5, -0.5, 0), q(0.5, 0.5, 0)], c, true);
    p.tint([q(-0.5, -0.5, 1), q(0.5, -0.5, 1), q(0.5, -0.5, 0), q(0.5, 0.5, 0), q(-0.5, 0.5, 0), q(-0.5, 0.5, 1)], { a: 0.5 });
    for (let i = 0; i < 2 + p.d; i++) p.arc(-0.2, 0.2, 0.95 + i * 0.1, -2.6 - i * 0.1, -2.0, L);
    p.line(-0.9, 0.95, 0.9, 0.93, C);
  });

  // design: a curve and its handles
  def('design', 1.35, function(p, r) {
    const A = [-1.1, r.range(0.2, 0.6)], M = [r.range(-0.2, 0.2), r.range(-0.2, 0.1)], Z = [1.1, r.range(-0.6, -0.1)];
    const h1 = [A[0] + r.range(0.3, 0.6), A[1] - r.range(0.7, 1.0)];
    const ang = r.range(-0.4, 0.4), hl = r.range(0.45, 0.6);
    const h2 = [M[0] - Math.cos(ang) * hl, M[1] - Math.sin(ang) * hl], h3 = [M[0] + Math.cos(ang) * hl, M[1] + Math.sin(ang) * hl];
    const h4 = [Z[0] - r.range(0.3, 0.6), Z[1] + r.range(0.5, 0.9)];
    const bez = function(a, b, c, d) {
      const out = [];
      for (let i = 0; i <= 12; i++) {
        const t = i / 12, u = 1 - t;
        out.push([u * u * u * a[0] + 3 * u * u * t * b[0] + 3 * u * t * t * c[0] + t * t * t * d[0], u * u * u * a[1] + 3 * u * u * t * b[1] + 3 * u * t * t * c[1] + t * t * t * d[1]]);
      }
      return out;
    };
    const pts = bez(A, h1, h2, M).concat(bez(M, h3, h4, Z).slice(1));
    p.rect(-1.2, -0.85, 2.4, 1.7, C);
    p.line(-1.2, 0, 1.2, 0, C);
    p.line(0, -0.85, 0, 0.85, C);
    p.tint(pts.concat([[1.1, 0.85], [-1.1, 0.85]]), { a: 0.35 });
    p.curve(pts.filter(function(_, i) { return i % 2 === 0; }), opt(B, { twice: true }));
    [[A, h1], [M, h2], [M, h3], [Z, h4]].forEach(function(e) {
      p.line(e[0][0], e[0][1], e[1][0], e[1][1], opt(K, { over: 0, w: 0.75 }));
      p.circle(e[1][0], e[1][1], 0.04, K);
    });
    [A, M, Z].forEach(function(q) { p.box(q[0], q[1], 0.09, 0.09, {}); });
    if (p.d) {
      p.dash(h1[0], h1[1], h2[0], h2[1], C);
      p.dash(h3[0], h3[1], h4[0], h4[1], C);
    }
  });
  // design: squares and the spiral through them
  def('design', 1.45, function(p, r) {
    let x = -1.3, y = -0.8, w = 2.6, h = 2.6 / 1.618;
    const fx = r.chance(0.5) ? -1 : 1, fy = r.chance(0.5) ? -1 : 1;
    const T = function(q) { return [q[0] * fx, q[1] * fy]; };
    const seg = function(a, b, o) { const A = T(a), Bq = T(b); p.line(A[0], A[1], Bq[0], Bq[1], o); };
    p.path(rectPts(x, y, w, h).map(T), { closed: true, over: 3 });
    const n = 5 + p.d, spiral = [];
    for (let i = 0; i < n; i++) {
      const dir = i % 4, s = Math.min(w, h);
      let c, a0;
      if (dir === 0) { seg([x + s, y], [x + s, y + h], L); c = [x + s, y + s]; a0 = Math.PI; x += s; w -= s; }
      else if (dir === 1) { seg([x, y + s], [x + w, y + s], L); c = [x, y + s]; a0 = Math.PI * 1.5; y += s; h -= s; }
      else if (dir === 2) { seg([x + w - s, y], [x + w - s, y + h], L); c = [x + w - s, y]; a0 = 0; w -= s; }
      else { seg([x, y + h - s], [x + w, y + h - s], L); c = [x + s, y + h - s]; a0 = Math.PI / 2; h -= s; }
      const arc = [];
      for (let k = 0; k <= 8; k++) {
        const a = a0 + k / 8 * Math.PI / 2;
        arc.push(T([c[0] + Math.cos(a) * s, c[1] + Math.sin(a) * s]));
      }
      if (i === 0) p.tint(arc.concat([T(c)]), { a: 0.4 });
      if (i === 2) p.tint(arc.concat([T(c)]), { a: 0.6 });
      for (let k = i ? 1 : 0; k < arc.length; k++) spiral.push(arc[k]);
      if (p.d && i < 2) p.dash(T(c)[0], T(c)[1], arc[4][0], arc[4][1], C);
    }
    p.curve(spiral.filter(function(_, i) { return i % 2 === 0 || i === spiral.length - 1; }), K);
  });

  // wsgi: plumbing between layers
  def('wsgi', 1.35, function(p, r) {
    const a = 1.25, yt = -0.72, yb = 0.72, th = 0.16;
    p.rect(-a, yt - th, a * 2, th, {});
    p.rect(-a, yb, a * 2, th, {});
    p.hatch(rectPts(-a, yt - th, a * 2, th), 0.8, { sp: 3 });
    p.hatch(rectPts(-a, yb, a * 2, th), -0.8, { sp: 3 });
    const pipes = 2 + (p.d ? 1 : 0), pw = 0.085;
    for (let i = 0; i < pipes; i++) {
      const x1 = lerp(-a * 0.75, a * 0.5, (i + r.range(0.2, 0.8)) / pipes), x2 = clamp(x1 + r.range(0.25, 0.6) * (r.chance(0.5) ? 1 : -1), -a * 0.85, a * 0.85);
      const ym = r.range(-0.25, 0.25), s = Math.sign(x2 - x1);
      const run = function(off) {
        p.path([[x1 + off, yt], [x1 + off, ym - off * s], [x2 + off, ym - off * s], [x2 + off, yb]], { join: false, over: 1 });
      };
      run(-pw);
      run(pw);
      p.tint([[x1 - pw, yt], [x1 + pw, yt], [x1 + pw, ym - pw * s], [x2 + pw, ym - pw * s], [x2 + pw, yb], [x2 - pw, yb], [x2 - pw, ym + pw * s], [x1 - pw, ym + pw * s]], { a: 0.55 });
      // flanges
      [[x1, yt + 0.06], [x2, yb - 0.06]].forEach(function(q) { p.rect(q[0] - pw * 1.6, q[1] - 0.03, pw * 3.2, 0.06, B); });
      p.line(x1 - pw, ym - pw * s - 0.1, x1 + pw, ym - pw * s - 0.1, L);
      p.line(x2 - pw, ym + pw + 0.1, x2 + pw, ym + pw + 0.1, L);
      const down = i % 2 === 0;
      const ax = x2 + pw + 0.12;
      if (down) p.arrow(ax, ym + 0.15, ax, yb - 0.15, opt(K, { head: 4 }));
      else p.arrow(ax, yb - 0.15, ax, ym + 0.15, opt(K, { head: 4 }));
      if (i === 0) {     // a valve
        const vx = (x1 + x2) / 2, vy = ym;
        p.path([[vx - 0.1, vy - 0.14], [vx + 0.1, vy + 0.14], [vx + 0.1, vy - 0.14], [vx - 0.1, vy + 0.14]], opt(B, { closed: true }));
        p.line(vx, vy, vx, vy - 0.26, {});
        p.line(vx - 0.1, vy - 0.26, vx + 0.1, vy - 0.26, B);
      }
    }
    if (p.d) {
      p.text('SERVER', -a + 0.05, yt - th - 0.06, 0.09, L);
      p.text('APP', -a + 0.05, yb + th + 0.16, 0.09, L);
    }
  });

  // ---- register tags: the handwriting

  // thoughts: rows of writing, something scribbled in the margin
  def('thoughts', 1.5, function(p, r) {
    const rows = 3 + r.int(2) + p.d, lh = 1.5 / (rows + 0.5), a = 1.4, x0 = -a + 0.3;
    const h = Math.min(0.11, lh * 0.36);
    let struck = -1;
    for (let i = 0; i < rows; i++) {
      const y = -0.6 + i * lh, w = (i === rows - 1 ? r.range(0.4, 0.75) : r.range(0.8, 1)) * (a * 2 - 0.35);
      const end = p.scrawl(x0 + (i === 0 ? 0.18 : 0), y, w, { h: h });
      if (struck < 0 && i > 0 && r.chance(0.3)) {
        struck = i;
        const sx = x0 + r.range(0.2, w * 0.5);
        p.line(sx, y - h * 0.5, Math.min(end, sx + r.range(0.3, 0.6)), y - h * 0.4, {});
      }
    }
    // the margin: a spiral, a bracket, an arrow back into the text
    const kind = r.int(3), my = r.range(-0.4, 0.3);
    if (kind === 0) {
      const pts = [];
      for (let i = 0; i <= 40; i++) {
        const t = i / 40, q = t * 3.2 * TAU;
        pts.push([-a + 0.08 + Math.cos(q) * 0.13 * t, my + Math.sin(q) * 0.13 * t]);
      }
      p.curve(pts.filter(function(_, i) { return i % 2 === 0; }), L);
    } else if (kind === 1) {
      p.curve([[-a + 0.18, my - 0.3], [-a + 0.06, my - 0.26], [-a + 0.1, my - 0.03], [-a, my], [-a + 0.1, my + 0.03], [-a + 0.06, my + 0.26], [-a + 0.18, my + 0.3]], {});
    } else {
      p.curve([[-a - 0.05, my + 0.3], [-a + 0.02, my + 0.05], [-a + 0.2, my]], L);
      p.head(-a + 0.05, my + 0.03, -a + 0.22, my, L);
      p.text('?', -a - 0.1, my + 0.52, 0.13, L);
    }
    p.tint(rectPts(x0, -0.6 - h, 1.2, lh), { a: 0.25 });
  });

  // tutorial: numbered steps on ruled lines
  def('tutorial', 1.4, function(p, r) {
    const n = 3 + (p.d ? 1 : 0), lh = 1.6 / n, a = 1.3;
    p.line(-a + 0.34, -0.95, -a + 0.34, 0.95, opt(K, { w: 0.6, wob: 0.3 }));
    for (let i = 0; i < n; i++) {
      const y = -0.78 + i * lh + lh * 0.5;
      p.line(-a, y + 0.06, a, y + 0.06, opt(C, { wob: 0.3 }));
      if (p.d) p.line(-a, y + 0.06 - lh / 2, a, y + 0.06 - lh / 2, opt(C, { wob: 0.3 }));
      p.text(String(i + 1), -a + 0.08, y, Math.min(0.2, lh * 0.42), {});
      p.dot(-a + 0.26, y - 0.015, { r: 1 });
      p.scrawl(-a + 0.45, y, r.range(1.0, 2.0), { h: Math.min(0.075, lh * 0.2), w: 0.8 });
      if (p.d) p.scrawl(-a + 0.45, y - lh / 2, r.range(0.5, 1.6), { h: Math.min(0.075, lh * 0.2), w: 0.7 });
      // a ticked box at the end of a finished step
      if (i < n - 1 || r.chance(0.3)) {
        p.rect(a - 0.2, y - 0.13, 0.13, 0.13, L);
        p.path([[a - 0.19, y - 0.07], [a - 0.14, y - 0.01], [a - 0.03, y - 0.2]], opt(K, { join: true }));
      } else {
        p.rect(a - 0.2, y - 0.13, 0.13, 0.13, L);
      }
    }
    p.tint(rectPts(-a, -0.8, 0.34, 1.6), { a: 0.45 });
  });

  // life: the ring a cup left, a line or two
  def('life', 1.1, function(p, r) {
    const cx = r.range(-0.3, 0.3), cy = r.range(-0.15, 0.15), R = r.range(0.55, 0.68);
    p.ring(cx, cy, R, { a: 0.8 });
    if (r.chance(0.5)) p.ring(cx + r.range(0.5, 0.8) * (r.chance(0.5) ? 1 : -1), cy + r.range(-0.2, 0.2), R * r.range(0.85, 1), { a: 0.45 });
    p.arc(cx, cy, R * 1.02, r() * TAU, r() * TAU + 1.6, C);
    p.scrawl(cx - R * 0.7, cy + 0.05, R * 1.3, { h: 0.08, w: 0.7 });
    if (p.d) p.scrawl(cx - R * 0.6, cy + 0.28, R * 0.8, { h: 0.08, w: 0.7 });
  });

  // politics: underlined hard, crossed out
  def('politics', 1.4, function(p, r) {
    const rows = 3 + p.d, lh = 1.5 / rows, a = 1.3, h = Math.min(0.11, lh * 0.3);
    const under = r.int(rows - 1), cross = under + 1 + r.int(rows - under - 1);
    for (let i = 0; i < rows; i++) {
      const y = -0.6 + i * lh + lh * 0.3, w = r.range(1.5, 2.4), x = -a + 0.2 + r.range(0, 0.15);
      const end = p.scrawl(x, y, w, { h: h, w: 1 });
      if (i === under) {
        const ux = x + r.range(0, 0.3), ue = Math.min(end, ux + r.range(0.8, 1.4));
        p.line(ux, y + 0.09, ue, y + 0.08, opt(B, K, { twice: true }));
        p.line(ue, y + 0.15, ux + 0.1, y + 0.16, opt(B, K));
        p.text('!', ue + 0.12, y + 0.02, 0.2, opt(B, K));
        if (p.d) p.text('!', ue + 0.24, y + 0.02, 0.2, opt(B, K));
      }
      if (i === cross) {
        const sx = x + r.range(0.1, 0.5), se = Math.min(end, sx + r.range(0.6, 1.0));
        p.scribble(sx, y - h * 0.5, se, y - h * 0.5, h * 0.9, { w: 1.2, pitch: 3 });
        p.tint(rectPts(sx, y - h * 1.6, se - sx, h * 2.2), { a: 0.6 });
      }
    }
    p.path([[-a + 0.1, -0.7], [-a, -0.7], [-a + 0.02, 0.7], [-a + 0.12, 0.7]], opt(B, { join: true }));
  });

  // business: a ledger
  def('business', 1.25, function(p, r) {
    const rows = 4 + p.d * 2, lh = 1.5 / (rows + 1), a = 1.15;
    const c1 = a - 0.75, c2 = a - 0.05;
    p.line(-a, -0.75, a, -0.75, {});
    p.line(-a, -0.72, a, -0.72, L);
    p.line(c1, -0.9, c1, 0.9, opt(K, { w: 0.7 }));
    p.line(c2, -0.9, c2, 0.9, opt(K, { w: 0.7 }));
    for (let i = 0; i < rows; i++) {
      const y = -0.72 + (i + 1) * lh;
      p.line(-a, y, a, y, opt(C, { wob: 0.3 }));
      p.scrawl(-a + 0.05, y - lh * 0.22, r.range(0.5, 1.2), { h: Math.min(0.06, lh * 0.25), w: 0.7 });
      p.text(String(r.int(900) + 100), c2 - 0.06, y - lh * 0.2, lh * 0.45, opt(L, { align: 'r' }));
    }
    const ty = -0.72 + (rows + 1) * lh;
    p.text(String(r.int(9000) + 1000), c2 - 0.06, ty - lh * 0.15, lh * 0.5, opt(B, { align: 'r' }));
    p.line(c1 + 0.05, ty, c2, ty, {});
    p.line(c1 + 0.05, ty + 0.04, c2, ty + 0.04, {});
    p.tint(rectPts(c1, -0.75, c2 - c1, 1.6), { a: 0.4 });
    // tally in the margin
    const tx = -a + 0.1, tyy = 0.82;
    if (p.d) {
      for (let i = 0; i < 4; i++) p.line(tx + i * 0.06, tyy - 0.14, tx + i * 0.06 + 0.01, tyy, {});
      p.line(tx - 0.05, tyy - 0.02, tx + 0.24, tyy - 0.12, {});
    }
  });

  // community: many small marks gathering
  def('community', 1.4, function(p, r) {
    const n = 12 + r.int(6) + p.d * 8, pts = [];
    for (let i = 0; i < n; i++) {
      const a = r() * TAU, d = Math.pow(r(), 0.75);
      pts.push([Math.cos(a) * d * 1.25, Math.sin(a) * d * 0.55 + 0.2, r.range(0.06, 0.1)]);
    }
    pts.sort(function(x, y) { return x[1] - y[1]; });
    pts.forEach(function(q) {
      const s = q[2] * (0.8 + 0.4 * (q[1] + 0.5));
      p.circle(q[0], q[1] - s * 1.5, s, r.chance(0.3) ? K : {});
      p.arc(q[0], q[1] + s * 0.9, s * 1.6, Math.PI * 1.12, Math.PI * 1.88, {});
    });
    p.tint(ngon(0, 0.15, 0.7, 12), { a: 0.4 });
    for (let i = 0; i < 3 + p.d * 2; i++) {      // some still arriving
      const side = r.chance(0.5) ? -1 : 1, x = side * r.range(1.15, 1.35), y = r.range(-0.6, 0.5);
      p.arrow(x, y, x - side * 0.22, y + (0.1 - y) * 0.2, opt(L, { head: 3.5 }));
    }
  });

  // culture: something that blooms, drawn from the middle outwards
  def('culture', 1.05, function(p, r) {
    const cx = r.range(-0.1, 0.1), cy = r.range(-0.1, 0.05), n = 9 + r.int(4) + p.d * 3, R = r.range(0.7, 0.82);
    let a = r() * TAU;
    for (let i = 0; i < n; i++) {
      const t = (i + 1) / n, rad = R * (0.1 + 0.9 * Math.pow(t, 0.8)), sweep = r.range(1.5, 2.3) * (1.1 - 0.3 * t);
      const pts = [];
      for (let k = 0; k <= 8; k++) {
        const u = k / 8, q = rad * (0.82 + 0.26 * Math.sin(u * Math.PI));
        pts.push([cx + Math.cos(a + u * sweep) * q * 1.05, cy + Math.sin(a + u * sweep) * q * 0.95]);
      }
      p.curve(pts, i < 3 ? {} : i > n - 4 ? L : { w: 0.85 });
      if (i === n - 1 || i === Math.floor(n / 2)) p.tint(pts.concat([[cx, cy]]), { a: 0.55, rough: 2 });
      a += sweep * r.range(0.62, 0.8) + 0.5;
    }
    p.tint(ngon(cx, cy, R * 0.45, 10), { a: 0.6, rough: 3 });
    // quotation marks, as one writes them
    const qx = cx + (r.chance(0.5) ? -1 : 1) * 0.85, qy = -0.62;
    for (let i = 0; i < 2; i++) p.curve([[qx + i * 0.1, qy], [qx + i * 0.1 + 0.04, qy - 0.08], [qx + i * 0.1 + 0.02, qy - 0.16]], B);
  });

  // history: a timeline
  def('history', 1.6, function(p, r) {
    const a = 1.5, y = r.range(-0.05, 0.2), year = p.ex.post && p.ex.post.year || 2012;
    p.line(-a, y, a, y, {});
    p.head(a - 0.2, y, a + 0.03, y, {});
    const n = 9 + r.int(4);
    const marks = [r.int(3), 3 + r.int(3), n - 2];
    for (let i = 0; i < n; i++) {
      const x = lerp(-a + 0.1, a - 0.25, i / (n - 1)), mi = marks.indexOf(i);
      p.line(x, y - (mi >= 0 ? 0.16 : 0.06), x, y + 0.06, mi >= 0 ? {} : L);
      if (mi >= 0) {
        const yr = year - (2 - mi) * (2 + r.int(5));
        const up = mi % 2 === 0;
        p.line(x, y + (up ? -0.16 : 0.06), x, y + (up ? -0.42 : 0.38), C);
        p.text(String(yr), x, up ? y - 0.48 : y + 0.6, 0.13, opt(mi === 2 ? {} : L, { align: 'c' }));
        if (mi === 2) p.circle(x, y, 0.07, K);
        else p.dot(x, y, { r: 1.5 });
        if (p.d) p.scrawl(x - 0.25, up ? y - 0.72 : y + 0.8, 0.5, { h: 0.045, w: 0.55 });
      }
    }
    const b0 = lerp(-a + 0.1, a - 0.25, marks[0] / (n - 1)), b1 = lerp(-a + 0.1, a - 0.25, marks[1] / (n - 1));
    p.path([[b0, y + 0.12], [b0, y + 0.2], [b1, y + 0.2], [b1, y + 0.12]], opt(L, { join: true }));
    p.tint(rectPts(b0, y - 0.12, b1 - b0, 0.3), { a: 0.5 });
    p.dash(-a - 0.2, y, -a, y, {});
  });

  // announcement: a burst
  def('announcement', 1.05, function(p, r) {
    const n = 11 + r.int(6), cx = r.range(-0.1, 0.1), cy = r.range(-0.08, 0.08), a0 = r() * TAU;
    for (let i = 0; i < n; i++) {
      const a = a0 + (i + r.range(-0.2, 0.2)) / n * TAU, long = i % 2 === 0;
      const r0 = r.range(0.3, 0.38), r1 = long ? r.range(0.75, 0.95) : r.range(0.5, 0.62);
      p.line(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0 * 0.9, cx + Math.cos(a) * r1, cy + Math.sin(a) * r1 * 0.9, long ? opt(B, K) : {});
    }
    // the asterisk in the middle
    for (let i = 0; i < 3; i++) {
      const a = a0 + i / 3 * Math.PI;
      p.line(cx - Math.cos(a) * 0.17, cy - Math.sin(a) * 0.17, cx + Math.cos(a) * 0.17, cy + Math.sin(a) * 0.17, opt(B, { twice: true }));
    }
    p.tint(ngon(cx, cy, 0.5, 9), { a: 0.6, rough: 2 });
    if (p.d) {
      p.line(-0.6, 0.97, 0.6, 0.95, B);
      p.line(-0.5, 1.02, 0.5, 1.01, {});
    }
  });

  // conferences: a room, a screen, a lot of heads
  def('conferences', 1.4, function(p, r) {
    const a = 1.3;
    p.path([[-0.6, -0.9], [0.6, -0.9], [0.6, -0.32], [-0.6, -0.32]], { closed: true });
    p.scrawl(-0.45, -0.68, 0.7, { h: 0.06 });
    p.line(-0.45, -0.52, 0.2, -0.52, L);
    p.line(-0.45, -0.44, 0.35, -0.44, L);
    p.tint(rectPts(-0.6, -0.9, 1.2, 0.58), { a: 0.45 });
    // the speaker and the lectern
    const sx = r.chance(0.5) ? -0.85 : 0.85;
    p.circle(sx, -0.52, 0.065, {});
    p.line(sx, -0.45, sx, -0.2, {});
    p.line(sx, -0.38, sx - Math.sign(sx) * 0.14, -0.5, {});
    p.rect(sx - Math.sign(sx) * 0.24 - 0.07, -0.34, 0.14, 0.2, K);
    p.line(-a, -0.12, a, -0.12, L);
    const rows = 2 + p.d;
    for (let j = 0; j < rows; j++) {
      const y = 0.2 + j * 0.3, s = 0.075 + j * 0.02;
      for (let x = -a + 0.1 + r.range(0, 0.1); x < a - 0.05; x += s * r.range(2.5, 3.4)) {
        if (r.chance(0.12)) continue;
        p.circle(x, y - s * 1.3, s, {});
        p.arc(x, y + s * 1.1, s * 1.7, Math.PI * 1.13, Math.PI * 1.87, {});
        if (r.chance(0.12)) p.line(x + s, y - s * 0.3, x + s * 1.6, y - s * 2.6, K);   // a hand up
      }
    }
  });

  // covid19: apart
  def('covid19', 1.5, function(p, r) {
    const n = 3, xs = [-1.05, r.range(-0.1, 0.1), 1.05], ys = [r.range(-0.1, 0.25), r.range(-0.25, 0.1), r.range(-0.1, 0.25)];
    for (let i = 0; i < n; i++) {
      const s = 0.09;
      p.circle(xs[i], ys[i] - s * 1.4, s, {});
      p.arc(xs[i], ys[i] + s * 1.2, s * 1.7, Math.PI * 1.12, Math.PI * 1.88, {});
      const m = 16;
      for (let k = 0; k < m; k++) {
        if (r.chance(0.15)) continue;
        const a0 = k / m * TAU, a1 = a0 + TAU / m * 0.55;
        p.arc(xs[i], ys[i], 0.36, a0, a1, L);
      }
      p.tint(ngon(xs[i], ys[i], 0.36, 14), { a: 0.35 });
      if (i > 0) {
        p.arrow(xs[i - 1] + 0.42, (ys[i - 1] + ys[i]) / 2 + 0.5, xs[i] - 0.42, (ys[i - 1] + ys[i]) / 2 + 0.5, opt(L, { both: true, head: 4, dashed: true }));
        if (p.d) p.text('2M', (xs[i - 1] + xs[i]) / 2, (ys[i - 1] + ys[i]) / 2 + 0.72, 0.1, opt(L, { align: 'c' }));
      }
    }
  });

  // ---- project tags: a small stamp

  def('flask', 0.9, function(p, r) {
    const o = K, nw = 0.13, top = -0.85, sh = -0.25, bw = 0.62, bot = 0.72;
    p.line(-nw - 0.05, top, nw + 0.05, top, opt(B, o));
    p.path([[-nw, top], [-nw, sh], [-bw, bot - 0.1]], opt(o, { join: true }));
    p.path([[nw, top], [nw, sh], [bw, bot - 0.1]], opt(o, { join: true }));
    p.curve([[-bw, bot - 0.1], [-bw + 0.04, bot], [0, bot + 0.02], [bw - 0.04, bot], [bw, bot - 0.1]], o);
    const ly = r.range(0.1, 0.3), lw = nw + (bw - nw) * (ly - sh) / (bot - 0.1 - sh);
    p.curve([[-lw, ly], [-lw * 0.4, ly - 0.03], [lw * 0.3, ly + 0.03], [lw, ly]], o);
    const liquid = [[-lw, ly], [lw, ly], [bw, bot - 0.1], [bw - 0.04, bot], [-bw + 0.04, bot], [-bw, bot - 0.1]];
    p.hatch(liquid, 0.5, { sp: 3, c: 1 });
    p.tint(liquid, { a: 0.6 });
    for (let i = 0; i < 2 + p.d; i++) p.circle(r.range(-0.1, 0.1), ly - 0.15 - i * 0.22, 0.04 + i * 0.012, o);
  });
  def('jinja', 1.1, function(p) {
    const o = K;
    p.curve([[-0.95, -0.72], [-0.5, -0.6], [0, -0.58], [0.5, -0.6], [0.95, -0.72]], opt(B, o));
    p.curve([[-0.9, -0.58], [-0.5, -0.47], [0, -0.45], [0.5, -0.47], [0.9, -0.58]], o);
    p.line(-0.95, -0.72, -0.9, -0.58, o);
    p.line(0.95, -0.72, 0.9, -0.58, o);
    p.rect(-0.72, -0.26, 1.44, 0.12, o);
    for (let s = -1; s <= 1; s += 2) {
      p.line(s * 0.5, -0.47, s * 0.56, 0.85, opt(B, o));
      p.line(s * 0.4, -0.46, s * 0.44, 0.85, o);
      p.tint([[s * 0.5, -0.47], [s * 0.56, 0.85], [s * 0.44, 0.85], [s * 0.4, -0.46]], { a: 0.7 });
    }
    p.line(-0.04, -0.45, -0.04, -0.26, o);
    p.line(0.04, -0.45, 0.04, -0.26, o);
    p.tint([[-0.95, -0.72], [0.95, -0.72], [0.9, -0.5], [-0.9, -0.5]], { a: 0.7 });
    p.line(-0.8, 0.86, 0.8, 0.86, C);
  });
  def('django', 1.2, function(p, r) {
    const g = p.sub(0, 0, 1, r.range(-0.2, 0.2)), o = K;
    g.rect(-0.9, -0.5, 1.8, 1.0, opt(B, o));
    g.rect(-0.82, -0.42, 1.64, 0.84, o);
    g.text('DJ', 0, 0.22, 0.46, opt(B, o, { align: 'c' }));
    g.hatch([rectPts(-0.82, -0.42, 1.64, 0.84), rectPts(-0.45, -0.3, 0.9, 0.6)], 0.8, { sp: 3.2, c: 1 });
    g.tint(rectPts(-0.9, -0.5, 1.8, 1.0), { a: 0.5 });
  });
  def('sentry', 0.8, function(p, r) {
    const o = K, lean = r.range(-0.03, 0.03);
    // a lookout on its stilts
    p.line(-0.5, 0.9, -0.3 + lean, -0.1, opt(B, o));
    p.line(0.5, 0.9, 0.3 + lean, -0.1, opt(B, o));
    p.line(-0.44, 0.6, 0.36 + lean, 0.2, o);
    p.line(0.44, 0.6, -0.36 + lean, 0.2, o);
    p.line(-0.38, 0.2, 0.38, 0.2, o);
    p.rect(-0.46 + lean, -0.16, 0.92, 0.07, opt(B, o));
    p.rect(-0.34 + lean, -0.6, 0.68, 0.44, o);
    p.rect(-0.2 + lean, -0.5, 0.4, 0.18, o);
    p.path([[-0.5 + lean, -0.6], [lean, -0.92], [0.5 + lean, -0.6]], opt(B, o, { closed: true }));
    p.hatch([[-0.5 + lean, -0.6], [lean, -0.92], [0.5 + lean, -0.6]], 0.9, { sp: 2.8, c: 1 });
    p.tint(rectPts(-0.34 + lean, -0.6, 0.68, 0.44), { a: 0.6 });
    p.tint([[-0.5 + lean, -0.6], [lean, -0.92], [0.5 + lean, -0.6]], { a: 0.5 });
    // what it looks at
    const side = r.chance(0.5) ? 1 : -1;
    p.dash(side * 0.22 + lean, -0.42, side * 0.78, -0.56, opt(L, o, { dash: 3 }));
    p.dash(side * 0.22 + lean, -0.4, side * 0.78, -0.28, opt(L, o, { dash: 3 }));
    p.line(-0.7, 0.92, 0.7, 0.92, C);
  });
  def('pi', 1.0, function(p, r) {
    const o = K, a0 = r.range(-1.2, -0.3);
    p.ellipse(0, 0, 0.82, 0.82, 0, opt(B, o, { a0: a0, sweep: TAU * r.range(0.86, 0.93), twice: true }));
    p.curve([[-0.42, -0.2], [-0.3, -0.3], [0.2, -0.26], [0.45, -0.34]], opt(B, o));
    p.curve([[-0.15, -0.28], [-0.16, 0.1], [-0.28, 0.42]], o);
    p.curve([[0.16, -0.27], [0.15, 0.2], [0.24, 0.4], [0.36, 0.36]], o);
    p.tint(ngon(0, 0, 0.8, 16), { a: 0.45 });
  });
  def('earendil', 1.0, function(p, r) {
    const o = K, a0 = r.range(-0.15, 0.15), pts = [];
    p.circle(0, 0, 0.55, C);
    for (let i = 0; i < 8; i++) {
      const a = a0 + i / 8 * TAU - Math.PI / 2, R = i % 2 === 0 ? (i % 4 === 0 ? 0.95 : 0.8) : 0.2;
      pts.push([Math.cos(a) * R, Math.sin(a) * R]);
    }
    p.path(pts, opt(B, o, { closed: true, over: 2 }));
    for (let i = 0; i < 4; i++) p.line(0, 0, pts[i * 2][0], pts[i * 2][1], opt(L, o));
    p.hatch([pts[0], pts[1], [0, 0]], 0.3, { sp: 2.6, c: 1 });
    p.hatch([pts[4], pts[5], [0, 0]], 0.3, { sp: 2.6, c: 1 });
    p.tint(pts, { a: 0.65 });
    p.dash(-1, 0, 1, 0, C);
    p.dash(0, -1, 0, 1, C);
  });

  // ---- tags nobody described: a figure from the name, labelled
  def('*', 1.1, function(p, r) {
    const name = p.tag.name, h = U.hash('doodle:' + name), form = h % 4, n = 3 + (h >>> 4) % 5;
    const cy = -0.12, R = 0.72;
    p.circle(0, cy, R, C);
    if (form === 0) {              // polygons turning inside each other
      let pts = ngon(0, cy, R, n, r() * TAU);
      for (let i = 0; i < 4 + p.d * 2; i++) {
        p.path(pts, { closed: true, over: 2 });
        if (i === 1) p.tint(pts, { a: 0.5 });
        pts = pts.map(function(q, k) { const o = pts[(k + 1) % pts.length]; return [lerp(q[0], o[0], 0.22), lerp(q[1], o[1], 0.22)]; });
      }
    } else if (form === 1) {       // a star polygon
      const m = n + 2 + (n % 2 ? 0 : 1), k = Math.max(2, Math.floor(m / 2)), pts = ngon(0, cy, R, m, r() * TAU);
      for (let i = 0; i < m; i++) p.line(pts[i][0], pts[i][1], pts[(i + k) % m][0], pts[(i + k) % m][1], { over: 2 });
      pts.forEach(function(q) { p.dot(q[0], q[1], { r: 1.4 }); });
      p.tint(ngon(0, cy, R * 0.5, 9), { a: 0.5 });
    } else if (form === 2) {       // a knot
      const fa = 2 + n % 3, fb = fa + 1, pts = [], ph = r() * TAU;
      for (let i = 0; i <= 90; i++) {
        const t = i / 90 * TAU;
        pts.push([Math.sin(fa * t + ph) * R * 0.95, cy + Math.sin(fb * t) * R * 0.85]);
      }
      p.curve(pts, { closed: true });
      p.tint(ngon(0, cy, R * 0.7, 10), { a: 0.4 });
    } else {                       // a spiral with ticks
      const pts = [], turns = 2.5 + n * 0.3, a0 = r() * TAU;
      for (let i = 0; i <= 70; i++) {
        const t = i / 70, a = a0 + t * turns * TAU;
        pts.push([Math.cos(a) * R * t, cy + Math.sin(a) * R * t]);
        if (i > 20 && i % 5 === 0) p.line(Math.cos(a) * R * t * 0.93, cy + Math.sin(a) * R * t * 0.93, Math.cos(a) * R * t * 1.07, cy + Math.sin(a) * R * t * 1.07, L);
      }
      p.curve(pts, {});
      p.tint(ngon(0, cy, R * 0.6, 10), { a: 0.4 });
    }
    if (!p.tag.house) {
      const label = name.slice(0, 12), th = Math.min(0.11, 2 / Math.max(4, label.length) * 0.7 / 5.7 * 6);
      p.text(label, 0, 0.92, th, opt(L, { align: 'c' }));
      p.line(-0.45, 0.98, 0.45, 0.97, C);
    }
  });

  // ---- no tags: what a hand does while thinking
  def('~idle', 1.0, function(p, r) {       // a cube, with its hidden edges
    const s = r.range(0.75, 0.9), o = iso(0.5, 0.5, 0.5);
    const q = function(x, y, z) { const v = iso(x, y, z); return [(v[0] - o[0]) * s, (v[1] - o[1]) * s]; };
    const v = [q(0, 0, 0), q(1, 0, 0), q(1, 1, 0), q(0, 1, 0), q(0, 0, 1), q(1, 0, 1), q(1, 1, 1), q(0, 1, 1)];
    [[4, 5], [5, 6], [6, 7], [7, 4], [1, 5], [2, 6], [3, 7], [1, 2], [2, 3]].forEach(function(e) {
      p.line(v[e[0]][0], v[e[0]][1], v[e[1]][0], v[e[1]][1], { over: 3 });
    });
    [[0, 1], [0, 3], [0, 4]].forEach(function(e) { p.dash(v[e[0]][0], v[e[0]][1], v[e[1]][0], v[e[1]][1], C); });
    p.hatch([v[1], v[2], v[6], v[5]], 1.2, { sp: 3.4 });
    p.tint([v[4], v[5], v[6], v[7]], { a: 0.5 });
  });
  def('~idle', 1.0, function(p, r) {       // a spiral
    const pts = [], turns = r.range(3, 4.5), a0 = r() * TAU, R = 0.8;
    for (let i = 0; i <= 80; i++) {
      const t = i / 80, a = a0 + t * turns * TAU;
      pts.push([Math.cos(a) * R * t * 1.05, Math.sin(a) * R * t * 0.9]);
    }
    p.curve(pts, {});
    p.tint(ngon(0, 0, 0.55, 10), { a: 0.4 });
  });
  def('~idle', 1.5, function(p, r) {       // waves, one under the other
    const n = 3 + r.int(2) + p.d;
    for (let i = 0; i < n; i++) {
      const y = lerp(-0.55, 0.6, i / (n - 1)), pts = [], ph = r() * TAU, k = r.range(2, 3.2);
      for (let j = 0; j <= 24; j++) {
        const t = j / 24;
        pts.push([lerp(-1.35, 1.35, t), y + Math.sin(ph + t * k * TAU) * 0.12 * (1 - 0.5 * i / n)]);
      }
      p.curve(pts, i === 0 ? {} : L);
    }
    p.tint(rectPts(-1.2, -0.5, 2.4, 0.5), { a: 0.35 });
  });
  def('~idle', 1.2, function(p, r) {       // circles that overlap
    const n = 3 + r.int(2);
    for (let i = 0; i < n; i++) {
      const x = lerp(-0.6, 0.6, i / (n - 1)), y = r.range(-0.15, 0.15), R = r.range(0.4, 0.55);
      p.circle(x, y, R, i % 2 ? L : {});
      if (i === 1) { p.hatch(ngon(x, y, R, 16), 0.8, { sp: 4 }); p.tint(ngon(x, y, R, 16), { a: 0.4 }); }
    }
  });
  def('~idle', 1.2, function(p, r) {       // a grid of dots, some joined
    const cols = 6, rows = 4, g = 0.38;
    const at = function(i, j) { return [(i - (cols - 1) / 2) * g, (j - (rows - 1) / 2) * g]; };
    for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) { const q = at(i, j); p.dot(q[0], q[1], { r: 1 }); }
    let i = r.int(cols), j = r.int(rows);
    for (let k = 0; k < 9 + p.d * 5; k++) {
      const ni = clamp(i + r.pick([-1, 0, 1]), 0, cols - 1), nj = clamp(j + r.pick([-1, 0, 1]), 0, rows - 1);
      const a = at(i, j), b = at(ni, nj);
      if (ni !== i || nj !== j) p.line(a[0], a[1], b[0], b[1], { over: 0 });
      i = ni;
      j = nj;
    }
    p.tint(rectPts(-0.6, -0.4, 0.8, 0.8), { a: 0.35 });
  });

  // ---- marginal notes: what goes between the drawings
  // NOTES[tag] for a register tag; NOTES['*'] when there is none.
  const NOTES = {
    '*': function(p, r) {
      const k = r.int(10);
      if (k === 0) p.scrawl(-0.9, 0.1, 1.8, { h: 0.28, w: 0.7 });
      else if (k === 1) {
        p.curve([[-0.8, 0.4], [-0.2, -0.3], [0.7, -0.1]], L);
        p.head(0.3, -0.2, 0.7, -0.1, L);
      } else if (k === 2) {
        p.path([[-0.4, 0], [-0.1, 0.4], [0.5, -0.5]], { join: true });
      } else if (k === 3) {
        for (let i = 0; i < 3; i++) p.dot(-0.5 + i * 0.5, 0, { r: 1.3 });
      } else if (k === 4) {
        p.line(-0.8, 0.1, 0.8, 0, {});
        p.line(-0.7, 0.3, 0.5, 0.22, L);
      } else if (k === 5) {
        p.text(r.pick(['NB', 'TODO', 'OK', 'CF.', 'SEE', 'WHY?', 'FIXME']), 0, 0.2, 0.42, { align: 'c', w: 0.7 });
        if (r.chance(0.5)) p.line(-0.7, 0.4, 0.7, 0.36, L);
      } else if (k === 6) {
        p.text(r.pick(['?', '!', '??', '=>', '+1', '#' + (1 + r.int(9))]), 0, 0.3, 0.6, { align: 'c', w: 0.7 });
      } else if (k === 7) {
        p.curve([[0.3, -0.7], [0, -0.6], [0.1, -0.1], [-0.15, 0], [0.1, 0.1], [0, 0.6], [0.3, 0.7]], {});
        p.scrawl(0.4, 0.1, 0.9, { h: 0.24, w: 0.7 });
      } else if (k === 8) {
        p.ellipse(0, 0, 0.7, 0.4, r.range(-0.2, 0.2), L);
        p.scrawl(-0.4, 0.1, 0.8, { h: 0.2, w: 0.7 });
      } else {
        const a0 = r() * TAU;
        for (let i = 0; i < 3; i++) {
          const a = a0 + i / 3 * Math.PI;
          p.line(-Math.cos(a) * 0.35, -Math.sin(a) * 0.35, Math.cos(a) * 0.35, Math.sin(a) * 0.35, {});
        }
      }
    },
    // the gesture of the post (the `stance` facet): what its author is doing
    builder: function(p, r) {          // measuring
      p.arrow(-0.9, 0, 0.9, 0, opt(L, { both: true, head: 4 }));
      p.line(-0.9, -0.3, -0.9, 0.3, C);
      p.line(0.9, -0.3, 0.9, 0.3, C);
      p.text(String(12 + r.int(80)), 0, -0.12, 0.36, { align: 'c', w: 0.7 });
    },
    critic: function(p, r) {           // cutting: the marks of a proof reader
      const red = [0.72, 0.16, 0.2];
      if (r.chance(0.5)) {
        p.scrawl(-0.9, 0.15, 1.5, { h: 0.26, w: 0.7 });
        p.curve([[-0.8, 0.05], [0.3, 0], [0.75, -0.1], [0.85, -0.45], [0.65, -0.5], [0.6, -0.2], [0.9, 0.1]], { c: red, w: 1.1 });
      } else {
        p.path([[-0.3, 0.3], [0, -0.2], [0.3, 0.3]], { join: true, c: red, w: 1.1 });
        p.text(r.pick(['?', 'NO', 'WHY', 'SIC']), 0, -0.35, 0.4, { align: 'c', c: red });
      }
    },
    advocate: function(p, r) {         // pushing
      p.line(-0.9, -0.08, 0.5, -0.08, B);
      p.line(-0.9, 0.08, 0.5, 0.08, B);
      p.path([[0.4, -0.3], [0.95, 0], [0.4, 0.3]], opt(B, { join: true }));
      if (r.chance(0.5)) p.text('!', 1.15, 0.25, 0.5, B);
    },
    observer: function(p, r) {         // watching
      p.curve([[-0.7, 0], [-0.3, -0.34], [0.3, -0.34], [0.7, 0]], {});
      p.curve([[-0.7, 0], [-0.3, 0.3], [0.3, 0.3], [0.7, 0]], {});
      p.circle(r.range(-0.15, 0.15), -0.02, 0.2, {});
      p.dot(0, -0.02, { r: 1.6 });
    },
    // a stray flourish, for the posts that are not entirely serious
    flourish: function(p, r) {
      const k = r.int(4), funny = p.ex.post.score('humor', 0);
      if (k === 0 && funny > 0.6) {        // a paper plane and the way it came
        p.path([[-0.2, 0.1], [0.8, -0.35], [0.25, 0.4], [0.15, 0.15]], { closed: true, over: 1 });
        p.line(0.15, 0.15, 0.8, -0.35, L);
        const pts = [];
        for (let i = 0; i <= 16; i++) {
          const t = i / 16, a = t * TAU;
          pts.push([-0.25 - t * 0.75 + Math.sin(a) * 0.2, 0.15 + t * 0.2 - (1 - Math.cos(a)) * 0.2]);
        }
        p.dash(pts[0][0], pts[0][1], pts[4][0], pts[4][1], C);
        p.curve(pts.slice(4), C);
      } else if (k === 1 && funny > 0.7) { // a face
        p.circle(0, 0, 0.6, {});
        p.dot(-0.22, -0.15, { r: 1.4 });
        p.dot(0.22, -0.15, { r: 1.4 });
        p.arc(0, 0.02, 0.32, 0.35, Math.PI - 0.35, {});
      } else if (k === 2) {                // a star, five strokes without lifting
        const pts = ngon(0, 0, 0.7, 5, -Math.PI / 2 + r.range(-0.2, 0.2));
        p.path([pts[0], pts[2], pts[4], pts[1], pts[3]], { closed: true, join: true });
      } else {                             // loops, for no reason
        const pts = [];
        for (let i = 0; i <= 44; i++) {
          const t = i / 44, a = t * 4 * TAU;
          pts.push([lerp(-0.9, 0.9, t) + Math.sin(a) * 0.22, -Math.cos(a) * 0.3 * (1 - 0.6 * t) + 0.1]);
        }
        p.curve(pts.filter(function(_, i) { return i % 2 === 0; }), L);
      }
    },
    // how the post ends (the `ending` facet), next to the date
    end: function(p, r) {
      const how = p.ex.post.top('ending', 0.4);
      if (how === 'resolved') {            // closed: ruled off twice, and a full stop
        p.line(-0.9, 0, 0.6, -0.02, B);
        p.line(-0.9, 0.14, 0.6, 0.12, {});
        p.rect(0.72, -0.12, 0.26, 0.26, B);
        p.hatch(rectPts(0.72, -0.12, 0.26, 0.26), 0.8, { sp: 1.8, w: 1 });
      } else if (how === 'open') {         // trailing off
        p.scrawl(-0.9, 0.1, 0.8, { h: 0.24, w: 0.7 });
        for (let i = 0; i < 3; i++) p.dot(0.1 + i * 0.3, 0.08, { r: 1.5 - i * 0.25, w: 1.2 - i * 0.3 });
        p.dash(-0.9, 0.35, 0.9, 0.3, C);
      } else if (how === 'call') {         // pointing on
        p.line(-0.9, 0.05, 0.6, 0, opt(B, K, { twice: true }));
        p.path([[0.35, -0.3], [0.95, 0], [0.4, 0.3]], opt(B, K, { join: true }));
        p.text('!', -1.2, 0.22, 0.45, opt(B, K));
      } else if (how === 'practical') {    // squared off: a list, ticked
        for (let i = 0; i < 3; i++) {
          const y = -0.42 + i * 0.36;
          p.rect(-0.85, y, 0.24, 0.24, {});
          if (i < 2 || r.chance(0.5)) p.path([[-0.82, y + 0.1], [-0.74, y + 0.2], [-0.55, y - 0.1]], opt(K, { join: true }));
          p.line(-0.45, y + 0.2, r.range(0.3, 0.9), y + 0.19, L);
        }
      }
    },
    // a few lines of code, for posts that are full of it
    code: function(p, r) {
      let level = 0;
      for (let i = 0; i < 4; i++) {
        const y = -0.6 + i * 0.4, x = -0.9 + level * 0.3, w = r.range(0.4, 0.9);
        p.line(x, y, x + w, y, { over: 0 });
        if (r.chance(0.5)) p.line(x + w + 0.12, y, x + w + r.range(0.3, 0.6), y, opt(L, { over: 0 }));
        level = clamp(level + r.pick([1, 1, 0, -1]), 0, 2);
      }
    },
    // the day the page was written, as one dates a notebook
    date: function(p) {
      const d = p.ex.post.date;
      const w = p.text(d.getUTCDate() + '.' + (d.getUTCMonth() + 1) + '.' + d.getUTCFullYear(), 0, 0, 0.42, { align: 'c', w: 0.75 });
      p.line(-w / 2 - 0.1, 0.2, w / 2 + 0.15, 0.17, L);
    },
    thoughts: function(p, r) {
      if (r.chance(0.6)) {
        p.scrawl(-1, -0.15, 2, { h: 0.26, w: 0.75 });
        if (r.chance(0.6)) p.scrawl(-1, 0.6, r.range(0.8, 1.6), { h: 0.26, w: 0.75 });
      } else {
        const pts = [];
        for (let i = 0; i <= 40; i++) {
          const t = i / 40;
          pts.push([lerp(-0.9, 0.9, t) + Math.sin(t * 5 * TAU) * 0.2, Math.cos(t * 5 * TAU) * 0.4]);
        }
        p.curve(pts.filter(function(_, i) { return i % 2 === 0; }), L);
      }
    },
    tutorial: function(p, r) {
      p.text(String(1 + r.int(9)), -0.9, 0.3, 0.6, {});
      p.dot(-0.35, 0.28, { r: 1 });
      p.line(-0.1, 0.3, 1, 0.3, C);
      p.scrawl(-0.1, 0.25, 1, { h: 0.2, w: 0.7 });
    },
    politics: function(p, r) {
      if (r.chance(0.5)) {
        p.line(-0.9, 0, 0.9, -0.05, opt(B, K, { twice: true }));
        p.line(0.8, 0.2, -0.7, 0.24, opt(B, K));
      } else {
        p.scrawl(-0.9, 0.1, 1.6, { h: 0.28 });
        p.scribble(-0.9, -0.05, 0.7, -0.05, 0.25, { w: 1.2 });
      }
    },
    business: function(p, r) {
      for (let i = 0; i < 4; i++) p.line(-0.5 + i * 0.25, -0.5, -0.47 + i * 0.25, 0.4, {});
      if (r.chance(0.7)) p.line(-0.75, 0.3, 0.5, -0.35, {});
    },
    community: function(p, r) {
      for (let i = 0; i < 3; i++) {
        const x = -0.6 + i * 0.6, y = r.range(-0.1, 0.1);
        p.circle(x, y - 0.3, 0.2, {});
        p.arc(x, y + 0.35, 0.36, Math.PI * 1.12, Math.PI * 1.88, {});
      }
    },
    culture: function(p) {
      for (let i = 0; i < 2; i++) p.curve([[-0.3 + i * 0.4, 0.3], [-0.15 + i * 0.4, 0], [-0.22 + i * 0.4, -0.4]], B);
      },
    history: function(p, r) {
      const year = (p.ex.post && p.ex.post.year || 2012) - r.int(12);
      p.text(String(year), 0, 0.2, 0.42, { align: 'c', w: 0.7 });
      p.line(-0.9, 0.42, 0.9, 0.4, L);
    },
    announcement: function(p, r) {
      const a0 = r() * TAU;
      for (let i = 0; i < 4; i++) {
        const a = a0 + i / 4 * Math.PI;
        p.line(-Math.cos(a) * 0.6, -Math.sin(a) * 0.6, Math.cos(a) * 0.6, Math.sin(a) * 0.6, opt(B, K));
      }
    },
    conferences: function(p) {
      p.curve([[-0.8, -0.5], [0.8, -0.5], [0.85, 0.2], [0, 0.25], [-0.3, 0.6], [-0.35, 0.25], [-0.8, 0.2]], { closed: true });
      p.scrawl(-0.6, -0.05, 1.2, { h: 0.18, w: 0.7 });
    },
    covid19: function(p, r) {
      for (let k = 0; k < 10; k++) if (!r.chance(0.2)) p.arc(0, 0, 0.6, k / 10 * TAU, k / 10 * TAU + 0.35, L);
      p.dot(0, 0, { r: 1.4 });
    },
    life: function(p, r) {
      const pts = [];
      for (let i = 0; i <= 30; i++) {
        const t = i / 30, a = t * 2.6 * TAU + r() * 0.1;
        pts.push([Math.cos(a) * 0.6 * t, Math.sin(a) * 0.6 * t]);
      }
      p.curve(pts, L);
    }
  };

  // ---- facets --------------------------------------------------------------
  // What the classifier said about the text, turned into what the pencil and
  // the brush do with it.  Each facet drives one thing:
  //
  //   ai         the form of the `ai` doodle and a second pigment in it
  //   imagery    (only when sure) one more drawing: the author's own image
  //   scale      viewing distance: a few large drawings ... many small ones
  //   mood       the weather of the wash: its colour, edges, runs, spatter
  //   valence    the value of the wash: grey and heavy ... clear and light
  //   tension    drawings struck out
  //   certainty  the line: searched and drawn over ... put down once
  //   stance     the notes between the drawings: measuring, correcting, ...
  //   time       which way everything leans, and the shading falls
  //   ending     the mark that closes the page, next to the date
  //   personal   the rings a cup left
  //   humor      stray flourishes among the notes
  //   technical  a ruled scale along the edge, a centre line
  //
  // (energy and wander are already in post.energy and post.loose.)  A post
  // without facets reads as neutral and is drawn from its tags alone.

  const MOOD_PIGMENT = {
    hopeful: '#f2b23e', worried: '#3f5f8f', angry: '#b3262e', reflective: '#7c86cc',
    playful: '#f0734f', matter_of_fact: '#93a2ab', conflicted: '#8a4a93'
  };
  const AI_PIGMENT = {
    agents: '#1f9e9a', models: '#7d5ba6', local: '#a8642c', society: '#c8527a',
    community: '#e07b2a', writing: '#2f5290', risk: '#a8233a', business: '#8a8f2a'
  };
  const IMAGERY_PIGMENT = {
    water: '#3d8fc4', fire: '#e2542e', stone: '#6b6f76', air: '#9fb7c9', growth: '#5d8a2f',
    building: '#7a5c3a', road: '#55505c', light: '#f0a81e', body: '#c8527a', crowd: '#e07b2a'
  };
  const SCALE = { self: 0, craft: 0.3, community: 0.55, industry: 0.8, society: 1 };
  const RED = [0.72, 0.16, 0.2], COFFEE = [0.6, 0.44, 0.27];

  // the pigments of a choice, mixed by how likely each label is
  function blend(post, facet, table) {
    const colors = [], weights = [];
    let sum = 0;
    Object.keys(table).forEach(function(label) {
      const w = post.share(facet, label);
      if (w <= 0) return;
      colors.push(U.hex(table[label]));
      weights.push(w);
      sum += w;
    });
    return sum > 0.2 ? U.blend(colors, weights) : null;     // mixed in OKLab
  }

  function reading(post) {
    const read = {
      known: !!(post.facets && post.facets.known),
      certainty: 0.5, valence: 0.5, tension: 0, technical: 0, personal: 0, humor: 0,
      zoom: 1, spread: 1, sway: 0, lean: 0, strike: 0, angry: 0,
      mood: null, soft: 0, hard: 0, spatter: 0.35, thin: 0, runs: 0,
      ai: null, aiMix: null, imagery: null, ending: null
    };
    if (!read.known) return read;
    ['certainty', 'valence'].forEach(function(name) { read[name] = post.score(name, 0.5); });
    ['tension', 'technical', 'personal', 'humor'].forEach(function(name) { read[name] = post.score(name, 0); });
    let far = 0, sum = 0;
    Object.keys(SCALE).forEach(function(label) {
      far += post.share('scale', label) * SCALE[label];
      sum += post.share('scale', label);
    });
    if (sum > 0.2) {
      far /= sum;
      read.zoom = lerp(1.32, 0.68, far);
      read.spread = lerp(1.5, 0.7, far);
      read.sway = 0.11 * smoothstep(0.45, 1, far);
    }
    read.lean = (post.share('time', 'future') - post.share('time', 'past')) * 0.065;
    read.mood = blend(post, 'mood', MOOD_PIGMENT);
    read.angry = post.share('mood', 'angry');
    read.soft = post.share('mood', 'reflective') + 0.6 * post.share('mood', 'hopeful');
    read.hard = read.angry + post.share('mood', 'conflicted') + 0.4 * read.tension;
    read.spatter = clamp(0.15 + 0.85 * (read.angry + post.share('mood', 'playful')), 0, 1);
    read.thin = post.share('mood', 'matter_of_fact');
    read.runs = post.share('mood', 'worried') + 0.4 * post.share('mood', 'conflicted');
    read.strike = clamp((read.tension - 0.4) * 0.75, 0, 0.42);
    read.ai = blend(post, 'ai', AI_PIGMENT);
    read.aiMix = post.facets.ai && post.facets.ai.mix || null;
    read.imagery = post.top('imagery', 0.6);
    if (read.imagery && !DOODLES['~img:' + read.imagery]) read.imagery = null;
    read.ending = post.top('ending', 0.4);
    return read;
  }

  // The wash as the post's mood and valence have it: tinted towards the mood,
  // greyer and heavier when bleak, clearer and lighter when joyful.
  function tone(read, rgb, alpha) {
    if (!read.known) return { rgb: rgb, a: alpha };
    let c = read.mood ? U.mix(rgb, read.mood, 0.24) : rgb;
    const bleak = clamp((0.5 - read.valence) * 2, 0, 1), joy = clamp((read.valence - 0.5) * 2, 0, 1);
    // chroma in OKLab: greyer when bleak, more saturated when joyful, the
    // lightness kept
    c = U.saturate(c, (1 - bleak * 0.4) * (1 + joy * 0.4));
    c = U.mix(c, read.shade, bleak * 0.14);
    c = U.mix(c, [1, 1, 1], joy * 0.1);
    return { rgb: c, a: alpha * lerp(1.15, 0.85, read.valence) * (1 - 0.3 * read.thin) };
  }

  // a drawing given up on
  function strike(p, a, read) {
    const r = p.r, o = { c: read.angry > 0.3 ? RED : undefined, w: 1.05, twice: false, over: 6 }, k = r();
    if (k < 0.4) {
      p.line(-a * 0.85, -0.6, a * 0.85, 0.6 + r.range(-0.2, 0.2), o);
      p.line(-a * 0.8, 0.6, a * 0.85, -0.65 + r.range(-0.2, 0.2), o);
    } else if (k < 0.75) {
      p.line(-a * 0.9, 0.5 + r.range(-0.2, 0.2), a * 0.9, -0.5 + r.range(-0.2, 0.2), o);
    } else {
      p.scribble(-a * 0.85, r.range(-0.2, 0.2), a * 0.85, r.range(-0.2, 0.2), 0.4, { w: 0.9, pitch: 15, c: o.c });
    }
  }

  // ---- layout --------------------------------------------------------------

  // The blog's own blues, for pages without tags.
  function houseTags(colors) {
    const mk = function(name, doodle, rgb, weight, role) {
      return { name: name, doodle: doodle, house: true, known: true, role: role, rgb: rgb, weight: weight, loose: 0.55, energy: 0.3 };
    };
    return [
      mk('~a', '~idle', colors.primary, 0.4, 'subject'),
      mk('~b', 'thoughts', U.mix(colors.primary, colors.header, 0.6), 0.35, 'register'),
      mk('~c', '~idle', U.tone(colors.primary, 0.62, 0.11), 0.25, 'subject')
    ];
  }

  function variantsOf(tag) { return DOODLES[tag.doodle || tag.name] || DOODLES['*']; }

  // The slots of one row, from the middle outwards, far enough to cover
  // `half` pixels either side.  A slot depends only on its index.
  function rowSlots(ctx, row, rowIndex) {
    const post = ctx.post, tags = ctx.tags, H = ctx.H, read = ctx.read;
    const top = Math.max.apply(null, tags.map(function(t) { return t.weight; })) || 1;
    const base = post.seed % 7 + rowIndex;
    const make = function(k, prev, seen) {
      const r = post.rng('sketchbook:' + ctx.kind + ':' + rowIndex + ':' + k);
      const j = k > 0 ? 2 * k - 1 : -2 * k;
      let tag;
      if (j < tags.length) {
        tag = tags[(j + row.offset) % tags.length];
      } else {
        const pool = tags.filter(function(t) { return tags.length === 1 || t !== prev; });
        let sum = 0;
        const ws = pool.map(function(t) {
          const w = Math.pow(t.weight, 0.6) * (t.role === 'project' ? 0.35 : 1);
          sum += w;
          return w;
        });
        let pick = r() * sum, i = 0;
        while (i < pool.length - 1 && pick > ws[i]) { pick -= ws[i]; i++; }
        tag = pool[i];
      }
      // the variants of a tag take turns, so one drawing is not repeated side by side
      let variants = variantsOf(tag);
      const lot = r();
      if (tag.name === 'ai' && read.aiMix) {
        // what kind of ai post it is: the likeliest form first, then each as often as it is likely
        let label = post.facets.ai.top, at = lot;
        if (j >= tags.length) {
          Object.keys(read.aiMix).some(function(name) {
            label = name;
            at -= read.aiMix[name];
            return at <= 0;
          });
        }
        variants = DOODLES['ai:' + label] || variants;
      }
      const turn = seen[tag.name] = seen[tag.name] === undefined ? base + (k < 0 ? 1 : 0) : seen[tag.name] + 1;
      const v = variants[turn % variants.length];
      const rel = tag.weight / top;
      const roleSize = tag.role === 'project' ? 0.6 : tag.role === 'register' ? 0.82 : 1;
      // mostly middling, now and then a large one or a small study
      const sc = k === 0 ? 1.12 : r.pick([1.25, 1, 1, 1, 0.95, 0.9, 0.66, 0.6]);
      const size = row.size * H * read.zoom * roleSize * (0.74 + 0.3 * Math.sqrt(rel)) * sc * r.range(0.92, 1.08);
      const gk = r();
      const gap = row.size * H * (gk < 0.2 ? r.range(-0.25, 0) : gk < 0.85 ? r.range(0.1, 0.6) : r.range(0.9, 1.6)) * row.gap * read.spread;
      const dated = row.dated && k === 0, ended = row.dated && k === -1 && !!read.ending;
      const note = dated || ended || r.chance(row.notes);
      return {
        k: k, tag: tag, v: v, size: size, skip: k !== 0 && r.chance(row.skip), hw: v.a * size, dated: dated, ended: ended,
        gap: (dated ? row.size * H * 0.55 + Math.max(0, gap) : ended ? row.size * H * 0.25 + Math.max(0, gap) : gap) + (note ? row.size * H * 0.75 : 0),
        y: row.cy * H + r.range(-1, 1) * (row.sway + read.sway) * H + (sc < 0.8 || tag.role === 'project' ? r.range(-0.45, 0.45) * row.size * H : 0),
        rot: r.gauss() * 0.045 * (0.3 + post.loose) + read.lean, seed: r.int(1 << 30),
        struck: k !== 0 && r() < read.strike, ring: r() < clamp((read.personal - 0.45) * 0.9, 0, 0.45),
        note: note ? {
          size: row.size * H * (dated || ended ? 0.3 : r.range(0.26, 0.4)),
          dy: (dated ? r.range(-0.7, -0.35) : ended ? r.range(0.35, 0.7) : r.range(-0.75, 0.75)) * row.size * H,
          rot: r.gauss() * (dated || ended ? 0.05 : 0.12) + read.lean, seed: r.int(1 << 30), pick: r()
        } : null,
        blob: [r.gauss(), r.gauss(), r.range(0.95, 1.5), r.range(0.6, 0.95), r.range(-0.4, 0.4), r.int(1 << 30), r()],
        x: 0
      };
    };
    const first = make(0, null, {});
    first.x = (post.rng('sketchbook:shift:' + ctx.kind + rowIndex)() - 0.5) * row.shift * H;
    const out = [first];
    [1, -1].forEach(function(dir) {
      let prev = first;
      const seen = {};
      seen[first.tag.name] = base + (dir < 0 ? 1 : 0);
      for (let k = dir; Math.abs(k) < 200; k += dir) {
        const s = make(k, prev.tag, seen);
        const between = dir > 0 ? prev.gap : s.gap;      // the gap (and its note) lies to the right of a slot
        s.x = prev.x + dir * (prev.hw + s.hw + between);
        if (Math.abs(s.x) - s.hw - row.size * H * 1.5 > ctx.half) break;
        out.push(s);
        prev = s;
      }
    });
    return out;
  }

  function schedule(strokes, from, t0, dur) {
    let total = 0;
    for (let i = from; i < strokes.length; i++) total += strokes[i].len + 6;
    let at = 0;
    for (let i = from; i < strokes.length; i++) {
      const st = strokes[i];
      st.t0 = t0 + dur * at / total;
      at += st.len + 6;
      st.t1 = t0 + dur * at / total;
    }
  }

  // Everything one band shows: strokes (pencil) and washes (colour), in pixels.
  function buildScene(surface, post, colors) {
    const W = surface.width, H = surface.height, footer = surface.kind === 'footer';
    const house = !post.tags.length;
    const read = reading(post);
    read.shade = colors.shade;
    // the ai tag takes the pigment of what kind of ai post this is
    const pigment = function(t) {
      return t.name === 'ai' && read.ai ? Object.assign({}, t, { rgb: U.mix(t.rgb, read.ai, 0.62) }) : t;
    };
    let tags = house ? houseTags(colors) : post.lead.map(pigment);
    if (!house && read.imagery) {
      tags.splice(1, 0, {
        name: '~img', doodle: '~img:' + read.imagery, house: true, known: true, role: 'subject',
        rgb: U.hex(IMAGERY_PIGMENT[read.imagery]), weight: tags[0].weight * 0.9, loose: post.loose, energy: post.energy
      });
    }
    const scene = { strokes: [], washes: [], W: W, H: H, house: house, colors: colors };
    const ctx = { post: post, tags: tags, H: H, half: W / 2, kind: surface.kind, read: read };
    // what the text is like shows in the margins: a long post leaves more
    // notes, one full of code some lines of it, an old one has faded a little
    const wordy = 0.2 * clamp(post.stats.words / 3000, 0, 1);
    const codey = clamp(post.stats.code / 160, 0, 0.55);
    const faded = 1 - 0.14 * clamp((post.age - 4) / 12, 0, 1);
    const rows = footer ? [
      { cy: 0.67, size: 0.225, sway: 0.03, gap: 1, notes: 0.4 + wordy, offset: 0, shift: 0.3, detail: 1, press: faded, skip: 0, dated: !!post.date },
      { cy: 0.27, size: 0.1, sway: 0.07, gap: 4, notes: 0.4 + wordy, offset: 3, shift: 1.2, detail: 0, press: 0.78 * faded, skip: 0.3 }
    ] : [
      { cy: 0.39, size: 0.31, sway: 0.04, gap: 1.1, notes: 0.35 + wordy, offset: 0, shift: 0.3, detail: 0, press: faded, skip: 0.06 }
    ];
    const registers = house ? [] : post.register;
    const cx = W / 2;
    const edge = footer ? H : 0;      // the outer edge of the band
    const extra = function(press) {
      return {
        press: press, post: post, color: house ? 'house' : null,
        slant: 0.28 + read.lean * 4.5, mirror: read.lean < -0.02
      };
    };
    // water that ran down the page before it dried
    const run = function(rr, x, y, rgb, alpha) {
      const len = H * (footer ? rr.range(0.05, 0.14) : rr.range(0.12, 0.3));
      scene.washes.push({
        k: 'blob', seed: rr.int(1 << 30), rgb: rgb, a: alpha * 0.75, soft: false, spatter: 0,
        x: x, y: y + len * 0.9, rx: rr.range(1.5, 3.2), ry: len, rot: rr.range(-0.03, 0.03)
      });
    };

    // what is written between the drawings: the register tags, the stance of
    // the post, a flourish when it is funny, lines of code when it is full of it
    const menu = [];
    registers.forEach(function(t) { if (NOTES[t.name]) menu.push([NOTES[t.name], 1, t]); });
    if (read.known) {
      [['builder', NOTES.builder], ['teacher', NOTES.tutorial], ['critic', NOTES.critic], ['advocate', NOTES.advocate],
        ['observer', NOTES.observer], ['witness', NOTES.history]].forEach(function(e) {
        const w = post.share('stance', e[0]) * 1.8;
        if (w > 0.15) menu.push([e[1], w, null]);
      });
      if (read.humor > 0.35) menu.push([NOTES.flourish, (read.humor - 0.35) * 2.5, null]);
    }
    menu.push([NOTES['*'], menu.length ? 0.4 : 1, null]);
    if (codey > 0) menu.push([NOTES.code, codey * 2, null]);
    const total = menu.reduce(function(acc, e) { return acc + e[1]; }, 0);
    const choose = function(pick) {
      let at = pick * total, i = 0;
      while (i < menu.length - 1 && at > menu[i][1]) { at -= menu[i][1]; i++; }
      return menu[i];
    };

    rows.forEach(function(row, ri) {
      rowSlots(ctx, row, ri).forEach(function(slot) {
        const tag = slot.tag, x = cx + slot.x;
        const hand = makeHand(lerp(post.loose, tag.loose, 0.4), lerp(post.energy, tag.energy, 0.4), read);
        const far = Math.min(1, Math.abs(slot.x) / Math.max(200, W / 2));
        const t0 = 0.05 + 0.95 * far + 0.2 * slot.blob[6] + (ri ? 0.2 : 0);
        const rr = U.rng(slot.seed ^ 0x5bd1e995);
        // the wash under it: larger than the drawing, and off to one side
        const b = slot.blob;
        const strength = (tag.role === 'register' ? 0.7 : 1) * (ri ? 0.75 : 1);
        if (b[6] > 0.1 + 0.25 * read.thin) {
          const ink = tone(read, tag.rgb, strength);
          const wash = {
            k: 'blob', seed: b[5], rgb: ink.rgb, a: ink.a, spatter: read.spatter,
            soft: tag.role === 'register' || b[6] > clamp(0.8 - 0.6 * read.soft + 0.5 * read.hard, 0.25, 1),
            x: x + b[0] * slot.hw * 0.35, y: lerp(slot.y + b[1] * slot.size * 0.2, edge, ri ? 0 : footer ? 0.22 : 0.3),
            rx: Math.max(slot.hw, slot.size) * b[2], ry: slot.size * b[3], rot: b[4] * 0.5
          };
          scene.washes.push(wash);
          if (footer && rr.chance(read.runs * 0.6)) run(rr, wash.x + rr.range(-0.5, 0.5) * wash.rx, wash.y + wash.ry * 0.5, ink.rgb, ink.a);
        }
        if (slot.ring) {      // someone put a cup down here
          scene.washes.push({
            k: 'ring', seed: rr.int(1 << 30), rgb: COFFEE, a: rr.range(0.5, 0.85),
            x: x + rr.range(-1, 1) * slot.hw, y: slot.y + rr.range(-0.5, 0.5) * slot.size, r: row.size * H * rr.range(0.42, 0.56)
          });
        }
        if (!slot.skip) {
          const from = scene.strokes.length;
          const pen = new Pen(scene.strokes, scene.washes, U.rng(slot.seed), hand,
            { x: x, y: slot.y, s: slot.size, rot: slot.rot }, row.detail, tag, extra(row.press));
          slot.v.draw(pen, pen.r);
          if (slot.struck) strike(pen, slot.v.a, read);
          schedule(scene.strokes, from, t0, 0.9);
        }
        if (slot.note) {
          const n = slot.note;
          const item = slot.dated ? [NOTES.date, 1, null] : slot.ended ? [NOTES.end, 1, null] : choose(n.pick);
          const nf = scene.strokes.length;
          const npen = new Pen(scene.strokes, scene.washes, U.rng(n.seed), makeHand(post.loose, post.energy, read),
            { x: x + slot.hw + slot.gap / 2, y: slot.y + n.dy, s: n.size, rot: n.rot }, row.detail,
            item[2] || tag, extra(row.press * 0.9));
          item[0](npen, npen.r);
          schedule(scene.strokes, nf, t0 + 0.6, 0.35);
        }
      });
    });

    // a technical post is measured: a scale ruled along the outer edge, and a
    // centre line through the drawings when it is deeply so
    if (read.technical > 0.45) {
      const k = smoothstep(0.45, 0.9, read.technical), from = scene.strokes.length;
      const pen = new Pen(scene.strokes, scene.washes, post.rng('sketchbook:ruler:' + surface.kind), makeHand(0.08, 0.3, read),
        { x: cx, y: edge, s: 1, rot: 0 }, 0, tags[0], extra(0.55 + 0.45 * k));
      const step = footer ? H / 30 : H / 10, n = Math.ceil(W / 2 / step) + 1, dir = footer ? -1 : 1;
      for (let i = -n; i <= n; i++) {
        const len = i % 10 === 0 ? 11 : i % 5 === 0 ? 7.5 : 4.5;
        pen.line(i * step, dir, i * step, dir * len, { w: i % 5 === 0 ? 0.8 : 0.5, twice: false, over: 0, wob: 0.2 });
        if (i % 10 === 0) pen.text(String(Math.abs(i)), i * step + 3, footer ? -len - 2 : len + 8, 6, { w: 0.5 });
      }
      if (read.technical > 0.65) {
        pen.dash(-W / 2, rows[0].cy * H - edge, W / 2, rows[0].cy * H - edge, { dot: true, dash: 12, gap: 5, w: 0.26 + 0.14 * k, wob: 0.3 });
      }
      schedule(scene.strokes, from, 0.1, 1.7);
    }

    // along the outer edge the brush went once over everything: this is what
    // makes it a band, where every tag (also those past the fifth) tints and
    // where the mood of the post shows
    {
      const all = (house ? tags : post.tags.map(pigment)).slice();
      const period = H * (footer ? 0.5 : 1.0);
      const count = Math.ceil(W / 2 / period) + 2;
      let sum = 0;
      const ws = all.map(function(t) { const w = Math.pow(t.weight, 0.7); sum += w; return w; });
      if (read.mood) {
        all.push({ rgb: read.mood });
        ws.push(sum * 0.6);
        sum *= 1.6;
      }
      for (let k = -count; k <= count; k++) {
        const rr = U.rng(U.hash(post.seed + ':edge:' + surface.kind + ':' + k));
        let pick = rr() * sum, i = 0;
        while (i < all.length - 1 && pick > ws[i]) { pick -= ws[i]; i++; }
        if (rr.chance(0.15 + 0.2 * read.thin)) continue;
        const ink = tone(read, all[i].rgb, rr.range(0.5, 0.95));
        const wash = {
          k: 'blob', seed: rr.int(1 << 30), rgb: ink.rgb, a: ink.a, spatter: read.spatter,
          soft: rr.chance(clamp(0.45 + 0.4 * read.soft - 0.45 * read.hard, 0.05, 0.95)),
          x: cx + (k + rr.range(-0.5, 0.5)) * period, y: edge + (footer ? 1 : -1) * H * rr.range(-0.06, 0.05) * (footer ? 0.5 : 1),
          rx: period * rr.range(0.7, 1.5), ry: H * (footer ? rr.range(0.08, 0.24) : rr.range(0.2, 0.48)), rot: rr.range(-0.08, 0.08)
        };
        scene.washes.unshift(wash);
        if (!footer && rr.chance(read.runs * 0.85)) run(rr, wash.x + rr.range(-0.7, 0.7) * wash.rx, wash.y + wash.ry * 0.6, ink.rgb, ink.a);
      }
    }

    // the tags past the fifth only tint: washes with nothing drawn on them
    if (!house) {
      const period = H * (footer ? 1.1 : 2.4);
      const count = Math.ceil(W / 2 / period) + 1;
      post.rest.forEach(function(tag, i) {
        for (let k = -count; k <= count; k++) {
          const rr = U.rng(U.hash(post.seed + ':rest:' + surface.kind + ':' + i + ':' + k));
          const ink = tone(read, tag.rgb, 0.7);
          scene.washes.unshift({
            k: 'blob', seed: rr.int(1 << 30), rgb: ink.rgb, a: ink.a,
            x: cx + (k + rr.range(-0.4, 0.4) + i * 0.37) * period, y: lerp(edge, H / 2, rr.range(0.1, 0.9)),
            rx: H * (footer ? 0.22 : 0.5) * rr.range(0.7, 1.2), ry: H * (footer ? 0.16 : 0.3) * rr.range(0.7, 1.1), rot: rr.range(-0.3, 0.3)
          });
        }
      });
    }
    return scene;
  }

  // ---- paint ---------------------------------------------------------------

  // Tiles of paper tooth: the pencil only catches the high points.
  const tiles = {};
  function grainTile(key, rgb, lo, hi, soft) {
    if (tiles[key]) return tiles[key];
    const size = 160, canvas = document.createElement('canvas');
    canvas.width = canvas.height = size;
    const g = canvas.getContext('2d'), img = g.createImageData(size, size), rand = U.rng('tooth:' + key);
    const white = new Float32Array(size * size);
    for (let i = 0; i < white.length; i++) white[i] = rand();
    const R = Math.round(rgb[0] * 255), G = Math.round(rgb[1] * 255), Bc = Math.round(rgb[2] * 255);
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        let sum = 0;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) sum += white[((y + dy + size) % size) * size + (x + dx + size) % size];
        }
        const n = lerp(white[y * size + x], sum / 9 * 1.6 - 0.3, soft);
        const i = (y * size + x) * 4;
        img.data[i] = R;
        img.data[i + 1] = G;
        img.data[i + 2] = Bc;
        img.data[i + 3] = Math.round(255 * smoothstep(lo, hi, n));
      }
    }
    g.putImageData(img, 0, 0);
    tiles[key] = canvas;
    return canvas;
  }


  // a closed outline as radii: a few low harmonics, so it is uneven but smooth
  function radial(rand, n, amp, kmin, kmax, offset) {
    const out = new Float32Array(n);
    for (let i = 0; i < n; i++) out[i] = offset;
    for (let k = kmin; k <= kmax; k++) {
      const ph = rand() * TAU, a = amp * rand.range(0.3, 1) / Math.pow(k / kmin, 0.9);
      for (let i = 0; i < n; i++) out[i] += a * Math.cos(k * i / n * TAU + ph);
    }
    return out;
  }

  // midpoint displacement: the ragged edge of a wash
  function roughen(pts, rand, rounds, amount) {
    let cur = pts;
    for (let k = 0; k < rounds; k++) {
      const next = [];
      for (let i = 0; i < cur.length; i++) {
        const a = cur[i], b = cur[(i + 1) % cur.length];
        const d = Math.hypot(b[0] - a[0], b[1] - a[1]);
        next.push(a);
        next.push([(a[0] + b[0]) / 2 + rand.gauss() * d * amount, (a[1] + b[1]) / 2 + rand.gauss() * d * amount]);
      }
      cur = next;
    }
    return cur;
  }
  function trace(g, pts) {
    g.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]);
    g.closePath();
  }

  function paintWash(g, scene, dark, dpr) {
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, scene.W, scene.H);
    g.lineJoin = 'round';
    const chalks = {};
    scene.washes.forEach(function(w0) {
      let w = w0;
      const rand = U.rng(w.seed);
      // light: transparent pigment that multiplies; dark: chalk, lighter than the paper
      let rgb = w.rgb;
      if (dark) {
        rgb = U.gouache(rgb, 0.64, 0.8, 0.9);
        if (scene.house) w = Object.assign({}, w, { a: w.a * 0.7 });     // blue on blue: keep it down
      } else if (U.lightness(rgb) < 0.34) {
        rgb = U.mix(rgb, [1, 1, 1], 0.15);
      }
      // black and the near blacks are used thin
      if (w.k === 'blob' && !dark) w = Object.assign({}, w, { a: w.a * lerp(0.55, 1, clamp(U.lightness(w.rgb) / 0.46, 0, 1)) });
      g.globalCompositeOperation = dark ? 'source-over' : 'multiply';
      if (dark) {
        // chalk only catches the tooth of the paper, and every patch is
        // rubbed on in its own direction
        const key = U.toHex(rgb);
        const pattern = chalks[key] || (chalks[key] = g.createPattern(grainTile('chalk:' + key, rgb, 0.3, 0.74, 0.5), 'repeat'));
        pattern.setTransform(new DOMMatrix().translate(rand() * 160, rand() * 160).rotate(-24 + rand.range(-38, 38))
          .scale(rand.range(1.9, 2.7) / dpr, 0.8 / dpr));
        g.fillStyle = pattern;
        g.strokeStyle = pattern;
      } else {
        g.fillStyle = U.css(rgb);
        g.strokeStyle = U.css(U.mix(rgb, [0, 0, 0], 0.15));
      }
      if (w.k === 'blob') {
        const n = 72, ca = Math.cos(w.rot), sa = Math.sin(w.rot);
        const base = radial(rand, n, 0.2, 2, 7, 1);
        const shape = function(R, grow) {
          const pts = [];
          for (let i = 0; i < n; i++) {
            const a = i / n * TAU, q = R[i] * grow;
            const ex = Math.cos(a) * w.rx * q, ey = Math.sin(a) * w.ry * q;
            pts.push([w.x + ex * ca - ey * sa, w.y + ex * sa + ey * ca]);
          }
          return pts;
        };
        const vary = function(amp, lo, hi) {
          const d = radial(rand, n, amp, lo, hi, 0), R = new Float32Array(n);
          for (let i = 0; i < n; i++) R[i] = base[i] * (1 + d[i]);
          return R;
        };
        const body = shape(base, 1);
        if (dark) {       // chalk rubbed on with the side of the stick: soft all round
          for (let i = 0; i < 9; i++) {
            g.globalAlpha = 0.062 * w.a;
            g.beginPath();
            trace(g, shape(vary(0.1 + 0.015 * i, 2, 9), 0.72 + 0.045 * i));
            g.fill();
          }
        } else if (w.soft) {    // wet in wet: no edge anywhere
          for (let i = 0; i < 11; i++) {
            g.globalAlpha = 0.024 * w.a;
            g.beginPath();
            trace(g, shape(vary(0.1 + 0.012 * i, 2, 9), 0.6 + 0.05 * i));
            g.fill();
          }
        } else {
          // the body of the wash: flat, with an edge
          for (let i = 0; i < 3; i++) {
            g.globalAlpha = 0.04 * w.a;
            g.beginPath();
            trace(g, shape(vary(0.02, 5, 14), 1));
            g.fill();
          }
          // where it was wetter it ran a little further
          for (let i = 0; i < 4; i++) {
            g.globalAlpha = 0.016 * w.a;
            g.beginPath();
            trace(g, shape(vary(0.09, 2, 8), 1.02 + 0.03 * i));
            g.fill();
          }
          // where the water stopped, pigment collects
          g.beginPath();
          trace(g, body);
          g.globalAlpha = 0.1 * w.a;
          g.lineWidth = 1;
          g.stroke();
          g.globalAlpha = 0.035 * w.a;
          g.lineWidth = 2.8;
          g.stroke();
          // pools inside it, and one place where water ran back
          g.save();
          g.beginPath();
          trace(g, body);
          g.clip();
          const pools = 2 + rand.int(3);
          for (let k = 0; k <= pools; k++) {
            const a = rand() * TAU, d = rand.range(0.1, 0.75), bloom = k === pools;
            const sub = {
              x: w.x + (Math.cos(a) * w.rx * d) * ca - (Math.sin(a) * w.ry * d) * sa,
              y: w.y + (Math.cos(a) * w.rx * d) * sa + (Math.sin(a) * w.ry * d) * ca,
              r: Math.min(w.rx, w.ry) * rand.range(0.35, 0.75)
            };
            const sb = radial(rand, 36, 0.25, 2, 6, 1), sp = [];
            for (let i = 0; i < 36; i++) {
              const q = i / 36 * TAU;
              sp.push([sub.x + Math.cos(q) * sub.r * sb[i] * 1.3, sub.y + Math.sin(q) * sub.r * sb[i]]);
            }
            if (bloom && rand.chance(0.6)) {
              g.globalCompositeOperation = 'destination-out';
              g.globalAlpha = 0.22;
              g.beginPath();
              trace(g, sp);
              g.fill();
              g.globalCompositeOperation = 'multiply';
              g.globalAlpha = 0.054 * w.a;
              g.lineWidth = 1.2;
              g.stroke();
            } else {
              for (let i = 0; i < 6; i++) {
                g.globalAlpha = 0.011 * w.a;
                g.beginPath();
                const grow = 0.7 + i * 0.08;
                trace(g, sp.map(function(q) { return [sub.x + (q[0] - sub.x) * grow, sub.y + (q[1] - sub.y) * grow]; }));
                g.fill();
              }
            }
          }
          g.restore();
          // a few drops off the brush
          const spatter = w.spatter === undefined ? 0.35 : w.spatter;
          if (rand.chance(spatter)) {
            const drops = 1 + rand.int(4) + (spatter > 0.6 ? 3 + rand.int(4) : 0);
            for (let k = 0; k < drops; k++) {
              const a = rand() * TAU, d = rand.range(1.05, 1.5), rr = rand.range(0.6, 2.4);
              const dx = Math.cos(a) * w.rx * d, dy = Math.sin(a) * w.ry * d;
              g.globalAlpha = 0.16 * w.a;
              g.beginPath();
              g.arc(w.x + dx * ca - dy * sa, w.y + dx * sa + dy * ca, rr, 0, TAU);
              g.fill();
              g.globalAlpha = 0.1 * w.a;
              g.lineWidth = 0.6;
              g.stroke();
            }
          }
        }
      } else if (w.k === 'poly') {
        const alpha = (dark ? 0.2 : 0.075) * w.a;
        for (let i = 0; i < 4; i++) {
          g.globalAlpha = alpha;
          g.beginPath();
          w.loops.forEach(function(l) { trace(g, l.length > 60 ? jitter(l, rand, 0.8 * w.rough) : roughen(l, rand, 2, 0.07 * w.rough)); });
          g.fill(w.evenodd ? 'evenodd' : 'nonzero');
        }
        if (!dark) {
          g.globalAlpha = alpha * 1.3;
          g.lineWidth = 0.8;
          g.beginPath();
          w.loops.forEach(function(l) { trace(g, l.length > 60 ? jitter(l, rand, 0.6) : roughen(l, rand, 2, 0.05)); });
          g.stroke();
        }
      } else if (w.k === 'ring') {
        for (let i = 0; i < 5; i++) {
          g.globalAlpha = (dark ? 0.24 : 0.08) * w.a;
          g.lineWidth = w.r * rand.range(0.05, 0.16);
          g.beginPath();
          const ring = ngon(w.x + rand.gauss() * 0.6, w.y + rand.gauss() * 0.6, w.r * (1 + rand.gauss() * 0.012), 20, rand() * TAU);
          const pts = spline(roughen(ring, rand, 1, 0.03), true, 3);
          // the ring is never whole
          const start = rand.int(pts.length), len = Math.floor(pts.length * rand.range(0.7, 1));
          g.moveTo(pts[start][0], pts[start][1]);
          for (let k = 1; k < len; k++) { const q = pts[(start + k) % pts.length]; g.lineTo(q[0], q[1]); }
          g.stroke();
        }
        g.globalAlpha = 0.02 * w.a;
        g.beginPath();
        trace(g, roughen(ngon(w.x, w.y, w.r, 14, 0), rand, 2, 0.05));
        g.fill();
      }
    });
    if (!dark) {      // granulation: the pigment settles into the paper's tooth
      g.globalCompositeOperation = 'destination-out';
      g.globalAlpha = 0.2;
      const pattern = g.createPattern(grainTile('gran', [0, 0, 0], 0.45, 1, 0.6), 'repeat');
      pattern.setTransform(new DOMMatrix([1 / dpr, 0, 0, 1 / dpr, 0, 0]));
      g.fillStyle = pattern;
      g.fillRect(0, 0, scene.W, scene.H);
    }
    g.globalCompositeOperation = 'source-over';
    g.globalAlpha = 1;
  }
  function jitter(pts, rand, amount) {
    const ox = rand.gauss() * amount, oy = rand.gauss() * amount;
    return pts.map(function(q) { return [q[0] + ox + rand.gauss() * amount * 0.4, q[1] + oy + rand.gauss() * amount * 0.4]; });
  }

  // points i0..i1 of a stroke as a ribbon of its varying width
  function ribbon(g, st, i0, i1, wide) {
    const xs = st.xs, ys = st.ys, ws = st.ws, n = xs.length;
    g.beginPath();
    for (let pass = 0; pass < 2; pass++) {
      for (let k = i0; k <= i1; k++) {
        const i = pass ? i1 - (k - i0) : k;
        const a = Math.max(0, i - 1), b = Math.min(n - 1, i + 1);
        let dx = xs[b] - xs[a], dy = ys[b] - ys[a];
        const d = Math.hypot(dx, dy) || 1;
        dx /= d;
        dy /= d;
        const s = (pass ? -ws[i] : ws[i]) * wide;
        const x = xs[i] - dy * s, y = ys[i] + dx * s;
        if (!pass && k === i0) g.moveTo(x, y); else g.lineTo(x, y);
      }
    }
    g.closePath();
    g.fill();
  }

  // ---- the variant ---------------------------------------------------------

  LucumrArt.register('sketchbook', {
    title: 'Sketchbook margins',
    create: function(env) {
      let post = null;
      let clock = END;        // seconds into painting the current picture
      let started = 0;        // performance.now() when that began
      let drawn = 0;          // performance.now() of the last paint
      let timer = 0;
      const layers = env.surfaces.map(function(surface) {
        return {
          surface: surface, g: surface.canvas.getContext('2d'),
          wash: document.createElement('canvas'), pencil: document.createElement('canvas'),
          scene: null, done: null, patterns: null, scratch: null, dirty: true, painted: false, prev: null,
          flow: null, flowSince: 0, due: 0
        };
      });

      function pencilColor(colors, dark, rgb) {
        if (rgb === 'house') return dark ? U.mix(colors.header, [1, 1, 1], 0.5) : U.mix(colors.primary, colors.header, 0.45);
        if (!rgb) return colors.graphite;
        // a coloured pencil: on blue paper only light ones show
        if (dark) return U.gouache(rgb, 0.74, 0.9);
        return U.lightness(rgb) > 0.68 ? U.mix(rgb, [0.3, 0.2, 0], 0.35) : U.mix(rgb, [0, 0, 0], 0.08);
      }

      // Once the picture is finished it lives in the visible canvas alone.
      function release(layer) {
        [layer.wash, layer.pencil].forEach(function(c) { c.width = c.height = 0; });
        layer.scene = layer.done = layer.scratch = layer.patterns = null;
      }

      // ---- the flow: what keeps moving once the page is drawn -------------
      //
      // The washes are still wet: a slow wave runs through them, the colour
      // rising and sinking a few pixels under the pencil lines, which stay
      // where they are.  Two waves, one long and one short, run against each
      // other, so it does not look mechanical; it is the same at every width
      // (it is placed from the middle) and it only ever moves the washes
      // around where they were painted.  How strong and how fast: the post's
      // energy (calmer when it is reflective); which way: the way it looks
      // (facet time: back is left, ahead right).  Wash and pencil are kept as
      // layers once the page is painted; a frame puts them together again, the
      // wash in narrow columns each lifted by the wave, FLOW_FPS times a second.
      const FLOW_FPS = 12;

      function flowOf(surface) {
        const size = Math.sqrt(surface.height / 450), e = post.energy;
        const lean = post.share('time', 'future') - post.share('time', 'past');
        const dir = lean > 0.12 ? 1 : lean < -0.12 ? -1 : (post.seed & 1 ? 1 : -1);
        const calm = 1 - 0.25 * post.share('mood', 'reflective');
        return {
          amp: lerp(10, 16, e) * calm * size,                  // CSS px, how far it lifts
          pool: lerp(0.42, 0.55, e) * calm,                    // how much the pigment gathers and thins
          len: [surface.height * 1.15, surface.height * 0.45],   // CSS px
          speed: dir * lerp(14, 30, e) * calm * size,         // CSS px per second
          phase: (post.seed % 1000) / 1000 * TAU
        };
      }

      // The finished picture is kept as its layers, and from now on it flows.
      function settle(layer, now) {
        layer.scene = layer.done = layer.scratch = layer.patterns = null;
        if (env.still) {
          release(layer);
          return;
        }
        layer.flow = flowOf(layer.surface);
        layer.flowSince = now;
        layer.due = 0;
      }

      // The wash, lifted column by column, and pooling: the pigment gathers
      // in slanted bands that travel with the wave and thins between them.
      // At the start of the flow (k = 0) it is exactly the painted wash.
      function waveAt(f, X, now) {
        return 0.65 * Math.sin(TAU * (X - f.speed * now) / f.len[0] + f.phase) +
          0.35 * Math.sin(TAU * (X + 0.6 * f.speed * now) / f.len[1] - f.phase);
      }
      function flowWash(g, layer, wash, w, h, now) {
        const f = layer.flow, dpr = layer.surface.dpr, k = smoothstep(0, 2.5, now - layer.flowSince);
        if (k <= 0) {
          g.drawImage(wash, 0, 0);
          return;
        }
        if (!layer.scratch) layer.scratch = document.createElement('canvas');
        const sc = layer.scratch;
        if (sc.width !== w) sc.width = w;
        if (sc.height !== h) sc.height = h;
        const sg = sc.getContext('2d');
        sg.setTransform(1, 0, 0, 1, 0, 0);
        sg.globalCompositeOperation = 'copy';
        sg.globalAlpha = 1;
        const A = f.amp * k * dpr, cw = Math.max(2, Math.round(6 * dpr)), cx = w / 2;
        for (let x = 0; x < w; x += cw) {
          const dy = A * waveAt(f, (x + cw / 2 - cx) / dpr, now), cww = Math.min(cw, w - x);
          // a little taller than the band, so that no paper shows at its edges
          sg.drawImage(wash, x, 0, cww, h, x, dy - A, cww, h + 2 * A);
          if (x === 0) sg.globalCompositeOperation = 'source-over';
        }
        // the lifted wash, thinned; then again where the pigment pools
        const D = f.pool * k;
        g.globalAlpha = 1 - D;
        g.drawImage(sc, 0, 0);
        sg.globalCompositeOperation = 'destination-in';
        const slant = 0.35 * h;
        const band = sg.createLinearGradient(0, 0, w, slant);
        const n = Math.max(8, Math.min(48, Math.ceil(w / dpr / f.len[1] * 6)));
        for (let i = 0; i <= n; i++) {
          const X = (i / n * w - cx) / dpr;
          const v = 0.5 + 0.5 * waveAt(f, X * 1.3 + 40, now * 1.15);
          band.addColorStop(i / n, 'rgba(0,0,0,' + clamp(v * v, 0, 1).toFixed(3) + ')');
        }
        sg.fillStyle = band;
        sg.fillRect(0, 0, w, h);
        g.globalAlpha = 2 * D;
        g.drawImage(sc, 0, 0);
        g.globalAlpha = 1;
      }

      // One frame of the flow: seconds until the next one is wanted, or false.
      function air(now) {
        if (env.still || !post) return false;
        let wait = false;
        layers.forEach(function(layer) {
          if (!layer.flow || !layer.surface.visible) return;     // shown again: the core asks for a frame
          if (now >= layer.due - 0.005) {
            compose(layer, END, now);
            layer.due = now + 1 / FLOW_FPS;
          }
          const w = Math.max(0, layer.due - now);
          wait = wait === false ? w : Math.min(wait, w);
        });
        return wait;
      }

      function rebuild(layer) {
        const surface = layer.surface, dark = env.dark, colors = env.palette();
        const w = surface.canvas.width, h = surface.canvas.height;
        [layer.wash, layer.pencil].forEach(function(c) {
          if (c.width !== w) c.width = w;
          if (c.height !== h) c.height = h;
        });
        layer.scene = buildScene(surface, post, colors);
        layer.done = new Int32Array(layer.scene.strokes.length);
        layer.flow = null;
        paintWash(layer.wash.getContext('2d'), layer.scene, dark, surface.dpr);
        const pg = layer.pencil.getContext('2d');
        pg.setTransform(1, 0, 0, 1, 0, 0);
        pg.clearRect(0, 0, w, h);
        layer.patterns = {};
        layer.dirty = false;
      }

      function patternFor(layer, pg, rgb, dark, colors) {
        const key = (dark ? 'd' : 'l') + (rgb === 'house' ? 'house' : rgb ? U.toHex(rgb) : 'graphite');
        if (!layer.patterns[key]) {
          const tile = grainTile('pencil:' + key, pencilColor(colors, dark, rgb), dark ? 0.12 : 0.08, dark ? 0.8 : 0.7, 0.45);
          const pattern = pg.createPattern(tile, 'repeat');
          pattern.setTransform(new DOMMatrix([1 / layer.surface.dpr, 0, 0, 1 / layer.surface.dpr, 0, 0]));
          layer.patterns[key] = pattern;
        }
        return layer.patterns[key];
      }

      // draw what the pencil has reached by time t and has not drawn yet
      function drawPencil(layer, t) {
        const strokes = layer.scene.strokes, done = layer.done, dark = env.dark, colors = env.palette();
        const pg = layer.pencil.getContext('2d'), dpr = layer.surface.dpr;
        pg.setTransform(dpr, 0, 0, dpr, 0, 0);
        let last = undefined;
        for (let i = 0; i < strokes.length; i++) {
          const st = strokes[i], n = st.xs.length - 1;
          if (done[i] >= n || t <= st.t0) continue;
          const target = t >= st.t1 || t >= END ? n : Math.floor((t - st.t0) / (st.t1 - st.t0) * n);
          if (target <= done[i]) continue;
          if (st.rgb !== last) {
            pg.fillStyle = patternFor(layer, pg, st.rgb, dark, colors);
            last = st.rgb;
          }
          pg.globalAlpha = st.a * 0.17;
          ribbon(pg, st, done[i], target, 2.3);
          pg.globalAlpha = st.a * (dark ? 0.92 : 1);
          ribbon(pg, st, done[i], target, 1);
          done[i] = target;
        }
        pg.globalAlpha = 1;
      }

      function compose(layer, t, now) {
        const surface = layer.surface, g = layer.g, colors = env.palette(), dark = env.dark;
        const w = surface.canvas.width, h = surface.canvas.height;
        g.setTransform(1, 0, 0, 1, 0, 0);
        g.globalCompositeOperation = 'source-over';
        g.globalAlpha = 1;
        g.fillStyle = U.css(colors.paper);
        g.fillRect(0, 0, w, h);
        // the colour follows the pencil, from the middle outwards
        let wash = layer.wash;
        if (t < END) {
          if (!layer.scratch) layer.scratch = document.createElement('canvas');
          const sc = layer.scratch;
          if (sc.width !== w) sc.width = w;
          if (sc.height !== h) sc.height = h;
          const sg = sc.getContext('2d');
          sg.globalCompositeOperation = 'copy';
          sg.drawImage(layer.wash, 0, 0);
          sg.globalCompositeOperation = 'destination-in';
          const mask = sg.createLinearGradient(0, 0, w, 0);
          for (let i = 0; i <= 16; i++) {
            const k = i / 16, far = Math.abs(k - 0.5) * 2;
            mask.addColorStop(k, 'rgba(0,0,0,' + smoothstep(0, 1, (t - 0.3 - 1.0 * far) / 0.9).toFixed(3) + ')');
          }
          sg.fillStyle = mask;
          sg.fillRect(0, 0, w, h);
          wash = sc;
        } else if (!layer.flow) {
          layer.scratch = null;
        }
        if (!dark) g.globalCompositeOperation = 'multiply';
        if (layer.flow && t >= END) flowWash(g, layer, wash, w, h, now);
        else g.drawImage(wash, 0, 0);
        g.globalCompositeOperation = 'source-over';
        g.drawImage(layer.pencil, 0, 0);
        // dissolve into the page towards the content
        const footer = surface.kind === 'footer';
        const from = footer ? h * 0.3 : h * 0.6, to = footer ? 0 : h;
        const fade = g.createLinearGradient(0, from, 0, to);
        for (let i = 0; i <= 8; i++) {
          const k = i / 8;
          fade.addColorStop(k, U.css(colors.paper, k * k * (3 - 2 * k)));
        }
        g.fillStyle = fade;
        g.fillRect(0, Math.min(from, to), w, Math.abs(to - from));
        if (layer.prev) {       // the previous post's picture, fading
          const k = 1 - smoothstep(0, 0.8, t);
          if (k > 0.004 && layer.prev.width === w && layer.prev.height === h) {
            g.globalAlpha = k;
            g.drawImage(layer.prev, 0, 0);
            g.globalAlpha = 1;
          } else {
            layer.prev = null;
          }
        }
      }

      // Paint what the clock has reached; true while there is more to come,
      // then the flow of the washes (see air()).
      function step(now) {
        if (!post) return false;
        if (now === undefined) now = performance.now() / 1000;
        if (env.still) clock = END;
        else if (started) clock = Math.min(END, (performance.now() - started) / 1000);
        layers.forEach(function(layer) {
          if (layer.surface.width < 2 || layer.surface.height < 2) return;
          if (layer.dirty) rebuild(layer);
          if (!layer.scene) return;       // finished earlier, nothing changed
          drawPencil(layer, clock);
          compose(layer, clock, now);
          layer.painted = true;
        });
        drawn = performance.now();
        if (!started) started = drawn;    // the clock runs from the first picture, not from the build
        if (clock >= END) {
          layers.forEach(function(layer) {
            layer.prev = null;
            if (layer.scene) settle(layer, now);
          });
          return air(now);
        }
        return true;
      }

      // Animation frames can stop coming while the picture paints in (a tab in
      // the background, headless Chrome under a virtual clock, which is how
      // scripts/art-shot runs): then a timer goes on painting, so that a
      // picture never stays half drawn.
      function watch() {
        timer = 0;
        if (!post || clock >= END) return;
        if (performance.now() - drawn > 150 && step() !== true) return;
        timer = setTimeout(watch, 50);
      }

      return {
        setPost: function(next, info) {
          if (post && !info.initial && !env.still) {
            layers.forEach(function(layer) {
              if (!layer.painted) { layer.prev = null; return; }
              const copy = document.createElement('canvas');
              copy.width = layer.surface.canvas.width;
              copy.height = layer.surface.canvas.height;
              copy.getContext('2d').drawImage(layer.surface.canvas, 0, 0);
              layer.prev = copy;
            });
          }
          post = next;
          clock = env.still ? END : 0;
          started = 0;
          drawn = performance.now();
          layers.forEach(function(layer) { layer.dirty = true; });
          if (!env.still && !timer) timer = setTimeout(watch, 50);
        },
        resize: function() {
          layers.forEach(function(layer) { layer.dirty = true; layer.prev = null; layer.painted = false; });
        },
        setTheme: function() {
          layers.forEach(function(layer) { layer.dirty = true; layer.prev = null; });
        },
        frame: step,
        destroy: function() {
          if (timer) clearTimeout(timer);
          timer = 0;
          post = null;
          layers.forEach(function(layer) {
            release(layer);
            layer.prev = layer.flow = null;
          });
        }
      };
    }
  });
})();
