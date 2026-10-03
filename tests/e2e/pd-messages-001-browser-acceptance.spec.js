const { test, expect } = require('@playwright/test');

const SESSION_KEY = 'doke.auth.session.v1';
const CLIENT_ID = 'pd_messages_client';
const PROFESSIONAL_ID = 'pd_messages_professional';

const clientSession = Object.freeze({
  provider: 'mock',
  sessionStatus: 'active',
  accountStatus: 'active',
  remember: false,
  user: Object.freeze({
    id: CLIENT_ID,
    name: 'Cliente Mensagens QA',
    email: 'messages-qa@example.test',
    role: 'client',
    type: 'client',
    initials: 'MQ',
    accountStatus: 'active',
  }),
});

const viewports = [
  { name: 'mobile-390', width: 390, height: 844, isMobile: true, hasTouch: true },
  { name: 'tablet-608', width: 608, height: 926, isMobile: false, hasTouch: true },
  { name: 'tablet-820', width: 820, height: 1180, isMobile: false, hasTouch: true },
  { name: 'tablet-1024', width: 1024, height: 768, isMobile: false, hasTouch: true },
  { name: 'desktop-1366', width: 1366, height: 768, isMobile: false, hasTouch: false },
];

function conversationFixtures() {
  return [
    {
      id: 'pd_messages_contact',
      name: 'Contato sem pedido',
      peerName: 'Contato sem pedido',
      clientId: CLIENT_ID,
      professionalId: PROFESSIONAL_ID,
      participants: [CLIENT_ID, PROFESSIONAL_ID],
      group: 'contacts',
      status: 'conversation',
      lastSeen: 'Online agora',
      unread: 2,
      messages: [{
        id: 'contact-message',
        senderId: PROFESSIONAL_ID,
        author: 'Contato sem pedido',
        text: 'Mensagem fora de um pedido.',
        createdAt: '2026-10-01T10:00:00.000Z',
        time: '10:00',
      }],
      createdAt: '2026-10-01T09:59:00.000Z',
      updatedAt: '2026-10-01T10:00:00.000Z',
    },
    {
      id: 'pd_messages_accepted',
      name: 'Profissional Aceito',
      peerName: 'Profissional Aceito',
      clientId: CLIENT_ID,
      professionalId: PROFESSIONAL_ID,
      participants: [CLIENT_ID, PROFESSIONAL_ID],
      group: 'orders',
      status: 'accepted',
      statusLabel: 'Pedido aceito',
      lastSeen: 'Conversa liberada',
      unread: 3,
      orderId: 'order_pd_messages_accepted',
      order: {
        id: 'order_pd_messages_accepted',
        clientId: CLIENT_ID,
        professionalId: PROFESSIONAL_ID,
        providerId: PROFESSIONAL_ID,
        providerName: 'Profissional Aceito',
        title: 'Pintura residencial',
        serviceTitle: 'Pintura residencial',
        status: 'accepted',
        statusLabel: 'Pedido aceito',
        budget: 'R$ 450,00',
      },
      messages: [
        {
          id: 'accepted-message-1',
          senderId: PROFESSIONAL_ID,
          author: 'Profissional Aceito',
          text: 'Posso iniciar amanhã pela manhã.',
          createdAt: '2026-10-01T12:00:00.000Z',
          time: '12:00',
        },
        {
          id: 'accepted-message-2',
          senderId: PROFESSIONAL_ID,
          author: 'Profissional Aceito',
          text: 'Levo o material necessário.',
          createdAt: '2026-10-01T12:02:00.000Z',
          time: '12:02',
        },
        {
          id: 'accepted-message-3',
          senderId: CLIENT_ID,
          author: 'Cliente Mensagens QA',
          text: 'Perfeito, combinado.',
          createdAt: '2026-10-01T12:03:00.000Z',
          time: '12:03',
        },
      ],
      createdAt: '2026-10-01T11:50:00.000Z',
      updatedAt: '2026-10-01T12:03:00.000Z',
    },
    {
      id: 'pd_messages_pending',
      name: 'Profissional Pendente',
      peerName: 'Profissional Pendente',
      clientId: CLIENT_ID,
      professionalId: PROFESSIONAL_ID,
      participants: [CLIENT_ID, PROFESSIONAL_ID],
      group: 'orders',
      status: 'pending',
      statusLabel: 'Aguardando aceite',
      lastSeen: 'Aguardando aceite do profissional',
      orderId: 'order_pd_messages_pending',
      order: {
        id: 'order_pd_messages_pending',
        clientId: CLIENT_ID,
        professionalId: PROFESSIONAL_ID,
        providerId: PROFESSIONAL_ID,
        providerName: 'Profissional Pendente',
        title: 'Reparo residencial',
        serviceTitle: 'Reparo residencial',
        status: 'pending',
        statusLabel: 'Aguardando aceite',
        budget: 'R$ 300,00',
      },
      messages: [],
      createdAt: '2026-10-01T13:00:00.000Z',
      updatedAt: '2026-10-01T13:00:00.000Z',
    },
    {
      id: 'pd_messages_financial',
      name: 'Profissional Financeiro',
      peerName: 'Profissional Financeiro',
      clientId: CLIENT_ID,
      professionalId: PROFESSIONAL_ID,
      participants: [CLIENT_ID, PROFESSIONAL_ID],
      group: 'orders',
      status: 'in_progress',
      statusLabel: 'Em andamento',
      lastSeen: 'Atendimento em andamento',
      orderId: 'order_pd_messages_financial',
      order: {
        id: 'order_pd_messages_financial',
        clientId: CLIENT_ID,
        professionalId: PROFESSIONAL_ID,
        providerId: PROFESSIONAL_ID,
        providerName: 'Profissional Financeiro',
        title: 'Instalação elétrica',
        serviceTitle: 'Instalação elétrica',
        status: 'in_progress',
        statusLabel: 'Em andamento',
        proposalApprovedAt: '2026-10-01T14:00:00.000Z',
        chargeMessageId: 'financial-charge',
        paymentStatus: 'held',
        disputeStatus: 'em_analise',
        budget: 'R$ 900,00',
      },
      messages: [
        {
          id: 'financial-proposal',
          senderId: PROFESSIONAL_ID,
          author: 'Profissional Financeiro',
          type: 'proposal',
          amount: 'R$ 900,00',
          installments: 'À vista',
          text: 'Proposta aprovada para o atendimento.',
          createdAt: '2026-10-01T14:00:00.000Z',
          time: '14:00',
        },
        {
          id: 'financial-charge',
          senderId: PROFESSIONAL_ID,
          author: 'Profissional Financeiro',
          type: 'charge',
          financialKind: 'charge',
          amount: 'R$ 900,00',
          installments: 'À vista',
          paid: true,
          paymentStatus: 'held',
          text: 'Pagamento protegido durante a análise.',
          createdAt: '2026-10-01T14:10:00.000Z',
          time: '14:10',
        },
      ],
      createdAt: '2026-10-01T13:40:00.000Z',
      updatedAt: '2026-10-01T14:10:00.000Z',
    },
  ];
}

