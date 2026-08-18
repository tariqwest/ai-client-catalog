# Shared Agent Libraries

Reusable utilities for all catalog skills, abstracted from individual skill helpers.

## Purpose

Centralizes common functionality to avoid duplication across skills like `add-to-catalog`, `remove-column-from-catalog`, `batch-add-to-catalog`, `revalidate-catalog`, etc.

## Libraries

### md-table.js

**Markdown table manipulation primitives** — code-span aware pipe-table parser/serializer.

Treats markdown pipe tables as spreadsheets: header row → column keys, each `| … |` line → row object.

**Key functions:**
- `splitRow(line)` — Split table row on unescaped pipes (handles `` `...|...` `` and `\|`)
- `joinRow(cells)` — Reconstruct table row from cells
- `isAlignmentRow(line)` — Detect separator row (`| --- | --- |`)
- `parseTableLines(lines)` — Parse full table into header + rows
- `Spreadsheet.fromMarkdown(md, options)` — Load table from markdown
  - `sheet.rows` — Array of row objects
  - `sheet.upsert(row, { key: 'id' })` — Insert or update row. For tables with `created` and `updated` columns, inserts set both timestamps automatically; content changes preserve `created` and refresh `updated` in UTC seconds.
  - `sheet.toMarkdown()` — Serialize back to markdown

**Example:**
```javascript
const { Spreadsheet } = require('./.agents/lib/md-table.js');

const md = fs.readFileSync('catalog-master-table.md', 'utf8');
const sheet = Spreadsheet.fromMarkdown(md, { 
  heading: /^# Catalog Master Table/ 
});

// Add or update row
sheet.upsert({ 
  id: 'my-tool', 
  display_name: 'My Tool',
  vendor: 'ACME'
}, { key: 'id' });

// Write back
fs.writeFileSync('catalog-master-table.md', sheet.toMarkdown(), 'utf8');
```

**Handles edge cases:**
- Escaped pipes: `\|` inside cells
- Code spans with pipes: `` `npm i -g foo | bash` ``
- Leading/trailing `|` (optional)
- Alignment row `|---|---|`
- Preserves surrounding document (only replaces target table)

### column-ops.js

**Column DDL and backfill operations** for catalog master table.

**Key functions:**
- `addColumn(markdown, columnSpec)` — Add new column to table + legend
- `populateColumn(markdown, columnName, fetcher)` — Backfill column values
- `removeColumn(markdown, columnName)` — Remove column from table + legend
- `moveColumn(markdown, columnName, position)` — Reorder column
- `listColumns(markdown)` — Extract column names

**Known column fetchers:**
- `pricing` — Infer pricing model (Free/Freemium/Paid/Enterprise)
- `funding` — Lookup funding status (Bootstrap/Seed/SeriesA/etc)
- `category` — Classify category (code/agent/library+server/host)

**Example:**
```javascript
const { addColumn, populateColumn } = require('./.agents/lib/column-ops.js');

// Add new column
const md1 = addColumn(markdown, {
  name: 'pricing',
  description: 'Pricing — Free / Paid per pricing page',
  position: 'after:license'
});

// Populate with custom fetcher
const md2 = populateColumn(md1, 'pricing', async (row) => {
  // Your logic here
  return row.license === 'Proprietary' ? 'Paid' : 'Free';
});
```

## Usage Across Skills

All catalog skills now import from `.agents/lib/`:

```javascript
// Old (skill-local copy):
const mdTable = require('../../add-to-catalog/helpers/md-table.js');

// New (shared lib):
const mdTable = require('../../../lib/md-table.js');
```

**Benefits:**
- ✅ Single source of truth for table operations
- ✅ Bug fixes propagate to all skills
- ✅ Consistent behavior across add/remove/move/batch operations
- ✅ Easier to test and maintain

## Testing

```bash
# Verify remove-column uses shared lib
node .agents/skills/remove-column-from-catalog/helpers/remove-column.js \
  --file catalog-master-table.md --column test --dry-run

# Verify move-column uses shared lib
node .agents/skills/remove-column-from-catalog/helpers/move-column.js \
  --file catalog-master-table.md --column popularity --position last --dry-run

# Verify add-column uses shared lib
node .agents/skills/add-column-to-catalog/helpers/column.js \
  --file catalog-master-table.md --list-columns
```

## Migration Status

✅ **Migrated skills:**
- `add-to-catalog` — Uses `md-table.js` via `column.js`
- `add-column-to-catalog` — Uses `md-table.js` for DDL + backfill
- `remove-column-from-catalog` — Uses `md-table.js` for remove/move ops
- `batch-add-to-catalog` — Uses `Spreadsheet` for batch inserts
- `revalidate-catalog` — Uses `Spreadsheet` for row updates

**Old local copies:**
- `.agents/skills/add-to-catalog/helpers/md-table.js` — Now just a reference, can be removed once confirmed working

## Directory Structure

```
.agents/
├── lib/
│   ├── md-table.js          # Markdown table primitives
│   ├── column-ops.js        # Column DDL + backfill
│   └── README.md            # This file
└── skills/
    ├── add-to-catalog/
    ├── add-column-to-catalog/
    ├── remove-column-from-catalog/
    ├── batch-add-to-catalog/
    └── revalidate-catalog/
```

## Future Libraries

Candidates for abstraction:
- **web-fetch.js** — Unified web scraping (GitHub stars, marketplace installs, version lookups)
- **uid-gen.js** — UID generation (nanoid/ulid with collision detection)
- **validation.js** — Table validation (column count, required fields, uniqueness)
- **legend-sync.js** — Auto-sync legend entries with table columns

---

**Last updated:** 2026-08-17
