/**
 * revalidate.js — Re-validate catalog-master-table.md rows
 *
 * Selects a row / subset / whole table and re-researches Version, License,
 * Popularity, homepage_url/github_url, Distribution, BaseUrl/Config.
 *
 * Usage:
 *   node helpers/revalidate.js --ids '["qwen-code"]' --dry-run
 *   node helpers/revalidate.js --filter "vendor:Anthropic" --dry-run
 *   node helpers/revalidate.js --all --fields version,popularity --dry-run
 *   node helpers/revalidate.js --ids '["codex"]' --fields version
 *
 * No external deps beyond md-table helper. Uses GH API + HEAD checks (curl).
 */

const fs = require('fs');
const path = require('path');
const { execSync, spawnSync } = require('child_process');

const catalogPath = path.resolve(__dirname, '../../../../catalog-master-table.md');

function normalizeKey(h) {
  return h.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
}

function parseArgs() {
  const args = process.argv.slice(2);
  const get = (flag) => {
    const i = args.indexOf(flag);
    return i >= 0 ? args[i + 1] : null;
  };
  const has = (f) => args.includes(f);
  const idsRaw = get('--ids');
  const filter = get('--filter');
  const all = has('--all');
  const fieldsRaw = get('--fields');
  const dryRun = has('--dry-run') || has('--dryRun');
  const concurrency = parseInt(get('--concurrency') || '5', 10);
  const overwrite = has('--overwrite');
  let ids = null;
  if (idsRaw) {
    try { ids = JSON.parse(idsRaw); } catch { ids = idsRaw; }
    if (!Array.isArray(ids)) ids = [ids];
  }
  const fields = fieldsRaw ? fieldsRaw.split(',').map(s => s.trim()).filter(Boolean) : null;
  if (!ids && !filter && !all) {
    console.error('Need one of --ids, --filter, or --all');
    process.exit(1);
  }
  return { ids, filter, all, fields, dryRun, concurrency, overwrite };
}

function loadSheet() {
  const { Spreadsheet } = require('../../../lib/md-table.js');
  const md = fs.readFileSync(catalogPath, 'utf8');
  return { md, sheet: Spreadsheet.fromMarkdown(md) };
}

function matchesFilter(row, filterStr) {
  if (!filterStr) return true;
  const clauses = filterStr.split(',').map(s => s.trim()).filter(Boolean);
  for (const clause of clauses) {
    let neg = false, expr = clause;
    if (expr.startsWith('!')) { neg = true; expr = expr.slice(1); }
    let ok = false;
    if (expr.includes(':')) {
      const [k, v] = expr.split(':');
      const nk = normalizeKey(k);
      const val = (row[nk] || '').toLowerCase();
      ok = val.includes(v.toLowerCase());
    } else {
      const hay = `${row.id} ${row.display_name} ${row.vendor}`.toLowerCase();
      ok = hay.includes(expr.toLowerCase());
    }
    if (neg) ok = !ok;
    if (!ok) return false;
  }
  return true;
}

function selectRows(sheet, { ids, filter, all }) {
  const rows = sheet.list();
  if (all) return rows;
  if (ids) {
    const normIds = new Set(ids.map(s => String(s).replace(/`/g,'').trim().toLowerCase()));
    return rows.filter(r => normIds.has((r.id || '').replace(/`/g,'').trim().toLowerCase()));
  }
  if (filter) return rows.filter(r => matchesFilter(r, filter));
  return [];
}

function headUrl(url) {
  if (!url || url === '—') return { ok: true, status: '—', finalUrl: url };
  try {
    // Use curl -I for HEAD
    const out = execSync(`curl -I --max-time 5 -s -L ${JSON.stringify(url)} | head -n 1`, { encoding: 'utf8' });
    const m = out.match(/HTTP\/[0-9.]+\s+(\d+)/);
    const code = m ? parseInt(m[1], 10) : null;
    if (!code) return { ok: false, status: 'fetch-failed', finalUrl: url };
    if (code >= 200 && code < 400) return { ok: true, status: String(code), finalUrl: url };
    return { ok: false, status: String(code), finalUrl: url };
  } catch {
    return { ok: false, status: 'fetch-failed', finalUrl: url };
  }
}

