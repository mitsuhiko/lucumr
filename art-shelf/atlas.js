// Proposal 3: Atlas.  The blog has a geography, and every post is a place in it.
//
// Every tag is a peak on one island.  Where it stands comes from the tags it
// shares posts with (the build's layout, laid on its side), how high it is
// from its number of posts; tags that are used together are joined by ridges.
// That map is the same on every page.
//
//   header   a strip of the map through the post's place (the weighted middle
//            of its tags), turned so that it runs along them
//   footer   the wider sheet: every peak named, a red ring where the post is,
//            the route over its summits (a tick for every heading of the
//            text), the date next to the ring
//   subject  tags are summits tinted in their pigment, layer over layer with height
//   register tags are a pale wash over their range, named in spaced capitals,
//            and they set the hand: loose makes the pencil wander and the
//            paint wet (soft edges, blooms), tight rules the graticule and
//            leaves crisp edges and paper between two colours; energy sets
//            the pressure, the contour interval and the hatching
//   project  tags are a small map symbol in ink on a dab of their colour
//   no tags  the whole island in the blog's blues
//
// The facets (ART.md) say what kind of day it is at that place, so that posts
// with the same tags are different sheets:
//   scale      how close the header's strip is (self: a close-up ... society: from far off)
//   ai, and scale/stance/actor/time/personal/technical
//              soft tags: they pull the place towards the peak they are about
//              (agents: tooling, writing: culture, society: politics ...); the
//              kind of `ai` also paints that flank of the ai peak in the other's pigment
//   mood       the weather: the colour of the light on the slopes that face it
//              and of the shadow on the others (worried: grey shadow, hopeful:
//              yellow light, angry: red ...)
//   time       where that light comes from: the west (past), above, the east (future)
//   valence    how heavy and dull or light and clean the paint is
//   tension    a fault through the place: the ground has slipped along it, and
//              the washes keep paper between them instead of running together
//   certainty  one firm contour line, or one gone over two and three times
//   technical  the survey's apparatus: graticule and sight lines between summits
//   ending     the edge towards the page: long and frayed (open), late and clean
//              (resolved); an arrow on from the last summit (call); a scale bar (practical)
//   stance     what is done at the place, in red: a ground plan pegged out, an
//              angle measured, a section cut, a flag, a look-out's sight lines, a cross
//   actor      who lives there: one house, a hamlet, rows in rank and file
//   imagery    (when sure) a road for the route, streams, woodland, a crowd, scree, a tower
//   personal   how much red pencil;  humor: a sea serpent off the coast
//   season     (from the date) the tint of the lowland, snow on the summits
// energy and wander are already in the hand (post.energy, post.loose).
//
// Light theme: pencil and watercolour (pigments glaze: they multiply).  Dark
// theme: white pencil and chalk on navy paper (opaque, broken by the tooth).
// Contours are marching squares over a height field, drawn as short strokes;
// the tint is computed per pixel at low resolution.  2D canvas only.
(function() {
  'use strict';
  const U = LucumrArt.util;
  const noise2 = U.noise2, clamp = U.clamp, lerp = U.lerp, smoothstep = U.smoothstep, mix = U.mix, css = U.css;

  // ---- the map: the same on every page ----------------------------------

  const ASPECT = 3.3;     // the tag plane is laid on its side and stretched: the bands are wide
  const DEPTH = 0.86;
  const SEA = 0.05;       // how far the plain around the peaks is under water
  const LAND = 0.15;      // height of the lowland the peaks stand on
  let MAP = null;

  function fbm(x, y, seed, octaves) {
    let sum = 0, amp = 0.5, norm = 0;
    for (let i = 0; i < octaves; i++) {
      sum += amp * noise2(x, y, seed + i * 57);
      norm += amp;
      const nx = 1.6 * x - 1.2 * y + 5.3;
      y = 1.2 * x + 1.6 * y - 3.1;
      x = nx;
      amp *= 0.5;
    }
    return sum / norm;
  }

  function makePeak(tag, most) {
    const share = Math.sqrt(Math.min(1, (tag.known === false ? 5 : tag.count) / most));
    return {
      name: tag.name, tag: tag, count: tag.count,
      x: tag.y * ASPECT, y: tag.x * DEPTH,
      h: 0.2 + 0.8 * share,
      r: 0.06 + 0.1 * share
    };
  }

  // Tags that sit on top of each other are pushed apart a little; everything
  // stays where the build put it otherwise.
  function relax(peaks) {
    peaks.forEach(function(p) { p.ox = p.x; p.oy = p.y; });
    for (let round = 0; round < 120; round++) {
      for (let i = 0; i < peaks.length; i++) {
        for (let j = i + 1; j < peaks.length; j++) {
          const a = peaks[i], b = peaks[j];
          let dx = b.x - a.x, dy = b.y - a.y;
          const d = Math.hypot(dx, dy) || 1e-6;
          const want = (a.r + b.r) * 1.3;
          if (d >= want) continue;
          const push = (want - d) / d * 0.25;
          a.x -= dx * push; a.y -= dy * push * 0.6;
          b.x += dx * push; b.y += dy * push * 0.6;
        }
      }
      peaks.forEach(function(p) {
        p.x += (p.ox - p.x) * 0.02;
        p.y += (p.oy - p.y) * 0.02;
      });
    }
  }

  // Ridges: a spanning tree over the tags, preferring pairs that are close
  // and share many posts.  Tags used together become one range.
  function ridgesOf(peaks) {
    const index = {};
    peaks.forEach(function(p, i) { index[p.name] = i; });
    const edges = [];
    peaks.forEach(function(a, i) {
      (a.tag.near || []).forEach(function(pair) {
        const j = index[pair[0]];
        if (j === undefined || j <= i) return;
        const b = peaks[j];
        const rel = pair[1] / Math.max(1, Math.min(a.count, b.count));
        const length = Math.hypot(a.x - b.x, a.y - b.y);
        edges.push({ a: i, b: j, length: length, cost: length / (0.25 + rel) });
      });
    });
    edges.sort(function(p, q) { return p.cost - q.cost || p.a - q.a || p.b - q.b; });
    const parent = peaks.map(function(_, i) { return i; });
    const find = function(i) { while (parent[i] !== i) i = parent[i] = parent[parent[i]]; return i; };
    const result = [];
    edges.forEach(function(edge) {
      const a = find(edge.a), b = find(edge.b);
      if (a === b) return;
      parent[a] = b;
      result.push(edge);
    });
    return result;
  }

  function theMap() {
    const data = LucumrArt.data;
    if (MAP && MAP.data === data) return MAP;
    const names = Object.keys(data.tags).sort();
    let most = 1;
    names.forEach(function(name) { most = Math.max(most, data.tags[name].count || 0); });
    const peaks = names.map(function(name) { return makePeak(LucumrArt.tag(name), most); });
    relax(peaks);
    const byName = {};
    peaks.forEach(function(p) { byName[p.name] = p; });
    let cx = 0, cy = 0;
    peaks.forEach(function(p) { cx += p.x; cy += p.y; });
    MAP = {
      data: data, most: most, peaks: peaks, byName: byName, ridges: ridgesOf(peaks), field: null,
      centre: peaks.length ? [cx / peaks.length, cy / peaks.length] : [ASPECT / 2, DEPTH / 2]
    };
    return MAP;
  }

  // Value noise with its derivative (out: value 0..1, d/dx, d/dy).
  function lattice(ix, iy, seed) {
    let h = Math.imul(ix, 374761393) ^ Math.imul(iy, 668265263) ^ Math.imul(seed, 1442695041);
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  }
  const N = new Float64Array(3);
  function noised(x, y, seed) {
    const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy;
    const ux = fx * fx * fx * (fx * (fx * 6 - 15) + 10), uy = fy * fy * fy * (fy * (fy * 6 - 15) + 10);
    const dux = 30 * fx * fx * (fx * (fx - 2) + 1), duy = 30 * fy * fy * (fy * (fy - 2) + 1);
    const a = lattice(ix, iy, seed), b = lattice(ix + 1, iy, seed);
    const c = lattice(ix, iy + 1, seed), d = lattice(ix + 1, iy + 1, seed);
    const k = a - b - c + d;
    N[0] = a + (b - a) * ux + (c - a) * uy + k * ux * uy;
    N[1] = dux * (b - a + k * uy);
    N[2] = duy * (c - a + k * ux);
  }
  // Noise whose detail dies away on slopes: flat valley floors, sharp crests,
  // the way worn terrain looks.  0..1.
  function worn(x, y, seed, octaves) {
    let sum = 0, amp = 1, norm = 0, dx = 0, dy = 0;
    for (let i = 0; i < octaves; i++) {
      noised(x, y, seed + i * 57);
      dx += N[1]; dy += N[2];
      sum += amp * N[0] / (1 + 0.9 * (dx * dx + dy * dy));
      norm += amp;
      const nx = 1.6 * x - 1.2 * y + 5.3;
      y = 1.2 * x + 1.6 * y - 3.1;
      x = nx;
      amp *= 0.5;
    }
    return sum / norm;
  }

  const WARP = 0.06, WARP_F = 2.4;
  function warpX(x, y) { return x + WARP * fbm(x * WARP_F, y * WARP_F, 7, 2); }
  function warpY(x, y) { return y + WARP * fbm(x * WARP_F + 40.5, y * WARP_F + 17.25, 19, 2); }

  // The height field for a list of peaks (the map's and any the post brought
  // along that the map does not know).  An island: a plain that rises inland,
  // massifs where tags crowd, a summit for every tag, all of it worn.
  function terrain(peaks, ridges) {
    const n = peaks.length;
    const px = new Float64Array(n), py = new Float64Array(n), pr = new Float64Array(n), ph = new Float64Array(n);
    const pcut = new Float64Array(n), pl = new Float64Array(n), plcut = new Float64Array(n);
    const pm = new Float64Array(n), pmcut = new Float64Array(n);
    peaks.forEach(function(p, i) {
      px[i] = warpX(p.x, p.y); py[i] = warpY(p.x, p.y);
      pr[i] = 1 / p.r; ph[i] = p.h;
      pcut[i] = Math.pow(3.0 * p.r, 2);
      const broad = 2.1 * p.r;
      pm[i] = 1 / (broad * broad);
      pmcut[i] = 6 * broad * broad;
      const sigma = 0.13 + p.r * 0.8;
      pl[i] = 1 / (2 * sigma * sigma);
      plcut[i] = 9 * sigma * sigma;
    });
    const m = ridges.length;
    const rax = new Float64Array(m), ray = new Float64Array(m), rdx = new Float64Array(m), rdy = new Float64Array(m);
    const ril = new Float64Array(m), rha = new Float64Array(m), rhb = new Float64Array(m), rsag = new Float64Array(m);
    const rmx = new Float64Array(m), rmy = new Float64Array(m), rcut = new Float64Array(m);
    const RIDGE = 0.075;
    ridges.forEach(function(ridge, i) {
      const a = ridge.a, b = ridge.b;
      rax[i] = px[a]; ray[i] = py[a];
      rdx[i] = px[b] - px[a]; rdy[i] = py[b] - py[a];
      const len2 = rdx[i] * rdx[i] + rdy[i] * rdy[i] || 1e-9;
      const length = Math.sqrt(len2);
      ril[i] = 1 / len2;
      const keep = 0.5 * clamp(1.2 - length / 0.8, 0.2, 1);
      rha[i] = ph[a] * keep; rhb[i] = ph[b] * keep;
      rsag[i] = clamp(0.2 + length * 0.8, 0.2, 0.65);
      rmx[i] = (px[a] + px[b]) / 2; rmy[i] = (py[a] + py[b]) / 2;
      rcut[i] = Math.pow(length / 2 + 3 * RIDGE, 2);
    });

    return function(x, y) {
      const wx = warpX(x, y), wy = warpY(x, y);
      let summit = 0, massif = 0, land = 0;
      for (let i = 0; i < n; i++) {
        const dx = wx - px[i], dy = wy - py[i];
        const d2 = dx * dx + dy * dy;
        if (d2 < plcut[i]) land += Math.exp(-d2 * pl[i]);
        if (d2 < pmcut[i]) {
          const f = 0.5 * ph[i] * Math.exp(-d2 * pm[i]);
          massif += f * f;
        }
        if (d2 < pcut[i]) {
          const d = Math.sqrt(d2) * pr[i];
          const f = 0.5 * ph[i] * Math.exp(-d * Math.sqrt(d));
          const f2 = f * f;
          summit += f2 * f2;
        }
      }
      for (let i = 0; i < m; i++) {
        const ex = wx - rmx[i], ey = wy - rmy[i];
        if (ex * ex + ey * ey > rcut[i]) continue;
        const qx = wx - rax[i], qy = wy - ray[i];
        const t = clamp((qx * rdx[i] + qy * rdy[i]) * ril[i], 0, 1);
        const ox = qx - rdx[i] * t, oy = qy - rdy[i] * t;
        const d2 = (ox * ox + oy * oy) / (RIDGE * RIDGE);
        if (d2 > 7) continue;
        const f = (rha[i] + (rhb[i] - rha[i]) * t) * (1 - rsag[i] * 4 * t * (1 - t)) * Math.exp(-d2);
        massif += f * f;
      }
      const shape = 1 - Math.exp(-land * 1.3);
      const coast = fbm(x * 2.1 - 1.7, y * 2.1 + 6.1, 31, 3);
      if (land < 1e-3) return 0.06 * coast * (1.2 - shape) - SEA - 0.08 * (1 - shape);   // open sea
      const rock = worn(x * 4.2 + 3.1, y * 4.2 - 8.7, 53, 5);
      const high = Math.sqrt(massif) + Math.sqrt(Math.sqrt(summit));
      return LAND * shape * Math.sqrt(shape) + high * (0.62 + 0.85 * rock) + 0.1 * (rock - 0.42) * shape
        + 0.06 * coast * (1.2 - shape) - SEA - 0.08 * (1 - shape);
    };
  }

  // ---- what a post is on the map ----------------------------------------

  // The top of a peak: uphill from where the tag was put, not far.
  function climb(field, peak) {
    let x = peak.x, y = peak.y, best = field(x, y), step = peak.r * 0.15;
    for (let i = 0; i < 60 && step > peak.r * 0.01; i++) {
      let moved = false;
      for (let k = 0; k < 8; k++) {
        const nx = x + Math.cos(k * Math.PI / 4) * step, ny = y + Math.sin(k * Math.PI / 4) * step;
        if (Math.hypot(nx - peak.x, ny - peak.y) > peak.r * 0.8) continue;
        const v = field(nx, ny);
        if (v > best) { best = v; x = nx; y = ny; moved = true; }
      }
      if (!moved) step *= 0.5;
    }
    peak.sx = x; peak.sy = y; peak.top = best;
  }

  // The shortest walk over a handful of points (all orders for a few, greedy for many).
  function walk(points) {
    const n = points.length;
    if (n < 3) return points.slice();
    const far = function(a, b) { return Math.hypot(a[0] - b[0], a[1] - b[1]); };
    if (n > 7) {
      const left = points.slice().sort(function(a, b) { return a[0] - b[0]; });
      const path = [left.shift()];
      while (left.length) {
        const last = path[path.length - 1];
        let pick = 0;
        for (let i = 1; i < left.length; i++) if (far(left[i], last) < far(left[pick], last)) pick = i;
        path.push(left.splice(pick, 1)[0]);
      }
      return path;
    }
    let best = null, bestLength = Infinity;
    const order = [], used = [];
    const visit = function(length) {
      if (length >= bestLength) return;
      if (order.length === n) { bestLength = length; best = order.slice(); return; }
      for (let i = 0; i < n; i++) {
        if (used[i]) continue;
        used[i] = true;
        order.push(points[i]);
        visit(order.length > 1 ? length + far(order[order.length - 2], points[i]) : 0);
        order.pop();
        used[i] = false;
      }
    };
    visit(0);
    if (best[0][0] > best[n - 1][0]) best.reverse();
    return best;
  }

  // ---- the facets: what kind of day it is at that place ---------------------

  // mood is the weather: the colour of the light on the slopes that face it,
  // and of the shadow on those that do not (each with how much of it)
  const MOODS = {
    hopeful: [[0.98, 0.82, 0.4], 0.6, [0.5, 0.52, 0.8], 0.4],
    worried: [[0.8, 0.82, 0.86], 0.05, [0.3, 0.35, 0.46], 0.9],
    angry: [[0.96, 0.46, 0.26], 0.55, [0.5, 0.15, 0.17], 0.75],
    reflective: [[0.92, 0.88, 0.7], 0.18, [0.4, 0.52, 0.72], 0.55],
    playful: [[0.99, 0.66, 0.76], 0.55, [0.22, 0.68, 0.72], 0.5],
    matter_of_fact: [[0.9, 0.9, 0.9], 0, [0.5, 0.5, 0.53], 0.15],
    conflicted: [[0.97, 0.58, 0.22], 0.6, [0.2, 0.3, 0.68], 0.75]
  };
  // time is where the light comes from: low out of the west for what is past,
  // from above for the present, out of the east for what is to come
  const LIGHTS = { past: [-0.96, 0.28], present: [-0.6, -0.8], future: [0.86, -0.5] };
  const SCALES = ['self', 'craft', 'community', 'industry', 'society'];
  // soft tags: a facet pulls the place towards the peak it is about
  const TOWARDS = [
    ['ai', 'agents', 'tooling', 1], ['ai', 'models', 'engineering', 1], ['ai', 'local', 'hardware', 1],
    ['ai', 'society', 'politics', 1], ['ai', 'community', 'community', 1], ['ai', 'writing', 'culture', 1],
    ['ai', 'risk', 'security', 1], ['ai', 'business', 'business', 1],
    ['scale', 'society', 'politics', 0.5], ['scale', 'community', 'community', 0.5], ['scale', 'self', 'life', 0.5],
    ['stance', 'teacher', 'tutorial', 0.5], ['actor', 'company', 'business', 0.5], ['time', 'past', 'history', 0.5]
  ];
  // the seasons, as lowland tints, and when in the year they are at their height
  const SEASONS = [[0.04, [0.74, 0.82, 0.9]], [0.29, [0.6, 0.8, 0.4]], [0.54, [0.48, 0.66, 0.26]], [0.79, [0.88, 0.6, 0.26]]];

  // What the facets make of a post.  Without them everything is neutral and
  // the picture is the one its tags alone give.
  function character(post) {
    const known = !!(post.facets && post.facets.known);
    const c = {
      known: known,
      zoom: 1,                      // scale: how close the strip is
      light: LIGHTS.present,        // time
      lit: [1, 1, 1], litAmount: 0, shade: [0.5, 0.5, 0.5], shadeAmount: 0,   // mood
      load: 1, grey: 0,             // valence: how much pigment, how clean
      tension: 0,                   // a fault through the place
      certainty: null,              // one firm line or a searched one
      technical: null,              // the survey's apparatus
      personal: 0.5,                // how much of the red pencil
      humor: 0,
      open: 0, resolved: 0, call: 0, practical: 0,    // ending
      stance: null, imagery: null,
      settle: 0, order: 0,          // actor: how many houses, how much in rank and file
      season: null, snow: 0
    };
    if (typeof post.season === 'number') {
      let total = 0;
      const tint = [0, 0, 0];
      SEASONS.forEach(function(season, i) {
        const w = Math.pow(Math.max(0, Math.cos((post.season - season[0]) * 2 * Math.PI)), 2);
        tint[0] += w * season[1][0]; tint[1] += w * season[1][1]; tint[2] += w * season[1][2];
        total += w;
        if (i === 0) c.snow = w;
      });
      if (total > 0) c.season = [tint[0] / total, tint[1] / total, tint[2] / total];
    }
    if (!known) return c;

    let weight = 0, level = 0;
    SCALES.forEach(function(label, i) { const w = post.share('scale', label); weight += w; level += w * i; });
    if (weight > 0) c.zoom = Math.exp(lerp(Math.log(1.65), Math.log(0.58), level / weight / 4));

    let lx = 0, ly = 0;
    Object.keys(LIGHTS).forEach(function(label) {
      const w = post.share('time', label);
      lx += w * LIGHTS[label][0]; ly += w * LIGHTS[label][1];
    });
    if (Math.hypot(lx, ly) > 0.05) c.light = [lx / Math.hypot(lx, ly), ly / Math.hypot(lx, ly)];

    const lit = [0, 0, 0], shade = [0, 0, 0];
    let litAmount = 0, shadeAmount = 0;
    weight = 0;
    Object.keys(MOODS).forEach(function(label) {
      const w = post.share('mood', label), mood = MOODS[label];
      weight += w;
      for (let k = 0; k < 3; k++) { lit[k] += w * mood[1] * mood[0][k]; shade[k] += w * mood[3] * mood[2][k]; }
      litAmount += w * mood[1]; shadeAmount += w * mood[3];
    });
    const valence = post.score('valence', 0.5);
    if (weight > 0) {
      if (litAmount > 0) c.lit = lit.map(function(v) { return v / litAmount; });
      if (shadeAmount > 0) c.shade = shade.map(function(v) { return v / shadeAmount; });
      c.litAmount = litAmount / weight * lerp(0.5, 1.3, valence);
      c.shadeAmount = shadeAmount / weight * lerp(1.25, 0.65, valence);
    }
    c.load = lerp(1.14, 0.84, valence);
    c.grey = 0.3 * (1 - smoothstep(0, 0.6, valence));

    c.tension = post.score('tension', 0);
    c.certainty = typeof post.facets.certainty === 'number' ? post.facets.certainty : null;
    c.technical = typeof post.facets.technical === 'number' ? post.facets.technical : null;
    c.personal = post.score('personal', 0.5);
    c.humor = post.score('humor', 0);
    ['open', 'resolved', 'call', 'practical'].forEach(function(label) { c[label] = post.share('ending', label); });
    c.stance = post.top('stance', 0.45);
    c.imagery = post.top('imagery', 0.6);
    if (c.imagery === 'none') c.imagery = null;
    c.settle = post.share('actor', 'individual') + 6 * post.share('actor', 'group') + 9 * post.share('actor', 'company')
      + 12 * post.share('actor', 'machine') + 5 * post.share('actor', 'state');
    c.order = clamp(post.share('actor', 'company') * 0.7 + post.share('actor', 'machine') + post.share('actor', 'state') * 0.6, 0, 1);
    return c;
  }

  function makePlan(post) {
    const map = theMap();
    const is = character(post);
    const peaks = map.peaks.slice();
    const rand = post.rng('atlas');
    const painted = [];
    let heaviest = 0;
    post.tags.forEach(function(tag) { heaviest = Math.max(heaviest, tag.weight); });
    post.tags.forEach(function(tag, i) {
      let peak = map.byName[tag.name];
      if (!peak) {
        // a tag the map does not know: a low, unsurveyed hill of its own
        peak = makePeak(tag, map.most);
        peak.unknown = true;
        peaks.push(peak);
      }
      const lead = i < 5;
      painted.push({
        peak: peak, tag: tag, lead: lead, role: tag.role,
        strength: lead ? 0.62 + 0.38 * (tag.weight / (heaviest || 1)) : 0.42
      });
    });
    // the map's own terrain is surveyed once; a post with unknown tags has its own
    if (!map.field) {
      map.field = terrain(map.peaks, map.ridges);
      map.peaks.forEach(function(peak) { climb(map.field, peak); });
    }
    let ground = map.field;
    if (peaks.length !== map.peaks.length) {
      ground = terrain(peaks, map.ridges);
      peaks.forEach(function(peak) { if (peak.unknown) climb(ground, peak); });
    }

    let place = map.centre.slice();
    let axis = (rand() - 0.5) * 0.5;
    if (painted.length) {
      let x = 0, y = 0, total = 0;
      painted.forEach(function(p) {
        const w = p.tag.weight || 1 / painted.length;
        x += p.peak.sx * w; y += p.peak.sy * w; total += w;
      });
      place = [x / total, y / total];
      if (painted.length > 1) {
        let sxx = 0, syy = 0, sxy = 0;
        painted.forEach(function(p) {
          const w = p.tag.weight || 1 / painted.length;
          const dx = p.peak.sx - place[0], dy = p.peak.sy - place[1];
          sxx += w * dx * dx; syy += w * dy * dy; sxy += w * dx * dy;
        });
        axis = 0.5 * Math.atan2(2 * sxy, sxx - syy) + (rand() - 0.5) * 0.3;
      }
    } else {
      rand();
    }
    // the slug moves the place a little, so that two posts with the same tags differ
    const nudge = painted.length > 1 ? 0.035 : 0;
    place[0] += (rand() - 0.5) * 2 * nudge;
    place[1] += (rand() - 0.5) * 2 * nudge;

    // ... and what the post is about moves it more: towards the peaks its
    // facets name, which also lend their pigment to that flank of its own
    const flanks = [];
    if (is.known && painted.length) {
      const own = {};
      painted.forEach(function(p) { own[p.peak.name] = p; });
      let px = 0, py = 0;
      const pulls = TOWARDS.map(function(row) { return [row[0], row[2], row[3] * post.share(row[0], row[1])]; });
      pulls.push(['', 'life', Math.max(0, is.personal - 0.55) * 1.2], ['', 'engineering', Math.max(0, post.score('technical', 0) - 0.55) * 1.2]);
      pulls.forEach(function(pull) {
        const to = map.byName[pull[1]];
        if (!to || own[pull[1]] || pull[2] < 0.05) return;
        const dx = to.sx - place[0], dy = to.sy - place[1], d = Math.hypot(dx, dy) || 1;
        px += pull[2] * dx / d; py += pull[2] * dy / d;
        // the kinds of `ai` post: a second pigment on the side of the `ai` peak that faces the other
        if (pull[0] === 'ai' && own.ai && pull[2] >= 0.3) flanks.push({ from: own.ai, to: to, share: pull[2] });
      });
      const pull = Math.hypot(px, py);
      if (pull > 0.01) {
        place[0] += px / pull * Math.min(1, pull) * 0.14;
        place[1] += py / pull * Math.min(1, pull) * 0.14;
      }
    }

    // tension is a fault: the ground has slipped along a line through the place
    let fault = null, field = ground;
    const slip = smoothstep(0.3, 1, is.tension) * 0.085;
    if (slip > 0.004 && painted.length) {
      const turn = axis + Math.PI / 2 + (rand() - 0.5) * 0.7;
      const ux = Math.cos(turn), uy = Math.sin(turn), half = 0.3 + 0.35 * is.tension;
      const fx = place[0] + Math.cos(axis) * 0.035, fy = place[1] + Math.sin(axis) * 0.035;
      const shift = function(x, y) {
        const rx = x - fx, ry = y - fy;
        const along = (rx * ux + ry * uy) / half;
        if (along <= -1 || along >= 1) return 0;
        const ease = 1 - along * along;
        return (ry * ux - rx * uy >= 0 ? 0.5 : -0.5) * slip * ease * ease;
      };
      fault = { x: fx, y: fy, ux: ux, uy: uy, half: half, slip: slip };
      field = function(x, y) {
        const k = shift(x, y);
        return ground(x + ux * k, y + uy * k);
      };
      fault.back = function(x, y) {
        const k = shift(x, y);
        return [x - ux * k, y - uy * k];
      };
    }
    // where a summit is on this post's sheet
    const spot = function(peak) { return fault ? fault.back(peak.sx, peak.sy) : [peak.sx, peak.sy]; };

    // the route: over the post's summits, by way of the place; from a single
    // peak (a tag's page) paths lead to the tags it shares most posts with
    const routes = [];
    let alone = false;      // one tag and nothing else to say: the place is the summit
    if (painted.length > 1) {
      const stops = walk(painted.map(function(p) { const at = spot(p.peak); return [at[0], at[1], true]; }));
      let at = 1, cost = Infinity;
      for (let i = 1; i < stops.length; i++) {
        const a = stops[i - 1], b = stops[i];
        const extra = Math.hypot(a[0] - place[0], a[1] - place[1]) + Math.hypot(b[0] - place[0], b[1] - place[1])
          - Math.hypot(a[0] - b[0], a[1] - b[1]);
        if (extra < cost) { cost = extra; at = i; }
      }
      stops.splice(at, 0, [place[0], place[1], false]);
      routes.push({ stops: stops, strong: true });
    } else if (painted.length === 1) {
      const top = spot(painted[0].peak);
      alone = Math.hypot(top[0] - place[0], top[1] - place[1]) < 0.02;
      if (!alone) routes.push({ stops: [[top[0], top[1], true], [place[0], place[1], false]], strong: true });
      (painted[0].tag.near || []).slice(0, alone ? 3 : 2).forEach(function(pair) {
        const other = map.byName[pair[0]];
        if (other) routes.push({ stops: [[top[0], top[1], true], spot(other).concat([true])], strong: false, to: other });
      });
    }

    // the shape of the text: where along it the headings stand (way-marks on the route)
    const cairns = [];
    let read = 0, length = 0;
    const weigh = function(block) {
      return block.t === 'p' || block.t === 'q' ? block.n : block.t === 'c' ? block.n * 6 : block.t === 'l' ? block.n * 12 : block.t === 'h' ? 0 : 25;
    };
    post.shape.forEach(function(block) { length += weigh(block); });
    post.shape.forEach(function(block) {
      if (block.t === 'h' && length > 0 && cairns.length < 16) cairns.push(read / length);
      read += weigh(block);
    });

    const index = !painted.length;
    return {
      map: map, post: post, peaks: peaks, painted: painted, index: index,
      field: field, place: place, routes: routes, cairns: cairns,
      is: is, flanks: flanks, fault: fault, spot: spot, alone: alone,
      headAngle: axis,
      footAngle: (rand() - 0.5) * 0.2,
      loose: index ? 0.45 : post.loose,
      energy: index ? 0.3 : post.energy,
      seed: post.seed % 100000
    };
  }

  function makeView(surface, plan) {
    const footer = surface.kind === 'footer';
    const h = surface.height;
    const centre = footer
      ? [lerp(plan.map.centre[0], plan.place[0], 0.5), lerp(DEPTH * 0.56, plan.place[1], 0.25)]
      : plan.place;
    const angle = footer ? plan.footAngle : plan.headAngle;
    return {
      cx: centre[0], cy: centre[1],
      scale: footer ? h * 0.7 * Math.pow(plan.is.zoom, 0.25) : h * 2.75 * plan.is.zoom,
      cos: Math.cos(angle), sin: Math.sin(angle),
      ay: footer ? h * 0.58 : h * 0.4
    };
  }
  // centred screen coordinates (relative to the middle of the band) <-> world
  function toScreen(view, wx, wy) {
    const dx = (wx - view.cx) * view.scale, dy = (wy - view.cy) * view.scale;
    return [dx * view.cos + dy * view.sin, -dx * view.sin + dy * view.cos];
  }

  // ---- contours ----------------------------------------------------------

  // Marching squares over grid values; calls line(points) for every chain,
  // points as [x0, y0, x1, y1, ...] in grid units.
  function contours(values, nx, ny, level, links, line) {
    const segA = [], segB = [];
    for (let j = 0; j < ny - 1; j++) {
      for (let i = 0; i < nx - 1; i++) {
        const k = j * nx + i;
        const code = (values[k] > level ? 8 : 0) | (values[k + 1] > level ? 4 : 0)
          | (values[k + nx + 1] > level ? 2 : 0) | (values[k + nx] > level ? 1 : 0);
        if (code === 0 || code === 15) continue;
        // the cell's edges: top, right, bottom, left
        const T = 2 * k, R = 2 * (k + 1) + 1, B = 2 * (k + nx), L = 2 * k + 1;
        switch (code) {
          case 1: case 14: segA.push(L); segB.push(B); break;
          case 2: case 13: segA.push(B); segB.push(R); break;
          case 3: case 12: segA.push(L); segB.push(R); break;
          case 4: case 11: segA.push(T); segB.push(R); break;
          case 6: case 9: segA.push(T); segB.push(B); break;
          case 7: case 8: segA.push(T); segB.push(L); break;
          case 5: segA.push(T); segB.push(L); segA.push(B); segB.push(R); break;
          case 10: segA.push(T); segB.push(R); segA.push(L); segB.push(B); break;
        }
      }
    }
    const count = segA.length;
    if (!count) return;
    for (let s = 0; s < count; s++) {
      links[segA[s] * 2] = -1; links[segA[s] * 2 + 1] = -1;
      links[segB[s] * 2] = -1; links[segB[s] * 2 + 1] = -1;
    }
    const attach = function(edge, s) {
      if (links[edge * 2] < 0) links[edge * 2] = s; else links[edge * 2 + 1] = s;
    };
    for (let s = 0; s < count; s++) { attach(segA[s], s); attach(segB[s], s); }
    const used = new Uint8Array(count);
    const point = function(edge, out) {
      const k = edge >> 1, i = k % nx, j = (k - i) / nx;
      if (edge & 1) {
        const a = values[k], b = values[k + nx];
        out.push(i, j + (level - a) / (b - a));
      } else {
        const a = values[k], b = values[k + 1];
        out.push(i + (level - a) / (b - a), j);
      }
    };
    const follow = function(start, edge, out) {
      let s = start;
      for (;;) {
        const a = links[edge * 2], b = links[edge * 2 + 1];
        const next = a === s ? b : a;
        if (next < 0 || used[next]) return;
        used[next] = 1;
        edge = segA[next] === edge ? segB[next] : segA[next];
        point(edge, out);
        s = next;
      }
    };
    for (let s = 0; s < count; s++) {
      if (used[s]) continue;
      used[s] = 1;
      const forward = [];
      point(segA[s], forward);
      point(segB[s], forward);
      follow(s, segB[s], forward);
      const backward = [];
      follow(s, segA[s], backward);
      let points = forward;
      if (backward.length) {
        points = [];
        for (let i = backward.length - 2; i >= 0; i -= 2) points.push(backward[i], backward[i + 1]);
        for (let i = 0; i < forward.length; i++) points.push(forward[i]);
      }
      if (points.length >= 6) line(points);
    }
  }

  // Chaikin corner cutting: takes the grid's facets out of a chain.
  function soften(points) {
    const n = points.length / 2;
    if (n < 3) return points;
    const closed = Math.abs(points[0] - points[2 * n - 2]) < 1e-6 && Math.abs(points[1] - points[2 * n - 1]) < 1e-6;
    const out = [];
    if (!closed) out.push(points[0], points[1]);
    for (let i = 0; i < n - 1; i++) {
      const ax = points[2 * i], ay = points[2 * i + 1], bx = points[2 * i + 2], by = points[2 * i + 3];
      out.push(ax * 0.75 + bx * 0.25, ay * 0.75 + by * 0.25, ax * 0.25 + bx * 0.75, ay * 0.25 + by * 0.75);
    }
    if (closed) out.push(out[0], out[1]);
    else out.push(points[2 * n - 2], points[2 * n - 1]);
    return out;
  }

  // Distance (in pixels) from the coast into the sea, on the grid.
  function offshore(values, nx, ny, g) {
    const FAR = 1e6, diagonal = g * Math.SQRT2;
    const d = new Float32Array(nx * ny);
    for (let j = 0; j < ny; j++) {
      for (let i = 0; i < nx; i++) {
        const k = j * nx + i, v = values[k];
        if (v > 0) { d[k] = 0; continue; }
        let best = FAR;
        if (i > 0 && values[k - 1] > 0) best = Math.min(best, g * v / (v - values[k - 1]));
        if (i < nx - 1 && values[k + 1] > 0) best = Math.min(best, g * v / (v - values[k + 1]));
        if (j > 0 && values[k - nx] > 0) best = Math.min(best, g * v / (v - values[k - nx]));
        if (j < ny - 1 && values[k + nx] > 0) best = Math.min(best, g * v / (v - values[k + nx]));
        d[k] = best;
      }
    }
    for (let j = 0; j < ny; j++) {
      for (let i = 0; i < nx; i++) {
        const k = j * nx + i;
        let v = d[k];
        if (i > 0) v = Math.min(v, d[k - 1] + g);
        if (j > 0) {
          v = Math.min(v, d[k - nx] + g);
          if (i > 0) v = Math.min(v, d[k - nx - 1] + diagonal);
          if (i < nx - 1) v = Math.min(v, d[k - nx + 1] + diagonal);
        }
        d[k] = v;
      }
    }
    for (let j = ny - 1; j >= 0; j--) {
      for (let i = nx - 1; i >= 0; i--) {
        const k = j * nx + i;
        let v = d[k];
        if (i < nx - 1) v = Math.min(v, d[k + 1] + g);
        if (j < ny - 1) {
          v = Math.min(v, d[k + nx] + g);
          if (i < nx - 1) v = Math.min(v, d[k + nx + 1] + diagonal);
          if (i > 0) v = Math.min(v, d[k + nx - 1] + diagonal);
        }
        d[k] = v;
      }
    }
    return d;
  }

  // ---- small things drawn by hand -----------------------------------------

  // Map symbols, as polylines in a box of about 14 pixels around the spot.
  const SYMBOLS = {
    summit: [[-4.2, 3.2, 0, -4.4, 4.2, 3.2, -4.6, 3.2]],
    spot: [[-1, 0, 0, -1, 1, 0, 0, 1, -1, 0]],
    survey: [[-4.5, 3.5, 0, -4.5, 4.5, 3.5, -4.5, 3.5], [-0.5, 1, 0.5, 1]],
    flask: [[-1.6, -6, -1.6, -1.8, -5, 5, 5, 5, 1.6, -1.8, 1.6, -6], [-2.8, -6.1, 2.8, -6.1], [-3.4, 1.8, 3.4, 1.8]],
    jinja: [[-3.4, -3.6, -3.9, 6], [3.4, -3.6, 3.9, 6], [-6.8, -6, -3.2, -4.8, 0, -4.5, 3.2, -4.8, 6.8, -6], [-5, -1.6, 5, -1.6]],
    django: [[0, -7.5, 0, 3], [-3, -4, 3, -4], [-6.5, 5.2, -3, 3.4, 0, 2.8, 3, 3.4, 6.5, 5.2]],
    sentry: [[-4, 5, -4, -0.5, 4, -0.5, 4, 5, -4, 5], [-5.6, -0.3, 0, -5.6, 5.6, -0.3], [-0.9, 5, -0.9, 2, 0.9, 2, 0.9, 5]],
    pi: [(function() {
      const ring = [];
      for (let a = 0.5; a <= 5.9; a += 0.3) ring.push(Math.cos(a) * 4.6, Math.sin(a) * 4.6);
      return ring;
    })(), [-0.5, 0, 0.5, 0]],
    earendil: [[0, -7.5, 1.4, -1.4, 7.5, 0, 1.4, 1.4, 0, 7.5, -1.4, 1.4, -7.5, 0, -1.4, -1.4, 0, -7.5]]
  };

  const FONT_NAME = 'italic 500 12px Lora, Georgia, serif';
  const FONT_SMALL = 'italic 400 10px Lora, Georgia, serif';
  const FONT_RANGE = '500 9px Lora, Georgia, serif';
  const FONT_NUMBER = '400 8.5px Lora, Georgia, serif';

  // ---- the variant -------------------------------------------------------

  const DURATION = 2.6;

  LucumrArt.register('atlas', {
    title: 'Atlas',
    create: function(env) {
      let plan = null;        // the post, as a place on the map
      let tooth = null;       // paper grain
      let alive = true;
      const states = env.surfaces.map(function(surface) {
        return {
          surface: surface, ctx: surface.canvas.getContext('2d'),
          dirty: true, built: null, time: 0, visible: null, shown: false, done: false,
          pencil: null, scratch: null, drawn: 0, old: null, began: null, fresh: true
        };
      });

      const watcher = new IntersectionObserver(function(entries) {
        entries.forEach(function(entry) {
          const st = states.find(function(s) { return s.surface.el === entry.target; });
          if (!st) return;
          st.visible = entry.isIntersecting;
          if (st.visible) env.invalidate();
        });
      }, { threshold: 0 });
      states.forEach(function(st) { watcher.observe(st.surface.el); });
      // whether a band is on screen: the observer knows, and before its first
      // report (which comes after the first frame) the layout does
      function inSight(st) {
        if (st.visible !== null) return st.visible;
        const box = st.surface.el.getBoundingClientRect();
        return box.bottom > 0 && box.top < (window.innerHeight || document.documentElement.clientHeight);
      }

      // the labels are set in the blog's own Lora; draw again once it is there
      if (document.fonts && document.fonts.load && !document.fonts.check(FONT_NAME)) {
        Promise.all([FONT_NAME, FONT_SMALL, FONT_RANGE].map(function(f) { return document.fonts.load(f); })).then(function() {
          if (!alive) return;
          states.forEach(function(st) { st.dirty = true; });
          env.invalidate();
        }, function() {});
      }

      function colours() {
        const pal = env.palette(), dark = env.dark;
        return {
          dark: dark, paper: pal.paper,
          graphite: dark ? mix(pal.ink, pal.header, 0.25) : [0.27, 0.29, 0.33],
          letter: dark ? pal.ink : [0.2, 0.22, 0.27],
          water: dark ? mix(pal.primary, pal.ink, 0.35) : mix(pal.primary, [0.3, 0.4, 0.5], 0.3),
          sea: dark ? mix(pal.primary, pal.paper, 0.2) : pal.primary,
          deep: pal.header,
          red: pal.secondary
        };
      }

      // what a tag's pigment looks like in the medium of the theme
      function pigment(rgb, col) {
        if (!col.dark) return rgb;
        // chalk on navy: the same hue, lifted until it stands out from the paper
        const hi = Math.max(rgb[0], rgb[1], rgb[2]), lo = Math.min(rgb[0], rgb[1], rgb[2]);
        const light = (hi + lo) / 2, spread = hi - lo;
        let hue = 0;
        if (spread > 1e-6) {
          hue = hi === rgb[0] ? ((rgb[1] - rgb[2]) / spread + 6) % 6 : hi === rgb[1] ? (rgb[2] - rgb[0]) / spread + 2 : (rgb[0] - rgb[1]) / spread + 4;
        }
        const sat = spread > 1e-6 ? spread / (1 - Math.abs(2 * light - 1)) : 0;
        return U.hsl(hue / 6, clamp(sat * 1.05, 0, 0.85), clamp(light * 0.5 + 0.42, 0.62, 0.78));
      }
      // ... and as a coloured pencil or ink line
      function line(rgb, col) {
        if (col.dark) return pigment(rgb, col);
        const luma = 0.3 * rgb[0] + 0.59 * rgb[1] + 0.11 * rgb[2];
        return mix(rgb, [0.1, 0.1, 0.12], clamp(0.15 + (luma - 0.3) * 0.6, 0.1, 0.5));
      }

      function makeTooth() {
        const size = 256;
        const canvas = document.createElement('canvas');
        canvas.width = canvas.height = size;
        const ctx = canvas.getContext('2d');
        const image = ctx.createImageData(size, size);
        const rand = U.rng('atlas-tooth');
        for (let i = 0; i < size * size; i++) {
          const v = rand();
          image.data[i * 4 + 3] = v > 0.5 ? Math.round((v - 0.5) / 0.5 * 255) : 0;
        }
        ctx.putImageData(image, 0, 0);
        return canvas;
      }

      // ---- building one band ----
      function build(st) {
        const surface = st.surface, W = surface.width, H = surface.height;
        const footer = surface.kind === 'footer';
        const col = colours();
        const view = makeView(surface, plan);
        const loose = plan.loose, energy = plan.energy, seed = plan.seed;
        const half = W / 2;

        // how much of the picture is left at a point: it dissolves towards the page
        // (the ending decides how: an open one trails off long and ragged, a
        // resolved one stops late and cleanly)
        const is = plan.is;
        const torn = H * 0.07 * (1 + 2 * is.open) * (1 - 0.6 * is.resolved), frayed = H * 0.07 * is.open;
        const reachIn = 0.13 * is.open - 0.1 * is.resolved;
        const fadeNoise = function(x, y) {
          return noise2(x / 90, y / 60, seed + 5) * torn + (frayed ? noise2(x / 19, y / 15, seed + 6) * frayed : 0);
        };
        const fadeAt = footer
          ? function(x, y, late) {
            y += view.ay;
            return smoothstep(H * (0.03 - late), H * (0.34 + reachIn - late), y + fadeNoise(x, y)) * smoothstep(0, H * 0.12, y);
          }
          : function(x, y, late) {
            y += view.ay;
            return (1 - smoothstep(H * (0.5 - reachIn + late), H * (0.97 + late), y + fadeNoise(x, y))) * smoothstep(H, H * 0.86, y);
          };

        // the height field on a grid, in centred coordinates (with a margin,
        // so that a coast just outside still throws its water lines in)
        const g = 3, margin = 10;
        const i0 = -Math.ceil(half / g) - margin, i1 = Math.ceil(half / g) + margin;
        const j0 = Math.floor(-view.ay / g) - margin, j1 = Math.ceil((H - view.ay) / g) + margin;
        const nx = i1 - i0 + 1, ny = j1 - j0 + 1;
        const values = new Float32Array(nx * ny);
        for (let j = 0; j < ny; j++) {
          for (let i = 0; i < nx; i++) {
            const x = (i + i0) * g, y = (j + j0) * g;
            values[j * nx + i] = plan.field(
              view.cx + (x * view.cos - y * view.sin) / view.scale,
              view.cy + (x * view.sin + y * view.cos) / view.scale);
          }
        }
        const depth = offshore(values, nx, ny, g);
        const sampler = function(grid) {
          return function(x, y) {
            const fx = clamp(x / g - i0, 0, nx - 1.001), fy = clamp(y / g - j0, 0, ny - 1.001);
            const i = Math.floor(fx), j = Math.floor(fy), tx = fx - i, ty = fy - j, k = j * nx + i;
            return (grid[k] * (1 - tx) + grid[k + 1] * tx) * (1 - ty) + (grid[k + nx] * (1 - tx) + grid[k + nx + 1] * tx) * ty;
          };
        };
        const sample = sampler(values), sampleDepth = sampler(depth);

        // the post's peaks on this band
        const marks = plan.painted.map(function(p) {
          const here = plan.spot(p.peak);
          const at = toScreen(view, here[0], here[1]);
          const reach = (p.role === 'register' ? 2.8 : p.role === 'project' ? 1.8 : 2.9) * p.peak.r * view.scale;
          // a bleak post is painted heavier and duller, a joyful one lighter and cleaner
          const luma = 0.3 * p.tag.rgb[0] + 0.59 * p.tag.rgb[1] + 0.11 * p.tag.rgb[2];
          const rgb = mix(p.tag.rgb, [luma, luma, luma], is.grey);
          return { p: p, x: at[0], y: at[1], reach: reach, rgb: pigment(rgb, col), line: line(rgb, col), strength: p.strength * is.load, top: p.peak.top, role: p.role };
        });
        // a second pigment on the flank of a peak (the kinds of `ai` post)
        const flanks = plan.flanks.map(function(flank) {
          const from = plan.spot(flank.from.peak), to = plan.spot(flank.to);
          const d = Math.hypot(to[0] - from[0], to[1] - from[1]) || 1, out = flank.from.peak.r * 1.25;
          const at = toScreen(view, from[0] + (to[0] - from[0]) / d * out, from[1] + (to[1] - from[1]) / d * out);
          return {
            p: { tag: { order: 20 + flank.to.count, name: flank.to.name } }, x: at[0], y: at[1], reach: flank.from.peak.r * 1.45 * view.scale,
            rgb: pigment(flank.to.tag.rgb, col), strength: (0.5 + 0.5 * flank.share) * is.load, top: flank.from.peak.top, role: 'flank'
          };
        });
        const washes = marks.concat(flanks);
        // how strongly a point belongs to the post, and to which of its tags
        const belong = { v: 0, mark: null };
        const belonging = function(x, y) {
          belong.v = 0; belong.mark = null;
          for (let i = 0; i < marks.length; i++) {
            const m = marks[i];
            const d = Math.hypot(x - m.x, y - m.y) / m.reach;
            if (d > 1.2) continue;
            const v = m.strength * (1 - smoothstep(0.45, 1.2, d));
            if (v > belong.v) { belong.v = v; belong.mark = m; }
          }
          return belong;
        };

        // ---- pencil ----
        const strokes = [];
        const interval = (footer ? 24 : 26) / view.scale * (1.2 - 0.35 * energy);
        const wobble = 0.3 + 1.5 * loose;
        const base = col.dark ? 0.34 : 0.4;

        // certainty: an assertive post gets one firm line, a searching one is gone over again and again
        const sure = is.certainty;
        const passes = sure === null ? 1 : sure < 0.3 ? 3 : sure < 0.62 ? 2 : 1;
        const firm = sure === null ? 1 : lerp(0.85, 1.25, sure);
        const light = is.light;
        const pencil = function(points, kind, levelIndex, pass) {
          // points: centred coordinates.  kind: 0 contour, 1 index contour, 2 coast,
          // 3 water line, 4 graticule, 5 fault, 6 triangulation
          pass = pass || 0;
          const n = points.length / 2;
          const lineSeed = seed + levelIndex * 13 + kind * 101 + pass * 977;
          const again = pass ? 0.55 : 1 / Math.pow(passes, 0.35);
          let run = null, runLength = 0, px = 0, py = 0;
          const flush = function() {
            if (run && run.length >= 4) {
              const mid = Math.floor(run.length / 4) * 2;
              const mx = run[mid], my = run[mid + 1];
              const own = belonging(mx, my);
              const fade = fadeAt(mx, my, kind === 3 ? -0.05 : 0.05);
              const pressure = 0.7 + 0.3 * noise2(mx / 47, my / 47, lineSeed + 3);
              let alpha, rgb, width;
              if (kind === 3) {
                alpha = base * (0.8 - 0.14 * (-levelIndex)); rgb = col.water; width = 0.7;
              } else if (kind === 4) {
                alpha = base * (is.technical === null ? 0.16 + 0.42 * (1 - loose) : 0.08 + 0.7 * is.technical) * (1 - 0.7 * own.v);
                rgb = col.graphite; width = 0.6;
              } else if (kind === 5) {
                alpha = base * 2.1; rgb = mix(col.graphite, col.dark ? [1, 0.72, 0.62] : [0.42, 0.14, 0.1], 0.6); width = 1.3;
              } else if (kind === 6) {
                alpha = base * 1.5 * smoothstep(0.45, 0.9, is.technical); rgb = col.graphite; width = 0.6;
              } else if (plan.index) {
                alpha = base * (kind === 0 ? 0.75 : 1.25); rgb = mix(col.water, col.deep, 0.3); width = kind === 0 ? 0.75 : 0.95;
              } else {
                const v = own.v;
                alpha = base * (kind === 0 ? 0.66 : 1.0) * (1 + v * (1.1 + energy)) * firm * again;
                rgb = own.mark ? mix(col.graphite, own.mark.line, clamp(v * 1.1, 0, 0.85)) : col.graphite;
                width = (kind === 0 ? 0.75 : 1.0) + v * 0.25;
              }
              alpha *= fade * pressure;
              if (alpha > 0.015) {
                strokes.push({ p: run, a: Math.min(0.95, alpha), w: width, rgb: rgb, order: Math.hypot(mx, my * 2.5) });
              }
            }
            run = null; runLength = 0;
          };
          const gapAt = kind === 3 ? 0.34 + 0.09 * levelIndex : kind === 2 ? 0.66 : kind === 4 || kind === 6 ? 0.6 : kind === 5 ? 0.8
            : 0.52 - 0.1 * loose + (sure === null ? 0 : 0.16 * (sure - 0.5)) - 0.12 * pass;
          const shake = kind === 4 || kind === 6 ? 0 : (wobble * (sure === null || kind > 2 ? 1 : lerp(1.5, 0.7, sure)) + pass * 1.3);
          for (let i = 0; i < n; i++) {
            let x = points[2 * i], y = points[2 * i + 1];
            if (x < -half - 20 || x > half + 20 || y < -view.ay - 20 || y > H - view.ay + 20) { flush(); continue; }
            // the hand lifts off now and then
            const lift = noise2(x / 23 + levelIndex * 7.3, y / 23, lineSeed);
            if (lift > gapAt) { flush(); continue; }
            const ox = x, oy = y;
            x += shake * noise2(ox / 31, oy / 31, lineSeed + 1) + 0.3 * shake * noise2(ox / 7, oy / 7, lineSeed + 4);
            y += shake * noise2(ox / 31, oy / 31, lineSeed + 2) + 0.3 * shake * noise2(ox / 7, oy / 7, lineSeed + 5);
            if (!run) { run = [x, y]; px = x; py = y; continue; }
            run.push(x, y);
            runLength += Math.hypot(x - px, y - py);
            px = x; py = y;
            if (runLength > 22) { const lx = x, ly = y; flush(); run = [lx, ly]; px = lx; py = ly; }
          }
          flush();
        };

        const links = new Int32Array(nx * ny * 4);
        const emit = function(kind, levelIndex) {
          return function(points) {
            points = soften(points);
            for (let i = 0; i < points.length; i += 2) {
              points[i] = (points[i] + i0) * g;
              points[i + 1] = (points[i + 1] + j0) * g;
            }
            for (let pass = 0; pass < (kind < 3 ? passes : 1); pass++) pencil(points, kind, levelIndex, pass);
          };
        };
        let top = -1;
        for (let i = 0; i < values.length; i++) if (values[i] > top) top = values[i];
        for (let k = 1; k * interval < top; k++) {
          contours(values, nx, ny, k * interval, links, emit(k % 5 === 0 ? 1 : 0, k));
        }
        contours(values, nx, ny, 0.0005, links, emit(2, 0));
        [4, 9.5, 17, 27].forEach(function(level, i) {
          contours(depth, nx, ny, level, links, emit(3, -1 - i));
        });

        // the fault: a heavy line where the ground slipped, ticks on the side that went down
        if (plan.fault) {
          const f = plan.fault, points = [];
          const a = toScreen(view, f.x - f.ux * f.half, f.y - f.uy * f.half), b = toScreen(view, f.x + f.ux * f.half, f.y + f.uy * f.half);
          const length = Math.hypot(b[0] - a[0], b[1] - a[1]), dx = (b[0] - a[0]) / length, dy = (b[1] - a[1]) / length;
          for (let d = length * 0.06; d <= length * 0.94; d += 3) {
            const bend = 14 * noise2(d / 90, 0.5, seed + 71) + 4 * noise2(d / 17, 0.5, seed + 73);
            points.push(a[0] + dx * d - dy * bend, a[1] + dy * d + dx * bend);
          }
          pencil(points, 5, 900);
          for (let i = 8; i < points.length - 8; i += 12) {
            const x = points[i], y = points[i + 1], t = i / points.length;
            const fade = fadeAt(x, y, 0.05) * (1 - Math.pow(2 * t - 1, 4));
            if (fade < 0.05 || Math.abs(x) > half + 10) continue;
            const reach = 4.5 + 2 * noise2(x / 5, y / 5, seed + 72);
            strokes.push({
              p: [x, y, x - dy * reach + dx * 1.5, y + dx * reach + dy * 1.5], a: Math.min(0.9, base * 1.9 * fade), w: 1,
              rgb: mix(col.graphite, col.dark ? [1, 0.72, 0.62] : [0.42, 0.14, 0.1], 0.6), order: Math.hypot(x, y * 2.5) + 30
            });
          }
        }

        // a technical post is triangulated: ruled sight lines between the summits around it
        if (is.technical !== null && is.technical > 0.5 && !plan.index) {
          const stations = plan.peaks.map(function(peak) { const at = plan.spot(peak); return toScreen(view, at[0], at[1]); });
          const seen = {};
          marks.forEach(function(m) {
            const nearest = stations.map(function(at, i) { return [Math.hypot(at[0] - m.x, at[1] - m.y), i]; })
              .filter(function(pair) { return pair[0] > 4 && pair[0] < view.scale * 0.75; })
              .sort(function(p, q) { return p[0] - q[0]; }).slice(0, 4);
            nearest.forEach(function(pair) {
              const to = stations[pair[1]], key = Math.round(m.x + to[0]) + ':' + Math.round(m.y + to[1]);
              if (seen[key]) return;
              seen[key] = true;
              const points = [];
              for (let d = 9; d <= pair[0] - 6; d += 4) points.push(m.x + (to[0] - m.x) * d / pair[0], m.y + (to[1] - m.y) * d / pair[0]);
              if (points.length >= 4) pencil(points, 6, 600 + pair[1]);
            });
          });
        }

        // the graticule: ruled lines of the survey, plainer the tighter the hand
        (function() {
          const every = 0.25;
          const reachX = half + 30, upper = -view.ay - 10, lower = H - view.ay + 10;
          const span = (reachX + H) / view.scale + every;
          const rule = function(ax, ay, bx, by, id) {
            const a = toScreen(view, ax, ay), b = toScreen(view, bx, by);
            const length = Math.hypot(b[0] - a[0], b[1] - a[1]);
            const points = [];
            for (let d = 0; d <= length; d += 4) {
              const x = a[0] + (b[0] - a[0]) * d / length, y = a[1] + (b[1] - a[1]) * d / length;
              if (x < -reachX || x > reachX || y < upper || y > lower) continue;
              points.push(x, y);
            }
            if (points.length >= 4) pencil(points, 4, id);
          };
          const kx0 = Math.floor((view.cx - span) / every), kx1 = Math.ceil((view.cx + span) / every);
          const ky0 = Math.floor((view.cy - span) / every), ky1 = Math.ceil((view.cy + span) / every);
          for (let k = kx0; k <= kx1; k++) rule(k * every, view.cy - span, k * every, view.cy + span, 200 + k);
          for (let k = ky0; k <= ky1; k++) rule(view.cx - span, k * every, view.cx + span, k * every, 400 + k);
        })();

        // hatching on the steep sides of the post's summits that face away from the light
        marks.forEach(function(m) {
          if (m.p.role !== 'subject' || !m.p.lead) return;
          const cell = 6.5 - 1.5 * energy;
          const c0 = Math.floor((m.x - m.reach) / cell), c1 = Math.ceil((m.x + m.reach) / cell);
          const r0 = Math.floor((m.y - m.reach) / cell), r1 = Math.ceil((m.y + m.reach) / cell);
          for (let r = r0; r <= r1; r++) {
            for (let c = c0; c <= c1; c++) {
              const x = (c + 0.5 + 0.45 * noise2(c * 1.7, r * 1.7, seed + 61)) * cell;
              const y = (r + 0.5 + 0.45 * noise2(c * 1.7, r * 1.7, seed + 62)) * cell;
              if (Math.abs(x) > half + 10) continue;
              const d = Math.hypot(x - m.x, y - m.y) / m.reach;
              if (d > 0.8) continue;
              const gx = (sample(x + 2, y) - sample(x - 2, y)) / 4, gy = (sample(x, y + 2) - sample(x, y - 2)) / 4;
              const steep = Math.hypot(gx, gy) * view.scale;
              if (steep < 1.5) continue;
              // downhill, and how much of it points away from the light (top left)
              const ux = -gx / (steep / view.scale), uy = -gy / (steep / view.scale);
              const shade = -ux * light[0] - uy * light[1];
              if (shade < 0.25) continue;
              const fade = fadeAt(x, y, 0);
              const alpha = base * 1.5 * m.strength * smoothstep(1.5, 4, steep) * smoothstep(0.25, 0.8, shade) * (1 - smoothstep(0.5, 0.8, d)) * fade
                * (0.6 + 0.4 * noise2(x / 5, y / 5, seed + 63)) * (0.8 + 0.6 * energy);
              if (alpha < 0.02) continue;
              const length = (3 + 4 * smoothstep(1.5, 5, steep)) * (0.8 + 0.3 * noise2(x / 3, y / 3, seed + 64));
              const bend = 0.6 * loose * noise2(x / 11, y / 11, seed + 65);
              strokes.push({
                p: [x, y, x + ux * length * 0.5 - uy * bend, y + uy * length * 0.5 + ux * bend, x + ux * length, y + uy * length],
                a: Math.min(0.8, alpha), w: 0.65, rgb: mix(col.graphite, m.line, 0.7), order: Math.hypot(x, y * 2.5) + 60
              });
            }
          }
        });
        strokes.sort(function(a, b) { return a.order - b.order; });

        // ---- wash ----
        const q = 1.5;
        const rx0 = -Math.ceil(half / q), ry0 = -Math.ceil(view.ay / q);
        const rw = -rx0 * 2, rh = Math.ceil((H - view.ay) / q) - ry0;
        const acc = new Float32Array(rw * rh * 3);
        const wet = clamp(loose * 1.15 - 0.08, 0, 1);
        const brush = 1 + 6 * wet;
        const soft = 0.8 + 1.6 * wet;
        const rim = 0.25 + 0.5 * (1 - wet);
        if (col.dark) {
          for (let i = 0; i < rw * rh; i++) {
            acc[i * 3] = col.paper[0]; acc[i * 3 + 1] = col.paper[1]; acc[i * 3 + 2] = col.paper[2];
          }
        }
        const density = function(rgb) {
          const k = [-Math.log(Math.max(0.05, rgb[0])), -Math.log(Math.max(0.05, rgb[1])), -Math.log(Math.max(0.05, rgb[2]))];
          const mean = (k[0] + k[1] + k[2]) / 3;
          const scale = 1 / Math.pow(Math.max(0.85, mean), 0.55);
          return [k[0] * scale, k[1] * scale, k[2] * scale];
        };
        // one glaze: amount(x, y, bx, by) says how much paint lies at a point
        // (bx, by: where the brush thinks it is)
        // (a negative amount lays `other` instead; what every glaze needs at a
        // point is worked out once and kept: the fade, the brush's error, the grain)
        const kept = new Float32Array(rw * rh * 4).fill(-9);
        let cell = 0;       // the point a glaze is at
        const glaze = function(rgb, x0, y0, x1, y1, amount, idle, other) {
          const k = density(rgb), k2 = other ? density(other) : k;
          const X0 = Math.max(0, Math.floor(x0 / q) - rx0), X1 = Math.min(rw, Math.ceil(x1 / q) - rx0);
          const Y0 = Math.max(0, Math.floor(y0 / q) - ry0), Y1 = Math.min(rh, Math.ceil(y1 / q) - ry0);
          for (let Y = Y0; Y < Y1; Y++) {
            for (let X = X0; X < X1; X++) {
              const x = (X + rx0 + 0.5) * q, y = (Y + ry0 + 0.5) * q;
              if (idle && idle(x, y)) continue;
              const c = (Y * rw + X) * 4;
              if (kept[c] === -9) {
                kept[c] = fadeAt(x, y, 0);
                if (kept[c] > 0.003) {
                  kept[c + 1] = brush * noise2(x / 61, y / 61, seed + 21);
                  kept[c + 2] = brush * noise2(x / 61, y / 61, seed + 22);
                  // pigment settles unevenly
                  kept[c + 3] = 1 + 0.2 * noise2(x / 37, y / 29, seed + 23) + 0.14 * noise2(x / 6.1, y / 6.1, seed + 24)
                    + 0.07 * noise2(x / 1.3, y / 1.3, seed + 27);
                }
              }
              const fade = kept[c];
              if (fade <= 0.003) continue;
              cell = c >> 2;
              let a = amount(x, y, x + kept[c + 1], y + kept[c + 2]);
              const paint = a < 0 ? other : rgb, weight = a < 0 ? k2 : k;
              if (a < 0) a = -a;
              if (a <= 0.002) continue;
              a *= fade * kept[c + 3];
              const o = (Y * rw + X) * 3;
              if (col.dark) {
                // chalk: opaque, and it skips the pits of the paper
                const pit = 0.5 + 0.5 * smoothstep(-0.45, 0.35, noise2(x / 1.6, y / 1.6, seed + 25) + 0.5 * noise2(x / 8, y / 8, seed + 26));
                const t = clamp(a * 0.95 * pit, 0, 0.92);
                acc[o] += (paint[0] - acc[o]) * t; acc[o + 1] += (paint[1] - acc[o + 1]) * t; acc[o + 2] += (paint[2] - acc[o + 2]) * t;
              } else {
                acc[o] += a * weight[0]; acc[o + 1] += a * weight[1]; acc[o + 2] += a * weight[2];
              }
            }
          }
        };
        // paint up to an edge (distance > 0 is inside): the pigment pools just
        // inside it, and a wet hand lets some run out over it
        const edge = function(distance, loosely) {
          const s = loosely ? soft * 3.5 : soft, r = loosely ? rim * 0.4 : rim;
          if (distance < 0) {
            return distance > -s * 6 ? 0.5 * smoothstep(-s, 0, distance) * (1 + r) + wet * 0.2 * Math.exp(distance / (2.5 + 5 * wet)) : 0;
          }
          return (0.5 + 0.5 * smoothstep(0, s, distance)) * (1 + r * Math.exp(-distance / 2.6));
        };
        const slopeAt = function(x, y) {
          return Math.hypot(sample(x + 2, y) - sample(x - 2, y), sample(x, y + 2) - sample(x, y - 2)) / 4 + 2e-5;
        };
        // (height and slope under the brush, kept per point as well: several glazes ask)
        const heights = new Float32Array(rw * rh).fill(NaN), slopes = new Float32Array(rw * rh).fill(NaN);
        const heightHere = function(bx, by) {
          if (heights[cell] !== heights[cell]) heights[cell] = sample(bx, by);
          return heights[cell];
        };
        const slopeHere = function(bx, by) {
          if (slopes[cell] !== slopes[cell]) slopes[cell] = slopeAt(bx, by);
          return slopes[cell];
        };

        // the layers of one wash never sit exactly on top of each other
        const slip = function(x, y, layer) { return (0.8 + 3 * wet) * noise2(x / 47 + layer * 5.3, y / 47, seed + 35); };

        // the sea: a pale tint that hugs the coast
        const seaStrength = plan.index ? 0.3 : 0.11;
        const seaReach = footer ? 44 : 56;
        glaze(col.sea, -half, -view.ay, half, H - view.ay, function(x, y, bx, by) {
          const h = heightHere(bx, by);
          if (h > 0.02) return 0;
          const d = sampleDepth(bx, by);
          const reach = seaReach * (1 + 0.35 * noise2(x / 53, y / 53, seed + 41));
          if (d > reach) return 0;
          const t = d / reach;
          return seaStrength * edge(-h / slopeHere(bx, by)) * (0.25 + 0.75 * (1 - t) * (1 - t)) * smoothstep(1, 0.8, t);
        }, function(x, y) {
          const d = sampleDepth(x, y);
          return d > seaReach * 1.35 + brush + 3 || (d <= 0 && sample(x, y) > 0.06);
        });
        if (plan.index) {
          // no post: the whole island in the blog's blues, darker with height
          [[col.sea, [[0.2, 0.07], [0.38, 0.09]]], [col.deep, [[0.58, 0.1], [0.8, 0.12]]]].forEach(function(wash, w) {
            const steps = wash[1];
            glaze(wash[0], -half, -view.ay, half, H - view.ay, function(x, y, bx, by) {
              const h = heightHere(bx, by);
              if (h < steps[0][0] - 0.06) return 0;
              const slope = slopeHere(bx, by);
              let a = 0;
              for (let s = 0; s < steps.length; s++) a += steps[s][1] * edge((h - steps[s][0]) / slope + slip(x, y, w * 2 + s));
              return a;
            }, function(x, y) { return sample(x, y) < steps[0][0] - 0.1; });
          });
        }
        const floor = (LAND - SEA) * 0.6;
        // the season of the post lies on the lowland: fresh green, summer's green, autumn's ochre, a winter grey
        if (is.season && !plan.index) {
          const tint = col.dark ? pigment(is.season, col) : is.season;
          glaze(tint, -half, -view.ay, half, H - view.ay, function(x, y, bx, by) {
            const h = heightHere(bx, by);
            if (h < -0.01 || h > 0.4) return 0;
            const patch = 0.62 + 0.38 * noise2(x / 83, y / 67, seed + 43);
            return (col.dark ? 0.17 : 0.14) * patch * (h > 0.05 ? 1 : edge(h / slopeHere(bx, by))) * (1 - smoothstep(0.2, 0.38, h));
          }, function(x, y) { const h = sample(x, y); return h < -0.03 || h > 0.42; });
        }
        washes.forEach(function(m, mine) {
          const role = m.role;
          const steps = role === 'register' ? [[0.12, 0.3], [0.45, 0.18]]
            : role === 'project' ? [[0.4, 0.42], [0.68, 0.3]]
            : role === 'flank' ? [[0.2, 0.34], [0.5, 0.24]]
            : [[0.27, 0.2], [0.44, 0.18], [0.62, 0.2], [0.8, 0.22]];
          // pigments that are at odds do not run into each other: tension leaves paper between them
          const blend = (2 + 13 * wet + (role === 'register' ? 6 : 0)) * (1 - 0.75 * is.tension);
          const gap = 2.5 * (1 - wet) + 6 * is.tension;
          // in winter the tops are left white
          const snowLine = role === 'subject' && is.snow > 0.15 ? floor + (m.top - floor) * 0.8 : 0;
          const own = seed + 31 + m.p.tag.order * 7;
          const ragged = role === 'register' ? 0.42 : 0.2;
          const span = m.reach * (1.12 + ragged * 1.45);
          // a wet hand leaves blooms: water running back into paint that had begun to dry
          const blooms = [];
          if (wet > 0.5 && role !== 'project') {
            const rand = plan.post.rng('bloom:' + m.p.tag.name);
            for (let i = 0, n = 1 + Math.floor(rand() * 2.2); i < n; i++) {
              const turn = rand() * 6.283, out = (0.25 + 0.4 * rand()) * m.reach;
              blooms.push([m.x + Math.cos(turn) * out, m.y + Math.sin(turn) * out, (0.1 + 0.12 * rand()) * m.reach]);
            }
          }
          glaze(m.rgb, m.x - span, m.y - span, m.x + span, m.y + span, function(x, y, bx, by) {
            const far = Math.hypot(bx - m.x, by - m.y);
            const lobes = m.reach * (1 + ragged * noise2(x / 47, y / 47, own) + ragged * 0.4 * noise2(x / 17, y / 17, own + 1));
            if (lobes - far < -30) return 0;
            // where two of the post's peaks meet, each keeps to its side
            let rival = 9, side = 1;
            for (let i = 0; i < washes.length; i++) {
              const o = washes[i];
              if (o === m) continue;
              const n = Math.hypot(bx - o.x, by - o.y) / o.reach;
              if (n < rival) { rival = n; side = i < mine ? 1 : -1; }
            }
            const share = smoothstep(-blend, blend, (rival - far / m.reach) * m.reach * 0.5 - gap
              + side * (14 * noise2(x / 41, y / 41, seed + 33) + 4 * noise2(x / 11, y / 11, seed + 34)));
            if (share <= 0) return 0;
            const h = heightHere(bx, by), slope = slopeHere(bx, by);
            let a = 0;
            for (let s = 0; s < steps.length; s++) {
              const level = floor + (m.top - floor) * steps[s][0];
              const move = slip(x, y, s + mine * 4);
              a += steps[s][1] * edge(Math.min(lobes * (1 - 0.1 * s) - far + move * 2, (h - level) / slope + move), role === 'register');
            }
            for (let i = 0; i < blooms.length; i++) {
              const b = blooms[i];
              const d = Math.hypot(x - b[0], y - b[1]) - b[2] * (1 + 0.28 * noise2(x / 8, y / 8, own + 5 + i) + 0.2 * noise2(x / 23, y / 23, own + 9 + i));
              if (d < 6) a *= (d < 0 ? 0.74 : 1) + 0.42 * Math.exp(-d * d / 4);
            }
            if (snowLine) a *= 1 - 0.88 * is.snow * clamp(edge((h - snowLine) / slope + slip(x, y, 9)), 0, 1) * (1 - smoothstep(0.28, 0.5, far / m.reach));
            return m.strength * share * a;
          });
          if (snowLine && col.dark) {
            // (on blue paper snow is white chalk)
            glaze([0.95, 0.97, 1], m.x - m.reach, m.y - m.reach, m.x + m.reach, m.y + m.reach, function(x, y, bx, by) {
              const far = Math.hypot(bx - m.x, by - m.y) / m.reach;
              if (far > 0.5) return 0;
              return 0.45 * (1 - smoothstep(0.28, 0.5, far)) * is.snow * clamp(edge((heightHere(bx, by) - snowLine) / slopeHere(bx, by) + slip(x, y, 9)), 0, 1);
            });
          }
        });

        // the weather (mood): the slopes that face the light take its colour, the others the shadow's;
        // plainly on the post's own peaks, faintly on the rest of the land
        if (!plan.index && (is.shadeAmount > 0.03 || is.litAmount > 0.03)) {
          const shade = col.dark ? mix(mix(col.paper, [0, 0, 0], 0.55), is.shade, 0.18) : is.shade;
          const lit = col.dark ? pigment(is.lit, col) : is.lit;
          const dim = is.shadeAmount * (col.dark ? 0.9 : 0.34), bright = is.litAmount * (col.dark ? 0.6 : 0.5);
          glaze(shade, -half, -view.ay, half, H - view.ay, function(x, y, bx, by) {
            if (heightHere(bx, by) < 0.01) return 0;
            const gx = sample(bx + 6, by) - sample(bx - 6, by), gy = sample(bx, by + 6) - sample(bx, by - 6);
            const rise = Math.hypot(gx, gy) + 1e-7;
            const facing = (gx * light[0] + gy * light[1]) / rise;    // > 0: turned away from the light
            if (facing > -0.1 && facing < 0.1) return 0;
            const where = 0.22 + 0.78 * Math.min(1, belonging(x, y).v * 1.4);
            const steep = smoothstep(0.4, 3, rise / 12 * view.scale) * where;
            return facing > 0 ? dim * smoothstep(0.1, 0.9, facing) * steep : -bright * smoothstep(0.1, 0.9, -facing) * steep;
          }, function(x, y) { return sample(x, y) < 0; }, lit);
        }

        const wash = document.createElement('canvas');
        wash.width = rw; wash.height = rh;
        const wctx = wash.getContext('2d');
        const image = wctx.createImageData(rw, rh);
        for (let i = 0; i < rw * rh; i++) {
          let r, gg, b;
          if (col.dark) { r = acc[i * 3]; gg = acc[i * 3 + 1]; b = acc[i * 3 + 2]; }
          else if (acc[i * 3] === 0 && acc[i * 3 + 1] === 0 && acc[i * 3 + 2] === 0) { r = col.paper[0]; gg = col.paper[1]; b = col.paper[2]; }
          else {
            r = col.paper[0] * Math.exp(-acc[i * 3]); gg = col.paper[1] * Math.exp(-acc[i * 3 + 1]); b = col.paper[2] * Math.exp(-acc[i * 3 + 2]);
          }
          image.data[i * 4] = r * 255; image.data[i * 4 + 1] = gg * 255; image.data[i * 4 + 2] = b * 255; image.data[i * 4 + 3] = 255;
        }
        wctx.putImageData(image, 0, 0);

        // ---- the small things on top: summits, symbols, names, the route ----
        const ink = [], texts = [], boxes = [];
        const ctx = st.ctx;
        ctx.save();
        const hand = function(points, x, y, rgb, alpha, width, at, rand) {
          // a short line drawn twice, not quite the same
          for (let pass = 0; pass < 2; pass++) {
            const p = [];
            const sx = (rand() - 0.5) * 0.5, sy = (rand() - 0.5) * 0.5;
            for (let i = 0; i < points.length; i += 2) {
              p.push(x + points[i] + sx + (rand() - 0.5) * 0.7, y + points[i + 1] + sy + (rand() - 0.5) * 0.7);
            }
            ink.push({ p: p, rgb: rgb, a: alpha * (pass ? 0.5 : 1), w: width, at: at });
          }
        };
        const letters = function(text, font, spacing, rand) {
          ctx.font = font;
          const glyphs = [];
          let x = 0;
          for (const ch of text) {
            glyphs.push({ ch: ch, x: x, y: (rand() - 0.5) * 0.9, turn: (rand() - 0.5) * 0.07 });
            x += ctx.measureText(ch).width + spacing;
          }
          return { glyphs: glyphs, width: x - spacing, font: font };
        };
        const free = function(x0, y0, x1, y1) {
          for (let i = 0; i < boxes.length; i++) {
            const b = boxes[i];
            if (x0 < b[2] && x1 > b[0] && y0 < b[3] && y1 > b[1]) return false;
          }
          return true;
        };
        // a name next to a spot, wherever there is room
        const name = function(x, y, parts, clearance, at, alpha) {
          let width = 0;
          parts.forEach(function(part) { width += part.set.width + (part.gap || 0); });
          const spots = [[clearance, 4], [-clearance - width, 4], [-width / 2, -clearance - 2], [-width / 2, clearance + 9],
            [clearance, -5], [clearance, 12], [-clearance - width, -5], [-clearance - width, 12]];
          for (let i = 0; i < spots.length; i++) {
            const tx = x + spots[i][0], ty = y + spots[i][1];
            if (ty - 10 < -view.ay || ty + 4 > H - view.ay || !free(tx - 2, ty - 9, tx + width + 2, ty + 3)) continue;
            boxes.push([tx - 2, ty - 9, tx + width + 2, ty + 3]);
            let cursor = tx;
            parts.forEach(function(part) {
              cursor += part.gap || 0;
              texts.push({ x: cursor, y: ty + (part.rise || 0), set: part.set, rgb: part.rgb, a: alpha * (part.alpha || 1), at: at });
              cursor += part.set.width;
            });
            return true;
          }
          return false;
        };

        const visible = function(x, y) { return fadeAt(x, y, 0.02); };
        // the place and the route
        const here = toScreen(view, plan.place[0], plan.place[1]);
        const alone = plan.alone;
        if (!plan.index) boxes.push([here[0] - (alone ? 13 : 9), here[1] - (alone ? 13 : 9), here[0] + (alone ? 13 : 9), here[1] + (alone ? 13 : 9)]);
        marks.forEach(function(m) { boxes.push([m.x - 7, m.y - 8, m.x + 7, m.y + 7]); });
        const bar = [here[0] - 62, footer ? H * 0.93 - view.ay : H * 0.76 - view.ay];     // (the scale bar of a practical ending)
        if (is.practical > 0.4 && !plan.index) boxes.push([bar[0] - 4, bar[1] - 8, bar[0] + 128, bar[1] + 5]);

        const trails = plan.routes.map(function(route, r) {
          const stops = route.stops.map(function(s) { const p = toScreen(view, s[0], s[1]); return [p[0], p[1], s[2]]; });
          const path = [];
          for (let i = 0; i < stops.length - 1; i++) {
            const p0 = stops[Math.max(0, i - 1)], p1 = stops[i], p2 = stops[i + 1], p3 = stops[Math.min(stops.length - 1, i + 2)];
            const length = Math.hypot(p2[0] - p1[0], p2[1] - p1[1]);
            const steps = Math.max(2, Math.ceil(length / 2));
            for (let k = 0; k < steps; k++) {
              const t = k / steps, t2 = t * t, t3 = t2 * t;
              let x = 0.5 * (2 * p1[0] + (p2[0] - p0[0]) * t + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 + (3 * p1[0] - p0[0] - 3 * p2[0] + p3[0]) * t3);
              let y = 0.5 * (2 * p1[1] + (p2[1] - p0[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (3 * p1[1] - p0[1] - 3 * p2[1] + p3[1]) * t3);
              const sway = Math.sin(t * Math.PI) * Math.min(1, length / 60) * (3 + 7 * loose);
              x += sway * noise2(x / 70 + r * 9.1, y / 70, seed + 51);
              y += sway * noise2(x / 70 + r * 9.1, y / 70, seed + 52);
              path.push(x, y);
            }
          }
          const last = stops[stops.length - 1];
          path.push(last[0], last[1]);
          // names keep off the route
          for (let i = 0; i < path.length; i += 8) boxes.push([path[i] - 3, path[i + 1] - 3, path[i] + 3, path[i + 1] + 3]);
          return { stops: stops, path: path };
        });

        marks.forEach(function(m, order) {
          const tag = m.p.tag, role = m.p.role;
          const rand = plan.post.rng('mark:' + tag.name + surface.kind);
          const fade = visible(m.x, m.y);
          if (fade < 0.3) return;
          const at = 0.15 + 0.5 * order / Math.max(1, marks.length);
          const alpha = Math.min(1, fade * 1.4);
          if (role === 'project') {
            hand2(SYMBOLS[tag.name] || SYMBOLS.survey, m.x, m.y, m.line, 0.9 * alpha, 1.05, at, rand);
          } else if (role === 'subject') {
            hand2(SYMBOLS.summit, m.x, m.y, col.letter, 0.8 * alpha, 0.95, at, rand);
          } else {
            hand2(SYMBOLS.spot, m.x, m.y, col.letter, 0.7 * alpha, 0.9, at, rand);
          }
          if (!m.p.lead) return;
          if (role === 'register') {
            name(m.x, m.y, [{ set: letters(tag.name.toUpperCase(), FONT_RANGE, 2.6, rand), rgb: mix(col.letter, m.line, 0.35) }], alone ? 15 : 9, at, 0.8 * alpha);
          } else {
            const parts = [{ set: letters(tag.name, FONT_NAME, 0.35, rand), rgb: role === 'project' ? m.line : mix(col.letter, m.line, 0.3) }];
            if (tag.count) parts.push({ set: letters(String(tag.count), FONT_NUMBER, 0.2, rand), rgb: col.letter, gap: 4, alpha: 0.75 });
            name(m.x, m.y, parts, alone ? 15 : 9, at, 0.9 * alpha);
          }
        });
        function hand2(shapes, x, y, rgb, alpha, width, at, rand) {
          shapes.forEach(function(shape) { hand(shape, x, y, rgb, alpha, width, at, rand); });
        }

        // personal: how much of this is the author's own red pencil
        const warm = is.known ? lerp(0.62, 1.15, is.personal) : 1;
        if (!plan.index) {
          const rand = plan.post.rng('here' + surface.kind);
          const fade = visible(here[0], here[1]);
          if (fade > 0.2) {
            // "you are here": a ring in red pencil, not quite closed, gone over twice
            const radius = alone ? 10 : is.known ? lerp(4.5, 7, is.personal) : 5.5;
            for (let pass = 0; pass < 2; pass++) {
              const ring = [], start = rand() * 6.3, wide = 1 + (rand() - 0.5) * 0.16;
              for (let a = 0; a <= 6.6; a += 0.35) {
                const r = radius * (1 + 0.07 * Math.sin(a * 2 + start)) + a * 0.12;
                ring.push(here[0] + Math.cos(a + start) * r * wide, here[1] + Math.sin(a + start) * r);
              }
              ink.push({ p: ring, rgb: col.red, a: (pass ? 0.45 : 0.85) * warm * Math.min(1, fade * 1.4), w: 1.1, at: 0.05 });
            }
            // and when: the day of the post, noted next to it
            const date = plan.post.date;
            if (footer && date && plan.post.kind === 'post') {
              const months = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
              const text = date.getUTCDate() + '.' + months[date.getUTCMonth()] + '.' + date.getUTCFullYear();
              name(here[0], here[1], [{ set: letters(text, FONT_SMALL, 0.4, rand), rgb: col.red }], radius + 5, 0.9, 0.8 * Math.min(1, fade * 1.4));
            }
          }
        }
        plan.routes.forEach(function(route, r) {
          // a dashed line in red pencil, through the stops, wandering a little
          const stops = trails[r].stops, path = trails[r].path;
          const rand = plan.post.rng('route' + r + surface.kind);
          let travelled = 0, total = 0;
          for (let i = 2; i < path.length; i += 2) total += Math.hypot(path[i] - path[i - 2], path[i + 1] - path[i - 1]);
          const road = route.strong && is.imagery === 'road';
          let dash = null, room = 5 + rand() * 2, pen = true, cairn = 0;
          for (let i = 2; i < path.length; i += 2) {
            const x = path[i], y = path[i + 1];
            const step = Math.hypot(x - path[i - 2], y - path[i - 1]);
            travelled += step;
            room -= step;
            // a tick across the route for every heading of the post, as far along as it stands in the text
            while (route.strong && cairn < plan.cairns.length && plan.cairns[cairn] * total <= travelled) {
              cairn++;
              const fade = visible(x, y);
              if (step > 0 && fade > 0.05) {
                const ux = (x - path[i - 2]) / step, uy = (y - path[i - 1]) / step;
                const reach = 3.2 + rand();
                ink.push({
                  p: [x - uy * reach + (rand() - 0.5), y + ux * reach + (rand() - 0.5), x + uy * reach + (rand() - 0.5), y - ux * reach + (rand() - 0.5)],
                  rgb: col.red, a: 0.8 * warm * fade, w: 1, at: 0.1 + 0.75 * travelled / total
                });
              }
            }
            let clear = true;
            for (let s = 0; s < stops.length; s++) {
              if (Math.hypot(x - stops[s][0], y - stops[s][1]) < (alone && s === 0 ? 14 : 8)) clear = false;
            }
            if (pen && clear) {
              if (!dash) dash = [path[i - 2], path[i - 1]];
              dash.push(x + (rand() - 0.5) * 0.5, y + (rand() - 0.5) * 0.5);
            }
            if (room <= 0 || !clear) {
              if (dash && dash.length >= 4) {
                const fade = visible(dash[0], dash[1]);
                if (fade > 0.05) {
                  const alpha = (route.strong ? 0.8 : 0.55) * warm * fade * (0.75 + 0.25 * rand()), at = 0.1 + 0.75 * travelled / total;
                  if (road) {
                    // (imagery: a road is two lines side by side)
                    [-1.5, 1.5].forEach(function(side) {
                      const lane = [];
                      for (let k = 0; k < dash.length; k += 2) {
                        const a = Math.max(0, k - 2), b = Math.min(dash.length - 2, k + 2);
                        const dx = dash[b] - dash[a], dy = dash[b + 1] - dash[a + 1], d = Math.hypot(dx, dy) || 1;
                        lane.push(dash[k] - dy / d * side, dash[k + 1] + dx / d * side);
                      }
                      ink.push({ p: lane, rgb: col.red, a: alpha * 0.9, w: 0.85, at: at });
                    });
                  } else {
                    ink.push({ p: dash, rgb: col.red, a: alpha, w: 1.05, at: at });
                  }
                }
              }
              dash = null;
              if (room <= 0) { pen = road || !pen; room = road ? 14 : pen ? 5 + rand() * 2.5 : 3.2 + rand() * 1.2; }
            }
          }
        });

        if (is.known && !plan.index && visible(here[0], here[1]) > 0.2) {
          const rand = plan.post.rng('facets' + surface.kind);
          const shown = Math.min(1, visible(here[0], here[1]) * 1.4);
          // the way the route leaves the place (or, with one tag, comes to it)
          const strong = trails.filter(function(trail, r) { return plan.routes[r].strong; })[0];
          let ox = 1, oy = 0;
          if (strong) {
            const path = strong.path, n = path.length;
            ox = path[n - 2] - path[Math.max(0, n - 14)]; oy = path[n - 1] - path[Math.max(1, n - 13)];
            const d = Math.hypot(ox, oy) || 1;
            ox /= d; oy /= d;
            // ending "call": the route does not stop at its last summit, an arrow points on
            if (is.call > 0.25) {
              const x = path[n - 2] + ox * 11, y = path[n - 1] + oy * 11, reach = 16 + 22 * is.call;
              const alpha = 0.85 * warm * smoothstep(0.25, 0.6, is.call) * visible(x, y);
              hand([0, 0, ox * reach * 0.5 - oy * 2, oy * reach * 0.5 + ox * 2, ox * reach, oy * reach], x, y, col.red, alpha, 1.1, 0.9, rand);
              hand([ox * reach - (ox * 6 - oy * 3.5), oy * reach - (oy * 6 + ox * 3.5), ox * reach, oy * reach,
                ox * reach - (ox * 6 + oy * 3.5), oy * reach - (oy * 6 - ox * 3.5)], x, y, col.red, alpha, 1.1, 0.95, rand);
            }
          }
          // ending "practical": squared off with a scale bar, ruled and ticked
          if (is.practical > 0.4) {
            const x = bar[0], y = bar[1], alpha = 0.7 * smoothstep(0.4, 0.8, is.practical);
            ink.push({ p: [x, y, x + 124, y], rgb: col.letter, a: alpha, w: 0.9, at: 0.8 });
            ink.push({ p: [x, y - 2.5, x + 62, y - 2.5], rgb: col.letter, a: alpha, w: 0.7, at: 0.8 });
            for (let k = 0; k <= 4; k++) ink.push({ p: [x + k * 31, y - (k % 2 ? 3 : 5), x + k * 31, y + 1], rgb: col.letter, a: alpha, w: 0.8, at: 0.82 });
          }
          // stance: what the author does at the place
          const px = -oy, py = ox;    // across the route
          if (is.stance === 'builder') {
            // building: a ground plan pegged out around it
            hand([-11, -9, 11, -9, 11, 9, -11, 9, -11, -9], here[0], here[1], col.red, 0.7 * warm * shown, 0.9, 0.3, rand);
            [[-11, -9], [11, -9], [11, 9], [-11, 9]].forEach(function(c) {
              hand([c[0] - 3, c[1], c[0] + 3, c[1]], here[0], here[1], col.red, 0.6 * warm * shown, 0.8, 0.35, rand);
              hand([c[0], c[1] - 3, c[0], c[1] + 3], here[0], here[1], col.red, 0.6 * warm * shown, 0.8, 0.35, rand);
            });
          } else if (is.stance === 'teacher') {
            // teaching: the angle measured, an arc with its degrees ticked off
            const arc = [], from = Math.atan2(oy, ox) - 1.25;
            for (let a = 0; a <= 2.5; a += 0.25) arc.push(Math.cos(from + a) * 15, Math.sin(from + a) * 15);
            hand(arc, here[0], here[1], col.red, 0.75 * warm * shown, 0.9, 0.3, rand);
            for (let a = 0; a <= 2.5; a += 0.5) {
              hand([Math.cos(from + a) * 13, Math.sin(from + a) * 13, Math.cos(from + a) * 18, Math.sin(from + a) * 18], here[0], here[1], col.red, 0.7 * warm * shown, 0.8, 0.35, rand);
            }
          } else if (is.stance === 'critic') {
            // criticism: a cut across, the line of a section
            for (let side = -1; side <= 1; side += 2) {
              for (let d = 10; d < 58; d += 11) {
                hand([px * d * side, py * d * side, px * (d + 7) * side, py * (d + 7) * side], here[0], here[1], col.red, 0.8 * warm * shown, 1.1, 0.3, rand);
              }
              hand([px * 62 * side - ox * 5, py * 62 * side - oy * 5, px * 62 * side + ox * 5, py * 62 * side + oy * 5], here[0], here[1], col.red, 0.8 * warm * shown, 1.1, 0.4, rand);
            }
          } else if (is.stance === 'advocate') {
            // advocacy: a flag planted
            hand([0, -radiusOf(), 0, -24], here[0], here[1], col.red, 0.85 * warm * shown, 1.1, 0.3, rand);
            hand([0, -24, 10, -20.5, 0, -17], here[0], here[1], col.red, 0.85 * warm * shown, 1.1, 0.35, rand);
          } else if (is.stance === 'observer') {
            // observing: a look-out, sight lines fanning out along the way
            for (let a = -0.6; a <= 0.61; a += 0.3) {
              const c = Math.cos(a), sn = Math.sin(a), dx = ox * c - oy * sn, dy = oy * c + ox * sn;
              hand([dx * 11, dy * 11, dx * (21 + 5 * Math.cos(a * 2.5)), dy * (21 + 5 * Math.cos(a * 2.5))], here[0], here[1], col.red, 0.7 * warm * shown, 0.85, 0.3, rand);
            }
          } else if (is.stance === 'witness') {
            // bearing witness: a cross set up
            hand([0, -radiusOf() - 1, 0, -22], here[0], here[1], col.red, 0.85 * warm * shown, 1.1, 0.3, rand);
            hand([-4.5, -16.5, 4.5, -16.5], here[0], here[1], col.red, 0.85 * warm * shown, 1.1, 0.35, rand);
          }
          function radiusOf() { return lerp(4.5, 7, is.personal) + 1; }

          // actor: who lives there.  One house, a scattered hamlet, or rows in rank and file
          const houses = Math.round(is.settle);
          if (houses > 0) {
            const cx = here[0] + px * 30 - ox * 8, cy = here[1] + py * 30 - oy * 8;
            for (let i = 0; i < houses; i++) {
              const strewn = [cx + (rand() - 0.5) * 34, cy + (rand() - 0.5) * 22];
              const ranked = [cx + ((i % 4) - 1.5) * 7 * ox + (Math.floor(i / 4) - 1) * 7 * px, cy + ((i % 4) - 1.5) * 7 * oy + (Math.floor(i / 4) - 1) * 7 * py];
              const x = lerp(strewn[0], ranked[0], is.order), y = lerp(strewn[1], ranked[1], is.order);
              const fade = visible(x, y);
              if (fade < 0.3 || sample(x, y) < 0.01) continue;
              const turn = lerp(rand() * 3, Math.atan2(oy, ox), is.order), size = 1.5 + 0.5 * is.order;
              const c = Math.cos(turn) * size, sn = Math.sin(turn) * size * 0.75;
              const plot = [-c + sn, -sn - c, c + sn, sn - c, c - sn, sn + c, -c - sn, -sn + c, -c + sn, -sn - c].map(function(v, k) {
                return k % 2 ? v * 0.8 : v;
              });
              const alpha = 0.9 * Math.min(1, fade * 1.3), at = 0.5 + 0.3 * i / houses;
              ink.push({ p: plot.map(function(v, k) { return v + (k % 2 ? y : x); }), rgb: col.letter, a: alpha, w: 1, at: at });
              ink.push({ p: [x - c * 0.4, y - sn * 0.4, x + c * 0.4, y + sn * 0.4], rgb: col.letter, a: alpha, w: 1.5, at: at });
            }
          }

          // imagery (only where the classifier was sure): the author's own image, as a map feature
          if (is.imagery === 'growth' || is.imagery === 'crowd' || is.imagery === 'stone') {
            const green = col.dark ? [0.62, 0.85, 0.55] : [0.25, 0.47, 0.22];
            for (let i = 0; i < 70; i++) {
              const turn = rand() * 6.283, out = 14 + 130 * Math.sqrt(rand());
              const x = here[0] + Math.cos(turn) * out * 1.5, y = here[1] + Math.sin(turn) * out * 0.7, size = 0.8 + 0.4 * rand();
              const h = sample(x, y), fade = visible(x, y);
              if (fade < 0.3 || h < 0.02) continue;
              const alpha = 0.75 * Math.min(1, fade * 1.3), at = 0.3 + 0.5 * out / 150;
              if (is.imagery === 'growth') {
                // woodland: a small round crown on a stem
                if (h > 0.45) continue;
                const crown = [];
                for (let a = 0.6; a < 6.6; a += 0.75) crown.push(Math.cos(a) * 2.4 * size, Math.sin(a) * 2.4 * size - 3);
                hand(crown, x, y, green, alpha, 0.8, at, rand);
                ink.push({ p: [x, y - 0.8, x + 0.3, y + 2.2], rgb: green, a: alpha, w: 0.8, at: at });
              } else if (is.imagery === 'crowd') {
                // a crowd: many small figures
                ink.push({ p: [x, y, x + 0.4, y + 2.6], rgb: col.letter, a: alpha * 0.8, w: 0.9, at: at });
                ink.push({ p: [x - 0.2, y - 1.8, x + 0.2, y - 1.8], rgb: col.letter, a: alpha * 0.8, w: 1.5, at: at });
              } else {
                // stone: scree, where it is steep
                const steep = slopeAt(x, y) * view.scale;
                if (steep < 1.2) continue;
                ink.push({ p: [x, y, x + 0.5, y + 0.3], rgb: col.letter, a: alpha * 0.7, w: 1 + rand(), at: at });
              }
            }
          } else if (is.imagery === 'water') {
            // water: streams run down from the post's summits to the sea
            marks.slice(0, 3).forEach(function(m, k) {
              for (let j = 0; j < 2; j++) {
                const turn = rand() * 6.283;
                let x = m.x + Math.cos(turn) * m.reach * 0.3, y = m.y + Math.sin(turn) * m.reach * 0.3;
                let run = [x, y];
                for (let step = 0; step < 260; step++) {
                  const gx = sample(x + 3, y) - sample(x - 3, y), gy = sample(x, y + 3) - sample(x, y - 3), rise = Math.hypot(gx, gy);
                  if (rise < 1e-6 || sample(x, y) < -0.004) break;
                  const sway = 0.5 * noise2(x / 9 + k, y / 9, seed + 81 + j);
                  x -= (gx / rise + gy / rise * sway) * 2.2; y -= (gy / rise - gx / rise * sway) * 2.2;
                  run.push(x, y);
                  if (run.length >= 18) {
                    const fade = visible(x, y);
                    if (fade > 0.05) ink.push({ p: run, rgb: col.water, a: 0.85 * fade, w: 0.8 + Math.min(0.7, step / 200), at: 0.2 + 0.6 * step / 260 });
                    run = [x, y];
                  }
                }
              }
            });
          } else if (is.imagery === 'building') {
            // building: a tower at the place, drawn in elevation as old maps do
            const tower = [[-4, -10, -4, -30, 4, -30, 4, -10], [-5.5, -30, -5.5, -34, -2, -34, -2, -31.5, 2, -31.5, 2, -34, 5.5, -34, 5.5, -30],
              [-1.2, -10, -1.2, -15, 1.2, -15, 1.2, -10], [-1, -24, 1, -24], [-6.5, -10, 6.5, -10]];
            tower.forEach(function(part) { hand(part, here[0] + px * 4, here[1], col.letter, 0.85 * shown, 0.95, 0.5, rand); });
          }

          // humor: out at sea, something is having a swim
          if (is.humor > 0.55) {
            let spot = null;
            for (let ring = 70; ring < 520 && !spot; ring += 30) {
              for (let k = 0; k < 10 && !spot; k++) {
                const turn = (k + (ring / 30) * 0.37) * 0.6283, x = here[0] + Math.cos(turn) * ring * 1.3, y = here[1] + Math.sin(turn) * ring * 0.6;
                if (sampleDepth(x, y) > 24 && sampleDepth(x - 22, y) > 14 && sampleDepth(x + 22, y) > 14 && visible(x, y) > 0.75 && visible(x, y - 12) > 0.6) spot = [x, y];
              }
            }
            if (spot) {
              const alpha = 0.75 * smoothstep(0.55, 0.8, is.humor), blue = mix(col.water, col.letter, 0.35);
              [-12, 0, 12].forEach(function(dx, i) {
                const hump = [], size = 5 - i * 0.6;
                for (let a = 3.3; a <= 6.2; a += 0.4) hump.push(dx + Math.cos(a) * size, Math.sin(a) * size * 1.15);
                hand(hump, spot[0], spot[1], blue, alpha, 0.95, 0.85, rand);
              });
              hand([-17, 0.5, -19.5, -6.5, -22.5, -9.5, -26.5, -8.5, -27, -6.8, -23.5, -6.6], spot[0], spot[1], blue, alpha, 0.95, 0.9, rand);
              hand([17.5, 0.5, 20.5, -4.5, 23.5, -5.2, 21.8, -7.6], spot[0], spot[1], blue, alpha, 0.9, 0.9, rand);
              ink.push({ p: [spot[0] - 23.2, spot[1] - 8.1, spot[0] - 23, spot[1] - 8], rgb: blue, a: alpha, w: 1.1, at: 0.95 });
              hand([-31, 2.5, -8, 3.2, 14, 2.4, 29, 3], spot[0], spot[1], col.water, alpha * 0.6, 0.7, 0.9, rand);
            }
          }
        }

        // out at sea, east of the island, a compass rose (wide screens get to see it)
        if (footer) {
          const at = toScreen(view, ASPECT + 0.8, DEPTH * 0.45);
          const fade = visible(at[0], at[1]);
          if (fade > 0.3) {
            const rand = plan.post.rng('rose');
            const northX = -view.sin, northY = -view.cos, eastX = view.cos, eastY = -view.sin;
            const R = 15, strength = 0.55 * Math.min(1, fade * 1.3);
            const ring = [];
            for (let a = 0; a <= 6.5; a += 0.3) ring.push(Math.cos(a) * R, Math.sin(a) * R);
            hand(ring, at[0], at[1], col.letter, strength * 0.8, 0.8, 0.5, rand);
            [[northX, northY, 1.55], [-northX, -northY, 1.15], [eastX, eastY, 1.15], [-eastX, -eastY, 1.15]].forEach(function(arm) {
              const tx = arm[0] * R * arm[2], ty = arm[1] * R * arm[2], sx = -arm[1] * 2.8, sy = arm[0] * 2.8;
              hand([sx, sy, tx, ty, -sx, -sy], at[0], at[1], col.letter, strength, 0.85, 0.55, rand);
            });
            [[1, 1], [1, -1], [-1, 1], [-1, -1]].forEach(function(d) {
              const dx = (northX * d[0] + eastX * d[1]) * 0.707, dy = (northY * d[0] + eastY * d[1]) * 0.707;
              hand([dx * R * 0.45, dy * R * 0.45, dx * R * 0.95, dy * R * 0.95], at[0], at[1], col.letter, strength * 0.8, 0.75, 0.6, rand);
            });
            const letter = letters('N', FONT_RANGE, 0, rand);
            texts.push({ x: at[0] + northX * (R * 1.55 + 9) - letter.width / 2, y: at[1] + northY * (R * 1.55 + 9) + 3, set: letter, rgb: col.letter, a: strength, at: 0.6 });
          }
        }

        // the other peaks of the sheet, small and faint (the footer only)
        if (footer || plan.index) {
          const own = {};
          plan.painted.forEach(function(p) { own[p.peak.name] = true; });
          const near = {};
          plan.routes.forEach(function(route) { if (route.to) near[route.to.name] = true; });
          plan.peaks.slice().sort(function(a, b) { return b.count - a.count || (a.name < b.name ? -1 : 1); }).forEach(function(peak) {
            if (own[peak.name]) return;
            const lies = plan.spot(peak);
            const at = toScreen(view, lies[0], lies[1]);
            const fade = visible(at[0], at[1]);
            if (fade < 0.35) return;
            const rand = plan.post.rng('other:' + peak.name);
            const strength = (plan.index ? 0.75 : near[peak.name] ? 0.8 : 0.5) * Math.min(1, fade * 1.3);
            hand2(SYMBOLS.spot, at[0], at[1], col.letter, strength, 0.8, 0.6, rand);
            name(at[0], at[1], [{ set: letters(peak.name, FONT_SMALL, 0.3, rand), rgb: col.letter }], 5, 0.6, strength);
          });
        }
        ctx.restore();

        st.built = {
          view: view, col: col, strokes: strokes, wash: wash, ink: ink, texts: texts,
          washX: half + rx0 * q, washY: view.ay + ry0 * q, washW: rw * q, washH: rh * q,
          blooms: marks.map(function(m) { return { x: m.x / q - rx0, y: m.y / q - ry0, r: m.reach * 1.5 / q }; }),
          mask: null
        };
        st.drawn = 0;
        st.done = false;
        const layer = function() {
          const canvas = document.createElement('canvas');
          canvas.width = surface.canvas.width; canvas.height = surface.canvas.height;
          return canvas;
        };
        st.pencil = layer();
        st.scratch = layer();
      }

      function stroke(ctx, p, rgb, alpha, width) {
        ctx.strokeStyle = css(rgb, alpha);
        ctx.lineWidth = width;
        ctx.beginPath();
        ctx.moveTo(p[0], p[1]);
        for (let i = 2; i < p.length; i += 2) ctx.lineTo(p[i], p[i + 1]);
        ctx.stroke();
      }
      function centred(ctx, st) {
        const surface = st.surface;
        ctx.setTransform(surface.dpr, 0, 0, surface.dpr, surface.width / 2 * surface.dpr, st.built.view.ay * surface.dpr);
        ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      }

      function drawStrokes(st, upto) {
        const strokes = st.built.strokes;
        if (upto <= st.drawn) return;
        const ctx = st.pencil.getContext('2d');
        centred(ctx, st);
        for (let s = st.drawn; s < upto; s++) stroke(ctx, strokes[s].p, strokes[s].rgb, strokes[s].a, strokes[s].w);
        st.drawn = upto;
      }

      function drawTop(ctx, st, progress) {
        const built = st.built;
        centred(ctx, st);
        built.ink.forEach(function(item) {
          const shown = smoothstep(item.at, item.at + 0.12, progress);
          if (shown > 0) stroke(ctx, item.p, item.rgb, item.a * shown, item.w);
        });
        ctx.textBaseline = 'alphabetic';
        built.texts.forEach(function(text) {
          const shown = smoothstep(text.at, text.at + 0.3, progress);
          if (shown <= 0) return;
          ctx.font = text.set.font;
          ctx.fillStyle = css(text.rgb, text.a * shown);
          text.set.glyphs.forEach(function(glyph) {
            ctx.save();
            ctx.translate(text.x + glyph.x, text.y + glyph.y);
            ctx.rotate(glyph.turn);
            ctx.fillText(glyph.ch, 0, 0);
            ctx.restore();
          });
        });
      }

      function compose(st) {
        const built = st.built, surface = st.surface, ctx = st.ctx, dpr = surface.dpr;
        const w = surface.canvas.width, h = surface.canvas.height;
        const t = st.time;
        const pencilAt = env.still ? 1 : smoothstep(0, 1.5, t);
        const washAt = env.still ? 1 : smoothstep(0.6, DURATION - 0.3, t);
        const topAt = env.still ? 1.2 : clamp((t - 1.3) / (DURATION - 1.3), 0, 1) * 1.2;
        drawStrokes(st, Math.ceil(built.strokes.length * pencilAt));

        // pencil and ink go through the tooth of the paper
        const sctx = st.scratch.getContext('2d');
        sctx.setTransform(1, 0, 0, 1, 0, 0);
        sctx.globalCompositeOperation = 'source-over';
        sctx.globalAlpha = 1;
        sctx.clearRect(0, 0, w, h);
        sctx.drawImage(st.pencil, 0, 0);
        if (topAt > 0) drawTop(sctx, st, topAt);
        if (!tooth) tooth = makeTooth();
        sctx.setTransform(1, 0, 0, 1, 0, 0);
        sctx.globalCompositeOperation = 'destination-out';
        sctx.globalAlpha = 0.55;
        sctx.fillStyle = sctx.createPattern(tooth, 'repeat');
        sctx.fillRect(0, 0, w, h);

        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.globalAlpha = 1;
        ctx.fillStyle = css(built.col.paper);
        ctx.fillRect(0, 0, w, h);
        if (washAt > 0) {
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          // the tint comes up everywhere, and runs out from the post's peaks ahead of that
          ctx.globalAlpha = washAt * washAt;
          ctx.drawImage(built.wash, built.washX * dpr, built.washY * dpr, built.washW * dpr, built.washH * dpr);
          ctx.globalAlpha = 1;
          if (washAt < 1 && built.blooms.length) {
            if (!built.mask) {
              built.mask = document.createElement('canvas');
              built.mask.width = built.wash.width; built.mask.height = built.wash.height;
            }
            const mctx = built.mask.getContext('2d');
            mctx.globalCompositeOperation = 'source-over';
            mctx.clearRect(0, 0, built.mask.width, built.mask.height);
            built.blooms.forEach(function(bloom, i) {
              const at = clamp(washAt * 1.5 - 0.35 * i / built.blooms.length, 0, 1);
              if (at <= 0) return;
              const radius = bloom.r * (0.2 + 0.9 * (1 - (1 - at) * (1 - at)));
              const gradient = mctx.createRadialGradient(bloom.x, bloom.y, radius * 0.5, bloom.x, bloom.y, radius);
              gradient.addColorStop(0, 'rgba(0,0,0,' + Math.min(1, at * 1.6) + ')');
              gradient.addColorStop(1, 'rgba(0,0,0,0)');
              mctx.fillStyle = gradient;
              mctx.fillRect(bloom.x - radius, bloom.y - radius, radius * 2, radius * 2);
            });
            mctx.globalCompositeOperation = 'source-in';
            mctx.drawImage(built.wash, 0, 0);
            ctx.drawImage(built.mask, built.washX * dpr, built.washY * dpr, built.washW * dpr, built.washH * dpr);
          }
        }
        ctx.drawImage(st.scratch, 0, 0);
        // the sheet that lay here before fades off the new one
        if (st.old) {
          const left = env.still ? 0 : 1 - smoothstep(0, 0.8, st.time);
          if (left > 0 && st.old.width === w && st.old.height === h) {
            ctx.globalAlpha = left;
            ctx.drawImage(st.old, 0, 0);
            ctx.globalAlpha = 1;
          } else {
            st.old = null;
          }
        }
        st.shown = true;
      }

      // once the picture stands, it lives on its canvas alone
      function finish(st) {
        st.pencil = null;
        st.scratch = null;
        st.built = null;
        st.done = true;
      }

      return {
        setPost: function(next, info) {
          plan = makePlan(next);
          states.forEach(function(st) {
            if (!info.initial && st.shown && inSight(st) && !env.still) {
              // keep what is on the paper, to fade from
              const old = document.createElement('canvas');
              old.width = st.surface.canvas.width; old.height = st.surface.canvas.height;
              old.getContext('2d').drawImage(st.surface.canvas, 0, 0);
              st.old = old;
            }
            st.dirty = true;
            st.time = 0;
            st.fresh = true;
          });
        },
        resize: function() { states.forEach(function(st) { st.dirty = true; }); },
        setTheme: function() { states.forEach(function(st) { st.dirty = true; }); },
        frame: function() {
          if (!plan) return false;
          const clock = performance.now() / 1000;
          let more = false;
          states.forEach(function(st) {
            if (st.surface.width < 2 || st.surface.height < 2) return;
            if (st.dirty) {
              // a band that is out of sight is drawn (and painted in) when it comes into it
              if (!env.still && !inSight(st)) return;
              build(st);
              st.dirty = false;
            }
            if (!st.built || st.done) return;
            // the clock is the wall's (slow or rare frames must not slow the
            // picture down), and starts with the frame after the one that built it
            if (env.still) st.time = DURATION;
            else if (st.fresh) { st.fresh = false; st.began = null; }
            else if (st.began === null) st.began = clock - st.time;
            else st.time = clock - st.began;
            compose(st);
            if (st.time < DURATION || st.old) more = true;
            else finish(st);
          });
          return more;
        },
        destroy: function() { alive = false; watcher.disconnect(); }
      };
    }
  });
})();
