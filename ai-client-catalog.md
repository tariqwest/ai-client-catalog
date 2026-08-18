# AI Client Catalog — Ecosystem Reference

> **Captured:** 2026-08-08 · **Rewritten:** 2026-08-11 · **Master table:** [`catalog-master-table.md`](./catalog-master-table.md) (90 deduplicated IDs)  
> **Scope:** AI-related projects under `~/Developer` + external peers (major tech, EU labs, high-momentum startups) that expose **AI IDEs, desktop clients, terminal CLIs, or agents/harnesses** for coding.  
> **Legacy backup:** `backups/ai-cli-client-catalog.md.bak.2026-08-10` (1256-line original, 16 sections). This rewrite preserves all still-relevant content not covered by the master table and reorganizes it under the taxonomy below.  
> **Source of truth for tool list:** `catalog-master-table.md` (16 cols: `ID | Display Name | Vendor | Category | Type | Binary | ACP launch | Headless/Print | Trust/Bypass | Distribution/Install | Version | License | BaseUrl/Config | Popularity | homepage_url | github_url`). This document is the **narrative companion** — layers, configs, protocols, templates.

---

## 1. Ecosystem Overview

**Purpose:** Ready reference when building something that talks to, wraps, or configures AI coding tools — what exists, how layers relate, and which seams/APIs each project exposes.

**Scope now covers:** Built-in/catalog CLIs, ACP adapters, OpenAI-compatible gateways, libraries, *and* config generators for coding agents — plus external peers from major tech (OpenAI, Anthropic, Microsoft/GitHub, Google, AWS, Apple, JetBrains, Sourcegraph, Mistral, Tencent, Xiaomi, Baidu, Zhipu, etc.) and high-momentum startups (Cursor/AnySphere, Augment, Tabnine, Supermaven, Replit, StackBlitz/Bolt, Lovable, Vercel/v0).

### 1.1 Mental model (layers)

```text
IDE / OpenAI SDK / curl
        │
        ▼
┌───────────────────┐     ┌────────────────────┐
│ OpenAI HTTP /v1/* │     │ ACP host (stdio)   │  Zed, VS Code ACP, Devin Desktop, …
│ gateways          │     │ JSON-RPC NDJSON    │
└─────────┬─────────┘     └──────────┬─────────┘
          │                          │
          ▼                          ▼
┌───────────────────┐     ┌────────────────────┐
│ prompt-to-api     │     │ *-acp adapters     │  oz-acp, fm-acp, agy-acp, …
│ acp-to-api        │     │ acp-to-api (also)  │
│ fm-wrap server    │     └──────────┬─────────┘
│ acp-router/LiteLLM│                │
└─────────┬─────────┘                │
          │                          │
          └────────────┬─────────────┘
                       ▼
            ┌──────────────────────┐
            │ Vendor / platform CLI│  claude, codex, oz, fm, agy, …
            │ (print mode or ACP)  │
            └──────────────────────┘
                       ▲
            ┌──────────┴───────────┐
            │ promptpipe (ppipe)   │  Unix pipe → same headless mappings
            └──────────────────────┘

Config / packaging side-car:
  config-models, config-mcps, polyglot-plugin
```

**Two primary transports:**

| Transport | Shape | Best for |
| --- | --- | --- |
| **Print / one-shot CLI** | Spawn process per prompt (`claude -p`, `codex exec`, …) | Simple completions, pipes, CI, gateways without session state |
| **ACP stdio** | Long-lived agent, JSON-RPC over stdin/stdout | Multi-turn, tools, host UI, session resume |

**Sibling gateways:**

| Project | Port (default) | Model id prefix | Backend |
| --- | --- | --- | --- |
| `acp-to-api` | 8787 | `acp-` | ACP sessions |
| `prompt-to-api` | 8788 | `prompt-` | One-shot CLI per request |
| `fm-wrap` server | 8000 (example) | native `pcc` / `system` + `/v1` | Apple `fm` |
| `acp-router` | LiteLLM default / `PORT` | e.g. `acp-kimi` | LiteLLM → ACP |

### 1.2 What lives where (project index)

