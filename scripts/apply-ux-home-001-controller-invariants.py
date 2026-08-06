#!/usr/bin/env python3
from pathlib import Path

controller_path = Path('assets/js/pages/index-data-controller.js')
controller = controller_path.read_text(encoding='utf-8')

anchor = """  function publishRootExperience(root, state, code) {
"""
helper = """  function resolveRootState(hasItems, remoteAccepted) {
    if (hasItems) return 'ready';
    if (remoteAccepted) return 'empty';
    return isOffline() ? 'offline' : 'error';
  }

  function publishRootExperience(root, state, code) {
"""
if controller.count(anchor) != 1:
    raise SystemExit(f'publishRootExperience anchor count: {controller.count(anchor)}')
controller = controller.replace(anchor, helper)

root_expression = "var rootState = hasItems || serviceResult.ok ? 'ready' : (isOffline() ? 'offline' : 'error');"
if controller.count(root_expression) != 1:
    raise SystemExit('root state expression not found exactly once')
controller = controller.replace(root_expression, "var rootState = resolveRootState(hasItems, serviceResult.ok);")

shared = "publishRootExperience(root, result.ok || counts.workers || counts.publications ? 'ready' : 'error', result.errorCode);"
if controller.count(shared) != 2:
    raise SystemExit(f'shared root publish count: {controller.count(shared)}')
controller = controller.replace(
    shared,
    "var retryHasItems = Boolean(result.collections.featuredCount || result.collections.moreCount || counts.workers || counts.publications);\n      publishRootExperience(root, resolveRootState(retryHasItems, result.ok), result.errorCode);",
    1
)
controller = controller.replace(
    shared,
    "var revalidatedHasItems = Boolean(result.collections.featuredCount || result.collections.moreCount || counts.workers || counts.publications);\n      publishRootExperience(root, resolveRootState(revalidatedHasItems, result.ok), result.errorCode);",
    1
)
controller_path.write_text(controller, encoding='utf-8')

test_path = Path('scripts/test-ux-home-001-index-controller.js')
test_source = test_path.read_text(encoding='utf-8')
old_test = """async function verifyStalePreservationAndSingleFlight() {
  const harness = createHarness({ serviceCount: 7, workers: 1 });
  await harness.api.load(harness.root);
  harness.failServices('CATALOG_REFRESH_FAILED');
  const failedRefresh = await harness.api.retryServices();
  assert.equal(failedRefresh.ok, false);
"""
new_test = """async function verifyStalePreservationAndSingleFlight() {
  const harness = createHarness({ serviceCount: 7, workers: 1 });
  await harness.api.load(harness.root);
  assert.equal(harness.serviceCalls(), 1, 'initial Home load must issue one catalog request');
  harness.failServices('CATALOG_REFRESH_FAILED');
  const failedRefresh = await harness.api.retryServices();
  assert.equal(failedRefresh.ok, false);
  assert.equal(harness.serviceCalls(), 2, 'settled retry must issue one additional catalog request');
"""
if test_source.count(old_test) != 1:
    raise SystemExit(f'single-flight test prelude count: {test_source.count(old_test)}')
test_source = test_source.replace(old_test, new_test)

old_assertion = """  const first = harness.api.retryServices();
  const second = harness.api.retryServices();
  assert.equal(harness.serviceCalls(), callsBefore + 1, 'concurrent retry must reuse one catalog request');
  request.resolve(services(7));
"""
new_assertion = """  const first = harness.api.retryServices();
  const second = harness.api.retryServices();
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(harness.serviceCalls(), callsBefore + 1, 'concurrent retry must reuse one catalog request');
  request.resolve(services(7));
"""
if test_source.count(old_assertion) != 1:
    raise SystemExit(f'single-flight assertion block count: {test_source.count(old_assertion)}')
test_source = test_source.replace(old_assertion, new_assertion)
test_path.write_text(test_source, encoding='utf-8')

workflow_path = Path('.github/workflows/ux-home-001-rail-states.yml')
workflow = workflow_path.read_text(encoding='utf-8')
path_line = "      - 'scripts/test-ux-home-001-rail-state.js'\n"
if workflow.count(path_line) != 2:
    raise SystemExit(f'workflow trigger path count: {workflow.count(path_line)}')
workflow = workflow.replace(
    path_line,
    path_line + "      - 'scripts/test-ux-home-001-index-controller.js'\n"
)

syntax_line = "          node --check scripts/test-ux-home-001-rail-state.js\n"
if workflow.count(syntax_line) != 1:
    raise SystemExit('workflow syntax line mismatch')
workflow = workflow.replace(
    syntax_line,
    syntax_line + "          node --check scripts/test-ux-home-001-index-controller.js\n"
)

behavior_step = """      - name: Validate immutable rail state behavior
        run: node scripts/test-ux-home-001-rail-state.js

"""
if workflow.count(behavior_step) != 1:
    raise SystemExit('rail behavior step mismatch')
workflow = workflow.replace(
    behavior_step,
    behavior_step + """      - name: Validate Home controller behavior
        run: node scripts/test-ux-home-001-index-controller.js

"""
)

coverage_include = "            --test-coverage-include='assets/js/pages/home/rail-state.js' \\\n"
if workflow.count(coverage_include) != 1:
    raise SystemExit('coverage include mismatch')
workflow = workflow.replace(
    coverage_include,
    coverage_include + "            --test-coverage-include='assets/js/pages/index-data-controller.js' \\\n"
)

coverage_script = "            scripts/test-ux-home-001-rail-state.js\n"
if workflow.count(coverage_script) != 1:
    raise SystemExit('coverage script mismatch')
workflow = workflow.replace(
    coverage_script,
    "            scripts/test-ux-home-001-rail-state.js \\\n            scripts/test-ux-home-001-index-controller.js\n"
)

coverage_grep = "          grep -Fq 'SF:assets/js/pages/home/rail-state.js' \"${REPORT}\"\n"
if workflow.count(coverage_grep) != 1:
    raise SystemExit('coverage grep mismatch')
workflow = workflow.replace(
    coverage_grep,
    coverage_grep + "          grep -Fq 'SF:assets/js/pages/index-data-controller.js' \"${REPORT}\"\n"
)
workflow_path.write_text(workflow, encoding='utf-8')
print('UX-HOME-001 controller invariants, async single-flight test and coverage gate applied')
