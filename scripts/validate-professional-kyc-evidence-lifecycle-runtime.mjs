#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import crypto from 'node:crypto';

const args = new Set(process.argv.slice(2));
const mode = args.has('--execute') ? 'execute' : 'dry-run';

const projectRef = String(process.env.DOKE_KYC_E2E_PROJECT_REF || '').trim();
const accessToken = String(process.env.SUPABASE_ACCESS_TOKEN || '').trim();

const fail = (message) => { throw new Error(message); };
const log = (event, data = {}) => process.stdout.write(JSON.stringify({ event, ...data }) + '\n');

if (mode === 'dry-run') {
  log('prof-b05-g4-e2e-dry-run', {
    phases: [
      'create synthetic applicant and reviewer',
      'signed upload S1',
      'submit S1 and assert immutable ledger',
      'review and reject S1',
      'reopen S1 through self-service Edge',
      'signed upload S2',
      'submit S2 and assert distinct evidence set',
      'approve S2 directly from submitted',
      'assert S1 history remains immutable and S2 becomes current',
    ],
    physicalGc: false,
  });
  process.exit(0);
}

if (!projectRef) fail('DOKE_KYC_E2E_PROJECT_REF_REQUIRED');
if (!accessToken) fail('SUPABASE_ACCESS_TOKEN_REQUIRED');

const fetchJson = async (url, options, code) => {
  const res = await fetch(url, options);
  if (!res.ok) fail(code);
  return await res.json();
};

const project = await fetchJson(
  `https://api.supabase.com/v1/projects/${projectRef}`,
  {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
      'User-Agent': 'doke-prof-b05-g4-e2e',
    },
  },
  'DOKE_KYC_E2E_PROJECT_PREFLIGHT_FAILED',
);
if (project?.id !== projectRef || project?.name !== 'doke-prof-b05-g4-e2e' || project?.status !== 'ACTIVE_HEALTHY') {
  log('prof-b05-g4-e2e-project-mismatch', {
    expectedId: projectRef,
    observedId: project?.id ?? null,
    observedName: project?.name ?? null,
    observedStatus: project?.status ?? null,
  });
  fail('DOKE_KYC_E2E_PROJECT_MISMATCH');
}

const keys = await fetchJson(
  `https://api.supabase.com/v1/projects/${projectRef}/api-keys?reveal=true`,
  {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
      'User-Agent': 'doke-prof-b05-g4-e2e',
    },
  },
  'DOKE_KYC_E2E_API_KEYS_FAILED',
);

const list = Array.isArray(keys) ? keys : Array.isArray(keys?.data) ? keys.data : [];
const valueOf = (item) => String(item?.api_key || item?.key || item?.value || '').trim();
const labelOf = (item) => `${item?.name || ''} ${item?.type || ''} ${item?.id || ''}`.toLowerCase();
const publishable = list.find((item) => {
  const label = labelOf(item);
  return label.includes('publishable') || label.includes('anon');
});
const admin = list.find((item) => {
  const label = labelOf(item);
  const value = valueOf(item);
  return label.includes('secret') || label.includes('service_role') || label.includes('service role') || value.startsWith('sb_secret_');
});
const publishableKey = valueOf(publishable);
const serviceRoleKey = valueOf(admin);
if (!publishableKey || !serviceRoleKey || publishableKey === serviceRoleKey) {
  fail('DOKE_KYC_E2E_RUNTIME_KEYS_INVALID');
}

const url = `https://${projectRef}.supabase.co`;
const service = createClient(url, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
});
const publicClient = () => createClient(url, publishableKey, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
});

const runId = crypto.randomUUID();
const password = `Doke-Prof-B05-E2E-${crypto.randomBytes(12).toString('hex')}!Aa1`;

