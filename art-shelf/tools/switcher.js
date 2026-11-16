// A floating panel for comparing the artwork variants: pick a variant, try
// other tags, facets and seeds.  Never shown on the published site.
(function() {
  'use strict';
  if (location.hostname === 'lucumr.pocoo.org') return;
  const OPEN_KEY = 'art-switcher-open';

  const style = document.createElement('style');
  style.textContent = [
    '.art-switcher { position: fixed; right: 12px; bottom: 12px; z-index: 1000; max-width: 420px;',
    '  font: 12px/1.4 system-ui, sans-serif; color: #111; background: rgba(255,255,255,.94);',
    '  border: 1px solid #adbac7; border-radius: 8px; box-shadow: 0 4px 18px rgba(0,0,0,.25); }',
    '.art-switcher summary { cursor: pointer; padding: 6px 10px; font-weight: 600; }',
    '.art-switcher .art-panel { padding: 0 10px 10px; max-height: 70vh; overflow: auto; }',
    '.art-switcher h4 { margin: 8px 0 4px; font: inherit; font-weight: 600; color: #555; }',
    '.art-switcher button { font: inherit; margin: 0 4px 4px 0; padding: 2px 7px; cursor: pointer;',
    '  border: 1px solid #adbac7; border-radius: 10px; background: #fff; color: #111; }',
    '.art-switcher button.on { background: #1b3156; border-color: #1b3156; color: #fff; }',
    '.art-switcher button i { display: inline-block; width: 8px; height: 8px; border-radius: 50%; margin-right: 4px; }',
    '.art-switcher .art-info { color: #555; margin: 4px 0; }',
    '.art-switcher a { color: #115ca1; }'
  ].join('\n');
  document.head.appendChild(style);

  const root = document.createElement('details');
  root.className = 'art-switcher';
  root.open = localStorage.getItem(OPEN_KEY) === '1';
  root.addEventListener('toggle', function() { localStorage.setItem(OPEN_KEY, root.open ? '1' : '0'); });
  const summary = document.createElement('summary');
  const panel = document.createElement('div');
  panel.className = 'art-panel';
  root.appendChild(summary);
  root.appendChild(panel);

  function button(label, on, action, color) {
    const el = document.createElement('button');
    el.type = 'button';
    if (color) {
      const dot = document.createElement('i');
      dot.style.background = color;
      el.appendChild(dot);
    }
    el.appendChild(document.createTextNode(label));
    if (on) el.className = 'on';
    el.addEventListener('click', action);
    return el;
  }

  function heading(text) {
    const el = document.createElement('h4');
    el.textContent = text;
    panel.appendChild(el);
  }

  function render() {
    const site = LucumrArt.site;
    if (!site || !site.mounted) return;
    const post = site.mounted.post;
    const override = site.override;
    summary.textContent = 'Artwork: ' + site.variant;
    panel.textContent = '';

    heading('Variant');
    LucumrArt.variants.forEach(function(variant) {
      panel.appendChild(button(variant.title, variant.name === site.variant, function() {
        site.setVariant(variant.name);
      }));
    });

    heading('Tags' + (override.tags ? ' (overridden)' : ' (of this page)'));
    const active = post.tags.map(function(tag) { return tag.name; });
    const names = Object.keys(LucumrArt.data.tags).sort(function(a, b) {
      return LucumrArt.data.tags[b].count - LucumrArt.data.tags[a].count;
    });
    names.forEach(function(name) {
      panel.appendChild(button(name, active.indexOf(name) >= 0, function() {
        const next = active.indexOf(name) >= 0
          ? active.filter(function(other) { return other !== name; })
          : active.concat([name]);
        site.setOverride(Object.assign({}, override, { tags: next }));
      }, LucumrArt.tag(name).color));
    });

    // Facets: click a label to make the post entirely that, a score to set it.
    const facets = override.facets || {};
    const setFacet = function(name, value) {
      const next = Object.assign({}, facets);
      if (value === null) delete next[name];
      else next[name] = value;
      site.setOverride(Object.assign({}, override, { facets: next }));
    };
    heading('Facets' + (Object.keys(facets).length ? ' (some overridden)' : ' (of this page)'));
    Object.keys(LucumrArt.data.facets || {}).forEach(function(name) {
      const definition = LucumrArt.data.facets[name];
      const row = panel.appendChild(document.createElement('div'));
      const overridden = name in facets;
      const label = row.appendChild(document.createElement('span'));
      label.textContent = name + ' ';
      label.style.fontWeight = overridden ? '600' : '';
      if (definition.type === 'choice') {
        const current = post.facets[name] || {};
        definition.labels.forEach(function(choice) {
          const share = current.mix ? current.mix[choice] || 0 : 0;
          const el = button(choice + (share && share < 1 ? ' ' + Math.round(share * 100) : ''), current.top === choice, function() {
            const value = {};
            value[choice] = 1;
            setFacet(name, overridden && current.top === choice ? null : value);
          });
          el.style.opacity = share ? '' : '.55';
          row.appendChild(el);
        });
      } else {
        const current = post.facets[name];
        [0, 0.25, 0.5, 0.75, 1].forEach(function(value) {
          const near = current !== null && Math.abs(current - value) <= 0.125;
          row.appendChild(button(String(value), near, function() {
            setFacet(name, overridden && near ? null : value);
          }));
        });
        row.appendChild(document.createTextNode(current === null ? '(none)' : current.toFixed(2)));
      }
    });

    heading('Seed');
    panel.appendChild(button('reroll', false, function() {
      site.setOverride(Object.assign({}, override, { salt: String(Math.random()).slice(2, 8) }));
    }));
    panel.appendChild(button('reset tags, facets and seed', false, function() { site.setOverride({}); }));

    const info = document.createElement('div');
    info.className = 'art-info';
    info.textContent = post.kind + ' · ' + post.tags.map(function(tag) {
      return tag.name + ' ' + Math.round(tag.weight * 100) + '%';
    }).join(', ') + ' · loose ' + post.loose.toFixed(2) + ' · energy ' + post.energy.toFixed(2);
    panel.appendChild(info);

    const lab = document.createElement('a');
    lab.href = '/static/art/lab.html?variant=' + encodeURIComponent(site.variant);
    lab.textContent = 'open the lab (sample posts side by side)';
    lab.setAttribute('hx-boost', 'false');
    panel.appendChild(lab);
  }

  document.addEventListener('art:change', render);
  function attach() {
    document.body.appendChild(root);
    render();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', attach);
  else attach();
})();
