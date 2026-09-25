'use strict';

const CONTRACT_ID = 'ana-a06-data-quality-ownership-gates-v1';
const GATE_STATES = Object.freeze(['pass', 'hold', 'block']);

function assertObject(value, code) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(code);
  return value;
}

function finiteNumber(value, code) {
  const n = Number(value);
  if (!Number.isFinite(n)) throw new Error(code);
  return n;
}

function nonNegativeInteger(value, code) {
  const n = finiteNumber(value, code);
  if (!Number.isInteger(n) || n < 0) throw new Error(code);
  return n;
}

function normalizePolicy(policy) {
  const p = assertObject(policy, 'ANA_DQ_POLICY_INVALID');
  const metricKey = String(p.metricKey || '').trim();
  if (!metricKey) throw new Error('ANA_DQ_POLICY_METRIC_INVALID');
  const minimumSampleCount = nonNegativeInteger(p.minimumSampleCount, 'ANA_DQ_POLICY_SAMPLE_INVALID');
  if (minimumSampleCount < 1) throw new Error('ANA_DQ_POLICY_SAMPLE_INVALID');
  const passMax = finiteNumber(p.passMax, 'ANA_DQ_POLICY_THRESHOLD_INVALID');
  const blockAbove = finiteNumber(p.blockAbove, 'ANA_DQ_POLICY_THRESHOLD_INVALID');
  if (passMax < 0 || blockAbove < passMax) throw new Error('ANA_DQ_POLICY_THRESHOLD_INVALID');
  return Object.freeze({
    metricKey,
    ownerDomain: String(p.ownerDomain || '').trim(),
    sourceDomain: String(p.sourceDomain || '').trim(),
    minimumSampleCount,
    passMax,
    blockAbove,
    noDataState: p.noDataState || 'hold',
    missingState: p.missingState || 'hold'
  });
}

function evaluateMetric(rollup, policy) {
  const p = normalizePolicy(policy);
  if (rollup == null) {
    return Object.freeze({
      metricKey: p.metricKey,
      ownerDomain: p.ownerDomain,
      sourceDomain: p.sourceDomain,
      state: p.missingState,
      reason: 'missing_required_rollup',
      sampleCount: 0,
      value: null
    });
  }

  const r = assertObject(rollup, 'ANA_DQ_ROLLUP_INVALID');
  const metricKey = String(r.metricKey || r.metric_key || '').trim();
  if (metricKey !== p.metricKey) throw new Error('ANA_DQ_ROLLUP_METRIC_MISMATCH');

  const sampleCount = nonNegativeInteger(
    r.sampleCount ?? r.sample_count ?? 0,
    'ANA_DQ_ROLLUP_SAMPLE_INVALID'
  );
  const rawValue = r.value;
  const healthState = String(r.healthState || r.health_state || '').trim().toLowerCase();

  if (healthState === 'no_data' || rawValue == null || sampleCount < p.minimumSampleCount) {
    return Object.freeze({
      metricKey: p.metricKey,
      ownerDomain: p.ownerDomain,
      sourceDomain: p.sourceDomain,
      state: p.noDataState,
      reason: healthState === 'no_data' ? 'no_data' : rawValue == null ? 'null_value' : 'below_minimum_sample',
      sampleCount,
      value: rawValue == null ? null : finiteNumber(rawValue, 'ANA_DQ_ROLLUP_VALUE_INVALID')
    });
  }

  const value = finiteNumber(rawValue, 'ANA_DQ_ROLLUP_VALUE_INVALID');
  if (value < 0 || value > 1) throw new Error('ANA_DQ_ROLLUP_VALUE_INVALID');

  const state = value > p.blockAbove ? 'block' : value <= p.passMax ? 'pass' : 'hold';
  return Object.freeze({
    metricKey: p.metricKey,
    ownerDomain: p.ownerDomain,
    sourceDomain: p.sourceDomain,
    state,
    reason: state === 'block' ? 'threshold_exceeded' : state === 'hold' ? 'between_thresholds' : 'within_threshold',
    sampleCount,
    value
  });
}

function evaluatePromotionGate(rollups, policies) {
  if (!Array.isArray(rollups) || !Array.isArray(policies) || !policies.length) {
    throw new Error('ANA_DQ_GATE_INPUT_INVALID');
  }

  const normalizedPolicies = policies.map(normalizePolicy);
  const allowed = new Set(normalizedPolicies.map((p) => p.metricKey));
  const byKey = new Map();

  for (const row of rollups) {
    const r = assertObject(row, 'ANA_DQ_ROLLUP_INVALID');
    const key = String(r.metricKey || r.metric_key || '').trim();
    if (!allowed.has(key)) throw new Error('ANA_DQ_ROLLUP_UNKNOWN_METRIC');
    if (byKey.has(key)) throw new Error('ANA_DQ_ROLLUP_DUPLICATE_METRIC');
    byKey.set(key, r);
  }

  const metrics = normalizedPolicies.map((p) => evaluateMetric(byKey.get(p.metricKey), p));
  const state = metrics.some((m) => m.state === 'block')
    ? 'block'
    : metrics.some((m) => m.state === 'hold')
      ? 'hold'
      : 'pass';

  return Object.freeze({
    contractId: CONTRACT_ID,
    state,
    metrics: Object.freeze(metrics),
    runtimeMutationAllowed: false,
    sourceMutationAllowed: false,
    alertDeliveryAuthorized: false
  });
}

module.exports = Object.freeze({
  CONTRACT_ID,
  GATE_STATES,
  normalizePolicy,
  evaluateMetric,
  evaluatePromotionGate
});
