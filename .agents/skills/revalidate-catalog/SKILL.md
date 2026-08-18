---
name: revalidate-catalog
description: Re-research and re-validate one, a subset, or all rows in the catalog master table (versions, licenses, URLs, popularity, distribution). (Merged — use refresh-catalog.)
---

# Revalidate Catalog — Merged into `refresh-catalog`

> **Deprecated wrapper — use `refresh-catalog` directly.** As of 2026-08-11, `refresh-catalog` handles `one` (via `id`/`uid`/`query` sugar) **and** `subset`/`all` (via `ids`/`filter`/`all`) — the merged update-type skill. This page is kept for backward compatibility and forwards to `refresh-catalog`.

Intelligently re-research and re-validate **one row, a filtered subset, or the whole** [catalog master table](../../../catalog-master-table.md) — refreshing `Version`/`License`/`Distribution`/`homepage_url`/`github_url`/`Popularity`/`BaseUrl/Config`, verifying every URL, and flagging drift. **Prefer `refresh-catalog`.**

> **Merge note:** `revalidate-catalog` + `refresh-catalog` → `refresh-catalog`. The canonical engine remains at `revalidate-catalog/helpers/revalidate.js` for backward compat, but the skill entry point is now `refresh-catalog`.

## Overview

- **Scope selection:** a single `ID` (`"qwen-code"`), an explicit list, a filter expression (`vendor:Anthropic`, `type:Terminal CLI`, `category:host`), or the whole table (`all:true`).
- **Per-row dynamic research:** for each selected row, re-fetch `github_url` (`/releases/latest` → `Version`; `/license` → `License`; stars → `Popularity`), `homepage_url` (status + `<title>` + pricing), `npm`/`cargo`/`pypi` registries, and vendor docs (`BaseUrl/Config`). Compare to the stored cell and decide `up-to-date` / `stale` / `broken` / `needs-manual-review`.
- **Writes:** by default updates the master file in place (full 16-col `upsert` via md-spreadsheet helper). Supports `dryRun` to only report.

## Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `ids` | `string \| string[]` | **one of** `ids`/`filter`/`all` | Single ID, list of IDs, or backticked IDs (e.g. `"qwen-code"` or `["\`qwen-code\`","`cline`"]`). Normalized like master `ID` (slug, lowercased, without backticks). |
| `filter` | `string` | **one of** `ids`/`filter`/`all` | Filter expression over existing rows: `vendor:<substr>` (e.g. `vendor:Anthropic`), `type:<substr>` (e.g. `type:Workspace app`), `category:code`, `license:MIT`, `popularity:*` (non-`—`), or free-text substring over `ID`/`Display Name`/`Vendor`. Prefix with `!` to negate. Multiple clauses comma-separated are AND (e.g. `vendor:Alibaba,category:code`). |
| `all` | `boolean` | **one of** `ids`/`filter`/`all` | If `true`, revalidate the entire table (currently 90 rows). |
| `fields` | `string[]` | no | Limit to specific columns to refresh (default: all refreshable: `version`, `license`, `homepage_url`, `github_url`, `popularity`, `distribution_install`, `baseurl_config`). Example: `["version","popularity"]`. |
| `dryRun` | `boolean` | no | If true, only report drift without writing `catalog-master-table.md` (default `false`). |
| `concurrency` | `number` | no | Parallel fetches (default `5`, max `10`; respects GH rate limits, backs off on 429/403). |
| `overwrite` | `boolean` | no | If true, overwrite even when new value equals old but source citation changed (forces timestamp bump). Default `false`. |

**Examples:**
```json
{"ids": "qwen-code"}
{"ids": ["`qwen-code`", "`kimi-code`", "`bolt-diy`"]}
{"filter": "vendor:Anthropic"}
{"filter": "type:Workspace app"}
{"all": true, "fields": ["version","popularity"], "dryRun": true}
{"filter": "license:MIT,category:code", "dryRun": false}
```

## Helpers

| Helper | Path | Purpose |
|--------|------|---------|
| **MD table helper** | [`../add-to-catalog/helpers/md-table.js`](../add-to-catalog/helpers/md-table.js) | `Spreadsheet.find` / `list` / `upsert` with `splitRow` code-span aware; header/legend aware. |
| **URL parser** | [`../add-to-catalog/helpers/url-parser.js`](../add-to-catalog/helpers/url-parser.js) | Reuse `parseGithubUrl`/`inferVendor` for URL sanity. |
| **Revalidate helper** | [`helpers/revalidate.js`](./helpers/revalidate.js) | Core: `selectRows({ids,filter,all})`, `revalidateRow(row, {fields})` (GH releases/license/stars + HEAD `homepage_url`/`github_url` + npm/cargo/pypi + popularity), `revalidateBatch(...)`. CLI: `node helpers/revalidate.js --ids '["qwen-code"]' --dry-run` / `--filter "vendor:Alibaba" --dry-run` / `--all --fields version,popularity --dry-run`. |

