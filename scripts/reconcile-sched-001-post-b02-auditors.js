#!/usr/bin/env node
'use strict';

const fs = require('fs');

function replaceOnce(path, before, after) {
  const source = fs.readFileSync(path, 'utf8');
  if (!source.includes(before)) {
    throw new Error(`POST_B02_RECONCILIATION_PATTERN_MISSING:${path}`);
  }
  const next = source.replace(before, after);
  if (next === source) throw new Error(`POST_B02_RECONCILIATION_NO_CHANGE:${path}`);
  fs.writeFileSync(path, next);
}

const b04NextAction = "assert(sched.nextActions[0].includes('SCHED-B04') || sched.nextActions[0].includes('ORD-001'));";

replaceOnce(
  'scripts/audit-sched-001-a01-repository-baseline-staging-security-preflight.js',
  `assert(!sched.blockers.some((blocker) => blocker.id === 'SCHED-B01'));
assert(sched.blockers.some((blocker) => blocker.id === 'SCHED-B02'));
assert(sched.blockers.some((blocker) => blocker.id === 'SCHED-B03'));
assert(sched.blockers.some((blocker) => blocker.id === 'SCHED-B04'));
assert(!sched.blockers.some((blocker) => blocker.id === 'SCHED-B05'));
assert(sched.nextActions[0].includes('SCHED-A07'));
assert(ord.nextActions[0].includes('SCHED-A07'));`,
  `assert(!sched.blockers.some((blocker) => blocker.id === 'SCHED-B01'));
assert(!sched.blockers.some((blocker) => blocker.id === 'SCHED-B05'));
const schedMatrixPatchA01 = Number(String(matrix.version).split('.')[2] || 0);
if (schedMatrixPatchA01 >= 63) {
  assert(!sched.blockers.some((blocker) => blocker.id === 'SCHED-B02'));
  assert(!sched.blockers.some((blocker) => blocker.id === 'SCHED-B03'));
  assert(sched.blockers.some((blocker) => blocker.id === 'SCHED-B04'));
  ${b04NextAction}
} else if (schedMatrixPatchA01 >= 50) {
  assert(sched.blockers.some((blocker) => blocker.id === 'SCHED-B02'));
  assert(!sched.blockers.some((blocker) => blocker.id === 'SCHED-B03'));
  assert(sched.blockers.some((blocker) => blocker.id === 'SCHED-B04'));
  if (schedMatrixPatchA01 >= 51) {
    assert(sched.nextActions[0].includes('authenticated staging composition canary'));
  } else {
    assert(sched.nextActions[0].includes('trusted server composition root'));
  }
} else {
  assert(sched.blockers.some((blocker) => blocker.id === 'SCHED-B02'));
  assert(sched.blockers.some((blocker) => blocker.id === 'SCHED-B03'));
  assert(sched.blockers.some((blocker) => blocker.id === 'SCHED-B04'));
  assert(sched.nextActions[0].includes('SCHED-A07'));
  assert(ord.nextActions[0].includes('SCHED-A07'));
}`
);

