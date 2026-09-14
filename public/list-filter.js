(function () {
  function norm(value) {
    return String(value == null ? '' : value).toLowerCase();
  }

  function setup(root) {
    if (root.dataset.filterReady === 'true') return;
    root.dataset.filterReady = 'true';

    var search = root.querySelector('[data-filter-search]');
    var chips = Array.prototype.slice.call(root.querySelectorAll('[data-filter-chip]'));
    // 列表项通常渲染在筛选栏之外（筛选栏与列表是兄弟节点），
    // 因此默认在父容器范围内查找；也可用 data-filter-scope 指定范围。
    var scopeSelector = root.getAttribute('data-filter-scope');
    var scope = null;
    if (scopeSelector) {
      scope = document.querySelector(scopeSelector);
    }
    if (!scope) scope = root.parentElement || document;
    var items = Array.prototype.slice.call(scope.querySelectorAll('[data-filter-item]'));
    if (items.length === 0) items = Array.prototype.slice.call(document.querySelectorAll('[data-filter-item]'));
    var countEl = root.querySelector('[data-filter-count]');
    var clearBtn = root.querySelector('[data-filter-clear]');
    var emptyEl = root.querySelector('[data-filter-empty]');
    var statusEl = root.querySelector('[data-filter-status]');
    var active = {};

    function apply() {
      var query = norm(search && search.value).trim();
      var visible = 0;
      items.forEach(function (item) {
        var okSearch = !query || norm(item.dataset.search).indexOf(query) !== -1;
        var okChips = true;
        Object.keys(active).forEach(function (key) {
          if (!active[key]) return;
          var raw = item.getAttribute('data-' + key) || '';
          if (norm(raw).split('|').indexOf(norm(active[key])) === -1) okChips = false;
        });
        var show = okSearch && okChips;
        item.hidden = !show;
        if (show) visible += 1;
      });
      if (countEl) countEl.innerHTML = '<strong>' + visible + '</strong>';
      if (emptyEl) emptyEl.hidden = visible !== 0;
      var hasFilter = query !== '' || Object.keys(active).some(function (k) { return active[k]; });
      if (clearBtn) clearBtn.hidden = !hasFilter;
      if (statusEl) statusEl.hidden = items.length === 0;
    }

    chips.forEach(function (chip) {
      chip.addEventListener('click', function () {
        var key = chip.dataset.filterKey;
        var value = chip.dataset.filterValue || '';
        if (active[key] === value) {
          delete active[key];
        } else {
          active[key] = value;
        }
        chips.forEach(function (other) {
          if (other.dataset.filterKey !== key) return;
          var mine = other.dataset.filterValue || '';
          other.setAttribute('aria-pressed', active[key] === mine ? 'true' : 'false');
        });
        apply();
      });
    });

    if (search) {
      var timer = null;
      search.addEventListener('input', function () {
        if (timer) clearTimeout(timer);
        timer = setTimeout(apply, 120);
      });
      search.addEventListener('keydown', function (event) {
        if (event.key === 'Escape') { search.value = ''; apply(); }
      });
    }

    if (clearBtn) {
      clearBtn.addEventListener('click', function () {
        if (search) search.value = '';
        active = {};
        chips.forEach(function (chip) { chip.setAttribute('aria-pressed', 'false'); });
        apply();
      });
    }

    root.addEventListener('reset-filters', function () {
      if (search) search.value = '';
      active = {};
      chips.forEach(function (chip) { chip.setAttribute('aria-pressed', 'false'); });
      apply();
    });

    apply();
  }

  function boot() {
    document.querySelectorAll('[data-filter-root]').forEach(setup);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
  document.addEventListener('astro:page-load', boot);
})();
