# Router CSS lifecycle — mensagens.html scroll leak

Base: dokee-web(156).zip

## Causa raiz

A falha persistia mesmo após limpar classes e estilos inline porque o roteador estável (`assets/js/core/stable-shell-router.js`) só adicionava CSS da rota destino, mas não removia CSS da rota anterior.

Ao entrar em `mensagens.html`, vários CSS específicos de chat/mensagens eram carregados no `<head>`. Ao sair via `DokeNavigate`, o `.app-shell` era trocado, mas esses stylesheets continuavam ativos. Como `mensagens.html` usa layout full-screen/chat, esses contratos podiam continuar afetando `html`, `body`, `.app-shell`, `.page` e `.page__content` nas páginas seguintes. Com F5, o navegador recriava o documento apenas com os CSS da página atual, por isso o scroll voltava.

## Correção

Foi adicionado um ciclo de vida de CSS ao `stable-shell-router.js`:

- coleta os stylesheets esperados da rota destino;
- adiciona CSS ausente antes da troca;
- após `replaceShell(nextDoc, path)`, remove stylesheets do projeto (`/assets/css/`) que não existem na rota destino;
- remove também preload de CSS de rota antiga marcado como `data-doke-style-hint` quando não pertence à rota destino.

A correção não usa reload completo, não usa `!important`, não substitui o `body` inteiro e não cria CSS novo.

## Arquivos alterados

- `assets/js/core/stable-shell-router.js`
- `tests/e2e/stable-shell-scroll-contract.spec.js`
- `reports/router-css-lifecycle-messages-scroll.md`

## Teste reforçado

O teste `tests/e2e/stable-shell-scroll-contract.spec.js` agora verifica que, fora de `mensagens.html` e `comunidade-interna.html`, não permanecem ativos stylesheets de:

- `assets/css/pages/mensagens/*`
- `assets/css/patterns/chat-screen-fill.css`
- `assets/css/components/internal/chat-workspace-contract.css`

## Validação executada

- `node -c assets/js/core/stable-shell-router.js`
- `node -c assets/js/core/app.js`
- `node scripts/audit-desktop-shell-contracts.js`
- `node node_modules/@playwright/test/cli.js test tests/e2e/stable-shell-scroll-contract.spec.js --project=desktop-chrome --list`

Resultado:

- audit desktop passou;
- 24 testes Playwright foram listados corretamente.

## Validação não executada

O browser Playwright completo não foi executado neste ambiente. Rodar localmente:

```bash
npm run test:router-scroll
npm run test:layout-contract
```

## Riscos restantes

Se alguma página depender intencionalmente de CSS de mensagens sem declarar o link no próprio HTML, esse CSS será removido ao navegar. Isso é desejável do ponto de vista arquitetural: a página destino deve declarar suas próprias dependências.
