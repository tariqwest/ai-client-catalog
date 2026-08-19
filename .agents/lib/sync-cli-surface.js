#!/usr/bin/env node
/**
 * sync-cli-surface.js — Add or update a CLI surface mapping row for a master-table entry.
 *
 * Usage:
 *   node .agents/lib/sync-cli-surface.js --id <id>            # single by master id
 *   node .agents/lib/sync-cli-surface.js --ids <id1,id2>      # multiple
 *   node .agents/lib/sync-cli-surface.js --uid <uid>          # single by master uid
 *   node .agents/lib/sync-cli-surface.js --all                # sync all terminal_cli rows
 *   node .agents/lib/sync-cli-surface.js --all --dry-run      # preview
 *
 * Mirrors columns from cli-surface-mapping-table.md. Unknown CLI details default to `—`.
 * Uses patterns from populate-cli-surface.js when available; otherwise infers from id/binary.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { Spreadsheet, normalizeKey } = require('./md-table.js');
const { CLI_PATTERNS, inferPattern } = require('./populate-cli-surface.js');

const CATALOG = path.resolve(__dirname, '../../catalog-master-table.md');
const CLI_MAP = path.resolve(__dirname, '../../cli-surface-mapping-table.md');

function uid() {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const bytes = require('crypto').randomBytes(8);
  const chars = Array.from(bytes).map(b => alphabet[b % alphabet.length]);
  return `${chars.slice(0, 4).join('')}-${chars.slice(4).join('')}`;
}

function normalizeId(id) {
  return String(id).replace(/`/g, '').trim().toLowerCase();
}

function isTerminalCli(type) {
  return /terminal[_-]?cli/.test(String(type).toLowerCase());
}

function extractCommand(binary, displayName) {
  const backtick = (String(binary).match(/`([^`]+)`/) || [])[1];
  const raw = (backtick || String(binary || displayName)).trim();
  return raw.split(/[\s(]/)[0].replace(/`/g, '').trim() || normalizeId(displayName);
}

function normalizePatternKeys(pattern) {
  if (!pattern) return {};
  const out = {};
  for (const [k, v] of Object.entries(pattern)) {
    out[normalizeKey(k)] = v;
  }
  return out;
}

function buildRow(master, pattern, rowNum) {
  const id = normalizeId(master.id);
  const command = extractCommand(master.binary, master.display_name);
  const isAcpAgent = String(master.is_acp_agent_server).toLowerCase() === 'true';
  const rawPattern = pattern || inferPattern(id, command, master.display_name, isAcpAgent);
  const inferred = normalizePatternKeys(rawPattern);

  return {
    '': String(rowNum),
    id: master.id, // already backticked
    uid: master.uid,
    command: `\`${command}\``,
    headless_print: inferred.headless_print || '—',
    prompt_mode: inferred.prompt_mode || '—',
    acp: inferred.acp || '—',
    chat_run: inferred.chat_run || '—',
    serve: inferred.serve || '—',
    config: inferred.config || '—',
    auth: inferred.auth || '—',
    trust_bypass: inferred.trust_bypass || '—',
    subcommands: inferred.subcommands || '—',
    notes: inferred.notes || '—',
    created: master.created || '—',
    updated: master.updated || '—',
    project_status: master.project_status || 'active',
  };
}

function rebuildCliRows(sheet) {
  for (let i = 0; i < sheet.table.rows.length; i++) {
    const r = sheet.table.rows[i];
    r[''] = String(i + 1);
    r.__raw = sheet.table.header.map(h => r[normalizeKey(h)] !== undefined ? String(r[normalizeKey(h)]) : '');
    r.__line = `| ${r.__raw.join(' | ')} |`;
    sheet.table.lines[i + 2] = r.__line;
  }
}

function main() {
  const args = process.argv.slice(2);
  const get = (flag) => { const i = args.indexOf(flag); return i >= 0 ? args[i + 1] : null; };
  const has = (flag) => args.includes(flag);

  const dryRun = has('--dry-run');
  const all = has('--all');
  const idArg = get('--id');
  const idsArg = get('--ids');
  const uidArg = get('--uid');

  const masterSheet = Spreadsheet.fromMarkdown(fs.readFileSync(CATALOG, 'utf8'));
  const cliSheet = Spreadsheet.fromMarkdown(fs.readFileSync(CLI_MAP, 'utf8'), { heading: /^##\s+CLI Surface Mapping/i });

  let targets = [];

  if (all) {
    targets = masterSheet.list().filter(r => isTerminalCli(r.type));
  } else if (idArg) {
    const r = masterSheet.find(idArg);
    if (!r) throw new Error(`Master id not found: ${idArg}`);
    targets = [r];
  } else if (idsArg) {
    targets = idsArg.split(',').map(s => masterSheet.find(s.trim())).filter(Boolean);
  } else if (uidArg) {
    const r = masterSheet.list().find(row => normalizeId(row.uid) === normalizeId(uidArg));
    if (!r) throw new Error(`Master uid not found: ${uidArg}`);
    targets = [r];
  } else {
    console.error('Usage: sync-cli-surface.js --id <id> | --ids <id1,id2> | --uid <uid> | --all [--dry-run]');
    process.exit(1);
  }

  let added = 0;
  let updated = 0;
  let skipped = 0;

  for (const master of targets) {
    if (!isTerminalCli(master.type)) {
      console.log(`  SKIP ${normalizeId(master.id)}: not a terminal_cli (${master.type})`);
      skipped++;
      continue;
    }

    const id = normalizeId(master.id);
    const existing = cliSheet.find(id);
    const pattern = CLI_PATTERNS[id];
    const command = extractCommand(master.binary, master.display_name);

    if (existing) {
      const next = { ...existing };
      next.id = master.id;
      next.uid = master.uid;
      next.command = `\`${command}\``;
      next.created = master.created || '—';
      next.updated = master.updated || '—';
      next.project_status = master.project_status || 'active';

      // Only count as an update if any non-number, non-timestamp cell actually changed
      const changed = cliSheet.table.header.some(h => {
        if (h === '#' || h === 'updated' || h === 'created' || h === 'project_status') return false; // timestamps/project_status synced separately
        const nk = normalizeKey(h);
        return String(existing[nk] ?? '') !== String(next[nk] ?? '');
      });

      if (!changed) {
        // Still sync timestamps even when no surface cell changed
        if (existing.updated !== next.updated || existing.created !== next.created || existing.project_status !== next.project_status) {
          cliSheet.upsert(next, { key: 'id' });
          const upserted = cliSheet.find(id);
          if (upserted) upserted.updated = next.updated;
          updated++;
        }
        continue;
      }

      updated++;
      cliSheet.upsert(next, { key: 'id' });
      const upserted = cliSheet.find(id);
      if (upserted) upserted.updated = next.updated;
    } else {
      added++;
      const rowNum = String(cliSheet.table.rows.length + 1);
      const row = buildRow(master, pattern, rowNum);
      cliSheet.upsert(row, { key: 'id' });
    }
  }

  rebuildCliRows(cliSheet);

  if (dryRun) {
    console.log(`Dry run: would add ${added}, update ${updated}, skip ${skipped}`);
  } else {
    let out = cliSheet.toMarkdown();
    if (!out.endsWith('\n')) out += '\n';
    fs.writeFileSync(CLI_MAP, out, 'utf8');
    try {
      execSync('git --no-pager diff --check -- cli-surface-mapping-table.md', { stdio: 'pipe', cwd: path.dirname(CLI_MAP) });
    } catch (e) {
      const msg = e.stdout?.toString() || e.message || '';
      if (!msg.includes('outside repository')) console.error(msg);
    }
    console.log(`Synced cli-surface-mapping-table.md: added ${added}, updated ${updated}, skipped ${skipped}`);
  }

  return { added, updated, skipped };
}

if (require.main === module) {
  try {
    main();
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
}

module.exports = { syncCliSurface: main, extractCommand, isTerminalCli };
