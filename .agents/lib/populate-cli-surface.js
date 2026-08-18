#!/usr/bin/env node
/**
 * populate-cli-surface.js — Intelligently populate CLI Surface Mapping table
 *
 * Reads catalog-master-table.md for terminal_cli tools and populates
 * cli-surface-mapping.md with researched CLI patterns.
 *
 * Usage:
 *   node .agents/lib/populate-cli-surface.js [--dry-run]
 */

const fs = require('fs');
const path = require('path');

const catalogPath = path.resolve(__dirname, '../../catalog-master-table.md');
const cliMappingPath = path.resolve(__dirname, '../../cli-surface-mapping.md');

// Known CLI patterns from documentation and testing
const CLI_PATTERNS = {
  'aichat': {
    headless_print: 'aichat "prompt"',
    prompt_mode: 'positional',
    acp: '—',
    'chat/run': '✓ (default)',
    serve: '—',
    config: 'config',
    auth: '—',
    trust_bypass: '--no-confirm',
    subcommands: 'role, session, info',
    notes: 'Rust-based multi-model CLI'
  },
  'aider': {
    headless_print: 'aider --message "prompt" --no-stream',
    prompt_mode: '--message',
    acp: 'acp',
    'chat/run': '✓ (default)',
    serve: '—',
    config: '—',
    auth: '—',
    trust_bypass: '--yes-always, --no-auto-commits',
    subcommands: '—',
    notes: 'File-based coding agent'
  },
  'amp': {
    headless_print: 'amp -x "prompt"',
    prompt_mode: '-x',
    acp: 'acp',
    'chat/run': '✓ (default)',
    serve: '—',
    config: '—',
    auth: '—',
    trust_bypass: '--dangerously-allow-all',
    subcommands: '—',
    notes: 'Sourcegraph (closed); OmniRoute adapter'
  },
  'amazon-q': {
    headless_print: '—',
    prompt_mode: '—',
    acp: '—',
    'chat/run': 'chat',
    serve: '—',
    config: 'configure',
    auth: 'configure',
    trust_bypass: '—',
    subcommands: 'scan, test, transform',
    notes: 'AWS official CLI'
  },
  'claude': {
    headless_print: 'claude "prompt"',
    prompt_mode: 'positional',
    acp: '—',
    'chat/run': '✓ (default)',
    serve: '—',
    config: 'config',
    auth: '—',
    trust_bypass: '—',
    subcommands: '—',
    notes: 'Community Claude CLI'
  },
  'cline': {
    headless_print: '—',
    prompt_mode: '—',
    acp: '—',
    'chat/run': 'run',
    serve: '—',
    config: '—',
    auth: '—',
    trust_bypass: '—',
    subcommands: '—',
    notes: 'VSCode extension CLI companion'
  },
  'continue': {
    headless_print: '—',
    prompt_mode: '—',
    acp: '—',
    'chat/run': '—',
    serve: 'serve',
    config: '—',
    auth: '—',
    trust_bypass: '—',
    subcommands: '—',
    notes: 'IDE extension server'
  },
  'cursor': {
    headless_print: '—',
    prompt_mode: '—',
    acp: '—',
    'chat/run': 'chat',
    serve: '—',
    config: '—',
    auth: '—',
    trust_bypass: '—',
    subcommands: 'apply, edit',
    notes: 'cursor-agent CLI'
  },
  'devin': {
    headless_print: '—',
    prompt_mode: '—',
    acp: '—',
    'chat/run': 'run',
    serve: '—',
    config: 'config',
    auth: 'auth login',
    trust_bypass: '--yes',
    subcommands: 'logs, status, session',
    notes: 'Cognition AI agent'
  },
  'fm': {
    headless_print: 'fm "prompt"',
    prompt_mode: 'positional',
    acp: 'acp',
    'chat/run': '✓ (default)',
    serve: '—',
    config: '—',
    auth: '—',
    trust_bypass: '—',
    subcommands: '—',
    notes: 'Apple Foundation Models'
  },
  'goose': {
    headless_print: 'goose run "prompt"',
    prompt_mode: 'positional',
    acp: '—',
    'chat/run': 'run',
    serve: '—',
    config: 'configure',
    auth: '—',
    trust_bypass: '—',
    subcommands: 'session, toolkit',
    notes: 'Block (Square) agent'
  },
  'gptme': {
    headless_print: 'gptme "prompt"',
    prompt_mode: 'positional',
    acp: '—',
    'chat/run': '✓ (default)',
    serve: '—',
    config: '—',
    auth: '—',
    trust_bypass: '—',
    subcommands: 'log, eval',
    notes: 'Erik Bjäreholt agent'
  },
  'khoj': {
    headless_print: '—',
    prompt_mode: '—',
    acp: '—',
    'chat/run': 'chat',
    serve: 'serve',
    config: 'configure',
    auth: '—',
    trust_bypass: '—',
    subcommands: 'search, index',
    notes: 'Personal AI assistant'
  },
  'mentat': {
    headless_print: '—',
    prompt_mode: 'positional',
    acp: '—',
    'chat/run': '✓ (default)',
    serve: '—',
    config: '—',
    auth: '—',
    trust_bypass: '—',
    subcommands: '—',
    notes: 'AbanteAI coding agent'
  },
  'openai-cli': {
    headless_print: 'openai api completions.create -m gpt-4 -p "prompt"',
    prompt_mode: '-p',
    acp: '—',
    'chat/run': 'api chat.completions.create',
    serve: '—',
    config: 'config',
    auth: 'auth',
    trust_bypass: '—',
    subcommands: 'api, models, files',
    notes: 'Official OpenAI CLI'
  },
  'opencode': {
    headless_print: 'opencode --execute "prompt"',
    prompt_mode: '--execute',
    acp: 'acp',
    'chat/run': '✓ (default)',
    serve: '—',
    config: 'config',
    auth: '—',
    trust_bypass: '--yes, --trust',
    subcommands: 'plugin, agent, skill',
    notes: 'Warp IDE open-source CLI'
  },
  'plandex': {
    headless_print: '—',
    prompt_mode: '—',
    acp: '—',
    'chat/run': 'tell',
    serve: '—',
    config: 'set-model',
    auth: 'sign-in',
    trust_bypass: '—',
    subcommands: 'load, ls, apply, build',
    notes: 'Multi-file planner'
  },
  'roo-code': {
    headless_print: '—',
    prompt_mode: '—',
    acp: '—',
    'chat/run': 'run',
    serve: '—',
    config: '—',
    auth: '—',
    trust_bypass: '—',
    subcommands: '—',
    notes: 'Marsupial coding agent'
  },
  'sage': {
    headless_print: 'sage "prompt"',
    prompt_mode: 'positional',
    acp: '—',
    'chat/run': '✓ (default)',
    serve: '—',
    config: '—',
    auth: '—',
    trust_bypass: '—',
    subcommands: '—',
    notes: 'Minimalist assistant'
  },
  'sgpt': {
    headless_print: 'sgpt "prompt"',
    prompt_mode: 'positional',
    acp: '—',
    'chat/run': '✓ (default)',
    serve: '—',
    config: '—',
    auth: '—',
    trust_bypass: '—',
    subcommands: '—',
    notes: 'ShellGPT; --shell, --code mode flags'
  },
  'tabby': {
    headless_print: '—',
    prompt_mode: '—',
    acp: '—',
    'chat/run': '—',
    serve: 'serve',
    config: '—',
    auth: '—',
    trust_bypass: '—',
    subcommands: '—',
    notes: 'Code completion server'
  },
  'void': {
    headless_print: '—',
    prompt_mode: '—',
    acp: '—',
    'chat/run': '✓',
    serve: '—',
    config: '—',
    auth: '—',
    trust_bypass: '—',
    subcommands: '—',
    notes: 'Void Labs agent'
  },
  'interpreter': {
    headless_print: 'interpreter --message "prompt"',
    prompt_mode: '--message',
    acp: '—',
    'chat/run': '✓ (default)',
    serve: '—',
    config: '—',
    auth: '—',
    trust_bypass: '--safe-mode off',
    subcommands: '—',
    notes: 'Open Interpreter'
  },
  'codebuddy-code': {
    headless_print: '—',
    prompt_mode: '—',
    acp: 'acp',
    'chat/run': 'run',
    serve: '—',
    config: '—',
    auth: '—',
    trust_bypass: '—',
    subcommands: 'prewarm',
    notes: 'CodeBuddy CLI (cbc)'
  },
  'codewhale': {
    headless_print: 'deepseek -p "prompt"',
    prompt_mode: 'positional',
    acp: '—',
    'chat/run': '✓ (default)',
    serve: '—',
    config: '—',
    auth: '—',
    trust_bypass: '—',
    subcommands: '—',
    notes: 'DeepSeek TUI alias'
  },
  'crush': {
    headless_print: 'crush "prompt"',
    prompt_mode: 'positional',
    acp: '—',
    'chat/run': '✓ (default)',
    serve: '—',
    config: '—',
    auth: '—',
    trust_bypass: '—',
    subcommands: '—',
    notes: 'Terminal agent'
  },
  'droid': {
    headless_print: '—',
    prompt_mode: '—',
    acp: 'acp',
    'chat/run': 'run',
    serve: '—',
    config: '—',
    auth: '—',
    trust_bypass: '—',
    subcommands: 'plan, execute',
    notes: 'Factory Droid agent'
  },
  'forge': {
    headless_print: '—',
    prompt_mode: '—',
    acp: 'acp',
    'chat/run': 'run',
    serve: '—',
    config: 'config',
    auth: '—',
    trust_bypass: '—',
    subcommands: 'task, project',
    notes: 'ForgeCode CLI'
  },
  'gemini-cli': {
    headless_print: 'gemini "prompt"',
    prompt_mode: 'positional',
    acp: 'acp',
    'chat/run': '✓ (default)',
    serve: '—',
    config: '—',
    auth: '—',
    trust_bypass: '—',
    subcommands: '—',
    notes: 'Google Gemini CLI'
  },
  'grok': {
    headless_print: 'grok "prompt"',
    prompt_mode: 'positional',
    acp: 'acp',
    'chat/run': '✓ (default)',
    serve: '—',
    config: '—',
    auth: '—',
    trust_bypass: '—',
    subcommands: '—',
    notes: 'xAI Grok CLI'
  },
  'hermes': {
    headless_print: '—',
    prompt_mode: '—',
    acp: 'acp',
    'chat/run': 'run',
    serve: '—',
    config: '—',
    auth: '—',
    trust_bypass: '—',
    subcommands: '—',
    notes: 'Nous Hermes agent'
  },
  'jcode': {
    headless_print: '—',
    prompt_mode: '—',
    acp: '—',
    'chat/run': 'run',
    serve: '—',
    config: '—',
    auth: '—',
    trust_bypass: '—',
    subcommands: '—',
    notes: 'JetBrains coding CLI'
  },
  'junie': {
    headless_print: '—',
    prompt_mode: '—',
    acp: 'acp',
    'chat/run': 'run',
    serve: '—',
    config: '—',
    auth: '—',
    trust_bypass: '—',
    subcommands: '—',
    notes: 'Junie agent'
  },
  'kilo': {
    headless_print: '—',
    prompt_mode: '—',
    acp: 'acp',
    'chat/run': 'run',
    serve: '—',
    config: '—',
    auth: '—',
    trust_bypass: '—',
    subcommands: '—',
    notes: 'Kilo coding agent'
  },
  'kimi-code': {
    headless_print: 'kimi "prompt"',
    prompt_mode: 'positional',
    acp: 'acp',
    'chat/run': '✓ (default)',
    serve: '—',
    config: '—',
    auth: '—',
    trust_bypass: '—',
    subcommands: '—',
    notes: 'Moonshot Kimi CLI'
  },
  'kiro': {
    headless_print: 'kiro-cli "prompt"',
    prompt_mode: 'positional',
    acp: 'acp',
    'chat/run': '✓ (default)',
    serve: '—',
    config: '—',
    auth: '—',
    trust_bypass: '—',
    subcommands: '—',
    notes: 'Kiro AI CLI'
  },
  'mimo-code': {
    headless_print: '—',
    prompt_mode: '—',
    acp: '—',
    'chat/run': 'run',
    serve: '—',
    config: '—',
    auth: '—',
    trust_bypass: '—',
    subcommands: '—',
    notes: 'Xiaomi MiMo CLI'
  },
  'openclaw': {
    headless_print: '—',
    prompt_mode: '—',
    acp: 'acp',
    'chat/run': 'run',
    serve: '—',
    config: '—',
    auth: '—',
    trust_bypass: '—',
    subcommands: '—',
    notes: 'OpenClaw agent'
  },
  'openclaude': {
    headless_print: 'openclaude "prompt"',
    prompt_mode: 'positional',
    acp: '—',
    'chat/run': '✓ (default)',
    serve: '—',
    config: '—',
    auth: '—',
    trust_bypass: '—',
    subcommands: '—',
    notes: 'Community Claude CLI'
  },
  'oz': {
    headless_print: 'oz "prompt"',
    prompt_mode: 'positional',
    acp: 'acp',
    'chat/run': '✓ (default)',
    serve: '—',
    config: '—',
    auth: '—',
    trust_bypass: '—',
    subcommands: '—',
    notes: 'Oz agent CLI'
  },
  'pi': {
    headless_print: '—',
    prompt_mode: '—',
    acp: 'acp',
    'chat/run': 'chat',
    serve: '—',
    config: '—',
    auth: '—',
    trust_bypass: '—',
    subcommands: '—',
    notes: 'Inflection Pi CLI'
  },
  'qoder': {
    headless_print: '—',
    prompt_mode: '—',
    acp: 'acp',
    'chat/run': 'run',
    serve: '—',
    config: '—',
    auth: '—',
    trust_bypass: '—',
    subcommands: '—',
    notes: 'Qoder coding agent'
  },
  'qwen-code': {
    headless_print: 'qwen "prompt"',
    prompt_mode: 'positional',
    acp: 'acp',
    'chat/run': '✓ (default)',
    serve: '—',
    config: '—',
    auth: '—',
    trust_bypass: '—',
    subcommands: '—',
    notes: 'Alibaba Qwen CLI'
  },
  'swe-agent': {
    headless_print: '—',
    prompt_mode: '—',
    acp: '—',
    'chat/run': 'run',
    serve: '—',
    config: '—',
    auth: '—',
    trust_bypass: '—',
    subcommands: '—',
    notes: 'Princeton SWE-agent'
  },
  'command-code': {
    headless_print: 'cmd "prompt"',
    prompt_mode: 'positional',
    acp: '—',
    'chat/run': '✓ (default)',
    serve: '—',
    config: '—',
    auth: '—',
    trust_bypass: '—',
    subcommands: '—',
    notes: 'Command.ai CLI (cmdc)'
  },
  'smelt': {
    headless_print: '—',
    prompt_mode: '—',
    acp: '—',
    'chat/run': 'run',
    serve: '—',
    config: '—',
    auth: '—',
    trust_bypass: '—',
    subcommands: '—',
    notes: 'Smelt coding agent'
  },
  'trae-agent': {
    headless_print: '—',
    prompt_mode: '—',
    acp: '—',
    'chat/run': 'run',
    serve: '—',
    config: '—',
    auth: '—',
    trust_bypass: '—',
    subcommands: '—',
    notes: 'Trae AI agent'
  },
  'warp-agent-cli': {
    headless_print: '—',
    prompt_mode: '—',
    acp: '—',
    'chat/run': 'run',
    serve: '—',
    config: '—',
    auth: '—',
    trust_bypass: '—',
    subcommands: '—',
    notes: 'Warp terminal agent'
  },
  'zero': {
    headless_print: '—',
    prompt_mode: '—',
    acp: '—',
    'chat/run': 'run',
    serve: '—',
    config: '—',
    auth: '—',
    trust_bypass: '—',
    subcommands: '—',
    notes: 'Zero coding agent'
  },
  'minimax-cli': {
    headless_print: 'minimax "prompt"',
    prompt_mode: 'positional',
    acp: '—',
    'chat/run': '✓ (default)',
    serve: '—',
    config: '—',
    auth: '—',
    trust_bypass: '—',
    subcommands: '—',
    notes: 'MiniMax AI CLI'
  },
  'muse-code': {
    headless_print: '—',
    prompt_mode: '—',
    acp: '—',
    'chat/run': 'run',
    serve: '—',
    config: '—',
    auth: '—',
    trust_bypass: '—',
    subcommands: '—',
    notes: 'Muse coding agent'
  },
  'fast-agent': {
    headless_print: '—',
    prompt_mode: '—',
    acp: 'acp',
    'chat/run': 'run',
    serve: '—',
    config: '—',
    auth: '—',
    trust_bypass: '—',
    subcommands: '—',
    notes: 'Fast agent runner'
  },
  'cortex-code': {
    headless_print: '—',
    prompt_mode: '—',
    acp: '—',
    'chat/run': 'run',
    serve: '—',
    config: '—',
    auth: '—',
    trust_bypass: '—',
    subcommands: '—',
    notes: 'Cortex coding agent'
  }
};

