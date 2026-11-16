// The lab: one variant drawn for several posts at once, to judge how tags
// compose.  Everything is a query parameter so a page can be screenshotted:
//
//   variant=strata        which variant (default: ridgeline, the blog's)
//   theme=light|dark      (default: light)
//   still=1               finished pictures at once, no animation
//   tags=ai+thoughts;rust+tutorial;   tag sets to show instead of the defaults
//                         (an empty set is the index page, no tags)
//   same=ai+thoughts      the posts that have exactly these tags: same tags,
//                         different facets and shape (how much do they differ?)
//   slug=minijinja,psychosis          posts whose slug contains one of these
//   nofacets=1            leave the facets out (what tags alone give)
//   n=3                   only the first n samples
//   only=header|footer    one band only
//   width=390             constrain the width (below 800 the bands are the mobile height)
//   salt=x                another seed for the same posts
(function() {
  'use strict';
  const params = new URLSearchParams(location.search);
  const variant = params.get('variant') || 'ridgeline';
  const theme = params.get('theme') === 'dark' ? 'dark' : 'light';
  const still = params.has('still');
  const only = params.get('only');
  const width = parseInt(params.get('width'), 10) || 0;
  const salt = params.get('salt') || '';

  // Kept to six: a browser allows about 16 WebGL contexts per page.
  const DEFAULT_SETS = [
    [],
    ['ai', 'thoughts'],
    ['rust', 'tutorial'],
    ['go', 'ai', 'jinja', 'engineering', 'rust'],
    ['business', 'politics', 'thoughts'],
    ['python', 'unicode']
  ];

  document.documentElement.classList.toggle('dark', theme === 'dark');

  function link(label, changes, on) {
    const next = new URLSearchParams(location.search);
    Object.keys(changes).forEach(function(key) {
      if (changes[key] === null) next.delete(key);
      else next.set(key, changes[key]);
    });
    const a = document.createElement('a');
    a.href = '?' + next.toString();
    a.textContent = label;
    if (on) a.className = 'on';
    return a;
  }

  const nav = document.getElementById('nav');
  LucumrArt.variants.forEach(function(v) {
    nav.appendChild(link(v.name, { variant: v.name }, v.name === variant));
  });
  nav.appendChild(document.createElement('span')).textContent = '|';
  nav.appendChild(link('light', { theme: 'light' }, theme === 'light'));
  nav.appendChild(link('dark', { theme: 'dark' }, theme === 'dark'));
  nav.appendChild(document.createElement('span')).textContent = '|';
  nav.appendChild(link('animated', { still: null }, !still));
  nav.appendChild(link('still', { still: '1' }, still));
  nav.appendChild(document.createElement('span')).textContent = '|';
  nav.appendChild(link('reroll', { salt: String(Math.random()).slice(2, 8) }, false));

  function sameTags(a, b) {
    return a.length === b.length && a.slice().sort().join(' ') === b.slice().sort().join(' ');
  }

  function recordFor(tags) {
    if (!tags.length) return { kind: 'index', slug: '/', title: 'Blog index (no tags)', tags: [] };
    const post = LucumrArt.posts.find(function(p) { return sameTags(p.tags, tags); });
    if (post) return post;
    if (tags.length === 1) {
      return { kind: 'tag', slug: '/tags/' + tags[0] + '/', title: 'Tag page: ' + tags[0], tags: tags };
    }
    return { kind: 'post', slug: '/lab/' + tags.join('-') + '/', title: 'Made-up post', tags: tags };
  }

  let records;
  if (params.get('same')) {
    const wanted = params.get('same').split(/[+ ,]/).filter(Boolean);
    records = LucumrArt.posts.filter(function(p) { return sameTags(p.tags, wanted); });
  } else if (params.get('slug')) {
    const needles = params.get('slug').split(',');
    records = LucumrArt.posts.filter(function(p) {
      return needles.some(function(needle) { return needle && p.slug.indexOf(needle) >= 0; });
    });
  } else if (params.has('tags')) {
    records = params.get('tags').split(';').map(function(set) {
      return recordFor(set.split(/[+ ,]/).filter(Boolean));
    });
  } else {
    records = DEFAULT_SETS.map(recordFor);
  }
  records = records.slice(0, parseInt(params.get('n'), 10) || 6);

  const samples = document.getElementById('samples');
  if (width) samples.style.width = width + 'px';
  if (width && width <= 800) samples.classList.add('narrow');

  window.labMounts = records.map(function(record) {
    record = Object.assign({}, record, { salt: salt });
    if (params.has('nofacets')) delete record.facets;
    const sample = samples.appendChild(document.createElement('div'));
    sample.className = 'sample';
    const label = sample.appendChild(document.createElement('div'));
    label.className = 'label';
    const described = LucumrArt.describe(record);
    label.innerHTML = '<b></b> ';
    label.firstChild.textContent = (record.tags || []).join(', ') || '(no tags)';
    label.appendChild(document.createTextNode(
      '· ' + record.kind + ' · ' + record.slug + (record.date ? ' · ' + record.date : '') +
      ' · loose ' + described.loose.toFixed(2) + ' · energy ' + described.energy.toFixed(2)));
    if (described.facets.known) {
      const facets = described.facets;
      label.appendChild(document.createElement('br'));
      label.appendChild(document.createTextNode(Object.keys(facets).filter(function(name) {
        return name !== 'known';
      }).map(function(name) {
        const facet = facets[name];
        if (facet === null) return name + ' –';
        if (typeof facet === 'number') return name + ' ' + facet.toFixed(2);
        return name + ' ' + facet.top + (facet.p < 0.995 ? ' ' + Math.round(facet.p * 100) + '%' : '');
      }).join(' · ')));
    }

    let header = null, footer = null;
    if (only !== 'footer') {
      header = sample.appendChild(document.createElement('div'));
      header.className = 'header-image';
    }
    const page = sample.appendChild(document.createElement('div'));
    page.className = 'page';
    page.innerHTML = '<h1></h1><p>… the page …</p>';
    page.firstChild.textContent = record.title || '';
    if (only !== 'header') {
      footer = sample.appendChild(document.createElement('div'));
      footer.className = 'footer-image';
    }
    return LucumrArt.mount({
      header: header, footer: footer, variant: variant, post: record, theme: theme, still: still
    });
  });
})();
