#!/usr/bin/env node
/**
 * add-number-column.js — Add row number column to markdown tables
 *
 * Adds a # column at the beginning of tables showing current row index (1-based).
 * This is NOT a stable ID, just the current position in the table.
 *
 * Usage:
 *   node .agents/lib/add-number-column.js catalog-master-table.md
 *   node .agents/lib/add-number-column.js cli-surface-mapping-table.md
 */

const fs = require('fs');
const path = require('path');
const mdTable = require('./md-table.js');

function addNumberColumn(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  const output = [];
  let inTable = false;
  let rowNumber = 1;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Detect main table header (starts with | id |)
    if (line.startsWith('| id | uid | display_name') || line.startsWith('| id | uid | command')) {
      inTable = true;
      const cells = mdTable.splitRow(line);
      cells.unshift('#');
      output.push('| ' + cells.join(' | ') + ' |');
      rowNumber = 1;
      continue;
    }
    
    // Separator row
    if (inTable && line.match(/^\|\s*---/)) {
      const cells = mdTable.splitRow(line);
      cells.unshift('---');
      output.push('| ' + cells.join(' | ') + ' |');
      continue;
    }
    
    // Data rows (start with | `)
    if (inTable && line.startsWith('| `')) {
      const cells = mdTable.splitRow(line);
      cells.unshift(String(rowNumber));
      output.push('| ' + cells.join(' | ') + ' |');
      rowNumber++;
      continue;
    }
    
    // Exit table at blank line or new section
    if (inTable && (line.trim() === '' || line.startsWith('##') || (line.startsWith('---') && !line.match(/^\| ---/)))) {
      inTable = false;
      rowNumber = 1;
    }
    
    output.push(line);
  }
  
  fs.writeFileSync(filePath, output.join('\n'), 'utf8');
  console.log(`✅ Added # column to ${path.basename(filePath)} (${rowNumber - 1} rows numbered)`);
}

function main() {
  const filePath = process.argv[2];
  
  if (!filePath) {
    console.error('Usage: node add-number-column.js <file>');
    process.exit(1);
  }
  
  if (!fs.existsSync(filePath)) {
    console.error(`❌ File not found: ${filePath}`);
    process.exit(1);
  }
  
  addNumberColumn(filePath);
}

if (require.main === module) {
  main();
}

module.exports = { addNumberColumn };
