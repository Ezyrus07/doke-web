'use strict';
const fs = require('node:fs');
const content = `name: Doke MSG-A06 Presence Typing Boundary

on:
  pull_request:
    paths:
      - 'assets/js/repositories/messages-presence-repository.js'
      - 'assets/js/features/chat-realtime-presence.js'
      - 'assets/js/core/supabase-config.js'
      - 'mensagens.html'
      - 'supabase/migrations/20260802234000_msg_a06_presence_typing_realtime_authorization_contract.sql'
      - 'config/msg-001-a06-presence-typing-boundary.json'
      - 'docs/MSG-001-A06-PRESENCE-TYPING-BOUNDARY.md'
      - 'docs/validation/MSG-001-A06-PRESENCE-TYPING-BOUNDARY.json'
      - 'scripts/audit-msg-001-a06-presence-typing-boundary.js'
      - 'scripts/test-msg-001-a06-presence-typing-runtime.js'
      - 'scripts/audit-msg-001-a01-authority-baseline.js'
      - 'scripts/audit-msg-001-a02-canonical-authority-boundary.js'
      - 'scripts/audit-msg-001-a03-server-command-boundary.js'
      - 'scripts/audit-msg-001-a05-attachment-lifecycle.js'
      - 'config/domain-completion-matrix.json'
      - 'docs/DOMAIN-COMPLETION-MATRIX.md'
      - 'reports/generated/domain-completion-matrix-report.json'
      - 'package.json'
      - '.github/workflows/msg-001-a06-presence-typing-boundary.yml'
  workflow_dispatch:

permissions:
  contents: read

jobs:
  boundary:
    runs-on: ubuntu-24.04
    timeout-minutes: 12
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 24
          cache: npm
      - run: npm ci --ignore-scripts
      - name: Validate MSG-A06 private presence and typing boundary
        run: |
          node --check assets/js/repositories/messages-presence-repository.js
          node --check assets/js/features/chat-realtime-presence.js
          node --check scripts/audit-msg-001-a06-presence-typing-boundary.js
          node --check scripts/test-msg-001-a06-presence-typing-runtime.js
          npm run audit:msg-001-a01-authority-baseline
          npm run audit:msg-001-a02-canonical-authority-boundary
          npm run test:msg-001-a02-canonical-authority-boundary
          npm run audit:msg-001-a03-server-command-boundary
          npm run test:msg-001-a03-server-command-boundary
          npm run audit:msg-001-a04-realtime-publication-subscription-contract
          npm run test:msg-001-a04-realtime-publication-subscription-runtime
          npm run audit:msg-001-a05-attachment-lifecycle
          npm run test:msg-001-a05-attachment-lifecycle-runtime
          npm run audit:msg-001-a06-presence-typing-boundary
          npm run test:msg-001-a06-presence-typing-runtime
          npm run audit:domain-completion-matrix
          git diff --check
`;
fs.writeFileSync('.github/workflows/msg-001-a06-presence-typing-boundary.yml', content);
console.log('MSG-A06 read-only workflow restored in working tree.');
