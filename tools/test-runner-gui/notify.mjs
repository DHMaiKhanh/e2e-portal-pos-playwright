/**
 * Sends a run summary to Discord (webhook) and/or Gmail (SMTP app-password).
 * Config lives in reports/gui-runs/notify.json — that folder is git-ignored,
 * so the Gmail app-password never leaves the machine or enters version control.
 */
import fs from 'node:fs';
import path from 'node:path';
import nodemailer from 'nodemailer';

export const DEFAULT_NOTIFY = {
  onlyOnFailure: true, // skip the ping when everything passed
  discord: { enabled: false, webhook: '' },
  gmail: { enabled: false, user: '', appPassword: '', to: '' },
};

export function loadNotify(file) {
  try {
    return { ...DEFAULT_NOTIFY, ...JSON.parse(fs.readFileSync(file, 'utf8')) };
  } catch {
    return { ...DEFAULT_NOTIFY };
  }
}

export function saveNotify(file, cfg) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(cfg, null, 2));
}

/** Never echo the stored password back to the browser. */
export function publicNotify(cfg) {
  return {
    onlyOnFailure: cfg.onlyOnFailure,
    discord: { enabled: cfg.discord.enabled, webhook: cfg.discord.webhook },
    gmail: {
      enabled: cfg.gmail.enabled,
      user: cfg.gmail.user,
      to: cfg.gmail.to,
      hasPassword: !!cfg.gmail.appPassword,
    },
  };
}

/** Merge an incoming (password-less) patch without wiping the saved password. */
export function mergeNotify(cfg, patch) {
  const next = {
    onlyOnFailure: patch.onlyOnFailure ?? cfg.onlyOnFailure,
    discord: { ...cfg.discord, ...(patch.discord ?? {}) },
    gmail: { ...cfg.gmail, ...(patch.gmail ?? {}) },
  };
  // Blank password in the patch = "keep the existing one", not "clear it".
  if (patch.gmail && (patch.gmail.appPassword === '' || patch.gmail.appPassword == null)) {
    next.gmail.appPassword = cfg.gmail.appPassword;
  }
  return next;
}

const fmtDur = (ms) => {
  if (!ms) return '0s';
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  return `${m}m ${s % 60}s`;
};

function headline(entry) {
  const c = entry.counts;
  if (entry.status === 'stopped') return `⏹ Lần chạy bị dừng (${entry.env})`;
  if (c.failed > 0) return `❗ ${c.failed} test LỖI (${entry.env})`;
  if (c.flaky > 0) return `⚠️ Pass nhưng ${c.flaky} test chập chờn (${entry.env})`;
  return `✅ Tất cả ${c.passed} test đều đạt (${entry.env})`;
}

function statsLine(entry) {
  const c = entry.counts;
  return `${c.passed} đạt · ${c.failed} lỗi · ${c.flaky} flaky · ${c.skipped} bỏ qua · ${fmtDur(entry.duration)}`;
}

/** entry = history entry; failures = [{title, screen, error}] (friendly). */
export async function sendNotifications({ cfg, entry, failures, link }) {
  const results = [];
  const skip = cfg.onlyOnFailure && entry.counts.failed === 0 && entry.status !== 'stopped';

  if (cfg.discord.enabled && cfg.discord.webhook && !skip) {
    try {
      await sendDiscord(cfg.discord.webhook, entry, failures, link);
      results.push({ channel: 'discord', ok: true });
    } catch (e) {
      results.push({ channel: 'discord', ok: false, error: e.message });
    }
  }
  if (cfg.gmail.enabled && cfg.gmail.user && cfg.gmail.appPassword && cfg.gmail.to && !skip) {
    try {
      await sendGmail(cfg.gmail, entry, failures, link);
      results.push({ channel: 'gmail', ok: true });
    } catch (e) {
      results.push({ channel: 'gmail', ok: false, error: e.message });
    }
  }
  return { skipped: skip, results };
}

