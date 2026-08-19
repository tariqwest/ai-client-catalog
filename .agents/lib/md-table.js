/**
 * md-table.js — Reliable markdown table row helper (md-spreadsheet style)
 *
 * Purpose: Manipulate `catalog-master-table.md`'s deduplicated master table
 * without brittle regex edits. Treats the markdown pipe table as a spreadsheet:
 * header row → column keys, each `| … |` line → row object.
 *
 * API mirrors a tiny `md-spreadsheet`:
 *   const sheet = Spreadsheet.fromMarkdown(md, { heading: /^# Catalog Master Table/ });
 *   sheet.upsert({ id: 'my-tool', ... }, { key: 'id' });
 *   const nextMd = sheet.toMarkdown();
 *
 * No external deps. Handles:
 *  - escaped pipes `\|` inside cells
 *  - inline code `code` with pipes (e.g. `npm i -g foo | bash`)
 *  - leading/trailing `|` optional
 *  - alignment row `|---|---|`
 *  - preserves surrounding document (only replaces the target table)
 *
 * Usage (CLI):
 *   node helpers/md-table.js --file ../../../catalog-master-table.md --upsert ./new-row.json
 *   node helpers/md-table.js --file ../../../catalog-master-table.md --list
 */

const fs = require('fs');
const path = require('path');

const TABLE_HEADING_RE = /^##?\s+.*Master Table/i;

// --- low-level pipe splitting ------------------------------------------------

/**
 * Split a markdown table row on unescaped, non-code pipes.
 * `code` spans and `\|` are treated as literals.
 */
function splitRow(row) {
  const cells = [];
  let cur = '';
  let inCode = false;
  let codeFence = '';
  let escaped = false;
  for (let i = 0; i < row.length; i++) {
    const ch = row[i];
    if (escaped) { cur += ch; escaped = false; continue; }
    if (ch === '\\') { escaped = true; cur += ch; continue; }
    if (ch === '`') {
      // toggle inline code: count backticks
      let j = i;
      while (j < row.length && row[j] === '`') j++;
      const fence = row.slice(i, j);
      if (!inCode) { inCode = true; codeFence = fence; }
      else if (fence === codeFence) { inCode = false; codeFence = ''; }
      cur += fence;
      i = j - 1;
      continue;
    }
    if (ch === '|' && !inCode) {
      cells.push(cur);
      cur = '';
    } else {
      cur += ch;
    }
  }
  cells.push(cur);
  // Remove leading/trailing empty from optional outer pipes
  if (cells.length && cells[0].trim() === '') cells.shift();
  if (cells.length && cells[cells.length - 1].trim() === '') cells.pop();
  return cells.map(c => c.trim());
}

function isAlignmentRow(line) {
  const cells = splitRow(line);
  if (!cells.length) return false;
  return cells.every(c => /^:?-{3,}:?$/.test(c.trim()));
}

function parseTableLines(lines) {
  const header = splitRow(lines[0]).map(h => h.trim());
  // lines[1] is alignment, lines[2..] are data
  const rows = [];
  for (let i = 2; i < lines.length; i++) {
    if (!lines[i].includes('|')) break;
    if (lines[i].trim() === '') break;
    const cells = splitRow(lines[i]);
    // pad/truncate to header length
    while (cells.length < header.length) cells.push('');
    const obj = {};
    header.forEach((h, idx) => { obj[normalizeKey(h)] = cells[idx] ?? ''; });
    // keep raw
    obj.__raw = cells;
    obj.__line = lines[i];
    rows.push(obj);
  }
  return { header, rows };
}

function normalizeKey(h) {
  // "Display Name" → "display_name", "ID" → "id", "homepage_url" → "homepage_url"
  return h.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
}

// --- Spreadsheet class --------------------------------------------------------

class Spreadsheet {
  constructor(markdown, headingRe = TABLE_HEADING_RE) {
    this.original = markdown;
    this.headingRe = headingRe;
    this.table = null; // { start, end, header, rows, lines }
    this._locate();
  }