replaceOnce(
  'scripts/audit-sched-001-a02-command-event-timezone-conflict-contract.js',
  `const postA09 = compareVersions(matrix.version, '1.3.50') >= 0 && sched.maturity === 3;
if (postA09) {
  assert.deepStrictEqual(sched.blockers.map((item) => item.id), ['SCHED-B02', 'SCHED-B04']);
  if (Number(String(matrix.version).split('.')[2] || 0) >= 51) {
    assert(sched.nextActions[0].includes('authenticated staging composition canary'));
  } else {
    assert(sched.nextActions[0].includes('trusted server composition root'));
  }
  assert(ord.evidence.some((item) => item.includes('SCHED-A08 completed the official migration-history repair')));
} else {
  assert.deepStrictEqual(sched.blockers.map((item) => item.id), ['SCHED-B02', 'SCHED-B03', 'SCHED-B04']);
  assert(sched.nextActions[0].includes('SCHED-A07'));
  assert(ord.nextActions[0].includes('SCHED-A07'));
}`,
  `const postB02B = compareVersions(matrix.version, '1.3.63') >= 0 && sched.maturity >= 3;
const postA09 = compareVersions(matrix.version, '1.3.50') >= 0 && sched.maturity === 3;
if (postB02B) {
  assert.deepStrictEqual(sched.blockers.map((item) => item.id), ['SCHED-B04']);
  ${b04NextAction}
  assert(ord.evidence.some((item) => item.includes('SCHED-A08 completed the official migration-history repair')));
} else if (postA09) {
  assert.deepStrictEqual(sched.blockers.map((item) => item.id), ['SCHED-B02', 'SCHED-B04']);
  if (Number(String(matrix.version).split('.')[2] || 0) >= 51) {
    assert(sched.nextActions[0].includes('authenticated staging composition canary'));
  } else {
    assert(sched.nextActions[0].includes('trusted server composition root'));
  }
  assert(ord.evidence.some((item) => item.includes('SCHED-A08 completed the official migration-history repair')));
} else {
  assert.deepStrictEqual(sched.blockers.map((item) => item.id), ['SCHED-B02', 'SCHED-B03', 'SCHED-B04']);
  assert(sched.nextActions[0].includes('SCHED-A07'));
  assert(ord.nextActions[0].includes('SCHED-A07'));
}`
);

replaceOnce(
  'scripts/audit-sched-001-a03-reservation-migration-local-contract.js',
  `const postA09 = Number(String(matrix.version).split('.')[2]) >= 50 && sched.maturity === 3;
if (postA09) {
  assert.deepStrictEqual(sched.blockers.map((item) => item.id), ['SCHED-B02', 'SCHED-B04']);
  if (Number(String(matrix.version).split('.')[2] || 0) >= 51) {
    assert(sched.nextActions[0].includes('authenticated staging composition canary'));
  } else {
    assert(sched.nextActions[0].includes('trusted server composition root'));
  }
  assert(ord.evidence.some((item) => item.includes('SCHED-A08 completed the official migration-history repair')));
} else {
  assert(sched.nextActions[0].includes('SCHED-A07'));
  assert(ord.nextActions[0].includes('SCHED-A07'));
}`,
  `const schedMatrixPatchA03 = Number(String(matrix.version).split('.')[2] || 0);
const postB02B = schedMatrixPatchA03 >= 63 && sched.maturity >= 3;
const postA09 = schedMatrixPatchA03 >= 50 && sched.maturity === 3;
if (postB02B) {
  assert.deepStrictEqual(sched.blockers.map((item) => item.id), ['SCHED-B04']);
  ${b04NextAction}
  assert(ord.evidence.some((item) => item.includes('SCHED-A08 completed the official migration-history repair')));
} else if (postA09) {
  assert.deepStrictEqual(sched.blockers.map((item) => item.id), ['SCHED-B02', 'SCHED-B04']);
  if (schedMatrixPatchA03 >= 51) {
    assert(sched.nextActions[0].includes('authenticated staging composition canary'));
  } else {
    assert(sched.nextActions[0].includes('trusted server composition root'));
  }
  assert(ord.evidence.some((item) => item.includes('SCHED-A08 completed the official migration-history repair')));
} else {
  assert(sched.nextActions[0].includes('SCHED-A07'));
  assert(ord.nextActions[0].includes('SCHED-A07'));
}`
);

