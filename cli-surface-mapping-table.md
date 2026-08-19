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
| 1 | `aichat` | GVDI-FURG | `aichat` | aichat "prompt" | positional | — | ✓ (default) | — | config | — | --no-confirm | role, session, info | Rust-based multi-model CLI | 2026-08-11T10:33:39Z | 2026-08-11T10:33:39Z | active |
| 2 | `amp` | VAZX-ARKQ | `amp` | amp -x "prompt" | -x | acp | ✓ (default) | — | — | — | --dangerously-allow-all | — | Sourcegraph (closed); OmniRoute adapter | 2026-08-11T10:33:39Z | 2026-08-11T10:33:39Z | active |
| 3 | `aider` | CH8O-JXGS | `aider` | aider --message "prompt" --no-stream | --message | acp | ✓ (default) | — | — | — | --yes-always, --no-auto-commits | — | File-based coding agent | 2026-08-11T10:33:39Z | 2026-08-11T10:33:39Z | active |
| 4 | `amazon-q` | P1JU-E7P8 | `q` | — | — | — | chat | — | configure | configure | — | scan, test, transform | AWS official CLI | 2026-08-11T10:33:39Z | 2026-08-11T10:33:39Z | active |
| 5 | `claude` | TJ6C-MPYW | `claude` | claude "prompt" | positional | — | ✓ (default) | — | config | — | — | — | Community Claude CLI | 2026-08-11T10:33:39Z | 2026-08-11T10:33:39Z | active |
| 6 | `cline` | EP26-X895 | `cline` | — | — | — | run | — | — | — | — | — | VSCode extension CLI companion | 2026-08-11T10:33:39Z | 2026-08-11T10:33:39Z | active |
| 7 | `codebuddy-code` | 6XX6-FVS0 | `codebuddy` | — | — | acp | run | — | — | — | — | prewarm | CodeBuddy CLI (cbc) | 2026-08-11T10:33:39Z | 2026-08-11T10:33:39Z | acquired_integrated |
| 8 | `codewhale` | Z4PU-B2RC | `deepseek` | deepseek -p "prompt" | positional | — | ✓ (default) | — | — | — | — | — | DeepSeek TUI alias | 2026-08-11T10:33:39Z | 2026-08-11T10:33:39Z | unknown |
| 9 | `command-code` | HXA4-QNBA | `cmd` | cmd "prompt" | positional | — | ✓ (default) | — | — | — | — | — | Command.ai CLI (cmdc) | 2026-08-11T10:33:39Z | 2026-08-11T10:33:39Z | active |
| 10 | `continue` | 3RDZ-BJEA | `continue` | — | — | — | — | serve | — | — | — | — | IDE extension server | 2026-08-11T10:33:39Z | 2026-08-11T10:33:39Z | active |
| 11 | `crush` | 8N1F-VDH0 | `crush` | crush "prompt" | positional | — | ✓ (default) | — | — | — | — | — | Terminal agent | 2026-08-11T10:33:39Z | 2026-08-11T10:33:39Z | active |
| 12 | `cursor` | RVT8-2V0I | `cursor-agent` | — | — | — | chat | — | — | — | — | apply, edit | cursor-agent CLI | 2026-08-11T10:33:39Z | 2026-08-11T10:33:39Z | active |
| 13 | `devin` | Q3ZL-HLD5 | `devin` | — | — | — | run | — | config | auth login | --yes | logs, status, session | Cognition AI agent | 2026-08-11T10:33:39Z | 2026-08-11T10:33:39Z | active |
| 14 | `droid` | ZI4Z-G1GT | `droid` | — | — | acp | run | — | — | — | — | plan, execute | Factory Droid agent | 2026-08-11T10:33:39Z | 2026-08-11T10:33:39Z | active |
| 15 | `fm` | VN38-5KCG | `fm` | fm "prompt" | positional | acp | ✓ (default) | — | — | — | — | — | Apple Foundation Models | 2026-08-11T10:33:39Z | 2026-08-11T10:33:39Z | active |
| 16 | `forge` | EVX8-4EP8 | `forge` | — | — | acp | run | — | config | — | — | task, project | ForgeCode CLI | 2026-08-11T10:33:39Z | 2026-08-11T10:33:39Z | deprecated |
| 17 | `gemini-cli` | DVEV-MBRU | `gemini` | gemini "prompt" | positional | acp | ✓ (default) | — | — | — | — | — | Google Gemini CLI | 2026-08-11T10:33:39Z | 2026-08-11T10:33:39Z | active |
| 18 | `goose` | 0QRC-TI3D | `goose` | goose run "prompt" | positional | — | run | — | configure | — | — | session, toolkit | Block (Square) agent | 2026-08-11T10:33:39Z | 2026-08-11T10:33:39Z | active |
| 19 | `grok` | J09N-797W | `grok` | grok "prompt" | positional | acp | ✓ (default) | — | — | — | — | — | xAI Grok CLI | 2026-08-11T10:33:39Z | 2026-08-11T10:33:39Z | active |
| 20 | `hermes` | YVY6-P4ZX | `hermes` | — | — | acp | run | — | — | — | — | — | Nous Hermes agent | 2026-08-11T10:33:39Z | 2026-08-11T10:33:39Z | unknown |
| 21 | `interpreter` | 8IW5-414B | `interpreter` | interpreter --message "prompt" | --message | — | ✓ (default) | — | — | — | --safe-mode off | — | Open Interpreter | 2026-08-11T10:33:39Z | 2026-08-11T10:33:39Z | active |
| 22 | `jcode` | 75LS-08F9 | `jcode` | — | — | — | run | — | — | — | — | — | JetBrains coding CLI | 2026-08-11T10:33:39Z | 2026-08-11T10:33:39Z | unknown |
| 23 | `junie` | J1EC-5NXV | `junie` | — | — | acp | run | — | — | — | — | — | Junie agent | 2026-08-11T10:33:39Z | 2026-08-11T10:33:39Z | active |
| 24 | `kilo` | 7VZP-0O7S | `kilo` | — | — | acp | run | — | — | — | — | — | Kilo coding agent | 2026-08-11T10:33:39Z | 2026-08-11T10:33:39Z | active |
| 25 | `kimi-code` | 0HIP-4YE9 | `kimi` | kimi "prompt" | positional | acp | ✓ (default) | — | — | — | — | — | Moonshot Kimi CLI | 2026-08-11T10:33:39Z | 2026-08-11T10:33:39Z | active |
| 26 | `kiro` | KZWA-K7HQ | `kiro-cli` | kiro-cli "prompt" | positional | acp | ✓ (default) | — | — | — | — | — | Kiro AI CLI | 2026-08-11T10:33:39Z | 2026-08-11T10:33:39Z | active |
| 27 | `mimo-code` | PPCP-Y097 | `mimo` | — | — | — | run | — | — | — | — | — | Xiaomi MiMo CLI | 2026-08-11T10:33:39Z | 2026-08-11T10:33:39Z | active |
| 28 | `minimax-cli` | LDRS-YLKM | `mmx` | minimax "prompt" | positional | — | ✓ (default) | — | — | — | — | — | MiniMax AI CLI | 2026-08-11T10:33:39Z | 2026-08-11T10:33:39Z | active |
| 29 | `openclaw` | 4Z0P-NB1W | `openclaw` | — | — | acp | run | — | — | — | — | — | OpenClaw agent | 2026-08-11T10:33:39Z | 2026-08-11T10:33:39Z | unknown |
| 30 | `opencode` | 0D1E-5U0E | `opencode` | opencode --execute "prompt" | --execute | acp | ✓ (default) | — | config | — | --yes, --trust | plugin, agent, skill | Warp IDE open-source CLI | 2026-08-11T10:33:39Z | 2026-08-11T10:33:39Z | active |
| 31 | `openclaude` | NSJ2-JP8K | `openclaude` | openclaude "prompt" | positional | — | ✓ (default) | — | — | — | — | — | Community Claude CLI | 2026-08-11T10:33:39Z | 2026-08-11T10:33:39Z | unknown |
| 32 | `oz` | W8RX-TPMV | `oz` | oz "prompt" | positional | acp | ✓ (default) | — | — | — | — | — | Oz agent CLI | 2026-08-11T10:33:39Z | 2026-08-11T10:33:39Z | active |
| 33 | `pi` | 5R8L-SA22 | `pi` | — | — | acp | chat | — | — | — | — | — | Inflection Pi CLI | 2026-08-11T10:33:39Z | 2026-08-11T10:33:39Z | active |
| 34 | `plandex` | 1S6F-EM10 | `plandex` | — | — | — | tell | — | set-model | sign-in | — | load, ls, apply, build | Multi-file planner | 2026-08-11T10:33:39Z | 2026-08-11T10:33:39Z | active |
| 35 | `qoder` | 5591-MMPD | `qodercli` | — | — | acp | run | — | — | — | — | — | Qoder coding agent | 2026-08-11T10:33:39Z | 2026-08-11T10:33:39Z | active |
| 36 | `qwen-code` | 6PDU-FM4R | `qwen` | qwen "prompt" | positional | acp | ✓ (default) | — | — | — | — | — | Alibaba Qwen CLI | 2026-08-11T10:33:39Z | 2026-08-11T10:33:39Z | active |
| 37 | `sgpt` | S3XQ-FKFC | `sgpt` | sgpt "prompt" | positional | — | ✓ (default) | — | — | — | — | — | ShellGPT; --shell, --code mode flags | 2026-08-11T10:33:39Z | 2026-08-11T10:33:39Z | active |
| 38 | `smelt` | VWAU-XL4R | `smelt` | — | — | — | run | — | — | — | — | — | Smelt coding agent | 2026-08-11T10:33:39Z | 2026-08-11T10:33:39Z | unknown |
| 39 | `swe-agent` | MG4Z-1PJ8 | `sweagent` | — | — | — | run | — | — | — | — | — | Princeton SWE-agent | 2026-08-11T10:33:39Z | 2026-08-11T10:33:39Z | active |
| 40 | `trae-agent` | 27VI-K8WP | `trae-cli` | — | — | — | run | — | — | — | — | — | Trae AI agent | 2026-08-11T10:33:39Z | 2026-08-11T10:33:39Z | active |
| 41 | `warp-agent-cli` | EYYL-2WOO | `warp` | — | — | — | run | — | — | — | — | — | Warp terminal agent | 2026-08-11T10:33:39Z | 2026-08-11T10:33:39Z | active |
| 42 | `zero` | O5JI-J4NC | `zero` | — | — | — | run | — | — | — | — | — | Zero coding agent | 2026-08-11T10:33:39Z | 2026-08-11T10:33:39Z | active |
| 43 | `muse-code` | 5A29-3X5X | `muse` | — | — | — | run | — | — | — | — | — | Muse coding agent | 2026-08-11T10:33:39Z | 2026-08-11T10:33:39Z | active |
| 44 | `fast-agent` | 9B42-WPRW | `fast-agent` | — | — | acp | run | — | — | — | — | — | Fast agent runner | 2026-08-11T10:33:39Z | 2026-08-11T10:33:39Z | active |
| 45 | `gemini` | ZVV0-2MII | `gemini` | — | positional | acp | ✓ (default) | — | — | — | — | — | — | 2026-08-11T10:33:39Z | 2026-08-11T10:33:39Z | active |
| 46 | `amp-acp` | WFO2-L9XX | `amp-acp` | — | positional | acp | — | — | — | — | — | — | ACP adapter/wrapper | 2026-08-11T10:33:39Z | 2026-08-11T10:33:39Z | active |
| 47 | `claude-acp` | CBYT-3Q89 | `claude-acp` | — | positional | acp | — | — | — | — | — | — | ACP adapter/wrapper | 2026-08-11T10:33:39Z | 2026-08-11T10:33:39Z | active |
| 48 | `codex-acp` | MQZ2-DBD2 | `codex-acp` | — | positional | acp | — | — | — | — | — | — | ACP adapter/wrapper | 2026-08-11T10:33:39Z | 2026-08-11T10:33:39Z | active |
| 49 | `cortex-code` | SF75-ILJQ | `cortex` | — | — | — | run | — | — | — | — | — | Cortex coding agent | 2026-08-11T10:33:39Z | 2026-08-11T10:33:39Z | active |
| 50 | `corust-agent` | BM2H-S3IG | `corust` | — | positional | acp | run | — | — | — | — | — | — | 2026-08-11T10:33:39Z | 2026-08-11T10:33:39Z | active |
| 51 | `crow-cli` | PN4Y-RAUC | `crow` | crow "prompt" | positional | acp | ✓ (default) | — | — | — | — | — | — | 2026-08-11T10:33:39Z | 2026-08-11T10:33:39Z | active |
| 52 | `deepagents` | PXIY-JOXM | `deepagents` | — | positional | acp | run | — | — | — | — | — | — | 2026-08-11T10:33:39Z | 2026-08-11T10:33:39Z | active |
| 53 | `dimcode` | 5ZSO-7NLN | `dimcode` | — | positional | acp | ✓ (default) | — | — | — | — | — | Coding agent CLI | 2026-08-11T10:33:39Z | 2026-08-11T10:33:39Z | active |
| 54 | `dirac` | HE0X-4HF3 | `dirac` | — | positional | acp | ✓ (default) | — | — | — | — | — | — | 2026-08-11T10:33:39Z | 2026-08-11T10:33:39Z | active |
| 55 | `glm-acp-agent` | 9K8H-M61Q | `glm-acp-agent` | — | positional | acp | run | — | — | — | — | — | — | 2026-08-11T10:33:39Z | 2026-08-11T10:33:39Z | active |
| 56 | `grok-build` | APTU-7H5M | `grok` | — | positional | acp | ✓ (default) | — | — | — | — | — | — | 2026-08-11T10:33:39Z | 2026-08-11T10:33:39Z | active |
| 57 | `harn` | WOD0-1JKK | `harn` | — | positional | acp | ✓ (default) | — | — | — | — | — | — | 2026-08-11T10:33:39Z | 2026-08-11T10:33:39Z | unknown |
| 58 | `kimi` | ACYL-CIFD | `kimi` | — | positional | acp | ✓ (default) | — | — | — | — | — | — | 2026-08-11T10:33:39Z | 2026-08-11T10:33:39Z | active |
| 59 | `minion-code` | 03I4-CCPB | `minion-code` | — | positional | acp | ✓ (default) | — | — | — | — | — | Coding agent CLI | 2026-08-11T10:33:39Z | 2026-08-11T10:33:39Z | unknown |
| 60 | `mistral-vibe` | 35W8-8JIY | `mistral-vibe` | — | positional | acp | ✓ (default) | — | — | — | — | — | — | 2026-08-11T10:33:39Z | 2026-08-11T10:33:39Z | active |
| 61 | `nova` | 4CG2-S0Y2 | `nova` | — | positional | acp | ✓ (default) | — | — | — | — | — | — | 2026-08-11T10:33:39Z | 2026-08-11T10:33:39Z | active |
| 62 | `poolside` | NLT0-4K2O | `poolside` | — | positional | acp | ✓ (default) | — | — | — | — | — | — | 2026-08-11T10:33:39Z | 2026-08-11T10:33:39Z | active |
| 63 | `sigit` | TX0K-UNZU | `sigit` | — | positional | acp | ✓ (default) | — | — | — | — | — | — | 2026-08-11T10:33:39Z | 2026-08-11T10:33:39Z | active |
| 64 | `stakpak` | FQM4-BQ8F | `stakpak` | — | positional | acp | ✓ (default) | — | — | — | — | — | — | 2026-08-11T10:33:39Z | 2026-08-11T10:33:39Z | active |
| 65 | `vtcode` | ST8W-5R23 | `vtcode` | — | positional | acp | ✓ (default) | — | — | — | — | — | Coding agent CLI | 2026-08-11T10:33:39Z | 2026-08-11T10:33:39Z | unknown |
| 66 | `codex` | T726-CYRK | `codex` | — | positional | acp | ✓ (default) | — | — | — | — | — | Coding agent CLI | 2026-08-11T10:33:39Z | 2026-08-11T10:33:39Z | active |
| 67 | `copilot-cli` | UOYI-QKUD | `copilot` | copilot "prompt" | positional | — | ✓ (default) | — | — | — | — | — | — | 2026-08-11T10:33:39Z | 2026-08-11T10:33:39Z | active |
| 68 | `cody` | TLS8-05RS | `cody` | — | positional | acp | ✓ (default) | — | — | — | — | — | — | 2026-08-11T10:33:39Z | 2026-08-11T10:33:39Z | active |
| 69 | `jules` | MQUP-TYAV | `jules` | — | positional | — | ✓ (default) | — | — | — | — | — | — | 2026-08-11T10:33:39Z | 2026-08-11T10:33:39Z | active |
| 70 | `auggie` | X2UC-ZKXD | `auggie` | — | positional | acp | ✓ (default) | — | — | — | — | — | — | 2026-08-11T10:33:39Z | 2026-08-11T10:33:39Z | active |
| 71 | `tabnine-cli` | V7QZ-YQ11 | `tabnine` | tabnine "prompt" | positional | acp | ✓ (default) | — | — | — | — | — | — | 2026-08-11T10:33:39Z | 2026-08-11T10:33:39Z | active |
| 72 | `oh-my-pi` | BJCD-L1ZV | `omp` | — | positional | acp | ✓ (default) | — | — | — | — | — | — | 2026-08-11T10:33:39Z | 2026-08-11T10:33:39Z | unknown |
| 73 | `antigravity-cli` | Y7SY-9RDT | `antigravity` | antigravity "prompt" | positional | — | ✓ (default) | — | — | — | — | — | — | 2026-08-11T12:04:59Z | 2026-08-11T12:04:59Z | active |
| 74 | `atomic-agent` | 24CH-Y710 | `atomic-agent` | — | positional | — | run | — | — | — | — | — | — | 2026-08-11T12:07:28Z | 2026-08-11T12:07:28Z | active |
| 75 | `ante` | X843-2CGR | `ante` | — | positional | — | ✓ (default) | — | — | — | — | — | — | 2026-08-11T13:42:12Z | 2026-08-11T13:42:12Z | active |
| 76 | `void-cli` | QLXJ-Q9O2 | `void` | void "prompt" | positional | — | ✓ (default) | — | — | — | — | — | — | 2026-08-11T14:48:26Z | 2026-08-11T14:48:26Z | active |
| 77 | `neo` | 85FN-F8SL | `neo` | — | positional | — | ✓ (default) | — | — | — | — | — | — | 2026-08-11T14:48:26Z | 2026-08-11T14:48:26Z | active |
| 78 | `prime-agent` | OLO0-8ELV | `prime-agent` | — | positional | — | run | — | — | — | — | — | — | 2026-08-11T14:48:26Z | 2026-08-11T14:50:44Z | active |
| 79 | `codebuff` | 1ELJ-MMBH | `freebuff` | — | positional | — | ✓ (default) | — | — | — | — | — | Coding agent CLI | 2026-08-11T15:19:33Z | 2026-08-18T00:34:40Z | active |
| 80 | `llm` | Q7M2-K4ZA | `llm` | — | positional | — | ✓ (default) | — | — | — | — | — | — | 2026-08-14T00:00:00Z | 2026-08-14T00:00:00Z | active |
| 81 | `gptme` | R8N3-P5VB | `gptme` | gptme "prompt" | positional | — | ✓ (default) | — | — | — | — | log, eval | Erik Bjäreholt agent | 2026-08-14T00:00:00Z | 2026-08-14T00:00:00Z | active |
| 82 | `blackbox-cli` | V6C1-X9QD | `blackbox` | blackbox "prompt" | positional | — | ✓ (default) | — | — | — | — | — | — | 2026-08-14T00:00:00Z | 2026-08-14T00:00:00Z | active |
| 83 | `deepseek-harness` | PAVY-M44Y | `dsh` | — | positional | acp | ✓ (default) | — | — | — | — | — | — | 2026-08-19T13:00:41Z | 2026-08-19T13:00:41Z | active |



---

## Notes

- **Cross-reference:** Use `id` or `uid` to link back to the main [catalog-master-table.md](catalog-master-table.md) for full details (vendor, license, distribution, popularity, etc.)
- **Common subcommands:** Columns `acp`, `chat/run`, `serve`, `config`, `auth` represent functional patterns that recur across multiple tools
- **Headless print:** One-shot non-interactive command patterns for piping/scripting
- **Trust bypass:** Flags that skip permission prompts for automated/trusted environments
- **Validation:** Column count consistency validated via md-spreadsheet helpers

**Last updated:** 2026-08-17
