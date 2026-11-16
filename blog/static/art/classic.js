// The original header/footer: WebGL metaballs ("Wind Waker" water).  It ignores
// the post; it is here so that the variants can be compared against it.
(function() {
  'use strict';
  const FRAME_INTERVAL = 0.033; // ~30fps

  const vsSource = `
    attribute vec2 a_position;
    varying vec2 v_position;
    void main() {
      gl_Position = vec4(a_position, 0, 1);
      v_position = a_position;
    }
  `;

  const fsSource = `
    precision mediump float;
    uniform vec2 u_resolution;
    uniform float u_time;
    uniform float u_isDark;
    uniform float u_fadeTop;
    uniform float u_dpr;
    uniform float u_hover;
    varying vec2 v_position;

    // Cheap hash - single multiply-add chain
    float hash(vec2 p) {
      return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
    }

    vec2 hash2(vec2 p) {
      p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
      return fract(sin(p) * 43758.5453);
    }

    // Simple value noise - much cheaper than simplex
    float vnoise(vec2 p) {
      vec2 i = floor(p);
      vec2 f = fract(p);
      f = f * f * (3.0 - 2.0 * f);
      return mix(
        mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
        mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x),
        f.y
      ) * 2.0 - 1.0;
    }

    // Metaball field - sums smooth falloff from nearby blob centers
    // When blobs approach, their fields add up and merge organically
    // Returns vec2(field, accentWeight) where accentWeight is 0-1 based on accent blob contribution
    vec2 metaball(vec2 p, float time) {
      vec2 i = floor(p);
      vec2 f = fract(p);

      float sum = 0.0;
      float accentSum = 0.0;

      for (int y = -1; y <= 1; y++) {
        for (int x = -1; x <= 1; x++) {
          vec2 neighbor = vec2(float(x), float(y));
          vec2 cellId = i + neighbor;
          vec2 point = hash2(cellId);
          point = 0.5 + 0.4 * sin(time * 0.3 + 6.28 * point);
          vec2 diff = neighbor + point - f;
          float r2 = dot(diff, diff);

          // Smooth polynomial falloff: (1 - r²)³ for r² < 1, else 0
          // This creates soft edges that blend when overlapping
          float influence = max(0.0, 1.0 - r2);
          float contrib = influence * influence * influence;
          sum += contrib;

          // Check if this blob is an accent blob (~8% chance based on cell)
          float isAccent = step(0.92, hash(cellId + 0.5));
          // Random delay for staggered fade-in (0 to 0.75 of the 0-1 range = 0-2s of 2.65s total)
          float blobDelay = hash(cellId + 0.7) * 0.75;
          // Blob visibility based on hover progress and delay
          float blobVisible = smoothstep(blobDelay, blobDelay + 0.25, u_hover);
          accentSum += contrib * isAccent * blobVisible;
        }
      }

      // Normalize accent weight by total contribution
      float accentWeight = sum > 0.0 ? accentSum / sum : 0.0;
      return vec2(sum, accentWeight);
    }

    // Cheap warping using value noise
    vec2 warpCoords(vec2 p, float time) {
      float warp1 = vnoise(p * 0.5 + time * 0.05);
      float warp2 = vnoise(p * 0.3 - time * 0.03 + 100.0);
      return p + vec2(warp1, warp2) * 0.4;
    }

    void main() {
      float scale = 0.0133;
      vec2 p = gl_FragCoord.xy * scale;

      // Wind Waker colors
      vec3 lightBright = vec3(0.10, 0.42, 0.70);
      vec3 lightDark = vec3(0.04, 0.22, 0.44);
      vec3 lightPageBg = vec3(1.0, 1.0, 1.0);

      vec3 darkBright = vec3(0.32, 0.55, 0.82);
      vec3 darkDark = vec3(0.12, 0.24, 0.40);
      vec3 darkPageBg = vec3(0.106, 0.192, 0.337);

      // Hover accent colors (red from --secondary-color)
      vec3 lightAccent = vec3(0.804, 0.055, 0.055);  // #cd0e0e
      vec3 darkAccent = vec3(1.0, 0.4, 0.4);         // #ff6666

      vec3 bright = mix(lightBright, darkBright, u_isDark);
      vec3 dark = mix(lightDark, darkDark, u_isDark);
      vec3 pageBg = mix(lightPageBg, darkPageBg, u_isDark);
      vec3 accent = mix(lightAccent, darkAccent, u_isDark);

      // Calculate boundary first so metaballs can react to it
      float baseHeight = 50.0 * u_dpr;
      float waveAmplitude = 25.0 * u_dpr;
      float xCoord = gl_FragCoord.x / u_dpr;
      float boundary = baseHeight;
      boundary += vnoise(vec2(xCoord * 0.008, u_time * 0.08)) * waveAmplitude;
      boundary += vnoise(vec2(xCoord * 0.02, u_time * 0.04 + 50.0)) * waveAmplitude * 0.4;

      float pixelY = mix(gl_FragCoord.y, u_resolution.y - gl_FragCoord.y, u_fadeTop);
      float distToBoundary = pixelY - boundary;

      // Wall influence - blobs pool against the boundary
      float wallRange = 40.0 * u_dpr;
      float wallInfluence = smoothstep(wallRange, 0.0, distToBoundary) * 0.25;

      // Bottom layer - darker, larger scale
      vec2 p1 = p * 0.7 + vec2(u_time * 0.02, u_time * 0.015);
      vec2 meta1 = metaball(warpCoords(p1, u_time * 0.6), u_time * 0.6);
      float field1 = meta1.x + wallInfluence;
      float accent1 = meta1.y;

      // Top layer - brighter, smaller scale
      vec2 p2 = p + vec2(u_time * 0.06, -u_time * 0.02);
      vec2 meta2 = metaball(warpCoords(p2 + 100.0, u_time), u_time);
      float field2 = meta2.x + wallInfluence;
      float accent2 = meta2.y;

      // Taper off fields below boundary (allows slight overhang)
      float taperRange = 30.0 * u_dpr;
      float taper = smoothstep(-taperRange, 0.0, distToBoundary);
      field1 *= taper;
      field2 *= taper;

      // Metaball thresholds - higher = smaller blobs, lower = more merging
      // Use smoothstep for ~0.5px anti-aliasing on low-DPI screens
      float aaWidth = 0.005 / max(u_dpr, 1.0);

      float blend1 = smoothstep(0.92 - aaWidth, 0.92 + aaWidth, field1);
      float blend2 = smoothstep(0.95 - aaWidth, 0.95 + aaWidth, field2);

      // Hard threshold for accent - blob is either accent or not
      float isAccent1 = step(0.5, accent1);
      float isAccent2 = step(0.5, accent2);

      // Blend accent color based on hover state
      vec3 dark1 = mix(dark, accent, isAccent1 * u_hover);
      vec3 bright2 = mix(bright, accent, isAccent2 * u_hover);

      vec3 color = mix(pageBg, dark1, blend1);
      color = mix(color, bright2, blend2);

      gl_FragColor = vec4(color, 1.0);
    }
  `;

  LucumrArt.register('classic', {
    title: 'Classic (metaballs)',
    create: function(env) {
      const effects = env.surfaces.map(function(surface) {
        const canvas = surface.canvas;
        const gl = canvas.getContext('webgl', { antialias: true });
        if (!gl) return null;
        const program = env.util.gl.program(gl, vsSource, fsSource);
        gl.useProgram(program);
        env.util.gl.quad(gl, program, 'a_position');
        gl.uniform1f(gl.getUniformLocation(program, 'u_fadeTop'), surface.kind === 'footer' ? 1.0 : 0.0);
        const effect = {
          surface: surface,
          gl: gl,
          resolutionLoc: gl.getUniformLocation(program, 'u_resolution'),
          timeLoc: gl.getUniformLocation(program, 'u_time'),
          isDarkLoc: gl.getUniformLocation(program, 'u_isDark'),
          dprLoc: gl.getUniformLocation(program, 'u_dpr'),
          hoverLoc: gl.getUniformLocation(program, 'u_hover'),
          hoverTarget: 0,
          hoverValue: 0
        };
        canvas.addEventListener('mouseenter', function() { effect.hoverTarget = 1; });
        canvas.addEventListener('mouseleave', function() { effect.hoverTarget = 0; });
        return effect;
      }).filter(Boolean);

      let start = null;
      let lastFrame = -1;

      return {
        frame: function(now) {
          if (start === null) start = now;
          if (!env.still && now - lastFrame < FRAME_INTERVAL) return FRAME_INTERVAL - (now - lastFrame);
          lastFrame = now;
          const hoverStep = FRAME_INTERVAL / 2.65; // staggered blobs take 2.65s in total
          effects.forEach(function(effect) {
            const surface = effect.surface, gl = effect.gl;
            if (!surface.visible) return;
            if (effect.hoverTarget > effect.hoverValue) {
              effect.hoverValue = Math.min(effect.hoverTarget, effect.hoverValue + hoverStep);
            } else if (effect.hoverTarget < effect.hoverValue) {
              effect.hoverValue = Math.max(effect.hoverTarget, effect.hoverValue - hoverStep);
            }
            gl.viewport(0, 0, surface.canvas.width, surface.canvas.height);
            gl.uniform2f(effect.resolutionLoc, surface.canvas.width, surface.canvas.height);
            gl.uniform1f(effect.timeLoc, now - start);
            gl.uniform1f(effect.isDarkLoc, env.dark ? 1.0 : 0.0);
            gl.uniform1f(effect.dprLoc, surface.dpr);
            gl.uniform1f(effect.hoverLoc, effect.hoverValue);
            gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
          });
          return env.still ? false : FRAME_INTERVAL * 0.6;   // the timer, then the next display frame
        }
      };
    }
  });
})();