  static fromMarkdown(md, opts = {}) {
    return new Spreadsheet(md, opts.heading || TABLE_HEADING_RE);
  }

  _locate() {
    const lines = this.original.split('\n');
    let headingIdx = -1;
    for (let i = 0; i < lines.length; i++) {
      if (this.headingRe.test(lines[i])) { headingIdx = i; break; }
    }
    // Collect ALL pipe tables after heading (or from start if no heading).
    // The doc has a Columns legend table first, then the master data table — pick the one
    // whose header contains homepage_url + github_url (the canonical master shape).
    const candidates = [];
    for (let i = Math.max(0, headingIdx); i < lines.length - 1; i++) {
      if (lines[i].includes('|') && isAlignmentRow(lines[i + 1])) {
        let end = i + 2;
        while (end < lines.length && lines[end].includes('|')) end++;
        const tableLines = lines.slice(i, end);
        const parsed = parseTableLines(tableLines);
        const norm = parsed.header.map(normalizeKey);
        candidates.push({ start: i, end, lines: tableLines, header: parsed.header, rows: parsed.rows, allLines: lines, norm });
        i = end - 1;
      }
    }
    if (!candidates.length) throw new Error('No markdown pipe table found (headingRe: ' + this.headingRe + ')');
    // Prefer table with homepage_url + github_url (master data); fallback to largest/last
    let chosen = candidates.find(c => c.norm.includes('homepage_url') && c.norm.includes('github_url'));
    if (!chosen) chosen = candidates[candidates.length - 1];
    this.table = { start: chosen.start, end: chosen.end, lines: chosen.lines, header: chosen.header, rows: chosen.rows, allLines: lines };
  }

  /** List rows as objects keyed by normalized header */
  list() { return this.table.rows.map(r => ({ ...r })); }

  /** Find row by key column (default `id`, expects backticked value like `my-id`) */
  find(keyValue, keyCol = 'id') {
    const norm = normalizeKey(keyCol);
    return this.table.rows.find(r => {
      const v = (r[norm] || '').replace(/`/g, '').trim();
      return v === keyValue.replace(/`/g, '').trim();
    });
  }

