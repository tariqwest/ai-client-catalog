#!/usr/bin/env node
/**
 * Synchronize created/updated values from catalog-master-table.md into
 * cli-surface-mapping-table.md by uid. Rows without a matching catalog uid retain —.
 */

const fs = require('fs');
const path = require('path');
const { splitRow } = require('./md-table.js');

function tableBounds(lines, headerPrefix) {
  const headerIndex = lines.findIndex(line => line.startsWith(headerPrefix));
  if (headerIndex === -1) throw new Error(`Header not found: ${headerPrefix}`);
  let end = headerIndex + 2;
  while (end < lines.length && lines[end].startsWith('|')) end++;
  return { headerIndex, end };
}

function catalogTimestamps(markdown) {
  const lines = markdown.split('\n');
  const { headerIndex, end } = tableBounds(lines, '| # | id | uid | display_name');
  const header = splitRow(lines[headerIndex]);
  const uidIndex = header.indexOf('uid');
  const createdIndex = header.indexOf('created');
  const updatedIndex = header.indexOf('updated');
  const result = new Map();

  for (let i = headerIndex + 2; i < end; i++) {
    const cells = splitRow(lines[i]);
    result.set(cells[uidIndex], { created: cells[createdIndex], updated: cells[updatedIndex] });
  }
  return result;
}

function syncCliSurfaceTimestamps(catalogMarkdown, mappingMarkdown) {
  const timestamps = catalogTimestamps(catalogMarkdown);
  const lines = mappingMarkdown.split('\n');
  const { headerIndex, end } = tableBounds(lines, '| # | id | uid | command');
  const header = splitRow(lines[headerIndex]);
  const uidIndex = header.indexOf('uid');
  const notesIndex = header.indexOf('notes');
  let createdIndex = header.indexOf('created');
  let updatedIndex = header.indexOf('updated');

  if (createdIndex === -1 || updatedIndex === -1) {
    header.push('created', 'updated');
    lines[headerIndex] = `| ${header.join(' | ')} |`;
    const separator = splitRow(lines[headerIndex + 1]);
    separator.push('---', '---');
    lines[headerIndex + 1] = `| ${separator.join(' | ')} |`;
    createdIndex = header.length - 2;
    updatedIndex = header.length - 1;
  }

  let matched = 0;
  let unmatched = 0;
  for (let i = headerIndex + 2; i < end; i++) {
    const cells = splitRow(lines[i]);
    const uid = cells[uidIndex];
    const timestamp = timestamps.get(uid);

    // Repair the malformed pre-sync write that appended created into notes.
    if (cells[notesIndex]) cells[notesIndex] = cells[notesIndex].replace(/\s+\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/, '');
    cells[createdIndex] = timestamp?.created || '—';
    cells[updatedIndex] = timestamp?.updated || '—';
    if (timestamp) matched++;
    else unmatched++;
    lines[i] = `| ${cells.join(' | ')} |`;
  }

  return { markdown: lines.join('\n'), matched, unmatched };
}

function main() {
  const args = process.argv.slice(2);
  const valueFor = flag => args[args.indexOf(flag) + 1];
  const catalogPath = path.resolve(valueFor('--catalog') || path.resolve(__dirname, '../../catalog-master-table.md'));
  const mappingPath = path.resolve(valueFor('--mapping') || path.resolve(__dirname, '../../cli-surface-mapping-table.md'));
  const dryRun = args.includes('--dry-run');
  const result = syncCliSurfaceTimestamps(fs.readFileSync(catalogPath, 'utf8'), fs.readFileSync(mappingPath, 'utf8'));
  if (!dryRun) fs.writeFileSync(mappingPath, result.markdown.endsWith('\n') ? result.markdown : `${result.markdown}\n`);
  console.log(`${dryRun ? 'Would synchronize' : 'Synchronized'} timestamps: ${result.matched} matched, ${result.unmatched} unmatched.`);
}

if (require.main === module) main();

module.exports = { syncCliSurfaceTimestamps, catalogTimestamps };
