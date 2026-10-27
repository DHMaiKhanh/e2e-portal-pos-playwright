/* global results */
'use strict';

const $ = (id) => document.getElementById(id);
const esc = (s) =>
  String(s ?? '').replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
  );
const fileUrl = (p) =>
  'file:///' + encodeURI(p.replace(/\\/g, '/')).replace(/#/g, '%23').replace(/\?/g, '%3F');

const STATUS_TEXT = {
  passed: 'Đạt',
  failed: 'Lỗi',
  flaky: 'Chập chờn',
  skipped: 'Bỏ qua',
  notRun: 'Không chạy',
};
const FILTERS = [
  {
    id: 'attention',
    label: 'Cần xem',
    match: (t) => t.status === 'failed' || t.status === 'flaky',
  },
  { id: 'failed', label: 'Lỗi', match: (t) => t.status === 'failed' },
  { id: 'flaky', label: 'Chập chờn', match: (t) => t.status === 'flaky' },
  { id: 'passed', label: 'Đạt', match: (t) => t.status === 'passed' },
  { id: 'skipped', label: 'Bỏ qua', match: (t) => t.status === 'skipped' || t.status === 'notRun' },
  { id: 'all', label: 'Tất cả', match: () => true },
];

const state = {
  run: null, // run on screen
  latestId: null,
  filter: 'attention',
  screen: null,
  query: '',
  selected: null,
  folders: [],
  picked: new Set(),
};

// ---------------------------------------------------------------- formatting

function fmtDuration(ms) {
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s} giây`;
  const m = Math.floor(s / 60);
  return m < 60 ? `${m} phút ${s % 60} giây` : `${Math.floor(m / 60)} giờ ${m % 60} phút`;
}
function fmtTime(iso) {
  return new Date(iso).toLocaleString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}
function fmtAgo(iso) {
  const min = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (min < 1) return 'vừa xong';
  if (min < 60) return `${min} phút trước`;
  const h = Math.round(min / 60);
  return h < 24 ? `${h} giờ trước` : fmtTime(iso);
}
function toast(text) {
  const el = $('toast');
  el.textContent = text;
  el.hidden = false;
  clearTimeout(toast.t);
  toast.t = setTimeout(() => (el.hidden = true), 2200);
}

// ---------------------------------------------------------------- results view

/** Tests that count towards the score: setup is plumbing, not a feature. */
const featureTests = (run) => run.tests.filter((t) => t.project !== 'setup');

function render() {
  const run = state.run;
  $('empty').hidden = Boolean(run);
  $('content').hidden = !run;
  $('oldRunBanner').hidden = !run || run.id === state.latestId;
  if (!run) {
    $('runMeta').textContent = 'Chưa có lượt chạy nào';
    $('setupBanner').hidden = true;
    return;
  }
  if (run.id !== state.latestId)
    $('oldRunText').textContent = `Đang xem lần chạy lúc ${fmtTime(run.startTime)}.`;
  $('runMeta').textContent =
    `Chạy ${fmtAgo(run.startTime)} · môi trường ${run.env} · ${fmtDuration(run.duration)}`;
  $('runMeta').title = run.command;

  renderSetupBanner(run);
  renderHealth(run);
  renderScreens(run);
  renderFilters(run);
  renderList(run);
}

function renderSetupBanner(run) {
  const failed = run.tests.find((t) => t.project === 'setup' && t.status === 'failed');
  const el = $('setupBanner');
  el.hidden = !failed;
  if (!failed) return;
  const expired = /expired|hết hạn/i.test(failed.error?.message ?? '');
  el.innerHTML =
    `<b>Bước chuẩn bị bị lỗi nên các test phía sau không chạy được.</b> ` +
    (expired
      ? 'Phiên đăng nhập đã hết hạn — chạy <code>npm run auth:stage</code> để đăng nhập lại rồi chạy test lại.'
      : 'Xem chi tiết lỗi bên dưới.') +
    `<pre>${esc(failed.error?.message ?? '')}</pre>`;
}

function ringSvg(pct, color) {
  const r = 46;
  const c = 2 * Math.PI * r;
  const dash = (c * pct) / 100;
  return `<svg viewBox="0 0 112 112" role="img" aria-label="${pct}% đạt">
    <circle cx="56" cy="56" r="${r}" fill="none" stroke="var(--surface-2)" stroke-width="12"/>
    <circle cx="56" cy="56" r="${r}" fill="none" stroke="${color}" stroke-width="12" stroke-linecap="round"
      stroke-dasharray="${dash} ${c}" transform="rotate(-90 56 56)"/>
    <text x="56" y="63" text-anchor="middle">${pct}%</text></svg>`;
}

function renderHealth(run) {
  const tests = featureTests(run);
  const n = (s) => tests.filter((t) => t.status === s).length;
  const passed = n('passed');
  const failed = n('failed');
  const flaky = n('flaky');
  const skipped = n('skipped');
  const notRun = n('notRun');
  const ran = passed + failed + flaky;
  const pct = ran ? Math.round(((passed + flaky) / ran) * 100) : 0;
  const color = failed ? 'var(--bad)' : flaky ? 'var(--warn)' : ran ? 'var(--ok)' : 'var(--skip)';
  $('ring').innerHTML = ringSvg(pct, color);

  let verdict;
  let sub;
  if (!ran) {
    verdict = 'Không có test nào chạy';
    sub = notRun
      ? 'Các test bị dừng trước khi chạy — xem thông báo ở trên.'
      : 'Tất cả test đều đang bị bỏ qua.';
  } else if (failed) {
    verdict = `Có ${failed} chỗ cần xem`;
    sub = `${passed} / ${ran} test đã chạy đều đạt. Bấm vào từng test lỗi bên dưới để xem ảnh chụp và các bước.`;
  } else if (flaky) {
    verdict = 'Ổn, nhưng có test chập chờn';
    sub = `${flaky} test lỗi lần đầu nhưng chạy lại thì đạt — thường do môi trường DEV dùng chung, chưa chắc là bug.`;
  } else {
    verdict = 'Tất cả đều đạt';
    sub = `${passed} test đã chạy, không có lỗi nào.`;
  }
  $('verdict').textContent = verdict;
  $('verdictSub').textContent = sub;
  const chip = (cls, label, v) => (v ? `<span class="chip stat ${cls}">${v} ${label}</span>` : '');
  $('statChips').innerHTML =
    chip('ok', 'đạt', passed) +
    chip('bad', 'lỗi', failed) +
    chip('warn', 'chập chờn', flaky) +
    chip('skip', 'bỏ qua', skipped) +
    chip('skip', 'không chạy', notRun) +
    `<span class="chip stat skip">${fmtDuration(run.duration)}</span>`;
}

function screenGroups(run) {
  const groups = new Map();
  for (const t of featureTests(run)) {
    if (!groups.has(t.screen))
      groups.set(t.screen, { id: t.screen, label: t.screenLabel, tests: [] });
    groups.get(t.screen).tests.push(t);
  }
  return [...groups.values()].sort((a, b) => a.label.localeCompare(b.label, 'vi'));
}

function renderScreens(run) {
  $('screens').innerHTML = screenGroups(run)
    .map((g) => {
      const n = (s) => g.tests.filter((t) => t.status === s).length;
      const ran = n('passed') + n('failed') + n('flaky');
      const cls = n('failed') ? 'bad' : n('flaky') ? 'warn' : ran ? 'ok' : '';
      const detail = n('failed')
        ? `${n('failed')} lỗi · ${n('passed')} đạt`
        : ran
          ? `${n('passed') + n('flaky')}/${ran} đạt`
          : 'không có test chạy';
      const skipped = g.tests.length - ran;
      return `<button class="tile ${cls} ${state.screen === g.id ? 'on' : ''}" data-screen="${esc(g.id)}">
        <strong title="${esc(g.label)}">${esc(g.label)}</strong>
        <span>${detail}${skipped ? ` · ${skipped} bỏ qua` : ''}</span></button>`;
    })
    .join('');
}

function visibleTests(run) {
  const f = FILTERS.find((x) => x.id === state.filter);
  const q = state.query.trim().toLowerCase();
  return featureTests(run).filter(
    (t) =>
      f.match(t) &&
      (!state.screen || t.screen === state.screen) &&
      (!q || `${t.title} ${t.describe}`.toLowerCase().includes(q)),
  );
}

function renderFilters(run) {
  const tests = featureTests(run).filter((t) => !state.screen || t.screen === state.screen);
  $('filterChips').innerHTML = FILTERS.map((f) => {
    const count = tests.filter(f.match).length;
    return `<button class="chip ${state.filter === f.id ? 'on' : ''}" data-filter="${f.id}">${f.label} (${count})</button>`;
  }).join('');
  const screen = state.screen ? screenGroups(run).find((g) => g.id === state.screen) : null;
  $('inboxTitle').innerHTML =
    esc(FILTERS.find((f) => f.id === state.filter).label) +
    (screen
      ? ` <span class="muted">· ${esc(screen.label)}</span> <button class="btn link small" id="clearScreen">bỏ lọc màn hình</button>`
      : '');
}

function renderList(run) {
  const tests = visibleTests(run);
  if (!tests.some((t) => t.id === state.selected)) state.selected = tests[0]?.id ?? null;
  $('list').innerHTML = tests.length
    ? tests
        .map(
          (t) => `<li data-id="${esc(t.id)}" class="${t.id === state.selected ? 'sel' : ''}">
            <span class="dot ${t.status}"></span>
            <div><div class="t">${esc(t.title)}</div>
            <div class="s">${esc(t.screenLabel)}${t.describe ? ' › ' + esc(t.describe) : ''}</div></div></li>`,
        )
        .join('')
    : `<li class="none">${state.filter === 'attention' ? 'Không có gì cần xem 🎉' : 'Không có test nào khớp bộ lọc'}</li>`;
  renderDetail(run.tests.find((t) => t.id === state.selected));
}

function renderDetail(t) {
  const el = $('detail');
  if (!t) {
    el.innerHTML =
      '<div class="placeholder">Chọn một test ở danh sách bên trái để xem chi tiết.</div>';
    return;
  }
  const shots = t.attachments.filter((a) => a.contentType.startsWith('image/'));
  const videos = t.attachments.filter((a) => a.contentType.startsWith('video/'));
  const folder = t.attachments[0]?.path;

  let html = `<h2>${esc(t.title)}</h2>
    <div class="crumb">${esc(t.screenLabel)}${t.describe ? ' › ' + esc(t.describe) : ''}</div>
    <span class="pill ${t.status}">${STATUS_TEXT[t.status]}</span>
    <span class="muted"> · ${fmtDuration(t.duration)}${t.retries ? ` · chạy lại ${t.retries} lần` : ''}</span>`;

  if (t.status === 'skipped' || t.status === 'notRun') {
    html += `<h4>Vì sao bỏ qua</h4><p>${esc(
      t.skipReason ||
        (t.fixme
          ? 'Test này chưa tự động hoá (đánh dấu fixme) — cần kiểm thủ công hoặc cần dữ liệu đặc biệt.'
          : t.status === 'notRun'
            ? 'Không chạy vì lượt chạy dừng trước (thường do bước chuẩn bị bị lỗi).'
            : 'Không có dữ liệu phù hợp trên môi trường để chạy test này.'),
    )}</p>`;
  }
  if (t.error) {
    html += `<h4>${t.status === 'flaky' ? 'Lỗi ở lần chạy đầu' : 'Lỗi'}</h4>
      <pre class="errbox">${esc(t.error.message.split('\n').slice(0, 14).join('\n'))}</pre>
      ${t.error.location ? `<div class="loc">Tại ${esc(t.error.location)}</div>` : ''}`;
  }
  if (shots.length) {
    html += `<h4>Ảnh chụp màn hình lúc lỗi</h4><div class="shots">${shots
      .map(
        (a) =>
          `<img src="${fileUrl(a.path)}" data-full="${esc(fileUrl(a.path))}" alt="${esc(a.name)}" />`,
      )
      .join('')}</div>`;
  }
  if (videos.length) {
    html += `<h4>Video</h4>${videos
      .map((a) => `<video controls preload="metadata" src="${fileUrl(a.path)}"></video>`)
      .join('')}`;
  }
  if (t.steps.length) {
    const start = t.hiddenSteps + 1;
    html += `<h4>Các bước đã chạy${t.hiddenSteps ? ` <span class="muted">(bỏ bớt ${t.hiddenSteps} bước đầu)</span>` : ''}</h4>
      <ol class="steps" start="${start}">${t.steps
        .map(
          (s) =>
            `<li class="${s.failed ? 'fail' : ''}">${esc(s.title)}${s.failed ? ' — dừng ở đây' : ''}</li>`,
        )
        .join('')}</ol>`;
  }
  html += `<div class="btns">
      ${t.error ? '<button class="btn small" data-act="copy">Sao chép để gửi dev</button>' : ''}
      ${folder ? `<button class="btn small" data-act="folder" data-path="${esc(folder)}">Mở thư mục ảnh/video</button>` : ''}
      <button class="btn small" data-act="file" data-path="${esc(t.file)}">Mở file test</button>
    </div>`;
  el.innerHTML = html;
}

function bugReport(t) {
  const lines = [
    `Test: ${t.title}`,
    `Màn hình: ${t.screenLabel}${t.describe ? ' › ' + t.describe : ''}`,
    `Môi trường: ${state.run.env} · ${fmtTime(state.run.startTime)}`,
    '',
  ];
  if (t.steps.length) {
    lines.push('Các bước:');
    t.steps.forEach((s, i) =>
      lines.push(`${i + 1 + t.hiddenSteps}. ${s.title}${s.failed ? '  ← lỗi ở đây' : ''}`),
    );
    lines.push('');
  }
  lines.push('Lỗi:', t.error?.message ?? '');
  if (t.error?.location) lines.push(`(${t.error.location})`);
  return lines.join('\n');
}

// ---------------------------------------------------------------- history view

async function renderHistory() {
  const history = (await results.history()).slice(-20);
  const chart = $('chart');
  if (!history.length) {
    chart.innerHTML = '<p class="muted">Chưa có lịch sử.</p>';
    $('runsBody').innerHTML = '';
    return;
  }
  const W = 900;
  const H = 220;
  const pad = { l: 34, r: 8, t: 10, b: 28 };
  const max = Math.max(...history.map((h) => h.stats.total));
  const slot = (W - pad.l - pad.r) / history.length;
  const bw = Math.min(42, slot * 0.6);
  const y = (v) => ((H - pad.t - pad.b) * v) / max;
  let svg = `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">`;
  for (const v of [0, Math.round(max / 2), max]) {
    const yy = H - pad.b - y(v);
    svg += `<line x1="${pad.l}" x2="${W - pad.r}" y1="${yy}" y2="${yy}" stroke="var(--border)"/>
      <text x="${pad.l - 6}" y="${yy + 4}" text-anchor="end">${v}</text>`;
  }
  history.forEach((h, i) => {
    const x = pad.l + slot * i + (slot - bw) / 2;
    let base = H - pad.b;
    svg += `<rect class="hit" data-run="${esc(h.id)}" x="${pad.l + slot * i}" y="${pad.t}" width="${slot}" height="${H - pad.t - pad.b}"><title>${esc(fmtTime(h.startTime))}: ${h.stats.passed} đạt, ${h.stats.failed} lỗi</title></rect>`;
    const parts = [
      ['var(--ok)', h.stats.passed],
      ['var(--warn)', h.stats.flaky],
      ['var(--bad)', h.stats.failed],
      ['var(--skip)', h.stats.skipped + h.stats.notRun],
    ];
    for (const [color, v] of parts) {
      if (!v) continue;
      const hh = y(v);
      base -= hh;
      svg += `<rect class="col" data-run="${esc(h.id)}" x="${x}" y="${base}" width="${bw}" height="${hh}" fill="${color}" ${h.id === state.run?.id ? 'stroke="var(--text)" stroke-width="1.5"' : ''}/>`;
    }
    const d = new Date(h.startTime);
    svg += `<text x="${x + bw / 2}" y="${H - 10}" text-anchor="middle">${d.getDate()}/${d.getMonth() + 1} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}</text>`;
  });
  chart.innerHTML = svg + '</svg>';

  $('runsBody').innerHTML = [...history]
    .reverse()
    .map(
      (
        h,
      ) => `<tr data-run="${esc(h.id)}"><td>${esc(fmtTime(h.startTime))}</td><td>${esc(h.env)}</td>
        <td>${h.stats.passed}</td><td class="${h.stats.failed ? 'num-bad' : ''}">${h.stats.failed}</td>
        <td>${h.stats.flaky}</td><td>${h.stats.skipped + h.stats.notRun}</td><td>${fmtDuration(h.duration)}</td></tr>`,
    )
    .join('');
}

