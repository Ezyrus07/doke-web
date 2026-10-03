'use strict';

const fs = require('fs');
const path = require('path');

const root = process.cwd();
const args = new Set(process.argv.slice(2));
const contractOnly = args.has('--contract-only');
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

const report = {
  name: 'release-environment-authority',
  generatedAt: new Date().toISOString(),
  performsExternalNetworkRequest: false,
  performsExternalMutation: false,
  contractOnly,
  requireProductionManifest,
  status: 'not_evaluated',
  results: [],
  blockers: [],
  failures: []
};

const contract = readJson(contractPath, report);
if (contract) {
  expect(report, contract.schemaVersion === 1, 'contract.schemaVersion=1');
  expect(report, contract.contractId === 'infra-env-002-release-provenance-authority-v1', 'contract.id.canonical');
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

  const shadow = Array.isArray(contract.shadowVercelProjects)
    ? contract.shadowVercelProjects.find((item) => item && item.projectId === 'prj_U2VMduYbyTbVPLYbohOdgD5FljAZ')
    : null;
  expect(report, Boolean(shadow && shadow.productionAuthority === false && shadow.rollbackAuthority === false), 'shadow_project.jkpw.no_authority');

  const prefixes = new Set(contract.forbiddenDirectProductionBranchPrefixes || []);
  for (const prefix of ['ana/', 'ux/', 'sec/', 'validation/']) {
    expect(report, prefixes.has(prefix), `production.forbidden_prefix.${prefix}`);
  }

  if (contract.production && contract.production.supabaseProjectRef) {
    expect(
      report,
      contract.production.supabaseProjectRef !== contract.staging.supabaseProjectRef,
      'supabase.production.not_staging'
    );
  }
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

    expect(report, manifest.repository === contract.canonicalRepository, 'manifest.repository.canonical');
    expect(report, manifest.source_branch === contract.canonicalReleaseBranch, 'manifest.source_branch.MAIN');
    expect(report, manifest.release_branch === contract.canonicalReleaseBranch, 'manifest.release_branch.MAIN');
    expect(report, manifest.vercel_project_id === contract.canonicalVercelProject.projectId, 'manifest.vercel_project.canonical');
    expect(report, manifest.staging_supabase_ref === contract.staging.supabaseProjectRef, 'manifest.staging_supabase.canonical');
    expect(report, nonEmpty(manifest.source_sha) && manifest.preview_deployment_sha === manifest.source_sha, 'manifest.preview_sha.matches_source_sha');
    expect(report, nonEmpty(manifest.authorization_id), 'manifest.authorization_id.present');
    expect(report, nonEmpty(manifest.rollback_deployment_id), 'manifest.rollback_deployment_id.present');
    expect(report, Array.isArray(manifest.ci_run_ids) && manifest.ci_run_ids.length > 0, 'manifest.ci_runs.present');

    if (!contract.production.supabaseProjectRef) {
      block(report, 'Production Supabase authority is UNASSIGNED; production release is forbidden.');
    } else {
      expect(report, manifest.production_supabase_ref === contract.production.supabaseProjectRef, 'manifest.production_supabase.canonical');
      expect(report, manifest.production_supabase_ref !== contract.staging.supabaseProjectRef, 'manifest.production_supabase.not_staging');
    }

    const forbiddenPrefixes = contract.forbiddenDirectProductionBranchPrefixes || [];
    const forbidden = forbiddenPrefixes.some((prefix) => String(manifest.source_branch || '').startsWith(prefix));
    expect(report, !forbidden, 'manifest.source_branch.not_feature_branch');
  }
}

if (!contractOnly && !requireProductionManifest) {
  block(report, 'Choose --contract-only or --require-production-manifest explicitly.');
}

if (report.failures.length) report.status = 'failed';
else if (report.blockers.length) report.status = 'blocked';
else report.status = requireProductionManifest ? 'production_release_environment_authority_passed' : 'release_environment_authority_contract_passed';

console.log(JSON.stringify(report, null, 2));
process.exit(report.failures.length || report.blockers.length ? 1 : 0);