| Path | Kind | Role |
| --- | --- | --- |
| `~/Developer/promptpipe` | CLI | Normalize headless invoke of many coding CLIs (`ppipe` / `pp` / `promptpipe`) |
| `~/Developer/prompt-to-api` | HTTP gateway | OpenAI `/v1` → promptpipe-style one-shot CLIs |
| `~/Developer/acp-to-api` | HTTP gateway | OpenAI `/v1` → ACP stdio agents |
| `~/Developer/acp-router` | LiteLLM provider | OpenAI-style via LiteLLM custom `acp` provider (Kimi-first sample) |
| `~/Developer/oz-acp` | ACP adapter | Warp `oz` ↔ ACP hosts |
| `~/Developer/fm-acp` | ACP adapter | Apple Foundation Models (`fm serve` / fallbacks) ↔ ACP |
| `~/Developer/fm-wrap` | **Library + server** | TS API + Hono `/fm/*` and `/v1/*` over `fm` (on-device + PCC) |
| `~/Developer/antigravity-acp` | ACP adapter | Google Antigravity `agy` (Node; bins `agy-acp`, `antigravity-acp`) |
| `~/Developer/agy-acp` | ACP adapter | Same domain in **Rust** (parallel) |
| `~/Developer/agentbridge` | Edge | Local MITM / hosts edge toward remote **OmniRoute**; substantial `src/` (~2.4k LOC) |
| `~/Developer/omniroute` | Checkout + Wiki | Remote router peer; **ACP (14 agents)** + **CLI-Tools catalog (19+6+MITM — §3.5)** |
| `~/Developer/config-clis/packages/config-models` | CLI | Pull OpenAI-compatible model lists into vendor configs |
| `~/Developer/config-clis/packages/config-mcps` | CLI | Register MCP servers; generate client config fragments |
| `~/Developer/polyglot-plugin` | Spec + skills | Portable agent skill/plugin layout across Cursor/Claude/etc. |
| `~/Developer/harness-plugins/*` | Plugin packs | Third-party skill/template bundles |
| `~/Developer/bin` | Symlinks | `pp`, `ppipe`, `promptpipe` → promptpipe bins |

Not primary catalogs (skipped): `agentic-pm` (minimal), harness plugin *content* (skills only).

**Dedupe note:** Aliases collapsed (`oc`→`opencode`, `claude-code`→`claude`, `antigravity`→`agy`, `shellgpt`→`sgpt`, `cursor`/`cursor-cli`→`cursor`, `qwen`/`qwen-code`→`qwen-code`, `deepseek-tui`/`codewhale`→`codewhale`, `hermes`/`hermes-agent`→`hermes`, `pi`/`pi-acp`→`pi`, `amp`/`amp-acp`→`amp`). `custom` is a builder placeholder. Details in `catalog-master-table.md` Notes.

---

## 2. Apps & Tools

The master table holds the 90-row inventory. This section classifies those types and shows how they are configured and extended. **For versions, licenses, stars/installs, and repo links, see [`catalog-master-table.md`](./catalog-master-table.md) — not duplicated here.**

### 2.1 Types: AI IDEs, CLIs, Clients, Harnesses/Agents

| Type in master table | Shape | Examples (master `ID`) | When to use |
| --- | --- | --- | --- |
| **Terminal CLI** (`code` category) | Headless TUI, `npx`/`brew`/`cargo` | `codex` (OpenAI), `claude` (Anthropic), `gemini-cli` (Google), `aider`, `opencode`, `cline`, `kilo`, `qwen-code`, `kimi-code`, `codex`, `cody`, `auggie`, `tabnine-cli`, `sweep` not-included | Daily coding in terminal, CI, gateway one-shot via `promptpipe`/`prompt-to-api` |
| **Terminal CLI (+ ACP)** | Above + `acp` subcommand or `*-acp` adapter | `claude acp`, `codex acp`, `cursor-agent acp`, `gemini --acp`, `qwen-code --acp`, `auggie --acp`, `pi-acp`, `claude-acp` | Also hostable in Zed/VS Code via ACP |
| **Desktop IDE** | VS Code fork / native editor | `cursor` (Cursor), `windsurf` (Codeium), `zed` (Zed Industries), `trae-ide` (ByteDance) | Full IDE experience, `shadow workspace` / `multi-buffer` |
| **Desktop IDE plugin** | Extension inside VS Code/JetBrains | `codegeex` (`aminer.codegeex`), `tongyi-lingma` (Alibaba), `baidu-comate` (Baidu), `supermaven` (Babble 1M), `codestral` (Mistral), `jetbrains-ai` | In-editor autocomplete/chat, marketplace installs |
| **Workspace app** | Electron/Web, often ACP *host* | `aionui` (iOfficeAI, 31.8k★), `openhands` (Agent Canvas, Docker), `claude-cowork` (Anthropic), `bolt-diy`/`bolt.new` (StackBlitz WebContainers), `lovable`, `v0` (Vercel), `replit` (Agent+Ghostwriter) | Spawns 20+ CLIs via ACP, browser IDE + deploy |
| **ACP Adapter** | `stdio` bridge `*-acp` | `oz-acp` (Warp Oz), `fm-acp` (Apple fm), `antigravity-acp`/`agy-acp` (Google agy), `amp-acp`, `claude-acp`, `codex-acp`, `droid-acp` | Make a non-ACP CLI speak ACP to Zed/VS Code/`acp-to-api` |
| **Library+Server** | TS API + Hono | `fm-wrap` (`fm-wrap` / `fm-wrap/server`: `respond`, `createChatSession`, `POST /fm/respond`, `GET /v1/models`) | In-process Apple FM / dual HTTP |

