---
name: batch-add-to-catalog
description: Batch-add AI desktop IDEs, workspace apps, or terminal coding CLIs to the catalog master table from a list of names/URLs or listicle pages. (Merged — use add-to-catalog.)
---

# Batch Add to Catalog — Merged into `add-to-catalog`

> **Deprecated wrapper — use `add-to-catalog` directly.** As of 2026-08-11, `add-to-catalog` automatically runs a batch when it receives multiple inputs. This page is kept for backwards compatibility and now delegates to `add-to-catalog`.

Batch-add AI desktop IDEs, workspace apps (e.g. OpenHands, Claude), or terminal coding CLIs to the deduplicated [catalog master table](../../../catalog-master-table.md).

> **Previously a wrapper around `add-to-catalog`.** Now the logic lives in `add-to-catalog` §0 **Auto-route single vs batch**: any call with `inputs` array, or a single `input` containing commas/newlines/multiple URLs or a scrapable listing page, is routed to `helpers/batch.js`. Prefer calling `add-to-catalog` — invoking this skill directly still works but just forwards to it.

## Overview

`add-to-catalog` handles one `input`; `batch-add-to-catalog` handles many — including indirect many via listicles. Use it when you have:
- a bare list of tool names (`["Cursor", "Windsurf"]`),
- a list of GitHub/homepage URLs,
- or a blog/awesome-list/GitHub topic page that itself contains dozens of candidate links.

The skill deduplicates against the master table *and* within the batch, and vets every candidate as a peer type before any write.

## Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `inputs` | `string[]` | yes | List of items. Each element is either (a) a tool name (`"Cursor"`), (b) a direct GitHub/homepage URL (`"https://github.com/openai/codex"`), or (c) a **listing page URL** (`"https://github.com/ai-for-developers/awesome-ai-coding-tools"`) to scrape for candidates. A plain multiline-file path also works: `["@/tmp/urls.txt"]` (one entry per line). |
| `type` | `string` | no | Override agent category for all items: `desktop-ide`, `workspace-app`, or `terminal-cli` |
| `update` | `boolean` | no | If true, update existing rows for matched IDs (default `false` → skip `already-in-catalog`) |
| `dryRun` | `boolean` | no | If true, only report what *would* be added/skipped; do not write `catalog-master-table.md` (default `false`) |
| `override` | `boolean` | no | If true, allow web UI/SaaS or cloud-agent candidates that the agent would otherwise exclude by the gating criteria (default `false`) |

**Examples:**
```json
{"inputs": ["https://github.com/openai/codex", "https://github.com/anomalyco/opencode", "Windsurf"], "update": false}
{"inputs": ["https://github.com/ai-for-developers/awesome-ai-coding-tools", "https://dev.to/soulentheo/every-ai-coding-cli-in-2026-the-complete-map-30-tools-compared-4gob"]}
{"inputs": ["@/tmp/my-list.txt"], "dryRun": true}
{"inputs": ["Cline", "https://zed.dev", "https://bolt.new"], "type": "workspace-app"}
```

## Helpers

| Helper | Path | Purpose |
|--------|------|---------|
| **URL parser** | [`../add-to-catalog/helpers/url-parser.js`](../add-to-catalog/helpers/url-parser.js) | Single-item parse `input → {id, vendor, homepage_url, github_url, …}` with `knownIds` map (`jules.google.com→jules`, `zed.dev→zed`, etc.) |
| **MD table helper** | [`../add-to-catalog/helpers/md-table.js`](../add-to-catalog/helpers/md-table.js) | `Spreadsheet` master-table upsert (must use full 16-col rows) + `list`/`find` for dedup |
| **Batch helper** | [`helpers/batch.js`](./helpers/batch.js) | Batch orchestration: expand `inputs` (incl. listicle scrape), dedup, vet, then upsert via `md-table.js`. CLI: `node helpers/batch.js --inputs /tmp/inputs.json [--type terminal-cli] [--update] [--dry-run]` |
| **Scrape helper (internal)** | `helpers/batch.js#scrapeListingPage(url)` | Fetches HTML (curl; falls back to `bun.webview` for JS-rendered SPAs), extracts candidate URLs via `github.com/<owner>/<repo>` + `homepage` domains + `npm`/`brew` manifests; returns deduped candidate `input` strings |
| **JS WebView helper** | [`helpers/scrape-webview.js`](./helpers/scrape-webview.js) | JS-rendered fetch via `Bun.WebView`: `bun helpers/scrape-webview.js "<url>"` → rendered `document.documentElement.outerHTML`. Invoked automatically by `scrapeListingPage` when `curl` yields <3 candidates and HTML looks like an SPA (`<div id="root"></div>`, `__NEXT_DATA__`). Requires `bun` ≥1.3. |

## Instructions

