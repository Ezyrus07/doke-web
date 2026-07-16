#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const tokensPath = path.join(root, 'assets/css/core/tokens.css');
const tokens = fs.readFileSync(tokensPath, 'utf8');
const errors = [];

const required = [
  '--doke-state-info-bg',
  '--doke-state-info-bg-muted',
  '--doke-state-info-bg-strong',
  '--doke-state-info-border',
  '--doke-state-info-border-neutral',
  '--doke-state-info-border-soft',
  '--doke-state-info-text',
  '--doke-state-info-text-strong',
  '--doke-state-success-bg',
  '--doke-state-success-bg-muted',
  '--doke-state-success-bg-emphasis',
  '--doke-state-success-bg-interactive',
  '--doke-state-success-bg-status',
  '--doke-state-success-border',
  '--doke-state-success-border-soft',
  '--doke-state-success-border-strong',
  '--doke-state-success-border-emphasis',
  '--doke-state-success-border-status',
  '--doke-state-success-text',
  '--doke-state-success-text-strong',
  '--doke-state-success-text-interactive',
  '--doke-state-success-text-status',
  '--doke-state-success-icon',
  '--doke-state-success-ring',
  '--doke-state-warning-bg',
  '--doke-state-warning-border',
  '--doke-state-warning-text',
  '--doke-state-warning-shadow',
  '--doke-state-danger-bg',
  '--doke-state-danger-bg-status',
  '--doke-state-danger-bg-muted',
  '--doke-state-danger-bg-icon',
  '--doke-state-danger-border',
  '--doke-state-danger-border-soft',
  '--doke-state-danger-border-strong',
  '--doke-state-danger-border-form',
  '--doke-state-danger-text',
  '--doke-state-danger-text-form',
  '--doke-state-danger-text-status',
  '--doke-state-danger-text-muted',
  '--doke-state-danger-text-icon',
  '--doke-state-danger-text-expired'
];

for (const token of required) {
  if (!tokens.includes(`${token}:`)) errors.push(`missing token ${token}`);
}

const targets = [
  'assets/css/components/feedback/submission-feedback.css',
  'assets/css/components/feedback/notification-event-toast.css',
  'assets/css/components/in-app-notifications.css',
  'assets/css/pages/verificacao-profissional/visual-hierarchy.css',
  'assets/css/pages/tornar-profissional/visual-hierarchy.css',
  'assets/css/pages/pagamento-profissional/visual-hierarchy.css',
  'assets/css/pages/pagamento-profissional.css',
  'assets/css/pages/notificacoes/base-layout.css',
  'assets/css/pages/notificacoes/visual-hierarchy.css',
  'assets/css/pages/admin-verificacao.css'
];

const banned = [
  'rgba(17, 124, 104, 0.35)',
  'rgba(17, 124, 104, 0.07)',
  'rgba(236, 253, 245, .78)',
  'rgba(13, 143, 119, .32)',
  'rgba(200, 63, 75, 0.22)',
  '#fff2f3',
  '#fff7f7',
  '#fff7e8',
  'rgba(191, 230, 220, 0.92)'
];

for (const relative of targets) {
  const full = path.join(root, relative);
  if (!fs.existsSync(full)) {
    errors.push(`missing target ${relative}`);
    continue;
  }
  const text = fs.readFileSync(full, 'utf8');
  for (const literal of banned) {
    if (text.includes(literal)) errors.push(`${relative} reintroduces ${literal}`);
  }
}

if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}

console.log('Semantic state contract: OK');
