---
name: remove-column-from-catalog
description: Remove a column from the catalog master table with reliable validation and cleanup.
---

# Remove Column from Catalog

Remove a column from the deduplicated [catalog master table](../../../catalog-master-table.md) reliably, updating both the data table and the legend.

> **DDL drop in one skill.** Use when a column becomes obsolete, redundant, or migrated to another table (e.g. moving `acp_launch`, `headless_print`, `trust_bypass` to CLI Surface Mapping table). The skill removes the column header, data cells, separator, and legend entry via md-spreadsheet helpers, then validates the result.

## Overview

The master table is a pipe-table spreadsheet (`ID | Display Name | Vendor | … | github_url`). Removing a column by hand is error-prone (misaligned pipes, off-by-one errors, orphaned legend entries). This skill does it reliably.

Safe: validates column count before/after, ensures no data corruption in remaining columns, and verifies legend cleanup.

## Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `column_name` | `string` | yes | Column header to remove (case-insensitive, normalized). E.g. `acp_launch`, `headless_print`, `trust_bypass`, `Pricing`. Will match via normalized key (`"ACP Launch"` → `acp_launch`). |
| `validate` | `boolean` | no | If `true`, performs deep validation after removal: column count consistency, no orphaned pipes, legend cleanup (default `true`). |
| `backup` | `boolean` | no | If `true`, creates a timestamped backup before modification (default `true`). |
| `dryRun` | `boolean` | no | If `true`, reports plan and validation without writing the file (default `false`). |

**Examples:**
```json
{"column_name": "acp_launch"}
{"column_name": "headless_print", "validate": true}
{"column_name": "trust_bypass", "backup": true, "dryRun": false}
{"column_name": "Pricing", "dryRun": true}
```

## Helpers

| Helper | Path | Purpose |
|--------|------|---------|
| **MD table helper** | [`../add-to-catalog/helpers/md-table.js`](../add-to-catalog/helpers/md-table.js) | Spreadsheet primitive: `splitRow` (code-span aware), `isAlignmentRow`, `parseTableLines`, `Spreadsheet.fromMarkdown → removeColumn → toMarkdown`. Handles `\|` and `` `...|...` `` correctly. |
| **Remove column** | [`helpers/remove-column.js`](helpers/remove-column.js) | Column removal: finds column index, removes from header/separator/data rows, updates legend, validates result. |

## Workflow

1. **Locate column:**
   ```bash
   node ../add-to-catalog/helpers/md-table.js --file ../../../catalog-master-table.md --list | python3 -c "import json; print([k for k in json.load(open('/dev/stdin'))[0].keys()])"
   ```
   Normalize `column_name` via `normalizeKey` (`"ACP Launch" → "acp_launch"`). If column does not exist → exit with error.

2. **Backup (if enabled):**
   ```bash
   cp catalog-master-table.md catalog-master-table.backup.$(date +%Y%m%d_%H%M%S).md
   ```

3. **Remove column reliably (no regex):**
   ```bash
   node .agents/skills/remove-column-from-catalog/helpers/remove-column.js --file catalog-master-table.md --column acp_launch [--dry-run]
   ```
   What it does:
   - Finds the master data table via `TABLE_HEADING_RE` (`homepage_url`+`github_url`) and the `**Columns**` legend table.
   - Locates column index in header row (normalized match).
   - Removes header cell, separator cell (`---`), and data cell at that index from every row via `splitRow` (preserves `| \| |` and `` `...|...` ``).
   - Removes matching legend entry from `**Columns**` table (`| **<Name>** | <description> |`).
   - Reconstructs table with correct pipe alignment.

4. **Validate (if enabled):**
   - **Column count consistency:** All data rows have same column count as header.
   - **No orphaned pipes:** No trailing `||` or malformed cells.
   - **Legend cleanup:** Removed column's legend entry is gone.
   - **Sample row integrity:** Check 3 random rows to ensure remaining data is intact (compare against git diff or backup).

5. **Write result:**
   - If `dryRun=true` → print diff, validation report, exit.
   - Otherwise → write to `catalog-master-table.md`, print summary.

## Validation

Post-removal checks:

```bash
# Count columns
awk -F'|' 'NR==36 {print NF}' catalog-master-table.md  # header
awk -F'|' 'NR==38 {print NF}' catalog-master-table.md  # first data row

# Check legend
grep "^\| \*\*${column_name}\*\*" catalog-master-table.md  # should be empty

# Sample integrity (compare git diff)
git diff catalog-master-table.md | grep "^-| \`" | head -3
```

## Exit codes

- `0` — Success (column removed, validated)
- `1` — Column not found
- `2` — Validation failed (column count mismatch, orphaned pipes)
- `3` — Backup creation failed

## Notes

- **Atomic:** Uses temp file + atomic rename to avoid partial writes.
- **Idempotent:** Running twice with same `column_name` is safe (second run exits with "column not found").
- **Preserves formatting:** Maintains existing pipe alignment, spacing, and code spans.
- **CLI Surface Mapping table:** This skill only operates on the main catalog table. To remove columns from CLI Surface Mapping, manually edit or create a similar skill.

## Example

```bash
# Remove acp_launch column with validation and backup
node .agents/skills/remove-column-from-catalog/helpers/remove-column.js \
  --file catalog-master-table.md \
  --column acp_launch \
  --validate \
  --backup

# Dry run: see what would be removed
node .agents/skills/remove-column-from-catalog/helpers/remove-column.js \
  --file catalog-master-table.md \
  --column headless_print \
  --dry-run
```