async function isolateRemoteDependencies(page, externalWrites) {
  await page.route('https://*.supabase.co/**', (route) => {
    const method = route.request().method().toUpperCase();
    if (!['GET', 'HEAD', 'OPTIONS'].includes(method)) {
      externalWrites.push({ method, url: route.request().url() });
    }
    return route.abort();
  });
  await page.route('https://cdn.jsdelivr.net/**', (route) => route.fulfill({
    contentType: 'application/javascript',
    body: '',
  }));
  await page.route('https://fonts.googleapis.com/**', (route) => route.fulfill({
    contentType: 'text/css',
    body: '',
  }));
  await page.route('https://fonts.gstatic.com/**', (route) => route.abort());
}

async function installSession(page) {
  await page.addInitScript(({ session, sessionKey }) => {
    localStorage.setItem('doke.dataProvider', 'mock');
    localStorage.setItem(sessionKey, JSON.stringify(session));
  }, { session: clientSession, sessionKey: SESSION_KEY });
}

async function waitForMessagesReady(page) {
  await expect(page.locator('body')).toHaveAttribute('data-page', 'mensagens');
  await expect(page).not.toHaveURL(/\/auth\/login\.html/);
  await expect.poll(() => page.evaluate(() => (
    document.querySelector('[data-messages-page]')?.dataset.messagesReady || ''
  )), { timeout: 30_000 }).toBe('true');
  await expect(page.locator('[data-messages-hydration-skeleton]')).toBeHidden();
}

