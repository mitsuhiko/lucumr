// The version of blog/static/art/site.js the switcher and the lab worked with
// (kept for reference): it adds the override (tags, facets, seed) in
// sessionStorage, LucumrArt.site.{variant,mounted,override,pageRecord,
// setVariant,setOverride} and the art:change event that switcher.js listens to.
(function() {
  'use strict';
  const VARIANT_KEY = 'art-variant';
  const OVERRIDE_KEY = 'art-override';
  const DEFAULT = 'ridgeline';

  const params = new URLSearchParams(location.search);
  if (params.get('art')) localStorage.setItem(VARIANT_KEY, params.get('art'));

  // Testing aid (the switcher sets it): other tags, other facets, another seed.
  let override = {};
  try { override = JSON.parse(sessionStorage.getItem(OVERRIDE_KEY)) || {}; } catch (error) {}

  let mounted = null;

  function pageRecord() {
    const el = document.getElementById('art-post');
    const d = el ? el.dataset : {};
    return {
      kind: d.kind || 'index',
      slug: d.slug || location.pathname,
      title: d.title || '',
      date: d.date || '',
      tags: (d.tags || '').split(' ').filter(Boolean),
      shape: d.shape || '',
      links: d.links || 0,
      facets: parseJson(d.facets)
    };
  }

  function parseJson(text) {
    try { return JSON.parse(text || '{}'); } catch (error) { return {}; }
  }

  function record() {
    const result = pageRecord();
    if (override.tags) result.tags = override.tags;
    if (override.salt) result.salt = override.salt;
    if (override.facets) result.facets = Object.assign({}, result.facets, override.facets);
    return result;
  }

  function changed() {
    document.dispatchEvent(new CustomEvent('art:change'));
  }

  function sync() {
    if (mounted) mounted.setPost(record());
    changed();
  }

  const site = LucumrArt.site = {
    // what this browser chose, unless that variant is no longer loaded (shelved)
    get variant() {
      const name = localStorage.getItem(VARIANT_KEY);
      return name && LucumrArt.variants.some(function(v) { return v.name === name; }) ? name : DEFAULT;
    },
    get mounted() { return mounted; },
    get override() { return override; },
    pageRecord: pageRecord,
    setVariant: function(name) {
      if (name === DEFAULT) localStorage.removeItem(VARIANT_KEY);
      else localStorage.setItem(VARIANT_KEY, name);
      if (mounted) mounted.setVariant(name);
      changed();
    },
    setOverride: function(next) {
      override = next || {};
      sessionStorage.setItem(OVERRIDE_KEY, JSON.stringify(override));
      sync();
    }
  };

  function init() {
    mounted = LucumrArt.mount({
      header: document.querySelector('.header-image'),
      footer: document.querySelector('.footer-image'),
      variant: site.variant,
      post: record(),
      still: params.has('still')
    });
    changed();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
  document.addEventListener('htmx:afterSettle', sync);
  document.addEventListener('htmx:historyRestore', sync);
})();