replaceOnce(
  'scripts/audit-sched-001-a04-server-command-runtime.js',
  `const postA09 = compareVersions(matrix.version, '1.3.50') >= 0 && sched.maturity === 3;
if (postA09) {
  assert.deepStrictEqual(sched.blockers.map((item) => item.id), ['SCHED-B02', 'SCHED-B04']);
  if (Number(String(matrix.version).split('.')[2] || 0) >= 51) {
    assert(sched.nextActions[0].includes('authenticated staging composition canary'));
  } else {
    assert(sched.nextActions[0].includes('trusted server composition root'));
  }
  assert(ord.evidence.some((item) => item.includes('SCHED-A08 completed the official migration-history repair')));
} else {
  assert.strictEqual(sched.maturity, 2);
  assert.deepStrictEqual(sched.blockers.map((item) => item.id), ['SCHED-B02', 'SCHED-B03', 'SCHED-B04']);
  assert(sched.nextActions[0].includes('SCHED-A07'));
  assert(ord.nextActions[0].includes('SCHED-A07'));
}`,
  `const postB02B = compareVersions(matrix.version, '1.3.63') >= 0 && sched.maturity >= 3;
const postA09 = compareVersions(matrix.version, '1.3.50') >= 0 && sched.maturity === 3;
if (postB02B) {
  assert.deepStrictEqual(sched.blockers.map((item) => item.id), ['SCHED-B04']);
  ${b04NextAction}
  assert(ord.evidence.some((item) => item.includes('SCHED-A08 completed the official migration-history repair')));
} else if (postA09) {
  assert.deepStrictEqual(sched.blockers.map((item) => item.id), ['SCHED-B02', 'SCHED-B04']);
  if (Number(String(matrix.version).split('.')[2] || 0) >= 51) {
    assert(sched.nextActions[0].includes('authenticated staging composition canary'));
  } else {
    assert(sched.nextActions[0].includes('trusted server composition root'));
  }
  assert(ord.evidence.some((item) => item.includes('SCHED-A08 completed the official migration-history repair')));
} else {
  assert.strictEqual(sched.maturity, 2);
  assert.deepStrictEqual(sched.blockers.map((item) => item.id), ['SCHED-B02', 'SCHED-B03', 'SCHED-B04']);
  assert(sched.nextActions[0].includes('SCHED-A07'));
  assert(ord.nextActions[0].includes('SCHED-A07'));
}`
);

replaceOnce(
  'scripts/audit-sched-001-a05-persistence-readiness.js',
  `const postB02A = compareVersions(matrix.version, '1.3.51') >= 0 && sched.maturity === 3;
const postA09 = compareVersions(matrix.version, '1.3.50') >= 0 && sched.maturity === 3;
if (postB02A) {
  assert.deepStrictEqual(sched.blockers.map((item) => item.id), ['SCHED-B02', 'SCHED-B04']);
  assert(sched.nextActions[0].includes('authenticated staging composition canary'));
  assert(sched.requiredPaths.includes('backend/modules/scheduling/scheduling-composition-root.js'));
  assert(sched.tests.includes('audit:sched-001-b02-composition-root-readiness'));
  assert(sched.tests.includes('test:sched-001-b02-composition-root-runtime'));
  assert(ord.evidence.some((item) => item.includes('SCHED-A08 completed the official migration-history repair')));
} else if (postA09) {`,
  `const postB02B = compareVersions(matrix.version, '1.3.63') >= 0 && sched.maturity >= 3;
const postB02A = compareVersions(matrix.version, '1.3.51') >= 0 && sched.maturity === 3;
const postA09 = compareVersions(matrix.version, '1.3.50') >= 0 && sched.maturity === 3;
if (postB02B) {
  assert.deepStrictEqual(sched.blockers.map((item) => item.id), ['SCHED-B04']);
  ${b04NextAction}
  assert(sched.requiredPaths.includes('backend/modules/scheduling/scheduling-composition-root.js'));
  assert(sched.tests.includes('audit:sched-001-b02-composition-root-readiness'));
  assert(sched.tests.includes('test:sched-001-b02-composition-root-runtime'));
  assert(sched.requiredPaths.includes('docs/validation/SCHED-001-B02B-AUTHENTICATED-COMPOSITION-CANARY.json'));
  assert(ord.evidence.some((item) => item.includes('SCHED-A08 completed the official migration-history repair')));
} else if (postB02A) {
  assert.deepStrictEqual(sched.blockers.map((item) => item.id), ['SCHED-B02', 'SCHED-B04']);
  assert(sched.nextActions[0].includes('authenticated staging composition canary'));
  assert(sched.requiredPaths.includes('backend/modules/scheduling/scheduling-composition-root.js'));
  assert(sched.tests.includes('audit:sched-001-b02-composition-root-readiness'));
  assert(sched.tests.includes('test:sched-001-b02-composition-root-runtime'));
  assert(ord.evidence.some((item) => item.includes('SCHED-A08 completed the official migration-history repair')));
} else if (postA09) {`
);

