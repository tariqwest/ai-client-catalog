---
name: edit-catalog
description: Edit/patch fields of an existing catalog entry in the AI CLI client catalog master table.
---

# Edit Catalog

Patch in place a single row in the deduplicated [catalog master table](../../../catalog-master-table.md).

> **Target:** `catalog-master-table.md` — 22-col `id | uid | display_name | aliases | vendor | category | type | is_acp_client_host | is_acp_agent_server | binary | acp_launch | headless_print | trust_bypass | distribution_install | version | license | base_url_config | popularity | created | updated | homepage_url | github_url`. This is the `U` (patch) complement to `add-to-catalog` (`upsert`); it merges rather than replaces.

## Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `id` | string | yes | Existing `id` slug to patch (e.g. `claude`, `` `opencode` ``). |
| `patch` | object | yes | Partial row fields to overlay (e.g. `{"vendor":"Anthropic","version":"2.0.31"}`). Only supplied keys are changed; all other columns are preserved. |
| `dryRun` | boolean | no | If true, only report the merged row without writing. |

**Examples:**
```json
{"id": "claude", "patch": {"version": "2.0.31", "popularity": "141k★"}}
{"id": "`warp`", "patch": {"display_name": "Warp Terminal", "type": "desktop_ide"}}
{"id": "kilo", "patch": {"vendor": "Kilo Code", "homepage_url": "https://kilo.ai"}}
```

## Helpers

| Helper | Path | Purpose |
|--------|------|---------|
| **MD table helper** | [`../add-to-catalog/helpers/md-table.js`](../add-to-catalog/helpers/md-table.js) | `Spreadsheet.fromMarkdown(md)` → `find(id)` → merge → `upsert(mergedRow)` → `toMarkdown()`. Must merge to avoid clearing columns. |
| **View helper** | [`../view-catalog/SKILL.md`](../view-catalog/SKILL.md) | Read current row before patch for review. |

## Instructions

1. **Load current row:**
   ```js
   const {Spreadsheet}=require('./.agents/skills/add-to-catalog/helpers/md-table.js');
   const sheet=Spreadsheet.fromMarkdown(fs.readFileSync('catalog-master-table.md','utf8'));
   const row=sheet.find(id.replace(/`/g,''));
   if(!row) throw `not-found: ${id}`;
   ```
2. **Merge patch:**
   ```js
   const {__raw, __line, ...rest}=row;
   const merged={...rest, ...patch, id: row.id, uid: row.uid, updated: new Date().toISOString().replace(/\.\d+Z/,'Z') };
   // preserve id/uid unless patch explicitly overrides (uid override discouraged)
   ```
   Normalize `type`/`category` to snake_case if needed; `updated` auto-bumped to now (second-accurate) unless `patch.updated` supplied.
3. **Dry-run** → report `before` vs `after` JSON and `git diff` preview, do not write.
4. **Write:**
   ```js
   sheet.upsert(merged); fs.writeFileSync('catalog-master-table.md', sheet.toMarkdown()+'\n');
   ```
   Then `git --no-pager diff --check -- catalog-master-table.md`.
5. **Report:** patched `id`/`uid`, changed keys (`patch` keys), `updated` timestamp, and `git diff --stat`.

## Verification

```bash
node .agents/skills/add-to-catalog/helpers/md-table.js --file catalog-master-table.md --list | python3 -c "import json,sys; d=json.load(sys.stdin); r=[x for x in d if x['id']=='\`claude\`']; print(json.dumps(r[0], indent=2))"
# patch then re-read
```
