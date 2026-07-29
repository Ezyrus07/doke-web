const { test, expect } = require('@playwright/test');

const EDGE_PATH = '/functions/v1/search-public-services-v2';
const ROLLBACK_RPC_PATH = '/rest/v1/rpc/search_public_services_v1';
const STAGING_HOST = 'zwkczgewzbsorbrjuzpb.supabase.co';

async function installSearchEventProbe(page) {
  await page.addInitScript(() => {
    window.__dokeSearchProbe = { rendered: [], errors: [] };
    document.addEventListener('doke:search-server-page-rendered', (event) => {
      window.__dokeSearchProbe.rendered.push(event.detail || {});
    });
    document.addEventListener('doke:search-server-error', (event) => {
      window.__dokeSearchProbe.errors.push(event.detail || {});
    });
  });
}

function collectAuthorityRequests(page) {
  const requests = { directCatalog: [], edge: [], rpcV1: [] };
  page.on('request', (request) => {
    const url = new URL(request.url());
    if (url.host !== STAGING_HOST) return;
    const entry = { method: request.method(), url: request.url() };
    if (url.pathname === '/rest/v1/services') requests.directCatalog.push(entry);
    if (url.pathname === EDGE_PATH && request.method() === 'POST') requests.edge.push(entry);
    if (url.pathname === ROLLBACK_RPC_PATH && request.method() === 'POST') requests.rpcV1.push(entry);
  });
  return requests;
}

async function forceRpcV1Rollback(page) {
  await page.addInitScript(() => {
    let configValue;
    Object.defineProperty(window, 'DOKE_SUPABASE_CONFIG', {
      configurable: true,
      get() { return configValue; },
      set(value) {
        value.searchTransport = 'rpc-v1';
        value.searchRollbackTransport = 'rpc-v1';
        configValue = value;
      }
    });
  });
}

