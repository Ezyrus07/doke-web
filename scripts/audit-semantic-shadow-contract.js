#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const tokensPath = path.join(root, 'assets/css/core/tokens.css');
const tokens = fs.readFileSync(tokensPath, 'utf8');
const required = [
  '--doke-shadow-action-primary-strong',
  '--doke-shadow-action-success-strong',
  '--doke-shadow-action-success-card',
  '--doke-shadow-action-success-active',
  '--doke-shadow-status-primary',
  '--doke-shadow-status-success-soft',
  '--doke-shadow-status-warning-soft',
  '--doke-shadow-status-danger-soft'
];
const errors = [];
for (const token of required) if (!tokens.includes(token + ':')) errors.push(`missing token ${token}`);
const banned = [
  '0 16px 34px rgba(42, 95, 144, 0.2)',
  '0 16px 34px rgba(41, 143, 127, 0.18)',
  '0 16px 28px rgba(7, 139, 127, 0.16)',
  '0 14px 28px rgba(41, 143, 127, 0.20)',
  '0 12px 24px rgba(42, 95, 144, 0.2)',
  '0 3px 10px rgba(13, 143, 119, 0.05)'
];
function walk(dir) {
  for (const entry of fs.readdirSync(dir, {withFileTypes:true})) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (entry.name.endsWith('.css') && full !== tokensPath) {
      const text = fs.readFileSync(full, 'utf8');
      for (const literal of banned) if (text.includes(literal)) errors.push(`${path.relative(root, full)} reintroduces ${literal}`);
    }
  }
}
walk(path.join(root, 'assets/css'));
if (errors.length) { console.error(errors.join('\n')); process.exit(1); }
console.log('Semantic shadow contract: OK');
