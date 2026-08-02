#!/usr/bin/env node
'use strict';

const fs = require('fs');
const file = 'config/domain-completion-matrix.json';
const matrix = JSON.parse(fs.readFileSync(file, 'utf8'));
const sched = matrix.domains.find((domain) => domain.id === 'SCHED-001');
if (!sched) throw new Error('SCHED-001 missing from matrix');

const previous = 'Validate the C01D single-navigation bootstrap package repository-only; any new C01E plus C01D staging canary still requires a fresh exact authorization pair for one immutable head.';
const canonical = 'Validate SCHED-C01D single-navigation bootstrap repository-only; any new SCHED-C01E plus SCHED-C01D staging canary still requires a fresh exact authorization pair for one immutable head.';
const index = sched.nextActions.indexOf(previous);
if (index < 0) throw new Error('Expected temporary C01D next action was not found.');
sched.nextActions[index] = canonical;
fs.writeFileSync(file, JSON.stringify(matrix, null, 2) + '\n');
console.log('Canonical SCHED-C01D next action literal preserved.');
