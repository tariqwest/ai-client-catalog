#!/usr/bin/env node
/**
 * route-batch.js — merged entry point for add-to-catalog
 * Auto-detects single vs batch and delegates accordingly.
 * Used by the merged add-to-catalog skill (§0).
 *
 * API: accepts either {input: string} or {inputs: string[]} or CLI flags
 *   --input "single"  --inputs '["a","b"]'  --type X --update --dryRun
 *
 * Behavior:
 *  - if `inputs` array provided -> batch (batch.js)
 *  - else if `input` contains commas/newlines or >=2 URLs -> batch (split)
 *  - else if `input` is a single listing page URL that scrapes -> batch (batch.js will expand)
 *  - else -> single-item (url-parser.js)
 */
const { execSync } = require('child_process');
const path = require('path');

function parseCli() {
  const args = process.argv.slice(2);
  const get = (f) => { const i=args.indexOf(f); return i>=0?args[i+1]:null; };
  const has = (f) => args.includes(f);
  // support both --input and --inputs, and --dryRun/--dry-run
  let input = get('--input');
  let inputsRaw = get('--inputs');
  let type = get('--type');
  let update = has('--update');
  let dryRun = has('--dryRun') || has('--dry-run');
  // also allow JSON on stdin as fallback? not needed
  return { input, inputsRaw, type, update, dryRun, args };
}

function normalizeToBatch(input, inputsRaw) {
  let inputs = null;
  if (inputsRaw) {
    try {
      const parsed = JSON.parse(inputsRaw);
      if (Array.isArray(parsed)) inputs = parsed;
      else inputs = [inputsRaw];
    } catch {
      // if not JSON, treat as comma/newline separated
      inputs = inputsRaw.split(/[\n,]+/).map(s=>s.trim()).filter(Boolean);
    }
    return inputs;
  }
  if (input) {
    const trimmed = input.trim();
    // detect multiple entries inside single string
    const commaParts = trimmed.split(/[\n,]+/).map(s=>s.trim()).filter(Boolean);
    const urlMatches = trimmed.match(/https?:\/\/\S+/g) || [];
    // heuristic for listing pages that should be batch even as single token
    const isListing = /awesome|every-ai-coding|best-ai-|listicle|dev\.to|github\.com\/.+\/awesome/i.test(trimmed) && trimmed.startsWith('http');
    if (isListing) return [trimmed]; // let batch.js scrape
    if (commaParts.length > 1) return commaParts;
    if (urlMatches.length > 1) return urlMatches;
    // whitespace-separated names like "https://a https://b" without commas
    const wsParts = trimmed.split(/\s+/).filter(Boolean);
    if (wsParts.length > 1 && wsParts.some(p=>p.startsWith('http'))) return wsParts;
  }
  return null;
}

async function main() {
  const { input, inputsRaw, type, update, dryRun } = parseCli();
  const batchInputs = normalizeToBatch(input, inputsRaw);
  if (batchInputs) {
    const batchJs = path.resolve(__dirname, '../../batch-add-to-catalog/helpers/batch.js');
    const args = [`--inputs`, JSON.stringify(batchInputs)];
    if (type) args.push('--type', type);
    if (update) args.push('--update');
    if (dryRun) args.push('--dry-run');
    console.error(`[route-batch] batch detected (${batchInputs.length} inputs) → batch.js`);
    execSync(`node ${JSON.stringify(batchJs)} ${args.map(a=>JSON.stringify(a)).join(' ')}`, { stdio: 'inherit' });
  } else {
    const normalized = input || (inputsRaw ? JSON.parse(inputsRaw)[0] : null);
    if (!normalized) {
      console.error('Usage: node helpers/route-batch.js --input "URL" | --inputs \'["url1","url2"]\' [--type X] [--update] [--dryRun]');
      process.exit(1);
    }
    const parserJs = path.resolve(__dirname, 'url-parser.js');
    const typeArg = type ? ` --type ${JSON.stringify(type)}` : '';
    console.error(`[route-batch] single detected → url-parser.js`);
    execSync(`node ${JSON.stringify(parserJs)} ${JSON.stringify(normalized)}${typeArg}`, { stdio: 'inherit' });
    console.error('[route-batch] Next: run md-table.js --file <catalog> --upsert <row> (see SKILL.md §6)');
  }
}

if (require.main === module) {
  main().catch(e=>{ console.error(e); process.exit(1); });
}
module.exports = { normalizeToBatch };
