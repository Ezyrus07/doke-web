const { test, expect } = require('@playwright/test');
const fs = require('fs');
const cp = require('child_process');

const PARENT_SHA = '820896977bfbba4f499b67f1707298f5bd7339be';
const CSS_FILE = 'assets/css/pages/pagamento-profissional.css';
const FOUNDATION_FILE = 'assets/css/pages/pagamento-profissional-foundation.css';
const HTML_FILE = 'pagamento-profissional.html';
const TARGET_SELECTOR = '.payment-finish-check';
const EXPECTED_DIAGNOSTIC_FILES = [
  'config/e2e-lanes.json',
  'scripts/run-e2e-lane.js',
  'tests/e2e/ux-css-debt-027-payment-finish-check-reach.spec.js',
];

const paymentFixture = {
  session: {
    provider: 'mock',
    sessionStatus: 'active',
    accountStatus: 'active',
    user: {
      id: 'payment-client',
      role: 'client',
      name: 'Cliente Payment',
      email: 'payment@example.test',
      accountStatus: 'active',
    },
  },
  order: {
    id: 'order_payment_valid',
    clientId: 'payment-client',
    professionalId: 'payment-professional',
    providerId: 'payment-professional',
    providerName: 'Profissional Payment',
    serviceTitle: 'Pintura validada',
    status: 'quoted',
    budget: 'R$ 280,00',
    proposalAmount: 'R$ 280,00',
    chargeMessageId: 'charge_payment_valid',
    createdAt: '2026-07-14T10:00:00.000Z',
  },
  conversation: {
    id: 'conversation_payment_valid',
    orderId: 'order_payment_valid',
    clientId: 'payment-client',
    professionalId: 'payment-professional',
    participants: ['payment-client', 'payment-professional'],
    order: {
      id: 'order_payment_valid',
      clientId: 'payment-client',
      professionalId: 'payment-professional',
      providerName: 'Profissional Payment',
      serviceTitle: 'Pintura validada',
      status: 'quoted',
      budget: 'R$ 280,00',
      proposalAmount: 'R$ 280,00',
      chargeMessageId: 'charge_payment_valid',
    },
    messages: [{
      id: 'charge_payment_valid',
      type: 'charge',
      financialKind: 'charge',
      amount: 'R$ 280,00',
      installments: 'À vista',
      senderId: 'payment-professional',
      chargeStatus: 'pending',
      chargeCreatedAt: '2026-07-14T10:05:00.000Z',
      createdAt: '2026-07-14T10:05:00.000Z',
    }],
    createdAt: '2026-07-14T10:00:00.000Z',
    updatedAt: '2026-07-14T10:05:00.000Z',
  },
};

const viewports = [
  [390, 844],
  [430, 900],
  [560, 900],
  [600, 900],
  [760, 900],
  [761, 900],
  [820, 1180],
  [1366, 900],
];

function gitShow(path) {
  return cp.execFileSync('git', ['show', `${PARENT_SHA}:${path}`], { encoding: 'utf8' });
}

function declaration(block, property) {
  const match = block.match(new RegExp(`(?:^|\\n)\\s*${property.replace('-', '\\-')}\\s*:\\s*([^;]+);`, 'm'));
  return match ? match[1].trim() : '';
}

