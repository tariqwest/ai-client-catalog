---
name: add-column-to-catalog
description: Add an additional column to the catalog master table and intelligently populate it for every row.
---

# Add Column to Catalog

Add a new differentiating column to the deduplicated [catalog master table](../../../catalog-master-table.md) and intelligently populate it for all 90 rows via web/GitHub/docs research.

> **DDL + backfill in one skill.** Use when the table needs a new dimension — e.g. `Pricing`, `Funding`, `Last Updated`, `Model Provider`, `Context Window`, `Offline Capable`, `ACP Support Detail` — without hand-editing markdown. The skill alters the pipe-table header/legend via the md-spreadsheet helper, then researches and fills each cell.

## Overview

The master table is a 16-col spreadsheet (`ID | Display Name | Vendor | … | github_url`). Adding a column by hand is error-prone (mis-aligned pipes, `| bash` inside code spans, legend drift). This skill does it reliably and then backfills.

Idempotent: if `column_name` already exists (case-insensitive, normalized), it only (re-)populates; it does not duplicate the header.

## Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `column_name` | `string` | yes | New column header as it should appear in markdown (e.g. `Pricing`, `Funding`, `Context Window`, `Last Updated`, `Supported Models`). Will be normalized for the helper (`pricing`, `funding`, `last_updated`, …). Use `Title Case` or `snake_case`; the skill preserves your casing in the header. |
| `description` | `string` | yes | One-line legend for the **Columns** table (e.g. `Pricing — Free / Freemium / Paid / Enterprise per public pricing page at population time`). |
| `position` | `string` | no | Where to insert. Either `"after:<ExistingHeader>"` (e.g. `after:License`), `"before:<Header>"`, or `"last"` (before `homepage_url`/`github_url` by default). Default: `before:homepage_url`. |
| `populate` | `boolean` | no | If `false`, only add the empty column (`"—"` per row) and skip research (default `true`). |
| `overwrite` | `boolean` | no | If true and column already exists, re-research and overwrite all cells (default `false` → only fill `"—"` / empty cells). |
| `dryRun` | `boolean` | no | If true, report plan and research without writing the file (default `false`). |

**Examples:**
```json
{"column_name": "Pricing", "description": "Pricing — Free / Freemium / Paid / $X per seat per public pricing page at pop. time"}
{"column_name": "Funding", "description": "Funding — disclosed funding / valuation at pop. time (e.g. $12M, $977M val) or —", "position": "after:Popularity"}
{"column_name": "Last Updated", "description": "Last Updated — ISO date of latest GH release or docs publish at revalidation time", "overwrite": true}
{"column_name": "Context Window", "description": "Context Window — max tokens (e.g. 1M) per vendor docs", "populate": true, "dryRun": true}
```

## Helpers

| Helper | Path | Purpose |
|--------|------|---------|
| **MD table helper** | [`../add-to-catalog/helpers/md-table.js`](../add-to-catalog/helpers/md-table.js) | Spreadsheet primitive: `splitRow` (code-span aware), `isAlignmentRow`, `parseTableLines`, `Spreadsheet.fromMarkdown → addColumn → upsert → toMarkdown`. Handles `\|` and `` `...|...` `` correctly. |
| **Column helper** | [`helpers/column.js`](./helpers/column.js) | DDL + backfill: `addColumn(md, {name, description, position}) → md` (updates header, separator, legend, and pads every data row); `populateColumn(md, {column, overwrite, fetcher}) → md` (research per row). Also exports `KNOWN_COLUMN_FETCHERS` for common columns (`pricing`, `funding`, `last_updated`, `context_window`, `offline_capable`). CLI below. |
| **URL parser** | [`../add-to-catalog/helpers/url-parser.js`](../add-to-catalog/helpers/url-parser.js) | Reused for per-row `homepage_url`/`github_url` → vendor/page fetch. |

## Instructions

1. **Load and inspect current schema:**
   ```bash
   node ../add-to-catalog/helpers/md-table.js --file ../../../catalog-master-table.md --list | python3 -c "import json; print([k for k in json.load(open('/dev/stdin'))[0].keys()])"
   # also: grep -n "^\| ID \|" catalog-master-table.md
   ```
   Normalize `column_name` via `normalizeKey` (`"Context Window" → "context_window"`). If column already exists and `overwrite=false` → only plan to fill gaps.

