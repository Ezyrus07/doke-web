const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'anunciar-servico.html'), 'utf8');
const js = fs.readFileSync(path.join(root, 'assets/js/pages/anunciar-servico.js'), 'utf8');

const expectedLimits = {
  adTitle: 70,
  specialty: 60,
  shortDescription: 180,
  fullDescription: 1200,
  initialPrice: 14,
  serviceRegion: 80,
  includedItems: 240,
  excludedItems: 240,
};

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

for (const [name, limit] of Object.entries(expectedLimits)) {
  const fieldPattern = new RegExp(`<(?:input|textarea)[^>]*name=["']${escapeRegExp(name)}["'][^>]*maxlength=["']${limit}["']`, 'i');
  if (!fieldPattern.test(html)) {
    throw new Error(`Campo ${name} deve declarar maxlength=${limit}.`);
  }
}

const countedFields = ['adTitle', 'specialty', 'shortDescription', 'fullDescription', 'serviceRegion', 'includedItems', 'excludedItems'];
for (const name of countedFields) {
  const fieldPattern = new RegExp(`<(?:input|textarea)[^>]*name=["']${escapeRegExp(name)}["'][^>]*data-count-source`, 'i');
  if (!fieldPattern.test(html)) {
    throw new Error(`Campo ${name} deve participar do contador compartilhado.`);
  }
}

const sourceCount = (html.match(/data-count-source/g) || []).length;
const valueCount = (html.match(/data-count-value/g) || []).length;
if (sourceCount !== countedFields.length || valueCount !== countedFields.length) {
  throw new Error(`Contadores inconsistentes: ${sourceCount} fontes e ${valueCount} valores.`);
}

if (!js.includes("root.querySelectorAll('[data-count-source]')")) {
  throw new Error('O controller deve suportar múltiplos contadores de caracteres.');
}
if (js.includes("root.querySelector('[data-count-source]')")) {
  throw new Error('O controller não pode voltar ao contrato de contador único.');
}
if (!js.includes("window.addEventListener('doke:service-edit-loaded'")) {
  throw new Error('O fluxo de edição precisa continuar reconciliando os contadores.');
}
if (!js.includes('updateCharacterCounts();')) {
  throw new Error('Os contadores precisam ser sincronizados no carregamento e reset do formulário.');
}

console.log('[test:post-service-character-limits-contract] ok');
console.log(`- ${Object.keys(expectedLimits).length} campos protegidos por maxlength`);
console.log(`- ${countedFields.length} campos com contador compartilhado`);
