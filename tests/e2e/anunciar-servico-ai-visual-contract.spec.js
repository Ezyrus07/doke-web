const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const ACCESS_SERVICE_URL = '**/assets/js/services/professional-access-service.js*';
const PERSONAL_SERVICE_URL = '**/assets/js/services/professional-quote-templates-service.js*';
const METRICS_SERVICE_URL = '**/assets/js/services/quote-template-metrics-service.js*';
const AI_SERVICE_URL = '**/assets/js/services/quote-template-ai-service.js*';
const SUPABASE_CDN_URL = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
const SUPABASE_UMD = fs.readFileSync(
  path.resolve(__dirname, '../../node_modules/@supabase/supabase-js/dist/umd/supabase.js'),
  'utf8'
);
const PIXEL = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
  'base64'
);

const VIEWPORTS = [
  { name: 'desktop-1366x768', width: 1366, height: 768 },
  { name: 'tablet-820x1180', width: 820, height: 1180 },
  { name: 'mobile-390x844', width: 390, height: 844 },
];

function accessServiceStub() {
  return `
    (() => {
      const Doke = window.Doke || (window.Doke = {});
      Doke.services = Doke.services || {};
      const allowed = Object.freeze({
        allowed: true,
        reason: 'allowed',
        role: 'professional',
        professionalProfile: { status: 'active', setupStatus: 'active' },
        verification: { status: 'verified', documentStatus: 'verified' }
      });
      Doke.services.professionalAccess = Object.freeze({
        ACTIONS: Object.freeze({ PUBLISH_SERVICE: 'publish_service' }),
        can: () => Promise.resolve(allowed),
        assert: () => Promise.resolve(allowed),
        redirectFor: () => 'meu-perfil.html'
      });
    })();
  `;
}

function personalServiceStub() {
  return `
    (() => {
      const Doke = window.Doke || (window.Doke = {});
      Doke.services = Doke.services || {};
      Doke.services.professionalQuoteTemplates = Object.freeze({
        list: () => Promise.resolve([]),
        create: (input) => Promise.resolve({ id: 'personal-qa', name: input.name, category: input.category, template: input.template }),
        rename: (id, name) => Promise.resolve({ id, name, category: '', template: { questions: [] } }),
        updateTemplate: (id, input) => Promise.resolve({ id, name: 'Modelo QA', category: input.category, template: input.template }),
        remove: () => Promise.resolve(true),
        maxTemplates: 30
      });
    })();
  `;
}

function metricsServiceStub() {
  return `
    (() => {
      const Doke = window.Doke || (window.Doke = {});
      Doke.services = Doke.services || {};
      Doke.services.quoteTemplateMetrics = Object.freeze({
        recordApplication: () => Promise.resolve(true),
        recordFunnelEvent: () => Promise.resolve(true),
        getOwnerDashboard: () => Promise.resolve({ metrics: [], dropoff: [], recommendations: [], benchmarks: [] }),
        getBuilderGuidance: () => Promise.resolve({ recommendations: [], benchmark: null, metric: null }),
        invalidateDashboard: () => {}
      });
    })();
  `;
}

function aiServiceStub() {
  return `
    (() => {
      const Doke = window.Doke || (window.Doke = {});
      Doke.services = Doke.services || {};
      Doke.services.quoteTemplateAi = Object.freeze({
        generate: (input) => {
          const first = input.questions[0];
          return Promise.resolve({
            runId: 'qa-run-001',
            createdAt: new Date().toISOString(),
            engine: 'openai',
            model: 'qa-model',
            summary: 'Encontramos uma forma mais direta de pedir a principal informação ao cliente.',
            fallbackReason: '',
            supervisionRequired: true,
            suggestions: [{
              id: 'rewrite-first-question',
              action: 'rewrite',
              targetQuestionId: first.id,
              relatedQuestionIds: [],
              title: 'Deixar a pergunta mais objetiva',
              reason: 'Uma pergunta direta reduz esforço de leitura sem perder contexto.',
              evidence: 'Comparação gerada para validação visual supervisionada.',
              confidence: 'high',
              proposedQuestion: {
                ...first,
                label: 'Qual serviço você precisa e em qual ambiente?',
                helpText: 'Ex.: pintura da sala, instalação no banheiro ou reparo na cozinha.'
              }
            }]
          });
        },
        markApplied: (runId, selectedSuggestionIds, signature) => {
          window.__quoteAiAudit = { runId, selectedSuggestionIds, signature };
          return Promise.resolve({ applied: true });
        },
        maxSuggestions: 8
      });
    })();
  `;
}