1. **Expand `inputs` into flat candidate `input` strings:**
   - If an entry starts with `@` → treat as file path, read lines, ignore `#` comments/blanks.
   - Else if entry matches `https?://` and fetchable HTML contains ≥3 GitHub/homepage links **or** the URL is a known awesome-list/blog (`awesome-`, `awesome-ai-`, `every-ai-coding-cli`, `/listicles/`, `/best-`) → run `scrapeListingPage(entry)`: fetch page, regex-extract all `https://github.com/<owner>/<repo>` and known homepages (`https://*.ai`, `https://*.dev`, `*.com` for vendors), return each as a separate candidate `input`.
   - Otherwise → treat entry as a direct single `input` (name or URL) → one candidate.

   ```bash
   node .agents/skills/batch-add-to-catalog/helpers/batch.js --inputs '["https://github.com/openai/codex","https://dev.to/soulentheo/every-ai-coding-cli-in-2026-the-complete-map-30-tools-compared-4gob"]' --dry-run
   ```

2. **Deduplicate** — before any fetch:
   - Load existing master IDs: `node ../add-to-catalog/helpers/md-table.js --file ../../../catalog-master-table.md --list`
   - Normalize every candidate `id` via `parseInput(input).id` (slugified). Drop any where normalized `id` already in master (unless `update=true` → mark `update`; else skip `already-in-catalog`). Also dedup within batch (first occurrence wins; later → `duplicate-in-batch`).

3. **Vet peer type** — for each remaining candidate (same rules as `add-to-catalog` §3):
   - `type` must be `Terminal CLI` / `Desktop IDE` / `Desktop IDE plugin` / `Workspace app` / `ACP Adapter` / `Library+Server` / `Desktop app`; else `not-a-peer-type`.
   - `category` must be `code`/`agent`/`host`/`library+server`.
   - README/homepage must signal AI coding (`code`/`agent`/`IDE`/`CLI`/`harness`/`ACP`/`assistant`/`autocomplete`). Fetch README (GitHub `README.md` raw) or homepage `<title>/<meta description>`; if missing and no binary/install, skip `not-a-peer-scope`. Flag borderline `needs-manual-review` rather than adding.
   - **Web UI / SaaS / cloud-agent gating.** The catalog tracks installable, locally-runnable AI coding clients (terminal CLIs, desktop IDEs, local workspace apps, ACP adapters) rather than browser-only SaaS tools or cloud-hosted coding agents. If a candidate's primary interface is a web UI with no local installable binary, or it is a cloud-only agent that runs in a hosted sandbox/IDE rather than on the user's machine, exclude with reason `excluded-web-ui-saas` or `excluded-cloud-agent`. The user may override by passing `override: true` or by confirming when asked. When `override` is not set and the gating is ambiguous, ask the user before adding.

4. **Enrich & upsert each vetted candidate** via `add-to-catalog` single-item flow:
   - `parseInput(input)` → fetch README/package for `version`/`distribution`/`description`/`license`.
   - Build **full master-table row** (never partial): `# | id | uid | display_name | aliases | binary | vendor | category | type | is_acp_client_host | is_acp_agent_server | distribution_install | version | license | project_status | popularity | homepage_url | github_url | created | updated`. New rows must receive a generated 8-character `uid`.
   - `helpers/md-table.js upsert` (merge with existing if `update`).

5. **Sync CLI surface mapping** — After the master table is written, for every vetted candidate whose master `type` is `Terminal CLI` (or `terminal_cli`), call the CLI surface sync helper for the added/updated ids:
   ```bash
   node .agents/lib/sync-cli-surface.js --ids qwen-code,codex,opencode
   ```
   This will add or update the corresponding rows in `cli-surface-mapping.md`, preserving `id`, `uid`, `command` (from `binary`), `created`, `updated`, and `project_status`. In `dryRun` mode, the sync helper is also run with `--dry-run`.

6. **Verify:**
   ```bash
   git --no-pager diff --check -- catalog-master-table.md
   node ../add-to-catalog/helpers/md-table.js --file ../../../catalog-master-table.md --list | python3 -c "import json,sys; d=json.load(sys.stdin); print(len(d))"
   ```

6. **Report** per input and per candidate: `expanded`, `added`, `updated`, `skipped` with reason (`already-in-catalog`, `duplicate-in-batch`, `not-a-peer-type`, `not-a-peer-scope`, `needs-manual-review`, `fetch-failed`). For listing-page inputs, also report `candidates-found`.

## Validation

- If a listing page yields 0 candidates, report `no-candidates-found` and do not treat as error; suggest checking page structure.
- If any candidate's README/package fetch fails (rate limit, 404), mark `fetch-failed` → keep `needsFetch:true` row with `—` for `Version`/`License` but flag for manual review; do not invent versions.
- `dryRun` must not write the master file; verify by `git diff --stat` showing no change.

## Verification (after implementation)

```bash
# Single direct batch (dry-run, should dedup against existing 90 rows)
node .agents/skills/batch-add-to-catalog/helpers/batch.js --inputs '["https://github.com/openai/codex","https://github.com/anomalyco/opencode","Windsurf"]' --dry-run

# Listicle scrape + batch
node .agents/skills/batch-add-to-catalog/helpers/batch.js --inputs '["https://github.com/ai-for-developers/awesome-ai-coding-tools"]' --dry-run

# Real write (two new peers, vet + dedup)
node .agents/skills/batch-add-to-catalog/helpers/batch.js --inputs '["https://github.com/bradAGI/awesome-cli-coding-agents","https://dev.to/soulentheo/every-ai-coding-cli-in-2026-the-complete-map-30-tools-compared-4gob"]' --dry-run
git --no-pager diff --check -- catalog-master-table.md
```