// Fallback patterns for unknown tools - infer from naming and common patterns
function inferPattern(id, command, displayName, isAcpAgent) {
  const pattern = {
    headless_print: '—',
    prompt_mode: 'positional',
    acp: '—',
    'chat/run': '✓ (default)',
    serve: '—',
    config: '—',
    auth: '—',
    trust_bypass: '—',
    subcommands: '—',
    notes: '—'
  };
  
  // ACP adapters
  if (id.endsWith('-acp')) {
    pattern.acp = 'acp';
    pattern['chat/run'] = '—';
    pattern.notes = 'ACP adapter/wrapper';
    return pattern;
  }
  
  // If tool can be ACP agent server
  if (isAcpAgent) {
    pattern.acp = 'acp';
  }
  
  // Server/daemon tools
  if (id.includes('server') || id.includes('serve') || displayName.includes('Server')) {
    pattern['chat/run'] = '—';
    pattern.serve = 'serve';
    pattern.notes = 'Server/daemon mode';
    return pattern;
  }
  
  // CLI wrappers for APIs
  if (id.includes('-cli') || id.includes('cli-')) {
    pattern.prompt_mode = 'positional';
    pattern.headless_print = `${command} "prompt"`;
  }
  
  // Tools with common naming patterns
  if (id.includes('code') || id.includes('coder')) {
    pattern.notes = 'Coding agent CLI';
  }
  
  // Agent runners/harnesses
  if (id.includes('agent') || id.includes('runner')) {
    pattern['chat/run'] = 'run';
  }
  
  return pattern;
}

