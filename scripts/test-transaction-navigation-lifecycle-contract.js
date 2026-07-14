'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(ROOT, file), 'utf8');
const failures = [];
const assert = (condition, message) => { if (!condition) failures.push(message); };

const ordersHtml = read('pedidos.html');
const ordersJs = read('assets/js/pages/pedidos.js');
const localOrdersJs = read('assets/js/pages/pedidos-local-orders.js');
const messagesHtml = read('mensagens.html');
const messagesJs = read('assets/js/pages/mensagens.js');
const paymentHtml = read('pagamento-profissional.html');
const paymentJs = read('assets/js/pages/pagamento-profissional.js');
const paymentCss = read('assets/css/pages/pagamento-profissional.css');
const hydrationJs = read('assets/js/core/page-hydration.js');
const routerJs = read('assets/js/core/stable-shell-router.js');

const scriptIndex = (html, src) => html.indexOf(src);

assert(/data-state-boundary="pedidos"[^>]*data-view-state="loading"[^>]*aria-busy="true"/.test(ordersHtml), 'pedidos deve iniciar em loading/busy.');
assert(/data-orders-hydration-skeleton/.test(ordersHtml), 'pedidos deve manter skeleton estrutural.');
assert(/data-orders-hydration-ready[^>]*hidden/.test(ordersHtml), 'conteúdo real de pedidos deve iniciar oculto.');
assert(scriptIndex(ordersHtml, 'assets/js/core/session.js') < scriptIndex(ordersHtml, 'assets/js/services/account-access-service.js'), 'session deve carregar antes do guard em pedidos.');
assert(scriptIndex(ordersHtml, 'assets/js/services/account-access-service.js') < scriptIndex(ordersHtml, 'assets/js/pages/pedidos.js'), 'guard deve carregar antes do controller de pedidos.');
assert(/accountAccess/.test(ordersJs) && /access\.guardPage/.test(ordersJs), 'pedidos deve executar o guard autenticado compartilhado.');
assert(/hydration\?\.mark\('auth'\)/.test(ordersJs), 'pedidos deve liberar auth somente após allow.');
assert(/hydrateLocalOrders\(\{ force: true, accessGranted: true \}\)/.test(ordersJs), 'renderer de pedidos deve receber autorização explícita.');
assert(/var accessGranted = false/.test(localOrdersJs), 'renderer local deve iniciar bloqueado.');
assert(/if \(!accessGranted \|\| !user \|\| !user\.id\) return Promise\.resolve\(\[\]\)/.test(localOrdersJs), 'renderer local não deve consultar dados antes do guard.');
assert(/return render\(Object\.assign\(\{ force: true \}/.test(localOrdersJs), 'DokeHydrateLocalOrders deve devolver a Promise de hidratação.');
assert(!/window\.location\.href\s*=\s*['"]mensagens\.html/.test(localOrdersJs), 'pedidos não deve usar location.href para abrir conversa.');
assert(/'\/pedidos\.html': \['DokeInitOrders'\]/.test(routerJs), 'router deve possuir uma única autoridade de inicialização de pedidos.');

assert(/data-state-boundary="mensagens"[^>]*data-view-state="loading"[^>]*aria-busy="true"/.test(messagesHtml), 'mensagens deve iniciar em loading/busy.');
assert(/data-messages-hydration-skeleton(?![^>]*hidden)/.test(messagesHtml), 'skeleton de mensagens deve estar visível no primeiro frame útil.');
assert(/data-messages-hydration-ready hidden/.test(messagesHtml), 'conteúdo real de mensagens deve iniciar oculto.');
assert(scriptIndex(messagesHtml, 'assets/js/core/session.js') < scriptIndex(messagesHtml, 'assets/js/services/account-access-service.js'), 'session deve carregar antes do guard em mensagens.');
assert(scriptIndex(messagesHtml, 'assets/js/services/account-access-service.js') < scriptIndex(messagesHtml, 'assets/js/pages/mensagens.js'), 'guard deve carregar antes do controller de mensagens.');
assert(/hydrateAuthorizedMessages/.test(messagesJs) && /access\.guardPage/.test(messagesJs), 'mensagens deve usar guard autenticado antes da hidratação local.');
assert(/accountAuthorized = true;\s*hydration\?\.mark\('auth'\);\s*refreshLocalConversationSurface/.test(messagesJs), 'mensagens só deve hidratar conversas depois do allow.');
assert(!/window\.DokeHomeDrawer[^;]+;\s*hydrateLocalConversations\(root\)/s.test(messagesJs), 'mensagens não pode hidratar conversas antes do guard.');
assert(/bindDocumentLifecycle/.test(messagesJs), 'listeners transacionais de mensagens devem possuir cleanup de rota.');

assert(/data-state-boundary="pagamento"[^>]*data-view-state="loading"[^>]*aria-busy="true"/.test(paymentHtml), 'pagamento deve iniciar em loading/busy.');
assert(/data-payment-hydration-skeleton/.test(paymentHtml), 'pagamento deve possuir skeleton estrutural.');
assert(/data-payment-hydration-ready hidden/.test(paymentHtml), 'checkout real deve iniciar oculto.');
assert(/data-payment-document-preloader/.test(paymentHtml), 'pagamento deve declarar splash seletivo da rota.');
assert(scriptIndex(paymentHtml, 'assets/js/core/page-hydration.js') < scriptIndex(paymentHtml, 'assets/js/core/stable-shell-router.js'), 'page-hydration deve carregar antes do router em pagamento.');
assert(scriptIndex(paymentHtml, 'assets/js/core/session.js') < scriptIndex(paymentHtml, 'assets/js/services/account-access-service.js'), 'session deve carregar antes do guard em pagamento.');
assert(scriptIndex(paymentHtml, 'assets/js/services/account-access-service.js') < scriptIndex(paymentHtml, 'assets/js/pages/pagamento-profissional.js'), 'guard deve carregar antes do controller de pagamento.');
assert(/DokePageHydration\?\.create/.test(paymentJs) && /waitFor: \['dom', 'auth', 'payment-context'\]/.test(paymentJs), 'pagamento deve separar DOM, auth e contexto financeiro.');
assert(/accountAccess\.guardPage/.test(paymentJs), 'pagamento deve executar guard autenticado.');
assert(/assertValidPaymentContext/.test(paymentJs) && /Cobrança válida não encontrada/.test(paymentJs), 'pagamento deve falhar fechado sem cobrança válida.');
assert(!/status: 'context-fallback'/.test(paymentJs), 'pagamento não deve revelar defaults quando o contexto falha.');
assert(/function setPaymentOperationState/.test(paymentJs), 'pagamento deve possuir estado operacional separado.');
assert(!/experience\.states\.set\(root/.test(paymentJs), 'pending operacional não deve alterar o lifecycle da página.');
assert(!/root\.setAttribute\('aria-busy'[^\n]+submitting/.test(paymentJs), 'pending operacional não deve marcar a página inteira como busy.');
assert(!/setTimeout\([^)]*(?:500|650|850)/s.test(paymentJs), 'pagamento não deve usar delay artificial para sincronizar operação.');
assert(!/confirmPaymentFlow\((?:120|650)\)/.test(paymentJs), 'confirmação financeira deve começar sem atraso artificial.');
assert(/'\/pagamento-profissional\.html': Object\.freeze/.test(hydrationJs), 'page-hydration deve registrar o contrato do checkout.');
assert(/'\/pagamento-profissional\.html',/.test(routerJs), 'checkout deve participar da barreira do stable shell.');
assert(/setSkeletonHidden/.test(hydrationJs) && /aria-hidden', 'true'/.test(hydrationJs), 'skeletons devem permanecer ocultos para leitores de tela.');
assert(/prefers-reduced-motion:\s*reduce/.test(paymentCss), 'skeleton do checkout deve respeitar reduced motion.');

if (failures.length) {
  console.error('Transaction navigation lifecycle contract: FAIL');
  failures.forEach((failure) => console.error('- ' + failure));
  process.exit(1);
}

console.log('Transaction navigation lifecycle contract: PASS');
