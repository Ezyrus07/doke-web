const { test, expect } = require('@playwright/test');
const { setup, switchActor, client, professional, service } = require('../fixtures/marketplace-demo.cjs');
const cssDiagnostics = new WeakMap();
test.beforeEach(async ({ page }, testInfo) => {
  if (testInfo.title !== 'synthetic journey with memory fixture bridge at 1366px') return;
  const events = [];
  const dom = [];
  cssDiagnostics.set(page, { network: events, dom });
  await page.exposeFunction('__p31RecordCssEvents', batch => dom.push(...batch));
  const record = (type, request, extra = {}) => events.push({ type, wallTime: Date.now(), url: request.url(), resourceType: request.resourceType(), ...extra });
  page.on('request', request => { if (request.resourceType() === 'stylesheet') record('request', request); });
  page.on('response', response => { if (response.request().resourceType() === 'stylesheet') record('response', response.request(), { status: response.status() }); });
  page.on('requestfinished', request => { if (request.resourceType() === 'stylesheet') record('requestfinished', request, { timing: request.timing() }); });
  page.on('requestfailed', request => { if (request.resourceType() === 'stylesheet') record('requestfailed', request, { failure: request.failure() }); });
  page.on('console', message => { if (message.type() === 'error') events.push({ type: 'console-error', wallTime: Date.now(), text: message.text() }); });
  await page.addInitScript(() => {
    const events = window.__p31CssEvents = [];
    let batch = [];
    let scheduled = false;
    let delivery = Promise.resolve();
    function flush() {
      scheduled = false;
      if (!batch.length) return delivery;
      const ready = batch;
      batch = [];
      delivery = delivery.then(() => window.__p31RecordCssEvents(ready)).catch(() => {});
      return delivery;
    }
    function publish(event) {
      events.push(event);
      batch.push(event);
      if (!scheduled) {
        scheduled = true;
        queueMicrotask(flush);
      }
    }
    window.__p31FlushCssEvents = flush;
    window.addEventListener('pagehide', flush);
    const ids = new WeakMap();
    let sequence = 0;
    function record(type, node, extra = {}) {
      if (!ids.has(node)) ids.set(node, ++sequence);
      publish({ type, instance: ids.get(node), time: performance.now(), timeOrigin: performance.timeOrigin, wallTime: Date.now(), url: node.href || '', media: node.media || '', connected: node.isConnected, documentURL: location.href, ...extra });
    }
    const create = Document.prototype.createElement;
    Document.prototype.createElement = function (...args) {
      const node = Reflect.apply(create, this, args);
      if (String(args[0]).toLowerCase() === 'link') {
        record('create', node, { stack: new Error().stack });
        node.addEventListener('load', () => record('load', node));
        node.addEventListener('error', () => record('error', node));
      }
      return node;
    };
    const append = Node.prototype.appendChild;
    Node.prototype.appendChild = function (node) {
      if (node.nodeType === 1 && node.tagName === 'LINK') record('insert', node, { stack: new Error().stack });
      return Reflect.apply(append, this, [node]);
    };
    document.addEventListener('click', event => {
      const link = event.target.closest?.('[data-budget-success-order-link]');
      if (link) record('order-link-click', link);
    }, true);
    document.addEventListener('DOMContentLoaded', () => {
      new MutationObserver(records => {
        for (const mutation of records) {
          if (mutation.target.tagName === 'LINK') record('attribute', mutation.target, { attribute: mutation.attributeName });
          else publish({ type: 'route-state', time: performance.now(), timeOrigin: performance.timeOrigin, wallTime: Date.now(), documentURL: location.href, page: document.body?.dataset.page, routeState: document.body?.dataset.dokeRouteState, attribute: mutation.attributeName });
        }
      }).observe(document.documentElement, { subtree: true, attributes: true, attributeFilter: ['media', 'data-doke-route-state', 'data-page'] });
    });
  });
});
test.afterEach(async ({ page }, testInfo) => {
  const diagnostics = cssDiagnostics.get(page);
  if (!diagnostics) return;
  const browser = await page.evaluate(async () => {
    await window.__p31FlushCssEvents?.();
    return { url: location.href, page: document.body?.dataset.page, routeState: document.body?.dataset.dokeRouteState };
  }).catch(error => ({ collectionError: error.message }));
  await testInfo.attach('css-instance-diagnosis', { body: Buffer.from(JSON.stringify({ ...diagnostics, browser }, null, 2)), contentType: 'application/json' });
});
async function dismissBrowserNotificationPrompt(page) {
  const prompt = page.locator('[data-browser-notification-prompt]');
  if (await prompt.isVisible()) {
    await prompt.getByRole('button', { name: 'Agora não', exact: true }).click();
    await expect(prompt).not.toBeVisible();
  }
}
async function reviewQuote(page, navigate = true) {
  if (navigate) await page.goto('/orcamento.html?serviceId=demo_limpeza');
  await expect(page.locator('[data-details-input]')).toBeVisible();
  await page.locator('[data-details-input]').fill('Preciso de uma limpeza residencial para demonstrar a jornada completa.');
  await page.locator('[data-step-next]').click();
  await page.locator('[data-step-next]').click();
  await expect(page.locator('[data-step-submit]')).toBeVisible();
}
test('quote fails honestly when order service is missing and can recover', async ({page}) => {
  await setup(page); await reviewQuote(page);
  await page.evaluate(()=>{ window.demoOrders = Doke.services.orders; Doke.services.orders = undefined; });
  await page.locator('[data-step-submit]').click();
  await expect(page.getByText('O serviço de pedidos não está disponível. Recarregue a página e tente novamente.',{exact:true})).toBeVisible();
  await expect(page.locator('[data-budget-success]')).not.toBeVisible();
  expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('doke.orders.local.v1')||'[]').length)).toBe(0);
  await page.getByRole('button',{name:'Entendi',exact:true}).click();
  await page.evaluate(()=>{ Doke.services.orders=window.demoOrders; });
  await page.locator('[data-step-submit]').click();
  await expect(page.locator('[data-budget-success]')).toBeVisible();
});
test('quote preserves form and recovers after storage failure', async ({page}) => {
  await setup(page); await reviewQuote(page);
  await page.evaluate(()=>{window.demoSetItem=Storage.prototype.setItem;Storage.prototype.setItem=function(key,value){if(key==='doke.orders.local.v1')throw new Error('QuotaExceededError');return window.demoSetItem.call(this,key,value);};});
  await page.locator('[data-step-submit]').click();
  await expect(page.getByText('Não foi possível salvar o pedido neste navegador. Libere espaço e tente novamente.',{exact:true})).toBeVisible();
  await expect(page.locator('[data-budget-success]')).not.toBeVisible();
  await page.getByRole('button',{name:'Entendi',exact:true}).click();
  await page.evaluate(()=>{Storage.prototype.setItem=window.demoSetItem;});
  await page.locator('[data-step-submit]').click();
  await expect(page.locator('[data-budget-success]')).toBeVisible();
  expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('doke.orders.local.v1')).length)).toBe(1);
});
for (const viewport of [{width:390,height:844},{width:820,height:1180},{width:1366,height:768}]) {
  test(`synthetic journey with memory fixture bridge at ${viewport.width}px`, async ({page}, testInfo) => {
    test.setTimeout(90000);
    await page.setViewportSize(viewport);
    const errors=[]; page.on('pageerror', e=>errors.push(e.message));
    await setup(page);
    await page.goto('/resultados.html?q=limpeza&type=services');
    const result = page.locator('[data-results-grid] a[href*="demo_limpeza"]').first();
    await expect(result).toBeVisible();
    await result.click();
    await expect(page).toHaveURL(/detalhe-anuncio/);
    await expect(page.getByText(service.title,{exact:true}).first()).toBeVisible();
    await page.locator('a[href*="orcamento"]:visible').first().click();
    await reviewQuote(page, false);
    await page.locator('[data-step-submit]').click();
    await expect(page.locator('[data-budget-success]')).toBeVisible();
    const orderId = new URL(page.url()).searchParams.get('order');
    expect(orderId).toBeTruthy();
    expect(await page.evaluate(id=>JSON.parse(localStorage.getItem('doke.orders.local.v1')).find(o=>o.id===id).professionalId,orderId)).toBe(professional.id);
    expect(await page.evaluate(({id,userId})=>Doke.repositories.notifications.readLocal().some(n=>n.orderId===id && n.userId===userId && n.type==='order_created'),{id:orderId,userId:professional.id})).toBe(true);
    await page.locator('[data-budget-success-order-link]').click();
    await expect(page.locator('.order-card').filter({hasText:service.title}).first()).toBeVisible();
    await expect(page.locator('body')).toHaveAttribute('data-orders-audience','client');
    await page.goto(`/mensagens.html?order=${orderId}`);
    await expect(page.locator('[data-messages-composer-input]')).toBeDisabled();
    await switchActor(page, professional, '/pedidos.html');
    await page.locator(`[data-order-accept="${orderId}"]`).click();
    await expect(page).toHaveURL(/mensagens.html/);
    const composer = page.locator('[data-messages-composer-input]');
    await expect(composer).toBeEnabled();
    await composer.fill('Olá! Pedido aceito na demonstração.');
    if (viewport.width === 1366 || viewport.width === 820) await dismissBrowserNotificationPrompt(page);
    await page.getByRole('button',{name:'Enviar mensagem',exact:true}).click();
    await expect(page.getByText('Olá! Pedido aceito na demonstração.',{exact:true}).last()).toBeVisible();
    await switchActor(page, client, `/mensagens.html?order=${orderId}`);
    expect(await page.evaluate(({id,userId})=>Doke.repositories.notifications.readLocal().some(n=>n.orderId===id && n.userId===userId),{id:orderId,userId:client.id})).toBe(true);
    await expect(page.getByText('Olá! Pedido aceito na demonstração.',{exact:true}).last()).toBeVisible();
    await expect(page.locator('[data-message-bubble]').filter({hasText:'Olá! Pedido aceito na demonstração.'})).not.toHaveClass(/message-bubble--me/);
    await composer.fill('Obrigada! Vamos combinar os detalhes.');
    if (viewport.width === 1366 || viewport.width === 820) await dismissBrowserNotificationPrompt(page);
    await page.getByRole('button',{name:'Enviar mensagem',exact:true}).click();
    await expect(page.getByText('Obrigada! Vamos combinar os detalhes.',{exact:true}).last()).toBeVisible();
    await page.reload();
    await expect(page.getByText('Obrigada! Vamos combinar os detalhes.',{exact:true}).last()).toBeVisible();
    expect(await page.evaluate(()=>Math.max(document.body.scrollWidth,document.documentElement.scrollWidth)-innerWidth)).toBeLessThanOrEqual(1);
    expect(errors).toEqual([]);
    const card = page.locator('.messages-order-card--inline .messages-order-card__body').first();
    const copy = card.locator('.messages-order-card__copy');
    const bodyBounds = await card.boundingBox();
    const copyBounds = await copy.boundingBox();
    expect(copyBounds.width).toBeGreaterThan(bodyBounds.width * 0.8);
    await page.screenshot({path:testInfo.outputPath(`conversation-${viewport.width}.png`)});
    const conversationId = await page.evaluate(id=>Doke.repositories.messages.readLocal().find(c=>c.orderId===id).id,orderId);
    await switchActor(page, {...client,id:'demo_outsider',name:'Terceiro Demonstração'}, `/mensagens.html?conversation=${conversationId}`);
    await expect(page.locator('[data-messages-composer-input]')).toBeDisabled();
    const denied = await page.evaluate(async ({orderId,conversationId})=>{
      const orders = await Doke.services.orders.listForCurrentUser();
      let conversationDenied=false,acceptDenied=false;
      try { conversationDenied=!(await Doke.services.messages.getConversationById(conversationId)); } catch { conversationDenied=true; }
      try { await Doke.services.orders.accept(orderId); } catch { acceptDenied=true; }
      return {orders:orders.length,conversationDenied,acceptDenied,status:Doke.repositories.orders.readLocal().find(o=>o.id===orderId).status};
    }, {orderId,conversationId});
    expect(denied).toEqual({orders:0,conversationDenied:true,acceptDenied:true,status:'accepted'});
  });
}
test('professional decline keeps the reason and conversation locked', async ({page})=>{
  await setup(page); await reviewQuote(page);
  await page.locator('[data-step-submit]').click();
  await expect(page.locator('[data-budget-success]')).toBeVisible();
  const orderId=new URL(page.url()).searchParams.get('order');
  await switchActor(page,professional,'/pedidos.html');
  await page.locator(`[data-order-decline="${orderId}"]`).click();
  await page.locator('[data-decline-reason-input]').fill('Não tenho disponibilidade para este prazo.');
  await page.getByRole('button',{name:'Confirmar recusa',exact:true}).click();
  await expect.poll(()=>page.evaluate(id=>Doke.repositories.orders.readLocal().find(o=>o.id===id).status,orderId)).toBe('cancelled');
  await switchActor(page,client,`/mensagens.html?order=${orderId}`);
  await expect(page.locator('[data-messages-composer-input]')).toBeDisabled();
  expect(await page.evaluate(id=>Doke.repositories.orders.readLocal().find(o=>o.id===id).refusalReason,orderId)).toBe('Não tenho disponibilidade para este prazo.');
});
