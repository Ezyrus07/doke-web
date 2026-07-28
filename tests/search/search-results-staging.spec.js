const { test, expect } = require('@playwright/test');

const SEARCH_RPC_PATH = '/rest/v1/rpc/search_public_services_v1';
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

test.describe('SEARCH-A05 staging browser authority', () => {
  test('renders service results through the real staging RPC', async ({ page }) => {
    await installSearchEventProbe(page);

    const directCatalogRequests = [];
    page.on('request', (request) => {
      const url = new URL(request.url());
      if (url.host === STAGING_HOST && url.pathname === '/rest/v1/services') {
        directCatalogRequests.push({ method: request.method(), url: request.url() });
      }
    });

    const rpcResponsePromise = page.waitForResponse((response) => {
      const url = new URL(response.url());
      return url.host === STAGING_HOST && url.pathname === SEARCH_RPC_PATH;
    });

    await page.goto('/resultados.html?q=limpeza');
    const rpcResponse = await rpcResponsePromise;
    expect(rpcResponse.ok()).toBeTruthy();
    expect(rpcResponse.request().method()).toBe('POST');

    const requestBody = rpcResponse.request().postDataJSON();
    expect(requestBody).toHaveProperty('p_request');
    expect(requestBody.p_request.query).toBe('limpeza');
    expect(requestBody.p_request.pageSize).toBe(12);
    expect(requestBody.p_request.cursor).toBe('');

    const payload = await rpcResponse.json();
    expect(payload.authority).toBe('public.search_public_services_v1');
    expect(payload.contractVersion).toBe('1.0.0');
    expect(Array.isArray(payload.items)).toBeTruthy();
    expect(payload.items.length).toBeGreaterThan(0);
    expect(payload.items.every((item) => !('metadata' in item) && !('email' in item) && !('searchVector' in item))).toBeTruthy();

    await page.waitForFunction(() => window.__dokeSearchProbe.rendered.length > 0);
    const rendered = await page.evaluate(() => window.__dokeSearchProbe.rendered.at(-1));
    expect(rendered.authority).toBe('public.search_public_services_v1');
    expect(rendered.contractVersion).toBe('1.0.0');
    expect(rendered.loadedCount).toBe(payload.items.length);

    await expect(page.locator('[data-results-grid] .doke-ad-card')).toHaveCount(payload.items.length);
    await expect(page.locator('[data-results-count]')).toHaveText(String(payload.items.length));
    await expect(page.locator('[data-results-title]')).toContainText('limpeza');

    const snapshot = await page.evaluate(() => window.Doke.searchResultsServerSurface.getSnapshot());
    expect(snapshot.items.length).toBe(payload.items.length);
    expect(snapshot.loading).toBeFalsy();

    const errors = await page.evaluate(() => window.__dokeSearchProbe.errors);
    expect(errors).toEqual([]);
    expect(directCatalogRequests).toEqual([]);
  });

  test('fails closed when the staging RPC is unavailable', async ({ page }) => {
    await installSearchEventProbe(page);

    const directCatalogRequests = [];
    page.on('request', (request) => {
      const url = new URL(request.url());
      if (url.host === STAGING_HOST && url.pathname === '/rest/v1/services') {
        directCatalogRequests.push({ method: request.method(), url: request.url() });
      }
    });

    await page.route(`**${SEARCH_RPC_PATH}`, async (route) => {
      await route.fulfill({
        status: 503,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'SEARCH_A05_FORCED_STAGING_FAILURE' })
      });
    });

    await page.goto('/resultados.html?q=limpeza');
    await page.waitForFunction(() => window.__dokeSearchProbe.errors.length > 0);

    const error = await page.evaluate(() => window.__dokeSearchProbe.errors.at(-1));
    expect(error.fallbackUsed).toBe(false);
    expect(error.operation).not.toBe('local-catalog');

    await expect(page.locator('[data-results-pane="content"]')).toHaveAttribute('data-results-state', 'error');
    await expect(page.locator('[data-results-grid] .doke-ad-card')).toHaveCount(0);
    await expect(page.locator('[data-results-title]')).toHaveText('Busca indisponível');
    expect(directCatalogRequests).toEqual([]);
  });
});
