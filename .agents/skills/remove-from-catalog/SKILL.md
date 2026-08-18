---
name: remove-from-catalog
description: Remove an entry from the AI CLI client catalog master table by id or uid.
---

# Remove from Catalog

Remove a single entry from the deduplicated [catalog master table](../../../catalog-master-table.md).

> **Target:** `catalog-master-table.md` — 22-col pipe table. This skill deletes one row (the `D` in CRUD). For create/update see `add-to-catalog`.

## Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `id` | string | no* | Stable `id` slug (e.g. `claude`, `` `opencode` ``). Case-insensitive, backticks optional. *Required if `uid` not set. |
| `uid` | string | no* | 8-char case-agnostic `uid` (`A-Z0-9` lowercased, e.g. `tj6cmpyw`). |
| `dryRun` | boolean | no | If true, only report what would be removed without writing. |

\* One of `id`/`uid` required.

**Examples:**
```json
{"id": "claude"}
{"uid": "tj6cmpyw"}
{"id": "`codebuff`", "dryRun": true}
```

## Helpers

| Helper | Path | Purpose |
|--------|------|---------|
| **MD table helper** | [`../add-to-catalog/helpers/md-table.js`](../add-to-catalog/helpers/md-table.js) | `Spreadsheet.fromMarkdown(md)` → `find(id)` / `remove(id)` → `toMarkdown()`. Handles pipe-escapes and preserves surrounding doc. CLI: `node helpers/md-table.js --file ../../../catalog-master-table.md --remove <id>` |
| **View helper** | [`../view-catalog/SKILL.md`](../view-catalog/SKILL.md) | Optional pre-check to confirm the row to delete. |

## Instructions

1. **Confirm the target exists** (fail fast if not):
   ```js
   const {Spreadsheet}=require('./.agents/skills/add-to-catalog/helpers/md-table.js');
   const sheet=Spreadsheet.fromMarkdown(fs.readFileSync('catalog-master-table.md','utf8'));
   const row = id ? sheet.find(id.replace(/`/g,'')) : sheet.list().find(r=>r.uid.toLowerCase()===uid.toLowerCase());
   if(!row) throw `not-found: ${id||uid}`;
   ```
   Or CLI: `node .agents/skills/add-to-catalog/helpers/md-table.js --file catalog-master-table.md --list | python3 -c "..."`
2. **Dry-run check** if `dryRun=true` → report the matched row and `would-remove: true`, do not write; verify `git diff --stat` shows no change.
3. **Remove:**
   ```bash
   node .agents/skills/add-to-catalog/helpers/md-table.js --file catalog-master-table.md --remove <id>
   # or uid:
   node -e "const {Spreadsheet}=require('./.agents/skills/add-to-catalog/helpers/md-table.js'); const fs=require('fs'); const s=Spreadsheet.fromMarkdown(fs.readFileSync('catalog-master-table.md','utf8')); s.remove('opencode'); fs.writeFileSync('catalog-master-table.md', s.toMarkdown())"
   ```
   Programmatic: `sheet.remove(normalizedIdOrUid); fs.writeFileSync('catalog-master-table.md', sheet.toMarkdown()+'\n')`.
4. **Verify:** `git --no-pager diff --check -- catalog-master-table.md` (no trailing whitespace), then `node helpers/md-table.js --file catalog-master-table.md --list | python3 -c "import json,sys; print(len(json.load(sys.stdin)))"` to confirm count decremented.
5. **Report:** removed `id`/`uid`/`display_name`, remaining rows, and `git diff --stat`. If the id was not found → `not-found` with closest suggestions.

## Verification

```bash
# read-before-delete
node .agents/skills/add-to-catalog/helpers/md-table.js --file catalog-master-table.md --list | python3 -c "import json,sys; d=json.load(sys.stdin); print([r['id'] for r in d if 'codebuff' in r['id']])"
# dry-run
node .agents/skills/add-to-catalog/helpers/md-table.js --file catalog-master-table.md --remove codebuff --dry-run  # conceptual — use actual flag via skill
# real
node .agents/skills/add-to-catalog/helpers/md-table.js --file catalog-master-table.md --remove codebuff
git --no-pager diff --check -- catalog-master-table.md
```
