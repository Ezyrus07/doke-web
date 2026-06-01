# Correção: vazamento de estado de scroll ao sair de mensagens.html

## Causa raiz

`mensagens.html` funciona como uma rota de aplicativo/chat e registra estado runtime próprio em `html`, `body` e variáveis CSS de `documentElement`.

O problema permanecia porque a rota de mensagens também deixava listeners vivos após a troca interna de HTML. Em especial:

- `window.resize` de `mensagens.js` podia voltar a aplicar `messages-thread-is-open` em `html/body` depois que o `.app-shell` da página já tinha sido substituído.
- As variáveis runtime `--messages-shell-sidebar-width` e `--messages-app-inline-size` ficavam no `documentElement` após sair da rota.
- O fallback de `assets/js/core/app.js` preservava `style` do `body`, permitindo que locks inline de scroll fossem herdados por páginas seguintes.

Com reload por F5 o documento nasce limpo, por isso o problema desaparecia.

## Correção

- `stable-shell-router.js` agora dispara cleanup antes de trocar a rota, remove estados temporários também do `html`, limpa variáveis runtime de mensagens e limpa locks inline em superfícies de scroll.
- `app.js` deixou de preservar `style` do `body` entre rotas e ganhou o mesmo contrato defensivo para o fallback de shell swap.
- `mensagens.js` passou a expor `window.DokeCleanupMessages()` e a se limpar em `doke:route-leaving`.
- O listener de resize de mensagens agora se remove se a página atual não for mais `mensagens` ou se o root antigo não estiver mais conectado.
- O sincronizador de métricas do workspace de mensagens também se remove ao sair da rota.

## Arquivos alterados

- `assets/js/core/stable-shell-router.js`
- `assets/js/core/app.js`
- `assets/js/pages/mensagens.js`
- `tests/e2e/stable-shell-scroll-contract.spec.js`

## Validação executada

- `node -c assets/js/core/stable-shell-router.js`
- `node -c assets/js/core/app.js`
- `node -c assets/js/pages/mensagens.js`
- `node scripts/audit-desktop-shell-contracts.js`
- `node node_modules/@playwright/test/cli.js test tests/e2e/stable-shell-scroll-contract.spec.js --project=desktop-chrome --list`

O teste Playwright runtime precisa ser executado localmente porque este ambiente não possui navegador Playwright funcional.

## Roteiro manual recomendado

1. Abrir `index.html`.
2. Navegar para `mensagens.html`.
3. Entrar em uma conversa se estiver em tablet/mobile.
4. Navegar para `perfil.html`, `pedidos.html`, `resultados.html` e `ajuda.html` sem F5.
5. Confirmar que a barra de scroll aparece e `window.scrollTo(0, 500); window.scrollY > 0` funciona nas páginas roláveis.
