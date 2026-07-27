#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();

function read(file) {
  return fs.readFileSync(path.join(ROOT, file), 'utf8');
}

function write(file, content) {
  fs.writeFileSync(path.join(ROOT, file), content);
}

function replaceExact(file, before, after, label) {
  const source = read(file);
  if (!source.includes(before)) {
    throw new Error(`FE-T01 override migration could not find ${label} in ${file}`);
  }
  write(file, source.replace(before, after));
}

replaceExact(
  'assets/css/components/ui/doke-ui-system.css',
  '    --doke-color-primary: var(--color-primary, #176db5);\n',
  '',
  'duplicated public primary declaration'
);

replaceExact(
  'assets/css/pages/home-shell.css',
  `  --font-sans: "Poppins", ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;\n  --font-display: "Poppins", ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;\n  --color-bg: #ecedf2;\n  --color-surface: rgba(255, 255, 255, 0.82);\n  --color-heading: #13263f;\n  --color-text: #22354d;\n  --color-text-soft: #4a617d;\n  --color-text-muted: #69809d;\n  --color-primary: #1f5d92;\n  --color-primary-strong: #164771;\n  --color-primary-soft: #e7f1fb;\n  --color-primary-border: var(--doke-card-border);\n  --gradient-button-primary: linear-gradient(135deg, #2f73b1 0%, #173f67 100%);\n`,
  `  /* Home owns composition tokens only; typography, identity and surfaces come from core/tokens.css. */\n`,
  'home global identity override block'
);

replaceExact(
  'assets/css/components/cards/card-grid-contract.css',
  ':root{--doke-card-radius:var(--card-radius-lg);--doke-card-gap:var(--space-4);--doke-card-border:var(--card-border-color);--doke-card-shadow:var(--card-shadow);} ',
  ':root{--doke-card-radius:var(--card-radius-lg);--doke-card-gap:var(--space-4);--doke-card-shadow:var(--card-shadow);} ',
  'unused card-grid public border alias'
);

replaceExact(
  'assets/css/components/cards/card-system.css',
  '  --doke-card-border: var(--card-border-color);\n',
  '',
  'unused card-system public border alias'
);

let notificationCard = read('assets/css/components/cards/notification-card.css');
notificationCard = notificationCard.replace('  --doke-card-border: var(--notifications-card-border);\n', '');
notificationCard = notificationCard.replace('  --doke-card-border: var(--notifications-card-border);\n', '');
write('assets/css/components/cards/notification-card.css', notificationCard);

let domainCards = read('assets/css/components/domain/doke-domain-cards.css');
domainCards = domainCards.replace(
  '  --doke-card-border: rgba(23, 57, 95, 0.08);',
  '  --doke-domain-card-border: var(--doke-card-border);'
);
domainCards = domainCards.replace(
  '  border-color: var(--doke-card-border);',
  '  border-color: var(--doke-domain-card-border);'
);
write('assets/css/components/domain/doke-domain-cards.css', domainCards);

replaceExact(
  'assets/css/pages/notificacoes/mobile-compact-list.css',
  '    --doke-card-border: var(--notifications-mobile-border);\n',
  '',
  'mobile notification public border override'
);

replaceExact(
  'assets/css/pages/notificacoes/visual-hierarchy.css',
  '  --doke-card-border: transparent;\n',
  '',
  'notification visual hierarchy public border override'
);

console.log('[migrate:token-authority-overrides] completed');
