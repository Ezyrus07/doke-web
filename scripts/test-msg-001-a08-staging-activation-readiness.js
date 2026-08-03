#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const contract = JSON.parse(fs.readFileSync('config/msg-001-a08-staging-activation-readiness.json', 'utf8'));
const expected = ['MSG-A07B','MSG-A05B','MSG-A04B','MSG-A06B'];

function createRun() {
  return { index: 0, stopped: false, passed: [], evidence: [] };
}
function begin(run, phase, authorization, preflightPassed) {
  if (run.stopped) throw new Error('RUN_STOPPED');
  if (expected[run.index] !== phase) throw new Error('PHASE_ORDER');
  if (!authorization || authorization.phase !== phase || authorization.fresh !== true) throw new Error('AUTH_REQUIRED');
  if (preflightPassed !== true) throw new Error('PREFLIGHT_REQUIRED');
  return { phase, flagsEnabled: false };
}
function finish(run, phase, canariesPassed, evidence) {
  if (canariesPassed !== true) { run.stopped = true; throw new Error('CANARY_FAILED'); }
  if (!evidence || evidence.production_effects_zero !== true) throw new Error('EVIDENCE_REQUIRED');
  run.passed.push(phase);
  run.evidence.push(evidence);
  run.index += 1;
}

const run = createRun();
let denied = 0;
try { begin(run, 'MSG-A07B', null, true); } catch (error) { if (error.message === 'AUTH_REQUIRED') denied += 1; }
try { begin(run, 'MSG-A05B', { phase: 'MSG-A05B', fresh: true }, true); } catch (error) { if (error.message === 'PHASE_ORDER') denied += 1; }
if (denied !== 2) throw new Error('Fail-closed authorization/order checks failed.');

expected.forEach((phase) => {
  const active = begin(run, phase, { phase, fresh: true }, true);
  if (active.flagsEnabled !== false) throw new Error('Flags must remain disabled during canary.');
  finish(run, phase, true, { phase, production_effects_zero: true });
});
if (run.index !== expected.length || run.passed.length !== expected.length) throw new Error('Full ordered activation simulation failed.');

const failedRun = createRun();
begin(failedRun, 'MSG-A07B', { phase: 'MSG-A07B', fresh: true }, true);
try { finish(failedRun, 'MSG-A07B', false, { production_effects_zero: true }); } catch (error) { if (error.message !== 'CANARY_FAILED') throw error; }
let stopObserved = false;
try { begin(failedRun, 'MSG-A07B', { phase: 'MSG-A07B', fresh: true }, true); } catch (error) { stopObserved = error.message === 'RUN_STOPPED'; }
if (!stopObserved) throw new Error('Run must stop after canary failure.');
if (JSON.stringify(contract.activationOrder.map((item) => item.phase)) !== JSON.stringify(expected)) throw new Error('Contract order mismatch.');
console.log('MSG-A08 staging activation readiness runtime test passed.');