async function openRun(id) {
  const run = await results.run(id);
  if (!run) return toast('Không tìm thấy dữ liệu của lần chạy này.');
  showRun(run);
  switchView('results');
}

// ---------------------------------------------------------------- run panel

async function loadOptions() {
  const { folders, envs } = await results.options();
  state.folders = folders;
  $('folderChips').innerHTML = folders
    .map(
      (f) =>
        `<button class="chip" data-folder="${esc(f.id)}" title="tests/e2e/${esc(f.id)}">${esc(f.label)}</button>`,
    )
    .join('');
  $('envSelect').innerHTML = envs
    .map((e) => `<option ${e === 'stage' ? 'selected' : ''}>${esc(e)}</option>`)
    .join('');
}

function showRunState(s) {
  $('btnStart').hidden = s.running;
  $('btnStop').hidden = !s.running;
  $('btnRunPanel').textContent = s.running ? 'Đang chạy…' : 'Chạy test';
  if (s.running) {
    $('progress').hidden = false;
    const pct = s.total ? Math.min(100, Math.round((s.done / s.total) * 100)) : 0;
    $('progressFill').style.width = `${pct}%`;
    $('progressFill').parentElement.classList.toggle('has-fail', s.failed > 0);
    $('progressText').textContent = s.total
      ? `Đang chạy ${s.done}/${s.total} test${s.failed ? ` · ${s.failed} lỗi` : ''}`
      : 'Đang khởi động Playwright…';
  } else if (s.code !== undefined) {
    $('progressText').textContent =
      s.code === 0
        ? 'Chạy xong — không có lỗi.'
        : 'Chạy xong — có test lỗi hoặc lượt chạy bị dừng.';
    $('progressFill').style.width = '100%';
    setTimeout(() => ($('progress').hidden = true), 6000);
  }
}

