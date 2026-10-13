/* global React, ReactDOM, htm */
// React dashboard app for the Portal POS E2E suite.
//
// This file is inlined verbatim into reports/dashboard/index.html by
// scripts/build-dashboard.mjs. It reads the run data from window.__DATA__
// (also inlined) and renders an interactive dashboard with React — no build
// step, no network, works from file://.
(function () {
  'use strict';
  const { useState, useMemo, useEffect, useCallback } = React;
  const html = htm.bind(React.createElement);

  const DATA = window.__DATA__ || { summary: {}, screens: [], generatedAt: 'unknown' };

  const STATUS_META = {
    expected: { cls: 'pass', label: 'Passed' },
    unexpected: { cls: 'fail', label: 'Failed' },
    flaky: { cls: 'flaky', label: 'Flaky' },
    skipped: { cls: 'skip', label: 'Skipped' },
  };

  const fmtDur = (ms) => {
    const s = Math.round((ms || 0) / 1000);
    if (s < 60) return `${s}s`;
    const m = Math.floor(s / 60);
    if (m < 60) return `${m}m ${s % 60}s`;
    const h = Math.floor(m / 60);
    return `${h}h ${m % 60}m`;
  };

  // ---- Small presentational pieces -----------------------------------------

  function Badge({ status }) {
    const meta = STATUS_META[status] || { cls: 'skip', label: status };
    return html`<span class=${`badge ${meta.cls}`}>${meta.label}</span>`;
  }

  function SummaryCards({ s }) {
    const cards = [
      { key: 'total', num: s.total, lbl: 'Total', cls: '' },
      { key: 'passed', num: s.passed, lbl: 'Passed', cls: 'pass' },
      { key: 'failed', num: s.failed, lbl: 'Failed', cls: 'fail' },
      { key: 'flaky', num: s.flaky, lbl: 'Flaky', cls: 'flaky' },
      { key: 'skipped', num: s.skipped, lbl: 'Skipped', cls: 'skip' },
    ];
    return html`
      <div class="cards">
        ${cards.map(
          (c) => html`
            <div key=${c.key} class=${`card ${c.cls}`}>
              <div class="num">${c.num}</div>
              <div class="lbl">${c.lbl}</div>
            </div>
          `,
        )}
        <div class="card">
          <div class="num">${s.passRate}%</div>
          <div class="lbl">Pass rate</div>
          <div class="ratebar"><span style=${{ width: `${s.passRate}%` }}></span></div>
        </div>
      </div>
    `;
  }

  function Toolbar({ query, setQuery, filter, setFilter, counts, onExpandAll, onCollapseAll }) {
    const buttons = [
      { key: 'all', label: `All (${counts.all})` },
      { key: 'unexpected', label: `Failed (${counts.unexpected})` },
      { key: 'flaky', label: `Flaky (${counts.flaky})` },
      { key: 'expected', label: `Passed (${counts.expected})` },
      { key: 'skipped', label: `Skipped (${counts.skipped})` },
    ];
    return html`
      <div class="toolbar">
        <input
          class="search"
          type="search"
          placeholder="Filter by test name, file, or error…"
          value=${query}
          onInput=${(e) => setQuery(e.target.value)}
        />
        ${buttons.map(
          (b) => html`
            <button
              key=${b.key}
              class=${filter === b.key ? 'active' : ''}
              onClick=${() => setFilter(b.key)}
            >
              ${b.label}
            </button>
          `,
        )}
        <button class="ghost" onClick=${onExpandAll}>Expand all</button>
        <button class="ghost" onClick=${onCollapseAll}>Collapse all</button>
      </div>
    `;
  }

  function TestCard({ t, onShot }) {
    const [open, setOpen] = useState(false);
    const hasErr = !!t.message;
    return html`
      <div class=${`test ${t.status}`}>
        <div class="test-head">
          <${Badge} status=${t.status} />
          <span class="test-title">${t.title}</span>
          <span class="test-dur">
            ${fmtDur(t.duration)}${
              t.retries ? ` · ${t.retries} retr${t.retries > 1 ? 'ies' : 'y'}` : ''
            }
          </span>
        </div>
        <div class="test-file">${t.file}</div>
        ${
          hasErr &&
          html`
            <pre class=${`test-err ${open ? 'open' : ''}`}>${t.message.slice(0, 4000)}</pre>
            ${
              t.message.length > 400 &&
              html`<button class="toggle-err" onClick=${() => setOpen((v) => !v)}>
                ${open ? 'Show less' : 'Show more'}
              </button>`
            }
          `
        }
        <div class="test-links">
          ${
            t.screenshot &&
            html`<button class="shot" onClick=${() => onShot(t.screenshot, t.title)}>
              <img loading="lazy" src=${t.screenshot} alt="failure screenshot" />
            </button>`
          }
          ${
            t.errorContext &&
            html`<a href=${t.errorContext} target="_blank" class="link">error-context.md</a>`
          }
        </div>
      </div>
    `;
  }

  function ScreenSection({ screen, tests, open, onToggle, onShot }) {
    const executed = screen.total - screen.skipped;
    const rate = executed ? Math.round((screen.passed / executed) * 100) : 0;
    const sorted = useMemo(() => {
      const order = { unexpected: 0, flaky: 1, expected: 2, skipped: 3 };
      return tests.slice().sort((a, b) => (order[a.status] ?? 4) - (order[b.status] ?? 4));
    }, [tests]);
    return html`
      <section class=${`screen ${open ? 'open' : ''}`}>
        <button class="screen-summary" onClick=${onToggle}>
          <span class="caret">${open ? '▾' : '▸'}</span>
          <span class="screen-name">${screen.name}</span>
          <span class="screen-stats">
            ${screen.failed > 0 && html`<span class="chip fail">${screen.failed} failed</span>`}
            ${screen.flaky > 0 && html`<span class="chip flaky">${screen.flaky} flaky</span>`}
            <span class="chip pass">${screen.passed} passed</span>
            ${screen.skipped > 0 && html`<span class="chip skip">${screen.skipped} skipped</span>`}
          </span>
          <span class="screen-rate">${rate}%</span>
          <span class="screen-bar"
            ><span class="screen-bar-fill" style=${{ width: `${rate}%` }}></span
          ></span>
        </button>
        ${
          open &&
          html`<div class="screen-body">
            ${sorted.map((t, i) => html`<${TestCard} key=${t.file + i} t=${t} onShot=${onShot} />`)}
          </div>`
        }
      </section>
    `;
  }

  function Lightbox({ shot, onClose }) {
    useEffect(() => {
      const onKey = (e) => e.key === 'Escape' && onClose();
      window.addEventListener('keydown', onKey);
      return () => window.removeEventListener('keydown', onKey);
    }, [onClose]);
    if (!shot) return null;
    return html`
      <div class="lightbox" onClick=${onClose}>
        <div class="lightbox-inner" onClick=${(e) => e.stopPropagation()}>
          <div class="lightbox-head">
            <span>${shot.title}</span>
            <button class="lightbox-close" onClick=${onClose}>✕</button>
          </div>
          <img src=${shot.src} alt=${shot.title} />
          <a href=${shot.src} target="_blank" class="link">Open full size ↗</a>
        </div>
      </div>
    `;
  }

  // ---- Root app ------------------------------------------------------------

  function App() {
    const [query, setQuery] = useState('');
    const [filter, setFilter] = useState('all');
    const [shot, setShot] = useState(null);
    // Track which screens the user has explicitly toggled; otherwise fall back
    // to "auto" (open when the screen has failures or matches an active filter).
    const [overrides, setOverrides] = useState({});

    const onShot = useCallback((src, title) => setShot({ src, title }), []);

    const counts = useMemo(() => {
      const c = { all: 0, expected: 0, unexpected: 0, flaky: 0, skipped: 0 };
      for (const s of DATA.screens)
        for (const t of s.tests) {
          c.all++;
          if (c[t.status] != null) c[t.status]++;
        }
      return c;
    }, []);

    const q = query.trim().toLowerCase();
    const matchesTest = useCallback(
      (t) => {
        const statusOk = filter === 'all' || t.status === filter;
        const textOk = !q || `${t.title} ${t.file} ${t.message}`.toLowerCase().includes(q);
        return statusOk && textOk;
      },
      [filter, q],
    );

    const filteredScreens = useMemo(() => {
      const active = filter !== 'all' || q !== '';
      return DATA.screens
        .map((s) => ({ screen: s, tests: s.tests.filter(matchesTest) }))
        .filter((x) => x.tests.length > 0)
        .map((x) => {
          const key = x.screen.name;
          let open;
          if (key in overrides) open = overrides[key];
          else if (active)
            open = true; // filtering/searching -> reveal matches
          else open = x.screen.failed > 0; // default: expand failing screens
          return { ...x, open };
        });
    }, [matchesTest, overrides, filter, q]);

    const visibleCount = filteredScreens.reduce((a, x) => a + x.tests.length, 0);

    const setAll = (val) => {
      const next = {};
      for (const x of filteredScreens) next[x.screen.name] = val;
      setOverrides(next);
    };

    const s = DATA.summary;
    return html`
      <div class="wrap">
        <header class="hero">
          <h1>E2E Test Dashboard <span class="tag">React</span></h1>
          <div class="sub">
            Portal POS · env <b>${s.env || '—'}</b> · run ${DATA.generatedAt} · duration
            ${' '}${fmtDur(s.duration)}
          </div>
        </header>

        <${SummaryCards} s=${s} />

        <${Toolbar}
          query=${query}
          setQuery=${setQuery}
          filter=${filter}
          setFilter=${setFilter}
          counts=${counts}
          onExpandAll=${() => setAll(true)}
          onCollapseAll=${() => setAll(false)}
        />

        ${
          filteredScreens.length === 0
            ? html`<div class="empty">No tests match the current filter.</div>`
            : html`<div class="screens">
                ${filteredScreens.map(
                  (x) => html`
                    <${ScreenSection}
                      key=${x.screen.name}
                      screen=${x.screen}
                      tests=${x.tests}
                      open=${x.open}
                      onToggle=${() => setOverrides((o) => ({ ...o, [x.screen.name]: !x.open }))}
                      onShot=${onShot}
                    />
                  `,
                )}
              </div>`
        }

        <footer>
          Showing ${visibleCount} of ${counts.all} tests · generated by scripts/build-dashboard.mjs
        </footer>
      </div>
      <${Lightbox} shot=${shot} onClose=${() => setShot(null)} />
    `;
  }

  const root = ReactDOM.createRoot(document.getElementById('root'));
  root.render(html`<${App} />`);
})();
