#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const failures = [];
const expect = (condition, message) => { if (!condition) failures.push(message); };

const html = read('resultados.html');
const renderer = read('assets/js/pages/search-results.js');
const dataController = read('assets/js/pages/resultados-data-controller.js');
const hydrationCss = read('assets/css/pages/results/page-hydration-states.css');

expect(html.includes('search-results.js?v=20260714-results-state-authority-v1'), 'resultados.html must invalidate the visual renderer cache');
expect(html.includes('resultados-data-controller.js?v=20260714-results-state-authority-v1'), 'resultados.html must invalidate the passive data controller cache');
expect(renderer.includes('window.DokePageHydration.create'), 'search-results.js must own page hydration');
expect(renderer.includes("waitFor: ['dom', 'render']"), 'results hydration must wait for the actual renderer');
expect(renderer.includes('hasItems: () => true'), 'page hydration must keep the search shell ready when the inline result set is empty');
expect(renderer.includes('settleResultsHydration();'), 'every rendered result mode must settle page hydration');
expect(!renderer.includes('}, 220);'), 'initial result rendering must not use an artificial 220 ms delay');
expect(dataController.includes('resultsRepositoryState'), 'repository controller must expose a non-visual repository state');
expect(dataController.includes('repositoryResultCount'), 'repository controller must namespace its count');
expect(!dataController.includes('DokePageHydration'), 'repository controller must not own page hydration');
expect(!dataController.includes('Doke.listState.setListState'), 'repository controller must not own list visibility');
expect(!dataController.includes('Doke.experience.states.set'), 'repository controller must not publish visual experience states');
expect(hydrationCss.includes('[data-results-hydration-skeleton][hidden]'), 'skeleton hidden contract is required');
expect(hydrationCss.includes('[data-results-hydration-ready][hidden]'), 'ready surface hidden contract is required');
expect(hydrationCss.includes('[data-results-grid][hidden]'), 'result grid hidden contract is required during local loading');
expect(hydrationCss.includes('[data-results-inline-empty][hidden]'), 'inline empty hidden contract is required');
expect(hydrationCss.includes('display: none;'), 'hidden hydration surfaces must use display none');

if (failures.length) {
  console.error('[results-hydration-state-authority] failed');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}
console.log('[results-hydration-state-authority] passed');