// ---------------------------------------------------------------- wiring

function showRun(run) {
  state.run = run;
  state.screen = null;
  state.selected = null;
  state.filter = run && featureTests(run).some(FILTERS[0].match) ? 'attention' : 'all';
  render();
}

function switchView(view) {
  document
    .querySelectorAll('.tab')
    .forEach((b) => b.classList.toggle('active', b.dataset.view === view));
  $('view-results').hidden = view !== 'results';
  $('view-history').hidden = view !== 'history';
  if (view === 'history') renderHistory();
}

document.addEventListener('click', (e) => {
  const el = e.target.closest(
    '[data-screen],[data-filter],[data-id],[data-run],[data-folder],[data-act],[data-full],.tab,#clearScreen',
  );
  if (!el) return;
  if (el.matches('.tab')) return switchView(el.dataset.view);
  if (el.id === 'clearScreen') {
    state.screen = null;
    return render();
  }
  if (el.dataset.screen !== undefined) {
    state.screen = state.screen === el.dataset.screen ? null : el.dataset.screen;
    state.filter = 'all';
    return render();
  }
  if (el.dataset.filter) {
    state.filter = el.dataset.filter;
    return render();
  }
  if (el.dataset.id) {
    state.selected = el.dataset.id;
    return renderList(state.run);
  }
  if (el.dataset.run) return openRun(el.dataset.run);
  if (el.dataset.folder) {
    const id = el.dataset.folder;
    state.picked.has(id) ? state.picked.delete(id) : state.picked.add(id);
    el.classList.toggle('on', state.picked.has(id));
    return;
  }
  if (el.dataset.full) {
    $('lightboxImg').src = el.dataset.full;
    $('lightbox').hidden = false;
    return;
  }
  const t = state.run?.tests.find((x) => x.id === state.selected);
  if (el.dataset.act === 'copy' && t) {
    navigator.clipboard
      .writeText(bugReport(t))
      .then(() => toast('Đã sao chép — dán vào ticket/chat cho dev.'));
  } else if (el.dataset.act === 'folder') {
    results.showInFolder(el.dataset.path);
  } else if (el.dataset.act === 'file') {
    results.openPath(el.dataset.path);
  }
});

