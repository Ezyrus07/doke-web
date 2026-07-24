#!/usr/bin/env node
import fs from 'node:fs';

const files = [
  'admin.html',
  'admin-verificacao.html',
  'admin-anuncio-revisao.html',
  'admin-pedidos-operacao.html',
  'comunidade-interna.html'
];

const bootstrapTag = '<script defer src="assets/js/core/page-bootstrap.js?v=20260724-auth-a03-v1"></script>';
const authServicePattern = /(<script\b[^>]*\bsrc=["']assets\/js\/services\/auth-service\.js[^"']*["'][^>]*>\s*<\/script>)/i;

for (const file of files) {
  let source = fs.readFileSync(file, 'utf8');
  if (source.includes('assets/js/core/page-bootstrap.js')) {
    console.log(`${file}: bootstrap already present`);
    continue;
  }

  const matches = source.match(new RegExp(authServicePattern.source, 'gi')) || [];
  if (matches.length !== 1) {
    throw new Error(`${file}: expected exactly one canonical auth-service script, found ${matches.length}`);
  }

  source = source.replace(authServicePattern, `$1\n  ${bootstrapTag}`);
  fs.writeFileSync(file, source);
  console.log(`${file}: canonical page bootstrap inserted`);
}
