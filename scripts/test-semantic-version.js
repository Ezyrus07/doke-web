'use strict';

const assert = require('node:assert/strict');
const {
  parseNumericSemanticVersion,
  compareNumericSemanticVersions,
  isNumericSemanticVersionAtLeast
} = require('./lib/semantic-version');

assert.deepEqual([...parseNumericSemanticVersion('1.3.90')], [1, 3, 90]);
assert.equal(compareNumericSemanticVersions('1.3.90', '1.3.85'), 1);
assert.equal(compareNumericSemanticVersions('1.3.85', '1.3.85'), 0);
assert.equal(compareNumericSemanticVersions('1.3.84', '1.3.85'), -1);
assert.equal(isNumericSemanticVersionAtLeast('1.4.0', '1.3.85'), true);
assert.equal(isNumericSemanticVersionAtLeast('2.0.0', '1.3.85'), true);
assert.equal(isNumericSemanticVersionAtLeast('1.2.99', '1.3.85'), false);
assert.throws(() => parseNumericSemanticVersion('1.3'), /numeric semantic version/);
assert.throws(() => parseNumericSemanticVersion('1.3.85-beta'), /numeric semantic version/);
assert.throws(() => parseNumericSemanticVersion('01.3.85'), /numeric semantic version/);

console.log('Numeric semantic version utility test passed.');