## Instructions

1. **Select scope:**
   ```bash
   node .agents/skills/revalidate-catalog/helpers/revalidate.js --ids '["qwen-code"]' --dry-run
   node .agents/skills/revalidate-catalog/helpers/revalidate.js --filter "vendor:Anthropic" --dry-run
   node .agents/skills/revalidate-catalog/helpers/revalidate.js --all --fields version,popularity --dry-run
   ```
   Internally: `Spreadsheet.list()` → filter by normalized `id` / `vendor`/`type`/`category`/`license` substrings (case-insensitive). Empty selection → report `no-rows-matched` (not error).

2. **Re-research per selected row (dynamic, fetcher per `fields`):**
   - **`version`:** `GET https://api.github.com/repos/<owner>/<repo>/releases/latest` (`tag_name`), fallback `npm view <pkg> version` / `cargo` / `pypi`. Strip leading `v` for table; keep original tag for citation. If repo is closed/no GH (`github_url: —`), leave `—`.
   - **`license`:** `GET .../license` → `spdx_id` + `GET .../contents/LICENSE` raw head (`Apache-2.0`/`MIT`/etc.). Compare to stored `License`; if `Closed` vs `MIT` mismatch, prefer GH and flag `license-drift`.
   - **`popularity`:** GH `stargazers_count` → `12.3k★` (or `3.96M installs` for marketplace: scrape `homepage_url` marketplace badge). Leave `—` / enterprise strings untouched if not GH.
   - **`homepage_url` / `github_url`:** `HEAD` request (follow 3 redirects, 5s timeout). `2xx` → `ok`; `3xx` → update to `Location` if stable; `4xx/5xx`/timeout → `broken` (keep old value but report `broken-url`). For `qoder`/`lingma` style rebrands, detect `<meta http-equiv="refresh">` or title change and update `Display Name` + `homepage_url`.
   - **`distribution_install` / `baseurl_config`:** re-scrape README/registry for `npm i -g` / `brew` / `cargo` strings if `fields` includes them.
   - Rate-limit: on `429`/`403 rate limit`, backoff `60s` and retry once; if still limited, mark `rate-limited` and leave cell as-is.

3. **Decide per-row, per-field:** Compare `stored → fetched`. If `fetched` is `null`/`—`/fetch-failed → keep stored, mark `fetch-failed`. If `stored === fetched` → `up-to-date`. If differs → mark `stale` with `stored→fetched` and citation (`GH releases/latest`, `npm view`, `HEAD`).

4. **Write (unless `dryRun`):** For each `stale` row, build **full 16-col row** (merge existing `__raw` row + refreshed fields; never partial) and `sheet.upsert(full)`. Write once per batch:
   ```bash
   node .agents/skills/revalidate-catalog/helpers/revalidate.js --ids '["qwen-code","kimi-code"]'
   node .agents/skills/revalidate-catalog/helpers/revalidate.js --filter "vendor:Mistral" --fields version,popularity --dry-run
   ```
   Verify:
   ```bash
   git --no-pager diff --check -- catalog-master-table.md
   node ../add-to-catalog/helpers/md-table.js --file ../../../catalog-master-table.md --list | python3 -c "import json; print(len(json.load(open('/dev/stdin'))))"
   ```

5. **Report:** For scope `N` rows: `up-to-date` count, `stale` (with per-field `stored→fetched` + citation), `broken-url` (with HTTP code), `fetch-failed`/`rate-limited`, `needs-manual-review` (rebrand, license drift). In `dryRun`, show diff preview for first 3 stale rows. Always include `homepage_url`/`github_url` reachability summary.

## Validation

- `ids`/`filter`/`all` are mutually exclusive; at least one required. Unknown `ids` → `not-found` skip (not error).
- Never invent `version`/`popularity`: if fetch returns 404/empty, keep `"—"` and mark `fetch-failed`.
- `dryRun` must not mutate; `git diff --stat` should show no change.
- GH API must be called with `User-Agent` + optional `GITHUB_TOKEN` env for higher rate limit; without token, gracefully degrade on 429.

## Verification (after implementation)

```bash
# Single row dry-run (Qwen)
node .agents/skills/revalidate-catalog/helpers/revalidate.js --ids '["qwen-code"]' --dry-run

# Subset by filter (all Alibaba/Qwen + Xiaomi)
node .agents/skills/revalidate-catalog/helpers/revalidate.js --filter "vendor:Alibaba" --dry-run
node .agents/skills/revalidate-catalog/helpers/revalidate.js --filter "type:Workspace app" --fields homepage_url,github_url --dry-run

# Whole table, version+popularity only, dry-run (rate-limit aware)
node .agents/skills/revalidate-catalog/helpers/revalidate.js --all --fields version,popularity --dry-run

# Real write for one row
node .agents/skills/revalidate-catalog/helpers/revalidate.js --ids '["codex"]' --fields version
git --no-pager diff --check -- catalog-master-table.md
```