test.describe('SEARCH-A10 staging browser cutover', () => {
  test('renders service results through the real staging Edge v2 authority under rank v0', async ({ page }) => {
    await installSearchEventProbe(page);
    const authorityRequests = collectAuthorityRequests(page);

    const edgeResponsePromise = page.waitForResponse((response) => {
      const url = new URL(response.url());
      return url.host === STAGING_HOST && url.pathname === EDGE_PATH && response.request().method() === 'POST';
    });

    await page.goto('/resultados.html?q=limpeza');
    const edgeResponse = await edgeResponsePromise;
    expect(edgeResponse.ok()).toBeTruthy();

    const requestBody = edgeResponse.request().postDataJSON();
    expect(requestBody.query).toBe('limpeza');
    expect(requestBody.pageSize).toBe(12);
    expect(requestBody.cursor).toBe('');
    expect(requestBody).not.toHaveProperty('p_request');

    const requestId = edgeResponse.headers()['x-doke-request-id'];
    expect(requestId).toMatch(/^[0-9a-f-]{36}$/i);
    console.log(`[SEARCH-A10-CANARY-REQUEST-ID] ${requestId}`);

    const payload = await edgeResponse.json();
    expect(payload.authority).toBe('public.search_public_services_v2');
    expect(payload.contractVersion).toBe('2.0.0');
    expect(payload.ranking.version).toBe('search-rank-v0');
    expect(payload.page.rankingVersion).toBe('search-rank-v0');
    expect(payload.page.asOf).toBeTruthy();
    expect(Array.isArray(payload.items)).toBeTruthy();
    expect(payload.items.length).toBeGreaterThan(0);
    expect(payload.items.every((item) => !('rankScore' in item) && !('metadata' in item) && !('email' in item) && !('searchVector' in item))).toBeTruthy();

    await page.waitForFunction(() => window.__dokeSearchProbe.rendered.length > 0);
    const rendered = await page.evaluate(() => window.__dokeSearchProbe.rendered.at(-1));
    expect(rendered.authority).toBe('public.search_public_services_v2');
    expect(rendered.contractVersion).toBe('2.0.0');
    expect(rendered.transport).toBe('edge-v2');
    expect(rendered.rankingVersion).toBe('search-rank-v0');
    expect(rendered.loadedCount).toBe(payload.items.length);

    const contract = await page.evaluate(() => window.Doke.services.search.getContract());
    expect(contract.transport).toBe('edge-v2');
    expect(contract.rollbackTransport).toBe('rpc-v1');
    expect(contract.expectedAuthority).toBe('public.search_public_services_v2');

    await expect(page.locator('[data-results-grid] .doke-ad-card')).toHaveCount(payload.items.length);
    await expect(page.locator('[data-results-count]')).toHaveText(String(payload.items.length));
    await expect(page.locator('[data-results-title]')).toContainText('limpeza');

    const errors = await page.evaluate(() => window.__dokeSearchProbe.errors);
    expect(errors).toEqual([]);
    expect(authorityRequests.edge).toHaveLength(1);
    expect(authorityRequests.rpcV1).toEqual([]);
    expect(authorityRequests.directCatalog).toEqual([]);
  });

  test('fails closed when Edge v2 is unavailable and does not auto-fallback to RPC v1', async ({ page }) => {
    await installSearchEventProbe(page);
    const authorityRequests = collectAuthorityRequests(page);

    await page.route(`**${EDGE_PATH}`, async (route) => {
      if (route.request().method() === 'OPTIONS') return route.continue();
      await route.fulfill({
        status: 503,
        contentType: 'application/json',
        headers: { 'x-doke-request-id': '33333333-3333-4333-8333-333333333333' },
        body: JSON.stringify({ error: 'SEARCH_A10_FORCED_EDGE_FAILURE' })
      });
    });

    await page.goto('/resultados.html?q=limpeza');
    await page.waitForFunction(() => window.__dokeSearchProbe.errors.length > 0);

    const error = await page.evaluate(() => window.__dokeSearchProbe.errors.at(-1));
    expect(error.fallbackUsed).toBe(false);
    expect(error.transport).toBe('edge-v2');
    expect(error.authority).toBe('public.search_public_services_v2');

    await expect(page.locator('[data-results-pane="content"]')).toHaveAttribute('data-results-state', 'error');
    await expect(page.locator('[data-results-grid] .doke-ad-card')).toHaveCount(0);
    await expect(page.locator('[data-results-title]')).toHaveText('Busca indisponível');
    expect(authorityRequests.edge).toHaveLength(1);
    expect(authorityRequests.rpcV1).toEqual([]);
    expect(authorityRequests.directCatalog).toEqual([]);
  });

  test('rolls back deliberately to the real staging RPC v1 when configured', async ({ page }) => {
    await forceRpcV1Rollback(page);
    await installSearchEventProbe(page);
    const authorityRequests = collectAuthorityRequests(page);

    const rpcResponsePromise = page.waitForResponse((response) => {
      const url = new URL(response.url());
      return url.host === STAGING_HOST && url.pathname === ROLLBACK_RPC_PATH && response.request().method() === 'POST';
    });

    await page.goto('/resultados.html?q=limpeza');
    const rpcResponse = await rpcResponsePromise;
    expect(rpcResponse.ok()).toBeTruthy();

    const requestBody = rpcResponse.request().postDataJSON();
    expect(requestBody).toHaveProperty('p_request');
    expect(requestBody.p_request.query).toBe('limpeza');
    expect(requestBody.p_request.pageSize).toBe(12);

    const payload = await rpcResponse.json();
    expect(payload.authority).toBe('public.search_public_services_v1');
    expect(payload.contractVersion).toBe('1.0.0');

    await page.waitForFunction(() => window.__dokeSearchProbe.rendered.length > 0);
    const rendered = await page.evaluate(() => window.__dokeSearchProbe.rendered.at(-1));
    expect(rendered.authority).toBe('public.search_public_services_v1');
    expect(rendered.contractVersion).toBe('1.0.0');
    expect(rendered.transport).toBe('rpc-v1');

    const contract = await page.evaluate(() => window.Doke.services.search.getContract());
    expect(contract.transport).toBe('rpc-v1');
    expect(contract.rollbackTransport).toBe('rpc-v1');
    expect(contract.expectedAuthority).toBe('public.search_public_services_v1');

    expect(authorityRequests.rpcV1).toHaveLength(1);
    expect(authorityRequests.edge).toEqual([]);
    expect(authorityRequests.directCatalog).toEqual([]);
  });
});
