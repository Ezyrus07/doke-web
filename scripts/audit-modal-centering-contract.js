#!/usr/bin/env node
/* Audit the shared modal centering contract.
   This script is intentionally static: it guards ownership and cache/version
   contracts without requiring a browser runtime. */

const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const read = (file) => fs.readFileSync(path.join(ROOT, file), 'utf8');
const fail = [];
const expect = (condition, message) => {
  if (!condition) fail.push(message);
};

const modalFile = 'assets/css/components/overlays/modal-visual-contract.css';
const modalCss = read(modalFile);
const requiredSelectors = [
  'dialog.doke-native-overlay[open]',
  'dialog.charge-modal[open]',
  'dialog.address-modal[open]',
  'dialog.home-address-modal[open]',
  'dialog.budget-success-modal[open]'
];

requiredSelectors.forEach((selector) => {
  expect(modalCss.includes(selector), `${modalFile} must include native centering selector ${selector}`);
});

[
  'position: fixed;',
  'inset: 0;',
  'width: 100vw;',
  'height: 100dvh;',
  'display: grid;',
  'place-items: center;',
  'margin: 0;',
  'overflow: hidden;'
].forEach((token) => {
  expect(modalCss.includes(token), `${modalFile} must preserve centered overlay primitive: ${token}`);
});

expect(!modalCss.includes('!important'), `${modalFile} must not use !important`);

const currentVersion = 'modal-visual-contract.css?v=20260701-modal-centering-contract-v1';
const staleVersion = 'modal-visual-contract.css?v=20260630-modal-mobile-contract-v2';
const foundationDir = path.join(ROOT, 'assets/css/pages');
const foundationFiles = fs.readdirSync(foundationDir)
  .filter((name) => name.endsWith('foundation.css'))
  .map((name) => `assets/css/pages/${name}`);

const modalFoundations = foundationFiles.filter((file) => read(file).includes('modal-visual-contract.css'));
expect(modalFoundations.length > 0, 'At least one foundation must import modal visual contract');
modalFoundations.forEach((file) => {
  const content = read(file);
  expect(content.includes(currentVersion), `${file} must import current modal centering version`);
  expect(!content.includes(staleVersion), `${file} must not import stale modal visual contract version`);
});

const htmlFiles = fs.readdirSync(ROOT).filter((name) => name.endsWith('.html'));
const modalFoundationNames = modalFoundations.map((file) => path.basename(file));
htmlFiles.forEach((html) => {
  const content = read(html);
  modalFoundationNames.forEach((foundationName) => {
    if (!content.includes(foundationName)) return;
    expect(
      content.includes(`${foundationName}?v=20260701-modal-centering-contract-v1`),
      `${html} must cache-bust ${foundationName} with modal centering version`
    );
  });
});

const budgetCssFile = 'assets/css/pages/orcamento.css';
const budgetCss = read(budgetCssFile);
[
  'body[data-page="orcamento"] .budget-success-modal[open]',
  'body[data-page="orcamento"] .address-modal[open]',
  'width: 100vw;',
  'height: 100dvh;',
  'place-items: center;',
  'body[data-page="orcamento"] .budget-success-modal__dialog {',
  'width: min(calc(100vw - 48px), var(--doke-financial-modal-width, 620px));',
  'body[data-page="orcamento"] .address-modal__dialog {',
  'width: min(760px, calc(100vw - 48px));',
  'box-sizing: border-box;'
].forEach((token) => {
  expect(budgetCss.includes(token), `${budgetCssFile} must preserve orçamento native dialog centering contract: ${token}`);
});
expect(!budgetCss.includes('!important'), `${budgetCssFile} must not use !important`);

if (fail.length) {
  console.error('Modal centering contract audit failed:');
  fail.forEach((message) => console.error(`- ${message}`));
  process.exit(1);
}

console.log(`Modal centering contract audit passed (${modalFoundations.length} foundations checked).`);
