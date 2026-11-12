#!/usr/bin/env node
/**
 * Copy the video of every TC test from the last Playwright run into the evidence folder,
 * one file per TC: reports/dev-verify/<YYYY-MM-DD>/<vp-id>-TC01.webm (fail → ...-TC01-FAIL.webm).
 *
 *   node .claude/skills/linear-verify-dev/collect-videos.mjs <vp-id> [results.json] [outDir]
 *
 * Reads the JSON reporter output (default reports/json/results.json). The run must use
 * VIDEO=on REUSE_CONTEXT=0, otherwise passing tests have no video. Uses the LAST attempt of
 * each test (after retries). Prints one line per TC: "TC01<TAB>passed<TAB><path><TAB><bytes>".
 */
import fs from 'node:fs';
import path from 'node:path';

const [vpId, jsonArg, outArg] = process.argv.slice(2);
if (!vpId) {
  console.error('usage: collect-videos.mjs <vp-id> [results.json] [outDir]');
  process.exit(2);
}
const day = new Date(Date.now() + 7 * 3600_000).toISOString().slice(0, 10);
const jsonFile = jsonArg ?? path.join('reports', 'json', 'results.json');
const outDir = outArg ?? path.join('reports', 'dev-verify', day);
fs.mkdirSync(outDir, { recursive: true });

const report = JSON.parse(fs.readFileSync(jsonFile, 'utf8'));
const rows = [];

function walk(suite) {
  for (const spec of suite.specs ?? []) {
    const m = /^(TC\d+)/.exec(spec.title);
    if (!m) continue;
    for (const t of spec.tests ?? []) {
      const last = t.results?.[t.results.length - 1];
      if (!last) continue;
      const video = (last.attachments ?? []).find((a) => a.name === 'video' && a.path);
      const status = last.status;
      if (!video || !fs.existsSync(video.path)) {
        rows.push([m[1], status, 'NO_VIDEO', 0]);
        continue;
      }
      const suffix = status === 'passed' ? '' : `-${status.toUpperCase()}`;
      const dest = path.join(outDir, `${vpId}-${m[1]}${suffix}.webm`);
      fs.copyFileSync(video.path, dest);
      rows.push([m[1], status, dest, fs.statSync(dest).size]);
    }
  }
  for (const s of suite.suites ?? []) walk(s);
}
for (const s of report.suites ?? []) walk(s);

rows.sort((a, b) => a[0].localeCompare(b[0], undefined, { numeric: true }));
for (const r of rows) console.log(r.join('\t'));
if (!rows.length) console.error('No TC tests found in', jsonFile);
