'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'anunciar-servico.html'), 'utf8');
const pageJs = fs.readFileSync(path.join(root, 'assets/js/pages/anunciar-servico.js'), 'utf8');
const formJs = fs.readFileSync(path.join(root, 'assets/js/pages/service-form-experience.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'assets/css/pages/anunciar-servico.css'), 'utf8');

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const uploadCards = (html.match(/data-upload-card/g) || []).length;
const uploadInputs = (html.match(/data-upload-input/g) || []).length;
const uploadStatuses = (html.match(/data-upload-status/g) || []).length;
assert(uploadCards === 3, `esperava 3 upload cards, encontrou ${uploadCards}`);
assert(uploadInputs === 3, `esperava 3 upload inputs, encontrou ${uploadInputs}`);
assert(uploadStatuses === 3, `esperava 3 upload statuses, encontrou ${uploadStatuses}`);
assert(css.includes('.post-service-upload-card.has-file'), 'estado visual has-file ausente');
assert(css.includes('var(--color-secondary, #298f7f)'), 'estado preenchido não usa verde canônico');
assert(pageJs.includes('const MAX_UPLOAD_BYTES = 5 * 1024 * 1024'), 'limite imediato de 5 MB ausente');
assert(formJs.includes('5 * 1024 * 1024'), 'limite de persistência de 5 MB ausente');
assert(pageJs.includes('showSubmissionError(error)'), 'erro de publicação não é exibido na página');
assert(pageJs.includes('`[data-step-error="${totalSteps}"]`'), 'feedback de erro não usa a etapa final de revisão');
assert(pageJs.includes('O serviço de análise não foi carregado'), 'controller de análise indisponível ainda pode falhar silenciosamente');

console.log('[test:post-service-upload-submit-contract] ok');
console.log('- 3 cards de upload com estado visual e status acessível');
console.log('- validação imediata e persistência alinhadas em 5 MB');
console.log('- falhas de publicação exibidas na etapa de revisão');
