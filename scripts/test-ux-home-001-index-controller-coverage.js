#!/usr/bin/env node
'use strict';

const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const railPath = require.resolve(path.join(root, 'assets/js/pages/home/rail-state.js'));
const controllerPath = require.resolve(path.join(root, 'assets/js/pages/index-data-controller.js'));
const originalCreateContext = vm.createContext;
const originalRunInContext = vm.runInContext;

function installGlobals(context) {
  global.window = context.window;
  global.document = context.document;
  global.CustomEvent = context.CustomEvent;
  Object.defineProperty(global, 'navigator', {
    configurable: true,
    value: context.navigator
  });
}

vm.createContext = function createCoverageContext(context) {
  return context;
};

vm.runInContext = function runCanonicalSource(_source, context, options) {
  const filename = options && options.filename;
  installGlobals(context);

  if (filename === 'assets/js/pages/home/rail-state.js') {
    delete require.cache[railPath];
    return require(railPath);
  }

  if (filename === 'assets/js/pages/index-data-controller.js') {
    delete require.cache[controllerPath];
    return require(controllerPath);
  }

  return originalRunInContext(_source, originalCreateContext(context), options);
};

process.once('exit', () => {
  vm.createContext = originalCreateContext;
  vm.runInContext = originalRunInContext;
  delete global.window;
  delete global.document;
  delete global.CustomEvent;
  delete global.navigator;
});

require('./test-ux-home-001-index-controller.js');