  /**
   * Upsert a row. `row` is an object keyed by normalized header.
   * Example: { id: '`my-tool`', display_name: 'My Tool', type: 'Terminal CLI', ... }
   * If a row with same `key` exists, preserve `created` and update `updated` only
   * when a persisted value changes. New rows receive both timestamps when those
   * columns exist. Callers may supply explicit timestamps for imports/migrations.
   */
  upsert(row, { key = 'id' } = {}) {
    const normKey = normalizeKey(key);
    const keyVal = (row[normKey] || '').replace(/`/g, '').trim();
    if (!keyVal) throw new Error(`upsert requires non-empty \`${key}\` (got ${JSON.stringify(row[normKey])})`);

    const idx = this.table.rows.findIndex(r => (r[normKey] || '').replace(/`/g, '').trim() === keyVal);
    const existing = idx >= 0 ? this.table.rows[idx] : null;
    const headerKeys = this.table.header.map(normalizeKey);
    const supportsCreated = headerKeys.includes('created');
    const supportsUpdated = headerKeys.includes('updated');
    const now = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
    const next = { ...row };

    if (existing) {
      if (supportsCreated && existing.created !== undefined) next.created = existing.created;

      const changed = headerKeys.some(column => {
        if (column === 'created' || column === 'updated') return false;
        return String(existing[column] ?? '') !== String(next[column] ?? '');
      });

      if (!changed) return this;
      if (supportsUpdated) next.updated = now;
    } else {
      if (supportsCreated && (next.created === undefined || next.created === '')) next.created = now;
      if (supportsUpdated && (next.updated === undefined || next.updated === '')) next.updated = now;
      // If table has a `#` column, assign the next row number to new rows that don't provide one
      if (headerKeys.includes('') && (next[''] === undefined || next[''] === '')) {
        const maxNum = this.table.rows.reduce((m, r) => Math.max(m, parseInt(r[''] || '0', 10) || 0), 0);
        next[''] = String(maxNum + 1);
      }
    }

    // Build raw cells in header order.
    const cells = this.table.header.map(h => {
      const nk = normalizeKey(h);
      return next[nk] !== undefined ? String(next[nk]) : '';
    });
    const line = `| ${cells.join(' | ')} |`;
    if (existing) {
      this.table.rows[idx] = { ...next, __raw: cells, __line: line };
      this.table.lines[2 + idx] = line;
    } else {
      this.table.rows.push({ ...next, __raw: cells, __line: line });
      this.table.lines.push(line);
    }
    return this;
  }

  /** Remove row by key */
  remove(keyValue, keyCol = 'id') {
    const norm = normalizeKey(keyCol);
    const idx = this.table.rows.findIndex(r => (r[norm] || '').replace(/`/g, '').trim() === keyValue.replace(/`/g, '').trim());
    if (idx >= 0) {
      this.table.rows.splice(idx, 1);
      this.table.lines.splice(2 + idx, 1);
    }
    return this;
  }

  /** Serialize back to markdown, preserving surrounding document */
  toMarkdown() {
    const lines = [...this.table.allLines];
    lines.splice(this.table.start, this.table.end - this.table.start, ...this.table.lines);
    return lines.join('\n');
  }

  /** Write back to file */
  writeFile(filePath) {
    fs.writeFileSync(filePath, this.toMarkdown(), 'utf8');
  }

  /** Convenience: header as original strings */
  get header() { return this.table.header; }
}

module.exports = { Spreadsheet, splitRow, isAlignmentRow, parseTableLines, normalizeKey };

// --- CLI ---------------------------------------------------------------------
if (require.main === module) {
  const args = process.argv.slice(2);
  const get = (flag) => {
    const i = args.indexOf(flag);
    return i >= 0 ? args[i + 1] : null;
  };
  const file = get('--file');
  if (!file) {
    console.error('Usage: node helpers/md-table.js --file <path> [--list] [--upsert <json>] [--upsert-file <path>] [--remove <id>] [--heading <regex>]');
    process.exit(1);
  }
  const abs = path.resolve(file);
  const md = fs.readFileSync(abs, 'utf8');
  const heading = get('--heading') ? new RegExp(get('--heading'), 'i') : TABLE_HEADING_RE;
  const sheet = Spreadsheet.fromMarkdown(md, { heading });

  if (args.includes('--list')) {
    console.log(JSON.stringify(sheet.list().map(r => {
      const { __raw, __line, ...rest } = r; return rest;
    }), null, 2));
  }
  const upsertJson = get('--upsert');
  const upsertFile = get('--upsert-file');
  const removeId = get('--remove');
  let mutated = false;
  if (upsertJson) {
    sheet.upsert(JSON.parse(upsertJson));
    mutated = true;
  }
  if (upsertFile) {
    const row = JSON.parse(fs.readFileSync(path.resolve(upsertFile), 'utf8'));
    sheet.upsert(row);
    mutated = true;
  }
  if (removeId) { sheet.remove(removeId); mutated = true; }
  if (mutated) {
    // Preserve single trailing newline
    let out = sheet.toMarkdown();
    if (!out.endsWith('\n')) out += '\n';
    fs.writeFileSync(abs, out, 'utf8');
    // Verify no trailing whitespace introduced (skip when file is outside git repo)
    const { execSync } = require('child_process');
    try { execSync(`git --no-pager diff --check -- "${abs}"`, { stdio: 'pipe' }); }
    catch (e) {
      const msg = e.stdout?.toString() || e.message || '';
      const outside = msg.includes('outside repository');
      if (!outside) { console.error(msg); process.exit(2); }
    }
    console.log(`Wrote ${abs} — rows: ${sheet.list().length}`);
  }
}
