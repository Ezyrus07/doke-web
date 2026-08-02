#!/usr/bin/env node
'use strict';
const fs = require('fs');

const matrixFile = 'config/domain-completion-matrix.json';
const matrix = JSON.parse(fs.readFileSync(matrixFile, 'utf8'));
const msg = matrix.domains.find(domain => domain.id === 'MSG-001');
if (!msg) throw new Error('MSG-001 matrix domain missing');
[
  'assets/js/repositories/messages-repository.js',
  'assets/js/services/message-service.js',
  'assets/js/services/api-repository-provider.js',
  'scripts/test-attachments-supabase-repository-contract.js'
].forEach(value => {
  if (!msg.requiredPaths.includes(value)) msg.requiredPaths.push(value);
});
fs.writeFileSync(matrixFile, JSON.stringify(matrix, null, 2) + '\n');

const docsFile = 'docs/MSG-001-A03-SERVER-COMMAND-BOUNDARY.md';
let docs = fs.readFileSync(docsFile, 'utf8');
if (!docs.includes('server-owned')) docs += '\nThe authenticated command authority is server-owned.\n';
fs.writeFileSync(docsFile, docs);

const attachmentTestFile = 'scripts/test-attachments-supabase-repository-contract.js';
let attachmentTest = fs.readFileSync(attachmentTestFile, 'utf8');
const oldAssertion = "assert(messagesRepository.includes('toPersistedMetadata'), 'Message metadata must strip transient attachment URLs before remote persistence.');";
const replacement = `if (fs.existsSync('config/msg-001-a03-server-command-boundary.json')) {
  const messageService = fs.readFileSync('assets/js/services/message-service.js', 'utf8');
  assert(!messagesRepository.includes('saveRemote'), 'A03 must remove browser-owned remote message persistence.');
  assert(!messagesRepository.includes('.upsert('), 'A03 must remove direct browser message upsert.');
  assert(messageService.includes('executeMessagesServerCommand'), 'A03 must route message persistence through the server-owned command boundary.');
  assert(repository.includes('toPersistedMetadata'), 'Attachment metadata sanitation must remain owned by the attachment repository.');
} else {
  assert(messagesRepository.includes('toPersistedMetadata'), 'Message metadata must strip transient attachment URLs before remote persistence.');
}`;
const count = attachmentTest.split(oldAssertion).length - 1;
if (count !== 1) throw new Error('Expected one legacy message attachment assertion, found ' + count);
attachmentTest = attachmentTest.replace(oldAssertion, replacement);
fs.writeFileSync(attachmentTestFile, attachmentTest);

console.log('MSG-A03 matrix, documentation and attachment contract compatibility repaired.');
