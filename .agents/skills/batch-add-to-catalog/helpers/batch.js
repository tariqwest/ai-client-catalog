/**
 * batch.js — Batch orchestration for batch-add-to-catalog
 *
 * Expands a list of `inputs` (names/URLs/listicles) into candidate inputs,
 * deduplicates against catalog-master-table.md and within batch, vets each
 * candidate as a peer (IDEs / desktop clients / terminal CLIs / agents/harnesses),
 * then upserts vetted rows via ../add-to-catalog helpers.
 *
 * Usage:
 *   node helpers/batch.js --inputs '["https://github.com/openai/codex","Windsurf"]' [--type terminal-cli] [--update] [--dry-run]
 *   node helpers/batch.js --inputs @/tmp/inputs.json --dry-run
 *   node helpers/batch.js --inputs '["https://github.com/ai-for-developers/awesome-ai-coding-tools"]' --dry-run
 *
 * No external deps. Scrapes listicles with plain fetch + regex.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { randomBytes } = require('crypto');

function generateUid() {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const bytes = randomBytes(8);
  return Array.from(bytes).map(b => alphabet[b % alphabet.length]).join('');
}

const CATALOG_REL = '../../../../catalog-master-table.md';
const catalogPath = path.resolve(__dirname, CATALOG_REL);

function loadCatalogIds() {
  const { Spreadsheet } = require('../../../lib/md-table.js');
  const md = fs.readFileSync(catalogPath, 'utf8');
  const sheet = Spreadsheet.fromMarkdown(md);
  const rows = sheet.list();
  const ids = new Set(rows.map(r => (r.id || '').replace(/`/g, '').trim().toLowerCase()));
  return { sheet, ids, rows };
}

const { parseInput, inferVendor } = require('../../add-to-catalog/helpers/url-parser.js');

const PEER_TYPES = new Set([
  'Terminal CLI',
  'Terminal CLI (+ ACP)',
  'Desktop IDE',
  'Desktop IDE plugin',
  'Workspace app',
  'Workspace app — desktop + Web, ACP host',
  'Workspace app — browser IDE + any LLM',
  'Workspace app — browser IDE (WebContainers Rust/WASM)',
  'Workspace app — cloud app builder (Supabase + Gemini + GitHub)',
  'Workspace app — cloud app builder (UI components)',
  'Workspace app — browser IDE + Agent + Deploy (Ghostwriter)',
  'ACP Adapter',
  'Library+Server',
  'Desktop app',
  'Desktop app (Claude Desktop feature)',
]);
const PEER_TYPES_NORM = new Set([...PEER_TYPES].map(s => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ')));

// Allowlist for vet: must contain at least one of these in description/README/title (lowercased)
// Note: 'llm' alone is not enough (vllm etc. are infra, not coding agents) — require code/agent/ide/cli
const PEER_KEYWORDS = ['code', 'agent', 'ide', 'cli', 'harness', 'acp', 'assistant', 'autocomplete', 'completion', 'coding'];

function vetCandidate(parsed, extraMeta = {}) {
  // type check - normalize
  const normType = (parsed.type || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  const isPeerType = [...PEER_TYPES_NORM].some(t => normType.includes(t.split(' ')[0])) || PEER_TYPES.has(parsed.type);
  const typeOk = /terminal|desktop|workspace|adapter|library/.test((parsed.type || '').toLowerCase());
  if (!isPeerType && !typeOk) return { ok: false, reason: 'not-a-peer-type', detail: `type=${parsed.type}` };

  // description/title check — require a peer keyword; short names without keyword need manual review
  const hay = `${parsed.display_name || ''} ${parsed.description || ''} ${extraMeta.title || ''} ${extraMeta.readmeHead || ''}`.toLowerCase();
  const hasKeyword = PEER_KEYWORDS.some(k => hay.includes(k));
  if (!hasKeyword) {
    if (hay.trim().length <= 5) return { ok: false, reason: 'needs-manual-review', detail: `short name without peer keyword: ${hay.trim()}` };
    if (/database|postgres|redis|kafka|queue|infra|monitoring|proxy|llama|codie|vllm|cliproxy/.test(hay)) return { ok: false, reason: 'not-a-peer-scope', detail: hay.slice(0, 80) };
    return { ok: false, reason: 'not-a-peer-scope', detail: `no peer keyword in ${hay.slice(0, 80)}` };
  }
  // Has keyword but also looks infra-ish — still flag
  if (/database|postgres|redis|kafka|queue|infra|monitoring/.test(hay) && !/code|agent/.test(hay)) return { ok: false, reason: 'not-a-peer-scope', detail: hay.slice(0, 80) };
  return { ok: true };
}

async function scrapeListingPage(url) {
  // Fetch page — curl first; if the page looks like an SPA / JS-rendered listing,
  // fall back to bun.webview (Bun.WebView) which executes JS and returns rendered HTML.
  let html = '';
  let fetchMode = 'curl';
  try {
    html = execSync(`curl -fsSL --max-time 15 ${JSON.stringify(url)}`, { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 });
  } catch (e) {
    return { candidates: [], error: `fetch-failed: ${e.message.slice(0, 200)}` };
  }
  // Extract GitHub repos
  const ghRe = /https?:\/\/github\.com\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+/gi;
  const ghMatches = [...new Set((html.match(ghRe) || []).map(u => u.split('#')[0].split('?')[0].replace(/\/+$/, '')))];
  // Filter to plausible coding tools (exclude self, exclude github itself etc.)
  const ghFiltered = ghMatches.filter(u => {
    const p = u.toLowerCase();
    if (p.includes('/awesome-ai-coding-tools') && ghMatches.length > 1) return false; // the listing itself
    if (p.includes('github.com/features')) return false;
    return true;
  });
  // Also extract homepage domains for closed tools (heuristic: look for product links)
  const homeRe = /https?:\/\/(?:[A-Za-z0-9-]+\.)+(?:ai|dev|com|app|co|io)\/[A-Za-z0-9_\-\/\.#?]*/gi;
  const homeMatches = [...new Set((html.match(homeRe) || []))].filter(u => {
    const l = u.toLowerCase();
    if (l.includes('github.com')) return false;
    if (l.includes('example.com')) return false;
    if (/\.(png|jpg|svg|css|js)(\?|$)/.test(l)) return false;
    if (l.length > 80) return false;
    return true;
  }).slice(0, 50);

  // Prefer GitHub candidates; add homepages only if GitHub count small
  let candidates = ghFiltered.slice(0, 50);
  if (candidates.length < 5) {
    // add some homepages as fallback
    candidates = [...candidates, ...homeMatches.slice(0, 20 - candidates.length)];
  }

  // If curl found very few candidates and the HTML looks like an SPA that
  // requires JS to render (empty #root, Next.js, Vite, etc.), retry with
  // bun.webview. This is gated to avoid the slower WebView for static pages.
  const looksLikeSpa = html.length > 500 && (
    /<div id=["']root["'][^>]*>\s*<\/div>/i.test(html) ||
    /__NEXT_DATA__|__NUXT__|__vite|data-reactroot/i.test(html) ||
    /id=["']app["'][^>]*>\s*<\/div>/i.test(html)
  ) && candidates.length < 3;

  if (looksLikeSpa) {
    try {
      const webviewHelper = path.resolve(__dirname, 'scrape-webview.js');
      // Only attempt if Bun is available and helper exists
      if (fs.existsSync(webviewHelper) && execSync('which bun', { encoding: 'utf8' }).trim()) {
        const rendered = execSync(`bun ${JSON.stringify(webviewHelper)} ${JSON.stringify(url)}`, {
          encoding: 'utf8',
          maxBuffer: 10 * 1024 * 1024,
          timeout: 20000,
        });
        if (rendered && rendered.length > html.length * 1.2) {
          html = rendered;
          fetchMode = 'bun.webview';
          const gh2 = [...new Set((html.match(ghRe) || []).map(u => u.split('#')[0].split('?')[0].replace(/\/+$/, '')))];
          const ghFiltered2 = gh2.filter(u => {
            const p = u.toLowerCase();
            if (p.includes('/awesome-ai-coding-tools') && gh2.length > 1) return false;
            if (p.includes('github.com/features')) return false;
            return true;
          });
          const home2 = [...new Set((html.match(homeRe) || []))].filter(u => {
            const l = u.toLowerCase();
            if (l.includes('github.com')) return false;
            if (l.includes('example.com')) return false;
            if (/\.(png|jpg|svg|css|js)(\?|$)/.test(l)) return false;
            if (l.length > 80) return false;
            return true;
          }).slice(0, 50);
          let candidates2 = ghFiltered2.slice(0, 50);
          if (candidates2.length < 5) candidates2 = [...candidates2, ...home2.slice(0, 20 - candidates2.length)];
          if (candidates2.length > candidates.length) {
            candidates = candidates2;
          }
        }
      }
    } catch (e) {
      // WebView is best-effort; keep curl results on failure
      // console.error(`bun.webview fallback failed for ${url}: ${e.message.slice(0,200)}`);
    }
  }

  return { candidates, htmlHead: html.slice(0, 2000), fetchMode };
}

async function expandInputs(inputs) {
  const expanded = [];
  const meta = { listingPages: [] };
  for (const raw of inputs) {
    if (!raw || !raw.trim()) continue;
    const trimmed = raw.trim();
    // File indirection @path
    if (trimmed.startsWith('@')) {
      const file = trimmed.slice(1);
      const abs = path.resolve(file);
      const content = fs.readFileSync(abs, 'utf8');
      const lines = content.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('#'));
      expanded.push(...lines);
      meta.listingPages.push({ input: raw, candidatesFound: lines.length, kind: 'file' });
      continue;
    }
    // Heuristic: if it looks like a listing page (awesome, blog, dev.to, github topic), scrape
    const isListing = /awesome|every-ai-coding|best-ai-|listicle|dev\.to|github\.com\/.+\/awesome/i.test(trimmed) && trimmed.startsWith('http');
    if (isListing) {
      const { candidates, error, htmlHead } = await scrapeListingPage(trimmed);
      if (error) {
        expanded.push({ _skip: true, reason: error, input: trimmed });
        meta.listingPages.push({ input: trimmed, candidatesFound: 0, error });
      } else {
        // Push each candidate as separate input string
        for (const c of candidates) expanded.push(c);
        meta.listingPages.push({ input: trimmed, candidatesFound: candidates.length, htmlHead: htmlHead?.slice(0, 200) });
      }
    } else {
      expanded.push(trimmed);
    }
  }
  return { expanded, meta };
}

