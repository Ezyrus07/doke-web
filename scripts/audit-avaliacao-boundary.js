#!/usr/bin/env node
/**
 * Global Cycle 74 — avaliacao data boundary audit.
 *
 * Purpose:
 * - Ensure avaliacao.html has a minimal controller/data boundary.
 * - Preserve provisional visual structure while preparing review submission.
 * - Keep review UI behavior in the existing page script and avoid visual CSS changes.
 */
const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const OUTPUT = path.join(ROOT, 'docs/validation/global-cycle-74-avaliacao-boundary-report.json');

function read(file) {
  return fs.readFileSync(path.join(ROOT, file), 'utf8');
}

function has(file) {
  return fs.existsSync(path.join(ROOT, file));
}

function assert(condition, message, failures) {
  if (!condition) failures.push(message);
}

function main() {
  const failures = [];
  const pageFile = 'avaliacao.html';
  const controllerFile = 'assets/js/controllers/avaliacao-controller.js';
  const controllerDataFile = 'assets/js/controllers/controller-data.js';
  const domainDataFile = 'assets/js/services/domain-data-service.js';
  const pageScriptFile = 'assets/js/pages/avaliacao.js';

  assert(has(pageFile), `${pageFile} is missing`, failures);
  assert(has(controllerFile), `${controllerFile} is missing`, failures);
  assert(has(pageScriptFile), `${pageScriptFile} is missing`, failures);
  assert(has(controllerDataFile), `${controllerDataFile} is missing`, failures);
  assert(has(domainDataFile), `${domainDataFile} is missing`, failures);

  const html = has(pageFile) ? read(pageFile) : '';
  const controller = has(controllerFile) ? read(controllerFile) : '';
  const controllerData = has(controllerDataFile) ? read(controllerDataFile) : '';
  const domainData = has(domainDataFile) ? read(domainDataFile) : '';

  const requiredHooks = [
    'data-review-page',
    'data-review-professional',
    'data-review-avatar',
    'data-review-overall-value',
    'data-review-star',
    'data-competency',
    'data-review-competency-star',
    'data-review-topic-comment',
    'data-review-note',
    'data-review-anonymous',
    'data-review-submit',
    'data-review-back'
  ];

  requiredHooks.forEach(hook => {
    assert(html.includes(hook), `${pageFile} does not include ${hook}`, failures);
  });

  const requiredScripts = [
    'assets/js/services/domain-data-service.js',
    'assets/js/controllers/controller-data.js',
    'assets/js/controllers/page-controller-registry.js',
    'assets/js/controllers/avaliacao-controller.js',
    'assets/js/controllers/controller-bootstrap.js'
  ];

  requiredScripts.forEach(script => {
    assert(html.includes(script), `${pageFile} does not import ${script}`, failures);
  });

  assert(/var PAGE_NAME = 'avaliacao'/.test(controller), `${controllerFile} must declare PAGE_NAME avaliacao`, failures);
  assert(controller.includes('visualContract: \'provisional-layout-preserved\''), `${controllerFile} must preserve provisional visual contract`, failures);
  assert(controller.includes('Doke.reviewController'), `${controllerFile} must expose Doke.reviewController`, failures);
  assert(controller.includes('Doke.controllers') && controller.includes('register(PAGE_NAME'), `${controllerFile} must register with page-controller-registry`, failures);
  assert(controller.includes('readDraft'), `${controllerFile} must expose review draft reading`, failures);
  assert(controller.includes('dataStatus: \'ready\''), `${controllerFile} must write ready data status`, failures);

  assert(controllerData.includes("avaliacao: ['reviews', 'orders', 'services']"), `${controllerDataFile} must register avaliacao resources`, failures);
  assert(domainData.includes("case 'avaliacao':"), `${domainDataFile} must include avaliacao case`, failures);
  assert(domainData.includes('reviewOrderId'), `${domainDataFile} must prepare order lookup for review flow`, failures);

  assert(!/style\s*=/.test(html), `${pageFile} must not add inline style attributes`, failures);
  assert(!/\son[a-z]+\s*=/.test(html), `${pageFile} must not add inline event handlers`, failures);
  assert(!/!important/.test(controller), `${controllerFile} must not use !important`, failures);

  const report = {
    cycle: 'Global Cycle 74',
    name: 'Avaliacao data boundary audit',
    generatedAt: new Date().toISOString(),
    scope: {
      page: pageFile,
      controller: controllerFile,
      visualProductFilesChanged: false,
      provisionalVisualPreserved: true
    },
    checks: {
      requiredHooks,
      requiredScripts,
      controllerFile,
      controllerDataResources: ['reviews', 'orders', 'services'],
      domainDataCase: 'avaliacao',
      submissionPolicy: 'prepare review rating, competencies, comments and anonymous flag without binding to backend implementation yet'
    },
    result: failures.length ? 'fail' : 'pass',
    failures
  };

  fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
  fs.writeFileSync(OUTPUT, `${JSON.stringify(report, null, 2)}\n`);

  if (failures.length) {
    console.error('[cycle-74] Avaliacao boundary audit failed:');
    failures.forEach(failure => console.error(`- ${failure}`));
    process.exitCode = 1;
    return;
  }

  console.log('[cycle-74] Avaliacao boundary audit passed.');
  console.log(`[cycle-74] Output: ${path.relative(ROOT, OUTPUT)}`);
}

main();