const createActor = async (kind, role) => {
  const email = `prof-b05-g4-${kind}-${runId}@example.test`;
  const { data, error } = await service.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { canary: 'PROF-B05-G4-E2E', runId, kind },
  });
  if (error || !data?.user?.id) fail(`DOKE_KYC_E2E_CREATE_${kind.toUpperCase()}_FAILED`);
  const id = data.user.id;

  let materialized = false;
  for (let i = 0; i < 30; i += 1) {
    const { data: row } = await service.from('users').select('id').eq('id', id).maybeSingle();
    if (row?.id) {
      materialized = true;
      break;
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  if (!materialized) fail(`DOKE_KYC_E2E_${kind.toUpperCase()}_NOT_MATERIALIZED`);

  const { error: roleError } = await service.from('users').update({ role, status: 'active' }).eq('id', id);
  if (roleError) fail(`DOKE_KYC_E2E_${kind.toUpperCase()}_ROLE_FAILED`);

  const client = publicClient();
  const { error: loginError } = await client.auth.signInWithPassword({ email, password });
  if (loginError) fail(`DOKE_KYC_E2E_${kind.toUpperCase()}_LOGIN_FAILED`);
  return { id, client };
};

const invokeKyc = async (client, action, extra = {}) => {
  const { data, error } = await client.functions.invoke('professional-verification-operations', {
    body: { action, ...extra },
  });
  if (error) fail(`DOKE_KYC_E2E_EDGE_${action.toUpperCase()}_FAILED`);
  if (data?.error) fail(String(data.error));
  return data;
};

const invokeSelf = async (client, action, params = {}) => {
  const { data, error } = await client.functions.invoke('self-service-operations', {
    body: { action, params },
  });
  if (error) fail(`DOKE_KYC_E2E_SELF_${action.toUpperCase()}_FAILED`);
  if (data?.error) fail(String(data.error));
  return data;
};

const inspect = async (userId) => {
  const { data, error } = await service.rpc('prof_b05_e2e_inspect', { p_user_id: userId });
  if (error || !data) fail('DOKE_KYC_E2E_INSPECTION_FAILED');
  return data;
};

const eventsOf = (set) => Array.isArray(set?.events) ? set.events : [];
const assertEvents = (set, expected, label) => {
  const actual = eventsOf(set);
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    fail(`${label}_EVENTS_MISMATCH:${JSON.stringify(actual)}`);
  }
};

const applicant = await createActor('applicant', 'client');
const reviewer = await createActor('reviewer', 'admin');

const { error: profileError } = await service.from('professional_profiles').insert({
  user_id: applicant.id,
  document_status: 'unverified',
  setup_status: 'pending_verification',
  setup_payload: {},
  setup_current_step: 2,
  verification_status: 'not_started',
});
if (profileError) fail('DOKE_KYC_E2E_PROFILE_FIXTURE_FAILED');

const uploadSubmission = async (sequence) => {
  const fields = ['documentFront', 'documentBack', 'selfieDocument', 'proofOfAddress'];
  const sizes = Object.fromEntries(fields.map((field, index) => [field, 64 + sequence * 10 + index]));
  const descriptors = fields.map((field) => ({
    field,
    fileName: `${field}-s${sequence}.jpg`,
    size: sizes[field],
    type: 'image/jpeg',
  }));

  const intent = await invokeKyc(applicant.client, 'prepare_uploads', {
    verificationType: 'individual',
    files: descriptors,
  });
  if (!intent?.intentId || !Array.isArray(intent?.uploads) || intent.uploads.length !== 4) {
    fail(`DOKE_KYC_E2E_S${sequence}_INTENT_INVALID`);
  }

  for (const upload of intent.uploads) {
    if (!String(upload.path || '').startsWith(`locked/${applicant.id}/${intent.intentId}/`)) {
      fail(`DOKE_KYC_E2E_S${sequence}_PATH_INVALID`);
    }
    const bytes = new Uint8Array(sizes[upload.field]);
    bytes.fill(20 + sequence);
    const blob = new Blob([bytes], { type: 'image/jpeg' });
    const { error } = await applicant.client.storage
      .from(upload.bucket)
      .uploadToSignedUrl(upload.path, upload.token, blob, { contentType: 'image/jpeg' });
    if (error) fail(`DOKE_KYC_E2E_S${sequence}_UPLOAD_FAILED`);
  }

  const result = await invokeKyc(applicant.client, 'submit', {
    uploadIntentId: intent.intentId,
    payload: {
      verificationType: 'individual',
      legalName: 'PROF B05 Synthetic Applicant',
      taxId: '12345678901',
      birthDate: '2000-01-01',
      postalCode: '40000000',
      street: 'Rua Sintetica de Validacao',
      number: String(sequence),
      district: 'Centro',
      city: 'Salvador',
      state: 'BA',
      documentType: 'synthetic-canary',
      truthConfirmed: true,
      consentAccepted: true,
    },
  });
  if (!result?.id || result.status !== 'submitted') fail(`DOKE_KYC_E2E_S${sequence}_SUBMIT_FAILED`);
  return { intent, result };
};

const s1 = await uploadSubmission(1);
let snapshot = await inspect(applicant.id);
if (!Array.isArray(snapshot.sets) || snapshot.sets.length !== 1) fail('DOKE_KYC_E2E_S1_SET_COUNT');
const set1 = snapshot.sets[0];
const s1Id = set1.id;
const s1Manifest = set1.manifestSha256;
if (snapshot.currentEvidenceSetId !== s1Id || set1.objectCount !== 4 || set1.provenance !== 'signed_intent') {
  fail('DOKE_KYC_E2E_S1_LEDGER_INVALID');
}
assertEvents(set1, ['submitted'], 'DOKE_KYC_E2E_S1_INITIAL');

