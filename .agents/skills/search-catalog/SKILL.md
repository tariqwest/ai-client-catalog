---
name: search-catalog
description: Search the AI CLI client catalog master table by free-text query (alias of list-catalog for discoverability).
---

# Search Catalog

Alias of [`list-catalog`](../list-catalog/SKILL.md) kept for discoverability.

> **Prefer `list-catalog`.** This skill forwards to `list-catalog` — use that for filters, limits, and sorting. Kept so `search` / `find` invocations work naturally.

## Parameters

Same as `list-catalog`:

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `query` | string | yes | Free-text search (matches `id`, `display_name`, `aliases`, `vendor`, `type`). |
| `type` | string | no | Filter by `type` slug. |
| `vendor` | string | no | Filter by `vendor`. |
| `category` | string | no | Filter by `category`. |
| `limit` | number | no | Max rows (default `20`). |
| `format` | string | no | `table` | `json`. |

**Example:** `{"query": "Warp Terminal"}` → delegates to `list-catalog {query, limit:20, format:"table"}`.

## Helpers

`../add-to-catalog/helpers/md-table.js` via `list-catalog`.

## Instructions

1. Forward to `list-catalog` with the same parameters (set `limit: 20` default for search).
2. Report as `list-catalog` does.