**Category `code` vs `agent` vs `host`** (from master `Category`): `code` = coding-focused CLI; `agent` = general agent harness/ACP adapter; `host` = workspace/server that *spawns* agents; `library+server` = `fm-wrap`. Kept separate from `Type` for OmniRoute parity.

**Quick chooser (from §6):**

| Goal | Prefer |
| --- | --- |
| Pipe files/logs into any coding CLI | **promptpipe** |
| OpenAI SDK against local agents **with** multi-turn/tools | **acp-to-api** + ACP-capable agents |
| OpenAI SDK against local CLIs **without** ACP | **prompt-to-api** |
| Use Oz inside Zed/VS Code/Devin | **oz-acp** |
| Use Apple FM in-process or dual HTTP | **fm-wrap**; ACP host → **fm-acp** |
| Use Antigravity in ACP host | **antigravity-acp** or **agy-acp** |
| LiteLLM multi-backend including ACP | **acp-router** pattern |
| Transparent cloud-API hijack to remote router | **agentbridge** → OmniRoute |
| Sync model lists into many clients | **config-models** |
| Install same MCP into many clients | **config-mcps** |
| Ship cross-harness skills | **polyglot-plugin** layout |
| New print-mode tool | Add adapter fields (`promptpipe/tools.toml` → `prompt-to-api/catalog.ts`) |
| New ACP agent behind HTTP | Implement ACP server or register `[agents.*]` in `acp-to-api` |

### 2.2 Global Configs

Per-client global files that define models, permissions, and `baseUrl` support (see master `BaseUrl/Config` = `baseUrlSupport` + `configType`).

| Client | Global file | Format | What it controls |
| --- | --- | --- | --- |
| **Warp** | `~/.warp/settings.toml` (often `~/.dotfiles/warp/.warp/settings.toml` symlink) | TOML | `[agents.execution_profiles.default]` `command_allowlist/denylist` (regex), `execute_commands/read_files/write_to_pty/run_agents = always_allow\|agent_decides\|always_ask` — single global file, denylist wins, `Cmd+Shift+I` bypass |
| **Claude Code** | `~/.claude/settings.json` | JSON | `permissions: {allow: ["Bash(bun:*)","Read"], deny: ["Bash(rm:*)"], ask: [], defaultMode}` + `hooks.PreToolUse`; `ANTHROPIC_*` env also |
| **OpenAI Codex** | `~/.codex/config.toml` | TOML | `[approval] policy=untrusted\|on-request\|never` + `[sandbox] default_mode=read-only\|workspace-write\|danger-full-access, network_access` + `[permissions] allowed_commands/denied_commands` + `[permissions.filesystem] deny_read/write` |
| **Cursor** | `~/.cursor/settings.json` or `~/Library/Application Support/Cursor/User/settings.json` | JSON (+ MDC) | `permissions.allow/deny` + `hooks.blockSubagent`, `mcp` in `.cursor/mcp.json` |
| **Opencode** | `~/.config/opencode/opencode.json` (or `.jsonc`) | JSON/JSONC | `$schema: https://opencode.ai/config.json`, `permission.skill.*`, `permission.command.allow/deny`, `instructions`, `plugin` |
| **Cline / Roo / Kilo** | VS Code global `~/Library/Application Support/Code/User/settings.json` (`cline.*`, `roo.*`) | JSON | `cline.autoApprove`, `cline.allowedCommands/deniedCommands`, `rooCode.allowedCommands`, `kilocode.permissions.allow/deny` |
| **Gemini CLI** | `~/.gemini/settings.json` | JSON | `sandbox`, `approvalMode`, `excludeTools/allowedTools`, `allowedCommands.allow/deny`, `trustedFolders` |
| **Goose** | `~/.config/goose/config.yaml` | YAML | `permissions: {allow, deny, default_mode: ask\|allow\|deny}` + `extensions` (MCP) |
| **Command Code** | `~/.commandcode/settings.json` | JSON | `permissions` + `taste-1` profile; providers via `ANTHROPIC_*/OPENAI_*` |

Templates: `config-templates/global/` + `config-templates/project/` (e.g. `claude.template.json`, `codex.template.toml`, `opencode.template.json`, `warp-agent-permissions.template.toml`). Copied from `allbrew/tests/monitored-install-batch/agent-permissions-templates/`. Denylist always wins; Warp global-only, others global→project merge.

**How to use:**
```bash
cp config-templates/project/claude.template.json ~/.claude/settings.json
cp config-templates/project/codex.template.toml ~/.codex/config.toml
cp config-templates/global/warp-agent-permissions.template.toml ~/.warp/settings.toml  # merge into [agents.execution_profiles.default]
```

### 2.3 Project Configs

Local, committed (or gitignored) files that scope to one repo/branch. Project layer narrows global — **deny wins across all layers**.

