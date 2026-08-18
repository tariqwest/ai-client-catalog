---
name: list-catalog
description: List, search, and filter entries in the AI CLI client catalog master table.
---

# List Catalog

List and search the deduplicated [catalog master table](../../../catalog-master-table.md).

> **Target:** `catalog-master-table.md` — 22-col `id | uid | display_name | aliases | vendor | category | type | is_acp_client_host | is_acp_agent_server | binary | acp_launch | headless_print | trust_bypass | distribution_install | version | license | base_url_config | popularity | created | updated | homepage_url | github_url`. This skill is read-only (the `R`/search part of CRUD). For writing see `add-to-catalog` / `remove-from-catalog`.

## Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `query` | string | no | Free-text filter (matches `id`, `display_name`, `aliases`, `vendor`, `type`). Case-insensitive substring. Omit to list all. |
| `type` | string | no | Filter by `type` slug: `terminal_cli` | `desktop_ide` | `desktop_ide_extension` | `desktop_workspace` | `desktop_chat` | `agent_orchestrator` | `agent_harness` | `cloud_workspace` etc. |
| `vendor` | string | no | Filter by `vendor` (e.g. `Anthropic`, `Google`, `AWS`). |
| `category` | string | no | Filter by `category`: `code` | `agent` | `host` | `library+server`. |
| `limit` | number | no | Max rows to return (default `50`, max `200`). |
| `sort` | string | no | Sort key: `id` | `popularity` | `created` | `updated` | `vendor` (default `id` asc). |
| `format` | string | no | Output shape: `table` (default, markdown rows) | `json`. |

**Examples:**
```json
{"query": "claude"}
{"type": "terminal_cli", "limit": 20}
{"vendor": "Google", "sort": "popularity"}
{"query": "opencode", "format": "json"}
{"category": "host", "type": "desktop_workspace"}
```

## Helpers

| Helper | Path | Purpose |
|--------|------|---------|
| **MD table helper** | [`../add-to-catalog/helpers/md-table.js`](../add-to-catalog/helpers/md-table.js) | `Spreadsheet.fromMarkdown(md)` → `list()` → filter/sort in JS. No regex. |

## Instructions

1. **Load the table** (read-only):
   ```js
   const {Spreadsheet}=require('./.agents/skills/add-to-catalog/helpers/md-table.js');
   const sheet=Spreadsheet.fromMarkdown(fs.readFileSync('catalog-master-table.md','utf8'));
   let rows=sheet.list(); // each row is {id, uid, display_name, ...}
   ```
   Or CLI:
   ```bash
   node .agents/skills/add-to-catalog/helpers/md-table.js --file catalog-master-table.md --list | python3 -m json.tool
   ```
2. **Filter:**
   - `query` → `rows.filter(r=> [r.id,r.display_name,r.aliases,r.vendor,r.type].join(' ').toLowerCase().includes(query.toLowerCase()))`
   - `type` → exact `r.type===type` (also accept `r.type.replace(/[^a-z0-9_]/g,'').toLowerCase()` normalization for backticked proposals)
   - `vendor` / `category` similarly.
3. **Sort + limit:** `rows.sort` by `sort` key; then `slice(0, limit)`.
4. **Report:** For `format: table` render a compact markdown summary (`id | display_name | vendor | type | version | popularity`); for `json` return full 22-col rows. Always report `total matched` vs `returned`, and the active filters.
5. Do not write.

## Verification

```bash
# all
node .agents/skills/add-to-catalog/helpers/md-table.js --file catalog-master-table.md --list | python3 -c "import json,sys; d=json.load(sys.stdin); print(len(d))"
# filtered
node .agents/skills/add-to-catalog/helpers/md-table.js --file catalog-master-table.md --list | python3 -c "import json,sys; d=json.load(sys.stdin); print([r['id'] for r in d if r['type']=='terminal_cli'][:5])"
```
