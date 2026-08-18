#!/usr/bin/env node
/**
 * remove-column.js — Remove column from catalog-master-table.md
 *
 * Removes a column from the master data table + Columns legend reliably.
 *
 * Usage:
 *   node helpers/remove-column.js --file ../../../catalog-master-table.md --column acp_launch [--dry-run] [--backup] [--validate]
 *   node helpers/remove-column.js --file ../../../catalog-master-table.md --column headless_print --validate --backup
 *   node helpers/remove-column.js --file ../../../catalog-master-table.md --column trust_bypass --dry-run
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
 * Remove column from markdown table
 */
function removeColumnFromTable(markdown, columnName, options = {}) {
  const { validate = true, dryRun = false } = options;
  
  const lines = markdown.split('\n');
  const output = [];
  let inMainTable = false;
  let inLegendTable = false;
  let headerProcessed = false;
  let columnIndex = -1;
  let columnHeader = null;
  let removedCount = 0;
  
  const normalizedTarget = normalizeKey(columnName);
  
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
    
    // Detect main data table section (look for the actual table with binary column)
    // The data table has format: | id | uid | display_name | ... | binary | ... |
    if (!inMainTable && !inLegendTable && line.startsWith('| id | uid | display_name')) {
      inMainTable = true;
      // This IS the header, process it immediately
      const cells = mdTable.splitRow(line);
      const normalized = cells.map(c => normalizeKey(c));
      columnIndex = normalized.indexOf(normalizedTarget);
      
      if (columnIndex === -1) {
        console.error(`❌ Column "${columnName}" not found in table`);
        console.error(`Available columns: ${cells.join(', ')}`);
        process.exit(1);
      }
      
      columnHeader = cells[columnIndex].trim();
      cells.splice(columnIndex, 1);
      output.push('| ' + cells.join(' | ') + ' |');
      headerProcessed = true;
      removedCount++;
      continue;
    }
    
    // Exit main table
    if (inMainTable && headerProcessed && (line.trim() === '' || line.startsWith('#') || line.startsWith('**'))) {
      inMainTable = false;
    }
    
    // Process separator row
    if (inMainTable && headerProcessed && line.match(/^\|\s*---/)) {
      const cells = mdTable.splitRow(line);
      cells.splice(columnIndex, 1);
      output.push('| ' + cells.join(' | ') + ' |');
      removedCount++;
      continue;
    }
    
    // Process data rows
    if (inMainTable && headerProcessed && line.startsWith('| `')) {
      const cells = mdTable.splitRow(line);
      if (cells.length > columnIndex) {
        cells.splice(columnIndex, 1);
        output.push('| ' + cells.join(' | ') + ' |');
        removedCount++;
      } else {
        output.push(line); // Malformed row, preserve as-is
      }
      continue;
    }
    
    // Process legend table - remove matching entry
    if (inLegendTable && line.match(/^\|\s*\*\*/)) {
      const cells = mdTable.splitRow(line);
      if (cells.length >= 2) {
        const legendKey = cells[0].replace(/\*\*/g, '').trim();
        if (normalizeKey(legendKey) === normalizedTarget) {
          // Skip this legend entry
          removedCount++;
          continue;
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
      
      if (line.startsWith('| id | uid | display_name')) {
        headerCols = mdTable.splitRow(line).length;
        inMainTableValidation = true;
      } else if (inMainTableValidation && line.startsWith('| `')) {
        dataCols.push(mdTable.splitRow(line).length);
      } else if (inMainTableValidation && (line.trim() === '' || line.startsWith('#') || line.startsWith('**'))) {
        break; // Exit validation at end of main table
      }
    }
    
    const allMatch = dataCols.every(c => c === headerCols);
    console.log(`  ✓ Header columns: ${headerCols}`);
    console.log(`  ✓ Data rows checked: ${dataCols.length}`);
    console.log(`  ${allMatch ? '✓' : '❌'} Column count consistency: ${allMatch ? 'PASS' : 'FAIL'}`);
    
    if (!allMatch) {
      console.error(`  Column count mismatch detected!`);
      const uniqueCounts = [...new Set(dataCols)];
      console.error(`  Expected: ${headerCols}, Found: ${uniqueCounts.join(', ')}`);
      process.exit(2);
    }
  }
  
  return {
    markdown: result,
    columnHeader,
    columnIndex,
    removedCount
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
  const dryRun = parsedArgs['dry-run'] === true;
  const backup = parsedArgs.backup === true;
  const validate = parsedArgs.validate !== false; // default true
  
  if (!columnName) {
    console.error('Usage: node remove-column.js --file <path> --column <name> [--dry-run] [--backup] [--validate]');
    process.exit(1);
  }
  
  if (!fs.existsSync(filePath)) {
    console.error(`❌ File not found: ${filePath}`);
    process.exit(1);
  }
  
  console.log(`🗑️  Removing column "${columnName}" from ${path.basename(filePath)}`);
  
  const markdown = fs.readFileSync(filePath, 'utf8');
  
  // Backup
  if (backup && !dryRun) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const backupPath = filePath.replace(/\.md$/, `.backup.${timestamp}.md`);
    fs.writeFileSync(backupPath, markdown, 'utf8');
    console.log(`📦 Backup created: ${path.basename(backupPath)}`);
  }
  
  // Remove column
  const result = removeColumnFromTable(markdown, columnName, { validate, dryRun });
  
  console.log(`\n✅ Removed column "${result.columnHeader}" (index ${result.columnIndex})`);
  console.log(`   Affected: ${result.removedCount} rows/entries`);
  
  // Write or show diff
  if (dryRun) {
    console.log(`\n🔍 Dry run - no changes written`);
    console.log(`   Would remove column at index ${result.columnIndex}`);
  } else {
    // Atomic write via temp file
    const tempPath = filePath + '.tmp';
    fs.writeFileSync(tempPath, result.markdown, 'utf8');
    fs.renameSync(tempPath, filePath);
    console.log(`\n✅ Written to ${path.basename(filePath)}`);
  }
}

if (require.main === module) {
  main();
}

module.exports = { removeColumnFromTable, normalizeKey };