function aiFallbackServiceStub() {
  return `
    (() => {
      const Doke = window.Doke || (window.Doke = {});
      Doke.services = Doke.services || {};
      Doke.services.quoteTemplateAi = Object.freeze({
        generate: (input) => {
          const first = input.questions[0];
          return Promise.resolve({
            runId: 'qa-run-fallback-001',
            createdAt: new Date().toISOString(),
            engine: 'rules',
            model: 'doke-rules-v2',
            summary: 'A análise segura encontrou uma melhoria objetiva.',
            fallbackReason: 'OPENAI_BILLING_QUOTA',
            supervisionRequired: true,
            suggestions: [{
              id: 'shorten-first-question',
              action: 'shorten',
              targetQuestionId: first.id,
              relatedQuestionIds: [],
              title: 'Encurtar a pergunta',
              reason: 'A pergunta pode ser lida mais rapidamente.',
              evidence: 'Sinal determinístico baseado no comprimento do texto.',
              confidence: 'medium',
              proposedQuestion: { ...first, label: 'Qual serviço você precisa e em qual ambiente?' }
            }]
          });
        },
        markApplied: () => Promise.resolve({ applied: true }),
        maxSuggestions: 8
      });
    })();
  `;
}

async function installStubs(page, options = {}) {
  await page.addInitScript(() => {
    localStorage.setItem('doke.auth.session.v1', JSON.stringify({
      provider: 'qa',
      token: 'qa-session-token',
      remember: false,
      user: {
        id: 'qa-professional-001',
        name: 'Profissional QA',
        email: 'qa.professional@example.test',
        role: 'professional',
        type: 'professional',
        accountStatus: 'active',
        verified: true,
        professionalProfileStatus: 'active',
        professionalVerificationStatus: 'verified',
        professionalDocumentStatus: 'verified'
      },
      issuedAt: '2026-07-21T00:00:00.000Z',
      updatedAt: '2026-07-21T00:00:00.000Z'
    }));
  });
  await page.route(SUPABASE_CDN_URL, (route) => route.fulfill({
    status: 200,
    contentType: 'application/javascript; charset=utf-8',
    body: SUPABASE_UMD,
  }));
  await page.route('https://fonts.googleapis.com/**', (route) => route.fulfill({
    status: 200,
    contentType: 'text/css; charset=utf-8',
    body: '',
  }));
  await page.route('https://fonts.gstatic.com/**', (route) => route.abort());
  await page.route(ACCESS_SERVICE_URL, (route) => route.fulfill({ status: 200, contentType: 'application/javascript', body: accessServiceStub() }));
  await page.route(PERSONAL_SERVICE_URL, (route) => route.fulfill({ status: 200, contentType: 'application/javascript', body: personalServiceStub() }));
  await page.route(METRICS_SERVICE_URL, (route) => route.fulfill({ status: 200, contentType: 'application/javascript', body: metricsServiceStub() }));
  await page.route(AI_SERVICE_URL, (route) => route.fulfill({ status: 200, contentType: 'application/javascript', body: options.aiServiceBody || aiServiceStub() }));
}

async function reachQuoteBuilder(page) {
  await page.goto('/anunciar-servico.html', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('[data-post-service-page]')).toHaveAttribute('data-page-lifecycle-state', 'ready', { timeout: 12_000 });

  await page.locator('[name="adTitle"]').fill('Pintura residencial com acabamento fino');
  await page.locator('[name="category"]').selectOption('Pintura');
  await page.locator('[name="specialty"]').fill('Pintura interna');
  await page.locator('[name="shortDescription"]').fill('Pintura interna com preparação cuidadosa e acabamento uniforme.');
  await page.locator('[name="fullDescription"]').fill('Realizo pintura residencial interna, preparo as superfícies, protejo o ambiente e entrego o espaço limpo ao final do serviço.');
  await page.locator('[data-step-next]').click();

  await page.locator('[data-segment="priceType"][data-value="Sob orçamento"]').click();
  await page.locator('[name="serviceRegion"]').fill('Salvador e região metropolitana');
  await page.locator('[name="serviceMode"]').selectOption('Presencial');
  await page.locator('[data-availability-day][value="monday"]').check();
  await page.locator('[data-step-next]').click();

  await page.locator('[name="mainImage"]').setInputFiles({ name: 'servico.png', mimeType: 'image/png', buffer: PIXEL });
  await page.locator('[name="includedItems"]').fill('Preparação do ambiente, mão de obra e limpeza básica ao final.');
  await page.locator('[data-step-next]').click();

  await expect(page.locator('[data-step-panel="4"]')).toBeVisible();
  await page.locator('[data-quote-mode-option="custom"]').click();
  await page.locator('[data-quote-question-add]').click();
  await page.locator('[data-question-label]').nth(0).fill('Conte todos os detalhes possíveis sobre o serviço que você deseja contratar e sobre o ambiente onde ele será realizado.');
  await page.locator('[data-quote-question-add]').click();
  await page.locator('[data-question-label]').nth(1).fill('Existe algum prazo específico para conclusão?');
  await expect(page.locator('[data-quote-question-count]')).toHaveText('2');
}

