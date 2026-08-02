#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const executorPath = path.join(__dirname, 'execute-sched-001-c01d-authenticated-browser-read-only-canary.js');
const runtimePrefix = '.sched-c01d-authenticated-browser-read-only-canary-runtime-';
const legacyWait = "page.waitForURL(/\\/pedidos\\.html(?:[?#].*)?$/, { timeout: 30_000 }),";
const correctedWait = "page.waitForURL(/\\/pedidos\\.html(?:[?#].*)?$/, { waitUntil: 'domcontentloaded', timeout: 30_000 }),";

function countOccurrences(source, fragment) {
  return source.split(fragment).length - 1;
}

function run() {
  const source = fs.readFileSync(executorPath, 'utf8');
  const matches = countOccurrences(source, legacyWait);
  if (matches !== 1) {
    throw new Error(`Expected exactly one legacy C01D login wait contract, found ${matches}.`);
  }

  const runtimePath = path.join(
    __dirname,
    `${runtimePrefix}${process.pid}-${Date.now()}.js`
  );

  try {
    fs.writeFileSync(runtimePath, source.replace(legacyWait, correctedWait), {
      encoding: 'utf8',
      mode: 0o700
    });

    const result = spawnSync(
      process.execPath,
      [runtimePath, ...process.argv.slice(2)],
      {
        cwd: process.cwd(),
        env: process.env,
        encoding: null,
        maxBuffer: 16 * 1024 * 1024
      }
    );

    if (result.stdout) process.stdout.write(result.stdout);
    if (result.stderr) process.stderr.write(result.stderr);
    if (result.error) throw result.error;
    return Number.isInteger(result.status) ? result.status : 1;
  } finally {
    fs.rmSync(runtimePath, { force: true });
  }
}

try {
  process.exitCode = run();
} catch (error) {
  console.error(error && (error.stack || error.message) || String(error));
  process.exitCode = 1;
}
