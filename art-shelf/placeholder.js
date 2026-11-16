// A stand-in for variants that are not built yet, and the smallest complete
// example of the variant contract (see ART.md): it draws one stripe per tag,
// as wide as the tag's weight, in the tag's pigment.
LucumrArt.placeholder = function(title) {
  'use strict';
  return {
    title: title + ' (placeholder)',
    create: function(env) {
      const util = env.util;
      let post = null;
      let progress = 1;     // 0..1, the stripes growing in

      function draw(surface) {
        const ctx = surface.canvas.getContext('2d');
        const w = surface.width, h = surface.height;
        const colors = env.palette();
        ctx.setTransform(surface.dpr, 0, 0, surface.dpr, 0, 0);
        ctx.fillStyle = util.css(colors.paper);
        ctx.fillRect(0, 0, w, h);
        if (!post) return;

        const footer = surface.kind === 'footer';
        const rand = post.rng('placeholder');
        const tags = post.tags.length ? post.tags : [{ name: '(no tags)', rgb: colors.primary, weight: 1, role: '' }];
        let x = 0;
        tags.forEach(function(tag) {
          const width = tag.weight * w;
          const depth = h * (0.35 + 0.45 * rand()) * progress;
          // the art touches the outer edge and dissolves towards the page
          const gradient = ctx.createLinearGradient(0, footer ? h : 0, 0, footer ? h - depth : depth);
          gradient.addColorStop(0, util.css(util.mix(tag.rgb, colors.paper, env.dark ? 0.25 : 0), 0.9));
          gradient.addColorStop(1, util.css(tag.rgb, 0));
          ctx.fillStyle = gradient;
          ctx.fillRect(x, footer ? h - depth : 0, width, depth);
          ctx.fillStyle = util.css(colors.ink, 0.8);
          ctx.font = '11px sans-serif';
          ctx.fillText(tag.name + (tag.role ? ' · ' + tag.role : ''), x + 6, footer ? h - 8 : 14);
          x += width;
        });
        ctx.fillStyle = util.css(colors.faded);
        ctx.fillText(title + ': not built yet', 6, footer ? h - 24 : 30);
      }

      return {
        setPost: function(next, info) {
          post = next;
          progress = info.initial || env.still ? 1 : 0;
        },
        frame: function(now, dt) {
          progress = Math.min(1, progress + dt * 2);
          env.surfaces.forEach(function(surface) { if (surface.visible) draw(surface); });
          return progress < 1;
        }
      };
    }
  };
};