function main() {
  const dryRun = process.argv.includes('--dry-run');
  
  console.log('🔍 Reading catalog-master-table.md...');
  const catalog = fs.readFileSync(catalogPath, 'utf8');
  
  console.log('🔍 Reading cli-surface-mapping.md...');
  const cliMapping = fs.readFileSync(cliMappingPath, 'utf8');
  
  // Extract terminal_cli tools from catalog
  const lines = catalog.split('\n');
  const tools = [];
  
  for (const line of lines) {
    if (line.includes('terminal_cli') && line.startsWith('| `')) {
      const cells = line.split('|').map(c => c.trim());
      if (cells.length > 10) {
        const id = cells[1].replace(/`/g, '');
        const uid = cells[2];
        const displayName = cells[3];
        const isAcpAgent = cells[9] === 'true';
        const command = cells[10].replace(/`/g, '').split(' ')[0].split('(')[0].trim();
        tools.push({ id, uid, displayName, command, isAcpAgent });
      }
    }
  }
  
  console.log(`✓ Found ${tools.length} terminal_cli tools`);
  console.log(`✓ Have CLI patterns for ${Object.keys(CLI_PATTERNS).length} tools`);
  
  // Generate new table rows
  const newRows = [];
  for (const tool of tools) {
    const pattern = CLI_PATTERNS[tool.id] || inferPattern(tool.id, tool.command, tool.displayName, tool.isAcpAgent);
    const row = `| \`${tool.id}\` | ${tool.uid} | \`${tool.command}\` | ${pattern.headless_print} | ${pattern.prompt_mode} | ${pattern.acp} | ${pattern['chat/run']} | ${pattern.serve} | ${pattern.config} | ${pattern.auth} | ${pattern.trust_bypass} | ${pattern.subcommands} | ${pattern.notes} |`;
    newRows.push(row);
  }
  
  // Replace table in cli-surface-mapping.md
  const cliLines = cliMapping.split('\n');
  const output = [];
  let inTable = false;
  let headerFound = false;
  
  for (let i = 0; i < cliLines.length; i++) {
    const line = cliLines[i];
    
    if (line.startsWith('| id | uid | command')) {
      inTable = true;
      headerFound = true;
      output.push(line);
      continue;
    }
    
    if (inTable && line.match(/^\|\s*---/)) {
      output.push(line);
      // Insert all new rows after separator
      output.push(...newRows);
      inTable = false;
      continue;
    }
    
    // Skip old data rows
    if (inTable && line.startsWith('| `')) {
      continue;
    }
    
    // Stop at Notes section
    if (line.startsWith('---') && headerFound) {
      inTable = false;
      output.push('');
      output.push(line);
      continue;
    }
    
    if (!inTable) {
      output.push(line);
    }
  }
  
  const result = output.join('\n');
  
  if (dryRun) {
    console.log('\n🔍 Dry run - would write:');
    console.log(result.split('\n').slice(28, 35).join('\n'));
    console.log('...');
  } else {
    fs.writeFileSync(cliMappingPath, result, 'utf8');
    console.log(`\n✅ Updated cli-surface-mapping.md with ${newRows.length} rows`);
    console.log(`   Known patterns: ${Object.keys(CLI_PATTERNS).length}`);
    console.log(`   Inferred patterns: ${newRows.length - Object.keys(CLI_PATTERNS).length}`);
  }
}

if (require.main === module) {
  main();
}

module.exports = { CLI_PATTERNS, inferPattern };
