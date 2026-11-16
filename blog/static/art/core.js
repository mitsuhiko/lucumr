// Header/footer artwork: the part every variant shares.  See ART.md.
//
// A variant registers itself with LucumrArt.register(name, { title, create }).
// LucumrArt.mount() gives it two canvases (header, footer) and a post, and
// drives it: resize, theme, visibility, animation frames.
window.LucumrArt = (function() {
  'use strict';

  const variants = new Map();
  const mounts = new Set();
  let data = { total: 0, tags: {}, facets: {} };

  // ---- utilities ---------------------------------------------------------

  function hash(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    h ^= h >>> 16; h = Math.imul(h, 2246822507);
    h ^= h >>> 13; h = Math.imul(h, 3266489909);
    return (h ^ (h >>> 16)) >>> 0;
  }

  // Seeded random numbers (mulberry32): rng(seed)() is in [0, 1).
  function rng(seed) {
    let a = (typeof seed === 'string' ? hash(seed) : seed) >>> 0;
    const next = function() {
      a = (a + 0x6D2B79F5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    next.range = function(lo, hi) { return lo + (hi - lo) * next(); };
    next.int = function(n) { return Math.floor(next() * n); };
    next.pick = function(list) { return list[Math.floor(next() * list.length)]; };
    next.chance = function(p) { return next() < p; };
    next.gauss = function() {
      return Math.sqrt(-2 * Math.log(1 - next())) * Math.cos(2 * Math.PI * next());
    };
    return next;
  }

  function clamp(x, lo, hi) { return Math.min(hi, Math.max(lo, x)); }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function smoothstep(lo, hi, x) {
    const t = clamp((x - lo) / (hi - lo), 0, 1);
    return t * t * (3 - 2 * t);
  }

  function lattice(ix, iy, seed) {
    let h = Math.imul(ix, 374761393) ^ Math.imul(iy, 668265263) ^ Math.imul(seed, 2147483647);
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  }

  // Value noise in [-1, 1]; noise1 is the same along a line.
  function noise2(x, y, seed) {
    seed = seed | 0;
    const ix = Math.floor(x), iy = Math.floor(y);
    let fx = x - ix, fy = y - iy;
    fx = fx * fx * (3 - 2 * fx);
    fy = fy * fy * (3 - 2 * fy);
    const top = lerp(lattice(ix, iy, seed), lattice(ix + 1, iy, seed), fx);
    const bottom = lerp(lattice(ix, iy + 1, seed), lattice(ix + 1, iy + 1, seed), fx);
    return lerp(top, bottom, fy) * 2 - 1;
  }
  function noise1(x, seed) { return noise2(x, 0.5, seed); }
  function fbm2(x, y, seed, octaves) {
    let sum = 0, amp = 0.5, norm = 0;
    for (let i = 0; i < (octaves || 4); i++) {
      sum += amp * noise2(x, y, (seed | 0) + i * 101);
      norm += amp;
      x *= 2; y *= 2; amp *= 0.5;
    }
    return sum / norm;
  }

  // Colours: hex('#306998') is [r, g, b] in 0..1; css([r, g, b], alpha) is a CSS colour.
  function hex(value) {
    const n = parseInt(value.replace('#', ''), 16);
    return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255];
  }
  function css(rgb, alpha) {
    const c = rgb.map(function(v) { return Math.round(clamp(v, 0, 1) * 255); });
    return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + (alpha === undefined ? 1 : alpha) + ')';
  }
  function hsl(h, s, l) {
    const f = function(n) {
      const k = (n + h * 12) % 12;
      return l - s * Math.min(l, 1 - l) * Math.max(-1, Math.min(k - 3, 9 - k, 1));
    };
    return [f(0), f(8), f(4)];
  }

  // OKLab (Björn Ottosson's): a space where equal steps look like equal
  // steps.  Every mix of the artwork happens there, so a pigment mixed with
  // white or with the navy paper keeps its hue instead of going muddy, and
  // lightness (L, 0..1) is the lightness one sees, not a weighted sum of RGB.
  // lab([r, g, b]) is [L, a, b]; rgb([L, a, b]) is sRGB (clamped).
  function toLinear(c) { return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); }
  function toGamma(c) { return c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055; }
  function lab(c) {
    const r = toLinear(c[0]), g = toLinear(c[1]), b = toLinear(c[2]);
    const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
    const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
    const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
    return [
      0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s,
      1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s,
      0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s
    ];
  }
  function linearOf(L, a, b) {
    const l = Math.pow(L + 0.3963377774 * a + 0.2158037573 * b, 3);
    const m = Math.pow(L - 0.1055613458 * a - 0.0638541728 * b, 3);
    const s = Math.pow(L - 0.0894841775 * a - 1.2914855480 * b, 3);
    return [
      4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
      -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
      -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s
    ];
  }
  function rgb(c) {
    return linearOf(c[0], c[1], c[2]).map(function(v) { return clamp(toGamma(clamp(v, 0, 1)), 0, 1); });
  }
  // L, chroma and hue (radians) to sRGB; a colour outside sRGB gives up
  // chroma, not lightness or hue
  function lch(L, C, h) {
    L = clamp(L, 0, 1);
    const a = Math.cos(h), b = Math.sin(h);
    const fits = function(c) {
      return linearOf(L, c * a, c * b).every(function(v) { return v >= -0.0005 && v <= 1.0005; });
    };
    if (!fits(C)) {
      let lo = 0, hi = C;
      for (let i = 0; i < 14; i++) {
        const mid = (lo + hi) / 2;
        if (fits(mid)) lo = mid; else hi = mid;
      }
      C = lo;
    }
    return rgb([L, C * a, C * b]);
  }
  function mix(a, b, t) {
    if (t === 0) return a.slice();
    const A = lab(a), B = lab(b);
    return rgb([lerp(A[0], B[0], t), lerp(A[1], B[1], t), lerp(A[2], B[2], t)]);
  }
  // the lightness one sees, 0 (black) .. 1 (white)
  function lightness(c) { return lab(c)[0]; }
  function chroma(c) { const v = lab(c); return Math.hypot(v[1], v[2]); }
  // the same hue at lightness L, its chroma scaled by k (a colour pencil on
  // navy paper is the pigment made light, not the pigment mixed with white)
  function relight(c, L, k) {
    const v = lab(c);
    return lch(L, Math.hypot(v[1], v[2]) * (k === undefined ? 1 : k), Math.atan2(v[2], v[1]));
  }
  // c with its chroma scaled by k (0: the grey of the same lightness)
  function saturate(c, k) {
    const v = lab(c);
    return lch(v[0], Math.hypot(v[1], v[2]) * k, Math.atan2(v[2], v[1]));
  }
  // the hue of `like` at lightness L and chroma C: the blog's blues, from its
  // own colours, at any depth
  function tone(like, L, C) {
    const v = lab(like);
    return lch(L, C, Math.atan2(v[2], v[1]));
  }
  // A colour meant for white paper as a line on the navy one, as a coloured
  // pencil or chalk: lighter (to between lo and hi: the lighter it was, the
  // lighter still), its hue kept, its chroma scaled by keep (0.75: a quarter
  // given up).  (Lines only: what is a wash on white is light on the navy,
  // see glow() below.)
  function gouache(c, lo, hi, keep) {
    return relight(c, lerp(lo, hi, smoothstep(0.5, 0.85, lightness(c))), keep === undefined ? 0.75 : keep);
  }
  // Light.  On the dark page nothing is painted with pigment: the navy is
  // the dark, and what is drawn on it is light coming out of it.  Watercolour
  // on white takes light away where the pigment lies (it multiplies); here
  // light is added where the pigment would lie, so overlaps brighten and the
  // rim of a wash, where pigment would collect, glows.
  //
  // glow(c, ground): the pigment c (given for white paper) as the colour of
  // its light on the dark ground.  The hue is the pigment's.  Light is purer
  // than pigment (the chroma goes up by a third, but never to neon: it is
  // held under 0.15), and it is as bright as its hue is by nature (a light
  // pigment, a yellow, is a bright light; a deep blue a dimmer one), always
  // below the page's text.  Two kinds of pigment would drown in the ground:
  // - one with the ground's own hue differs from it only by being lighter.
  //   Such a light (near: within some 40 degrees of the ground's hue) is
  //   turned a little further away from it, on the side it already is, and
  //   made lighter and purer, so a cobalt and an ultramarine stay two blues;
  // - a grey or a black has no hue, and grey light on navy is a haze.  It
  //   takes the ground's hue, a little purer than the ground: moonlight on
  //   blue paper.
  function glow(c, ground) {
    const v = lab(c), g = lab(ground);
    const C = Math.hypot(v[1], v[2]), hg = Math.atan2(g[2], g[1]);
    const hued = smoothstep(0.012, 0.05, C);
    let d = Math.atan2(v[2], v[1]) - hg;
    d = Math.atan2(Math.sin(d), Math.cos(d));
    const near = hued * Math.exp(-d * d / 0.5);
    const h = hg + hued * (d + (d < 0 ? -1 : 1) * 0.26 * near);
    const L = lerp(0.66, 0.8, smoothstep(0.3, 0.85, v[0])) + 0.04 * near;
    const pure = C * lerp(1, 1.33, hued) + 0.03 * near;
    return lch(L, lerp(0.085, 0.15 * Math.tanh(pure / 0.15), hued), h);
  }
  // tinge(a, b, t): the light a turned towards the light b.  Two lights are
  // not mixed like two pigments: between a blue and an orange lies a grey,
  // and a grey light is a haze.  The hue goes round the colour circle the
  // short way (blue, violet, rose, orange: a sky warming), lightness and
  // chroma go straight.
  function tinge(a, b, t) {
    const A = lab(a), B = lab(b);
    const ca = Math.hypot(A[1], A[2]), cb = Math.hypot(B[1], B[2]);
    const ha = Math.atan2(A[2], A[1]);
    let d = Math.atan2(B[2], B[1]) - ha;
    d = Math.atan2(Math.sin(d), Math.cos(d));
    return lch(lerp(A[0], B[0], t), lerp(ca, cb, t), ha + d * t);
  }
  // shine(ground, light, amount, cover): what one sees where that much
  // (0..1) of a light falls on the ground; cover (0..1, default: the amount)
  // is how much of the place something stands in: where there is more of
  // that than of light, it is a silhouette, a shade darker than the ground.
  // Light adds up as light does (luminance: the cube of OKLab's lightness),
  // so a little of it hardly shows (a glow ends in the navy itself, not in a
  // grey haze) and it gathers where there is much.  The colour is not mixed
  // towards the light's (between a navy and an orange lies a dirty grey): the
  // ground's own colour leaves as the light comes, and the light's hue is
  // there before its brightness is (an ember: dark, but already orange: at
  // SHINE.ember of the full lightness it has all its chroma); on the way a
  // light from the other side of the colour circle bows out round the grey,
  // by the warm side when it can (navy, plum, ember, orange: how a sky goes
  // dark).  Colours outside sRGB give up chroma.  LIGHT_GLSL below is the
  // same for a shader, shineLayer() for a whole canvas.
  //   full   the lightness of a light at which nothing of the ground is left
  //   shade  how much darker than the ground a silhouette is, at most
  //   top    the lightest anything gets (the page's text is lighter)
  //   bow    how far the path bows out round the grey, in the light's chroma
  //   ember  the share of `full` at which a light has all its chroma
  const SHINE = { full: 0.76, shade: 0.15, top: 0.85, bow: 0.2, ember: 0.9 };
  function shine(ground, light, amount, cover) {
    const k = clamp(amount, 0, 1), g = lab(ground);
    const v = lab(light.map(function(x) { return x * k; }));
    const s = clamp(v[0] / SHINE.full, 0, 1), t = Math.pow(s, 1.5);
    const shade = clamp((cover === undefined ? k : cover) - s, 0, 1);
    const L = Math.min(SHINE.top, Math.cbrt(Math.pow(g[0] * (1 - SHINE.shade * shade), 3) + Math.pow(v[0], 3)));
    const keep = (1 - t) * (1 - t), cg = Math.hypot(g[1], g[2]) || 1e-6, cv = Math.hypot(v[1], v[2]);
    let dh = Math.atan2(v[2], v[1]) - Math.atan2(g[2], g[1]);
    dh = Math.atan2(Math.sin(dh), Math.cos(dh));
    // which side to pass the grey on: the light's own, the warm one if it is nearly opposite
    const side = dh >= 0 ? 1 : lerp(1, -1, smoothstep(0.3, 0.8, Math.PI + dh));
    const far = (1 - Math.cos(dh)) / 2;
    // the light's own chroma, as it would be at full strength: an ember has most of it already
    const pure = Math.min(0.3, cv / Math.max(s, 0.05));
    const bow = SHINE.bow * pure * side * far * far * 6.75 * t * keep;
    const w = pure * Math.pow(smoothstep(0, SHINE.ember, s), 0.9) / Math.max(cv, 1e-6);
    const a = g[1] * keep + v[1] * w - g[2] / cg * bow, b = g[2] * keep + v[2] * w + g[1] / cg * bow;
    return lch(L, Math.hypot(a, b), Math.atan2(b, a));
  }
  // The same in GLSL: vec3 shine(vec3 ground, vec4 light) with the ground in
  // sRGB and the light premultiplied (rgb: its colour times how much of it,
  // a: how much of the place is covered, by light or by something black).
  const LIGHT_GLSL = `
    vec3 lightLinear(vec3 c) { return mix(c / 12.92, pow((c + .055) / 1.055, vec3(2.4)), step(.04045, c)); }
    vec3 lightGamma(vec3 c) {
      c = clamp(c, 0., 1.);
      return mix(c * 12.92, 1.055 * pow(c, vec3(1. / 2.4)) - .055, step(.0031308, c));
    }
    vec3 oklab(vec3 c) {
      vec3 r = lightLinear(clamp(c, 0., 1.));
      vec3 lms = pow(max(vec3(
        dot(r, vec3(.4122214708, .5363325363, .0514459929)),
        dot(r, vec3(.2119034982, .6806995451, .1073969566)),
        dot(r, vec3(.0883024619, .2817188376, .6299787005))), 0.), vec3(1. / 3.));
      return vec3(
        dot(lms, vec3(.2104542553, .7936177850, -.0040720468)),
        dot(lms, vec3(1.9779984951, -2.4285922050, .4505937099)),
        dot(lms, vec3(.0259040371, .7827717662, -.8086757660)));
    }
    vec3 oklabLinear(vec3 v) {
      vec3 lms = vec3(
        v.x + .3963377774 * v.y + .2158037573 * v.z,
        v.x - .1055613458 * v.y - .0638541728 * v.z,
        v.x - .0894841775 * v.y - 1.2914855480 * v.z);
      lms = lms * lms * lms;
      return vec3(
        dot(lms, vec3(4.0767416621, -3.3077115913, .2309699292)),
        dot(lms, vec3(-1.2684380046, 2.6097574011, -.3413193965)),
        dot(lms, vec3(-.0041960863, -.7034186147, 1.7076147010)));
    }
    float lightFits(vec3 c) { return step(-.0005, min(c.r, min(c.g, c.b))) * step(max(c.r, max(c.g, c.b)), 1.0005); }
    vec3 shine(vec3 ground, vec4 light) {
      vec3 g = oklab(ground), v = oklab(light.rgb);
      float s = clamp(v.x / ${SHINE.full.toFixed(3)}, 0., 1.), t = s * sqrt(s);
      float shade = clamp(light.a - s, 0., 1.);
      float gl = g.x * (1. - ${SHINE.shade.toFixed(3)} * shade);
      float L = min(${SHINE.top.toFixed(3)}, pow(gl * gl * gl + v.x * v.x * v.x, 1. / 3.));
      float keep = (1. - t) * (1. - t), cg = max(length(g.yz), 1e-6), cv = length(v.yz);
      // (a light without colour, no light at all included, takes hue 0 as in
      // shine() above: atan(0, 0) is undefined in GLSL, and on iOS it is NaN,
      // which drew the paper black wherever nothing had painted in yet)
      vec2 ug = g.yz / cg, uv = cv > 1e-6 ? v.yz / cv : vec2(1., 0.);
      float dh = atan(ug.x * uv.y - ug.y * uv.x, dot(ug, uv));
      float side = dh >= 0. ? 1. : mix(1., -1., smoothstep(.3, .8, 3.14159265 + dh));
      float far = .5 - .5 * cos(dh);
      float pure = min(.3, cv / max(s, .05));
      float bow = ${SHINE.bow.toFixed(3)} * pure * side * far * far * 6.75 * t * keep;
      vec2 ab = g.yz * keep + uv * pure * pow(smoothstep(0., ${SHINE.ember.toFixed(3)}, s), .9) + vec2(-ug.y, ug.x) * bow;
      vec3 c = oklabLinear(vec3(L, ab));
      if (lightFits(c) < .5) {
        float lo = 0., hi = 1.;
        for (int i = 0; i < 7; i++) {
          float m = .5 * (lo + hi);
          if (lightFits(oklabLinear(vec3(L, ab * m))) > .5) lo = m; else hi = m;
        }
        c = oklabLinear(vec3(L, ab * lo));
      }
      return lightGamma(c);
    }
  `;
  // the mean of colours in OKLab, by weight
  function blend(colors, weights) {
    const sum = [0, 0, 0];
    let total = 0;
    colors.forEach(function(c, i) {
      const w = weights ? weights[i] : 1, v = lab(c);
      sum[0] += v[0] * w; sum[1] += v[1] * w; sum[2] += v[2] * w;
      total += w;
    });
    return total > 0 ? rgb(sum.map(function(v) { return v / total; })) : null;
  }
  function toHex(rgb) {
    return '#' + rgb.map(function(v) {
      return Math.round(clamp(v, 0, 1) * 255).toString(16).padStart(2, '0');
    }).join('');
  }

  // WebGL boilerplate for variants that want it.
  const glutil = {
    program: function(gl, vertexSource, fragmentSource) {
      const program = gl.createProgram();
      [[gl.VERTEX_SHADER, vertexSource], [gl.FRAGMENT_SHADER, fragmentSource]].forEach(function(pair) {
        const shader = gl.createShader(pair[0]);
        gl.shaderSource(shader, pair[1]);
        gl.compileShader(shader);
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
          throw new Error('shader: ' + gl.getShaderInfoLog(shader));
        }
        gl.attachShader(program, shader);
      });
      gl.linkProgram(program);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        throw new Error('program: ' + gl.getProgramInfoLog(program));
      }
      return program;
    },
    // A quad covering the canvas, bound to the vec2 attribute `name` (-1..1).
    quad: function(gl, program, name) {
      const buffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
      const location = gl.getAttribLocation(program, name || 'a_position');
      gl.enableVertexAttribArray(location);
      gl.vertexAttribPointer(location, 2, gl.FLOAT, false, 0, 0);
      return buffer;
    },
    // A texture from a canvas/image (e.g. a 2D canvas drawn off screen).
    texture: function(gl, source, texture) {
      texture = texture || gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      return texture;
    }
  };

  // shineLayer(canvas, ground): develops a 2D canvas that was painted with
  // light (as a shader's layer is: premultiplied, the colour the light, the
  // alpha how much of the place is taken; paint it with `lighter` and
  // overlaps add up) into what shows on the ground, in place.  Afterwards the
  // canvas is an ordinary layer: drawn over the ground it gives shine() for
  // every pixel, and nothing where nothing was.  One shared WebGL canvas off
  // screen does it, in strips where the layer is wider than it may be.
  // Returns false, and leaves the layer as it was (the lights as plain
  // colour), without WebGL.
  const DEVELOP = `
    #ifdef GL_FRAGMENT_PRECISION_HIGH
    precision highp float;
    #else
    precision mediump float;
    #endif
    uniform sampler2D u_layer;
    uniform vec2 u_size;
    uniform vec3 u_ground;
    ${LIGHT_GLSL}
    void main() {
      vec4 light = texture2D(u_layer, gl_FragCoord.xy / u_size);
      if (light.a < .002) { gl_FragColor = vec4(0.); return; }
      vec3 d = shine(u_ground, light) - u_ground;
      // the least alpha that can carry this colour over the ground, and some more
      vec3 room = mix(u_ground, 1. - u_ground, step(0., d));
      vec3 need = abs(d) / max(room, vec3(.001));
      float a = clamp(1.25 * max(need.r, max(need.g, need.b)) + .004, 0., 1.);
      gl_FragColor = vec4((u_ground + d / a) * a, a);
    }
  `;
  let developer = null;
  function shineLayer(canvas, ground) {
    const w = canvas.width, h = canvas.height;
    if (!w || !h) return true;
    try {
      if (!developer) {
        const stage = document.createElement('canvas');
        const gl = stage.getContext('webgl', { alpha: true, antialias: false, depth: false, stencil: false });
        if (!gl) return false;
        const program = glutil.program(gl, 'attribute vec2 a_position; void main() { gl_Position = vec4(a_position, 0., 1.); }', DEVELOP);
        gl.useProgram(program);
        glutil.quad(gl, program, 'a_position');
        developer = {
          stage: stage, gl: gl, texture: gl.createTexture(), strip: null,
          max: Math.min(gl.getParameter(gl.MAX_TEXTURE_SIZE) || 2048, 4096),
          size: gl.getUniformLocation(program, 'u_size'), ground: gl.getUniformLocation(program, 'u_ground')
        };
        gl.uniform1i(gl.getUniformLocation(program, 'u_layer'), 0);
        stage.addEventListener('webglcontextlost', function() { developer = null; });
      }
      const dev = developer, gl = dev.gl, ctx = canvas.getContext('2d');
      if (h > dev.max) return false;
      const tw = Math.min(w, dev.max);
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalAlpha = 1;
      for (let x = 0; x < w; x += tw) {
        const cw = Math.min(tw, w - x);
        let source = canvas;
        if (cw !== w) {
          if (!dev.strip) dev.strip = document.createElement('canvas');
          source = dev.strip;
          source.width = cw;
          source.height = h;
          const sg = source.getContext('2d');
          sg.globalCompositeOperation = 'copy';
          sg.drawImage(canvas, -x, 0);
        }
        if (dev.stage.width !== cw) dev.stage.width = cw;
        if (dev.stage.height !== h) dev.stage.height = h;
        gl.viewport(0, 0, cw, h);
        gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
        glutil.texture(gl, source, dev.texture);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.uniform2f(dev.size, cw, h);
        gl.uniform3f(dev.ground, ground[0], ground[1], ground[2]);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        if (gl.isContextLost()) throw new Error('context lost');
        ctx.globalCompositeOperation = 'source-over';
        ctx.clearRect(x, 0, cw, h);
        ctx.drawImage(dev.stage, x, 0);
      }
      ctx.restore();
      if (dev.strip) dev.strip.width = dev.strip.height = 0;
      return true;
    } catch (error) {
      console.warn('art: no light for the layer', error);
      developer = null;
      return false;
    }
  }

  const util = {
    hash: hash, rng: rng, clamp: clamp, lerp: lerp, smoothstep: smoothstep,
    noise1: noise1, noise2: noise2, fbm2: fbm2,
    hex: hex, css: css, mix: mix, hsl: hsl, toHex: toHex, gl: glutil,
    lab: lab, rgb: rgb, lch: lch, lightness: lightness, chroma: chroma, relight: relight,
    saturate: saturate, tone: tone, blend: blend, gouache: gouache,
    glow: glow, tinge: tinge, shine: shine, shineLayer: shineLayer, LIGHT_GLSL: LIGHT_GLSL
  };

  // The page's colours, as [r, g, b], read from style-2025.css (its custom
  // properties are light-dark() pairs, resolved here for each theme), so the
  // artwork has no colours of its own for the page.  FALLBACK is only for a
  // page without the stylesheet.
  const CSS_COLORS = {
    paper: '--background-color', ink: '--text-color', primary: '--primary-color',
    secondary: '--secondary-color', header: '--header-color', faded: '--faded-color',
    border: '--border-color'
  };
  const FALLBACK_COLORS = {
    light: {
      paper: '#ffffff', ink: '#000000', primary: '#115ca1', secondary: '#cd0e0e',
      header: '#1b3156', faded: '#7b8894', border: '#adbac7'
    },
    dark: {
      paper: '#1b3156', ink: '#dce7f3', primary: '#66b3ff', secondary: '#ff6666',
      header: '#96afda', faded: '#aec3d6', border: '#819bb4'
    }
  };
  function cssColors(scheme) {
    const out = {}, root = getComputedStyle(document.documentElement);
    const probe = document.createElement('span');
    probe.style.cssText = 'display:none;color-scheme:' + scheme;
    (document.body || document.documentElement).appendChild(probe);
    Object.keys(CSS_COLORS).forEach(function(key) {
      let value = null;
      if (root.getPropertyValue(CSS_COLORS[key]).trim()) {
        probe.style.color = 'var(' + CSS_COLORS[key] + ')';
        const text = getComputedStyle(probe).color, n = (text.match(/-?[\d.]+/g) || []).map(Number);
        // rgb(r, g, b) in 0..255, or color(srgb r g b) in 0..1
        if (n.length >= 3) value = /^color\(/.test(text) ? n.slice(0, 3) : n.slice(0, 3).map(function(v) { return v / 255; });
      }
      out[key] = value || hex(FALLBACK_COLORS[scheme][key]);
    });
    probe.remove();
    return out;
  }
  // What the artwork draws with besides: all of it derived from the page's
  // colours in OKLab.  The blues take the hue of --header-color (the navy of
  // the dark paper); the numbers are lightness and chroma.
  //   graphite  the pencil: dark blue-grey on white, chalk on navy
  //   chalk     white pencil and chalk on the navy paper
  //   shade     deep blue-grey, for shadow and bleakness
  //   sky       the pale blue of a clear sky on white paper
  //   mist      what mist is on the navy paper
  const palettes = {};
  function palette(dark) {
    const scheme = dark ? 'dark' : 'light';
    if (palettes[scheme]) return copy(palettes[scheme]);
    const p = cssColors(scheme);
    const navy = dark ? p.paper : p.header;
    p.chalk = dark ? relight(p.ink, 0.95, 0.8) : p.paper.slice();
    p.graphite = dark ? relight(p.ink, 0.94) : tone(navy, 0.32, 0.026);
    p.shade = tone(navy, dark ? 0.19 : 0.28, dark ? 0.043 : 0.032);
    p.sky = tone(navy, 0.755, 0.052);
    p.mist = tone(navy, 0.89, 0.036);
    palettes[scheme] = p;
    return copy(p);
  }
  function copy(p) {
    const out = {};
    Object.keys(p).forEach(function(key) { out[key] = p[key].slice(); });
    return out;
  }

  // ---- tags and posts ----------------------------------------------------

  function loadData(value) { data = value; }

  // What a tag means.  Tags the table does not know get stable values from
  // their name, so a new tag works before anyone describes it.
  function tag(name) {
    const known = data.tags[name] || {};
    const r = rng('tag:' + name);
    // the same lightness and chroma for every hue (hsl would make a yellow
    // light and a blue dark)
    const fallbackColor = toHex(lch(0.55, 0.11, r() * 2 * Math.PI));
    return {
      name: name,
      known: !!known.role,
      role: known.role || 'subject',
      pigment: known.pigment || 'unnamed',
      color: known.color || fallbackColor,
      rgb: hex(known.color || fallbackColor),
      loose: known.loose !== undefined ? known.loose : 0.3 + 0.4 * r(),
      energy: known.energy !== undefined ? known.energy : 0.3 + 0.4 * r(),
      note: known.note || '',
      count: known.count || 0,
      x: known.x !== undefined ? known.x : r(),
      y: known.y !== undefined ? known.y : r(),
      near: known.near || []
    };
  }

  function parseShape(text) {
    if (!text) return [];
    return text.split(' ').map(function(token) {
      return { t: token[0], n: parseInt(token.slice(1), 10) || 0 };
    });
  }

  // The facets of a post: what a classifier model said about its text (see
  // ART.md).  A choice facet is { top, p, mix }: the most likely label, its
  // probability, and every label's probability.  A score facet is a number in
  // 0..1, or null when the post has none.
  function parseFacets(value) {
    let raw = value || {};
    if (typeof raw === 'string') {
      try { raw = JSON.parse(raw); } catch (error) { raw = {}; }
    }
    const facets = { known: false };
    const names = Object.keys(data.facets || {}).concat(Object.keys(raw));
    names.forEach(function(name) {
      if (name in facets) return;
      const definition = (data.facets || {})[name];
      const given = raw[name];
      const choice = definition ? definition.type === 'choice' : typeof given === 'object';
      if (choice) {
        const mix = {};
        let top = null, p = 0;
        Object.keys(given || {}).forEach(function(label) {
          mix[label] = +given[label] || 0;
          if (mix[label] > p) { top = label; p = mix[label]; }
        });
        facets[name] = { top: top, p: p, mix: mix };
        if (top) facets.known = true;
      } else {
        facets[name] = typeof given === 'number' ? clamp(given, 0, 1) : null;
        if (facets[name] !== null) facets.known = true;
      }
    });
    return facets;
  }

  // Turns a page's record ({kind, slug, title, date, tags, shape, links, facets}) into
  // what a variant draws from.  Deterministic: same record, same result.
  function describe(record) {
    record = record || {};
    const names = (Array.isArray(record.tags) ? record.tags : String(record.tags || '').split(/[\s,]+/))
      .filter(Boolean);
    const total = Math.max(data.total || 0, 2);
    const tags = names.map(function(name, order) {
      const t = tag(name);
      t.order = order;
      // rarity: a tag on most posts says little, a rare one says a lot
      t.idf = Math.log((total + 1) / Math.max(t.count, 1));
      return t;
    });
    const sum = tags.reduce(function(acc, t) { return acc + t.idf; }, 0) || 1;
    tags.forEach(function(t) { t.weight = t.idf / sum; });
    tags.sort(function(a, b) { return b.weight - a.weight || a.order - b.order; });

    const role = function(name) { return tags.filter(function(t) { return t.role === name; }); };
    const average = function(list, key) {
      return list.reduce(function(acc, t) { return acc + t[key]; }, 0) / list.length;
    };
    const register = role('register'), subject = role('subject'), project = role('project');
    // The hand: register tags decide it, the others only colour it.
    const hand = { loose: 0.5, energy: 0.4 };
    ['loose', 'energy'].forEach(function(key) {
      if (register.length && tags.length > register.length) {
        hand[key] = 0.7 * average(register, key) + 0.3 * average(tags, key);
      } else if (tags.length) {
        hand[key] = average(tags, key);
      }
    });

    // What the classifier read in the post itself outweighs the tags' defaults.
    const facets = parseFacets(record.facets);
    if (facets.wander !== null && facets.wander !== undefined) hand.loose = lerp(hand.loose, facets.wander, 0.6);
    if (facets.energy !== null && facets.energy !== undefined) hand.energy = lerp(hand.energy, facets.energy, 0.6);

    const slug = record.slug || '';
    const seed = hash(slug + '|' + (record.salt || ''));
    const date = record.date ? new Date(record.date + 'T00:00:00Z') : null;
    const shape = parseShape(record.shape);
    const stats = { words: 0, code: 0, headings: 0, blocks: shape.length, links: +record.links || 0 };
    shape.forEach(function(block) {
      if (block.t === 'p' || block.t === 'q') stats.words += block.n;
      else if (block.t === 'c') stats.code += block.n;
      else if (block.t === 'h') stats.headings += 1;
    });

    return {
      kind: record.kind || 'index',   // post | page | tag | index
      slug: slug,
      title: record.title || '',
      date: date,
      year: date ? date.getUTCFullYear() : null,
      age: date ? Math.max(0, (Date.now() - date.getTime()) / 31557600000) : 0,   // years
      // 0..1 through the year: 0 is new year, 0.5 the end of June (Austria: midsummer)
      season: date ? (date.getTime() - Date.UTC(date.getUTCFullYear(), 0, 1)) / 31557600000 : null,
      seed: seed,
      rng: function(label) { return rng(hash(seed + ':' + (label || ''))); },
      tags: tags,                     // loudest (rarest) first, weights sum to 1
      lead: tags.slice(0, 5),         // the ones that get their own voice
      rest: tags.slice(5),            // the ones that only tint
      register: register, subject: subject, project: project,
      loose: hand.loose, energy: hand.energy,
      shape: shape, stats: stats,
      facets: facets,
      // facet helpers: a score with a fallback, the probability of one label,
      // the top label if the classifier was at least `sure` of it
      score: function(name, fallback) {
        const value = facets[name];
        return typeof value === 'number' ? value : (fallback === undefined ? 0.5 : fallback);
      },
      share: function(name, label) {
        const facet = facets[name];
        return facet && facet.mix ? facet.mix[label] || 0 : 0;
      },
      top: function(name, sure) {
        const facet = facets[name];
        return facet && facet.top && facet.p >= (sure === undefined ? 0.5 : sure) ? facet.top : null;
      },
      key: [record.kind, slug, names.join(','), record.salt || '', JSON.stringify(record.facets || '')].join('|')
    };
  }

  // ---- theme -------------------------------------------------------------

  function systemDark() {
    const theme = document.documentElement.getAttribute('data-theme');
    if (theme === 'dark') return true;
    if (theme === 'light') return false;
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  }

  // The bands are redrawn at once, not on the next animation frame: the
  // observer runs as a microtask after data-theme is set, the media query
  // listener before the frame's style and paint, so the bands change in the
  // same frame as the page.  Inside a view transition (see selectTheme in
  // layout.html) that puts the new bands into the new snapshot.
  function themeChanged() {
    mounts.forEach(function(m) { m.themeChanged(); });
  }
  new MutationObserver(themeChanged)
    .observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', themeChanged);
  document.addEventListener('visibilitychange', function() {
    if (!document.hidden) mounts.forEach(function(m) { m.wake(); });
  });

  function effectiveDpr() {
    const dpr = window.devicePixelRatio || 1;
    return dpr <= 1 ? 1.5 : dpr;    // supersample low-DPI screens for smoother edges
  }

  // ---- mounting ----------------------------------------------------------

  // What a mount draws when the variant it asks for is not there (a shelved
  // one, remembered by a browser): the blog's look.
  const FALLBACK = 'ridgeline';

  function register(name, definition) {
    variants.set(name, { name: name, title: definition.title || name, create: definition.create });
    mounts.forEach(function(m) {
      if (m.variant !== name && (m.wanted === name || (m.wanted !== m.variant && name === FALLBACK))) m.setVariant(m.wanted);
    });
  }

  // A variant made of two others: one draws the header, the other the footer.
  // Each gets an env with only its own band (the other is null) and is driven
  // as if it were the only one; frame() asks again as soon as either does.
  //
  //   LucumrArt.combine('ridgeline', { title, header: 'strata', footer: 'sketchbook' })
  function combine(name, options) {
    register(name, {
      title: options.title,
      create: function(env) {
        const parts = [];
        ['header', 'footer'].forEach(function(kind) {
          const surface = env[kind], definition = variants.get(options[kind]);
          if (!surface) return;
          if (!definition) {
            console.error('art variant "' + name + '": no variant "' + options[kind] + '" for the ' + kind);
            return;
          }
          const sub = {
            surfaces: [surface],
            header: kind === 'header' ? surface : null,
            footer: kind === 'footer' ? surface : null,
            get dark() { return env.dark; },
            get still() { return env.still; },
            palette: env.palette,
            invalidate: env.invalidate,
            util: env.util
          };
          parts.push({ name: definition.name, instance: definition.create(sub) || {} });
        });
        const each = function(method, args) {
          let result = false;
          parts.forEach(function(part) {
            const fn = part.instance[method];
            if (!fn) return;
            let more = false;
            try {
              more = fn.apply(part.instance, args);
            } catch (error) {
              console.error('art variant "' + part.name + '" (in "' + name + '") failed in ' + method + '()', error);
            }
            // the sooner of the two: true (now) before seconds before false (never)
            if (more === true || result === true) result = true;
            else if (typeof more === 'number') result = typeof result === 'number' ? Math.min(result, more) : more;
          });
          return result;
        };
        return {
          setPost: function() { each('setPost', arguments); },
          resize: function() { each('resize', arguments); },
          setTheme: function() { each('setTheme', arguments); },
          frame: function() { return each('frame', arguments); },
          destroy: function() { each('destroy', arguments); }
        };
      }
    });
  }

  // mount({ header, footer, variant, post, theme, still })
  //   header/footer: the container elements (.header-image / .footer-image)
  //   post: a record (see describe);  theme: 'auto' | 'light' | 'dark'
  //   still: draw the finished picture at once, no animation
  function mount(options) {
    const surfaces = [];
    let instance = null;
    let raf = 0;
    let timer = 0;
    let last = 0;
    let parked = false;
    let shownDark = null;   // the theme the bands were last told about
    let post = describe(options.post);
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');

    const dark = function() {
      return options.theme === 'dark' ? true : options.theme === 'light' ? false : systemDark();
    };
    const visible = function() { return surfaces.some(function(s) { return s.visible; }); };

    // frame() returns true (the next frame), a number (seconds until the
    // next one: ambient motion at a low rate) or false (done until something
    // changes).  A timer waits out the seconds, then the frame is aligned to
    // the display again.
    function tick(now) {
      raf = 0;
      if (!instance || !instance.frame) return;
      if (document.hidden || !visible()) { parked = true; return; }
      const dt = Math.min(0.1, last ? (now - last) / 1000 : 0.016);
      last = now;
      let more = false;
      try {
        more = instance.frame(now / 1000, dt);
      } catch (error) {
        console.error('art variant "' + m.variant + '" failed in frame()', error);
      }
      if (more === true || (typeof more === 'number' && more < 0.012)) {
        raf = requestAnimationFrame(tick);
      } else if (typeof more === 'number' && more > 0) {
        // (the timer wakes half a frame early, so that the frame it asks for
        // is the one due, not the one after: else the rate stumbles, five
        // display frames apart and then six)
        timer = setTimeout(function() {
          timer = 0;
          if (!raf) raf = requestAnimationFrame(tick);
        }, Math.max(0, Math.min(more, 600) * 1000 - 8));
      } else {
        last = 0;
      }
    }
    function invalidate() {
      parked = false;
      if (timer) { clearTimeout(timer); timer = 0; }
      if (!raf) raf = requestAnimationFrame(tick);
    }
    // Every change (post, size, theme) is followed by a frame.
    function call(method) {
      if (!instance) return;
      if (instance[method]) {
        try {
          instance[method].apply(instance, Array.prototype.slice.call(arguments, 1));
        } catch (error) {
          console.error('art variant "' + m.variant + '" failed in ' + method + '()', error);
        }
      }
      invalidate();
    }

    function measure(surface) {
      const dpr = effectiveDpr();
      const width = surface.el.clientWidth, height = surface.el.clientHeight;
      const changed = width !== surface.width || height !== surface.height || dpr !== surface.dpr;
      surface.width = width;
      surface.height = height;
      surface.dpr = dpr;
      if (surface.canvas) {
        const w = Math.max(1, Math.round(width * dpr)), h = Math.max(1, Math.round(height * dpr));
        if (surface.canvas.width !== w) surface.canvas.width = w;
        if (surface.canvas.height !== h) surface.canvas.height = h;
      }
      return changed;
    }

    const resizes = new ResizeObserver(function() {
      let changed = false;
      surfaces.forEach(function(s) { changed = measure(s) || changed; });
      if (changed) call('resize');
    });
    // A band that comes into view gets a frame: a variant may have skipped it
    // while it was off screen, and may have stopped animating since.
    const sightings = new IntersectionObserver(function(entries) {
      let appeared = false;
      entries.forEach(function(entry) {
        const surface = surfaces.find(function(s) { return s.el === entry.target; });
        if (!surface) return;
        if (entry.isIntersecting && !surface.visible) appeared = true;
        surface.visible = entry.isIntersecting;
      });
      if (appeared || (parked && visible())) invalidate();
    }, { threshold: 0 });

    ['header', 'footer'].forEach(function(kind) {
      const el = options[kind];
      if (!el) return;
      surfaces.push({ kind: kind, el: el, canvas: null, width: 0, height: 0, dpr: 1, visible: true });
      resizes.observe(el);
      sightings.observe(el);
    });

    function teardown() {
      if (raf) cancelAnimationFrame(raf);
      if (timer) clearTimeout(timer);
      raf = timer = 0;
      if (instance && instance.destroy) {
        try { instance.destroy(); } catch (error) { console.error(error); }
      }
      instance = null;
      surfaces.forEach(function(s) {
        if (s.canvas) s.canvas.remove();
        s.canvas = null;
      });
    }

    const m = {
      wanted: null,     // the variant asked for (it may register later)
      variant: null,    // the variant running
      get post() { return post; },
      get surfaces() { return surfaces; },

      setVariant: function(name) {
        m.wanted = name;
        const definition = variants.get(name) || variants.get(FALLBACK) || variants.get('classic');
        teardown();
        if (!definition) { m.variant = null; return; }
        m.variant = definition.name;
        shownDark = dark();
        // A canvas keeps the first kind of context it gave out, so every
        // variant starts from fresh ones.
        surfaces.forEach(function(s) {
          s.canvas = document.createElement('canvas');
          s.el.appendChild(s.canvas);
          measure(s);
        });
        const env = {
          surfaces: surfaces,
          header: surfaces.find(function(s) { return s.kind === 'header'; }) || null,
          footer: surfaces.find(function(s) { return s.kind === 'footer'; }) || null,
          get dark() { return dark(); },
          get still() { return !!options.still || reduced.matches; },
          palette: function() { return palette(dark()); },
          invalidate: invalidate,
          util: util
        };
        try {
          instance = definition.create(env);
        } catch (error) {
          console.error('art variant "' + name + '" failed in create()', error);
          instance = null;
          return;
        }
        call('setPost', post, { initial: true });
      },
      setPost: function(record) {
        const next = describe(record);
        if (next.key === post.key) return;
        post = next;
        call('setPost', post, { initial: false });
      },
      // Only a real change repaints (system and light are the same on a
      // light system), and it draws right away (see themeChanged above).
      themeChanged: function() {
        const now = dark();
        if (now === shownDark) return;
        shownDark = now;
        call('setTheme', now);
        if (!instance) return;
        if (raf) cancelAnimationFrame(raf);
        if (timer) clearTimeout(timer);
        raf = timer = 0;
        tick(performance.now());
      },
      wake: function() { if (parked) invalidate(); },
      destroy: function() {
        teardown();
        resizes.disconnect();
        sightings.disconnect();
        mounts.delete(m);
      }
    };
    mounts.add(m);
    m.setVariant(options.variant || FALLBACK);
    return m;
  }

  return {
    register: register,
    combine: combine,
    mount: mount,
    describe: describe,
    tag: tag,
    palette: palette,
    loadData: loadData,
    util: util,
    get data() { return data; },
    get variants() { return Array.from(variants.values()); }
  };
})();