async function assertLayoutHealth(page) {
  const health = await page.evaluate(() => {
    const html = document.documentElement;
    const body = document.body;
    const host = document.querySelector('[data-quote-ai-supervision]');
    const rect = host?.getBoundingClientRect();
    return {
      scrollWidth: Math.max(html.scrollWidth, body.scrollWidth),
      clientWidth: html.clientWidth,
      hostLeft: rect?.left ?? 0,
      hostRight: rect?.right ?? 0,
      hostWidth: rect?.width ?? 0,
      viewportWidth: innerWidth,
    };
  });
  expect(health.scrollWidth).toBeLessThanOrEqual(health.clientWidth + 1);
  expect(health.hostLeft).toBeGreaterThanOrEqual(-1);
  expect(health.hostRight).toBeLessThanOrEqual(health.viewportWidth + 1);
  expect(health.hostWidth).toBeGreaterThan(0);
}

for (const viewport of VIEWPORTS) {
  test(`IA supervisionada mantém interação e layout em ${viewport.name}`, async ({ page }, testInfo) => {
    test.setTimeout(90_000);
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await installStubs(page);
    const pageErrors = [];
    page.on('pageerror', (error) => pageErrors.push(error.message));

    await reachQuoteBuilder(page);
    const host = page.locator('[data-quote-ai-supervision]');
    await host.locator('summary').click();
    await expect(host).toHaveAttribute('open', '');
    await expect(page.locator('[data-quote-ai-result]')).toBeHidden();
    await expect(page.locator('[data-quote-ai-applied]')).toBeHidden();
    await expect(page.locator('[data-quote-ai-undo]')).toBeHidden();
    await page.locator('[data-quote-ai-generate]').click();
    await expect(page.locator('[data-quote-ai-result]')).toBeVisible();
    await expect(page.locator('[data-quote-ai-select]')).toHaveCount(1);
    await expect(page.locator('[data-quote-ai-select]')).not.toBeChecked();
    await expect(page.locator('.quote-ai-suggestion__confidence')).toHaveText('Confiança alta');
    await expect(page.locator('[data-quote-ai-apply]')).toBeDisabled();
    await assertLayoutHealth(page);

    await host.scrollIntoViewIfNeeded();
    await host.screenshot({ path: testInfo.outputPath(`${viewport.name}-generated.png`) });

    await page.locator('[data-quote-ai-select]').check();
    await expect(page.locator('[data-quote-ai-apply]')).toBeEnabled();
    await page.locator('[data-quote-ai-apply]').click();
    await expect(page.locator('[data-quote-ai-applied]')).toBeVisible();
    await expect(page.locator('[data-quote-ai-applied-copy]')).toContainText('1 sugestão aplicada.');
    await expect(page.locator('[data-question-label]').nth(0)).toHaveValue('Qual serviço você precisa e em qual ambiente?');
    await expect.poll(() => page.evaluate(() => window.__quoteAiAudit?.selectedSuggestionIds || [])).toEqual(['rewrite-first-question']);
    await assertLayoutHealth(page);
    await host.screenshot({ path: testInfo.outputPath(`${viewport.name}-applied.png`) });

    await page.locator('[data-quote-ai-undo]').click();
    await expect(page.locator('[data-question-label]').nth(0)).toHaveValue('Conte todos os detalhes possíveis sobre o serviço que você deseja contratar e sobre o ambiente onde ele será realizado.');
    await expect(page.locator('[data-quote-ai-applied]')).toBeHidden();
    await assertLayoutHealth(page);
    await host.screenshot({ path: testInfo.outputPath(`${viewport.name}-undo.png`) });

    expect(pageErrors).toEqual([]);
  });
}

test('fallback da OpenAI usa código seguro e mensagem neutra', async ({ page }) => {
  test.setTimeout(90_000);
  await page.setViewportSize({ width: 390, height: 844 });
  await installStubs(page, { aiServiceBody: aiFallbackServiceStub() });
  await reachQuoteBuilder(page);

  const host = page.locator('[data-quote-ai-supervision]');
  await host.locator('summary').click();
  await page.locator('[data-quote-ai-generate]').click();

  await expect(page.locator('[data-quote-ai-result]')).toBeVisible();
  await expect(page.locator('[data-quote-ai-engine]')).toHaveText('Análise segura por regras');
  await expect(host).toHaveAttribute('data-fallback-code', 'OPENAI_BILLING_QUOTA');
  await expect(page.locator('[data-quote-ai-status]')).toContainText('temporariamente indisponível');
  await expect(page.locator('[data-quote-ai-status]')).not.toContainText(/quota|billing|saldo|chave/i);
  await expect(page.locator('[data-quote-ai-select]')).not.toBeChecked();
  await expect(page.locator('[data-quote-ai-apply]')).toBeDisabled();
  await assertLayoutHealth(page);
});

