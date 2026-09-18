#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import crypto from 'node:crypto';

const args = new Set(process.argv.slice(2));
const mode = args.has('--execute') ? 'execute' : args.has('--check-env') ? 'check-env' : 'dry-run';

const env = {
  url: String(process.env.SUPABASE_URL || '').trim(),
  publishableKey: String(process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY || '').trim(),
  serviceRoleKey: String(process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim(),
  projectRef: String(process.env.DOKE_KYC_CANARY_PROJECT_REF || '').trim(),
  allowStaging: String(process.env.DOKE_KYC_CANARY_ALLOW_STAGING || '').trim() === '1',
};

const EXPECTED_STAGING_REF = 'zwkczgewzbsorbrjuzpb';
const BUCKET = 'professional-verification-media';

const fail = (message) => {
  throw new Error(message);
};

const requireEnv = () => {
  for (const [key, value] of Object.entries({
    SUPABASE_URL: env.url,
    SUPABASE_PUBLISHABLE_KEY: env.publishableKey,
    SUPABASE_SERVICE_ROLE_KEY: env.serviceRoleKey,
    DOKE_KYC_CANARY_PROJECT_REF: env.projectRef,
  })) {
    if (!value) fail(`Missing required environment variable: ${key}`);
  }
  if (env.projectRef === EXPECTED_STAGING_REF && !env.allowStaging) {
    fail('Staging execution requires DOKE_KYC_CANARY_ALLOW_STAGING=1.');
  }
  if (!env.url.includes(env.projectRef)) {
    fail('SUPABASE_URL does not match DOKE_KYC_CANARY_PROJECT_REF.');
  }
};

const jsonLog = (event, data = {}) => {
  process.stdout.write(JSON.stringify({ event, ...data }) + '\n');
};

if (mode === 'dry-run') {
  jsonLog('prof-b05-g2a-dry-run', {
    target: env.projectRef || '<unset>',
    phases: [
      'create synthetic applicant/reviewer/unrelated actors',
      'prepare locked signed-upload intent',
      'upload four synthetic JPEG payloads with uploadToSignedUrl',
      'submit KYC through professional-verification-operations',
      'prove owner/reviewer referenced reads',
      'prove unrelated/list/direct mutation denials',
      'cleanup exact synthetic Storage objects with service-role Storage API',
      'delete synthetic identities and assert residue is absent',
    ],
    persistentRealEvidenceTouched: false,
  });
  process.exit(0);
}

requireEnv();
jsonLog('prof-b05-g2a-env-ok', { projectRef: env.projectRef, mode });

if (mode === 'check-env') process.exit(0);

const service = createClient(env.url, env.serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const publicClient = () => createClient(env.url, env.publishableKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const runId = crypto.randomUUID();
const password = `Doke-Prof-B05-${crypto.randomBytes(12).toString('hex')}!Aa1`;
const actors = [];
const canaryPaths = [];

const createActor = async (kind, role = 'client') => {
  const email = `prof-b05-${kind}-${runId}@example.test`;
  const { data, error } = await service.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { canary: 'PROF-B05-G2A', runId, kind },
  });
  if (error || !data?.user?.id) fail(`Unable to create ${kind}: ${error?.message || 'unknown'}`);
  const id = data.user.id;
  actors.push(id);

  let materialized = false;
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const { data: row } = await service.from('users').select('id').eq('id', id).maybeSingle();
    if (row?.id) {
      materialized = true;
      break;
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  if (!materialized) fail(`public.users did not materialize for ${kind}`);

  const { error: userError } = await service
    .from('users')
    .update({ role, status: 'active' })
    .eq('id', id);
  if (userError) fail(`Unable to configure ${kind}: ${userError.message}`);

  const client = publicClient();
  const { error: signInError } = await client.auth.signInWithPassword({ email, password });
  if (signInError) fail(`Unable to sign in ${kind}: ${signInError.message}`);
  return { id, email, client };
};

const invoke = async (client, action, payload = {}) => {
  const { data, error } = await client.functions.invoke('professional-verification-operations', {
    body: { action, ...payload },
  });
  if (error) fail(`Edge action ${action} failed: ${error.message}`);
  if (data?.error) fail(`Edge action ${action} returned ${data.error}`);
  return data;
};

const expectDenied = async (label, operation) => {
  let denied = false;
  try {
    const result = await operation();
    if (result?.error) denied = true;
  } catch {
    denied = true;
  }
  if (!denied) fail(`Negative canary unexpectedly allowed: ${label}`);
};

let applicant;
let reviewer;
let unrelated;

try {
  applicant = await createActor('applicant', 'client');
  reviewer = await createActor('reviewer', 'admin');
  unrelated = await createActor('unrelated', 'client');

  const { error: profileError } = await service.from('professional_profiles').insert({
    user_id: applicant.id,
    document_status: 'unverified',
    setup_status: 'pending_verification',
    setup_payload: {},
    setup_current_step: 2,
    verification_status: 'not_started',
  });
  if (profileError) fail(`Unable to create professional profile fixture: ${profileError.message}`);

  const fields = ['documentFront', 'documentBack', 'selfieDocument', 'proofOfAddress'];
  const bodies = Object.fromEntries(fields.map((field) => [
    field,
    new TextEncoder().encode(`PROF-B05-G2A:${runId}:${field}`),
  ]));
  const descriptors = fields.map((field) => ({
    field,
    fileName: `${field}.jpg`,
    size: bodies[field].byteLength,
    type: 'image/jpeg',
  }));

  const intent = await invoke(applicant.client, 'prepare_uploads', {
    verificationType: 'individual',
    files: descriptors,
  });
  if (!intent?.intentId || !Array.isArray(intent?.uploads) || intent.uploads.length !== fields.length) {
    fail('prepare_uploads returned an invalid signed manifest');
  }

  for (const upload of intent.uploads) {
    if (!upload?.path || !upload?.token || !fields.includes(upload.field)) fail('Invalid upload entry');
    if (!upload.path.startsWith(`locked/${applicant.id}/${intent.intentId}/`)) {
      fail(`Unexpected locked path: ${upload.path}`);
    }
    canaryPaths.push(upload.path);
    const blob = new Blob([bodies[upload.field]], { type: 'image/jpeg' });
    const { error } = await applicant.client.storage
      .from(upload.bucket || BUCKET)
      .uploadToSignedUrl(upload.path, upload.token, blob, { contentType: 'image/jpeg' });
    if (error) fail(`Signed upload failed for ${upload.field}: ${error.message}`);
  }

  const submission = await invoke(applicant.client, 'submit', {
    uploadIntentId: intent.intentId,
    payload: {
      verificationType: 'individual',
      legalName: 'PROF B05 Synthetic Applicant',
      taxId: '12345678901',
      birthDate: '2000-01-01',
      postalCode: '40000000',
      street: 'Rua Sintetica de Validacao',
      number: '1',
      district: 'Centro',
      city: 'Salvador',
      state: 'BA',
      documentType: 'synthetic-canary',
      truthConfirmed: true,
      consentAccepted: true,
    },
  });
  if (!submission?.id || submission.status !== 'submitted') fail('KYC submission canary did not reach submitted');

  const ownerSign = await applicant.client.storage.from(BUCKET).createSignedUrl(canaryPaths[0], 60);
  if (ownerSign.error || !ownerSign.data?.signedUrl) fail('Owner could not sign referenced evidence');

  const detail = await invoke(reviewer.client, 'detail', { verificationId: submission.id });
  if (!detail?.item?.id || detail.item.id !== submission.id) fail('Reviewer could not read submitted verification');

  await expectDenied('unrelated signed read', async () =>
    unrelated.client.storage.from(BUCKET).createSignedUrl(canaryPaths[0], 60)
  );

  const { data: listed, error: listError } = await applicant.client.storage.from(BUCKET).list('', { limit: 100 });
  if (!listError && Array.isArray(listed) && listed.length > 0) fail('Generic bucket listing returned KYC objects');

  await expectDenied('browser direct upload', async () =>
    applicant.client.storage.from(BUCKET).upload(
      `${applicant.id}/prof-b05-forbidden-${runId}.jpg`,
      new Blob([new Uint8Array([1, 2, 3])], { type: 'image/jpeg' }),
      { contentType: 'image/jpeg', upsert: false }
    )
  );

  await expectDenied('browser referenced delete', async () =>
    applicant.client.storage.from(BUCKET).remove([canaryPaths[0]])
  );

  jsonLog('prof-b05-g2a-pass', {
    runId,
    applicantId: applicant.id,
    verificationId: submission.id,
    intentId: intent.intentId,
    uploadedObjects: canaryPaths.length,
  });
} finally {
  if (canaryPaths.length) {
    const { error } = await service.storage.from(BUCKET).remove(canaryPaths);
    if (error) jsonLog('prof-b05-g2a-cleanup-storage-error', { message: error.message, paths: canaryPaths });
  }

  if (applicant?.id) {
    await service.from('verification_events').delete().eq('user_id', applicant.id);
    await service.from('professional_identity_verifications').delete().eq('user_id', applicant.id);
    await service.from('professional_profiles').delete().eq('user_id', applicant.id);
  }

  if (actors.length) {
    await service.from('users').delete().in('id', actors);
    for (const actorId of actors) {
      const { error } = await service.auth.admin.deleteUser(actorId);
      if (error) jsonLog('prof-b05-g2a-cleanup-auth-error', { actorId, message: error.message });
    }
  }

  for (const path of canaryPaths) {
    const { data, error } = await service.storage.from(BUCKET).createSignedUrl(path, 30);
    if (!error && data?.signedUrl) fail(`Cleanup residue remains at ${path}`);
  }

  jsonLog('prof-b05-g2a-cleanup-complete', { runId, paths: canaryPaths.length, actors: actors.length });
}