| Client | Project file | Precedence & merge |
| --- | --- | --- |
| **Claude Code** | `.claude/settings.json` + `.claude/settings.local.json` (gitignored) | `~/.claude/settings.json` → `.claude/settings.json` → `.claude/settings.local.json` (last wins, but all `deny` honored; `allow` needs trust dialog) |
| **OpenAI Codex** | `.codex/config.toml` (or `./codex.toml`) | `/etc/codex/requirements.toml` → `~/.codex/config.toml` → `.codex/config.toml` → CLI flags `--sandbox`/`--ask-for-approval` |
| **Cursor** | `.cursor/settings.json` + `.cursor/rules/*.mdc` + `.cursor/hooks.json` | Global → project merge; `.cursor/rules/` layered |
| **Opencode** | `./opencode.json` | `~/.config/opencode/opencode.json` → `./opencode.json` → `OPENCODE_CONFIG` (`opencode debug config`) |
| **Cline/Kilo** | `.vscode/settings.json` (`cline.*`) + `.roo/config.json` / `.kilocode/config.json` + `.kilo/rules/` | VS Code global → workspace `.vscode/settings.json`; `kilo config check` validates |
| **Gemini CLI** | `.gemini/settings.json` (nearest up-tree) | `~/.gemini/settings.json` → `.gemini/settings.json` (project overrides; `excludeTools: ["run_shell_command"]` blocks shell) |
| **Goose** | `./.goose.yaml` or `./goose.yaml` | XDG global → project file → env vars |

**How to use:**
```bash
mkdir -p .claude && cp config-templates/project/claude.project.template.json .claude/settings.json
mkdir -p .codex && cp config-templates/project/codex.template.toml .codex/config.toml
mkdir -p .vscode && cp config-templates/project/cline-vscode.template.json .vscode/settings.json
cp config-templates/project/kilo.template.json .kilo/config.json
```

### 2.4 Extensions, Integrations & Protocols

- **Extensions:** Marketplace plugins per master: `aminer.codegeex` (VS Code, JetBrains), `Baidu Comate` (VS Code/JetBrains), `Tongyi Lingma/Qoder CN` (`lingma.aliyun.com`), `Continue` (`continue.dev` — `~/.continue/config.yaml` `apiBase`), `Supermaven` (`Supermaven`), `Codestral` via Continue, `AI Assistant` (JetBrains all IDEs), `Codeium.codeium` (Windsurf fork, 3.96M installs).
- **Integrations:** `agentbridge` (local MITM → OmniRoute remote) for transparent hijack of `api.anthropic.com`/etc.; `config-clis/packages/config-mcps` (`config-mcps`/`cmcps`) for MCP server generation across `opencode,cursor,codex,claude,copilot,goose` via `@getmcp/generators`.
- **Protocols (cheat sheet):**
  - **OpenAI Chat Completions (local):** `baseURL=http://localhost:<port>/v1`, `apiKey=optional`, `model=acp-…|prompt-…|pcc|acp-kimi`. See §1 Sibling gateways for ports/prefixes; `acp-to-api` is session-affine (`metadata.session_id`), `prompt-to-api` flattens history.
  - **ACP (Agent Client Protocol):** NDJSON JSON-RPC over stdio; `*-acp` packages are agent *servers*, `acp-to-api` is the HTTP *client*. Spec: https://agentclientprotocol.com . Debug: `printf '{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"initialize\",\"params\":{\"protocolVersion\":1}}' | oz-acp`.
  - **Adapter seam (print path):** `command + promptMode/promptFlag + stdinMode + modelFlag + trustedArgs + extraArgs + env` — dry-run `ppipe -n …` or `prompt-to-api` `metadata.dry_run`.

### 2.5 Agents

Per-agent capability declarations (not global `settings.json`) — how each catalog client lets you define a custom agent/subagent/mode and restrict it.

| Client | Global agent path | Project agent path | File format | Capabilities & precedence |
| --- | --- | --- | --- |
| **Claude Code** | `~/.claude/agents/*.md` | `.claude/agents/*.md` | Markdown + YAML frontmatter (`name`, `description`, `model`, `tools: [Read,Glob,Bash]`, `permissionMode: acceptEdits`) | Global → project; `permissions.allow/deny` in `settings.json` still enforced (deny wins); frontmatter `tools` only narrows |
| **OpenAI Codex** | `~/.codex/agents/*.toml` | `.codex/agents/*.toml` | TOML (`[agent] name/description/model/instructions` + `[agent.permissions] allowed_commands` + `[agent.sandbox]` + `AGENTS.md` hierarchy) | `~/.codex/AGENTS.md` → `./AGENTS.md` → `subdir/AGENTS.md` + TOML |
| **Opencode** | `~/.config/opencode/agents/*.md` | `.opencode/agents/*.md` | Markdown (`mode: subagent`, `tools: {read/write/bash: bool}`, `permissions.bash.allow/deny` glob, `skills: *`/`!deny`) | `opencode.json` → frontmatter wins |
| **Cursor** | `~/.cursor/agents/*.json` | `.cursor/agents/*.json` / `.cursor/rules/*.mdc` | JSON (`name`, `instructions`, `permissions.allow/deny`, `tools`, `model`) | Global → project merge; deny only narrows |
| **Cline** | — | `.clinerules` + `.vscode/settings.json` custom modes | JSON (`groups: [read,edit,browser,command]`, `autoApprove`) | Workspace overrides global |
| **Kilo** | `~/.config/kilo/agents/*.md` | `.kilo/agents/*.md` | Markdown (`permissions.allow/deny` glob `bun*`, `tools`, `model`) | `kilo config check` validates |
| **Gemini CLI** | `~/.gemini/agents/*.json` | `.gemini/agents/*.json` | JSON (`permissions.allow/deny`, `tools`, `sandbox`, `approvalMode`) | Agent cannot widen global `excludeTools` |
| **Goose** | `~/.config/goose/agents/*.yaml` | `.goose/agents/*.yaml` | YAML (`permissions.allow/deny`, `tools`, `extensions` MCP) | `permissions.default_mode` per-agent |

