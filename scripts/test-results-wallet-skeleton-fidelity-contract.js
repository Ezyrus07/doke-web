const fs = require('fs');
const assert = require('assert');

const read = (file) => fs.readFileSync(file, 'utf8');
const results = read('resultados.html');
const resultsCss = read('assets/css/pages/results/page-hydration-states.css');
const wallet = read('carteira.html');
const walletCss = read('assets/css/pages/carteira.css');

assert(results.includes('data-results-searchbox aria-label="Buscar resultados"'), 'Results search must remain visible during hard-load hydration.');
assert(!results.includes('data-results-searchbox data-results-hydration-ready hidden'), 'Results search must not be hidden behind data hydration.');
assert(!results.includes('results-hydration-skeleton__search'), 'Results skeleton must not duplicate the static search control.');
assert(!results.includes('results-hydration-skeleton__scope'), 'Results skeleton must not duplicate static scope controls.');
assert(results.includes('results-hydration-skeleton__provider'), 'Results cards must mirror provider anatomy.');
assert(results.includes('results-hydration-skeleton__count'), 'Results summary must reserve count geometry.');
assert(resultsCss.includes('flex: 0 0 min(84vw, 330px)'), 'Mobile result skeleton must mirror the horizontal card rail.');

assert(wallet.includes('wallet-hydration-skeleton__hero'), 'Wallet skeleton must mirror the wallet hero.');
assert(wallet.includes('wallet-hydration-skeleton__transactions'), 'Wallet skeleton must mirror transaction rows.');
assert(wallet.includes('wallet-hydration-skeleton__side'), 'Wallet skeleton must mirror supporting side panels.');
assert(!wallet.includes('doke-page-hydration-skeleton--dashboard'), 'Generic dashboard skeleton must be removed from wallet.');
assert(walletCss.includes('.wallet-hydration-skeleton__layout'), 'Wallet-specific skeleton layout CSS must exist.');
assert(walletCss.includes('grid-template-columns: minmax(0, 1fr) minmax(280px, 360px)'), 'Wallet skeleton must mirror the desktop content split.');

console.log('Results and wallet skeleton fidelity contract: PASS');
