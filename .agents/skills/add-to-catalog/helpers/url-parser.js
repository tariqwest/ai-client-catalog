/**
 * url-parser.js — Parse a single `input` URL/path into catalog fields for catalog-master-table.md
 *
 * Supported inputs (mirrors SKILL.md §1):
 *  1. GitHub repo URL        e.g. https://github.com/QwenLM/qwen-code
 *  2. Releases page URL      e.g. https://github.com/.../releases
 *  3. Download/listing URL   e.g. https://mimo.xiaomi.com/code
 *  4. Local path             e.g. /tmp/my-tool
 *
 * Output: { id, display_name, type, vendor, homepage_url, github_url, version, distribution, description }
 * `id` is slugified from repo/name and matches catalog-master-table.md's `ID` column.
 * `type` is one of: Terminal CLI | Desktop IDE | Workspace App (auto-detected unless overridden).
 *
 * Offline-safe: when network unavailable, derives fields from URL/path tokens
 * and flags `needsFetch: true` so the caller can enrich via README/package fetch.
 */

function slugify(s) {
  return String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function normalizeUrl(u) {
  try { const url = new URL(u); return url.href.replace(/\/+$/, ''); }
  catch { return u; }
}

function detectType(input, explicit) {
  if (explicit) return explicit;
  const lower = String(input).toLowerCase();
  if (/bolt\.new|bolt\.diy|lovable|v0\.dev|replit/i.test(lower)) return 'Workspace app';
  if (/zed\.dev|zed-industries/i.test(lower)) return 'Desktop IDE';
  if (/tabnine|jetbrains|mistral.*code|codestral/i.test(lower)) return 'Desktop IDE plugin';
  if (/trae|qwen|kimi|codewhale|minimax|mimo|aionui|zed|warp|comate|lingma|codegeex|codex|cody|auggie|jules|copilot/i.test(lower)) return 'Terminal CLI';
  return 'Terminal CLI';
}

/**
 * Parse a GitHub URL like https://github.com/<owner>/<repo>[/*] or codeberg etc.
 * Returns { owner, repo, subpath, homepage_url, github_url } or null.
 */
function parseGithubUrl(input) {
  const m = String(input).match(/^https?:\/\/github\.com\/([^\/\s]+)\/([^\/\s#?]+)(?:\/([^#?\s]*))?/i);
  if (!m) return null;
  const owner = m[1];
  const repo = m[2].replace(/\.git$/, '');
  const subpath = (m[3] || '').replace(/\/+$/, '');
  const github_url = `https://github.com/${owner}/${repo}`;
  const homepage_url = github_url; // default; caller may override with mimo.xiaomi.com etc.
  return { owner, repo, subpath, github_url, homepage_url };
}

/**
 * Minimal vendor inference from URL/host.
 */
function inferVendor(input) {
  const hosts = {
    'mimo.xiaomi.com': 'Xiaomi/MiMo', 'xiaomi.com': 'Xiaomi',
    'qwenlm.github.io': 'Qwen/Alibaba', 'qwenlm': 'Qwen/Alibaba', 'qwen.ai': 'Qwen/Alibaba',
    'moonshot.cn': 'Moonshot AI', 'moonshot-ai': 'Moonshot AI', 'kimi.com': 'Moonshot AI',
    'bytedance': 'ByteDance', 'trae.ai': 'ByteDance',
    'minimax': 'MiniMax', 'deepseek': 'DeepSeek',
    'baidu.com': 'Baidu', 'aliyun.com': 'Alibaba',
    'zhipuai': 'Zhipu AI / Z.AI', 'z.ai': 'Zhipu AI',
    'anysphere': 'Anysphere', 'cursor.com': 'Anysphere',
    'warp.dev': 'Warp',
    'aionui.com': 'AionUi',
    'gitlawb': 'GitLawb',
    // Added for 2026 peer pass (major tech + EU + high-momentum startups)
    'openai.com': 'OpenAI', 'openai/codex': 'OpenAI',
    'jules.google.com': 'Google', 'jules.google': 'Google', 'google/jules': 'Google',
    'zed.dev': 'Zed Industries', 'zed-industries': 'Zed Industries',
    'mistral.ai': 'Mistral AI', 'codestral': 'Mistral AI',
    'jetbrains.com': 'JetBrains', 'jetbrains': 'JetBrains',
    'augmentcode.com': 'Augment Code', 'augmentcode': 'Augment Code', 'auggie': 'Augment Code',
    'tabnine.com': 'Tabnine', 'tabnine': 'Tabnine',
    'stackblitz': 'StackBlitz', 'bolt.new': 'StackBlitz', 'bolt.diy': 'StackBlitz',
    'lovable.dev': 'Lovable', 'lovable': 'Lovable',
    'v0.dev': 'Vercel', 'vercel.com': 'Vercel',
    'replit.com': 'Replit', 'replit': 'Replit',
    'supermaven.com': 'Supermaven', 'supermaven': 'Supermaven',
    'sourcegraph.com': 'Sourcegraph', 'sourcegraph/cody': 'Sourcegraph',
    'github.com/features/copilot': 'Microsoft/GitHub', 'github/copilot': 'Microsoft/GitHub',
  };
  const lower = String(input).toLowerCase();
  for (const [k, v] of Object.entries(hosts)) if (lower.includes(k)) return v;
  const gh = parseGithubUrl(input);
  if (gh) {
    // Capitalize known orgs
    const ownerMap = { 'openai': 'OpenAI', 'sourcegraph': 'Sourcegraph', 'zed-industries': 'Zed Industries', 'stackblitz-labs': 'StackBlitz', 'augmentcode': 'Augment Code' };
    if (ownerMap[gh.owner.toLowerCase()]) return ownerMap[gh.owner.toLowerCase()];
    return gh.owner;
  }
  return '';
}

/**
 * Main entry: parse `input` (URL or local path) into catalog-master-table fields.
 * @param {string} input
 * @param {{ type?: string }} opts — optional explicit type override
 */
function parseInput(input, opts = {}) {
  const raw = String(input).trim();
  const isLocal = raw.startsWith('/') || raw.startsWith('.');
  const type = detectType(raw, opts.type);
  const gh = !isLocal ? parseGithubUrl(raw) : null;
  const isReleases = /\/releases\/?(?:\?.*)?$/.test(raw);

  if (gh) {
    const id = slugify(gh.repo);
    const display_name = gh.repo;
    return {
      input: raw,
      kind: isReleases ? 'github-releases' : 'github-repo',
      id: `\`${id}\``,
      display_name,
      type,
      vendor: inferVendor(raw),
      homepage_url: gh.homepage_url,
      github_url: gh.github_url,
      version: '',
      distribution: '',
      description: '',
      needsFetch: true,
      owner: gh.owner,
      repo: gh.repo,
    };
  }

  if (!isLocal && /^https?:\/\//i.test(raw)) {
    // Known product hosts → stable IDs (avoid `jules-google-com` / `zed-dev` drift)
    const knownIds = {
      'jules.google.com': 'jules', 'jules.google': 'jules',
      'zed.dev': 'zed', 'zed-industries': 'zed',
      'bolt.new': 'bolt-new', 'bolt.diy': 'bolt-diy', 'stackblitz-labs/bolt.diy': 'bolt-diy',
      'lovable.dev': 'lovable', 'v0.dev': 'v0',
      'replit.com': 'replit', 'supermaven.com': 'supermaven',
      'tabnine.com': 'tabnine-cli', 'www.tabnine.com': 'tabnine-cli',
      'mistral.ai': 'codestral', 'codestral': 'codestral',
      'jetbrains.com': 'jetbrains-ai', 'www.jetbrains.com': 'jetbrains-ai',
    };
    const lowerRaw = raw.toLowerCase();
    for (const [k, v] of Object.entries(knownIds)) if (lowerRaw.includes(k)) {
      return {
        input: raw,
        kind: 'download-page',
        id: `\`${v}\``,
        display_name: v,
        type,
        vendor: inferVendor(raw),
        homepage_url: normalizeUrl(raw),
        github_url: '—', // closed / not GitHub
        version: '',
        distribution: '',
        description: '',
        needsFetch: true,
      };
    }
    // Generic download/listing URL — derive id from last path segment or host
    let host, last;
    try {
      const u = new URL(raw);
      host = u.hostname;
      last = u.pathname.split('/').filter(Boolean).pop() || host;
    } catch { host = raw; last = raw; }
    const id = slugify(last || host);
    return {
      input: raw,
      kind: 'download-page',
      id: `\`${id}\``,
      display_name: last || host,
      type,
      vendor: inferVendor(raw),
      homepage_url: normalizeUrl(raw),
      github_url: '—',
      version: '',
      distribution: '',
      description: '',
      needsFetch: true,
    };
  }

  if (isLocal) {
    const base = raw.split('/').filter(Boolean).pop() || raw;
    return {
      input: raw,
      kind: 'local-path',
      id: `\`${slugify(base)}\``,
      display_name: base,
      type,
      vendor: inferVendor(raw),
      homepage_url: '',
      github_url: '',
      version: '',
      distribution: '',
      description: '',
      needsFetch: true,
    };
  }

  return {
    input: raw,
    kind: 'unknown',
    id: `\`${slugify(raw).slice(0, 32)}\``,
    display_name: raw,
    type,
    vendor: '',
    homepage_url: '',
    github_url: '',
    version: '',
    distribution: '',
    description: '',
    needsFetch: false,
  };
}

/**
 * Map parseInput output to catalog-master-table.md row shape (normalized keys).
 * The helper `md-table.js` expects keys like: id, display_name, type, vendor, homepage_url, github_url, ...
 * We provide sensible defaults so the table constraint (required `id`) always passes;
 * caller should enrich `version`/`distribution`/`description` by fetching README/releases.
 */
function toTableRow(parsed, extras = {}) {
  // Normalize to match master table headers (see catalog-master-table.md)
  return {
    id: parsed.id,
    display_name: extras.display_name || parsed.display_name,
    vendor: extras.vendor || parsed.vendor,
    type: extras.type || parsed.type,
    homepage_url: extras.homepage_url || parsed.homepage_url,
    github_url: extras.github_url || parsed.github_url,
    version: extras.version || parsed.version,
    distribution: extras.distribution || parsed.distribution,
    description: extras.description || parsed.description,
  };
}

module.exports = { parseInput, toTableRow, parseGithubUrl, inferVendor, slugify, normalizeUrl };

if (require.main === module) {
  const input = process.argv[2];
  if (!input) {
    console.error('Usage: node helpers/url-parser.js <url-or-path> [--type <Terminal CLI|Desktop IDE|Workspace App>]');
    process.exit(1);
  }
  const typeIdx = process.argv.indexOf('--type');
  const type = typeIdx >= 0 ? process.argv[typeIdx + 1] : undefined;
  const parsed = parseInput(input, { type });
  console.log(JSON.stringify({ parsed, row: toTableRow(parsed) }, null, 2));
}