replaceOnce(
  'scripts/audit-sched-001-a07-history-canary-readiness.js',
  `if (postExecutionState) {
  assert.deepStrictEqual(blockerIds, ['SCHED-B02', 'SCHED-B04']);
  if (Number(String(matrix.version).split('.')[2] || 0) >= 51) {
    assert(sched.nextActions[0].includes('authenticated staging composition canary'));
  } else {
    assert(sched.nextActions[0].includes('trusted server composition root'));
  }
  assert(ord.evidence.some((item) => item.includes('SCHED-A08 completed the official migration-history repair')));
  assert(!flow.blockers.includes('SCHED-B03'));
} else {`,
  `if (postExecutionState) {
  const schedMatrixPatchA07 = Number(String(matrix.version).split('.')[2] || 0);
  if (schedMatrixPatchA07 >= 63) {
    assert.deepStrictEqual(blockerIds, ['SCHED-B04']);
    ${b04NextAction}
  } else {
    assert.deepStrictEqual(blockerIds, ['SCHED-B02', 'SCHED-B04']);
    if (schedMatrixPatchA07 >= 51) {
      assert(sched.nextActions[0].includes('authenticated staging composition canary'));
    } else {
      assert(sched.nextActions[0].includes('trusted server composition root'));
    }
  }
  assert(ord.evidence.some((item) => item.includes('SCHED-A08 completed the official migration-history repair')));
  assert(!flow.blockers.includes('SCHED-B03'));
} else {`
);

replaceOnce(
  'scripts/audit-ord-001-a11-scheduling-authority-handoff.js',
  `assert(!sched.blockers.some((blocker) => blocker.id === 'SCHED-B01'));
assert(!sched.blockers.some((blocker) => blocker.id === 'SCHED-B05'));
assert(sched.blockers.some((blocker) => blocker.id === 'SCHED-B02'));
assert(sched.blockers.some((blocker) => blocker.id === 'SCHED-B04' && blocker.category === 'order_integration'));
if (compareVersions(matrix.version, '1.3.50') >= 0 && sched.maturity === 3) {
  assert(!sched.blockers.some((blocker) => blocker.id === 'SCHED-B03'));
  if (Number(String(matrix.version).split('.')[2] || 0) >= 51) {
    assert(sched.nextActions[0].includes('authenticated staging composition canary'));
  } else {
    assert(sched.nextActions[0].includes('trusted server composition root'));
  }
  assert(ord.nextActions[0].includes('Keep ORD-B04 handed to SCHED-001'));
  assert(ord.evidence.some((item) => item.includes('SCHED-A08 completed the official migration-history repair')));
} else {`,
  `assert(!sched.blockers.some((blocker) => blocker.id === 'SCHED-B01'));
assert(!sched.blockers.some((blocker) => blocker.id === 'SCHED-B05'));
const schedMatrixPatchA11 = Number(String(matrix.version).split('.')[2] || 0);
if (schedMatrixPatchA11 >= 63) {
  assert(!sched.blockers.some((blocker) => blocker.id === 'SCHED-B02'));
} else {
  assert(sched.blockers.some((blocker) => blocker.id === 'SCHED-B02'));
}
assert(sched.blockers.some((blocker) => blocker.id === 'SCHED-B04' && blocker.category === 'order_integration'));
if (compareVersions(matrix.version, '1.3.50') >= 0 && sched.maturity >= 3) {
  assert(!sched.blockers.some((blocker) => blocker.id === 'SCHED-B03'));
  if (schedMatrixPatchA11 >= 63) {
    ${b04NextAction}
    assert(ord.nextActions.some((action) => action.includes('ORD-B04') || action.includes('SCHED-B04')));
  } else if (schedMatrixPatchA11 >= 51) {
    assert(sched.nextActions[0].includes('authenticated staging composition canary'));
    assert(ord.nextActions[0].includes('Keep ORD-B04 handed to SCHED-001'));
  } else {
    assert(sched.nextActions[0].includes('trusted server composition root'));
    assert(ord.nextActions[0].includes('Keep ORD-B04 handed to SCHED-001'));
  }
  assert(ord.evidence.some((item) => item.includes('SCHED-A08 completed the official migration-history repair')));
} else {`
);

console.log('SCHED post-B02 cumulative auditor reconciliation prepared.');