async function bootMessages(page, externalWrites) {
  await isolateRemoteDependencies(page, externalWrites);
  await installSession(page);
  await page.goto('/mensagens.html?dokeDataProvider=mock', { waitUntil: 'domcontentloaded' });
  await waitForMessagesReady(page);
}

async function seedConversations(page) {
  const fixtures = conversationFixtures();
  await expect.poll(() => page.evaluate(() => (
    typeof window.Doke?.repositories?.messages?.writeLocal
  ))).toBe('function');

  await page.evaluate((items) => {
    window.Doke.repositories.messages.writeLocal(items);
    document.dispatchEvent(new CustomEvent('doke:auth-session-change', {
      detail: { source: 'pd-messages-001-e2e' },
    }));
  }, fixtures);

  await expect.poll(() => page.locator('.message-item[data-message-id]').count()).toBe(fixtures.length);
}

async function returnToConversationListIfNeeded(page) {
  const compactThreadOpen = await page.evaluate(() => (
    window.innerWidth <= 1180
    && document.querySelector('[data-messages-page]')?.dataset.messagesMode === 'thread'
  ));
  if (!compactThreadOpen) return;

  const back = page.locator('[data-messages-back]');
  await expect(back).toBeVisible();
  await back.click();
  await expect.poll(() => page.evaluate(() => (
    document.querySelector('[data-messages-page]')?.dataset.messagesMode || ''
  ))).toBe('list');
}

async function openConversation(page, id) {
  await returnToConversationListIfNeeded(page);
  const item = page.locator(`.message-item[data-message-id="${id}"]`).first();
  await expect(item).toBeVisible();
  await item.click();
  await expect(item).toHaveClass(/is-active/);
  await expect(page.locator('[data-thread-name]')).not.toHaveText('Selecione uma conversa');
  return item;
}

async function expectNoOverflow(page) {
  await expect.poll(() => page.evaluate(() => (
    Math.max(document.body?.scrollWidth || 0, document.documentElement.scrollWidth) - window.innerWidth
  ))).toBeLessThanOrEqual(1);
}

async function expectOrderActionForViewport(page) {
  const phoneThread = await page.evaluate(() => window.innerWidth <= 560);
  const orderAction = page.locator('.messages-thread__action--order');
  const chargeAction = page.locator('[data-messages-charge]');
  const callAction = page.locator('[data-thread-call-toggle]');
  const moreAction = page.locator('[data-thread-more-toggle]');

  if (phoneThread) {
    await expect(orderAction).toBeHidden();
    await expect(chargeAction).toBeHidden();
    await expect(callAction).toBeHidden();
    await expect(moreAction).toBeVisible();
    return;
  }

  await expect(orderAction).toBeVisible();
}

async function expectEmptyThreadAuthority(page) {
  await expect(page.locator('[data-thread-name]')).toHaveText('Selecione uma conversa');
  await expect(page.locator('.messages-thread__actions')).toBeHidden();
  await expect(page.locator('.messages-thread__action--order')).toBeHidden();
  await expect(page.locator('[data-thread-call-toggle]')).toBeDisabled();
  await expect(page.locator('[data-thread-more-toggle]')).toBeDisabled();
  await expect(page.locator('[data-messages-composer-input]')).toBeDisabled();
}

