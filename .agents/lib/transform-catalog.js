#!/usr/bin/env node
/**
 * transform-catalog.js — Reusable catalog maintenance helper
 *
 * Operates on the two main tables in this repo:
 *   - catalog-master-table.md
 *   - cli-surface-mapping-table.md
 *
 * Usage:
 *   node .agents/lib/transform-catalog.js [command] [options]
 *
 * Commands:
 *   all             Run full cleanup (remove-saas + move-binary + add-status +
 *                   sync-legend + dedupe-cli). This is the default.
 *   remove-saas     Remove default or custom SaaS rows and renumber master rows.
 *   move-binary     Move the master "binary" column to immediately after "aliases".
 *   add-status      Add a "project_status" column to master and CLI mapping.
 *   sync-legend     Reorder the master "Columns" legend to match the data table.
 *   dedupe-cli      Remove CLI rows not in master and duplicate UIDs; renumber.
 *   validate        Validate both tables without writing.
 *
 * Options:
 *   --dry-run       Print what would happen without writing files.
 *   --backup        Create timestamped backups in backups/ before writing.
 *   --ids <list>    Comma-separated ids to remove (default: bolt-new,lovable,...).
 *   --status-file   Path to status JSON map (default: .agents/lib/catalog-status.json).
 *   --help          Show this help.
 *
 * Examples:
 *   node .agents/lib/transform-catalog.js all --backup
 *   node .agents/lib/transform-catalog.js remove-saas --ids bolt-new,lovable,replit
 *   node .agents/lib/transform-catalog.js validate
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { Spreadsheet, splitRow, normalizeKey } = require('./md-table.js');

const CATALOG = path.resolve(__dirname, '../../catalog-master-table.md');
const CLI_MAP = path.resolve(__dirname, '../../cli-surface-mapping-table.md');

const DEFAULT_REMOVE_IDS = ['bolt-new', 'lovable', 'replit', 'perplexity-computer', 'perplexity-space'];
const DEFAULT_STATUS_FILE = path.resolve(__dirname, './catalog-status.json');

const PS_LEGEND = '| **project_status** | `Active` (maintained), `maintenance` (bug fixes only), `deprecated`, `acquired_integrated`, `abandoned`, `unknown` — project maintenance state |';

let DRY_RUN = false;
let DO_BACKUP = false;

function help() {
  console.log(fs.readFileSync(__filename, 'utf8').match(/\/\*\*([\s\S]*?)\*\//)[1].trim());
  process.exit(0);
}

function loadStatusMap(statusFile) {
  if (!fs.existsSync(statusFile)) throw new Error('Status map not found: ' + statusFile);
  return JSON.parse(fs.readFileSync(statusFile, 'utf8'));
}

function backupFile(file) {
  if (!DO_BACKUP) return null;
  const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const dest = path.join(path.dirname(file), 'backups', path.basename(file) + '.backup.' + ts + '.md');
  fs.copyFileSync(file, dest);
  console.log('  Backup:', dest);
  return dest;
}

function writeFile(file, content) {
  if (DRY_RUN) {
    console.log('  (dry-run) Would write', file);
    return;
  }
  const existing = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
  if (existing === content) {
    console.log('  No changes needed for', path.basename(file));
    return;
  }
  backupFile(file);
  fs.writeFileSync(file, content, 'utf8');
}

function validateMaster(file, expectedCols) {
  const md = fs.readFileSync(file, 'utf8');
  const lines = md.split('\n');
  const hIdx = lines.findIndex(l => /^\| # \| id \|/.test(l) || /^\| id \| uid \| display_name \|/.test(l));
  if (hIdx === -1) return { ok: false, message: 'Master header not found' };
  const header = splitRow(lines[hIdx]);
  const expected = expectedCols || header.length;
  if (header.length !== expected) return { ok: false, message: `Master header has ${header.length} cols, expected ${expected}` };
  let rows = 0;
  for (let i = hIdx + 2; i < lines.length; i++) {
    if (!/^\| (\d+|`) /.test(lines[i])) break;
    const cells = splitRow(lines[i]);
    if (cells.length !== expected) return { ok: false, message: `Master row width mismatch at line ${i + 1}: ${cells.length} vs ${expected}` };
    rows++;
  }
  return { ok: true, header, rows, message: `Master: ${header.length} cols, ${rows} rows` };
}

function validateCli(file, expectedCols) {
  const md = fs.readFileSync(file, 'utf8');
  const lines = md.split('\n');
  const hIdx = lines.findIndex(l => l.startsWith('| # | id |') && l.includes('command'));
  if (hIdx === -1) return { ok: false, message: 'CLI mapping header not found' };
  const header = splitRow(lines[hIdx]);
  const expected = expectedCols || header.length;
  if (header.length !== expected) return { ok: false, message: `CLI header has ${header.length} cols, expected ${expected}` };
  const sepCells = splitRow(lines[hIdx + 1]);
  const sepOk = sepCells.length === expected && sepCells.every(c => /^:?-{3,}:?$/.test(c.trim()));
  if (!sepOk) return { ok: false, message: `CLI separator invalid: ${sepCells.length} cells vs ${expected}` };
  let rows = 0;
  for (let i = hIdx + 2; i < lines.length; i++) {
    if (!/^\| \d+ \| `/.test(lines[i])) break;
    const cells = splitRow(lines[i]);
    if (cells.length !== expected) return { ok: false, message: `CLI row width mismatch at line ${i + 1}: ${cells.length} vs ${expected}` };
    rows++;
  }
  return { ok: true, header, rows, message: `CLI mapping: ${header.length} cols, ${rows} rows` };
}

function rebuildTableLines(sheet) {
  const h = sheet.table.header;
  const headerLine = '| ' + h.join(' | ') + ' |';
  const sepLine = '| ' + h.map(() => '---').join(' | ') + ' |';
  for (const r of sheet.table.rows) {
    r.__raw = h.map(col => r[normalizeKey(col)] !== undefined ? String(r[normalizeKey(col)]) : '');
    r.__line = '| ' + r.__raw.join(' | ') + ' |';
  }
  sheet.table.lines = [headerLine, sepLine, ...sheet.table.rows.map(r => r.__line)];
}

function section(title) {
  console.log('\n== ' + title + ' ==');
}

// -----------------------------------------------------------------------------
// Commands
// -----------------------------------------------------------------------------

function cmdRemove(ids) {
  section('Remove rows and renumber master');
  const md = fs.readFileSync(CATALOG, 'utf8');
  const sheet = Spreadsheet.fromMarkdown(md);
  let removed = 0;
  for (const id of ids) {
    if (sheet.find(id)) {
      sheet.remove(id);
      removed++;
    } else {
      console.log('  Not found:', id);
    }
  }

  const numKey = normalizeKey('#');
  sheet.table.rows.forEach((r, i) => { r[numKey] = String(i + 1); });
  rebuildTableLines(sheet);

  const out = sheet.toMarkdown().replace(/\n+$/, '\n');
  writeFile(CATALOG, out);

  console.log(`  Removed ${removed} rows; remaining ${sheet.table.rows.length}`);
}

function cmdMoveBinary() {
  section('Move binary column after aliases');
  const dry = DRY_RUN ? '--dry-run' : '';
  const cmd = `node .agents/skills/remove-column-from-catalog/helpers/move-column.js --file catalog-master-table.md --column binary --position after:aliases --validate ${dry}`.trim();
  if (DRY_RUN) {
    console.log('  (dry-run) Would run:', cmd);
    return;
  }
  execSync(cmd, { cwd: path.dirname(CATALOG), stdio: 'inherit' });
}

function cmdAddStatus(statusMap) {
  section('Add project_status to master table');
  let md = fs.readFileSync(CATALOG, 'utf8');

  // If the column already exists, repopulate values only.
  const masterHeaderLine = (md.match(/^\| # \| id \|.*\|/m) || [])[0] || '';
  const headerCells = masterHeaderLine ? splitRow(masterHeaderLine) : [];
  const hasProjectStatus = headerCells.includes('project_status');

  let sheet;
  if (hasProjectStatus) {
    sheet = Spreadsheet.fromMarkdown(md);
    console.log('  project_status already in master table; repopulating values');
  } else {
    const lines = md.split('\n');
    const licLegendIdx = lines.findIndex(l => l.startsWith('| **license** |'));
    if (licLegendIdx === -1) throw new Error('License legend entry not found');
    const hasLegend = lines.some(l => l.startsWith('| **project_status** |'));
    if (!hasLegend) lines.splice(licLegendIdx + 1, 0, PS_LEGEND);
    md = lines.join('\n');

    sheet = Spreadsheet.fromMarkdown(md);
    const licIdx = sheet.table.header.findIndex(h => normalizeKey(h) === 'license');
    if (licIdx === -1) throw new Error('license column not found');
    sheet.table.header.splice(licIdx + 1, 0, 'project_status');
  }

  for (const r of sheet.table.rows) {
    const id = (r.id || '').replace(/`/g, '').trim();
    r.project_status = statusMap[id] || 'unknown';
  }
  rebuildTableLines(sheet);

  writeFile(CATALOG, sheet.toMarkdown().replace(/\n+$/, '\n'));
  console.log(`  project_status set for ${sheet.table.rows.length} master rows`);

  section('Add project_status to CLI mapping');
  let cliMd = fs.readFileSync(CLI_MAP, 'utf8');
  const cliLines = cliMd.split('\n');
  const hIdx = cliLines.findIndex(l => l.startsWith('| # | id |') && l.includes('command'));
  if (hIdx === -1) throw new Error('CLI mapping table header not found');
  const header = splitRow(cliLines[hIdx]);
  cliLines[hIdx + 1] = '| ' + header.map(() => '---').join(' | ') + ' |';

  const hasPsDoc = cliLines.some(l => l.startsWith('- `project_status`'));
  const updatedDocIdx = cliLines.findIndex(l => l.startsWith('- `updated`'));
  if (updatedDocIdx !== -1 && !hasPsDoc) {
    cliLines.splice(updatedDocIdx + 1, 0, '- `project_status` — Project maintenance state (active, maintenance, deprecated, acquired_integrated, abandoned, unknown)');
  }

  cliMd = cliLines.join('\n');
  writeFile(CLI_MAP, cliMd);
  if (DRY_RUN) return;

  const cliSheet = Spreadsheet.fromMarkdown(cliMd, { heading: /^##\s+CLI Surface Mapping/i });
  if (cliSheet.table.header.some(h => normalizeKey(h) === 'project_status')) {
    console.log('  project_status already in CLI mapping');
    return;
  }
  cliSheet.table.header.push('project_status');

  const masterSheet = Spreadsheet.fromMarkdown(fs.readFileSync(CATALOG, 'utf8'));
  const uidToStatus = new Map();
  for (const r of masterSheet.list()) {
    const uid = (r.uid || '').replace(/`/g, '').trim();
    if (uid) uidToStatus.set(uid, r.project_status || 'unknown');
  }

  for (const r of cliSheet.table.rows) {
    const uid = (r.uid || '').replace(/`/g, '').trim();
    r.project_status = uidToStatus.get(uid) || 'unknown';
  }
  rebuildTableLines(cliSheet);
  let out = cliSheet.toMarkdown().replace(/\n+$/, '\n');
  out = out.replace(/Maps CLI structure for \d+ terminal_cli tools/, `Maps CLI structure for ${cliSheet.table.rows.length} terminal_cli tools`);
  writeFile(CLI_MAP, out);
  console.log(`  Added project_status to CLI mapping for ${cliSheet.table.rows.length} rows`);
}

function cmdSyncLegend() {
  section('Sync Columns legend to data table order');
  const md = fs.readFileSync(CATALOG, 'utf8');
  const lines = md.split('\n');

  const hIdx = lines.findIndex(l => /^\| # \| id \|/.test(l) || /^\| id \| uid \| display_name \|/.test(l));
  if (hIdx === -1) throw new Error('Data table header not found for legend sync');
  const header = splitRow(lines[hIdx]).map(normalizeKey);

  const colSectionIdx = lines.findIndex(l => l.trim() === '**Columns**');
  if (colSectionIdx === -1) throw new Error('Columns section not found');

  let legendStart = -1;
  for (let i = colSectionIdx; i < hIdx; i++) {
    if (lines[i].startsWith('| Column | Description |')) { legendStart = i; break; }
  }
  if (legendStart === -1) throw new Error('Legend table not found');

  const entries = new Map();
  let end = legendStart + 2;
  for (let i = legendStart + 2; i < lines.length; i++) {
    if (!lines[i].startsWith('| **')) break;
    const cells = splitRow(lines[i]);
    if (cells.length < 2) break;
    const key = normalizeKey(cells[0].replace(/\*\*/g, '').trim());
    entries.set(key, lines[i]);
    end = i + 1;
  }

  const newLegend = header.map(h => {
    if (entries.has(h)) return entries.get(h);
    return `| **${h}** | ${h} |`;
  });

  const before = lines.slice(0, legendStart + 2);
  const after = lines.slice(end);
  writeFile(CATALOG, before.concat(newLegend, after).join('\n'));
  console.log(`  Legend synced to ${newLegend.length} entries`);
}

