// Renders the header artwork of posts for their social preview cards, without
// a browser: the artwork's own scripts (core.js, strata.js, data.js) run with
// a Skia canvas (@napi-rs/canvas) for the browser's 2D canvas and a few stubs
// for the rest of the page.  They run in this process's own global (in a
// worker thread when there are several), not in a vm context: there every
// global (Math) goes through an interceptor and the medium is 50 times slower.
// There is no WebGL here, so strata draws a still picture with its CPU medium
// (see develop() in strata.js).  The cards are light, so only the day is drawn.
//
//   node generator/social_art.js JOB.json
//
// JOB.json: { "static": ".../static", "data": ".../data.js", "width": 1200,
//   "height": 240, "dpr": 2, "items": [{ "record": {...}, "out": "x.png" }] }
// where a record is what generator.art.post_record() gives.  Writes one PNG
// of width*dpr x height*dpr per item and prints a line for each.
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const vm = require('vm');
const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');

const SCRIPTS = ['art/core.js', 'art/strata.js'];

// The page's colours: the light-dark() pairs of style-2025.css, resolved the
// way the browser would (core.js reads them with getComputedStyle).
function cssColors(css) {
  const out = {};
  const re = /(--[\w-]+)\s*:\s*light-dark\(\s*(#[0-9a-fA-F]{3,6})\s*,\s*(#[0-9a-fA-F]{3,6})\s*\)/g;
  let m;
  while ((m = re.exec(css))) out[m[1]] = { light: m[2], dark: m[3] };
  return out;
}

function rgbText(hex) {
  let h = hex.slice(1);
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const n = parseInt(h, 16);
  return `rgb(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255})`;
}

function artwork(job) {
  const { createCanvas, Path2D, ImageData, DOMMatrix } = require('@napi-rs/canvas');
  const colors = cssColors(fs.readFileSync(path.join(job.static, 'style-2025.css'), 'utf8'));
  const noop = () => {};
  const canvas = () => {
    const c = createCanvas(300, 150);
    const get = c.getContext.bind(c);
    // only a 2D context: strata takes the way without WebGL
    c.getContext = (kind, options) => (kind === '2d' ? get('2d', options) : null);
    c.addEventListener = noop;
    c.remove = noop;
    c.style = {};
    return c;
  };
  const element = () => ({ style: {}, remove: noop });
  const root = element();
  root.getAttribute = () => null;
  const sandbox = {
    Path2D, ImageData, DOMMatrix,
    performance: { now: () => 0 },
    requestAnimationFrame: noop, cancelAnimationFrame: noop, setTimeout, clearTimeout,
    MutationObserver: class { observe() {} },
    ResizeObserver: class { observe() {} disconnect() {} },
    IntersectionObserver: class { observe() {} disconnect() {} },
    matchMedia: () => ({ matches: false, addEventListener: noop }),
    getComputedStyle(el) {
      if (el === root) return { getPropertyValue: (name) => (colors[name] ? 'set' : '') };
      // a probe: color-scheme in its cssText, var(--name) as its colour
      const scheme = /color-scheme:\s*dark/.test(el.style.cssText || '') ? 'dark' : 'light';
      const name = /var\((--[\w-]+)\)/.exec(el.style.color || '');
      const pair = name && colors[name[1]];
      return { color: pair ? rgbText(pair[scheme]) : '' };
    },
    document: {
      createElement: (tag) => (tag === 'canvas' ? canvas() : element()),
      documentElement: root,
      body: { appendChild: noop },
      addEventListener: noop,
      hidden: false
    },
    devicePixelRatio: job.dpr
  };
  Object.assign(globalThis, sandbox);
  globalThis.window = globalThis;
  const run = (file) => vm.runInThisContext(fs.readFileSync(file, 'utf8'), { filename: file });
  run(path.join(job.static, SCRIPTS[0]));
  run(job.data);
  run(path.join(job.static, SCRIPTS[1]));
  const A = globalThis.LucumrArt;
  const strata = A.variants.find((v) => v.name === 'strata');

  return function render(record) {
    const surface = { kind: 'header', canvas: canvas(), width: job.width, height: job.height, dpr: job.dpr, visible: true, el: null };
    surface.canvas.width = Math.round(job.width * job.dpr);
    surface.canvas.height = Math.round(job.height * job.dpr);
    const env = {
      surfaces: [surface], header: surface, footer: null, dark: false, still: true,
      palette: () => A.palette(false), invalidate: noop, util: A.util
    };
    const instance = strata.create(env);
    instance.setPost(A.describe(record), { initial: true });
    let more = instance.frame(1, 0.016);
    for (let i = 0; more === true && i < 10; i++) more = instance.frame(1 + i / 60, 1 / 60);
    if (instance.destroy) instance.destroy();
    return surface.canvas.toBuffer('image/png');
  };
}

function work(job, items, report) {
  const render = artwork(job);
  for (const item of items) {
    fs.writeFileSync(item.out, render(item.record));
    report(item.out);
  }
}

if (isMainThread) {
  const job = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
  const count = Math.max(1, Math.min(job.items.length, (os.availableParallelism ? os.availableParallelism() : os.cpus().length) - 1, 8));
  if (count <= 1) {
    work(job, job.items, (out) => console.log(out));
  } else {
    let failed = false;
    const chunks = Array.from({ length: count }, (_, i) => job.items.filter((_, j) => j % count === i));
    chunks.forEach((items) => {
      const worker = new Worker(__filename, { workerData: { job, items } });
      worker.on('message', (out) => console.log(out));
      worker.on('error', (error) => { failed = true; console.error(error); });
      worker.on('exit', (code) => { if (code) failed = true; });
    });
    process.on('exit', () => { if (failed) process.exitCode = 1; });
  }
} else {
  work(workerData.job, workerData.items, (out) => parentPort.postMessage(out));
}
