#!/usr/bin/env node
'use strict';

const fs = require('fs');

const MATRIX_PATH = 'config/domain-completion-matrix.json';
const SELF_PATH = 'scripts/apply-sched-001-b04c-ord-a11-description-fix.js';
const matrix = JSON.parse(fs.readFileSync(MATRIX_PATH, 'utf8'));
const ord = matrix.domains.find((domain) => domain.id === 'ORD-001');
if (!ord) throw new Error('ORD-001 missing from matrix');
const blocker = ord.blockers.find((item) => item.id === 'ORD-B04');
if (!blocker) throw new Error('ORD-B04 missing from matrix');
blocker.description = 'ORD-B04 remains handed to SCHED-001. ORD consumes the canonical schedule reservation projection locally and the exact-authorization staging executor is prepared. The blocker remains open until SCHED-B04C passes remotely with rollback, order event/history evidence and zero residue.';
fs.writeFileSync(MATRIX_PATH, `${JSON.stringify(matrix, null, 2)}\n`);
fs.rmSync(SELF_PATH);
console.log('ORD-A11 literal SCHED-001 handoff reference restored; temporary patcher removed.');