function parseArgs() {
  const args = process.argv.slice(2);
  const get = (flag) => {
    const i = args.indexOf(flag);
    return i >= 0 ? args[i + 1] : null;
  };
  const has = (flag) => args.includes(flag);
  let inputsRaw = get('--inputs');
  if (!inputsRaw) {
    console.error('Usage: node helpers/batch.js --inputs \'["https://github.com/openai/codex", "Windsurf"]\' [--type terminal-cli] [--update] [--dry-run]');
    process.exit(1);
  }
  let inputs;
  try {
    if (inputsRaw.startsWith('@')) {
      const file = inputsRaw.slice(1);
      const content = fs.readFileSync(path.resolve(file), 'utf8');
      // Allow JSON array or line-per-entry
      try { inputs = JSON.parse(content); } catch { inputs = content.split('\n').map(l => l.trim()).filter(Boolean); }
    } else {
      inputs = JSON.parse(inputsRaw);
      if (!Array.isArray(inputs)) inputs = [inputsRaw];
    }
  } catch (e) {
    console.error('Failed to parse --inputs:', e.message);
    process.exit(1);
  }
  const type = get('--type');
  const update = has('--update');
  const dryRun = has('--dry-run') || has('--dryRun');
  return { inputs, type, update, dryRun };
}

