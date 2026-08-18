# Agent Library Structure

## Directory Layout

```
.agents/
├── lib/                              # Shared libraries (abstracted from skills)
│   ├── README.md                     # Library documentation
│   ├── STRUCTURE.md                  # This file
│   ├── md-table.js                   # Markdown table primitives
│   └── column-ops.js                 # Column DDL + backfill
│
└── skills/                           # Individual agent skills
    ├── add-to-catalog/
    │   ├── SKILL.md
    │   └── helpers/
    │       ├── add.js                # Uses ../../../lib/md-table.js
    │       └── md-table.js           # [Legacy - can be removed]
    │
    ├── add-column-to-catalog/
    │   ├── SKILL.md
    │   └── helpers/
    │       └── column.js             # Uses ../../../lib/md-table.js
    │
    ├── remove-column-from-catalog/
    │   ├── SKILL.md
    │   ├── README.md
    │   └── helpers/
    │       ├── remove-column.js      # Uses ../../../lib/md-table.js
    │       └── move-column.js        # Uses ../../../lib/md-table.js
    │
    ├── batch-add-to-catalog/
    │   ├── SKILL.md
    │   └── helpers/
    │       └── batch.js              # Uses ../../../lib/md-table.js
    │
    ├── revalidate-catalog/
    │   ├── SKILL.md
    │   └── helpers/
    │       └── revalidate.js         # Uses ../../../lib/md-table.js
    │
    ├── refresh-catalog/
    │   └── SKILL.md
    │
    ├── edit-catalog/
    │   └── SKILL.md
    │
    ├── list-catalog/
    │   └── SKILL.md
    │
    ├── view-catalog/
    │   └── SKILL.md
    │
    ├── search-catalog/
    │   └── SKILL.md
    │
    └── remove-from-catalog/
        └── SKILL.md
```

## Import Patterns

All skills should import from the shared library:

```javascript
// Correct - uses shared library
const { Spreadsheet } = require('../../../lib/md-table.js');
const mdTable = require('../../../lib/md-table.js');
const columnOps = require('../../../lib/column-ops.js');

// Incorrect - uses skill-local copy
const { Spreadsheet } = require('../../add-to-catalog/helpers/md-table.js');
```

## Path Resolution

From skill helper file to shared lib:

```
.agents/skills/<skill-name>/helpers/<helper>.js
              ↓↓↓
../../../lib/md-table.js

Breakdown:
  ..        = .agents/skills/<skill-name>/helpers/ → .agents/skills/<skill-name>/
  ../..     = .agents/skills/<skill-name>/ → .agents/skills/
  ../../..  = .agents/skills/ → .agents/
  ../../../lib/ = .agents/lib/
```

## Library Responsibilities

### md-table.js
- Low-level markdown table parsing
- Code-span aware pipe splitting
- Alignment row detection
- Spreadsheet abstraction (row-object CRUD)

### column-ops.js
- High-level column operations
- DDL: add, remove, move columns
- DML: populate, backfill column values
- Known fetchers for common columns

## Migration Checklist

When creating a new skill that manipulates tables:

- [ ] Import from `.agents/lib/md-table.js` (not skill-local copy)
- [ ] Use `Spreadsheet.fromMarkdown()` for table loading
- [ ] Use `sheet.upsert()` for row operations
- [ ] Use `splitRow()` for manual cell parsing (if needed)
- [ ] Document any new table patterns in lib/README.md
- [ ] Add skill to "Skills Using Shared Lib" section

## Future Libraries

Candidates for abstraction:
- **web-fetch.js** — GitHub stars, marketplace installs, version lookups
- **uid-gen.js** — UID generation with collision detection
- **validation.js** — Table validation (column count, required fields)
- **legend-sync.js** — Auto-sync legend entries with columns

---

**Created:** 2026-08-17