Templates: `config-templates/agent/` (e.g. `claude-agent.template.md`, `codex-agent.template.toml`, `opencode-agent.template.md`, `kilo-agent.template.md`). Same warp-equivalent policy as Global vs Project — only declaration point moves to per-agent file.

**How to use:**
```bash
mkdir -p .claude/agents && cp config-templates/agent/claude-agent.template.md .claude/agents/allbrew-monitored-install.md
mkdir -p ~/.codex/agents && cp config-templates/agent/codex-agent.template.toml ~/.codex/agents/allbrew-monitored-install.toml
mkdir -p .opencode/agents && cp config-templates/agent/opencode-agent.template.md .opencode/agents/allbrew-monitored-install.md
```

### 2.6 Rules

Project steering files that persist across sessions — distinct from permissions but often co-located.

- **`.clinerules`** + `.vscode/settings.json` `cline.*` custom modes (`groups: [read,edit,browser,command]`).
- **`.cursor/rules/*.mdc`** (Cursor) + `.muse/rules/` (Muse) — layered, global → project.
- **`.roo/rules/` → `.kilo/rules/`** (Roo/Kilo migration, `kilo.jsonc` lists agent paths).
- **`.continue/config.yaml`** (`apiBase`) and `~/.continue/config.yaml`.
- **Templates:** `config-templates/project/cline-vscode.template.json`, `kilo.template.json`.

### 2.7 Skills / Plugins

Portable agent packages via `polyglot-plugin` spec — not runtime CLIs.

- **Layout:** `.agents/skills/`, `.cursor/rules/`, `mcp.json`, `SKILL.md` frontmatter.
- **Skills in repo:** `polyglot-plugin`, `convert-to-polyglot`, `plug-me-in`; also harness plugins under `harness-plugins/*` (third-party skill/template bundles, not CLIs themselves).
- **Use:** Ship skills/rules once; consume from any harness that understands those paths.

### 2.8 MCP / Plugins

Model Context Protocol side-car.

- **Clients:** `opencode,cursor,codex,claude,copilot,goose` (same set as `config-mcps`).
- **Tool:** `config-mcps` (`cmcps`/`cmcp`) — `clients list`, `generate --clients …` (demo mode) via `@getmcp/generators` (internal `claude` → `claude-code` mapping).
- **Where configs live:** `~/.config/opencode/opencode.jsonc` → `provider.<id>.models`; `~/.codex/model-catalogs/<id>.json`; `~/.config/goose/config.yaml`; `~/.cursor/mcp.json`.
- **Compose:** Gateways (`acp-to-api`, `prompt-to-api`, `fm-wrap`) as `/v1/models` source; `config-mcps` as writer.

### 2.9 ACP / A2A

**Agent Client Protocol (ACP):** Open standard (Zed-led) for long-lived agents. Methods: `initialize`, `session/new|load|resume|list|delete`, `session/prompt|cancel|set_config_option` (+ `set_model`). Transports: `initialize` → NDJSON over stdio (stdout reserved, logs stderr).

- **Adapters (agent servers):** `oz-acp` (`oz agent run --output-format ndjson --prompt … --model --profile --computer_use`), `fm-acp` (`fm serve --socket` → PCC via `cua-driver`; env `FM_ACP_AUTO_SERVE`, `FM_ACP_SERVE_SOCK ~/.config/fm-acp/fm.sock`), `antigravity-acp`/`agy-acp` (Node vs Rust, env `AGY_BIN`, `AGY_SKIP_DOWNLOAD`, conversation `SQLite`). Host spawns `command: "oz-acp"` etc. via Zed `agent_servers`, VS Code `acp.agents`, JetBrains `~/.jetbrains/acp.json`, Devin `~/.windsurf/acp/registry.json`.
- **Gateway client:** `acp-to-api` (`GET /v1/models` cached + background discovery, `POST /v1/chat/completions` → ACP `session/prompt`, stable `metadata.session_id`, 2s idle + SIGTERM→SIGKILL 5s, 120s timeout, `DISALLOWED_VERSION_COMMAND_CHARS`, `setCustomAgents`, 60s cache).
- **Registry today:** Local `acp-to-api` README `[agents.*]` + Wiki ACP 14 built-ins (`codex,claude,goose,gemini-cli,openclaw,aider,opencode,cline,qwen-code,forge,amazon-q,interpreter,cursor-cli,warp` + `setCustomAgents`) + `src/lib/acp/{registry,manager,index}.ts`. CLI-Tools 19+6+MITM (v3.8.6) separate.

