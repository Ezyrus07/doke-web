#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { chromium } = require('@playwright/test');

const ROOT = process.cwd();
const read = (file) => fs.readFileSync(path.join(ROOT, file), 'utf8');

function servicesFixture() {
  return Array.from({ length: 13 }, (_, index) => {
    const number = index + 1;
    return {
      id: `browser-service-${number}`,
      status: 'active',
      title: `Serviço ${number}`,
      category: number % 2 ? 'Reforma' : 'Limpeza',
      state: 'MG',
      city: 'Belo Horizonte',
      neighborhood: number % 2 ? 'Savassi' : 'Centro',
      rating: 4.2 + number / 20,
      guaranteed: number >= 8 && number % 2 === 1,
      emergency: number === 9 || number === 13,
      online: number === 10 || number === 12,
      availableToday: number >= 9,
      createdAt: `2026-08-${String(Math.min(number, 9)).padStart(2, '0')}T10:00:00Z`
    };
  });
}

async function main() {
  const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || (fs.existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined);
  const browser = await chromium.launch({ executablePath, headless: true, args: ['--no-sandbox'] });

  try {
    const page = await browser.newPage({ viewport: { width: 1366, height: 900 } });
    await page.setContent(`<!doctype html><html><body data-page="home">
      <main>
        <div class="shell-home__workspace" data-state-boundary="index">
          <section data-home-list-region="more-services" data-home-rail-freshness-state="fresh" data-home-rail-data-state="ready" data-home-rail-visibility-state="visible" data-state="ready">
            <div class="more-services__controls">
              <div id="more-services-tabs-track" role="tablist" aria-label="Mais anúncios">
                <button class="mini-tab is-active" data-more-services-intent="for-you" role="tab" aria-selected="true" aria-pressed="true" tabindex="0">Para você</button>
                <button class="mini-tab" data-more-services-intent="following" role="tab" aria-selected="false" aria-pressed="false" tabindex="-1">Seguindo</button>
                <button class="mini-tab" data-more-services-intent="top-rated" role="tab" aria-selected="false" aria-pressed="false" tabindex="-1">Bem avaliados</button>
                <button class="mini-tab" data-more-services-intent="guaranteed" role="tab" aria-selected="false" aria-pressed="false" tabindex="-1">Com garantia</button>
                <button class="mini-tab" data-more-services-intent="available-today" role="tab" aria-selected="false" aria-pressed="false" tabindex="-1">Disponíveis hoje</button>
                <button class="mini-tab" data-more-services-intent="newest" role="tab" aria-selected="false" aria-pressed="false" tabindex="-1">Novos</button>
              </div>
            </div>

            <div data-list-empty hidden><p data-list-empty-message></p></div>
            <span data-more-services-count-feedback role="status" aria-live="polite"></span>

            <div data-more-filters-panel>
              <section data-more-filters-section="quick">
                <button class="filter-chip" type="button">Com garantia</button>
                <button class="filter-chip" type="button">Emergência</button>
                <button class="filter-chip" type="button">Pix</button>
                <button class="filter-chip" type="button">Online</button>
                <button class="filter-chip" type="button">Hoje</button>
              </section>
              <label><span class="filter-field__label">Categoria</span><select><option>Todas</option><option>Reforma</option><option>Limpeza</option></select></label>
              <label><span class="filter-field__label">Tipo de serviço</span><select><option>Qualquer tipo</option><option>Residencial</option></select></label>
              <label><span class="filter-field__label">Online ou presencial</span><select><option>Tanto faz</option><option>Presencial</option><option>Online</option><option>Híbrido</option></select></label>
              <label><span class="filter-field__label">Preço</span><select><option>Qualquer valor</option><option>Até R$ 100</option></select></label>
              <label><span class="filter-field__label">Avaliação</span><select><option>4,8+ estrelas</option><option>4,5+ estrelas</option><option>4,0+ estrelas</option><option>Qualquer nota</option></select></label>
              <label><span class="filter-field__label">Pagamentos aceitos</span><select><option>Todos</option><option>Pix</option></select></label>
              <label><span class="filter-field__label">Garantia</span><select><option>Tanto faz</option><option>Com garantia</option><option>Sem garantia</option></select></label>
              <label><span class="filter-field__label">Atende emergências</span><select><option>Tanto faz</option><option>Sim</option><option>Não</option></select></label>
              <label><span class="filter-field__label">Estado</span><select data-home-staté-select><option value="">Qualquer estado</option><option value="MG">MG</option></select></label>
              <label><span class="filter-field__label">Cidade</span><select data-home-city-select><option value="">Qualquer cidade</option><option value="Belo Horizonte">Belo Horizonte</option></select></label>
              <label><span class="filter-field__label">Bairro</span><select data-home-neighborhood-select><option value="">Qualquer bairro</option><option value="Savassi">Savassi</option><option value="Centro">Centro</option></select></label>
              <div class="more-filters__actions">
                <button type="button" data-more-services-reset>Limpar filtros</button>
                <button type="button" data-more-filters-close>Fechar</button>
                <button type="button" data-more-filters-apply>Aplicar filtros</button>
              </div>
            </div>

            <div data-more-services-grid data-more-services-limit="6" data-more-services-step="3"></div>
            <div data-more-services-load-host><button type="button" data-more-services-load>Carregar mais</button></div>
          </section>
        </div>
      </main>
    </body></html>`, { waitUntil: 'domcontentloaded' });

    const services = servicesFixture();
    await page.evaluate((items) => {
      window.Doke = {
        listState: {
          setListState(region, stateName, options = {}) {
            region.dataset.state = stateName;
            const empty = region.querySelector('[data-list-empty]');
            const message = region.querySelector('[data-list-empty-message]');
            if (empty) empty.hidden = stateName !== 'empty';
            if (message && options.message) message.textContent = options.message;
            return stateName;
          }
        },
        publicServiceCard: {
          create(item) {
            const card = document.createElement('article');
            card.className = 'doke-ad-card';
            card.dataset.serviceId = item.id;
            card.textContent = item.title;
            return card;
          }
        },
        indexDataController: {
          lastPayload: { data: { services: items } }
        }
      };
    }, services);

    await page.addScriptTag({ content: read('assets/js/pages/home/more-services-state.js') });
    await page.addScriptTag({ content: read('assets/js/pages/home/more-services-surface.js') });

    const snapshot = () => page.evaluate(() => window.Doke.homeMoreServicesSurface.getSnapshot());
    const cards = () => page.locator('[data-more-services-grid] > .doke-ad-card');

    let state = await snapshot();
    assert.equal(state.resultCount, 7, 'Home must derive More services after the six featured services.');
    assert.equal(state.visibleCount, 6);
    assert.equal(await cards().count(), 6);

    await page.getByRole('tab', { name: 'Seguindo' }).click();
    state = await snapshot();
    assert.equal(state.resultState, 'unavailable');
    assert.equal(await cards().count(), 0);
    assert.match(await page.locator('[data-list-empty-message]').textContent(), /Seguindo/);

    await page.getByRole('tab', { name: 'Para você' }).click();
    state = await snapshot();
    assert.equal(state.resultCount, 7);
    assert.equal(await page.getByRole('tab', { name: 'Para você' }).getAttribute('aria-selected'), 'true');

    const guaranteedChip = page.getByRole('button', { name: 'Com garantia', exact: true }).first();
    await guaranteedChip.click();
    state = await snapshot();
    assert.equal(state.appliedFilters.guaranteed, false, 'Quick filter must remain draft before Apply.');
    assert.equal(state.draftFilters.guaranteed, true);
    assert.equal(state.resultCount, 7);

    await page.getByRole('button', { name: 'Fechar' }).click();
    state = await snapshot();
    assert.equal(state.draftFilters.guaranteed, false, 'Close must cancel draft changes.');

    await guaranteedChip.click();
    await page.locator('label').filter({ hasText: 'Categoria' }).locator('select').selectOption({ label: 'Reforma' });
    await page.getByRole('button', { name: 'Aplicar filtros' }).click();
    state = await snapshot();
    assert.equal(state.appliedFilters.guaranteed, true);
    assert.deepEqual(Array.from(state.appliedFilters.categories), ['Reforma']);
    assert(state.items.every((item) => item.guaranteed && item.category === 'Reforma'));

    await page.getByRole('button', { name: 'Limpar filtros' }).click();
    state = await snapshot();
    assert.equal(state.activeFilterCount, 0);
    assert.equal(state.visibleCount, 6);

    await page.getByRole('button', { name: 'Carregar mais' }).click();
    state = await snapshot();
    assert.equal(state.visibleCount, 7);
    assert.equal(await cards().count(), 7);

    assert.equal(await page.getByRole('button', { name: 'Pix', exact: true }).isDisabled(), true, 'Unsupported Pix filter must fail closed.');
    assert.equal(await page.locator('label').filter({ hasText: 'Tipo de serviço' }).locator('select').isDisabled(), true);
    assert.equal(await page.locator('label').filter({ hasText: 'Preço' }).locator('select').isDisabled(), true);
    assert.equal(await page.locator('label').filter({ hasText: 'Pagamentos aceitos' }).locator('select').isDisabled(), true);

    await page.evaluate(() => {
      const region = document.querySelector('[data-home-list-region="more-services"]');
      region.dataset.homeRailFreshnessState = 'stale';
      window.Doke.homeMoreServicesSurface.acceptPayload({ data: { services: [] } });
    });
    state = await snapshot();
    assert.equal(state.resultCount, 7, 'Stale transport state must preserve the last accepted More services source.');

    console.log('[ux-home-002-browser-contract] ok');
    console.log('- real DOM tabs, draft/apply/cancel, fail-closed filters, reveal and stale preservation validated');
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error('[ux-home-002-browser-contract] failed');
  console.error(error.stack || error.message || error);
  process.exit(1);
});
