const fs = require('fs');
const vm = require('vm');
const path = require('path');

const source = fs.readFileSync(path.join(__dirname, '../assets/js/pages/detalhe-anuncio.js'), 'utf8');

if (!source.includes("numericPrice > 0")) throw new Error('Preço zero ainda pode ser exibido como valor monetário.');
if (!source.includes("return 'Sob orçamento'")) throw new Error('Fallback explícito Sob orçamento ausente.');
if (!source.includes("['budget', 'quote', 'sob_orcamento', 'sob orçamento']")) throw new Error('Modos de preço sob orçamento não estão protegidos.');

console.log('Detail ad budget price label contract: OK');
