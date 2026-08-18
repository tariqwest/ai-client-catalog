---
name: view-catalog
description: View a single catalog entry from the AI CLI client catalog master table by id, uid, or name.
---

# View Catalog

View a single entry from the deduplicated [catalog master table](../../../catalog-master-table.md).

> **Target:** `catalog-master-table.md` — 22-col `id | uid | display_name | aliases | vendor | category | type | is_acp_client_host | is_acp_agent_server | binary | acp_launch | headless_print | trust_bypass | distribution_install | version | license | base_url_config | popularity | created | updated | homepage_url | github_url`. This skill reads one row; it never writes.

## Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `id` | string | no* | Stable slug `id` (e.g. `claude`, `opencode`, `kilo`). Backticks optional. *Required if `uid`/`query` not set. |
| `uid` | string | no* | 8-char case-agnostic `uid` (`A-Z0-9`, lowercased store, e.g. `tj6cmpyw`). |
| `query` | string | no* | Free-text name/alias search (e.g. `Claude Code`, `Warp Terminal`). Matches `display_name` or `aliases` case-insensitive; returns best hit. |

\* One of `id`/`uid`/`query` required.

**Examples:**
```json
{"id": "claude"}
{"uid": "tj6cmpyw"}
{"query": "Warp Terminal"}
{"id": "`opencode`"}
```

## Helpers

| Helper | Path | Purpose |
|--------|------|---------|
| **MD table helper** | [`../add-to-catalog/helpers/md-table.js`](../add-to-catalog/helpers/md-table.js) | `Spreadsheet.fromMarkdown(md)` → `find(id)` / `list()` → `sheet.list().find(r=>...)`. No regex edits. |

## Instructions

1. **Load the master table** (read-only):
   ```bash
   node .agents/skills/add-to-catalog/helpers/md-table.js --file catalog-master-table.md --list | python3 -m json.tool | head -n 100
   # or programmatic:
   const {Spreadsheet}=require('./.agents/skills/add-to-catalog/helpers/md-table.js');
   const sheet=Spreadsheet.fromMarkdown(fs.readFileSync('catalog-master-table.md','utf8'));
   ```
2. **Find one row:**
   - `id` → `sheet.find(id.replace(/`/g,''))` (normalized: trim, lowercase, strip backticks).
   - `uid` → `sheet.list().find(r=>r.uid.toLowerCase()===uid.toLowerCase())`.
   - `query` → `sheet.list().find(r=> (r.display_name+' '+r.aliases).toLowerCase().includes(query.toLowerCase()))` (best hit; if multiple, return top match and note alternatives).
3. **Report** the full 22-col row as JSON + a short human summary (`Display Name — Vendor — Type — Version — Popularity — homepage/github`). If not found → `not-found` with closest suggestions (`ids.filter(id=>id.includes(query))`).
4. Do not write. This skill is **read-only** (the `R` in CRUD; create/update lives in `add-to-catalog`).

## Verification

```bash
node .agents/skills/add-to-catalog/helpers/md-table.js --file catalog-master-table.md --list | python3 -c "import json,sys; d=json.load(sys.stdin); print([r['id'] for r in d][:5])"
node .agents/skills/add-to-catalog/helpers/md-table.js --file catalog-master-table.md --list | python3 -c "import json,sys; d=json.load(sys.stdin); r=[x for x in d if x['id']=='\`claude\`']; print(json.dumps(r[0], indent=2))"
```
