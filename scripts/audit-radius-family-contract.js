#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const tokensPath = path.join(root, 'assets/css/core/tokens.css');
const tokens = fs.readFileSync(tokensPath, 'utf8');
const errors = [];

const requiredTokens = [
  '--doke-radius-control-sm',
  '--doke-radius-control',
  '--doke-radius-control-comfortable',
  '--doke-radius-control-lg',
  '--doke-radius-action-item',
  '--doke-radius-card-sm',
  '--doke-radius-card',
  '--doke-radius-card-lg',
  '--doke-radius-panel',
  '--doke-radius-panel-compact',
  '--doke-radius-popover',
  '--doke-radius-sheet',
  '--doke-radius-modal',
  '--doke-radius-avatar',
  '--doke-radius-pill'
];

for (const token of requiredTokens) {
  if (!tokens.includes(`${token}:`)) errors.push(`missing token ${token}`);
}

const targets = [
  'assets/css/components/chat-realtime-presence.css',
  'assets/css/components/dropdowns.css',
  'assets/css/components/in-app-notifications.css',
  'assets/css/components/community-runtime-stability.css',
  'assets/css/components/overlays/action-menu.css',
  'assets/css/components/overlays/member-action-sheet.css',
  'assets/css/components/overlays/system-dialog.css'
];

const declarationPattern = /border-radius\s*:\s*([^;}{]+)/gi;
const literalUnitPattern = /(?:^|[\s(])\d+(?:\.\d+)?(?:px|rem|em|%)(?:\s|$|\))/i;

for (const relative of targets) {
  const fullPath = path.join(root, relative);
  if (!fs.existsSync(fullPath)) {
    errors.push(`missing target ${relative}`);
    continue;
  }

  const css = fs.readFileSync(fullPath, 'utf8');
  let match;
  while ((match = declarationPattern.exec(css))) {
    const value = match[1].trim();
    if (literalUnitPattern.test(value) && !value.includes('var(') && !value.includes('calc(')) {
      errors.push(`${relative} contains literal border-radius: ${value}`);
    }
  }
}

if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}

console.log('Radius family contract: OK');
