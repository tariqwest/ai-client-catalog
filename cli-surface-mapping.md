# CLI Surface Mapping — Terminal CLI Command Structure

> **Source:** Extracted from `catalog-master-table.md` (2026-08-17).
> **Scope:** Maps CLI structure for 82 terminal_cli tools from the main catalog.
> **Cross-reference:** Links to main catalog via `id` and `uid` columns.

## CLI Surface Mapping

**Purpose:** Maps command-line interface structure for each tool with a terminal CLI, organized by common functional subcommands.

**Common Subcommand Columns** (functional capabilities that recur across tools):
- `acp` — Launch Agent Communication Protocol server/mode
- `chat/run` — Start interactive chat or execute agent run
- `serve` — Start local server (for completions, MCP, etc.)
- `config` — Configuration management (init, check, validate)
- `auth` — Authentication/login commands

**Other Columns:**
- `#` — Row number (current index, not stable)
- `id` — Stable slug identifier matching main catalog
- `uid` — Stable unique identifier (8-char) matching main catalog
- `command` — Primary executable
- `headless_print` — One-shot prompt-to-output pattern (non-interactive)
- `prompt_mode` — How to pass one-shot prompts (flag or positional)
- `trust_bypass` — Flags to skip permission prompts
- `subcommands` — Tool-specific subcommands not in common categories
- `notes` — Contextually important differentiating info
- `created` — Timestamp inherited from the matching `uid` row in the master catalog
- `updated` — Timestamp inherited from the matching `uid` row in the master catalog
- `project_status` — Project maintenance state (active, maintenance, deprecated, acquired_integrated, abandoned, unknown)

