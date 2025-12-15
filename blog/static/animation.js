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
    precision mediump float;
    uniform vec2 u_resolution;
    uniform float u_time;
    uniform float u_isDark;
    uniform float u_fadeTop;
    uniform float u_dpr;
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
    float metaball(vec2 p, float time) {
      vec2 i = floor(p);
      vec2 f = fract(p);

      float sum = 0.0;

      for (int y = -1; y <= 1; y++) {
        for (int x = -1; x <= 1; x++) {
          vec2 neighbor = vec2(float(x), float(y));
          vec2 point = hash2(i + neighbor);
          point = 0.5 + 0.4 * sin(time * 0.3 + 6.28 * point);
          vec2 diff = neighbor + point - f;
          float r2 = dot(diff, diff);

          // Smooth polynomial falloff: (1 - r²)³ for r² < 1, else 0
          // This creates soft edges that blend when overlapping
          float influence = max(0.0, 1.0 - r2);
          sum += influence * influence * influence;
        }
      }

      return sum;
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

      vec3 bright = mix(lightBright, darkBright, u_isDark);
      vec3 dark = mix(lightDark, darkDark, u_isDark);
      vec3 pageBg = mix(lightPageBg, darkPageBg, u_isDark);

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
      float field1 = metaball(warpCoords(p1, u_time * 0.6), u_time * 0.6) + wallInfluence;

      // Top layer - brighter, smaller scale
      vec2 p2 = p + vec2(u_time * 0.06, -u_time * 0.02);
      float field2 = metaball(warpCoords(p2 + 100.0, u_time), u_time) + wallInfluence;

      // Taper off fields below boundary (allows slight overhang)
      float taperRange = 30.0 * u_dpr;
      float taper = smoothstep(-taperRange, 0.0, distToBoundary);
      field1 *= taper;
      field2 *= taper;

      // Metaball thresholds - higher = smaller blobs, lower = more merging
      vec3 color = pageBg;
      if (field1 > 0.92) color = dark;
      if (field2 > 0.95) color = bright;

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
