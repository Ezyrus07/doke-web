'use strict';

const fs = require('fs');
const http = require('http');
const path = require('path');
const { spawnSync } = require('child_process');

function getBrowserCandidates(root = process.cwd()) {
  const candidates = [];
  const seen = new Set();
  function addCandidate(source, executablePath, notes = []) {
    if (!executablePath || seen.has(executablePath)) return;
    seen.add(executablePath);
    candidates.push({ source, executablePath, exists: fs.existsSync(executablePath), policy: inspectChromiumPolicy(executablePath), notes });
  }
  addCandidate('DOKE_PLAYWRIGHT_EXECUTABLE_PATH', process.env.DOKE_PLAYWRIGHT_EXECUTABLE_PATH, ['explicit environment override']);
  try {
    const { chromium } = require('playwright');
    addCandidate('playwright-cache', chromium.executablePath(), ['Playwright managed browser path']);
  } catch (error) {
    candidates.push({ source: 'playwright-cache', executablePath: '', exists: false, policy: { checked: false, hasBlockingUrlPolicy: false, policyFiles: [], notes: [] }, notes: [`Cannot resolve Playwright chromium: ${error.message}`] });
  }
  for (const command of ['chromium', 'chromium-browser', 'google-chrome', 'google-chrome-stable']) {
    const resolved = commandPath(command, root);
    if (resolved) addCandidate(`system:${command}`, resolved, ['system browser fallback']);
  }
  return candidates;
}

async function runLoopbackSmoke(candidate, options = {}) {
  const timeoutMs = Number(options.timeoutMs || process.env.DOKE_BROWSER_SMOKE_TIMEOUT_MS || 20000);
  if (!candidate || !candidate.exists) return { attempted: false, status: 'skipped', reason: 'candidate_missing' };
  let server;
  let browser;
  let url;
  try {
    server = await createSmokeServer();
    url = `http://127.0.0.1:${server.port}/`;
    const { chromium } = require('playwright');
    browser = await chromium.launch({ executablePath: candidate.executablePath, args: ['--no-sandbox', '--disable-dev-shm-usage'], timeout: timeoutMs });
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'load', timeout: timeoutMs });
    const marker = await page.locator('[data-doke-browser-smoke]').textContent({ timeout: timeoutMs });
    return { attempted: true, status: marker === 'ok' ? 'passed' : 'failed', url, marker };
  } catch (error) {
    return { attempted: true, status: 'failed', url, error: error.message, blockedByAdministrator: /ERR_BLOCKED_BY_ADMINISTRATOR|URLBlocklist|blocked by administrator/i.test(error.message) };
  } finally {
    if (browser) await browser.close().catch(() => {});
    if (server && server.close) await new Promise((resolve) => server.close(resolve));
  }
}

function getBestCandidate(candidates) {
  const existing = candidates.filter((candidate) => candidate.exists);
  return existing.find((candidate) => !candidate.policy.hasBlockingUrlPolicy) || existing[0] || candidates[0] || null;
}

function inspectChromiumPolicy(executablePath) {
  const result = { checked: false, hasBlockingUrlPolicy: false, policyFiles: [], notes: [] };
  if (!executablePath || !/chrom/i.test(executablePath)) return result;
  if (executablePath.includes('/.cache/ms-playwright/')) {
    result.checked = true;
    result.notes.push('Playwright-managed browser path is not treated as a system Chromium policy candidate.');
    return result;
  }
  result.checked = true;
  for (const policyRoot of ['/etc/chromium/policies/managed', '/etc/opt/chrome/policies/managed']) {
    if (!fs.existsSync(policyRoot)) continue;
    for (const file of listJsonFiles(policyRoot)) {
      try {
        const payload = JSON.parse(fs.readFileSync(file, 'utf8'));
        const blocklist = payload.URLBlocklist || payload.URLBlacklist || [];
        const normalized = Array.isArray(blocklist) ? blocklist.map(String) : [];
        if (normalized.includes('*')) {
          result.hasBlockingUrlPolicy = true;
          result.policyFiles.push(path.relative('/', file));
        }
      } catch (error) {
        result.notes.push(`Cannot parse policy file ${file}: ${error.message}`);
      }
    }
  }
  if (result.hasBlockingUrlPolicy) result.notes.push('System Chromium has a managed URL blocklist wildcard; localhost visual tests may return ERR_BLOCKED_BY_ADMINISTRATOR.');
  return result;
}

function listJsonFiles(dir) {
  const entries = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const absolute = path.join(dir, entry.name);
    if (entry.isDirectory()) entries.push(...listJsonFiles(absolute));
    else if (entry.isFile() && entry.name.endsWith('.json')) entries.push(absolute);
  }
  return entries;
}

function commandPath(command, root) {
  const result = spawnSync(process.platform === 'win32' ? 'where' : 'command', process.platform === 'win32' ? [command] : ['-v', command], { cwd: root, encoding: 'utf8', shell: true });
  if (result.status !== 0) return '';
  return String(result.stdout || '').split(/\r?\n/).map((line) => line.trim()).find(Boolean) || '';
}

function createSmokeServer() {
  return new Promise((resolve, reject) => {
    const server = http.createServer((request, response) => {
      response.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' });
      response.end('<!doctype html><html><head><title>Doke browser smoke</title></head><body><main data-doke-browser-smoke>ok</main></body></html>');
    });
    server.on('error', reject);
    server.listen(0, '127.0.0.1', () => { server.port = server.address().port; resolve(server); });
  });
}

module.exports = { getBrowserCandidates, getBestCandidate, inspectChromiumPolicy, runLoopbackSmoke };
