(function() {
  const FRAME_INTERVAL = 33; // ~30fps
  let initialized = false;
  let isPageVisible = true;
  let visibleCanvases = new Set();

  const vsSource = `
    attribute vec2 a_position;
    varying vec2 v_position;
    void main() {
      gl_Position = vec4(a_position, 0, 1);
      v_position = a_position;
    }
  `;

  const fsSource = `
    precision highp float;
    uniform vec2 u_resolution;
    uniform float u_time;
    uniform float u_isDark;
    uniform float u_fadeTop;
    uniform float u_dpr;
    varying vec2 v_position;

    // Hash functions
    float hash(vec2 p) {
      vec3 p3 = fract(vec3(p.xyx) * 0.1031);
      p3 += dot(p3, p3.yzx + 33.33);
      return fract((p3.x + p3.y) * p3.z);
    }

    vec2 hash2(vec2 p) {
      vec3 p3 = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973));
      p3 += dot(p3, p3.yzx + 33.33);
      return fract((p3.xx + p3.yz) * p3.zy);
    }

    // Simplex noise
    vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
    vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
    vec3 permute(vec3 x) { return mod289(((x*34.0)+1.0)*x); }

    float snoise(vec2 v) {
      const vec4 C = vec4(0.211324865405187, 0.366025403784439,
                         -0.577350269189626, 0.024390243902439);
      vec2 i  = floor(v + dot(v, C.yy));
      vec2 x0 = v -   i + dot(i, C.xx);
      vec2 i1;
      i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
      vec4 x12 = x0.xyxy + C.xxzz;
      x12.xy -= i1;
      i = mod289(i);
      vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0))
                              + i.x + vec3(0.0, i1.x, 1.0));
      vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy),
                              dot(x12.zw,x12.zw)), 0.0);
      m = m*m;
      m = m*m;
      vec3 x = 2.0 * fract(p * C.www) - 1.0;
      vec3 h = abs(x) - 0.5;
      vec3 ox = floor(x + 0.5);
      vec3 a0 = x - ox;
      m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);
      vec3 g;
      g.x  = a0.x  * x0.x  + h.x  * x0.y;
      g.yz = a0.yz * x12.xz + h.yz * x12.yw;
      return 130.0 * dot(m, g);
    }

    // Voronoi for caustic cell pattern
    vec3 voronoi(vec2 p, float time) {
      vec2 i = floor(p);
      vec2 f = fract(p);

      float minDist = 10.0;
      float secondMin = 10.0;
      vec2 minPoint = vec2(0.0);

      for (int y = -1; y <= 1; y++) {
        for (int x = -1; x <= 1; x++) {
          vec2 neighbor = vec2(float(x), float(y));
          vec2 point = hash2(i + neighbor);
          // Animate cell centers slowly
          point = 0.5 + 0.4 * sin(time * 0.3 + 6.28 * point);
          vec2 diff = neighbor + point - f;
          float d = length(diff);
          if (d < minDist) {
            secondMin = minDist;
            minDist = d;
            minPoint = point;
          } else if (d < secondMin) {
            secondMin = d;
          }
        }
      }

      // Return: distance to nearest, distance to edge, cell id
      float edge = secondMin - minDist;
      return vec3(minDist, edge, hash(minPoint * 100.0));
    }

    // Warped coordinates for organic look
    vec2 warpCoords(vec2 p, float time) {
      float warp1 = snoise(p * 0.5 + time * 0.05);
      float warp2 = snoise(p * 0.3 - time * 0.03 + 100.0);
      return p + vec2(warp1, warp2) * 0.4;
    }

    void main() {
      vec2 uv = gl_FragCoord.xy / u_resolution;

      // Scale for the caustic pattern (use native resolution)
      float scale = 0.008;
      vec2 p = gl_FragCoord.xy * scale;

      // Wind Waker colors - two layers
      // Light mode
      vec3 lightBright = vec3(0.10, 0.42, 0.70);   // bright blue (top layer)
      vec3 lightDark = vec3(0.04, 0.22, 0.44);     // darker blue (bottom layer)
      vec3 lightPageBg = vec3(1.0, 1.0, 1.0);        // actual page background

      // Dark mode
      vec3 darkBright = vec3(0.32, 0.55, 0.82);    // bright blue (top layer)
      vec3 darkDark = vec3(0.12, 0.24, 0.40);      // darker blue (bottom layer)
      vec3 darkPageBg = vec3(0.106, 0.192, 0.337); // #1b3156 actual page background

      vec3 bright = mix(lightBright, darkBright, u_isDark);
      vec3 dark = mix(lightDark, darkDark, u_isDark);
      vec3 pageBg = mix(lightPageBg, darkPageBg, u_isDark);

      // Bottom layer - darker, larger scale, moves slower
      float scale1 = 0.7; // larger blobs
      vec2 p1 = p * scale1 + vec2(u_time * 0.02, u_time * 0.015);
      vec2 warped1 = warpCoords(p1, u_time * 0.6);
      vec3 vor1 = voronoi(warped1, u_time * 0.6);
      float dist1 = vor1.x;

      // Top layer - brighter, smaller scale, moves faster in different direction
      float scale2 = 1.0; // smaller blobs
      vec2 p2 = p * scale2 + vec2(u_time * 0.06, -u_time * 0.02);
      vec2 warped2 = warpCoords(p2 + 100.0, u_time * 1.0); // offset to decorrelate
      vec3 vor2 = voronoi(warped2, u_time * 1.0);
      float dist2 = vor2.x;

      // Blob thresholds - tighter to make sparser blobs
      float blobThreshold1 = 0.32; // dark layer threshold
      float blobThreshold2 = 0.30; // bright layer threshold

      // Start with page background (visible between blobs)
      vec3 color = pageBg;

      // Draw bottom (dark) layer
      if (dist1 < blobThreshold1) {
        color = dark;
      }

      // Draw top (bright) layer on top
      if (dist2 < blobThreshold2) {
        color = bright;
      }

      // Fade at edge to actual page background
      // u_fadeTop: 0.0 = fade at bottom, 1.0 = fade at top
      // Fixed 70 CSS pixel transition regardless of canvas height
      float fadePixels = 70.0 * u_dpr;
      float pixelY = mix(gl_FragCoord.y, u_resolution.y - gl_FragCoord.y, u_fadeTop);
      float fade = smoothstep(0.0, fadePixels, pixelY);
      fade = fade * fade; // non-linear falloff
      color = mix(pageBg, color, fade);

      gl_FragColor = vec4(color, 1.0);
    }
  `;

  function createShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.error(gl.getShaderInfoLog(shader));
    }
    return shader;
  }

  function getIsDark() {
    const theme = document.documentElement.getAttribute('data-theme');
    if (theme === 'dark') return 1.0;
    if (theme === 'light') return 0.0;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 1.0 : 0.0;
  }

  function initWaterEffect(canvasId, fadeTop) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return null;
    const gl = canvas.getContext('webgl');
    if (!gl) return null;

    const vs = createShader(gl, gl.VERTEX_SHADER, vsSource);
    const fs = createShader(gl, gl.FRAGMENT_SHADER, fsSource);
    const program = gl.createProgram();
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    gl.useProgram(program);

    const posBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, 1,1]), gl.STATIC_DRAW);
    const posLoc = gl.getAttribLocation(program, 'a_position');
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

    const resolutionLoc = gl.getUniformLocation(program, 'u_resolution');
    const timeLoc = gl.getUniformLocation(program, 'u_time');
    const isDarkLoc = gl.getUniformLocation(program, 'u_isDark');
    const fadeTopLoc = gl.getUniformLocation(program, 'u_fadeTop');
    const dprLoc = gl.getUniformLocation(program, 'u_dpr');

    gl.uniform1f(fadeTopLoc, fadeTop ? 1.0 : 0.0);

    return {
      canvas,
      gl,
      resolutionLoc,
      timeLoc,
      isDarkLoc,
      dprLoc,
      needsResize: true
    };
  }

  let effects = [];
  let startTime = performance.now();
  let lastFrameTime = 0;

  function render(timestamp) {
    // Skip rendering if page is hidden or no canvases are visible
    if (!isPageVisible || visibleCanvases.size === 0) {
      requestAnimationFrame(render);
      return;
    }

    if (timestamp - lastFrameTime < FRAME_INTERVAL) {
      requestAnimationFrame(render);
      return;
    }
    lastFrameTime = timestamp;

    const elapsed = (performance.now() - startTime) / 1000.0;
    const isDark = getIsDark();

    const dpr = window.devicePixelRatio;

    for (const effect of effects) {
      const { canvas, gl, resolutionLoc, timeLoc, isDarkLoc, dprLoc } = effect;

      // Skip if this canvas is not visible
      if (!visibleCanvases.has(canvas)) continue;

      if (effect.needsResize) {
        canvas.width = canvas.offsetWidth * dpr;
        canvas.height = canvas.offsetHeight * dpr;
        gl.viewport(0, 0, canvas.width, canvas.height);
        gl.uniform2f(resolutionLoc, canvas.width, canvas.height);
        effect.needsResize = false;
      }

      gl.uniform1f(timeLoc, elapsed);
      gl.uniform1f(isDarkLoc, isDark);
      gl.uniform1f(dprLoc, dpr);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }

    requestAnimationFrame(render);
  }

  function init() {
    if (initialized) return;
    initialized = true;

    effects = [
      initWaterEffect('header-canvas', false),
      initWaterEffect('footer-canvas', true)
    ].filter(Boolean);

    if (effects.length === 0) return;

    // Track page visibility
    document.addEventListener('visibilitychange', function() {
      isPageVisible = !document.hidden;
    });

    // Track canvas visibility with IntersectionObserver
    const observer = new IntersectionObserver(function(entries) {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          visibleCanvases.add(entry.target);
        } else {
          visibleCanvases.delete(entry.target);
        }
      }
    }, { threshold: 0 });

    for (const effect of effects) {
      observer.observe(effect.canvas);
    }

    window.addEventListener('resize', function() {
      for (const effect of effects) {
        effect.needsResize = true;
      }
    });

    render(performance.now());
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
