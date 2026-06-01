# Mensagens — contrato de saída de rota e scroll do documento

## Causa raiz

O problema foi isolado em `mensagens.html`: ao entrar nessa rota e navegar para outra página via roteador interno, estados de tela cheia/chat podiam permanecer vivos fora da página de mensagens.

Os estados envolvidos eram:

- `messages-thread-is-open` no `body` e no `html`.
- `messages-chat-is-focused`.
- `is-messages-header-search-open`.
- variáveis runtime no `html`: `--messages-shell-sidebar-width` e `--messages-app-inline-size`.
- `style` preservado pelo roteador legado em `assets/js/core/app.js`.

Como `mensagens.html` usa layout de app full-screen com `overflow: hidden` intencional dentro da própria rota, qualquer vazamento de estado após a troca de HTML fazia outras páginas herdarem comportamento parecido com documento travado. Com F5 o navegador recriava o documento e o scroll voltava, confirmando que era estado residual de rota, não responsividade da página destino.

## Correção

- Adicionado contrato explícito de saída da rota `/mensagens.html`.
- `stable-shell-router.js` agora dispara `doke:route-leaving` antes de trocar rota e limpa estados transitórios de mensagens no `html`, `body` e root antigo da página.
- `app.js` recebeu a mesma proteção para o fallback de navegação interna.
- `app.js` deixou de preservar o atributo `style` do `body` entre rotas.
- `mensagens.js` agora expõe `window.DokeCleanupMessages()` para limpar os estados próprios da página quando ela é abandonada.
- O teste Playwright de scroll ganhou um cenário específico: `index -> mensagens -> perfil -> pedidos -> resultados`, sem F5 entre as rotas.

## Arquivos alterados

- `assets/js/core/stable-shell-router.js`
- `assets/js/core/app.js`
- `assets/js/pages/mensagens.js`
- `tests/e2e/stable-shell-scroll-contract.spec.js`

## Validação estática executada

```bash
node -c assets/js/core/stable-shell-router.js
node -c assets/js/core/app.js
node -c assets/js/pages/mensagens.js
node scripts/audit-desktop-shell-contracts.js
node node_modules/@playwright/test/cli.js test tests/e2e/stable-shell-scroll-contract.spec.js --project=desktop-chrome --list
```

Resultado:

- `Desktop base stability audit passed.`
- `Pages checked: 10`
- `Total: 24 tests in 1 file`

## Validação runtime pendente

O ambiente atual não executa o browser do Playwright. Validar localmente com:

```bash
npm run test:router-scroll
npm run test:layout-contract
```

## Risco restante

`mensagens.html` ainda possui CSS full-screen com `overflow: hidden` intencional. A correção não remove esse comportamento, apenas impede que ele vaze para outras páginas após navegação interna.