$('lightbox').addEventListener('click', () => ($('lightbox').hidden = true));
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') $('lightbox').hidden = true;
});
$('search').addEventListener('input', (e) => {
  state.query = e.target.value;
  renderList(state.run);
});
$('btnRunPanel').addEventListener('click', () => ($('runPanel').hidden = !$('runPanel').hidden));
$('btnReport').addEventListener('click', () => results.openHtmlReport());
$('btnBackLatest').addEventListener('click', async () => showRun(await results.latest()));
$('btnLog').addEventListener('click', () => {
  $('log').hidden = !$('log').hidden;
  $('btnLog').textContent = $('log').hidden ? 'Xem log' : 'Ẩn log';
});
$('btnStart').addEventListener('click', async () => {
  $('log').textContent = '';
  const res = await results.startRun({ folders: [...state.picked], env: $('envSelect').value });
  if (!res.ok) toast(res.error);
  else $('runPanel').hidden = true;
});
$('btnStop').addEventListener('click', () => results.stopRun());

results.onRunState(showRunState);
results.onRunOutput((line) => {
  const log = $('log');
  log.textContent += line + '\n';
  if (log.textContent.length > 200_000) log.textContent = log.textContent.slice(-150_000);
  log.scrollTop = log.scrollHeight;
});
results.onUpdated((run) => {
  state.latestId = run.id;
  showRun(run);
  switchView('results');
  toast('Đã có kết quả mới');
});

(async () => {
  await loadOptions();
  const latest = await results.latest();
  state.latestId = latest?.id ?? null;
  showRun(latest);
  showRunState(await results.runState());
  setInterval(
    () =>
      state.run &&
      ($('runMeta').textContent =
        `Chạy ${fmtAgo(state.run.startTime)} · môi trường ${state.run.env} · ${fmtDuration(state.run.duration)}`),
    60_000,
  );
})();
