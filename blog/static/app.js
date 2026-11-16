// htmx configuration and error handling
(function() {
  htmx.config.scrollIntoViewOnBoost = false;

  // Fall back to native navigation on htmx errors
  function htmxFallbackToNative(evt) {
    var path = evt.detail.pathInfo?.requestPath || evt.detail.requestConfig?.path;
    if (path) {
      window.location.href = path;
    }
  }

  // Network error (offline, DNS failure, etc.)
  htmx.on('htmx:sendError', htmxFallbackToNative);
  // Swap error (invalid HTML, can't find target, etc.)
  htmx.on('htmx:swapError', htmxFallbackToNative);
  // Server error responses (4xx, 5xx) - let browser handle natively
  htmx.on('htmx:responseError', htmxFallbackToNative);
})();

// Date warning for old articles
(function() {
  function updateDateWarning() {
    const dateEl = document.querySelector("p.date");
    if (!dateEl || dateEl.querySelector(".date-warning")) return;

    const pubDate = new Date(dateEl.dataset.date);
    if (Number.isNaN(pubDate.getTime())) return;

    const dayDiff = Math.floor((Date.now() - pubDate.getTime()) / (1000 * 60 * 60 * 24));
    const yearDiff = Math.floor(dayDiff / 365);

    if (dayDiff >= 365) {
      const warning = document.createElement("span");
      warning.className = "date-warning";
      warning.textContent = `this article is ${yearDiff} year${yearDiff != 1 ? 's' : ''} old.`;
      dateEl.appendChild(document.createTextNode(" — "));
      dateEl.appendChild(warning);
    }
  }

  document.addEventListener("DOMContentLoaded", updateDateWarning);
  document.addEventListener("htmx:afterSettle", function(event) {
    updateDateWarning();
    // History restores have no boosted request and manage their own scroll position.
    if (event.detail.boosted) {
      setTimeout(function() { window.scrollTo(0, 0); }, 50);
    }
  });
})();

// Tag pages. These run on full loads and after htmx-boosted navigation, since
// boosted swaps never fire DOMContentLoaded. Both are safe to run repeatedly.
(function() {
  const storageKey = 'tag-sort-preference';

  function sortEntries(list, sortBy) {
    const entries = Array.from(list.children);
    entries.sort(function(a, b) {
      if (sortBy === 'date') {
        // Newest first
        return (b.dataset.date || '').localeCompare(a.dataset.date || '');
      }
      return parseInt(a.dataset.idx, 10) - parseInt(b.dataset.idx, 10);
    });
    entries.forEach(function(entry) { list.appendChild(entry); });
  }

  function initTagSort() {
    const list = document.getElementById('tag-entries');
    if (!list) return;
    const controls = document.querySelectorAll('input[name="sort"]');

    const saved = localStorage.getItem(storageKey);
    const savedControl = saved && document.querySelector(`input[name="sort"][value="${saved}"]`);
    if (savedControl) {
      savedControl.checked = true;
      sortEntries(list, saved);
    }

    controls.forEach(function(control) {
      if (control.dataset.sortBound) return;
      control.dataset.sortBound = '1';
      control.addEventListener('change', function() {
        if (this.checked) {
          localStorage.setItem(storageKey, this.value);
          sortEntries(list, this.value);
        }
      });
    });
  }

  function initTagCloud() {
    document.querySelectorAll('.tag-link').forEach(function(link) {
      if (link.querySelector('.tag-tooltip')) return;
      const count = link.getAttribute('data-count');
      const tooltip = document.createElement('div');
      tooltip.className = 'tag-tooltip';
      tooltip.textContent = count === '1' ? '1 article' : count + ' articles';
      link.appendChild(tooltip);
    });
  }

  function init() {
    initTagSort();
    initTagCloud();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
  document.addEventListener('htmx:afterSettle', init);
})();