async function main() {
  const { inputs, type, update, dryRun } = parseArgs();
  const { sheet: initialSheet, ids: existingIds } = loadCatalogIds();

  const { expanded, meta } = await expandInputs(inputs);
  // expanded may contain objects for skipped listings
  const flatCandidates = expanded.filter(e => typeof e === 'string');

  const results = {
    inputs: inputs.length,
    expanded: flatCandidates.length,
    listingPages: meta.listingPages,
    added: [],
    updated: [],
    skipped: [],
  };

  const seenInBatch = new Set();
  // Lazily reload sheet after each upsert to keep find() fresh
  let sheet = initialSheet;

  for (const input of flatCandidates) {
    const parsed = parseInput(input, { type });
    const normId = (parsed.id || '').replace(/`/g, '').trim().toLowerCase();
    if (!normId) {
      results.skipped.push({ input, id: parsed.id, reason: 'parse-failed' });
      continue;
    }
    if (seenInBatch.has(normId)) {
      results.skipped.push({ input, id: parsed.id, reason: 'duplicate-in-batch' });
      continue;
    }
    seenInBatch.add(normId);

    if (existingIds.has(normId) && !update) {
      results.skipped.push({ input, id: parsed.id, reason: 'already-in-catalog' });
      continue;
    }
    const willUpdate = existingIds.has(normId) && update;

    // Vet
    const vet = vetCandidate(parsed);
    if (!vet.ok) {
      results.skipped.push({ input, id: parsed.id, reason: vet.reason, detail: vet.detail });
      continue;
    }

    // For dry-run, just record
    if (dryRun) {
      if (willUpdate) results.updated.push({ input, id: parsed.id, vendor: parsed.vendor });
      else results.added.push({ input, id: parsed.id, vendor: parsed.vendor });
      continue;
    }

    // Build full master-table row: start from parsed, enrich minimally (placeholder Version/License etc.)
    // To avoid partial upsert clearing, load existing row if any and merge
    const existing = sheet.find(normId);
    const base = existing ? (({ __raw, __line, ...r }) => r)(existing) : {};
    // toTableRow expects normalized keys, but we build directly with master columns
    const row = {
      id: parsed.id,
      uid: base.uid || (existing ? undefined : generateUid()),
      display_name: parsed.display_name || base.display_name || parsed.id.replace(/`/g, ''),
      aliases: base.aliases || parsed.id.replace(/`/g, ''),
      binary: base.binary || `\`${normId}\``,
      vendor: parsed.vendor || base.vendor || '—',
      category: base.category || 'code',
      type: parsed.type || base.type || 'Terminal CLI',
      is_acp_client_host: base.is_acp_client_host || 'false',
      is_acp_agent_server: base.is_acp_agent_server || 'false',
      distribution_install: base.distribution_install || parsed.distribution_install || '—',
      version: base.version || '—',
      license: base.license || '—',
      project_status: base.project_status || 'active',
      popularity: base.popularity || '—',
      homepage_url: parsed.homepage_url || base.homepage_url || '—',
      github_url: parsed.github_url || base.github_url || '—',
    };
    // Improve homepage/github for closed pages
    if (!row.homepage_url || row.homepage_url === '') row.homepage_url = parsed.homepage_url || '—';
    if (!row.github_url || row.github_url === '') row.github_url = parsed.github_url || '—';

    sheet.upsert(row, { key: 'id' });
    if (willUpdate) results.updated.push({ input, id: row.id });
    else results.added.push({ input, id: row.id });
    existingIds.add(normId); // keep set in sync
  }

  if (!dryRun && (results.added.length || results.updated.length)) {
    let out = sheet.toMarkdown();
    if (!out.endsWith('\n')) out += '\n';
    fs.writeFileSync(catalogPath, out, 'utf8');
    try { execSync(`git --no-pager diff --check -- "${catalogPath}"`, { stdio: 'pipe' }); } catch (e) {
      const msg = e.stdout?.toString() || e.message;
      if (!msg.includes('outside repository')) console.error(msg);
    }
    console.log(`Wrote ${catalogPath} — rows: ${sheet.list().length}`);

    // Sync any terminal CLI rows to cli-surface-mapping.md
    const syncIds = [...results.added, ...results.updated]
      .map(r => (r.id || '').replace(/`/g, '').trim())
      .filter(Boolean)
      .join(',');
    if (syncIds) {
      const syncScript = path.resolve(__dirname, '../../../lib/sync-cli-surface.js');
      try {
        execSync(`node ${JSON.stringify(syncScript)} --ids ${syncIds}`, { stdio: 'inherit' });
      } catch (e) {
        console.error(`CLI surface sync failed: ${e.message}`);
      }
    }
  }

  // Report
  console.log(JSON.stringify(results, null, 2));
}

main().catch(e => { console.error(e); process.exit(1); });
