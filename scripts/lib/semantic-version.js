'use strict';

const NUMERIC_SEMANTIC_VERSION = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;

function parseNumericSemanticVersion(value, field = 'version') {
  const normalized = String(value == null ? '' : value).trim();
  const match = NUMERIC_SEMANTIC_VERSION.exec(normalized);
  if (!match) {
    throw new TypeError(`${field} must use numeric semantic version format x.y.z.`);
  }
  return Object.freeze(match.slice(1).map((part) => Number(part)));
}

function compareNumericSemanticVersions(left, right) {
  const leftParts = parseNumericSemanticVersion(left, 'left version');
  const rightParts = parseNumericSemanticVersion(right, 'right version');
  for (let index = 0; index < leftParts.length; index += 1) {
    if (leftParts[index] > rightParts[index]) return 1;
    if (leftParts[index] < rightParts[index]) return -1;
  }
  return 0;
}

function isNumericSemanticVersionAtLeast(actual, minimum) {
  return compareNumericSemanticVersions(actual, minimum) >= 0;
}

module.exports = Object.freeze({
  parseNumericSemanticVersion,
  compareNumericSemanticVersions,
  isNumericSemanticVersionAtLeast
});