**Agent-to-Agent (A2A) / OmniRoute:** `agentbridge` local MITM edge → `omniroute` remote router. OmniRoute topics: `GET /api/cli-tools/all-statuses` (`ToolBatchStatus`: `detection {installed, runnable, version?, commandPath?}`, `config {status: configured|not_configured|…}`, `error?` sanitized), `POST /api/cli-tools/{forge,jcode,deepseek-tui,smelt,pi}-settings`, dashboards `CliCodePageClient`/`CliAgentsPageClient`, i18n `cliCommon/cliCode/cliAgents/acpAgents`, VS Code tokenized `/api/v1/vscode/{token}/*`.

### 2.10 CLI / Stdio

**Headless trust / autonomy:** Most print adapters append permission-bypass flags when `trusted` (default on in `promptpipe`/`prompt-to-api`): `claude --dangerously-skip-permissions`, `codex --dangerously-bypass-approvals-and-sandbox`, `grok --always-approve`, etc. ACP path uses gateway `permission_mode` (`auto_allow|deny`) instead. Oz print path has no bypass flag.

**promptpipe — unified CLI adapter** (`promptpipe`, `ppipe`, `pp`; Bun TS; merge `config/tools.toml` → `~/.config/promptpipe/tools.toml` → `config.yaml` → `.promptpipe.yaml`):

| Mode | Invocations | Behavior |
| --- | --- | --- |
| Run | `ppipe [-t tool] "prompt"` | Prompt + optional stdin context |
| Shell translate | `ppipe sh` / `shell` / `translate` | One shell command (kiro native translate; others instruction-wrapped) |
| Slash | `ppipe slash` / `cmd` / prompt starting `/` | Session slash-style |
| Skill | `ppipe skill` / `sk` | Native skill token or SKILL.md expand |
| Discover | `ppipe scan`, `test`, `tools list\|show\|add\|remove` | PATH scan, dry capability tests, catalog CRUD |
| Routing stats | `ppipe stats`, `auto`/`best`/`smart` | Score installed tools; `~/.config/promptpipe/stats.json` |

Flags: `-t/--tool`, `-n/--dry-run`, `-C/--cwd`, `-m/--model`, `-T/--trusted` (default headless), `-U/--untrusted`, `-i/--interactive` (PTY). Env: `PROMPTPIPE_NO_STATS`. Schema: `command`, `promptFlag`, `stdinMode`, `trustedArgs`, `modelFlag`, `env`, …

**prompt-to-api (8788, Bun/Hono):** `GET /health` (`status, tools, models`), `GET /v1/models` (`prompt-<tool>`), `POST /v1/chat/completions` (flatten chat → one prompt, SSE). Ids: `prompt-<tool>[/<model>]`. Extensions: `cwd`, `trusted`, `permission_mode`, `dry_run` → `prompt_to_api.plan {argv, stdin, cwd}`. Catalog: `src/adapters/catalog.ts` (ported from `promptpipe`).

**acp-router (Python, `acp-router` → `serve:main`, `pip install -e .`):** `model: acp/kimi` → `custom_handler: router.router_handler` in `litellm_config.yaml`; `PORT=8080 acp-router`.

**De-dupe & bindings (from §7):**

| Concern | Guidance |
| --- | --- |
| Antigravity ACP TS vs Rust | Same role; pick one runtime |
| FM access (`fm` CLI vs `fm-wrap` vs `fm-acp`) | Library/HTTP → `fm-wrap`; ACP host → `fm-acp`; pipes/gateway one-shot → `promptpipe`/`prompt-to-api` |
| Oz access | Host UI → `oz-acp`; HTTP session → `acp-to-api`; one-shot → `prompt*` |
| Headless flag matrix | Treat `promptpipe` `config/tools.toml` as authoring source; keep `prompt-to-api` in sync |
| OpenAI `/v1` four servers | Differ by session model + `modelId` prefix — not interchangeable blindly |
| Config writers | `config-models` is bulk/automation path |

---

## 3. Catalog Reference