| # | id | uid | command | headless_print | prompt_mode | acp | chat/run | serve | config | auth | trust_bypass | subcommands | notes | created | updated | project_status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | `aichat` | gvdifurg | `aichat` | aichat "prompt" | positional | — | ✓ (default) | — | config | — | --no-confirm | role, session, info | Rust-based multi-model CLI | 2026-08-11T10:33:39Z | 2026-08-11T10:33:39Z | active |
| 2 | `amp` | vazxarkq | `amp` | amp -x "prompt" | -x | acp | ✓ (default) | — | — | — | --dangerously-allow-all | — | Sourcegraph (closed); OmniRoute adapter | 2026-08-11T10:33:39Z | 2026-08-11T10:33:39Z | active |
| 3 | `aider` | ch8ojxgs | `aider` | aider --message "prompt" --no-stream | --message | acp | ✓ (default) | — | — | — | --yes-always, --no-auto-commits | — | File-based coding agent | 2026-08-11T10:33:39Z | 2026-08-11T10:33:39Z | active |
| 4 | `amazon-q` | p1jue7p8 | `q` | — | — | — | chat | — | configure | configure | — | scan, test, transform | AWS official CLI | 2026-08-11T10:33:39Z | 2026-08-11T10:33:39Z | active |
| 5 | `claude` | tj6cmpyw | `claude` | claude "prompt" | positional | — | ✓ (default) | — | config | — | — | — | Community Claude CLI | 2026-08-11T10:33:39Z | 2026-08-11T10:33:39Z | active |
| 6 | `cline` | ep26x895 | `cline` | — | — | — | run | — | — | — | — | — | VSCode extension CLI companion | 2026-08-11T10:33:39Z | 2026-08-11T10:33:39Z | active |
| 7 | `codebuddy-code` | 6xx6fvs0 | `codebuddy` | — | — | acp | run | — | — | — | — | prewarm | CodeBuddy CLI (cbc) | 2026-08-11T10:33:39Z | 2026-08-11T10:33:39Z | acquired_integrated |
| 8 | `codewhale` | z4pub2rc | `deepseek` | deepseek -p "prompt" | positional | — | ✓ (default) | — | — | — | — | — | DeepSeek TUI alias | 2026-08-11T10:33:39Z | 2026-08-11T10:33:39Z | unknown |
| 9 | `command-code` | hxa4qnba | `cmd` | cmd "prompt" | positional | — | ✓ (default) | — | — | — | — | — | Command.ai CLI (cmdc) | 2026-08-11T10:33:39Z | 2026-08-11T10:33:39Z | active |
| 10 | `continue` | 3rdzbjea | `continue` | — | — | — | — | serve | — | — | — | — | IDE extension server | 2026-08-11T10:33:39Z | 2026-08-11T10:33:39Z | active |
| 11 | `crush` | 8n1fvdh0 | `crush` | crush "prompt" | positional | — | ✓ (default) | — | — | — | — | — | Terminal agent | 2026-08-11T10:33:39Z | 2026-08-11T10:33:39Z | active |
| 12 | `cursor` | rvt82v0i | `cursor-agent` | — | — | — | chat | — | — | — | — | apply, edit | cursor-agent CLI | 2026-08-11T10:33:39Z | 2026-08-11T10:33:39Z | active |
| 13 | `devin` | q3zlhld5 | `devin` | — | — | — | run | — | config | auth login | --yes | logs, status, session | Cognition AI agent | 2026-08-11T10:33:39Z | 2026-08-11T10:33:39Z | active |
| 14 | `droid` | zi4zg1gt | `droid` | — | — | acp | run | — | — | — | — | plan, execute | Factory Droid agent | 2026-08-11T10:33:39Z | 2026-08-11T10:33:39Z | active |
| 15 | `fm` | vn385kcg | `fm` | fm "prompt" | positional | acp | ✓ (default) | — | — | — | — | — | Apple Foundation Models | 2026-08-11T10:33:39Z | 2026-08-11T10:33:39Z | active |
| 16 | `forge` | evx84ep8 | `forge` | — | — | acp | run | — | config | — | — | task, project | ForgeCode CLI | 2026-08-11T10:33:39Z | 2026-08-11T10:33:39Z | deprecated |
| 17 | `gemini-cli` | dvevmbru | `gemini` | gemini "prompt" | positional | acp | ✓ (default) | — | — | — | — | — | Google Gemini CLI | 2026-08-11T10:33:39Z | 2026-08-11T10:33:39Z | active |
| 18 | `goose` | 0qrcti3d | `goose` | goose run "prompt" | positional | — | run | — | configure | — | — | session, toolkit | Block (Square) agent | 2026-08-11T10:33:39Z | 2026-08-11T10:33:39Z | active |
| 19 | `grok` | j09n797w | `grok` | grok "prompt" | positional | acp | ✓ (default) | — | — | — | — | — | xAI Grok CLI | 2026-08-11T10:33:39Z | 2026-08-11T10:33:39Z | active |
| 20 | `hermes` | yvy6p4zx | `hermes` | — | — | acp | run | — | — | — | — | — | Nous Hermes agent | 2026-08-11T10:33:39Z | 2026-08-11T10:33:39Z | unknown |
| 21 | `interpreter` | 8iw5414b | `interpreter` | interpreter --message "prompt" | --message | — | ✓ (default) | — | — | — | --safe-mode off | — | Open Interpreter | 2026-08-11T10:33:39Z | 2026-08-11T10:33:39Z | active |
| 22 | `jcode` | 75ls08f9 | `jcode` | — | — | — | run | — | — | — | — | — | JetBrains coding CLI | 2026-08-11T10:33:39Z | 2026-08-11T10:33:39Z | unknown |
| 23 | `junie` | j1ec5nxv | `junie` | — | — | acp | run | — | — | — | — | — | Junie agent | 2026-08-11T10:33:39Z | 2026-08-11T10:33:39Z | active |
| 24 | `kilo` | 7vzp0o7s | `kilo` | — | — | acp | run | — | — | — | — | — | Kilo coding agent | 2026-08-11T10:33:39Z | 2026-08-11T10:33:39Z | active |
| 25 | `kimi-code` | 0hip4ye9 | `kimi` | kimi "prompt" | positional | acp | ✓ (default) | — | — | — | — | — | Moonshot Kimi CLI | 2026-08-11T10:33:39Z | 2026-08-11T10:33:39Z | active |
| 26 | `kiro` | kzwak7hq | `kiro-cli` | kiro-cli "prompt" | positional | acp | ✓ (default) | — | — | — | — | — | Kiro AI CLI | 2026-08-11T10:33:39Z | 2026-08-11T10:33:39Z | active |
| 27 | `mimo-code` | ppcpy097 | `mimo` | — | — | — | run | — | — | — | — | — | Xiaomi MiMo CLI | 2026-08-11T10:33:39Z | 2026-08-11T10:33:39Z | active |
| 28 | `minimax-cli` | ldrsylkm | `mmx` | minimax "prompt" | positional | — | ✓ (default) | — | — | — | — | — | MiniMax AI CLI | 2026-08-11T10:33:39Z | 2026-08-11T10:33:39Z | active |
| 29 | `openclaw` | 4z0pnb1w | `openclaw` | — | — | acp | run | — | — | — | — | — | OpenClaw agent | 2026-08-11T10:33:39Z | 2026-08-11T10:33:39Z | unknown |
| 30 | `opencode` | 0d1e5u0e | `opencode` | opencode --execute "prompt" | --execute | acp | ✓ (default) | — | config | — | --yes, --trust | plugin, agent, skill | Warp IDE open-source CLI | 2026-08-11T10:33:39Z | 2026-08-11T10:33:39Z | active |
| 31 | `openclaude` | nsj2jp8k | `openclaude` | openclaude "prompt" | positional | — | ✓ (default) | — | — | — | — | — | Community Claude CLI | 2026-08-11T10:33:39Z | 2026-08-11T10:33:39Z | unknown |
| 32 | `oz` | w8rxtpmv | `oz` | oz "prompt" | positional | acp | ✓ (default) | — | — | — | — | — | Oz agent CLI | 2026-08-11T10:33:39Z | 2026-08-11T10:33:39Z | active |
| 33 | `pi` | 5r8lsa22 | `pi` | — | — | acp | chat | — | — | — | — | — | Inflection Pi CLI | 2026-08-11T10:33:39Z | 2026-08-11T10:33:39Z | active |
| 34 | `plandex` | 1s6fem10 | `plandex` | — | — | — | tell | — | set-model | sign-in | — | load, ls, apply, build | Multi-file planner | 2026-08-11T10:33:39Z | 2026-08-11T10:33:39Z | active |
| 35 | `qoder` | 5591mmpd | `qodercli` | — | — | acp | run | — | — | — | — | — | Qoder coding agent | 2026-08-11T10:33:39Z | 2026-08-11T10:33:39Z | active |
| 36 | `qwen-code` | 6pdufm4r | `qwen` | qwen "prompt" | positional | acp | ✓ (default) | — | — | — | — | — | Alibaba Qwen CLI | 2026-08-11T10:33:39Z | 2026-08-11T10:33:39Z | active |
| 37 | `sgpt` | s3xqfkfc | `sgpt` | sgpt "prompt" | positional | — | ✓ (default) | — | — | — | — | — | ShellGPT; --shell, --code mode flags | 2026-08-11T10:33:39Z | 2026-08-11T10:33:39Z | active |
| 38 | `smelt` | vwauxl4r | `smelt` | — | — | — | run | — | — | — | — | — | Smelt coding agent | 2026-08-11T10:33:39Z | 2026-08-11T10:33:39Z | unknown |
| 39 | `swe-agent` | mg4z1pj8 | `sweagent` | — | — | — | run | — | — | — | — | — | Princeton SWE-agent | 2026-08-11T10:33:39Z | 2026-08-11T10:33:39Z | active |
| 40 | `trae-agent` | 27vik8wp | `trae-cli` | — | — | — | run | — | — | — | — | — | Trae AI agent | 2026-08-11T10:33:39Z | 2026-08-11T10:33:39Z | active |
| 41 | `warp-agent-cli` | eyyl2woo | `warp` | — | — | — | run | — | — | — | — | — | Warp terminal agent | 2026-08-11T10:33:39Z | 2026-08-11T10:33:39Z | active |
| 42 | `zero` | o5jij4nc | `zero` | — | — | — | run | — | — | — | — | — | Zero coding agent | 2026-08-11T10:33:39Z | 2026-08-11T10:33:39Z | active |
| 43 | `muse-code` | 5a293x5x | `muse` | — | — | — | run | — | — | — | — | — | Muse coding agent | 2026-08-11T10:33:39Z | 2026-08-11T10:33:39Z | active |
| 44 | `fast-agent` | 9b42wprw | `fast-agent` | — | — | acp | run | — | — | — | — | — | Fast agent runner | 2026-08-11T10:33:39Z | 2026-08-11T10:33:39Z | active |
| 45 | `gemini` | zvv02mii | `gemini` | — | positional | acp | ✓ (default) | — | — | — | — | — | — | 2026-08-11T10:33:39Z | 2026-08-11T10:33:39Z | active |
| 46 | `amp-acp` | wfo2l9xx | `amp-acp` | — | positional | acp | — | — | — | — | — | — | ACP adapter/wrapper | 2026-08-11T10:33:39Z | 2026-08-11T10:33:39Z | active |
| 47 | `claude-acp` | cbyt3q89 | `claude-acp` | — | positional | acp | — | — | — | — | — | — | ACP adapter/wrapper | 2026-08-11T10:33:39Z | 2026-08-11T10:33:39Z | active |
| 48 | `codex-acp` | mqz2dbd2 | `codex-acp` | — | positional | acp | — | — | — | — | — | — | ACP adapter/wrapper | 2026-08-11T10:33:39Z | 2026-08-11T10:33:39Z | active |
| 49 | `cortex-code` | sf75iljq | `cortex` | — | — | — | run | — | — | — | — | — | Cortex coding agent | 2026-08-11T10:33:39Z | 2026-08-11T10:33:39Z | active |
| 50 | `corust-agent` | bm2hs3ig | `corust` | — | positional | acp | run | — | — | — | — | — | — | 2026-08-11T10:33:39Z | 2026-08-11T10:33:39Z | active |
| 51 | `crow-cli` | pn4yrauc | `crow` | crow "prompt" | positional | acp | ✓ (default) | — | — | — | — | — | — | 2026-08-11T10:33:39Z | 2026-08-11T10:33:39Z | active |
| 52 | `deepagents` | pxiyjoxm | `deepagents` | — | positional | acp | run | — | — | — | — | — | — | 2026-08-11T10:33:39Z | 2026-08-11T10:33:39Z | active |
| 53 | `dimcode` | 5zso7nln | `dimcode` | — | positional | acp | ✓ (default) | — | — | — | — | — | Coding agent CLI | 2026-08-11T10:33:39Z | 2026-08-11T10:33:39Z | active |
| 54 | `dirac` | he0x4hf3 | `dirac` | — | positional | acp | ✓ (default) | — | — | — | — | — | — | 2026-08-11T10:33:39Z | 2026-08-11T10:33:39Z | active |
| 55 | `glm-acp-agent` | 9k8hm61q | `glm-acp-agent` | — | positional | acp | run | — | — | — | — | — | — | 2026-08-11T10:33:39Z | 2026-08-11T10:33:39Z | active |
| 56 | `grok-build` | aptu7h5m | `grok` | — | positional | acp | ✓ (default) | — | — | — | — | — | — | 2026-08-11T10:33:39Z | 2026-08-11T10:33:39Z | active |
| 57 | `harn` | wod01jkk | `harn` | — | positional | acp | ✓ (default) | — | — | — | — | — | — | 2026-08-11T10:33:39Z | 2026-08-11T10:33:39Z | unknown |
| 58 | `kimi` | acylcifd | `kimi` | — | positional | acp | ✓ (default) | — | — | — | — | — | — | 2026-08-11T10:33:39Z | 2026-08-11T10:33:39Z | active |
| 59 | `minion-code` | 03i4ccpb | `minion-code` | — | positional | acp | ✓ (default) | — | — | — | — | — | Coding agent CLI | 2026-08-11T10:33:39Z | 2026-08-11T10:33:39Z | unknown |
| 60 | `mistral-vibe` | 35w88jiy | `mistral-vibe` | — | positional | acp | ✓ (default) | — | — | — | — | — | — | 2026-08-11T10:33:39Z | 2026-08-11T10:33:39Z | active |
| 61 | `nova` | 4cg2s0y2 | `nova` | — | positional | acp | ✓ (default) | — | — | — | — | — | — | 2026-08-11T10:33:39Z | 2026-08-11T10:33:39Z | active |
| 62 | `poolside` | nlt04k2o | `poolside` | — | positional | acp | ✓ (default) | — | — | — | — | — | — | 2026-08-11T10:33:39Z | 2026-08-11T10:33:39Z | active |
| 63 | `sigit` | tx0kunzu | `sigit` | — | positional | acp | ✓ (default) | — | — | — | — | — | — | 2026-08-11T10:33:39Z | 2026-08-11T10:33:39Z | active |
| 64 | `stakpak` | fqm4bq8f | `stakpak` | — | positional | acp | ✓ (default) | — | — | — | — | — | — | 2026-08-11T10:33:39Z | 2026-08-11T10:33:39Z | active |
| 65 | `vtcode` | st8w5r23 | `vtcode` | — | positional | acp | ✓ (default) | — | — | — | — | — | Coding agent CLI | 2026-08-11T10:33:39Z | 2026-08-11T10:33:39Z | unknown |
| 66 | `codex` | t726cyrk | `codex` | — | positional | acp | ✓ (default) | — | — | — | — | — | Coding agent CLI | 2026-08-11T10:33:39Z | 2026-08-11T10:33:39Z | active |
| 67 | `copilot-cli` | uoyiqkud | `copilot` | copilot "prompt" | positional | — | ✓ (default) | — | — | — | — | — | — | 2026-08-11T10:33:39Z | 2026-08-11T10:33:39Z | active |
| 68 | `cody` | tls805rs | `cody` | — | positional | acp | ✓ (default) | — | — | — | — | — | — | 2026-08-11T10:33:39Z | 2026-08-11T10:33:39Z | active |
| 69 | `jules` | mquptyav | `jules` | — | positional | — | ✓ (default) | — | — | — | — | — | — | 2026-08-11T10:33:39Z | 2026-08-11T10:33:39Z | active |
| 70 | `auggie` | x2uczkxd | `auggie` | — | positional | acp | ✓ (default) | — | — | — | — | — | — | 2026-08-11T10:33:39Z | 2026-08-11T10:33:39Z | active |
| 71 | `tabnine-cli` | v7qzyq11 | `tabnine` | tabnine "prompt" | positional | acp | ✓ (default) | — | — | — | — | — | — | 2026-08-11T10:33:39Z | 2026-08-11T10:33:39Z | active |
| 72 | `oh-my-pi` | bjcdl1zv | `omp` | — | positional | acp | ✓ (default) | — | — | — | — | — | — | 2026-08-11T10:33:39Z | 2026-08-11T10:33:39Z | unknown |
| 73 | `antigravity-cli` | y7sy9rdt | `antigravity` | antigravity "prompt" | positional | — | ✓ (default) | — | — | — | — | — | — | 2026-08-11T12:04:59Z | 2026-08-11T12:04:59Z | active |
| 74 | `atomic-agent` | 24chy710 | `atomic-agent` | — | positional | — | run | — | — | — | — | — | — | 2026-08-11T12:07:28Z | 2026-08-11T12:07:28Z | active |
| 75 | `ante` | x8432cgr | `ante` | — | positional | — | ✓ (default) | — | — | — | — | — | — | 2026-08-11T13:42:12Z | 2026-08-11T13:42:12Z | active |
| 76 | `void-cli` | qlxjq9o2 | `void` | void "prompt" | positional | — | ✓ (default) | — | — | — | — | — | — | 2026-08-11T14:48:26Z | 2026-08-11T14:48:26Z | active |
| 77 | `neo` | 85fnf8sl | `neo` | — | positional | — | ✓ (default) | — | — | — | — | — | — | 2026-08-11T14:48:26Z | 2026-08-11T14:48:26Z | active |
| 78 | `prime-agent` | olo08elv | `prime-agent` | — | positional | — | run | — | — | — | — | — | — | 2026-08-11T14:48:26Z | 2026-08-11T14:50:44Z | active |
| 79 | `codebuff` | 1eljmmbh | `freebuff` | — | positional | — | ✓ (default) | — | — | — | — | — | Coding agent CLI | 2026-08-11T15:19:33Z | 2026-08-18T00:34:40Z | active |
| 80 | `llm` | q7m2k4za | `llm` | — | positional | — | ✓ (default) | — | — | — | — | — | — | 2026-08-14T00:00:00Z | 2026-08-14T00:00:00Z | active |
| 81 | `gptme` | r8n3p5vb | `gptme` | gptme "prompt" | positional | — | ✓ (default) | — | — | — | — | log, eval | Erik Bjäreholt agent | 2026-08-14T00:00:00Z | 2026-08-14T00:00:00Z | active |
| 82 | `blackbox-cli` | v6c1x9qd | `blackbox` | blackbox "prompt" | positional | — | ✓ (default) | — | — | — | — | — | — | 2026-08-14T00:00:00Z | 2026-08-14T00:00:00Z | active |



---

## Notes

- **Cross-reference:** Use `id` or `uid` to link back to the main [catalog-master-table.md](catalog-master-table.md) for full details (vendor, license, distribution, popularity, etc.)
- **Common subcommands:** Columns `acp`, `chat/run`, `serve`, `config`, `auth` represent functional patterns that recur across multiple tools
- **Headless print:** One-shot non-interactive command patterns for piping/scripting
- **Trust bypass:** Flags that skip permission prompts for automated/trusted environments
- **Validation:** Column count consistency validated via md-spreadsheet helpers

**Last updated:** 2026-08-17