2. **DDL — add column reliably (no regex):**
   ```bash
   node .agents/skills/add-column-to-catalog/helpers/column.js --file catalog-master-table.md --add-column '{"name":"Pricing","description":"Pricing — Free / Freemium / Paid per public pricing page","position":"after:License"}' [--dry-run]
   ```
   What it does:
   - Finds the master data table via `TABLE_HEADING_RE` (`homepage_url`+`github_url`) and the `**Columns**` legend table; inserts header cell at `position`, pads separator (`---`), appends legend row `| **<Name>** | <description> |`.
   - Pads every data row with `"—"` in the new column position, preserving `| \| |` and `` `...|...` `` via `splitRow`.

3. **Backfill — intelligently populate each cell:**
   - For each row (`ID` → `homepage_url`/`github_url`/`Vendor`), dispatch a research fetcher based on `column_name`:
     - **Known fetchers** (`KNOWN_COLUMN_FETCHERS`): `pricing` → scrape `homepage_url` pricing page (`/pricing`, `/plans`, docs) for `Free`/`Freemium`/`Paid`/`Enterprise`; `funding` → Crunchbase/press + vendor site (e.g. StackBlitz $11.7B, Augment $227M); `last_updated` → `GET /repos/:owner/:repo/releases/latest` or `npm view <pkg> time`; `context_window` → docs/model card; `offline_capable` → docs self-hosted/VPC/on-prem.
     - **Generic:** derive from `homepage_url`/`github_url` fetch: pull `<title>`, README first paragraph, `package.json`/`Cargo.toml`/`LICENSE`, and LLM-infer a concise cell value (prefer authoritative: pricing page > GitHub > vendor blog). If source is missing or contradictory, write `"—"` and flag `needs-manual-review` for that row — never hallucinate.
   - Enforce markdown safety: escape `|` inside cells as `\|` or wrap in `` `...` ``; keep cell short (≤ 40 chars for pricing/funding; ≤ 20 for license-style).
   - Incremental: `node helpers/column.js --file catalog-master-table.md --populate-column pricing --overwrite=false` (only fills `"—"`).

   ```bash
   node .agents/skills/add-column-to-catalog/helpers/column.js --file catalog-master-table.md --populate-column pricing
   node .agents/skills/add-column-to-catalog/helpers/column.js --file catalog-master-table.md --populate-column pricing --overwrite  # re-research all
   ```

4. **Verify + report:**
   ```bash
   git --no-pager diff --check -- catalog-master-table.md
   node ../add-to-catalog/helpers/md-table.js --file ../../../catalog-master-table.md --list | python3 -c "import json; d=json.load(open('/dev/stdin')); print('rows',len(d)); print([r['pricing'] for r in d[:3]])"
   ```
   Report: `column_added` (bool), `position`, `rows_populated` / `rows_skipped` / `needs-manual-review` (with `ID` list), and sample values (first 5 rows). Include `homepage_url` → cell citation for at least 3 rows.

## Validation

- `column_name` may not clash with existing normalized keys (`id`, `display_name`, `vendor`, …) unless `overwrite` intent; sanitize to `s/^[^A-Za-z]+//`, no `|`.
- Never invent values: if fetch fails (rate limit, 404), write `"—"` and report `fetch-failed` per `ID`; do not retry silently.
- `dryRun` must not mutate the file; `git diff --stat` should show no change.

## Verification (after implementation)

```bash
# Plan only (no write)
node .agents/skills/add-column-to-catalog/helpers/column.js --file catalog-master-table.md --add-column '{"name":"Pricing","description":"Pricing — test","position":"after:License"}' --dry-run

# Add + populate (real)
node .agents/skills/add-column-to-catalog/helpers/column.js --file catalog-master-table.md --add-column '{"name":"Offline Capable","description":"Offline Capable — Self-hosted / VPC / on-prem per docs or —"}'
node .agents/skills/add-column-to-catalog/helpers/column.js --file catalog-master-table.md --populate-column "Offline Capable"
git --no-pager diff --check -- catalog-master-table.md
```
