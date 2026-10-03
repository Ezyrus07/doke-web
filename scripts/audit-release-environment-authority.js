'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const root = process.cwd();
const args = new Set(process.argv.slice(2));
const contractOnly = args.has('--contract-only');
const requireCandidateProvenance = args.has('--require-pr-candidate');
const requireProductionManifest = args.has('--require-production-manifest');
const contractPath = process.env.DOKE_RELEASE_ENVIRONMENT_AUTHORITY_PATH || 'config/release-environment-authority.json';
const manifestPath = process.env.DOKE_RELEASE_ENVIRONMENT_MANIFEST_PATH || 'reports/generated/release-environment-manifest.json';

function readJson(relativePath, report) {
  const absolute = path.join(root, relativePath);
  if (!fs.existsSync(absolute)) {
    report.failures.push(`Missing JSON file: ${relativePath}`);
    return null;
  }
  try {
    return JSON.parse(fs.readFileSync(absolute, 'utf8'));
  } catch (error) {
    report.failures.push(`${relativePath} is not valid JSON: ${error.message}`);
    return null;
  }
}

function expect(report, condition, message, details = {}) {
  if (condition) report.results.push({ name: message, status: 'passed', ...details });
  else report.failures.push(message);
}

function block(report, message) {
  report.blockers.push(message);
}

