#!/usr/bin/env node
/**
 * Compatibility entry point for the shared markdown spreadsheet helper.
 * New code should import .agents/lib/md-table.js directly.
 */

const path = require('path');
const { spawnSync } = require('child_process');

const sharedPath = path.resolve(__dirname, '../../../lib/md-table.js');

if (require.main === module) {
  const result = spawnSync(process.execPath, [sharedPath, ...process.argv.slice(2)], {
    stdio: 'inherit',
  });
  process.exit(result.status ?? 1);
}

module.exports = require(sharedPath);