function cmdDedupeCli() {
  section('Dedupe CLI mapping by master UIDs');
  const masterSheet = Spreadsheet.fromMarkdown(fs.readFileSync(CATALOG, 'utf8'));
  const masterUids = new Set(masterSheet.list().map(r => (r.uid || '').replace(/`/g, '').trim()).filter(Boolean));

  const cliSheet = Spreadsheet.fromMarkdown(fs.readFileSync(CLI_MAP, 'utf8'), { heading: /^##\s+CLI Surface Mapping/i });
  const originalCount = cliSheet.table.rows.length;

  const kept = [];
  const seen = new Set();
  for (const r of cliSheet.table.rows) {
    const uid = (r.uid || '').replace(/`/g, '').trim();
    if (masterUids.has(uid) && !seen.has(uid)) {
      seen.add(uid);
      kept.push(r);
    }
  }

  const numKey = normalizeKey('#');
  kept.forEach((r, i) => { r[numKey] = String(i + 1); });

  cliSheet.table.rows = kept;
  rebuildTableLines(cliSheet);
  let out = cliSheet.toMarkdown().replace(/\n+$/, '\n');
  out = out.replace(/Maps CLI structure for \d+ terminal_cli tools/, `Maps CLI structure for ${kept.length} terminal_cli tools`);
  writeFile(CLI_MAP, out);

  console.log(`  Kept ${kept.length} rows; removed ${originalCount - kept.length} non-master/duplicate`);
}

function cmdValidate() {
  section('Validate tables');
  const v1 = validateMaster(CATALOG);
  const v2 = validateCli(CLI_MAP);
  console.log(' ', v1.message);
  console.log(' ', v2.message);
  if (!v1.ok || !v2.ok) process.exit(1);
}

function cmdAll(statusMap, ids) {
  cmdValidate();
  cmdRemove(ids);
  cmdMoveBinary();
  cmdAddStatus(statusMap);
  cmdSyncLegend();
  cmdDedupeCli();
  cmdValidate();
}

// -----------------------------------------------------------------------------
// CLI parser
// -----------------------------------------------------------------------------

function parseArgs() {
  const args = process.argv.slice(2);
  if (args.length === 0) return { command: 'all', ids: DEFAULT_REMOVE_IDS };

  let command = null;
  let ids = null;
  let statusFile = DEFAULT_STATUS_FILE;

  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--help' || a === '-h') help();
    if (a === '--dry-run') DRY_RUN = true;
    else if (a === '--backup') DO_BACKUP = true;
    else if (a === '--ids') ids = args[++i].split(',').map(s => s.trim()).filter(Boolean);
    else if (a === '--status-file') statusFile = path.resolve(args[++i]);
    else if (!command && !a.startsWith('--')) command = a;
  }

  if (!command) command = 'all';
  if (command === 'remove' || command === 'remove-saas') {
    if (!ids) ids = DEFAULT_REMOVE_IDS;
  }

  return { command, ids: ids || DEFAULT_REMOVE_IDS, statusFile };
}

function main() {
  const { command, ids, statusFile } = parseArgs();
  const statusMap = command === 'validate' ? null : loadStatusMap(statusFile);

  if (DRY_RUN) console.log('(dry-run mode; no files will be written)');
  if (DO_BACKUP) console.log('(backup mode)');

  switch (command) {
    case 'all':
      cmdAll(statusMap, ids);
      break;
    case 'remove':
    case 'remove-saas':
      cmdRemove(ids);
      break;
    case 'move-binary':
      cmdMoveBinary();
      break;
    case 'add-status':
      cmdAddStatus(statusMap);
      break;
    case 'sync-legend':
      cmdSyncLegend();
      break;
    case 'dedupe-cli':
      cmdDedupeCli();
      break;
    case 'validate':
      cmdValidate();
      break;
    default:
      console.error('Unknown command:', command);
      help();
  }

  console.log('\nDone.');
}

main();