**Canonical table:** [`catalog-master-table.md`](./catalog-master-table.md) — 90 deduplicated IDs after collapsing aliases (`oc`→`opencode`, etc.) and adding 15 major peers (OpenAI `codex`, Microsoft `copilot-cli`, Sourcegraph `cody`, Google `jules`, Zed `zed`, Mistral `codestral`, JetBrains `jetbrains-ai`, Augment `auggie`, Tabnine `tabnine-cli`, StackBlitz `bolt-diy`/`bolt-new`, Lovable `lovable`, Vercel `v0`, Replit `replit`, Supermaven `supermaven`). **Do not fork the list here** — link to master.

Columns (16): `ID` (stable slug) · `Display Name` · `Vendor` · `Category` (`code`/`agent`/`host`/`library+server`) · `Type` · `Binary` · `ACP launch` · `Headless/Print` · `Trust/Bypass` · `Distribution/Install` · `Version` · `License` · `BaseUrl/Config` (`full`/`partial`/`none` + `env`/`custom`/`guide` + `acpSpawnable`) · `Popularity` (stars or `3.96M installs`) · `homepage_url` · `github_url` (`—` = closed).

**Skills that maintain it:**

| Skill | Input | What it does |
| --- | --- | --- |
| `add-to-catalog` | single `input` URL/path (`github.com/owner/repo`, `/releases`, listing page, or `/local/path`) + `type`/`update` | Parses via `helpers/url-parser.js` (`knownIds`: `jules.google.com→jules`, `zed.dev→zed` etc.; `github_url="—"` for closed), vets peer `type`/`category` + AI-coding keyword, deduplicates via `helpers/md-table.js` `find`, enriches `Version`/`License`/`Distribution`, then full 16-col `upsert` (merge-existing, never partial) + `diff --check` |
| `batch-add-to-catalog` | `inputs: string[]` of names/URLs **or** listicle pages (e.g. `awesome-ai-coding-tools`) | Expands each listicle via `helpers/batch.js` `scrapeListingPage` (curl + `github.com/owner/repo` regex), dedups within batch + against master, vets each candidate as peer (`not-a-peer-scope` vs `needs-manual-review`), then per-candidate `add-to-catalog` flow + batch report |
| `add-column-to-catalog` | `column_name`, `description`, `position` (`after:License`/`before:homepage_url`/`last`), `populate`/`overwrite` | Adds header/legend via `helpers/column.js` (code-span aware `splitRow`), pads rows with `—`, then `KNOWN_COLUMN_FETCHERS` (`pricing`, `funding`, `last_updated`, `context_window`, `offline_capable`) or generic homepage/README inference per row |
| `revalidate-catalog` | `ids` **or** `filter` (`vendor:Anthropic`, `type:Workspace app`) **or** `all`, optional `fields` + `dryRun` | Re-researches `Version` (`/releases/latest`), `License` (`/license`), `Popularity` (stars), `homepage_url`/`github_url` `HEAD` reachability, `Distribution`/`BaseUrl/Config`; diffs `stored→fetched` with citations, `broken-url`/`rate-limited`, then full-row `upsert` |

All row edits go through `helpers/md-table.js` `Spreadsheet.fromMarkdown → upsert → toMarkdown` (handles escaped `\|` and `` `...|...` ``, preserves doc, and respects `homepage_url`+`github_url` table selection). Never hand-edit pipes.

---

## 4. Permissions & Security (warp-equivalent)

Generated 2026-08-10 from `tests/monitored-install-batch/warp-agent-permissions.template.{toml,json,yaml,yml}` (allow `bun`/`node`/`python3`/`git`/`lume`/`ssh`/`brew` VM-only + RO tools; deny `rm`/`curl`/`wget`/`scp`/`rsync`/shells/`sudo` — denylist always wins). Each row validated via web/GitHub docs and local discovery.

### 4.1 Global vs project (permissions)

Full table (8 clients) lives in the legacy backup (`backups/ai-cli-client-catalog.md.bak.2026-08-10` §15). Key invariants kept here:

- **Warp** is global-only (`~/.warp/settings.toml` `[agents.execution_profiles.default]` `command_allowlist/denylist` regex); `Cmd+Shift+I` bypasses for one task.
- **Claude/Codex/Cursor/Opencode/Gemini/Goose/Cline/Kilo** all have global → project merge; **deny wins everywhere**; `allow` only after trust dialog or narrowing.
- Templates: `config-templates/project/*.template.{json,toml,yaml}` mirrors the allowed/denied shape per client; `warp-agent-permissions.template.toml` also shipped as `.json`/`.yaml`/`.yml`.

### 4.2 Per-agent capabilities (agents)

Full matrix in legacy backup §16 (8 clients: `~/.claude/agents/*.md`, `~/.codex/agents/*.toml`, etc., frontmatter `tools`/`permissions`/`model`/`skills`). Invariant: per-agent frontmatter can only *narrow* global `allow/deny`; `deny` still wins. `kilo config check` validates globs. Templates: `config-templates/agent/` (e.g. `claude-agent.template.md`, `codex-agent.template.toml`, `opencode-agent.template.md`).

