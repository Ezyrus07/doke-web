#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const migrationPath = path.join(root, 'supabase/migrations/160_service_search_ranking_v1.sql');
const migration = fs.readFileSync(migrationPath, 'utf8');

const configs = Object.freeze({
  'search-rank-v0': Object.freeze({
    weights: Object.freeze({ text: 0, reviews: 0, availability: 0, recency: 1 }),
    reviewPrior: Object.freeze({ mean: 4, weight: 5 }),
    recencyFullDays: 0,
    recencyZeroDays: 365,
    behavioralSignalsEnabled: false,
    scorePrecision: 8
  }),
  'search-rank-v1': Object.freeze({
    weights: Object.freeze({ text: 0.65, reviews: 0.20, availability: 0.05, recency: 0.10 }),
    reviewPrior: Object.freeze({ mean: 4, weight: 5 }),
    recencyFullDays: 14,
    recencyZeroDays: 90,
    behavioralSignalsEnabled: false,
    scorePrecision: 8
  })
});

function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, value));
}

function daysBetween(asOf, approvedAt) {
  return Math.max(0, (asOf.getTime() - approvedAt.getTime()) / 86400000);
}

function computeRankingScore(version, input) {
  const config = configs[version];
  if (!config) throw new Error('DOKE_SEARCH_RANKING_VERSION_UNKNOWN');

  const textRaw = Math.max(Number(input.textRank) || 0, 0);
  const textSignal = Math.min(1, textRaw / (1 + textRaw));
  const reviewCount = Math.max(Math.trunc(Number(input.reviewCount) || 0), 0);
  const reviewSum = Math.min(Math.max(Number(input.reviewSum) || 0, 0), reviewCount * 5);
  const reviewSignal = clamp(
    ((reviewSum + (config.reviewPrior.mean * config.reviewPrior.weight)) /
      (reviewCount + config.reviewPrior.weight)) / 5,
    0,
    1
  );
  const availabilitySignal = input.hasAvailableSlot === true ? 1 : 0;

  let recencySignal = 0;
  if (input.approvedAt instanceof Date && input.asOf instanceof Date) {
    const ageDays = daysBetween(input.asOf, input.approvedAt);
    if (ageDays <= config.recencyFullDays) recencySignal = 1;
    else if (ageDays >= config.recencyZeroDays) recencySignal = 0;
    else {
      recencySignal = (config.recencyZeroDays - ageDays) /
        (config.recencyZeroDays - config.recencyFullDays);
    }
  }

  const score =
    (config.weights.text * textSignal) +
    (config.weights.reviews * reviewSignal) +
    (config.weights.availability * availabilitySignal) +
    (config.weights.recency * recencySignal);

  return Number(clamp(score, 0, 1).toFixed(config.scorePrecision));
}

function baseInput(overrides = {}) {
  return Object.assign({
    textRank: 0.5,
    reviewSum: 0,
    reviewCount: 0,
    hasAvailableSlot: false,
    approvedAt: new Date('2026-07-20T12:00:00Z'),
    asOf: new Date('2026-07-28T12:00:00Z')
  }, overrides);
}

function assertScoreBounds() {
  const score = computeRankingScore('search-rank-v1', baseInput({
    textRank: 1000000,
    reviewSum: 5000,
    reviewCount: 1000,
    hasAvailableSlot: true,
    approvedAt: new Date('2026-07-28T12:00:00Z')
  }));
  assert(score >= 0 && score <= 1, 'ranking score must remain in [0, 1]');
}

function assertBayesianSmoothing() {
  const onePerfectReview = computeRankingScore('search-rank-v1', baseInput({ reviewSum: 5, reviewCount: 1 }));
  const sustainedQuality = computeRankingScore('search-rank-v1', baseInput({ reviewSum: 96, reviewCount: 20 }));
  assert(sustainedQuality > onePerfectReview, 'one perfect review cannot dominate sustained quality');
}

function assertAvailabilityCap() {
  const withoutAvailability = computeRankingScore('search-rank-v1', baseInput({ hasAvailableSlot: false }));
  const withAvailability = computeRankingScore('search-rank-v1', baseInput({ hasAvailableSlot: true }));
  assert(Math.abs((withAvailability - withoutAvailability) - 0.05) < 1e-7, 'availability contribution must be exactly capped at 0.05');
}

function assertRecencyCap() {
  const dayOne = computeRankingScore('search-rank-v1', baseInput({ approvedAt: new Date('2026-07-27T12:00:00Z') }));
  const dayTen = computeRankingScore('search-rank-v1', baseInput({ approvedAt: new Date('2026-07-18T12:00:00Z') }));
  const old = computeRankingScore('search-rank-v1', baseInput({ approvedAt: new Date('2025-12-01T12:00:00Z') }));
  assert.strictEqual(dayOne, dayTen, 'fourteen-day recency full-credit window must be flat');
  assert(dayOne - old <= 0.1000001, 'recency contribution cannot exceed 0.10');
}

function assertWeightContract() {
  for (const [version, config] of Object.entries(configs)) {
    const sum = Object.values(config.weights).reduce((total, weight) => total + weight, 0);
    assert(Math.abs(sum - 1) < 1e-9, `${version} weights must sum to one`);
    assert.strictEqual(config.behavioralSignalsEnabled, false, `${version} cannot enable behavioral ranking signals`);
  }
}

function assertSourceContract() {
  const scoreStart = migration.indexOf('create or replace function private.compute_service_search_ranking_score(');
  const scoreEnd = migration.indexOf('comment on table private.service_search_ranking_versions', scoreStart);
  assert(scoreStart !== -1 && scoreEnd > scoreStart, 'ranking score source section is missing');
  const scoreSection = migration.slice(scoreStart, scoreEnd);

  [
    'views_count',
    'contacts_count',
    'budget_count',
    'message_count',
    'click_through',
    'owner_activity',
    'paid_boost'
  ].forEach((marker) => assert(!scoreSection.includes(marker), `forbidden score marker present: ${marker}`));

  [
    "'search-rank-v0'",
    "'search-rank-v1'",
    "'behavioralSignalsEnabled', false",
    'DOKE_SEARCH_RANKING_VERSION_IMMUTABLE',
    'DOKE_SEARCH_RANKING_VERSION_CONFLICT',
    'insert into private.service_search_ranking_state_events'
  ].forEach((marker) => assert(migration.includes(marker), `source contract marker missing: ${marker}`));

  assert(!migration.includes('create or replace function public.search_public_services'), 'A07 cannot activate the public RPC');
}

assertScoreBounds();
assertBayesianSmoothing();
assertAvailabilityCap();
assertRecencyCap();
assertWeightContract();
assertSourceContract();

console.log('[SEARCH-A07 runtime] Bounded ranking formula: PASS');
console.log('[SEARCH-A07 runtime] Bayesian smoothing, availability cap and recency cap: PASS');
console.log('[SEARCH-A07 runtime] Behavioral metrics excluded; v0 rollback preserved: PASS');
