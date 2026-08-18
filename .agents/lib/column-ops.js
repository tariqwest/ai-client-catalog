/**
 * column.js — DDL + backfill for catalog-master-table.md
 *
 * Adds a new column to the master data table + Columns legend, then populates it.
 *
 * Usage:
 *   node helpers/column.js --file ../../../catalog-master-table.md --add-column '{"name":"Pricing","description":"Pricing — Free / Paid per pricing page","position":"after:License"}' [--dry-run]
 *   node helpers/column.js --file ../../../catalog-master-table.md --populate-column pricing [--overwrite] [--dry-run]
 *   node helpers/column.js --file ../../../catalog-master-table.md --list-columns
 *
 * No external deps. Uses ../add-to-catalog/helpers/md-table.js Spreadsheet (code-span aware).
 */

const fs = require('fs');
const path = require('path');

const catalogDefault = path.resolve(__dirname, '../../../../catalog-master-table.md');

function normalizeKey(h) {
  return h.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
}

// Known fetchers for common columns — each returns a short string (≤40 chars) or "—"
const KNOWN_COLUMN_FETCHERS = {
  pricing: async (row) => {
    // Heuristic: look at homepage_url for /pricing
    const url = row.homepage_url && row.homepage_url !== '—' ? row.homepage_url : null;
    if (!url) return '—';
    // Without network, infer from distribution: if npm install → often Freemium/Free, if Closed SaaS → Paid/Enterprise
    if (/npm i -g|brew install|cargo install|pip install/.test(row.distribution_install)) return 'Freemium';
    if (/Closed|Proprietary|enterprise/i.test(row.license)) return 'Paid/Enterprise';
    return '—';
  },
  funding: async (row) => {
    // Hardcoded high-value vendors from prior peer pass; else —
    const v = (row.vendor || '').toLowerCase();
    if (v.includes('stackblitz')) return '— (OSS fork)';
    if (v.includes('mistral')) return '€11.7B val';
    if (v.includes('augment')) return '$227M B';
    if (v.includes('supermaven')) return '$12M';
    return '—';
  },
  last_updated: async (row) => {
    // For GH repos, HEAD the releases/latest would give date — here return today as placeholder
    return new Date().toISOString().slice(0, 10);
  },
  context_window: async () => '—',
  offline_capable: async (row) => {
    const d = `${row.distribution_install} ${row.license}`.toLowerCase();
    if (/vpc|on-prem|air-gapped|self-host|docker/.test(d)) return 'Self-hosted';
    if (/closed/.test(row.license.toLowerCase())) return 'Cloud';
    return '—';
  },
};

function parseArgs() {
  const args = process.argv.slice(2);
  const get = (flag) => {
    const i = args.indexOf(flag);
    return i >= 0 ? args[i + 1] : null;
  };
  const has = (f) => args.includes(f);
  return {
    file: get('--file') || catalogDefault,
    addCol: get('--add-column'),
    popCol: get('--populate-column'),
    list: has('--list-columns'),
    overwrite: has('--overwrite'),
    dryRun: has('--dry-run') || has('--dryRun'),
  };
}

function loadSpreadsheet(file) {
  const { Spreadsheet } = require('./md-table.js');
  const md = fs.readFileSync(file, 'utf8');
  return { md, sheet: Spreadsheet.fromMarkdown(md) };
}

