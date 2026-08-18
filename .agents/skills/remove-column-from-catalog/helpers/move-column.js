#!/usr/bin/env node
/**
 * move-column.js — Move/reorder column in catalog-master-table.md
 *
 * Moves a column to a new position in the master data table and updates the legend.
 *
 * Usage:
 *   node helpers/move-column.js --file ../../../catalog-master-table.md --column created --position last [--dry-run] [--backup] [--validate]
 *   node helpers/move-column.js --file ../../../catalog-master-table.md --column uid --position after:id --validate
 *   node helpers/move-column.js --file ../../../catalog-master-table.md --column popularity --position before:homepage_url --dry-run
 *
 * Position formats:
 *   - "last" — move to end (before trailing empty column)
 *   - "first" — move to beginning (after id)
 *   - "after:<column>" — place after specified column
 *   - "before:<column>" — place before specified column
 *   - <number> — absolute position (0-indexed)
 *
 * No external deps. Uses ../add-to-catalog/helpers/md-table.js for code-span aware parsing.
 */

const fs = require('fs');
const path = require('path');

const catalogDefault = path.resolve(__dirname, '../../../catalog-master-table.md');

function normalizeKey(h) {
  return h.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
}

// Import md-table splitRow and joinRow
const mdTablePath = path.resolve(__dirname, '../../../lib/md-table.js');
const mdTable = require(mdTablePath);

/**
 * Move column in markdown table
 */
function moveColumnInTable(markdown, columnName, position, options = {}) {
  const { validate = true, dryRun = false } = options;
  
  const lines = markdown.split('\n');
  const output = [];
  let inMainTable = false;
  let inLegendTable = false;
  let headerProcessed = false;
  let columnIndex = -1;
  let targetIndex = -1;
  let columnHeader = null;
  let movedCount = 0;
  
  const normalizedTarget = normalizeKey(columnName);
  
  // Parse position
  let positionMode = 'last'; // default
  let positionAnchor = null;
  
  if (typeof position === 'number') {
    positionMode = 'absolute';
    targetIndex = position;
  } else if (position === 'first') {
    positionMode = 'first';
    targetIndex = 1; // After 'id'
  } else if (position === 'last') {
    positionMode = 'last';
  } else if (position.startsWith('after:')) {
    positionMode = 'after';
    positionAnchor = normalizeKey(position.slice(6));
  } else if (position.startsWith('before:')) {
    positionMode = 'before';
    positionAnchor = normalizeKey(position.slice(7));
  }
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Skip CLI Surface Mapping section entirely
    if (/^##\s+CLI Surface Mapping/.test(line)) {
      output.push(line);
      // Copy rest of file as-is
      for (let j = i + 1; j < lines.length; j++) {
        output.push(lines[j]);
      }
      break;
    }
    
    // Detect legend table (skip it - we want the data table)
    if (/^\*\*Columns\*\*/.test(line)) {
      inLegendTable = true;
      output.push(line);
      continue;
    }
    
    // Exit legend table
    if (inLegendTable && (line.trim() === '' || line.startsWith('#'))) {
      inLegendTable = false;
    }
    
    // Detect main data table section
    if (!inMainTable && !inLegendTable && (line.startsWith('| id | uid | display_name') || line.startsWith('| # | id | uid | display_name'))) {
      inMainTable = true;
      const cells = mdTable.splitRow(line);
      const normalized = cells.map(c => normalizeKey(c));
      columnIndex = normalized.indexOf(normalizedTarget);
      
      if (columnIndex === -1) {
        console.error(`❌ Column "${columnName}" not found in table`);
        console.error(`Available columns: ${cells.join(', ')}`);
        process.exit(1);
      }
      
      // Calculate target index
      if (positionMode === 'last') {
        targetIndex = cells.length - 1;
      } else if (positionMode === 'after' || positionMode === 'before') {
        const anchorIndex = normalized.indexOf(positionAnchor);
        if (anchorIndex === -1) {
          console.error(`❌ Anchor column "${positionAnchor}" not found`);
          process.exit(1);
        }
        targetIndex = positionMode === 'after' ? anchorIndex + 1 : anchorIndex;
      }
      
      // Adjust target if moving from before target position
      if (columnIndex < targetIndex) {
        targetIndex--;
      }
      
      columnHeader = cells[columnIndex].trim();
      
      // Move column
      const columnValue = cells.splice(columnIndex, 1)[0];
      cells.splice(targetIndex, 0, columnValue);
      
      output.push('| ' + cells.join(' | ') + ' |');
      headerProcessed = true;
      movedCount++;
      continue;
    }
    
    // Exit main table
    if (inMainTable && headerProcessed && (line.trim() === '' || line.startsWith('#') || line.startsWith('**'))) {
      inMainTable = false;
    }
    
    // Separator row
    if (inMainTable && headerProcessed && line.match(/^\|\s*---/)) {
      const cells = mdTable.splitRow(line);
      const columnValue = cells.splice(columnIndex, 1)[0];
      cells.splice(targetIndex, 0, columnValue);
      output.push('| ' + cells.join(' | ') + ' |');
      movedCount++;
      continue;
    }
    
    // Process data rows
    if (inMainTable && headerProcessed && (line.startsWith('| `') || /^\| \d+ \| `/.test(line))) {
      const cells = mdTable.splitRow(line);
      if (cells.length > columnIndex) {
        const columnValue = cells.splice(columnIndex, 1)[0];
        cells.splice(targetIndex, 0, columnValue);
        output.push('| ' + cells.join(' | ') + ' |');
        movedCount++;
      } else {
        output.push(line); // Malformed row, preserve as-is
      }
      continue;
    }
    
    // Process legend table - move matching entry
    if (inLegendTable && line.match(/^\|\s*\*\*/)) {
      const cells = mdTable.splitRow(line);
      if (cells.length >= 2) {
        const legendKey = cells[0].replace(/\*\*/g, '').trim();
        if (normalizeKey(legendKey) === normalizedTarget) {
          // Store legend entry for later repositioning
          // For now, keep in place (legend reordering is manual)
        }
      }
      output.push(line);
      continue;
    }
    
    // Pass through all other lines
    output.push(line);
  }
  
  if (columnIndex === -1) {
    console.error(`❌ Column "${columnName}" not found`);
    process.exit(1);
  }
  
  const result = output.join('\n');
  
  // Validation
  if (validate) {
    console.log(`\n📊 Validation:`);
    const resultLines = result.split('\n');
    let headerCols = 0;
    let dataCols = [];
    let inMainTableValidation = false;
    
    for (let i = 0; i < resultLines.length; i++) {
      const line = resultLines[i];
      
      // Stop at CLI Surface Mapping section
      if (/^##\s+CLI Surface Mapping/.test(line)) {
        break;
      }
      
      // More flexible header detection (after columns are moved)
      if ((line.startsWith('| id |') || line.startsWith('| # | id |')) && line.includes('display_name')) {
        headerCols = mdTable.splitRow(line).length;
        inMainTableValidation = true;
      } else if (inMainTableValidation && (line.startsWith('| `') || /^\| \d+ \| `/.test(line))) {
        dataCols.push(mdTable.splitRow(line).length);
      } else if (inMainTableValidation && (line.trim() === '' || line.startsWith('#') || line.startsWith('**'))) {
        break;
      }
    }
    
    const allMatch = dataCols.length > 0 && dataCols.every(c => c === headerCols);
    console.log(`  ✓ Header columns: ${headerCols}`);
    console.log(`  ✓ Data rows checked: ${dataCols.length}`);
    console.log(`  ${allMatch ? '✓' : '❌'} Column count consistency: ${allMatch ? 'PASS' : 'FAIL'}`);
    
    if (!allMatch && dataCols.length > 0) {
      console.error(`  Column count mismatch detected!`);
      const uniqueCounts = [...new Set(dataCols)];
      console.error(`  Expected: ${headerCols}, Found: ${uniqueCounts.join(', ')}`);
      process.exit(2);
    }
  }
  
  return {
    markdown: result,
    columnHeader,
    fromIndex: columnIndex,
    toIndex: targetIndex,
    movedCount
  };
}