test('static authority remains byte-identical to the certified parent', async () => {
  const changed = cp.execFileSync('git', ['diff', '--name-only', `${PARENT_SHA}...HEAD`], { encoding: 'utf8' })
    .trim()
    .split(/\r?\n/)
    .filter(Boolean)
    .sort();
  expect(changed).toEqual(EXPECTED_DIAGNOSTIC_FILES.slice().sort());

  for (const file of [CSS_FILE, FOUNDATION_FILE, HTML_FILE]) {
    expect(fs.readFileSync(file, 'utf8')).toBe(gitShow(file));
  }

  const css = fs.readFileSync(CSS_FILE, 'utf8');
  const foundation = fs.readFileSync(FOUNDATION_FILE, 'utf8');
  const html = fs.readFileSync(HTML_FILE, 'utf8');
  const blocks = [...css.matchAll(/\.payment-finish-check\s*\{([\s\S]*?)\}/g)].map((match) => match[1]);
  expect(blocks).toHaveLength(2);
  expect((html.match(/class="payment-finish-check\b/g) || [])).toHaveLength(1);
  expect(foundation).toContain('@import url("pagamento-profissional.css');

  const expected = {
    'align-items': ['flex-start', 'center'],
    gap: ['11px', '12px'],
    padding: ['14px', '12px 14px'],
    'border-radius': ['var(--form-control-surface-radius, var(--radius-sm))', 'var(--radius-base)'],
    background: ['#f8fbfe', 'rgba(248, 252, 255, 0.88)'],
    'font-size': ['0.8rem', '0.9rem'],
  };
  for (const [property, values] of Object.entries(expected)) {
    expect(blocks.map((block) => declaration(block, property))).toEqual(values);
  }
  console.log('STATIC PASS|parent=820896977bfb|dom=1|blocks=2|properties=6|productDiff=0');
});

test('canonical payment finish checkbox reaches the later winner at all target widths', async ({ page }) => {
  test.setTimeout(90_000);
  await page.route('https://fonts.googleapis.com/**', (route) => route.fulfill({ contentType: 'text/css', body: '' }));
  await page.addInitScript((fixture) => {
    localStorage.setItem('doke.auth.session.v1', JSON.stringify(fixture.session));
    localStorage.setItem('doke.orders.local.v1', JSON.stringify([fixture.order]));
    localStorage.setItem('doke.orders', JSON.stringify([fixture.order]));
    localStorage.setItem('doke.conversations.local.v1', JSON.stringify([fixture.conversation]));
    localStorage.setItem('doke.messages.local.v1', JSON.stringify([fixture.conversation]));
  }, paymentFixture);

  await page.goto('/pagamento-profissional.html?order=order_payment_valid&conversation=conversation_payment_valid&message=charge_payment_valid');
  await expect.poll(() => page.evaluate(() => document.body.dataset.pageHydration || 'missing')).toBe('ready');

  const initial = await page.evaluate(() => ({
    dom: document.querySelectorAll('.payment-finish-check').length,
    modalHidden: document.querySelector('[data-finish-order-modal]')?.hidden ?? null,
    bodyPage: document.body.dataset.page || '',
  }));
  expect(initial).toEqual({ dom: 1, modalHidden: true, bodyPage: 'pagamento-profissional' });

  await page.evaluate(() => {
    const modal = document.querySelector('[data-finish-order-modal]');
    modal.hidden = false;
    modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('payment-finish-modal-open');
  });

  for (const [width, height] of viewports) {
    await page.setViewportSize({ width, height });
    const state = await page.evaluate(() => {
      const target = document.querySelector('.payment-finish-check');
      const modal = document.querySelector('[data-finish-order-modal]');
      const properties = ['align-items', 'gap', 'padding', 'border-radius', 'background', 'font-size'];
      const values = Object.fromEntries(properties.map((property) => [property, []]));
      let targetRules = 0;

      const walk = (sheet) => {
        let rules;
        try { rules = sheet.cssRules; } catch { return; }
        if (!rules) return;
        for (const rule of rules) {
          if (rule.type === CSSRule.IMPORT_RULE && rule.styleSheet) {
            walk(rule.styleSheet);
            continue;
          }
          if (rule.type !== CSSRule.STYLE_RULE) continue;
          const owner = rule.parentStyleSheet?.href || sheet.href || '';
          if (!owner.includes('/assets/css/pages/pagamento-profissional.css')) continue;
          if (rule.selectorText !== '.payment-finish-check') continue;
          targetRules += 1;
          for (const property of properties) {
            const value = rule.style.getPropertyValue(property).trim();
            if (value) values[property].push(value);
          }
        }
      };
      for (const sheet of document.styleSheets) walk(sheet);

      const style = getComputedStyle(target);
      const root = getComputedStyle(document.documentElement);
      const rect = target.getBoundingClientRect();
      const rootFont = parseFloat(root.fontSize);
      const radiusBase = style.getPropertyValue('--radius-base').trim() || root.getPropertyValue('--radius-base').trim();
      return {
        targetRules,
        values,
        modalVisible: !modal.hidden && getComputedStyle(modal).display !== 'none',
        display: style.display,
        alignItems: style.alignItems,
        gap: style.gap,
        padding: [style.paddingTop, style.paddingRight, style.paddingBottom, style.paddingLeft],
        fontSize: parseFloat(style.fontSize),
        expectedFontSize: rootFont * 0.9,
        backgroundColor: style.backgroundColor,
        borderRadius: style.borderTopLeftRadius,
        radiusBase,
        rect: { left: rect.left, right: rect.right, width: rect.width, height: rect.height },
        viewport: window.innerWidth,
        document: {
          scrollWidth: document.documentElement.scrollWidth,
          clientWidth: document.documentElement.clientWidth,
          bodyScrollWidth: document.body.scrollWidth,
        },
      };
    });

    expect(state.targetRules).toBe(2);
    for (const property of ['align-items', 'gap', 'padding', 'border-radius', 'background', 'font-size']) {
      expect(state.values[property]).toHaveLength(2);
    }
    expect(state.values['align-items'].at(-1)).toBe('center');
    expect(state.values.gap.at(-1)).toBe('12px');
    expect(state.values.padding.at(-1)).toBe('12px 14px');
    expect(state.values['border-radius'].at(-1)).toBe('var(--radius-base)');
    expect(state.values['font-size'].at(-1)).toBe('0.9rem');
    expect(state.modalVisible).toBe(true);
    expect(state.display).toBe('flex');
    expect(state.alignItems).toBe('center');
    expect(state.gap).toBe('12px');
    expect(state.padding).toEqual(['12px', '14px', '12px', '14px']);
    expect(Math.abs(state.fontSize - state.expectedFontSize)).toBeLessThan(0.05);
    expect(state.backgroundColor).toMatch(/rgba?\(248, 252, 255(?:, 0\.88)?\)/);
    if (state.radiusBase) expect(state.borderRadius).toBe(state.radiusBase);
    expect(Number.isFinite(state.rect.width) && state.rect.width > 0).toBe(true);
    expect(Number.isFinite(state.rect.height) && state.rect.height > 0).toBe(true);
    expect(state.rect.left).toBeGreaterThanOrEqual(-1);
    expect(state.rect.right).toBeLessThanOrEqual(state.viewport + 1);
    expect(state.document.scrollWidth).toBeLessThanOrEqual(state.document.clientWidth + 1);
    expect(state.document.bodyScrollWidth).toBeLessThanOrEqual(state.document.clientWidth + 1);
    console.log(`REACH WIDTH PASS|w=${width}|rules=2|rect=${state.rect.width.toFixed(2)}x${state.rect.height.toFixed(2)}|overflow=0`);
  }

  console.log('REACH PASS|viewports=8|dom=1|naturalHidden=1|controlledVisible=1|cssom=2x6|winner=center+12px+12x14+radiusBase+rgba+0.9rem|overflow=0');
});
