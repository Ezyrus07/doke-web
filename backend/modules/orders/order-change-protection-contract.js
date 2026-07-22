'use strict';

const PROTECTION_STATES = Object.freeze(['healthy', 'warning', 'restricted', 'frozen']);
const CHANGE_RISKS = Object.freeze(['low', 'medium', 'high', 'critical']);
const GATE_DECISIONS = Object.freeze(['allow', 'approval_required', 'hard_block']);

const STATE_RANK = Object.freeze({ healthy: 0, warning: 1, restricted: 2, frozen: 3 });

const DECISION_MATRIX = Object.freeze({
  healthy: Object.freeze({ low: 'allow', medium: 'allow', high: 'allow', critical: 'approval_required' }),
  warning: Object.freeze({ low: 'allow', medium: 'allow', high: 'approval_required', critical: 'approval_required' }),
  restricted: Object.freeze({ low: 'allow', medium: 'approval_required', high: 'approval_required', critical: 'hard_block' }),
  frozen: Object.freeze({ low: 'approval_required', medium: 'hard_block', high: 'hard_block', critical: 'hard_block' }),
});

function normalize(value, allowed, fallback) {
  const normalized = String(value || '').trim().toLowerCase();
  return allowed.includes(normalized) ? normalized : fallback;
}

function classifyChangeDecision(protectionState, riskLevel) {
  const state = normalize(protectionState, PROTECTION_STATES, 'frozen');
  const risk = normalize(riskLevel, CHANGE_RISKS, 'critical');
  return DECISION_MATRIX[state][risk];
}

function canOverride(decision) {
  return normalize(decision, GATE_DECISIONS, 'hard_block') === 'approval_required';
}

function isStateAtMost(currentState, grantedState) {
  const current = normalize(currentState, PROTECTION_STATES, 'frozen');
  const granted = normalize(grantedState, PROTECTION_STATES, 'healthy');
  return STATE_RANK[current] <= STATE_RANK[granted];
}

module.exports = Object.freeze({
  PROTECTION_STATES,
  CHANGE_RISKS,
  GATE_DECISIONS,
  DECISION_MATRIX,
  classifyChangeDecision,
  canOverride,
  isStateAtMost,
});