function ghLicense(owner, repo) {
  try {
    const j = execSync(`curl -fsSL --max-time 10 -H "User-Agent: catalog-revalidate" ${JSON.stringify(`https://api.github.com/repos/${owner}/${repo}/license`)}`, { encoding: 'utf8' });
    const data = JSON.parse(j);
    const license = data.license ? data.license.spdx_id : null;
    return license || '—';
  } catch { return null; }
}

function ghReleasesLatest(owner, repo) {
  try {
    const j = execSync(`curl -fsSL --max-time 10 -H "User-Agent: catalog-revalidate" ${JSON.stringify(`https://api.github.com/repos/${owner}/${repo}/releases/latest`)}`, { encoding: 'utf8' });
    const data = JSON.parse(j);
    return data.tag_name || null;
  } catch { return null; }
}

function ghStars(owner, repo) {
  try {
    const j = execSync(`curl -fsSL --max-time 10 -H "User-Agent: catalog-revalidate" ${JSON.stringify(`https://api.github.com/repos/${owner}/${repo}`)}`, { encoding: 'utf8' });
    const data = JSON.parse(j);
    const n = data.stargazers_count;
    if (n == null) return null;
    if (n >= 1000000) return `${(n/1000000).toFixed(1)}M★`;
    if (n >= 1000) return `${(n/1000).toFixed(1)}k★`;
    return `${n}★`;
  } catch { return null; }
}

function parseGithubFromUrl(url) {
  const m = String(url).match(/github\.com\/([^\/\s]+)\/([^\/\s#?]+)/i);
  if (!m) return null;
  return { owner: m[1], repo: m[2].replace(/\.git$/, '') };
}

async function revalidateRow(row, { fields }) {
  const want = new Set(fields || ['version','license','popularity','homepage_url','github_url','distribution_install','baseurl_config']);
  const gh = parseGithubFromUrl(row.github_url !== '—' ? row.github_url : row.homepage_url);
  const result = { id: row.id, stale: [], upToDate: [], broken: [], fetchFailed: [] };

  // homepage_url / github_url HEAD
  if (want.has('homepage_url') && row.homepage_url && row.homepage_url !== '—') {
    const h = headUrl(row.homepage_url);
    if (!h.ok) result.broken.push({ field: 'homepage_url', stored: row.homepage_url, status: h.status });
    else result.upToDate.push('homepage_url');
  }
  if (want.has('github_url') && row.github_url && row.github_url !== '—') {
    const h = headUrl(row.github_url);
    if (!h.ok) result.broken.push({ field: 'github_url', stored: row.github_url, status: h.status });
    else result.upToDate.push('github_url');
  }

  // version
  if (want.has('version') && gh) {
    const tag = ghReleasesLatest(gh.owner, gh.repo);
    if (tag == null) result.fetchFailed.push('version');
    else {
      const normTag = tag.replace(/^v/, '');
      const stored = (row.version || '').replace(/^v/, '');
      if (stored !== normTag) result.stale.push({ field: 'version', stored: row.version, fetched: normTag, citation: `GH releases/latest ${tag}` });
      else result.upToDate.push('version');
    }
  }

  // license
  if (want.has('license') && gh) {
    const lic = ghLicense(gh.owner, gh.repo);
    if (lic == null) result.fetchFailed.push('license');
    else if ((row.license || '').toLowerCase() !== lic.toLowerCase() && row.license !== '—') {
      result.stale.push({ field: 'license', stored: row.license, fetched: lic, citation: `GH license ${gh.owner}/${gh.repo}` });
    } else result.upToDate.push('license');
  }

  // popularity
  if (want.has('popularity') && gh) {
    const stars = ghStars(gh.owner, gh.repo);
    if (stars == null) result.fetchFailed.push('popularity');
    else {
      const stored = row.popularity || '';
      if (stored !== stars && stored !== '—' && !stored.includes('installs') && !stored.includes('enterprise')) {
        result.stale.push({ field: 'popularity', stored, fetched: stars, citation: `GH stargazers` });
      } else result.upToDate.push('popularity');
    }
  }

  return result;
}

async function main() {
  const opts = parseArgs();
  const { sheet } = loadSheet();
  const selected = selectRows(sheet, opts);
  if (!selected.length) {
    console.log(JSON.stringify({ selected: 0, stale: [], upToDate: [], broken: [], message: 'no-rows-matched' }, null, 2));
    return;
  }

  const fields = opts.fields;
  const results = [];
  let staleCount = 0, brokenCount = 0;

  for (const row of selected) {
    const res = await revalidateRow(row, { fields });
    results.push(res);
    if (res.stale.length) staleCount++;
    if (res.broken.length) brokenCount++;
  }

  // Write back if not dryRun
  if (!opts.dryRun && staleCount) {
    for (const res of results) {
      if (!res.stale.length) continue;
      const row = sheet.find(res.id.replace(/`/g,''));
      if (!row) continue;
      const full = { ...row };
      delete full.__raw; delete full.__line;
      for (const s of res.stale) full[normalizeKey(s.field)] = s.fetched;
      sheet.upsert(full, { key: 'id' });
    }
    let out = sheet.toMarkdown();
    if (!out.endsWith('\n')) out += '\n';
    fs.writeFileSync(catalogPath, out, 'utf8');
    try { execSync(`git --no-pager diff --check -- "${catalogPath}"`, { stdio: 'pipe' }); } catch (e) {
      const msg = e.stdout?.toString() || e.message;
      if (!msg.includes('outside repository')) console.error(msg);
    }
    console.log(`Wrote ${catalogPath} — rows: ${sheet.list().length} (stale updated: ${staleCount})`);
  }

  const summary = {
    selected: selected.length,
    stale: results.filter(r => r.stale.length).map(r => ({ id: r.id, stale: r.stale })),
    broken: results.filter(r => r.broken.length).map(r => ({ id: r.id, broken: r.broken })),
    upToDate: results.filter(r => !r.stale.length && !r.broken.length).length,
    fetchFailed: results.filter(r => r.fetchFailed.length).map(r => ({ id: r.id, fetchFailed: r.fetchFailed })),
    dryRun: !!opts.dryRun,
  };
  console.log(JSON.stringify(summary, null, 2));
  // Preview diff for first 3 stale
  if (summary.stale.length) {
    console.log('\nPreview (first 3 stale):');
    summary.stale.slice(0, 3).forEach(s => console.log(`- ${s.id}: ${s.stale.map(f => `${f.field} ${f.stored}→${f.fetched} (${f.citation})`).join(', ')}`));
  }
}

main().catch(e => { console.error(e); process.exit(1); });
