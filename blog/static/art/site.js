// Boots the artwork on the blog's pages and keeps it in step with htmx
// navigation, which swaps div.body and leaves the canvases alone.
(function() {
  'use strict';
  const VARIANT_KEY = 'art-variant';
  const DEFAULT = 'ridgeline';

  // ?art=strata picks another loaded variant (remembered), ?art=ridgeline goes
  // back; ?still shows the finished picture without motion.
  const params = new URLSearchParams(location.search);
  if (params.get('art')) {
    if (params.get('art') === DEFAULT) localStorage.removeItem(VARIANT_KEY);
    else localStorage.setItem(VARIANT_KEY, params.get('art'));
  }

  let mounted = null;

  function record() {
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

  // what this browser chose, unless that variant is no longer loaded (shelved)
  function variant() {
    const name = localStorage.getItem(VARIANT_KEY);
    return name && LucumrArt.variants.some(function(v) { return v.name === name; }) ? name : DEFAULT;
  }

  function sync() {
    if (mounted) mounted.setPost(record());
  }

  function init() {
    mounted = LucumrArt.mount({
      header: document.querySelector('.header-image'),
      footer: document.querySelector('.footer-image'),
      variant: variant(),
      post: record(),
      still: params.has('still')
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
  document.addEventListener('htmx:afterSettle', sync);
  document.addEventListener('htmx:historyRestore', sync);
})();
