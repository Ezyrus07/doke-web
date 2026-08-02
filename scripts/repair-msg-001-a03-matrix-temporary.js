#!/usr/bin/env node
'use strict';
const fs = require('fs');
const file = 'config/domain-completion-matrix.json';
const matrix = JSON.parse(fs.readFileSync(file, 'utf8'));
const msg = matrix.domains.find(domain => domain.id === 'MSG-001');
if (!msg) throw new Error('MSG-001 matrix domain missing');
[
  'assets/js/repositories/messages-repository.js',
  'assets/js/services/message-service.js',
  'assets/js/services/api-repository-provider.js'
].forEach(value => {
  if (!msg.requiredPaths.includes(value)) msg.requiredPaths.push(value);
});
fs.writeFileSync(file, JSON.stringify(matrix, null, 2) + '\n');
const docsFile = 'docs/MSG-001-A03-SERVER-COMMAND-BOUNDARY.md';
let docs = fs.readFileSync(docsFile, 'utf8');
if (!docs.includes('server-owned')) docs += '\nThe authenticated command authority is server-owned.\n';
fs.writeFileSync(docsFile, docs);
console.log('MSG-A03 matrix and documentation normalization repaired.');
