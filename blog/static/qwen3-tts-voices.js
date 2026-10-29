// Interactive voice samples for /2026/10/29/qwen3-custom-voices/.
// Everything here was rendered ahead of time with Qwen3-TTS (1.7B Base, CustomVoice and
// VoiceDesign); the browser only plays the clips and draws them.  data.json holds the voices'
// speaker embeddings (2048 numbers each), and for every clip its pitch, how alike a speaker
// verification model (WavLM) finds it to each reference voice, and what an emotion classifier
// (HuBERT, IEMOCAP) hears in it.
//
// gender.json holds the gender demo: where the voices sit along the gender direction, and the
// clips of the clone moved along it.  detect.json holds the speaker detection demo: for every
// second of a podcast episode, how alike each method finds it to me, and its transcript.
//
// Placeholders: <div data-qwen-tts="voices|blend|slot|gender|detect"></div>
(function () {
  "use strict";

  if (window.QwenTTSVoicesInit) {
    window.QwenTTSVoicesInit(document);
    return;
  }

  const BASE = "/static/qwen3-tts/";
  const NAMES = { armin: "Armin", designed: "Designed", final: "Final", ryan: "Ryan" };
  const EMOTIONS = { neu: "neutral", hap: "happy", ang: "angry", sad: "sad" };
  let dataPromise = null;
  const loadData = () => (dataPromise ??= fetch(BASE + "data.json").then((r) => r.json()));

  // ---- sound: one clip at a time ----------------------------------------------------------------
  let ac = null;
  const buffers = new Map();
  let playing = null;
  const listeners = new Set();
  const audio = () => (ac ??= new AudioContext());
  function bufferOf(file) {
    if (!buffers.has(file)) {
      buffers.set(file, fetch(BASE + file).then((r) => r.arrayBuffer()).then((b) => audio().decodeAudioData(b)));
    }
    return buffers.get(file);
  }
  function stop() {
    if (playing) {
      try { playing.src.stop(); } catch (e) { /* not started */ }
      playing = null;
    }
  }
  // long audio streams through <audio> elements instead; they pause when a clip plays
  const streams = new Set();
  async function play(file, offset = 0) {
    streams.forEach((s) => s.pause());
    const a = audio();
    if (a.state === "suspended") await a.resume();
    const buffer = await bufferOf(file);
    stop();
    const src = a.createBufferSource();
    src.buffer = buffer;
    src.connect(a.destination);
    const at = a.currentTime + 0.03;
    const p = { src, file, start: at - offset };
    src.onended = () => { if (playing === p) playing = null; };
    src.start(at, offset);
    playing = p;
    pausedAt.delete(file);
    tick();
  }
  // where a clip was paused, to go on from there
  const pausedAt = new Map();
  function pause() {
    if (!playing) return;
    pausedAt.set(playing.file, playedOf(playing.file));
    stop();
    tick();
  }
  // pauses `file` if it is playing, else plays it: from where it was paused, or from `from`
  function toggle(file, from = 0) {
    if (playing && playing.file === file) pause();
    else play(file, pausedAt.get(file) ?? from);
  }
  const playedOf = (file) => (playing && playing.file === file ? Math.max(0, ac.currentTime - playing.start) : null);
  let ticking = false;
  function tick() {
    listeners.forEach((fn) => fn());
    if (playing) {
      ticking = true;
      requestAnimationFrame(tick);
    } else if (ticking) {
      ticking = false;
      listeners.forEach((fn) => fn());
    }
  }

  // ---- spectrograms -----------------------------------------------------------------------------
  function fft(re, im) {
    const n = re.length;
    for (let i = 1, j = 0; i < n; i++) {
      let bit = n >> 1;
      for (; j & bit; bit >>= 1) j ^= bit;
      j ^= bit;
      if (i < j) { [re[i], re[j]] = [re[j], re[i]]; [im[i], im[j]] = [im[j], im[i]]; }
    }
    for (let len = 2; len <= n; len <<= 1) {
      const ang = (-2 * Math.PI) / len, wr = Math.cos(ang), wi = Math.sin(ang);
      for (let i = 0; i < n; i += len) {
        let cr = 1, ci = 0;
        for (let k = 0; k < len / 2; k++) {
          const p = i + k, q = p + len / 2;
          const tr = re[q] * cr - im[q] * ci, ti = re[q] * ci + im[q] * cr;
          re[q] = re[p] - tr; im[q] = im[p] - ti; re[p] += tr; im[p] += ti;
          [cr, ci] = [cr * wr - ci * wi, cr * wi + ci * wr];
        }
      }
    }
  }
  const mel = (hz) => 2595 * Math.log10(1 + hz / 700);
  const unmel = (m) => 700 * (10 ** (m / 2595) - 1);
  const PALETTE = [[7, 9, 16], [52, 22, 92], [150, 40, 110], [240, 100, 50], [255, 210, 110], [255, 250, 225]];
  function paint(v) {
    const x = Math.max(0, Math.min(1, v)) * (PALETTE.length - 1);
    const i = Math.min(PALETTE.length - 2, Math.floor(x)), f = x - i;
    return PALETTE[i].map((c, k) => c + (PALETTE[i + 1][k] - c) * f);
  }
  const pictures = new Map();
  function pictureOf(file, maxHz = 6000) {
    if (!pictures.has(file)) {
      pictures.set(file, bufferOf(file).then((buffer) => {
        const x = buffer.getChannelData(0), rate = buffer.sampleRate;
        const N = rate > 32000 ? 2048 : 1024, hop = Math.round(rate / 100), B = 80;
        const frames = Math.max(1, Math.floor((x.length - N) / hop));
        const edges = Array.from({ length: B + 1 }, (_, i) =>
          Math.round((unmel(mel(50) + ((mel(maxHz) - mel(50)) * i) / B) / rate) * N));
        const win = Float32Array.from({ length: N }, (_, i) => 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / N));
        const db = new Float32Array(frames * B), re = new Float32Array(N), im = new Float32Array(N);
        let top = -Infinity;
        for (let f = 0; f < frames; f++) {
          for (let i = 0; i < N; i++) { re[i] = (x[f * hop + i] || 0) * win[i]; im[i] = 0; }
          fft(re, im);
          for (let b = 0; b < B; b++) {
            const lo = edges[b], hi = Math.max(lo + 1, edges[b + 1]);
            let p = 0;
            for (let k = lo; k < hi; k++) p += re[k] * re[k] + im[k] * im[k];
            const v = 10 * Math.log10(p / (hi - lo) + 1e-12);
            db[f * B + b] = v;
            if (v > top) top = v;
          }
        }
        const img = document.createElement("canvas");
        img.width = frames;
        img.height = B;
        const g = img.getContext("2d"), pix = g.createImageData(frames, B);
        for (let f = 0; f < frames; f++) {
          for (let b = 0; b < B; b++) {
            const [r, gg, bb] = paint((db[f * B + b] - top + 70) / 70), o = ((B - 1 - b) * frames + f) * 4;
            pix.data[o] = r; pix.data[o + 1] = gg; pix.data[o + 2] = bb; pix.data[o + 3] = 255;
          }
        }
        g.putImageData(pix, 0, 0);
        return { img, seconds: buffer.duration };
      }));
    }
    return pictures.get(file);
  }

  // a canvas that follows its box's width, drawn by `draw(g, w, h)` when needed
  function makeCanvas(parent, height, draw) {
    const c = document.createElement("canvas");
    c.className = "qtts__canvas";
    c.style.height = height + "px";
    parent.appendChild(c);
    const g = c.getContext("2d");
    let busy = false, again = false;
    async function redraw() {
      if (busy) { again = true; return; }
      busy = true;
      const dpr = window.devicePixelRatio || 1, w = c.clientWidth || 600;
      if (c.width !== Math.round(w * dpr)) { c.width = Math.round(w * dpr); c.height = Math.round(height * dpr); }
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      try { await draw(g, w, height); } finally { busy = false; }
      if (again) { again = false; redraw(); }
    }
    listeners.add(redraw);
    window.addEventListener("resize", redraw);
    return { c, redraw };
  }

  // a clip's spectrogram with a play head; `span` keeps clips side by side to the same time scale
  function spectrogram(parent, height, fileOf, spanOf) {
    const view = makeCanvas(parent, height, async (g, w, h) => {
      const file = fileOf();
      g.fillStyle = "#070910";
      g.fillRect(0, 0, w, h);
      if (!file) return;
      const p = await pictureOf(file);
      if (file !== fileOf()) return;
      const pw = spanOf ? w * Math.min(1, p.seconds / spanOf()) : w;
      g.fillStyle = "#070910";
      g.fillRect(0, 0, w, h);
      g.imageSmoothingEnabled = true;
      g.drawImage(p.img, 0, 0, pw, h);
      const at = playedOf(file);
      if (at != null && at <= p.seconds) {
        g.fillStyle = "rgba(255,255,255,0.85)";
        g.fillRect((at / p.seconds) * pw - 1, 0, 2, h);
      }
    });
    view.c.style.cursor = "pointer";
    view.c.addEventListener("click", () => fileOf() && toggle(fileOf()));
    return view;
  }

  // a fingerprint: 2048 numbers as 64 x 32 squares, orange above zero, blue below
  function drawPrint(g, x, y, w, h, values) {
    const cols = 64, rows = Math.ceil(values.length / cols);
    const s = [...values].map(Math.abs).sort((a, b) => a - b)[Math.floor(values.length * 0.97)];
    const cw = w / cols, ch = h / rows;
    for (let i = 0; i < values.length; i++) {
      const v = Math.max(-1, Math.min(1, values[i] / s)), a = Math.abs(v);
      g.fillStyle = v >= 0
        ? `rgb(${30 + 225 * a},${30 + 108 * a},${40 * (1 - a) + 20})`
        : `rgb(${30 * (1 - a) + 20},${30 + 181 * a},${40 + 215 * a})`;
      g.fillRect(x + (i % cols) * cw, y + Math.floor(i / cols) * ch, Math.ceil(cw), Math.ceil(ch));
    }
  }
  // as in the post: the weighted average, scaled to the weighted length
  function blendPrints(a, b, t) {
    const len = (v) => Math.hypot(...v);
    const m = a.map((x, i) => (1 - t) * x + t * b[i]);
    const want = (1 - t) * len(a) + t * len(b), have = len(m);
    return m.map((v) => (v / have) * want);
  }

  // ---- little DOM helpers -----------------------------------------------------------------------
  function el(parent, tag, cls, text) {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    if (parent) parent.appendChild(n);
    return n;
  }
  function button(parent, label, onclick, cls = "") {
    const b = el(parent, "button", "qtts__button " + cls, label);
    b.type = "button";
    b.addEventListener("click", onclick);
    return b;
  }
  // a play button that turns into a pause button while its clip plays
  // the play/pause buttons show an icon only (SVG: text arrows turn into emoji on some phones)
  const ICONS = {
    play: '<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M3 1.5v9l7.5-4.5z" fill="currentColor"/></svg>',
    pause: '<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M2.5 1.5h2.5v9h-2.5zM7 1.5h2.5v9h-2.5z" fill="currentColor"/></svg>',
  };
  function showPlaying(b, on) {
    const icon = on ? "pause" : "play";
    if (b.dataset.icon === icon) return;
    b.dataset.icon = icon;
    b.innerHTML = ICONS[icon];
    b.setAttribute("aria-label", icon);
    b.title = icon;
  }
  // a play/pause button for a clip
  function playButton(parent, fileOf, from = 0) {
    const b = button(parent, "", () => { const f = fileOf(); if (f) toggle(f, from); }, "qtts__play");
    const sync = () => showPlaying(b, playing && playing.file === fileOf());
    listeners.add(sync);
    sync();
    return b;
  }
  function bars(parent, items) {
    const box = el(parent, "div", "qtts__bars");
    const rows = items.map(([label, color]) => {
      const row = el(box, "div", "qtts__bar");
      el(row, "span", "qtts__bar-label", label);
      const track = el(row, "span", "qtts__bar-track");
      const fill = el(track, "span", "qtts__bar-fill");
      fill.style.background = color;
      const value = el(row, "span", "qtts__bar-value");
      return { row, fill, value };
    });
    return (values) => rows.forEach((r, i) => {
      const [v, text, hidden] = values[i];
      r.row.style.display = hidden ? "none" : "";
      r.fill.style.width = Math.max(0, Math.min(1, v)) * 100 + "%";
      r.value.textContent = text;
    });
  }
  // speaker verification scores as bars, from 0.5 (a stranger) to 1.0 (the same recording)
  const likeBar = (v) => [(v - 0.5) / 0.5, v.toFixed(2)];

  // ---- widget: the three voices ------------------------------------------------------------------
  function voices(root, d) {
    const about = {
      armin: "Me, 28 seconds from a conference talk. The reference recording.",
      designed: "Invented by VoiceDesign from a text description, saying the same words.",
      final: "A blend of the two, baked: the model reading the same words in the blended voice.",
    };
    const span = () => 9.5;
    for (const key of ["armin", "designed", "final"]) {
      const v = d.voices[key];
      const row = el(root, "div", "qtts__voice");
      const head = el(row, "div", "qtts__voice-head");
      playButton(head, () => v.file);
      el(head, "b", "qtts__name", NAMES[key]);
      el(head, "span", "qtts__muted", `${about[key]} Median pitch ${v.pitch} Hz.`);
      const body = el(row, "div", "qtts__voice-body");
      const spec = el(body, "div", "qtts__grow");
      spectrogram(spec, 64, () => v.file, span).redraw();
      const pr = el(body, "div", "qtts__print");
      makeCanvas(pr, 64, (g, w, h) => drawPrint(g, 0, 0, w, h, v.print)).redraw();
    }
    el(root, "p", "qtts__caption",
      "Left: the first seconds of each reference, as a spectrogram (time to the right, pitch up, brighter is louder; click to play). " +
      "Right: its speaker embedding, the 2048 numbers Base extracts from the whole recording.");
  }

  // ---- widget: blending ---------------------------------------------------------------------------
  function blend(root, d) {
    const steps = d.blends.slice().sort((a, b) => a.designed - b.designed);
    const head = el(root, "div", "qtts__row");
    el(head, "span", "qtts__end", "Armin");
    const slider = el(head, "input", "qtts__slider");
    slider.type = "range";
    slider.min = 0;
    slider.max = steps.length - 1;
    slider.step = 1;
    slider.value = Math.round(d.final * (steps.length - 1));
    el(head, "span", "qtts__end", "Designed");
    const label = el(root, "div", "qtts__label");
    const body = el(root, "div", "qtts__voice-body");
    const left = el(body, "div", "qtts__grow");
    const pr = el(body, "div", "qtts__print");
    let cur = steps[+slider.value];
    const playRow = el(left, "div", "qtts__row");
    playButton(playRow, () => cur.file);
    el(playRow, "span", "qtts__muted", `\u201C${d.blendLine}\u201D`);
    const spec = spectrogram(left, 64, () => cur.file);
    const print = makeCanvas(pr, 64, (g, w, h) =>
      drawPrint(g, 0, 0, w, h, blendPrints(d.voices.armin.print, d.voices.designed.print, cur.designed)));
    const show = bars(root, [["sounds like Armin", "#ff8a2a"], ["sounds like Designed", "#5fa8ff"]]);
    function update() {
      cur = steps[+slider.value];
      const pct = Math.round(cur.designed * 100);
      label.textContent = `${100 - pct}% Armin, ${pct}% Designed \u00B7 median pitch ${cur.pitch} Hz` +
        (Math.abs(cur.designed - d.final) < 1e-6 ? " \u00B7 the blend that was baked into Final" : "");
      show([likeBar(cur.sv.armin), likeBar(cur.sv.designed)]);
      spec.redraw();
      print.redraw();
    }
    slider.addEventListener("input", () => { update(); play(cur.file); });
    update();
    el(root, "p", "qtts__caption",
      "The bars are a speaker verification model (WavLM, unrelated to Qwen) comparing the clip with each reference recording. " +
      "The embedding on the right is the blended one CustomVoice was given.");
  }

  // ---- widget: what goes into the speaker slot ---------------------------------------------------
  function slot(root, d) {
    const state = { speaker: "armin", model: "CustomVoice", instruct: "sad" };
    const clipOf = () => d.clips.find((c) => c.speaker === state.speaker && c.model === state.model &&
      c.instruct === (state.model === "Base" ? "none" : state.instruct));
    const groups = {};
    function choice(title, key, options) {
      const row = el(root, "div", "qtts__row");
      el(row, "span", "qtts__end qtts__key", title);
      groups[key] = options.map(([value, label]) => {
        const b = button(row, label, () => { state[key] = value; update(true); }, "qtts__chip");
        b.dataset.value = value;
        return b;
      });
    }
    choice("Speaker", "speaker", [["ryan", "Ryan (built in)"], ["armin", "Armin (clone)"]]);
    choice("Model", "model", [["CustomVoice", "CustomVoice"], ["Base", "Base"]]);
    choice("Instruction", "instruct", Object.keys(d.instructions).map((k) => [k, k]));
    const prompt = el(root, "div", "qtts__prompt");
    const playRow = el(root, "div", "qtts__row");
    playButton(playRow, () => clipOf() && clipOf().file);
    el(playRow, "span", "qtts__muted", `\u201C${d.line}\u201D`);
    const longest = Math.max(...d.clips.map((c) => c.seconds));
    const spec = spectrogram(root, 72, () => clipOf() && clipOf().file, () => longest);
    const stats = el(root, "div", "qtts__label");
    const emo = bars(root, Object.entries(EMOTIONS).map(([k, label]) =>
      [label, { neu: "#9aa5b1", hap: "#f5c542", ang: "#e5533d", sad: "#5fa8ff" }[k]]));
    const like = bars(root, [["sounds like Armin", "#ff8a2a"]]);
    function update(sound) {
      if (state.speaker === "ryan") state.model = "CustomVoice";
      for (const [key, buttons] of Object.entries(groups)) {
        for (const b of buttons) {
          b.disabled = (key === "model" && b.dataset.value === "Base" && state.speaker === "ryan") ||
            (key === "instruct" && state.model === "Base");
          b.classList.toggle("qtts__chip--on", b.dataset.value === state[key] && !b.disabled);
        }
      }
      const c = clipOf();
      const instruct = state.model === "Base" ? null : d.instructions[state.instruct];
      const slotText = state.speaker === "ryan" ? "spk_id[\u201Cryan\u201D] \u2192 a row of the embedding table"
        : `x-vector of ${NAMES[state.speaker]} (Base\u2019s speaker encoder)`;
      prompt.innerHTML = "";
      const part = (cls, text) => el(prompt, "span", "qtts__token " + cls, text);
      if (state.model === "Base") part("qtts__token--off", "no instruction input");
      else part("qtts__token--instruct", instruct ? `instruct: \u201C${instruct}\u201D` : "instruct: (none)");
      part("", "English");
      part("qtts__token--slot", "speaker: " + slotText);
      part("", "codec BOS");
      part("", "text \u2192 speech tokens");
      stats.textContent = `${state.model}, ${c.seconds.toFixed(1)} s, median pitch ${c.pitch} Hz \u00B7 Whisper heard: \u201C${c.heard}\u201D`;
      emo(Object.keys(EMOTIONS).map((k) => [c.emotion[k] || 0, Math.round((c.emotion[k] || 0) * 100) + "%"]));
      const hide = state.speaker === "ryan";
      like([[...likeBar(c.sv.armin), hide]]);
      spec.redraw();
      if (sound) play(c.file);
    }
    update(false);
    el(root, "p", "qtts__caption",
      "Emotion bars: a classifier trained on acted speech (four classes) listening to the clip. " +
      "Similarity bars: WavLM speaker verification against the reference recordings.");
  }

  // ---- widget: moving a voice along the gender direction -----------------------------------------
  function gender(root, d) {
    const g = d.gender;
    const state = { index: 0, shifted: null };
    const voice = g.voices.armin;
    const steps = () => voice.steps;
    const original = () => steps().findIndex((s) => s.original);
    const cur = () => (state.shifted != null ? g.shifted[state.shifted] : steps()[state.index]);

    const probe = el(root, "span", "qtts__muted");   // (to read the muted text colour from)
    probe.style.display = "none";
    // the axis: where the designed voices, the built-in speakers and this voice sit
    const LO = -3.3, HI = 3.3;
    const axis = makeCanvas(root, 116, (ctx, w, h) => {
      const text = getComputedStyle(root).color, faded = getComputedStyle(probe).color;
      const pad = 14, x = (t) => pad + ((t - LO) / (HI - LO)) * (w - 2 * pad);
      ctx.clearRect(0, 0, w, h);
      ctx.font = "11px sans-serif";
      ctx.textBaseline = "middle";
      const rows = [["designed women", 18], ["designed men", 38], ["built-in speakers", 58]];
      for (const [label, y] of rows) {
        ctx.fillStyle = faded;
        ctx.globalAlpha = 0.25;
        ctx.fillRect(pad, y, w - 2 * pad, 1);
        ctx.globalAlpha = 1;
        ctx.textAlign = "left";
        ctx.fillText(label, pad, y - 9);
      }
      const dot = (t, y, color, hollow) => {
        ctx.beginPath();
        ctx.arc(x(t), y, 4, 0, 2 * Math.PI);
        if (hollow) { ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.stroke(); } else { ctx.fillStyle = color; ctx.fill(); }
      };
      const COLOR = { f: "#ff8a2a", m: "#5fa8ff" };
      for (const [name, t] of Object.entries(g.designed)) dot(t, name[0] === "f" ? 18 : 38, COLOR[name[0]]);
      for (const b of Object.values(g.builtin)) dot(b.t, 58, COLOR[b.gender], true);
      // the midpoint, the voice where it started, the voice now
      ctx.fillStyle = faded;
      ctx.fillRect(x(0) - 0.5, 8, 1, 62);
      ctx.textAlign = "center";
      ctx.fillText("\u2190 more male", x(-2.2), 84);
      ctx.fillText("more female \u2192", x(2.2), 84);
      ctx.fillText("midpoint", x(0), 84);
      const start = voice.start, now = cur().t;
      ctx.setLineDash([3, 3]);
      ctx.strokeStyle = text;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x(start), 6);
      ctx.lineTo(x(start), 70);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = "#c07bff";
      ctx.fillRect(x(now) - 1.5, 4, 3, 68);
      ctx.beginPath();
      ctx.moveTo(x(now), 96);
      ctx.lineTo(x(now) - 6, 108);
      ctx.lineTo(x(now) + 6, 108);
      ctx.fill();
    });

    const head = el(root, "div", "qtts__row");
    el(head, "span", "qtts__end", "male");
    const slider = el(head, "input", "qtts__slider");
    slider.type = "range";
    slider.min = 0;
    slider.step = 1;
    el(head, "span", "qtts__end", "female");
    const label = el(root, "div", "qtts__label");
    const playRow = el(root, "div", "qtts__row");
    playButton(playRow, () => cur().file);
    button(playRow, "original", () => { state.index = original(); state.shifted = null; update(true); });
    el(playRow, "span", "qtts__muted", `\u201C${d.line}\u201D`);
    const spec = spectrogram(root, 64, () => cur().file);
    const show = bars(root, [["classifier: female", "#ff8a2a"], ["sounds like original", "#c07bff"]]);
    const cmp = el(root, "div", "qtts__row");
    el(cmp, "span", "qtts__end qtts__key", "Instead:");
    const shiftButtons = g.shifted.map((s, i) => button(cmp, `pitch-shift my recording +${s.semitones} st`, () => {
      state.shifted = i;
      update(true);
    }, "qtts__chip"));

    function update(sound) {
      slider.max = steps().length - 1;
      slider.value = state.index;
      shiftButtons.forEach((b, i) => b.classList.toggle("qtts__chip--on", state.shifted === i));
      const c = cur();
      label.textContent = state.shifted != null
        ? `My recording pitch-shifted up ${c.semitones} semitones, then cloned (lands at ${c.t.toFixed(2)}) \u00B7 median pitch ${c.pitch} Hz`
        : (c.original ? `Armin as is (${c.t.toFixed(2)})` : `Armin moved to ${c.t.toFixed(2)}`) +
          ` \u00B7 median pitch ${c.pitch} Hz`;
      show([[c.female, Math.round(c.female * 100) + "%"], likeBar(c.like)]);
      axis.redraw();
      spec.redraw();
      if (sound) play(c.file);
    }
    slider.addEventListener("input", () => { state.index = +slider.value; state.shifted = null; update(true); });
    state.index = original();
    update(false);
    el(root, "p", "qtts__caption",
      "Top: every voice\u2019s position along the gender direction (filled: the 28 VoiceDesign voices the direction was " +
      "computed from; hollow: CustomVoice\u2019s nine built-in speakers, which were not used). Dashed: where the voice " +
      "started; purple: where it is now. Bars: a gender classifier (wav2vec2) and WavLM speaker verification against " +
      "the voice\u2019s own reference recording.");
  }

  // ---- widget: finding me in a podcast ----------------------------------------------------------
  function detect(root, d) {
    const x = d.detect, n = x.ref.length, SPAN = 120;
    const ROWS = [
      ["qwen", "Qwen encoder, my conference clip"],
      ["qwen_enrolled", "Qwen encoder, 20 s of me from this episode"],
      ["ecapa", "ECAPA, my conference clip"],
    ];
    const COLOR = { 1: "#ff8a2a", 0: "#5fa8ff" };
    // who each row says is talking in window i: 1 me, 0 not me, -1 no speech
    const says = (row, i) => {
      if (!x.speech[i]) return -1;
      const m = x.methods[row];
      return m.sim[i] / 1000 > m.threshold ? 1 : 0;
    };
    const state = { lo: 20 };
    const probe = el(root, "span", "qtts__muted");
    probe.style.display = "none";
    const clock = (t) => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, "0")}`;

    const legend = el(root, "div", "qtts__row qtts__legend");
    for (const [who, label] of [[1, "Armin (me)"], [0, "Ben"]]) {
      const item = el(legend, "span", "qtts__legend-item");
      el(item, "span", "qtts__swatch").style.background = COLOR[who];
      item.append(label);
    }
    el(legend, "span", "qtts__muted", "gaps: nobody talking");

    const ROW_H = 10, ROW_GAP = 17, DETAIL_H = 16, TOP = 14;
    const overviewH = TOP + ROWS.length * ROW_GAP + 6;
    const detailTop = overviewH + 22;
    const height = detailTop + ROWS.length * (DETAIL_H + 15) + 14;
    const view = makeCanvas(root, height, (g, w, h) => {
      const faded = getComputedStyle(probe).color, text = getComputedStyle(root).color;
      g.clearRect(0, 0, w, h);
      g.font = "11px sans-serif";
      g.textBaseline = "alphabetic";
      g.fillStyle = faded;
      g.fillText("The first 20 minutes, same rows as below; click or drag to look closer", 0, 10);
      ROWS.forEach(([row], r) => {
        const y = TOP + r * ROW_GAP;
        for (let i = 0; i < n; i++) {
          const who = says(row, i);
          if (who < 0) continue;
          g.fillStyle = COLOR[who];
          g.fillRect((i / n) * w, y, Math.max(1, w / n), ROW_H);
        }
      });
      const t = episode.currentTime;
      // the part shown below, and where the player is
      g.strokeStyle = text;
      g.lineWidth = 1.5;
      g.strokeRect((state.lo / n) * w, TOP - 3, (SPAN / n) * w, ROWS.length * ROW_GAP + 2);
      g.fillStyle = text;
      g.fillRect((t / n) * w - 0.5, TOP - 5, 1, ROWS.length * ROW_GAP + 6);
      g.fillStyle = faded;
      g.fillText(`${clock(state.lo)} to ${clock(state.lo + SPAN)} (click to listen from there)`, 0, detailTop - 8);
      ROWS.forEach(([row, label], r) => {
        const y = detailTop + r * (DETAIL_H + 15) + 11;
        g.fillStyle = faded;
        const m = x.methods[row];
        g.fillText(`${label} \u00B7 right on ${Math.round(m.accuracy * 100)}% of the 20 minutes`, 0, y - 3);
        for (let s = 0; s < SPAN; s++) {
          const i = state.lo + s, who = i < n ? says(row, i) : -1;
          if (who < 0) continue;
          g.fillStyle = COLOR[who];
          g.fillRect((s / SPAN) * w, y, w / SPAN - 0.5, DETAIL_H);
        }
      });
      if (t >= state.lo && t <= state.lo + SPAN) {
        g.fillStyle = text;
        g.fillRect(((t - state.lo) / SPAN) * w - 1, detailTop, 2, h - detailTop);
      }
    });

    // a plain audio player with the whole episode; the timeline above only moves it around
    // the whole episode in an audio element (it streams); the timeline moves it around
    const episode = new Audio(BASE + "detect-episode.m4a?v=20min");
    episode.preload = "metadata";
    streams.add(episode);
    const controls = el(root, "div", "qtts__row");
    const toggle = button(controls, "", () => {
      if (!episode.paused) return episode.pause();
      const t = episode.currentTime;
      if (t < state.lo || t > state.lo + SPAN) seek(state.lo);   // (start where you are looking)
      episode.play();
    }, "qtts__play");
    const line = el(controls, "span", "qtts__muted");
    const said = (t) => x.transcript.find(([a, b]) => t >= a && t < b);
    function caption(t) {
      const seg = said(t);
      line.textContent = seg ? `${clock(t)}  \u201C${seg[2]}\u201D` : clock(t);
    }
    // Seeking: a browser may ignore a seek while it is still loading the file, so it is
    // repeated until the player is where it was told to go.
    let target = null, tries = 0;
    function seek(t) {
      target = t;
      tries = 0;
      if (episode.readyState >= 1) episode.currentTime = t;
      caption(t);
      view.redraw();
    }
    const settle = () => {
      if (target == null || episode.readyState < 1) return;
      if (Math.abs(episode.currentTime - target) > 1 && tries++ < 5) episode.currentTime = target;
      else target = null;
    };
    for (const name of ["loadedmetadata", "canplay", "playing", "seeked"]) episode.addEventListener(name, settle);
    // The view follows the player while the play head is in it; moving the view elsewhere stops
    // that until the play head is shown again.
    let following = true;
    function update() {
      const t = episode.currentTime, inView = t >= state.lo && t <= state.lo + SPAN;
      if (following && !inView) state.lo = Math.max(0, Math.min(n - SPAN, Math.floor(t) - 10));
      if (!episode.paused || following) caption(t);
      view.redraw();
    }
    function loop() {
      update();
      if (!episode.paused) requestAnimationFrame(loop);
    }
    const sync = () => showPlaying(toggle, !episode.paused);
    episode.addEventListener("play", () => { stop(); tick(); following = true; sync(); loop(); });
    episode.addEventListener("seeked", update);
    episode.addEventListener("pause", () => { sync(); update(); });
    sync();

    // the overview: click or drag to move the part shown below; the rows: click to listen there
    const at = (e) => {
      const r = view.c.getBoundingClientRect();
      return { fx: Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)), y: e.clientY - r.top };
    };
    const moveTo = (fx) => {
      state.lo = Math.max(0, Math.min(n - SPAN, Math.round(fx * n - SPAN / 2)));
      const t = episode.currentTime;
      following = t >= state.lo && t <= state.lo + SPAN;
      if (episode.paused) caption(state.lo + SPAN / 2);
      view.redraw();
    };
    let dragging = false;
    view.c.style.touchAction = "pan-y";
    view.c.addEventListener("pointerdown", (e) => {
      const { fx, y } = at(e);
      if (y >= overviewH) return;
      dragging = true;
      view.c.setPointerCapture(e.pointerId);
      moveTo(fx);
      e.preventDefault();
    });
    view.c.addEventListener("pointermove", (e) => {
      const { fx, y } = at(e);
      if (dragging) { moveTo(fx); return; }
      view.c.style.cursor = y < overviewH ? "grab" : y > detailTop - 20 ? "pointer" : "default";
    });
    const end = () => { dragging = false; };
    view.c.addEventListener("pointerup", end);
    view.c.addEventListener("pointercancel", end);
    view.c.addEventListener("click", (e) => {
      const { fx, y } = at(e);
      if (y < detailTop - 20) return;
      following = true;
      seek(state.lo + fx * SPAN);
      if (episode.paused) episode.play();
    });
    caption(30);
    view.redraw();
    el(root, "p", "qtts__caption",
      "Each block is a 2-second window, one per second. Right means matching where ECAPA and WavLM, clustering the " +
      "episode on their own, agree (98% of the speech).");
  }

  // ---- styles and mounting -----------------------------------------------------------------------
  function injectStyles() {
    if (document.getElementById("qtts-styles")) return;
    const style = document.createElement("style");
    style.id = "qtts-styles";
    style.textContent = `
      .qtts { margin: 28px -14px; padding: 16px 18px; border: 1px solid var(--border-color);
        border-radius: 7px; background: var(--table-background-color); box-shadow: 0 1px 10px var(--pre-shadow);
        font-size: 15px; }
      .qtts * { box-sizing: border-box; }
      .qtts__canvas { display: block; width: 100%; border-radius: 4px; }
      .qtts__row { display: flex; flex-wrap: wrap; align-items: center; gap: 6px 8px; margin: 8px 0; }
      .qtts__voice { margin: 0 0 14px; }
      .qtts__voice-head { display: flex; flex-wrap: wrap; gap: 4px 10px; align-items: center; margin-bottom: 5px; }
      .qtts__voice-body { display: flex; gap: 10px; align-items: stretch; }
      .qtts__grow { flex: 1; min-width: 0; }
      .qtts__print { width: 128px; flex: none; align-self: flex-end; }
      .qtts__muted, .qtts__caption { color: var(--faded-color); font-size: 13px; }
      .qtts__caption { margin: 10px 0 0; }
      .qtts__label { margin: 8px 0; font-size: 14px; }
      .qtts__end { font-weight: 600; min-width: 48px; }
      .qtts__key { min-width: 86px; color: var(--faded-color); font-weight: 400; font-size: 13px; }
      .qtts__slider { flex: 1; min-width: 120px; }
      .qtts__button { font: inherit; font-size: 13px; padding: 3px 10px; border-radius: 4px; cursor: pointer;
        border: 1px solid var(--border-color); background: var(--background-color); color: var(--text-color); }
      .qtts__button:disabled { opacity: 0.35; cursor: default; }
      .qtts__play { flex: none; display: inline-flex; align-items: center; justify-content: center;
        width: 30px; height: 28px; padding: 0; }
      .qtts__play svg { width: 12px; height: 12px; display: block; }
      .qtts__name { flex: none; }
      .qtts__row > .qtts__muted { flex: 1 1 12em; min-width: 0; }
      .qtts__chip--on { background: var(--primary-color); border-color: var(--primary-color); color: var(--background-color); }
      .qtts__prompt { display: flex; flex-wrap: wrap; gap: 4px; margin: 12px 0 4px;
        font: 12px/1.4 'Ubuntu Mono', 'Consolas', monospace; }
      .qtts__token { padding: 2px 7px; border-radius: 3px; background: var(--code-background-color); }
      .qtts__token--instruct { background: #e5533d33; }
      .qtts__token--slot { background: #ff8a2a40; font-weight: 700; }
      .qtts__token--off { opacity: 0.6; text-decoration: line-through; }
      .qtts__legend { gap: 6px 16px; margin: 0 0 10px; font-size: 14px; }
      .qtts__legend-item { display: inline-flex; align-items: center; gap: 6px; }
      .qtts__swatch { display: inline-block; width: 14px; height: 14px; border-radius: 3px; }
      .qtts__bars { margin: 8px 0; }
      .qtts__bar { display: flex; align-items: center; gap: 8px; margin: 3px 0; font-size: 13px; }
      .qtts__bar-label { width: 160px; flex: none; color: var(--faded-color); }
      .qtts__bar-track { flex: 1; height: 10px; border-radius: 5px; background: var(--code-background-color); overflow: hidden; }
      .qtts__bar-fill { display: block; height: 100%; transition: width 0.25s; }
      .qtts__bar-value { width: 44px; text-align: right; font-variant-numeric: tabular-nums; }
      @media (max-width: 600px) {
        .qtts { margin: 24px 0; padding: 12px; }
        .qtts__print { width: 84px; }
      }
    `;
    document.head.appendChild(style);
  }

  const WIDGETS = { voices, blend, slot, gender, detect };
  // widgets with data of their own, loaded next to data.json
  const EXTRA = { gender: "gender.json", detect: "detect.json?v=20min" };
  const extras = {};
  const loadExtra = (name) => (extras[name] ??= fetch(BASE + EXTRA[name]).then((r) => r.json()));
  function init(node) {
    if (node.dataset.qwenTtsReady) return;
    node.dataset.qwenTtsReady = "1";
    const name = node.dataset.qwenTts;
    const extra = EXTRA[name] ? loadExtra(name) : Promise.resolve(null);
    Promise.all([loadData(), extra]).then(([d, x]) => {
      if (x) d = { ...d, [name]: x };
      node.textContent = "";
      node.classList.add("qtts");
      WIDGETS[node.dataset.qwenTts](node, d);
    }).catch((err) => {
      node.textContent = "Could not load the voice samples: " + err;
    });
  }
  // Only pages with widgets get the styles; with boosted navigation the script stays loaded
  // after leaving the post, so the styles go again when a page without widgets is swapped in.
  function initAll(scope) {
    const root = scope && scope.querySelectorAll ? scope : document;
    const nodes = root.querySelectorAll("[data-qwen-tts]");
    if (!document.querySelector("[data-qwen-tts]")) {
      document.getElementById("qtts-styles")?.remove();
      return;
    }
    injectStyles();
    nodes.forEach(init);
  }
  window.QwenTTSVoicesInit = initAll;
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => initAll(document));
  } else {
    initAll(document);
  }
  document.addEventListener("htmx:afterSwap", (event) => {
    stop();
    streams.forEach((s) => s.pause());
    streams.clear();
    listeners.clear();
    initAll(event.target);
  });
})();
