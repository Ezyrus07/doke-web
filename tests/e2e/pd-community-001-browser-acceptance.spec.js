const { test, expect } = require('@playwright/test');

const SESSION_KEY = 'doke.auth.session.v1';
const CLIENT_ID = 'pd_community_client';
const CLIENT_EMAIL = 'community-qa@example.test';
const OWNER_EMAIL = 'community-owner@example.test';

const clientSession = Object.freeze({
  provider: 'mock',
  sessionStatus: 'active',
  accountStatus: 'active',
  remember: false,
  user: Object.freeze({
    id: CLIENT_ID,
    accountId: CLIENT_ID,
    name: 'Cliente Comunidade QA',
    email: CLIENT_EMAIL,
    role: 'client',
    type: 'client',
    initials: 'CQ',
    accountStatus: 'active',
    profile: Object.freeze({
      id: CLIENT_ID,
      accountId: CLIENT_ID,
      email: CLIENT_EMAIL,
    }),
  }),
});

const viewports = [
  { name: 'mobile-390', width: 390, height: 844, isMobile: true, hasTouch: true },
  { name: 'tablet-608', width: 608, height: 926, isMobile: false, hasTouch: true },
  { name: 'tablet-820', width: 820, height: 1180, isMobile: false, hasTouch: true },
  { name: 'tablet-1024', width: 1024, height: 768, isMobile: false, hasTouch: true },
  { name: 'desktop-1366', width: 1366, height: 768, isMobile: false, hasTouch: false },
];

function ownerMember() {
  return {
    id: OWNER_EMAIL,
    accountKey: OWNER_EMAIL,
    name: 'Administrador Comunidade',
    email: OWNER_EMAIL,
    identityKeys: [OWNER_EMAIL],
    role: 'owner',
    roleIds: ['owner'],
    source: 'fixture',
  };
}

function clientMember() {
  return {
    id: CLIENT_ID,
    accountKey: CLIENT_EMAIL,
    name: 'Cliente Comunidade QA',
    email: CLIENT_EMAIL,
    identityKeys: [CLIENT_ID, CLIENT_EMAIL],
    role: 'member',
    roleIds: ['member'],
    source: 'fixture',
  };
}

