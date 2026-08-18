---
name: refresh-catalog
description: Refresh and re-validate catalog entries (one, subset, or all) by re-researching version, license, popularity, URLs, and distribution — re-applies the agent's judgement and leaves as-is when valid. Update-type.
---

# Refresh Catalog

Re-research **one, a subset, or all** rows in the deduplicated [catalog master table](../../../catalog-master-table.md) and re-apply the agent's judgement — pulling new `Version`/`License`/`Popularity`/`URLs`/`Distribution` from live sources and leaving rows as-is when validation passes.

> **Merged `revalidate-catalog` + `refresh-catalog` → `refresh-catalog`.** Formerly `revalidate-catalog` handled `one|subset|all` and `refresh-catalog` handled the single-entry alias. As of 2026-08-11 they are merged under **`refresh-catalog`** (the `Update` in CRUD). `revalidate-catalog` is now a deprecated wrapper that forwards here.

## Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `id` | string | no* | Single stable `id` slug (e.g. `claude`, `` `opencode` ``). Case-insensitive, backticks optional. Alias for single-entry refresh; `ids` preferred for multi. |
| `uid` | string | no* | Single 8-char `uid` (`tj6cmpyw`). Resolves to its `id`. |
| `query` | string | no* | Free-text name/alias (e.g. `Warp Terminal`) → best-hit `id` (single). |
| `ids` | `string \| string[]` | no* | One or more `id`s (e.g. `"qwen-code"` or `["\`qwen-code\`","`cline\`"]`). Preferred for explicit sets. |
| `filter` | string | no* | Filter over existing rows: `vendor:<substr>`, `type:<substr>`, `category:code`, `license:MIT`, `popularity:*` (non-`—`), free-text over `ID`/`Display Name`/`Vendor`. Prefix `!` negates. Commas are AND. |
| `all` | boolean | no* | If `true`, refresh the entire table. |
| `fields` | string[] | no | Limit to columns to refresh (default: all `version`, `license`, `homepage_url`, `github_url`, `popularity`, `distribution_install`, `base_url_config`). |
| `dryRun` | boolean | no | If true, report drift without writing. |
| `concurrency` | number | no | Parallel fetches (default `5`, max `10`). |
| `overwrite` | boolean | no | If true, overwrite even when values equal but citation changed (bumps `updated`). |

\* One of `id`/`uid`/`query`/`ids`/`filter`/`all` required. Single-entry `id`/`uid`/`query` are sugar for `ids` with one element.

**Examples (single — human-friendly):**
```json
{"id": "claude"}
{"uid": "tj6cmpyw", "fields": ["version","popularity"], "dryRun": true}
{"query": "Warp Terminal"}
```
**Examples (batch — same skill after merge):**
```json
{"ids": ["`qwen-code`", "`kimi-code`"]}
{"filter": "vendor:Anthropic"}
{"all": true, "fields": ["version","popularity"], "dryRun": true}
{"filter": "type:Workspace app", "fields": ["homepage_url","github_url"]}
```

## Helpers

| Helper | Path | Purpose |
|--------|------|---------|
| **Revalidate helper** | [`../revalidate-catalog/helpers/revalidate.js`](../revalidate-catalog/helpers/revalidate.js) | Canonical engine (still at `revalidate-catalog` path for backward compat): `selectRows({ids,filter,all})`, `revalidateRow(row,{fields,concurrency})`: `GET /releases/latest → version`, `GET /license → license`, `stargazers_count → popularity`, `HEAD homepage/github_url`, `npm`/`cargo`/`pypi`. Also available via `refresh-catalog` alias path if mirrored. |
| **MD table helper** | [`../add-to-catalog/helpers/md-table.js`](../add-to-catalog/helpers/md-table.js) | `Spreadsheet.find` / `upsert` (full 22-col merge). |
| **View helper** | [`../view-catalog/SKILL.md`](../view-catalog/SKILL.md) | Pre-read current row(s) for context. |

## Instructions

1. **Resolve scope** (merged — single `id`/`uid`/`query` are sugar for one `ids` entry):
   ```js
   // sugar: id/uid/query → ids
   let idsParam = ids;
   if (!idsParam) {
     const {Spreadsheet}=require('./.agents/skills/add-to-catalog/helpers/md-table.js');
     const sheet=Spreadsheet.fromMarkdown(fs.readFileSync('catalog-master-table.md','utf8'));
     let row=null;
     if (uid) row = sheet.list().find(r=>r.uid.toLowerCase()===uid.toLowerCase());
     else if (id) row = sheet.find(id.replace(/`/g,''));
     else if (query) row = sheet.list().find(r=> (r.display_name+' '+r.aliases).toLowerCase().includes(query.toLowerCase()));
     if(!row && (id||uid||query)) throw `not-found: ${id||uid||query}`;
     if(row) idsParam = [row.id.replace(/`/g,'')];
   }
   // Now idsParam/filter/all/fields/dryRun/concurrency/overwrite flow is exactly revalidate-catalog §1-4
   ```
   Then:
   ```bash
   node .agents/skills/revalidate-catalog/helpers/revalidate.js --ids '["<targetId>"]' [--fields version,popularity] [--dry-run] [--concurrency 5]
   node .agents/skills/revalidate-catalog/helpers/revalidate.js --filter "vendor:Anthropic" --dry-run
   node .agents/skills/revalidate-catalog/helpers/revalidate.js --all --fields version,popularity --dry-run
   ```
   Or programmatically: `selectRows({ids:idsParam, filter, all})` → `revalidateRow(row,{fields})` / `revalidateBatch(...)`.

2. **Per-row dynamic research** (same as former `revalidate-catalog`):
   - `version`: `GET /releases/latest` → `tag_name` (strip leading `v` for table)
   - `license`: `GET /license` → `spdx_id`
   - `popularity`: `stargazers_count → 12.3k★`
   - `homepage_url`/`github_url`: `HEAD` (3 redirects, 5s)
   - `distribution_install`/`base_url_config`: re-scrape README/registry

3. **Decision per field:**
   - `stored === fetched` (or `fetched null/404`) → `up-to-date` / `fetch-failed`, keep stored, **leave as-is**.
   - `stored !== fetched` → `stale` (`stored→fetched` + citation) → `upsert` merged full 22-col row + bump `updated` to now.

4. **Report:** For scope `N` rows: `up-to-date`, `stale` (per-field diffs + citations), `broken-url` (HTTP code), `fetch-failed`/`rate-limited`, `needs-manual-review`. In `dryRun` show diff preview for first 3 stale rows; otherwise `git diff --check` clean and `updated` bumped only if stale.

## Verification

```bash
# single (human-friendly sugar)
node .agents/skills/revalidate-catalog/helpers/revalidate.js --ids '["claude"]' --dry-run
# via query sugar (refresh-catalog resolver)
python3 -c "import json; print({'id':'claude'})" # → internally ids=['claude']
# subset / all (merged)
node .agents/skills/revalidate-catalog/helpers/revalidate.js --filter "vendor:Anthropic" --dry-run
node .agents/skills/revalidate-catalog/helpers/revalidate.js --all --fields version,popularity --dry-run
# list check
node .agents/skills/add-to-catalog/helpers/md-table.js --file catalog-master-table.md --list | python3 -c "import json,sys; d=json.load(sys.stdin); print([r['id'] for r in d][:3])"
```

> **Relation:** `refresh-catalog` now covers `one` (via `id`/`uid`/`query` sugar) **and** `subset`/`all` (via `ids`/`filter`/`all`) — the merged update-type skill. `revalidate-catalog` is a deprecated wrapper that forwards here. For manual patch without research, use `edit-catalog`.