function nonEmpty(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function isSha(value) {
  return typeof value === 'string' && /^[0-9a-f]{40}$/i.test(value);
}

function gitRevParse(spec) {
  const result = spawnSync('git', ['rev-parse', spec], { cwd: root, encoding: 'utf8' });
  if (result.status !== 0) return null;
  return String(result.stdout || '').trim();
}

function validateRuntimeGitBinding(report, prefix, sha, tree) {
  expect(report, isSha(sha), `${prefix}.sha.valid`);
  expect(report, isSha(tree), `${prefix}.tree.valid`);
  if (!isSha(sha) || !isSha(tree)) return;

  const checkoutHead = gitRevParse('HEAD');
  const gitTree = gitRevParse(`${sha}^{tree}`);
  expect(report, checkoutHead === sha, `${prefix}.sha.matches_checkout_head`, { checkoutHead });
  expect(report, gitTree === tree, `${prefix}.tree.matches_git_object`, { gitTree });
}

const report = {
  name: 'release-environment-authority',
  generatedAt: new Date().toISOString(),
  performsExternalNetworkRequest: false,
  performsExternalMutation: false,
  contractOnly,
  requireCandidateProvenance,
  requireProductionManifest,
  status: 'not_evaluated',
  results: [],
  blockers: [],
  failures: []
};

const modes = [contractOnly, requireCandidateProvenance, requireProductionManifest].filter(Boolean).length;
if (modes !== 1) {
  block(report, 'Choose exactly one mode: --contract-only, --require-pr-candidate, or --require-production-manifest.');
}

const contract = readJson(contractPath, report);
if (contract) {
  expect(report, contract.schemaVersion === 2, 'contract.schemaVersion=2');
  expect(report, contract.contractId === 'infra-env-002-release-provenance-authority-v2', 'contract.id.canonical');
  expect(report, contract.canonicalRepository === 'Ezyrus07/doke-web', 'repository.canonical');
  expect(report, contract.canonicalReleaseBranch === 'MAIN', 'release_branch.MAIN');
  expect(report, contract.canonicalVercelProject && contract.canonicalVercelProject.name === 'doke-web', 'vercel_project.name.canonical');
  expect(report, contract.canonicalVercelProject && contract.canonicalVercelProject.projectId === 'prj_UDT0gjRcQ9J4LwRpQPHDEw1nYCqi', 'vercel_project.id.canonical');
  expect(report, contract.staging && contract.staging.supabaseProjectRef === 'zwkczgewzbsorbrjuzpb', 'supabase.staging.canonical');
  expect(report, contract.production && contract.production.mustDifferFromStaging === true, 'supabase.production.must_differ');
  expect(report, contract.releasePolicy && contract.releasePolicy.directProductionFromFeatureBranchesForbidden === true, 'production.feature_branch_direct_deploy.forbidden');
  expect(report, contract.releasePolicy && contract.releasePolicy.productionRequiresReleaseManifest === true, 'production.manifest.required');
  expect(report, contract.releasePolicy && contract.releasePolicy.productionRequiresCanonicalVercelProject === true, 'production.canonical_vercel.required');
  expect(report, contract.releasePolicy && contract.releasePolicy.productionRequiresDistinctSupabaseProject === true, 'production.distinct_supabase.required');
  expect(report, contract.releasePolicy && contract.releasePolicy.prCandidateProvenanceMode === 'runtime_git_event', 'candidate.runtime_git_event.required');
  expect(report, contract.releasePolicy && contract.releasePolicy.productionReleaseProvenanceMode === 'post_integration_runtime', 'production.post_integration_runtime.required');

  const shadow = Array.isArray(contract.shadowVercelProjects)
    ? contract.shadowVercelProjects.find((item) => item && item.projectId === 'prj_U2VMduYbyTbVPLYbohOdgD5FljAZ')
    : null;
  expect(report, Boolean(shadow && shadow.productionAuthority === false && shadow.rollbackAuthority === false), 'shadow_project.jkpw.no_authority');

  const prefixes = new Set(contract.forbiddenDirectProductionBranchPrefixes || []);
  for (const prefix of ['ana/', 'ux/', 'sec/', 'validation/']) {
    expect(report, prefixes.has(prefix), `production.forbidden_prefix.${prefix}`);
  }

  if (contract.production && contract.production.supabaseProjectRef) {
    expect(report, contract.production.supabaseProjectRef !== contract.staging.supabaseProjectRef, 'supabase.production.not_staging');
  }
}

if (requireCandidateProvenance && contract) {
  const candidateSha = String(process.env.DOKE_CANDIDATE_SHA || '');
  const candidateTree = String(process.env.DOKE_CANDIDATE_TREE_SHA || '');
  const candidateBranch = String(process.env.DOKE_CANDIDATE_BRANCH || '');
  const releaseBranch = String(process.env.DOKE_RELEASE_BRANCH || '');

  expect(report, nonEmpty(candidateBranch), 'candidate.branch.present');
  expect(report, nonEmpty(releaseBranch), 'candidate.target_branch.present');
  validateRuntimeGitBinding(report, 'candidate', candidateSha, candidateTree);

  report.candidate = {
    sha: candidateSha || null,
    tree: candidateTree || null,
    branch: candidateBranch || null,
    releaseBranch: releaseBranch || null,
    targetsCanonicalReleaseBranch: releaseBranch === contract.canonicalReleaseBranch
  };
}

if (requireProductionManifest) {
  const manifest = readJson(manifestPath, report);
  if (contract && manifest) {
    const required = contract.requiredProductionManifestFields || [];
    for (const field of required) {
      const value = manifest[field];
      const present = Array.isArray(value) ? value.length > 0 : value !== null && value !== undefined && value !== '';
      expect(report, present, `manifest.required.${field}`);
    }

    const runtimeReleaseSha = String(process.env.DOKE_RELEASE_SHA || '');
    const runtimeReleaseTree = String(process.env.DOKE_RELEASE_TREE_SHA || '');
    const runtimeReleaseBranch = String(process.env.DOKE_RELEASE_BRANCH || '');

    expect(report, manifest.repository === contract.canonicalRepository, 'manifest.repository.canonical');
    expect(report, manifest.release_branch === contract.canonicalReleaseBranch, 'manifest.release_branch.MAIN');
    expect(report, runtimeReleaseBranch === contract.canonicalReleaseBranch, 'runtime.release_branch.MAIN');
    expect(report, manifest.vercel_project_id === contract.canonicalVercelProject.projectId, 'manifest.vercel_project.canonical');
    expect(report, manifest.staging_supabase_ref === contract.staging.supabaseProjectRef, 'manifest.staging_supabase.canonical');
    expect(report, isSha(manifest.release_sha) && manifest.preview_deployment_sha === manifest.release_sha, 'manifest.preview_sha.matches_release_sha');
    expect(report, manifest.release_sha === runtimeReleaseSha, 'manifest.release_sha.matches_runtime');
    expect(report, manifest.release_tree_sha === runtimeReleaseTree, 'manifest.release_tree.matches_runtime');
    expect(report, manifest.release_branch === runtimeReleaseBranch, 'manifest.release_branch.matches_runtime');
    expect(report, nonEmpty(manifest.authorization_id), 'manifest.authorization_id.present');
    expect(report, nonEmpty(manifest.rollback_deployment_id), 'manifest.rollback_deployment_id.present');
    expect(report, Array.isArray(manifest.ci_run_ids) && manifest.ci_run_ids.length > 0, 'manifest.ci_runs.present');

    validateRuntimeGitBinding(report, 'release', runtimeReleaseSha, runtimeReleaseTree);

    if (!contract.production.supabaseProjectRef) {
      block(report, 'Production Supabase authority is UNASSIGNED; production release is forbidden.');
    } else {
      expect(report, manifest.production_supabase_ref === contract.production.supabaseProjectRef, 'manifest.production_supabase.canonical');
      expect(report, manifest.production_supabase_ref !== contract.staging.supabaseProjectRef, 'manifest.production_supabase.not_staging');
    }

    report.release = {
      sha: runtimeReleaseSha || null,
      tree: runtimeReleaseTree || null,
      branch: runtimeReleaseBranch || null
    };
  }
}

if (report.failures.length) report.status = 'failed';
else if (report.blockers.length) report.status = 'blocked';
else if (requireCandidateProvenance) report.status = 'pr_candidate_provenance_passed';
else if (requireProductionManifest) report.status = 'production_release_environment_authority_passed';
else report.status = 'release_environment_authority_contract_passed';

console.log(JSON.stringify(report, null, 2));
process.exit(report.failures.length || report.blockers.length ? 1 : 0);