**Apply:**
```bash
cp config-templates/project/claude.template.json ~/.claude/settings.json
mkdir -p .claude && cp config-templates/project/claude.project.template.json .claude/settings.json
cp config-templates/project/codex.template.toml ~/.codex/config.toml
cp config-templates/agent/claude-agent.template.md .claude/agents/allbrew-monitored-install.md
mkdir -p .kilo/agents && cp config-templates/agent/kilo-agent.template.md .kilo/agents/allbrew-monitored-install.md
```

---

## 5. Distribution, Installation & Runtime

Recurring conventions kept from legacy §8: `npm i -g` / `brew` / `cargo` / `pip` / `uv sync` / `curl | bash` per `Distribution/Install` column; registries `amp-acp`, `claude-acp`, `codex-acp` etc. vs vendor `cli acp` builtins (custom adapters register as `[agents.*]` in `acp-to-api`).

Runtime flags vs ACP: print path appends bypass flags when `trusted` (default headless); ACP path uses gateway `permission_mode` (`auto_allow|deny`). Oz print has no bypass.

**Revalidation:** `revalidate-catalog --all --fields version,popularity` refreshes versions/stars from GH API/npm; `--fields homepage_url,github_url` HEAD-checks reachability (report `broken-url`).

---

## 6. Source Anchors & Further Reading

| Topic | Primary path |
| --- | --- |
| Print adapter matrix | `promptpipe/README.md`, `promptpipe/config/tools.toml` |
| Print HTTP catalog | `prompt-to-api/src/adapters/catalog.ts` |
| ACP agent registry (local) | `acp-to-api` README + `config.toml` `[agents.*]` |
| OmniRoute ACP registry/manager | [Wiki ACP](https://github.com/diegosouzapw/OmniRoute/wiki/ACP), `src/lib/acp/{registry,manager,index}.ts` (14 built-ins) |
| OmniRoute CLI-Tools catalog + dashboards | [Wiki CLI-Tools](https://github.com/diegosouzapw/OmniRoute/wiki/CLI-Tools) v3.8.6, `src/shared/constants/cliTools.ts` (`CLI_TOOLS`, 19+6+MITM), `GET /api/cli-tools/all-statuses` |
| Oz ACP mapping | `oz-acp/src/{adapter,oz,stream,map}.ts` |
| FM library API | `fm-wrap/src/core/*` |
| LiteLLM ACP provider | `acp-router/router_handler.py`, `litellm_config.yaml` |
| Model config injection | `config-clis/packages/config-models` |
| MCP config generation | `config-clis/packages/config-mcps` |
| Portable skills | `polyglot-plugin/README.md` |
| Catalog skills & helpers | `.agents/skills/{add-to-catalog,batch-add-to-catalog,add-column-to-catalog,revalidate-catalog}/` |

Out of scope (unchanged): full OmniRoute admin/API beyond ACP/CLI-Tools, exhaustive harness-plugins inventory, upstream vendor CLI full command trees.

---

## 7. Review History

- **2026-08-08** Initial capture; localhost bind restored, oz-acp `--prompt`+NDJSON corrected, agentbridge `src/` noted, vendor `cli acp` vs `*-acp` clarified.
- **2026-08-09** OmniRoute Wiki ACP (14) + CLI-Tools (19+6+MITM) ingested; §2/§9/§10 updated.
- **2026-08-10** Chinese-lab peers (MiMo, Trae, Qwen, Kimi, CodeWhale, MiniMax, CodeBuddy, etc.) + non-star prominences (Windsurf 3.96M, Baidu 43%, Tongyi Lingma, Claude Cowork, Trae IDE, CodeGeeX); `catalog-master-table.md` 90 rows (ID split `homepage_url`/`github_url`); `add-to-catalog` helpers + `diff --check` clean.
- **2026-08-10 (peer pass)** 15 major peers (OpenAI `codex` 67k★, Microsoft `copilot-cli` 1.3M, Sourcegraph `cody`, Google `jules`, Zed `zed`, Mistral `codestral`, JetBrains `jetbrains-ai`, Augment `auggie`, Tabnine `tabnine-cli`, StackBlitz `bolt-diy`/`bolt.new`, Lovable `lovable`, Vercel `v0`, Replit `replit`, Supermaven `supermaven`) via vet+dedup; pipes `| bash` fixed via `md-table` code-span aware.
- **2026-08-10 (skills)** `add-column-to-catalog` + `revalidate-catalog` added (column DDL/backfill, whole-table re-research with `dryRun`, rate-limit backoff).
- **2026-08-11** This rewrite — ecosystem overview + Apps & Tools taxonomy, Global/Project Configs, Extensions/Protocols, Agents, Rules, Skills/Plugins, MCP, ACP/A2A, CLI/Stdio consolidated from legacy §§2–10,15,16 into §1–6; legacy preserved in `backups/`.

