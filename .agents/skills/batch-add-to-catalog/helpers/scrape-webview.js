#!/usr/bin/env bun
/**
 * scrape-webview.js — JS-rendered page fetcher via Bun.WebView
 * Usage: bun helpers/scrape-webview.js "https://example.com"
 * Prints rendered document.documentElement.outerHTML to stdout.
 * Used by helpers/batch.js when curl yields too few candidates and the
 * page looks like an SPA (empty root + _next/data, etc.).
 */

const url = process.argv[2];
if (!url || !url.startsWith('http')) {
  console.error('Usage: bun helpers/scrape-webview.js "https://..."');
  process.exit(1);
}

const width = parseInt(process.env.WEBVIEW_WIDTH || '1280', 10);
const height = parseInt(process.env.WEBVIEW_HEIGHT || '800', 10);
const timeoutMs = parseInt(process.env.WEBVIEW_TIMEOUT_MS || '12000', 10);
const settleMs = parseInt(process.env.WEBVIEW_SETTLE_MS || '2500', 10);

async function fetchRendered(url) {
  const w = new Bun.WebView({
    url,
    width,
    height,
    // offscreen by default when not shown
  });

  // Wait for initial navigation + settle for JS
  await new Promise((resolve, reject) => {
    let done = false;
    const timer = setTimeout(async () => {
      if (done) return;
      done = true;
      try {
        // extra settle
        await Bun.sleep(settleMs);
        resolve();
      } catch (e) { reject(e); }
    }, timeoutMs);

    w.onNavigated = () => {
      // navigated — let settle timer handle
    };
    w.onNavigationFailed = (failedUrl, err) => {
      if (!done) {
        done = true;
        clearTimeout(timer);
        reject(new Error(`navigation failed ${failedUrl}: ${err}`));
      }
    };
  });

  // Evaluate rendered HTML
  let html = '';
  try {
    // Scroll to trigger lazy loads
    await w.evaluate('window.scrollTo(0, document.body.scrollHeight)');
    await Bun.sleep(800);
    await w.evaluate('window.scrollTo(0, 0)');
    await Bun.sleep(400);
    html = await w.evaluate('document.documentElement.outerHTML');
  } finally {
    w.close();
  }
  return html || '';
}

const html = await fetchRendered(url);
process.stdout.write(html);