async function sendDiscord(webhook, entry, failures, link) {
  const bullet = failures
    .slice(0, 12)
    .map((f) => `• **${f.title}** — _${f.screen}_${f.error ? `\n   ↳ ${f.error.slice(0, 160)}` : ''}`)
    .join('\n');
  const more = failures.length > 12 ? `\n…và ${failures.length - 12} lỗi khác.` : '';
  const embed = {
    title: headline(entry),
    description: statsLine(entry) + (bullet ? `\n\n**Danh sách lỗi**\n${bullet}${more}` : ''),
    color: entry.counts.failed ? 0xf0525e : entry.counts.flaky ? 0xf5a524 : 0x2fbf71,
    footer: { text: `Portal POS Test Runner${link ? ` · ${link}` : ''}` },
    timestamp: new Date(entry.finishedAt ?? Date.now()).toISOString(),
  };
  const res = await fetch(webhook, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'Portal POS Test Runner', embeds: [embed] }),
  });
  if (!res.ok) throw new Error(`Discord HTTP ${res.status}: ${(await res.text()).slice(0, 120)}`);
}

async function sendGmail(gmail, entry, failures, link) {
  const transport = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: gmail.user, pass: gmail.appPassword.replace(/\s+/g, '') },
  });
  const rows = failures
    .slice(0, 50)
    .map(
      (f) =>
        `<tr><td style="padding:6px 10px;border-bottom:1px solid #eee"><b>${esc(f.title)}</b><br><span style="color:#777">${esc(f.screen)}</span></td><td style="padding:6px 10px;border-bottom:1px solid #eee;color:#b00;font-family:monospace;font-size:12px">${esc((f.error ?? '').slice(0, 200))}</td></tr>`,
    )
    .join('');
  const color = entry.counts.failed ? '#d93745' : entry.counts.flaky ? '#c27c00' : '#13995a';
  const html = `<div style="font-family:system-ui,Arial,sans-serif;max-width:680px">
    <h2 style="color:${color};margin:0 0 4px">${esc(headline(entry))}</h2>
    <p style="color:#333;margin:4px 0 14px">${esc(statsLine(entry))}</p>
    ${rows ? `<table style="border-collapse:collapse;width:100%;border:1px solid #eee"><thead><tr><th style="text-align:left;padding:6px 10px;background:#fafafa">Test lỗi</th><th style="text-align:left;padding:6px 10px;background:#fafafa">Thông báo</th></tr></thead><tbody>${rows}</tbody></table>` : '<p style="color:#13995a">Không có lỗi nào.</p>'}
    ${link ? `<p style="margin-top:16px"><a href="${esc(link)}">Mở Test Runner</a></p>` : ''}
  </div>`;
  await transport.sendMail({
    from: `Portal POS Test Runner <${gmail.user}>`,
    to: gmail.to,
    subject: headline(entry),
    text: `${headline(entry)}\n${statsLine(entry)}\n\n${failures.map((f) => `- ${f.title} (${f.screen})`).join('\n')}`,
    html,
  });
}

const esc = (s) =>
  String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

/** Fire a tiny "it works" message so users can verify a channel from the GUI. */
export async function sendTest({ cfg, channel, link }) {
  const entry = {
    env: 'test',
    status: 'passed',
    finishedAt: Date.now(),
    duration: 1234,
    counts: { passed: 1, failed: 0, flaky: 0, skipped: 0 },
  };
  if (channel === 'discord') {
    if (!cfg.discord.webhook) throw new Error('Chưa nhập webhook Discord');
    await sendDiscord(cfg.discord.webhook, { ...entry, status: 'passed' }, [], link);
  } else if (channel === 'gmail') {
    if (!cfg.gmail.user || !cfg.gmail.appPassword || !cfg.gmail.to)
      throw new Error('Chưa nhập đủ Gmail / mật khẩu ứng dụng / người nhận');
    await sendGmail(cfg.gmail, entry, [], link);
  }
}
