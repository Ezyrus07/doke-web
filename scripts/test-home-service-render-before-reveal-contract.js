#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const controller = read('assets/js/pages/index-data-controller.js');
const publicServices = read('assets/js/pages/home/public-services.js');
const html = read('index.html');
const failures = [];

function requireToken(source, token, message) {
  if (!source.includes(token)) failures.push(message || `Token ausente: ${token}`);
}

requireToken(controller, 'function renderServiceListsBeforeReveal(data)', 'O controller precisa renderizar os serviços antes de revelar a Home.');
requireToken(controller, 'var renderedServiceCount = renderServiceListsBeforeReveal(data);', 'O payload principal precisa renderizar os cards antes do estado ready.');
requireToken(controller, 'renderServiceListsBeforeReveal(data);\n    setRootState(root, \'ready\');', 'A revalidação SWR precisa renderizar antes de marcar ready.');

const renderIndex = controller.indexOf('var renderedServiceCount = renderServiceListsBeforeReveal(data);');
const readyIndex = controller.indexOf("setRootState(root, hasItems ? 'ready' : 'empty');", renderIndex);
if (renderIndex === -1 || readyIndex === -1 || renderIndex > readyIndex) {
  failures.push('Os cards precisam ser renderizados antes de a Home entrar em ready/empty.');
}

requireToken(publicServices, 'if(last && last.data) return Promise.resolve(render(last.data.services));', 'O módulo não deve iniciar outra consulta fresca quando o controller já possui payload.');
if (/if\s*\(last\s*&&\s*last\.data\)\s*render\(last\.data\.services\);\s*return\s+refresh\(\);/.test(publicServices)) {
  failures.push('Foi detectada a consulta duplicada antiga após renderizar o payload existente.');
}

requireToken(html, 'home-render-before-reveal-v1', 'index.html precisa invalidar o cache dos scripts corrigidos.');

if (failures.length) {
  console.error('Home service render-before-reveal contract failed.');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}
console.log('Home service render-before-reveal contract passed.');