async function exerciseConversationDecisionHierarchy(page) {
  await expectEmptyThreadAuthority(page);
  await seedConversations(page);

  const acceptedItem = page.locator('.message-item[data-message-id="pd_messages_accepted"]');
  await expect(acceptedItem.locator('.message-item__badge')).toHaveText('3');
  await expect(acceptedItem.locator('.message-item__badge')).toBeVisible();

  await openConversation(page, 'pd_messages_contact');
  await expect(page.locator('.messages-thread__actions')).toBeVisible();
  await expect(page.locator('.messages-thread__action--order')).toBeHidden();
  await expect(page.locator('[data-thread-call-toggle]')).toBeEnabled();
  await expect(page.locator('[data-thread-more-toggle]')).toBeEnabled();
  await expect(page.locator('[data-messages-composer-input]')).toBeEnabled();

  await openConversation(page, 'pd_messages_accepted');
  await expectOrderActionForViewport(page);
  await expect(page.locator('[data-messages-composer-input]')).toBeEnabled();
  await expect(page.locator('.message-row.is-message-group-continuation')).toHaveCount(1);
  await expect(page.locator('.message-row.is-message-group-start')).toHaveCount(2);
  await expect(acceptedItem.locator('.message-item__badge')).toBeHidden();

  await openConversation(page, 'pd_messages_pending');
  await expectOrderActionForViewport(page);
  await expect(page.locator('[data-messages-composer-input]')).toBeDisabled();
  await expect(page.locator('[data-messages-thread-lock]')).toBeVisible();

  await openConversation(page, 'pd_messages_financial');
  await expectOrderActionForViewport(page);
  await expect(page.locator('[data-messages-composer-input]')).toBeEnabled();
  await expect(page.locator('.message-bubble__charge')).toHaveCount(2);
  await expect(page.locator('.message-bubble__charge-status--approved')).toBeVisible();
  await expect(page.locator('.message-bubble__charge-status--disputed')).toBeVisible();
  await expect(page.locator('.message-bubble__charge-value')).toContainText(['R$ 900,00', 'R$ 900,00']);
  await expect(page.locator('[data-messages-dispute-composer]')).toBeVisible();

  await expectNoOverflow(page);
}

for (const viewport of viewports) {
  test.describe(`PD-MESSAGES-001 direct ${viewport.name}`, () => {
    test.use({
      viewport: { width: viewport.width, height: viewport.height },
      isMobile: viewport.isMobile,
      hasTouch: viewport.hasTouch,
      locale: 'pt-BR',
    });

    test('keeps conversation decisions state-aware from empty through transactional states', async ({ page }, testInfo) => {
      test.setTimeout(60_000);
      const externalWrites = [];
      await bootMessages(page, externalWrites);
      await exerciseConversationDecisionHierarchy(page);
      await testInfo.attach(`pd-messages-${viewport.name}`, {
        body: await page.screenshot({ fullPage: false }),
        contentType: 'image/png',
      });
      expect(externalWrites).toEqual([]);
    });
  });
}

for (const viewport of [
  { name: 'mobile-390', width: 390, height: 844, isMobile: true, hasTouch: true },
  { name: 'desktop-1366', width: 1366, height: 768, isMobile: false, hasTouch: false },
]) {
  test.describe(`PD-MESSAGES-001 stable shell ${viewport.name}`, () => {
    test.use({
      viewport: { width: viewport.width, height: viewport.height },
      isMobile: viewport.isMobile,
      hasTouch: viewport.hasTouch,
      locale: 'pt-BR',
    });

    test('preserves the decision contract through DokeNavigate without a document reload', async ({ page }) => {
      test.setTimeout(60_000);
      const externalWrites = [];
      await isolateRemoteDependencies(page, externalWrites);
      await installSession(page);
      await page.goto('/index.html', { waitUntil: 'domcontentloaded' });
      await expect.poll(() => page.evaluate(() => typeof window.DokeNavigate)).toBe('function');

      await page.evaluate(() => {
        window.__pdMessagesStableShellMarker = 'same-document';
      });
      await page.evaluate(() => window.DokeNavigate('/mensagens.html'));
      await waitForMessagesReady(page);

      expect(await page.evaluate(() => window.__pdMessagesStableShellMarker || null)).toBe('same-document');
      await exerciseConversationDecisionHierarchy(page);
      expect(externalWrites).toEqual([]);
    });
  });
}
