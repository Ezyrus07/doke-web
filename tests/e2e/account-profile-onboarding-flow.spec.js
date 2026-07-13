const { test, expect } = require('@playwright/test');

const PASSWORD = 'Senha@123';
const AVATAR_PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', 'base64');
const COVER_PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl2nAAAAABJRU5ErkJggg==', 'base64');

async function uploadProfileMedia(page, selector, name, buffer) {
  await page.locator(selector).setInputFiles({ name, mimeType: 'image/png', buffer });
  const feedbackSelector = selector.includes('settings') ? '[data-settings-media-feedback]' : '[data-profile-media-feedback]';
  await expect(page.locator(feedbackSelector)).toContainText(/atualizada/);
}

async function clearAccountState(page) {
  await page.route('https://**/*', (route) => route.fulfill({ status: 200, body: '' }));
  await page.goto('/auth/cadastro.html', { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => {
    localStorage.removeItem('doke.auth.users.v1');
    localStorage.removeItem('doke.auth.userProfiles.v1');
    localStorage.removeItem('doke.auth.session.v1');
  });
  await page.reload({ waitUntil: 'domcontentloaded' });
}

async function register(page, suffix) {
  const handle = `fluxo.${suffix}`;
  await page.locator('#usuario-cadastro').fill(handle);
  await page.locator('#nome-cadastro').fill('Pessoa Fluxo');
  await page.locator('#email-cadastro').fill(`${handle}@example.com`);
  await page.locator('#senha-cadastro').fill(PASSWORD);
  await page.locator('[data-auth-signup] [data-auth-submit]').click();
  await page.waitForURL(/\/index\.html/, { waitUntil: 'domcontentloaded' });
  await expect(page.locator('[data-account-onboarding]')).toBeVisible();
  return handle;
}

test('cadastro, onboarding, perfis, configurações, reload e login por username convergem', async ({ page }) => {
  test.setTimeout(180_000);
  const pageErrors = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));

  await clearAccountState(page);
  const handle = await register(page, 'desktop');

  await page.locator('[data-account-onboarding-form] [name="city"]').fill('Salvador');
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.locator('[data-account-onboarding]')).toBeVisible();

  await page.locator('[data-account-onboarding-form] [name="city"]').fill('Salvador');
  await page.locator('[data-account-onboarding-form] [name="state"]').fill('BA');
  await page.locator('[data-account-onboarding-form] [name="bio"]').fill('Perfil persistente do fluxo.');
  await page.locator('[data-account-onboarding-form] [name="interests"]').fill('Tecnologia, Casa');
  await page.locator('[data-account-onboarding-submit]').click();
  await expect(page.locator('[data-account-onboarding]')).toBeHidden();
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.locator('[data-account-onboarding]')).toBeHidden();

  await page.evaluate(() => window.DokeNavigate('meu-perfil.html'));
  await page.waitForURL(/\/meu-perfil\.html/, { waitUntil: 'domcontentloaded' });
  await expect(page.locator('[data-profile-name]')).toHaveText('Pessoa Fluxo');
  await expect(page.locator('[data-profile-meta]')).toContainText(`@${handle}`);
  await expect(page.locator('[data-profile-bio]')).toHaveText('Perfil persistente do fluxo.');
  await expect(page.getByRole('link', { name: 'Editar perfil' })).toHaveCount(1);
  await expect(page.getByText('Ver público', { exact: true })).toHaveCount(0);
  await uploadProfileMedia(page, '[data-profile-media-input="avatar"]', 'avatar-owner.png', AVATAR_PNG);
  await uploadProfileMedia(page, '[data-profile-media-input="cover"]', 'cover-owner.png', COVER_PNG);
  await expect(page.locator('[data-profile-avatar-image]')).toHaveAttribute('src', /^data:image\/png;base64,/);
  await expect(page.locator('[data-profile-cover-image]')).toHaveAttribute('src', /^data:image\/png;base64,/);
  await expect(page.locator('.home-side-meta__avatar img').first()).toHaveAttribute('src', /^data:image\/png;base64,/);

  await page.evaluate(() => window.DokeNavigate('perfil-cliente.html'));
  await page.waitForURL(/\/perfil-cliente\.html/, { waitUntil: 'domcontentloaded' });
  await expect(page.locator('[data-profile-name]')).toHaveText('Pessoa Fluxo');
  await expect(page.locator('[data-profile-meta]')).toContainText(`@${handle}`);
  await expect(page.locator('[data-profile-avatar-image]')).toHaveAttribute('src', /^data:image\/png;base64,/);
  await expect(page.locator('[data-profile-cover-image]')).toHaveAttribute('src', /^data:image\/png;base64,/);

  await page.evaluate(() => window.DokeNavigate('configuracoes.html?tab=profile'));
  await page.waitForURL(/\/configuracoes\.html\?tab=profile/, { waitUntil: 'domcontentloaded' });
  await expect(page.locator('[data-profile-field="city"]')).toHaveValue('Salvador');
  await expect(page.locator('[data-profile-field="bio"]')).toHaveValue('Perfil persistente do fluxo.');
  await expect(page.locator('[data-settings-profile-avatar]')).toHaveAttribute('src', /^data:image\/png;base64,/);
  await expect(page.locator('[data-settings-profile-cover]')).toHaveAttribute('src', /^data:image\/png;base64,/);
  await uploadProfileMedia(page, '[data-settings-profile-media="avatar"]', 'avatar-settings.png', COVER_PNG);
  await uploadProfileMedia(page, '[data-settings-profile-media="cover"]', 'cover-settings.png', AVATAR_PNG);

  await page.evaluate(() => {
    window.__profileUpdateEvents = 0;
    window.addEventListener('doke:profile-updated', () => { window.__profileUpdateEvents += 1; });
  });
  await page.locator('[data-profile-field="handle"]').fill('fluxo.editado');
  await page.locator('[data-profile-field="city"]').fill('Recife');
  await page.locator('[data-profile-field="state"]').fill('PE');
  await page.locator('[data-profile-field="bio"]').fill('Perfil editado nas configurações.');
  await page.locator('[data-settings-save-profile]').click();
  await expect.poll(() => page.evaluate(() => window.__profileUpdateEvents)).toBe(1);

  await page.evaluate(() => window.DokeNavigate('meu-perfil.html'));
  await page.waitForURL(/\/meu-perfil\.html/, { waitUntil: 'domcontentloaded' });
  await expect(page.locator('[data-profile-meta]')).toContainText('@fluxo.editado');
  await expect(page.locator('[data-profile-meta]')).toContainText('Recife, PE');
  await expect(page.locator('[data-profile-bio]')).toHaveText('Perfil editado nas configurações.');
  await expect(page.locator('[data-profile-avatar-image]')).toHaveAttribute('src', `data:image/png;base64,${COVER_PNG.toString('base64')}`);
  await expect(page.locator('[data-profile-cover-image]')).toHaveAttribute('src', `data:image/png;base64,${AVATAR_PNG.toString('base64')}`);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.locator('[data-profile-meta]')).toContainText('@fluxo.editado');
  await expect(page.locator('[data-profile-avatar-image]')).toHaveAttribute('src', `data:image/png;base64,${COVER_PNG.toString('base64')}`);

  await page.goto('/configuracoes.html?tab=profile', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('[data-profile-field="city"]')).toHaveValue('Recife');
  await expect(page.locator('[data-profile-field="bio"]')).toHaveValue('Perfil editado nas configurações.');
  await expect(page.locator('[data-settings-profile-avatar]')).toHaveAttribute('src', `data:image/png;base64,${COVER_PNG.toString('base64')}`);
  await expect(page.locator('[data-settings-profile-cover]')).toHaveAttribute('src', `data:image/png;base64,${AVATAR_PNG.toString('base64')}`);

  await page.evaluate(() => window.DokeAuth.service.logout());
  await page.goto('/auth/login.html', { waitUntil: 'domcontentloaded' });
  await page.locator('#email-login').fill('fluxo.editado');
  await page.locator('#senha-login').fill(PASSWORD);
  await page.locator('[data-auth-login] [data-auth-submit]').click();
  await page.waitForURL(/\/index\.html/, { waitUntil: 'domcontentloaded' });
  await expect(page.locator('[data-account-onboarding]')).toBeHidden();
  await page.goto('/meu-perfil.html', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('[data-profile-meta]')).toContainText('@fluxo.editado');
  await expect(page.locator('[data-profile-avatar-image]')).toHaveAttribute('src', `data:image/png;base64,${COVER_PNG.toString('base64')}`);
  await expect(page.locator('[data-profile-cover-image]')).toHaveAttribute('src', `data:image/png;base64,${AVATAR_PNG.toString('base64')}`);
  expect(pageErrors).toEqual([]);
});