function communityFixtures() {
  const owner = ownerMember();
  return [
    {
      id: 'pd-community-public',
      title: 'Tecnologia Salvador',
      description: 'Comunidade pública de tecnologia.',
      category: 'tecnologia',
      type: 'public',
      visibility: 'public',
      entryMode: 'auto',
      ownerId: OWNER_EMAIL,
      ownerIdentityKeys: [OWNER_EMAIL],
      members: [owner],
    },
    {
      id: 'pd-community-private',
      title: 'Condomínio Horizonte',
      description: 'Comunidade privada com aprovação.',
      category: 'condominios',
      type: 'private',
      visibility: 'private',
      entryMode: 'approval',
      ownerId: OWNER_EMAIL,
      ownerIdentityKeys: [OWNER_EMAIL],
      members: [owner],
      joinQuestions: ['Qual é o seu vínculo com o condomínio?'],
    },
    {
      id: 'pd-community-pending',
      title: 'Reformas Premium',
      description: 'Comunidade privada com solicitação pendente.',
      category: 'reforma',
      type: 'private',
      visibility: 'private',
      entryMode: 'approval',
      ownerId: OWNER_EMAIL,
      ownerIdentityKeys: [OWNER_EMAIL],
      members: [owner],
      joinRequests: [{
        id: 'request-pending',
        userId: CLIENT_ID,
        accountKey: CLIENT_EMAIL,
        userEmail: CLIENT_EMAIL,
        identityKeys: [CLIENT_ID, CLIENT_EMAIL],
        userName: 'Cliente Comunidade QA',
        status: 'pending',
        requestedAt: '2026-10-03T12:00:00.000Z',
      }],
    },
    {
      id: 'pd-community-member',
      title: 'Serviços do Bairro',
      description: 'Comunidade em que o usuário já participa.',
      category: 'servicos',
      type: 'public',
      visibility: 'public',
      entryMode: 'auto',
      ownerId: OWNER_EMAIL,
      ownerIdentityKeys: [OWNER_EMAIL],
      members: [owner, clientMember()],
    },
    {
      id: 'pd-community-banned',
      title: 'Dicas da Cidade',
      description: 'Comunidade com acesso bloqueado por banimento.',
      category: 'dicas',
      type: 'public',
      visibility: 'public',
      entryMode: 'auto',
      ownerId: OWNER_EMAIL,
      ownerIdentityKeys: [OWNER_EMAIL],
      members: [owner, clientMember()],
      bans: [{
        id: 'ban-client',
        accountKey: CLIENT_EMAIL,
        identityKeys: [CLIENT_ID, CLIENT_EMAIL],
        reason: 'Violação de regra da comunidade',
        bannedAt: '2026-10-03T12:00:00.000Z',
        expiresAt: '2099-10-03T12:00:00.000Z',
        bannedByAccountKey: OWNER_EMAIL,
        bannedByName: 'Administrador Comunidade',
      }],
    },
    {
      id: 'pd-community-invite',
      title: 'Clube Convite',
      description: 'Comunidade privada acessível por convite.',
      category: 'servicos',
      type: 'private',
      visibility: 'private',
      entryMode: 'auto',
      ownerId: OWNER_EMAIL,
      ownerIdentityKeys: [OWNER_EMAIL],
      members: [owner],
      invite: {
        id: 'invite-kontrat-8241',
        code: 'KONTRAT-8241',
        active: true,
        createdAt: '2026-10-03T12:00:00.000Z',
        expiresAt: '2099-10-03T12:00:00.000Z',
        maxUses: 10,
        uses: 0,
        requireApproval: false,
      },
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

async function waitForCommunityReady(page) {
  await expect(page.locator('body')).toHaveAttribute('data-page', 'comunidade');
  await expect(page).not.toHaveURL(/\/auth\/login\.html/);
  await expect.poll(() => page.evaluate(() => (
    document.querySelector('[data-communities-page]')?.dataset.communityHydrated || ''
  )), { timeout: 30_000 }).toBe('true');
  await expect(page.locator('body')).toHaveAttribute('data-data-state', 'hydrated');
  await expect(page.locator('[data-community-hydration-skeleton]')).toBeHidden();
}

async function seedCommunities(page) {
  const fixtures = communityFixtures();
  await expect.poll(() => page.evaluate(() => (
    typeof window.Doke?.communityDomain?.repository?.saveAll
  )), { timeout: 30_000 }).toBe('function');

  const saved = await page.evaluate((records) => {
    const ok = window.Doke.communityDomain.repository.saveAll(records);
    document.dispatchEvent(new CustomEvent('doke:auth-surface-ready'));
    return ok;
  }, fixtures);
  expect(saved).toBe(true);

  await expect(page.locator('[data-community-card][data-community-id="pd-community-public"]')).toHaveCount(1);
  await expect(page.locator('[data-community-card][data-community-id="pd-community-member"]')).toHaveCount(1);
}

async function bootCommunity(page, externalWrites) {
  await isolateRemoteDependencies(page, externalWrites);
  await installSession(page);
  await page.goto('/comunidade.html?dokeDataProvider=mock', { waitUntil: 'domcontentloaded' });
  await waitForCommunityReady(page);
  await seedCommunities(page);
}

async function expectNoOverflow(page) {
  await expect.poll(() => page.evaluate(() => (
    Math.max(document.body?.scrollWidth || 0, document.documentElement.scrollWidth) - window.innerWidth
  ))).toBeLessThanOrEqual(1);
}

function card(page, id) {
  return page.locator(`[data-community-card][data-community-id="${id}"]`);
}

async function visibleSearchInput(page) {
  return page.locator('[data-community-search]:visible, [data-community-search-mobile]:visible').first();
}

async function assertMembershipHierarchy(page) {
  const publicCard = card(page, 'pd-community-public');
  const privateCard = card(page, 'pd-community-private');
  const pendingCard = card(page, 'pd-community-pending');
  const memberCard = card(page, 'pd-community-member');
  const bannedCard = card(page, 'pd-community-banned');

  await expect(publicCard.locator('[data-community-public-join]')).toHaveText('Participar');

  const requestButton = privateCard.locator('[data-community-request]');
  await expect(requestButton).toHaveText('Solicitar entrada');
  await expect(requestButton).toHaveAttribute('aria-haspopup', 'dialog');
  await expect(requestButton).toHaveAttribute('aria-controls', 'community-request-modal');
  await expect(requestButton).toHaveAttribute('aria-expanded', 'false');

  const pendingButton = pendingCard.locator('[data-community-request]');
  await expect(pendingButton).toHaveText('Solicitação pendente');
  await expect(pendingButton).toBeDisabled();

  await expect(memberCard.locator('[data-community-enter]')).toHaveText('Abrir');
  await expect(bannedCard.getByRole('button', { name: 'Você foi banido' })).toBeDisabled();
  await expect(bannedCard.locator('[data-community-ban-countdown]')).toBeVisible();

  const createAction = page.locator('[data-community-create]:visible').first();
  await expect(createAction).toBeVisible();
}

async function assertRequestDialogLifecycle(page) {
  const requestButton = card(page, 'pd-community-private').locator('[data-community-request]');
  const modal = page.locator('[data-community-request-modal]');

  await requestButton.click();
  await expect(modal).toBeVisible();
  await expect(modal).toHaveAttribute('aria-hidden', 'false');
  await expect(requestButton).toHaveAttribute('aria-expanded', 'true');
  await expect.poll(() => page.evaluate(() => (
    Boolean(document.querySelector('[data-community-request-modal]')?.contains(document.activeElement))
  ))).toBe(true);

  const trapped = await modal.evaluate((root) => {
    const focusables = [...root.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')]
      .filter((item) => !item.disabled && item.offsetParent !== null);
    const last = focusables[focusables.length - 1];
    last?.focus();
    return Boolean(last);
  });
  expect(trapped).toBe(true);
  await page.keyboard.press('Tab');
  await expect.poll(() => page.evaluate(() => (
    Boolean(document.querySelector('[data-community-request-modal]')?.contains(document.activeElement))
  ))).toBe(true);

  await page.keyboard.press('Escape');
  await expect(modal).toBeHidden();
  await expect(requestButton).toHaveAttribute('aria-expanded', 'false');
  await expect(requestButton).toBeFocused();

  await requestButton.click();
  await modal.getByRole('button', { name: 'Cancelar' }).click();
  await expect(modal).toBeHidden();
  await expect(requestButton).toBeFocused();

  await requestButton.click();
  await modal.locator('[data-community-request-role]').selectOption('interessado');
  await modal.locator('[data-community-request-message]').fill('Quero participar da comunidade.');
  const answer = modal.locator('[data-community-request-answer="0"]');
  if (await answer.count()) await answer.fill('Sou morador da região.');
  await modal.getByRole('button', { name: 'Enviar solicitação' }).click();
  await expect(modal.locator('[data-community-action-feedback]')).toContainText('Solicitação enviada');
  await expect(modal).toBeHidden({ timeout: 4_000 });

  const pendingButton = card(page, 'pd-community-private').locator('[data-community-request]');
  await expect(pendingButton).toHaveText('Solicitação pendente');
  await expect(pendingButton).toBeDisabled();

  const persisted = await page.evaluate(() => {
    const record = window.Doke.communityDomain.repository.getById('pd-community-private');
    return (record?.joinRequests || []).some((item) => item.status === 'pending');
  });
  expect(persisted).toBe(true);
}

async function assertSearchFilterAndEmptyState(page) {
  const search = await visibleSearchInput(page);
  await expect(search).toBeVisible();

  await search.fill('Tecnologia Salvador');
  await expect(card(page, 'pd-community-public')).toBeVisible();
  await expect(card(page, 'pd-community-pending')).toBeHidden();

  await search.fill('');
  await page.locator('[data-community-filter="tecnologia"]').click();
  await expect(card(page, 'pd-community-public')).toBeVisible();
  await expect(card(page, 'pd-community-pending')).toBeHidden();

  await page.locator('[data-community-filter="all"]').click();
  await search.fill('resultado-inexistente-pd-community');
  await expect(page.locator('[data-community-empty]')).toBeVisible();

  await search.fill('');
  await expect(page.locator('[data-community-empty]')).toBeHidden();
  await expect(page.locator('[data-community-load-more]')).toBeHidden();
}

for (const viewport of viewports) {
  test.describe(`PD-COMMUNITY-001 direct ${viewport.name}`, () => {
    test.use({
      viewport: { width: viewport.width, height: viewport.height },
      isMobile: viewport.isMobile,
      hasTouch: viewport.hasTouch,
    });

    test('keeps membership decisions, request dialog, discovery state and handoff canonical', async ({ page }) => {
      const externalWrites = [];
      await bootCommunity(page, externalWrites);

      await assertMembershipHierarchy(page);
      await assertRequestDialogLifecycle(page);
      await assertSearchFilterAndEmptyState(page);
      await expectNoOverflow(page);

      const memberOpen = card(page, 'pd-community-member').locator('[data-community-enter]');
      await Promise.all([
        page.waitForURL(/\/comunidade-interna\.html\?.*community=pd-community-member/, { timeout: 15_000 }),
        memberOpen.click(),
      ]);
      await expect(page.locator('body')).toHaveAttribute('data-page', 'comunidade-interna');
      await expect.poll(() => page.evaluate(() => (
        document.querySelector('[data-community-room]')?.dataset.communityRoomReady || ''
      )), { timeout: 30_000 }).toBe('true');
      expect(externalWrites).toEqual([]);
    });
  });
}

test.describe('PD-COMMUNITY-001 entry transitions', () => {
  test.use({ viewport: { width: 1366, height: 768 }, isMobile: false, hasTouch: false });

  test('public visitor joins through canonical membership authority and opens room', async ({ page }) => {
    const externalWrites = [];
    await bootCommunity(page, externalWrites);

    const publicJoin = card(page, 'pd-community-public').locator('[data-community-public-join]');
    await Promise.all([
      page.waitForURL(/\/comunidade-interna\.html\?.*community=pd-community-public/, { timeout: 15_000 }),
      publicJoin.click(),
    ]);
    await expect(page.locator('body')).toHaveAttribute('data-page', 'comunidade-interna');

    const joined = await page.evaluate(() => {
      const record = window.Doke.communityDomain.repository.getById('pd-community-public');
      const relation = window.Doke.communityDomain.identity.resolveCommunityRelation({
        community: record,
        currentUser: window.Doke.communityDomain.identity.resolveCurrentUser(),
      });
      return relation.relation;
    });
    expect(joined).toBe('member');
    expect(externalWrites).toEqual([]);
  });

  test('valid invite uses canonical invite authority and opens room', async ({ page }) => {
    const externalWrites = [];
    await bootCommunity(page, externalWrites);

    const codeTrigger = page.locator('[data-community-code-trigger]:visible').first();
    await codeTrigger.click();
    const modal = page.locator('[data-community-code-modal]');
    await expect(modal).toBeVisible();
    await modal.locator('#community-action-code-input').fill('KONTRAT-8241');

    await Promise.all([
      page.waitForURL(/\/comunidade-interna\.html\?.*community=pd-community-invite/, { timeout: 15_000 }),
      modal.getByRole('button', { name: 'Entrar na comunidade' }).click(),
    ]);
    await expect(page.locator('body')).toHaveAttribute('data-page', 'comunidade-interna');

    const joined = await page.evaluate(() => {
      const record = window.Doke.communityDomain.repository.getById('pd-community-invite');
      return window.Doke.communityDomain.identity.resolveCommunityRelation({
        community: record,
        currentUser: window.Doke.communityDomain.identity.resolveCurrentUser(),
      }).relation;
    });
    expect(joined).toBe('member');
    expect(externalWrites).toEqual([]);
  });
});

for (const viewport of [
  { name: 'mobile-390', width: 390, height: 844, isMobile: true, hasTouch: true },
  { name: 'desktop-1366', width: 1366, height: 768, isMobile: false, hasTouch: false },
]) {
  test.describe(`PD-COMMUNITY-001 stable shell ${viewport.name}`, () => {
    test.use({
      viewport: { width: viewport.width, height: viewport.height },
      isMobile: viewport.isMobile,
      hasTouch: viewport.hasTouch,
    });

    test('stable-shell navigation commits community without losing membership hierarchy', async ({ page }) => {
      const externalWrites = [];
      await isolateRemoteDependencies(page, externalWrites);
      await installSession(page);
      await page.goto('/index.html?dokeDataProvider=mock', { waitUntil: 'domcontentloaded' });
      await expect.poll(() => page.evaluate(() => typeof window.DokeNavigate)).toBe('function');

      await page.evaluate(async () => {
        const result = window.DokeNavigate('comunidade.html?dokeDataProvider=mock');
        if (result && typeof result.then === 'function') await result;
      });
      await expect(page).toHaveURL(/\/comunidade\.html(?:\?|$)/);
      await waitForCommunityReady(page);
      await seedCommunities(page);

      await assertMembershipHierarchy(page);
      await expectNoOverflow(page);
      expect(externalWrites).toEqual([]);
    });
  });
}
