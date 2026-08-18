# Column Management Skills

Reliable markdown table column manipulation for `catalog-master-table.md` using md-spreadsheet helpers.

## Available Helpers

### 1. remove-column.js
Remove a column from the catalog master table with validation.

**Usage:**
```bash
node helpers/remove-column.js --file catalog-master-table.md --column <name> [--dry-run] [--backup] [--validate]
```

**Example:**
```bash
# Remove base_url_config column with backup
node helpers/remove-column.js --file catalog-master-table.md --column base_url_config --backup --validate

# Dry run to preview removal
node helpers/remove-column.js --file catalog-master-table.md --column acp_launch --dry-run
```

### 2. move-column.js
Move/reorder a column to a new position in the table.

**Usage:**
```bash
node helpers/move-column.js --file catalog-master-table.md --column <name> --position <pos> [--dry-run] [--backup] [--validate]
```

**Position formats:**
- `last` — move to end
- `first` — move to beginning (after id)
- `after:<column>` — place after specified column
- `before:<column>` — place before specified column
- `<number>` — absolute position (0-indexed)

**Examples:**
```bash
# Move created and updated to last positions
node helpers/move-column.js --file catalog-master-table.md --column created --position last --backup
node helpers/move-column.js --file catalog-master-table.md --column updated --position last --backup

# Move uid after display_name
node helpers/move-column.js --file catalog-master-table.md --column uid --position after:display_name --dry-run

# Move popularity before homepage_url
node helpers/move-column.js --file catalog-master-table.md --column popularity --position before:homepage_url --validate
```

## Features

- **Code-span aware:** Handles pipes inside `` `code` `` spans correctly via md-table.js
- **Validation:** Post-operation column count consistency checks
- **Atomic writes:** Uses temp file + rename to avoid partial writes
- **Backups:** Optional timestamped backups before modification
- **Dry run:** Preview changes without writing
- **Legend cleanup:** Removes/updates legend entries (move-column requires manual legend reorder)

## Exit Codes

- `0` — Success
- `1` — Column not found or invalid parameters
- `2` — Validation failed (column count mismatch)

## Notes

- Both helpers operate only on the main catalog table (not CLI Surface Mapping)
- Legend entries are automatically removed by remove-column.js
- Legend reordering after move-column.js is manual (see warning in output)
- Uses md-spreadsheet style functions from `../add-to-catalog/helpers/md-table.js`

## Related Skills

- **add-column-to-catalog:** Add new column with intelligent population
- **remove-column-from-catalog:** Parent skill (SKILL.md)