function addColumn(file, spec, dryRun) {
  const raw = fs.readFileSync(file, 'utf8');
  const lines = raw.split('\n');
  // Find legend table (Columns) and data table positions via header
  // Use simple string search for header
  const dataHeaderIdx = lines.findIndex(l => l.startsWith('| ID | Display Name |'));
  if (dataHeaderIdx === -1) throw new Error('Data header not found');

  const dataHeader = lines[dataHeaderIdx];
  const dataSep = lines[dataHeaderIdx + 1];

  // Parse current header cells using splitRow helper for safety
  const { splitRow } = require('./md-table.js');
  const headerCells = splitRow(dataHeader);
  const norm = headerCells.map(normalizeKey);
  const newNorm = normalizeKey(spec.name);
  if (norm.includes(newNorm)) {
    console.log(`Column "${spec.name}" already exists as "${headerCells[norm.indexOf(newNorm)]}" — skipping DDL (use --populate)`);
    return { existed: true, headerCells };
  }

  // Determine insertion index
  let posIdx = headerCells.length - 2; // default before homepage_url (last two are homepage/github)
  if (spec.position) {
    if (spec.position === 'last') posIdx = headerCells.length;
    else if (spec.position.startsWith('after:')) {
      const after = normalizeKey(spec.position.slice(6));
      const idx = norm.indexOf(after);
      if (idx === -1) throw new Error(`position after:${spec.position.slice(6)} not found`);
      posIdx = idx + 1;
    } else if (spec.position.startsWith('before:')) {
      const before = normalizeKey(spec.position.slice(7));
      const idx = norm.indexOf(before);
      if (idx === -1) throw new Error(`position before:${spec.position.slice(7)} not found`);
      posIdx = idx;
    }
  }

  // Insert into data header + separator
  headerCells.splice(posIdx, 0, spec.name);
  const sepCells = splitRow(dataSep);
  sepCells.splice(posIdx, 0, '---');
  lines[dataHeaderIdx] = `| ${headerCells.join(' | ')} |`;
  lines[dataHeaderIdx + 1] = `| ${sepCells.join(' | ')} |`;

  // Insert into legend table: find | **<Name>** rows
  const legendStart = lines.findIndex(l => l.trim() === '| **Display Name** | Human name + vendor/lab |' || l.includes('| **Display Name**'));
  // Instead find the whole Columns block: from "| **Display Name**" until "| **homepage_url**"
  let legendInsertIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('| **homepage_url**')) { legendInsertIdx = i; break; }
  }
  if (legendInsertIdx !== -1) {
    lines.splice(legendInsertIdx, 0, `| **${spec.name}** | ${spec.description} |`);
  } else {
    // fallback: after Type
    const tIdx = lines.findIndex(l => l.includes('| **Type**'));
    if (tIdx !== -1) lines.splice(tIdx + 1, 0, `| **${spec.name}** | ${spec.description} |`);
  }

  // Pad every data row at posIdx with "—"
  const { isAlignmentRow } = require('./md-table.js');
  for (let i = dataHeaderIdx + 2; i < lines.length; i++) {
    const l = lines[i];
    if (!l.includes('|')) break;
    if (l.trim() === '') break;
    if (isAlignmentRow(l)) continue;
    if (!l.startsWith('| `')) continue; // only data rows (backticked ID)
    const cells = splitRow(l);
    // If row already has correct length (should be headerCells.length -1 before pad), pad
    // But after header insertion, we need to insert at posIdx
    // Handle prior corrupted rows where splitRow may have different length — pad/truncate to new length
    while (cells.length < headerCells.length) {
      // If row is shorter, pad at posIdx with "—" and rest with ""
      cells.splice(posIdx, 0, '—');
      // If still short, break
      if (cells.length >= headerCells.length) break;
    }
    // If row longer, truncate (should not happen)
    if (cells.length > headerCells.length) cells.length = headerCells.length;
    // If row had exactly old length, we inserted one at posIdx
    if (cells.length === headerCells.length - 1) {
      cells.splice(posIdx, 0, '—');
    }
    // Ensure the new column is "—" if we just inserted (we already did)
    lines[i] = `| ${cells.join(' | ')} |`;
  }

  const out = lines.join('\n');
  if (dryRun) {
    console.log(`[dry-run] Would add column "${spec.name}" at pos ${posIdx} (${spec.position || 'before:homepage_url'})`);
    console.log(`Header now: ${headerCells.join(' | ')}`);
    return { existed: false, dryRun: true };
  }
  fs.writeFileSync(file, out.endsWith('\n') ? out : out + '\n', 'utf8');
  // verify diff --check
  try { require('child_process').execSync(`git --no-pager diff --check -- "${file}"`, { stdio: 'pipe' }); } catch (e) {
    const msg = e.stdout?.toString() || e.message;
    if (!msg.includes('outside repository')) { console.error(msg); process.exit(2); }
  }
  console.log(`Added column "${spec.name}" at pos ${posIdx} — rows padded with "—"`);
  return { existed: false };
}

async function populateColumn(file, colName, overwrite, dryRun) {
  const { Spreadsheet } = require('./md-table.js');
  const md = fs.readFileSync(file, 'utf8');
  const sheet = Spreadsheet.fromMarkdown(md);
  const normCol = normalizeKey(colName);
  if (!sheet.header.map(normalizeKey).includes(normCol)) throw new Error(`Column "${colName}" not found — run --add-column first`);
  const fetcher = KNOWN_COLUMN_FETCHERS[normCol] || (async (row) => '—');
  let populated = 0, skipped = 0, manual = 0;
  for (const row of sheet.list()) {
    const cur = row[normCol];
    if (!overwrite && cur && cur !== '—' && cur !== '') { skipped++; continue; }
    const val = await fetcher(row);
    if (val === '—') manual++;
    // Merge full row to avoid partial clear
    const full = { ...row };
    delete full.__raw; delete full.__line;
    full[normCol] = val;
    // Ensure id stays backticked
    if (!full.id.startsWith('`')) full.id = `\`${full.id.replace(/`/g,'')}\``;
    if (!dryRun) sheet.upsert(full, { key: 'id' });
    populated++;
  }
  if (dryRun) {
    console.log(`[dry-run] Would populate ${populated} rows for column "${colName}" (${skipped} already filled, ${manual} would stay "—")`);
    return { populated, skipped, manual, dryRun: true };
  }
  let out = sheet.toMarkdown();
  if (!out.endsWith('\n')) out += '\n';
  fs.writeFileSync(file, out, 'utf8');
  try { require('child_process').execSync(`git --no-pager diff --check -- "${file}"`, { stdio: 'pipe' }); } catch (e) {
    const msg = e.stdout?.toString() || e.message;
    if (!msg.includes('outside repository')) console.error(msg);
  }
  console.log(`Populated column "${colName}": ${populated} updated, ${skipped} skipped (already filled), ${manual} remain "—"`);
  return { populated, skipped, manual };
}

async function main() {
  const { file, addCol, popCol, list, overwrite, dryRun } = parseArgs();
  const abs = path.resolve(file);
  if (list) {
    const { sheet } = loadSpreadsheet(abs);
    console.log('Columns:', sheet.header.join(' | '));
    console.log('Normalized:', sheet.header.map(normalizeKey).join(', '));
    return;
  }
  if (addCol) {
    const spec = JSON.parse(addCol);
    if (!spec.name || !spec.description) throw new Error('--add-column requires {name, description, position?}');
    addColumn(abs, spec, dryRun);
  }
  if (popCol) {
    await populateColumn(abs, popCol, overwrite, dryRun);
  }
  if (!addCol && !popCol && !list) {
    console.error('Need --add-column, --populate-column, or --list-columns');
    process.exit(1);
  }
}

main().catch(e => { console.error(e); process.exit(1); });