for (const viewport of [
  { name: 'desktop', width: 1366, height: 768 },
  { name: 'tablet', width: 820, height: 1180 },
  { name: 'mobile', width: 390, height: 844 }
]) {
  test(`onboarding usa uma única borda e um único focus ring em ${viewport.name}`, async ({ page }) => {
    test.setTimeout(180_000);
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await clearAccountState(page);
    await register(page, viewport.name);

    const textarea = page.locator('[data-account-onboarding-form] textarea.doke-textarea');
    await textarea.focus();
    const owners = await textarea.evaluate((control) => {
      const nodes = [control, control.parentElement];
      return nodes.map((node) => {
        const style = getComputedStyle(node);
        return {
          border: parseFloat(style.borderTopWidth) > 0 && style.borderTopStyle !== 'none',
          ring: style.boxShadow !== 'none' && style.boxShadow !== ''
        };
      });
    });
    expect(owners.filter((owner) => owner.border)).toHaveLength(1);
    expect(owners.filter((owner) => owner.ring)).toHaveLength(1);

    await page.locator('[data-account-onboarding-form] [name="city"]').fill('Salvador');
    await page.locator('[data-account-onboarding-form] [name="state"]').fill('BA');
    await page.locator('[data-account-onboarding-submit]').click();
    await expect(page.locator('[data-account-onboarding]')).toBeHidden();
    await page.goto('/meu-perfil.html', { waitUntil: 'domcontentloaded' });
    await uploadProfileMedia(page, '[data-profile-media-input="avatar"]', `avatar-${viewport.name}.png`, AVATAR_PNG);
    await uploadProfileMedia(page, '[data-profile-media-input="cover"]', `cover-${viewport.name}.png`, COVER_PNG);
    const ownerMediaLayout = await page.evaluate(() => {
      const avatar = document.querySelector('.profile-avatar');
      const avatarImage = document.querySelector('[data-profile-avatar-image]');
      const cover = document.querySelector('.profile-hero__cover');
      const coverImage = document.querySelector('[data-profile-cover-image]');
      const avatarBox = avatar?.getBoundingClientRect();
      const avatarImageBox = avatarImage?.getBoundingClientRect();
      const coverBox = cover?.getBoundingClientRect();
      const coverImageBox = coverImage?.getBoundingClientRect();
      return {
        noHorizontalOverflow: document.documentElement.scrollWidth <= window.innerWidth,
        avatarWidth: avatarBox?.width || 0,
        avatarImageFits: (avatarImageBox?.width || 0) <= (avatarBox?.width || 0)
          && (avatarImageBox?.width || 0) >= (avatarBox?.width || 0) * 0.8,
        coverImageFits: Math.abs((coverBox?.width || 0) - (coverImageBox?.width || 0)) < 1
          && Math.abs((coverBox?.height || 0) - (coverImageBox?.height || 0)) < 1
      };
    });
    expect(ownerMediaLayout.noHorizontalOverflow).toBe(true);
    expect(ownerMediaLayout.avatarWidth).toBeLessThanOrEqual(116);
    expect(ownerMediaLayout.avatarImageFits).toBe(true);
    expect(ownerMediaLayout.coverImageFits).toBe(true);

    await page.goto('/configuracoes.html?tab=profile', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('[data-settings-profile-avatar]')).toBeVisible();
    await expect(page.locator('[data-settings-profile-cover]')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  });
}

test('serviços de mensagens e comunidade continuam sob demanda na navegação interna', async ({ page }) => {
  test.setTimeout(180_000);
  await page.route('https://**/*', (route) => route.fulfill({ status: 200, body: '' }));
  await page.goto('/index.html', { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => window.DokeNavigate('/mensagens.html'));
  await page.waitForURL(/\/mensagens\.html/, { waitUntil: 'domcontentloaded' });
  await expect.poll(() => page.evaluate(() => typeof window.Doke?.services?.messages?.listConversations)).toBe('function');

  await page.evaluate(() => window.DokeNavigate('/comunidade.html'));
  await page.waitForURL(/\/comunidade\.html/, { waitUntil: 'domcontentloaded' });
  await expect.poll(() => page.evaluate(() => typeof window.Doke?.services?.communities?.list)).toBe('function');

  await page.evaluate(() => window.DokeNavigate('/carteira.html'));
  await page.waitForURL(/\/carteira\.html/, { waitUntil: 'domcontentloaded' });
  await expect.poll(() => page.evaluate(() => typeof window.Doke?.services?.wallet?.getWallet)).toBe('function');
});
