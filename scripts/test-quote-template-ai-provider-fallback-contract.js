'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const read = (relativePath) => fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
const contains = (source, marker, message) => assert.ok(source.includes(marker), message || `Missing marker: ${marker}`);
const excludes = (source, marker, message) => assert.ok(!source.includes(marker), message || `Forbidden marker: ${marker}`);

const edgeIndex = read('supabase/functions/quote-template-ai/index.ts');
const openai = read('supabase/functions/quote-template-ai/openai.ts');
const controller = read('assets/js/pages/service-quote-template-ai.js');
const migration = read('supabase/migrations/050_normalize_quote_template_ai_provider_errors.sql');

[
  'OPENAI_BILLING_QUOTA',
  'OPENAI_RATE_LIMIT',
  'OPENAI_AUTH_INVALID',
  'OPENAI_ACCESS_DENIED',
  'OPENAI_REQUEST_INVALID',
  'OPENAI_TIMEOUT',
  'OPENAI_UNAVAILABLE',
  'OPENAI_EMPTY_OUTPUT',
  'OPENAI_INVALID_OUTPUT',
  'OPENAI_NO_VALID_SUGGESTIONS',
  'OPENAI_FAILED'
].forEach((code) => {
  contains(openai, `"${code}"`, `OpenAI adapter must expose safe code ${code}.`);
  contains(migration, `'${code}'`, `Database constraint must accept safe code ${code}.`);
});

contains(openai, 'providerErrorCode', 'Provider errors must be normalized before leaving the adapter.');
contains(openai, 'normalizeOpenAIError', 'Network and timeout failures must be normalized.');
contains(openai, 'OPENAI_BILLING_QUOTA', 'Quota/billing failures must have a stable code.');
contains(openai, 'AbortSignal.timeout(25_000)', 'The provider call must remain time bounded.');
contains(edgeIndex, 'fallbackReason = normalizeOpenAIError(error);', 'The handler must persist only normalized provider codes.');
excludes(edgeIndex, 'fallbackReason = text(error', 'The Edge handler must not persist raw provider messages.');
contains(migration, 'Raw provider error messages must never be persisted', 'The database column contract must document the privacy boundary.');
contains(migration, 'quote_template_ai_runs_error_code_check', 'A database constraint must reject raw provider messages.');
contains(migration, "then 'OPENAI_BILLING_QUOTA'", 'Historical quota messages must be normalized.');
contains(migration, "else 'OPENAI_FAILED'", 'Unknown historical provider messages must be normalized.');

contains(controller, 'fallbackStatusMessage', 'The UI must map fallback codes to controlled product copy.');
contains(controller, 'PROVIDER_UNAVAILABLE_CODES', 'Provider/configuration failures must share a generic user-facing state.');
contains(controller, 'temporariamente indisponível', 'The user-facing fallback must not expose billing or credential details.');
contains(controller, 'host.dataset.fallbackCode', 'The safe fallback code must remain observable for QA/telemetry.');
excludes(controller, 'saldo da API', 'Professional users must not see internal billing details.');
excludes(controller, 'insufficient_quota', 'Professional users must not see provider-native error codes.');
excludes(controller, 'billing', 'Professional users must not see provider billing terminology.');

console.log('Quote-template AI provider fallback contract: PASS');