/**
 * Main CLI
 */
function main() {
  const args = process.argv.slice(2);
  const parsedArgs = {};
  
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith('--')) {
      const key = args[i].slice(2);
      const next = args[i + 1];
      if (next && !next.startsWith('--')) {
        parsedArgs[key] = next;
        i++;
      } else {
        parsedArgs[key] = true;
      }
    }
  }
  
  const filePath = parsedArgs.file || catalogDefault;
  const columnName = parsedArgs.column;
  const position = parsedArgs.position || 'last';
  const dryRun = parsedArgs['dry-run'] === true;
  const backup = parsedArgs.backup === true;
  const validate = parsedArgs.validate !== false; // default true
  
  if (!columnName) {
    console.error('Usage: node move-column.js --file <path> --column <name> --position <pos> [--dry-run] [--backup] [--validate]');
    console.error('Position: last | first | after:<column> | before:<column> | <number>');
    process.exit(1);
  }
  
  if (!fs.existsSync(filePath)) {
    console.error(`❌ File not found: ${filePath}`);
    process.exit(1);
  }
  
  console.log(`🔀 Moving column "${columnName}" to position "${position}" in ${path.basename(filePath)}`);
  
  const markdown = fs.readFileSync(filePath, 'utf8');
  
  // Backup
  if (backup && !dryRun) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const backupPath = filePath.replace(/\.md$/, `.backup.${timestamp}.md`);
    fs.writeFileSync(backupPath, markdown, 'utf8');
    console.log(`📦 Backup created: ${path.basename(backupPath)}`);
  }
  
  // Move column
  const result = moveColumnInTable(markdown, columnName, position, { validate, dryRun });
  
  console.log(`\n✅ Moved column "${result.columnHeader}"`);
  console.log(`   From index: ${result.fromIndex} → To index: ${result.toIndex}`);
  console.log(`   Affected: ${result.movedCount} rows`);
  
  // Write or show diff
  if (dryRun) {
    console.log(`\n🔍 Dry run - no changes written`);
    console.log(`   Would move column from index ${result.fromIndex} to ${result.toIndex}`);
  } else {
    // Atomic write via temp file
    const tempPath = filePath + '.tmp';
    fs.writeFileSync(tempPath, result.markdown, 'utf8');
    fs.renameSync(tempPath, filePath);
    console.log(`\n✅ Written to ${path.basename(filePath)}`);
    console.log(`\n⚠️  Note: Legend order not updated automatically. Please reorder legend entries manually if needed.`);
  }
}

if (require.main === module) {
  main();
}

module.exports = { moveColumnInTable, normalizeKey };