const ownerRead = await applicant.client.storage
  .from('professional-verification-media')
  .createSignedUrl(s1.intent.uploads[0].path, 60);
if (ownerRead.error || !ownerRead.data?.signedUrl) fail('DOKE_KYC_E2E_OWNER_READ_FAILED');

const reviewerRead = await reviewer.client.storage
  .from('professional-verification-media')
  .createSignedUrl(s1.intent.uploads[0].path, 60);
if (reviewerRead.error || !reviewerRead.data?.signedUrl) fail('DOKE_KYC_E2E_REVIEWER_READ_FAILED');

await invokeKyc(reviewer.client, 'start', { verificationId: s1.result.id });
const rejected = await invokeKyc(reviewer.client, 'decide', {
  verificationId: s1.result.id,
  decision: 'reject',
  rejectionReason: 'Synthetic lifecycle rejection for PROF-B05 validation.',
});
if (rejected?.status !== 'rejected') fail('DOKE_KYC_E2E_S1_REJECT_FAILED');

snapshot = await inspect(applicant.id);
let currentS1 = snapshot.sets.find((set) => set.id === s1Id);
assertEvents(currentS1, ['submitted', 'review_started', 'rejected'], 'DOKE_KYC_E2E_S1_REJECTED');

const reopened = await invokeSelf(applicant.client, 'reopen_own_professional_identity_verification', {});
if (reopened?.status !== 'not_started') fail('DOKE_KYC_E2E_S1_REOPEN_FAILED');

snapshot = await inspect(applicant.id);
currentS1 = snapshot.sets.find((set) => set.id === s1Id);
if (snapshot.currentEvidenceSetId !== null) fail('DOKE_KYC_E2E_REOPEN_POINTER_REMAINS');
if (currentS1.manifestSha256 !== s1Manifest || currentS1.objectCount !== 4) fail('DOKE_KYC_E2E_S1_MUTATED_ON_REOPEN');
assertEvents(currentS1, ['submitted', 'review_started', 'rejected', 'reopened'], 'DOKE_KYC_E2E_S1_REOPENED');

const s2 = await uploadSubmission(2);
snapshot = await inspect(applicant.id);
if (!Array.isArray(snapshot.sets) || snapshot.sets.length !== 2) fail('DOKE_KYC_E2E_S2_SET_COUNT');
const set2 = snapshot.sets.find((set) => set.id !== s1Id);
if (!set2 || set2.id === s1Id || snapshot.currentEvidenceSetId !== set2.id || set2.objectCount !== 4) {
  fail('DOKE_KYC_E2E_S2_LEDGER_INVALID');
}
assertEvents(set2, ['submitted'], 'DOKE_KYC_E2E_S2_INITIAL');

const approved = await invokeKyc(reviewer.client, 'decide', {
  verificationId: s2.result.id,
  decision: 'approve',
});
if (approved?.status !== 'verified') fail('DOKE_KYC_E2E_S2_APPROVE_FAILED');

snapshot = await inspect(applicant.id);
currentS1 = snapshot.sets.find((set) => set.id === s1Id);
const currentS2 = snapshot.sets.find((set) => set.id === set2.id);
if (snapshot.verificationStatus !== 'verified' || snapshot.currentEvidenceSetId !== set2.id || snapshot.role !== 'professional') {
  fail('DOKE_KYC_E2E_FINAL_STATE_INVALID');
}
if (currentS1.manifestSha256 !== s1Manifest || currentS1.objectCount !== 4) fail('DOKE_KYC_E2E_S1_HISTORY_CHANGED');
assertEvents(currentS1, ['submitted', 'review_started', 'rejected', 'reopened'], 'DOKE_KYC_E2E_S1_FINAL');
assertEvents(currentS2, ['submitted', 'review_started', 'verified'], 'DOKE_KYC_E2E_S2_FINAL');

log('prof-b05-g4-e2e-pass', {
  projectRef,
  runId,
  verificationId: snapshot.verificationId,
  evidenceSetCount: snapshot.sets.length,
  s1Events: eventsOf(currentS1),
  s2Events: eventsOf(currentS2),
  currentEvidenceSetId: snapshot.currentEvidenceSetId,
  finalStatus: snapshot.verificationStatus,
  finalRole: snapshot.role,
  credentialsExposed: false,
});
