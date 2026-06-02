# Correção — abertura de conversa no mobile em mensagens.html

## Causa raiz

No `assets/js/pages/mensagens.js`, o estado que abre a conversa em tela única era controlado por:

```js
const isCompactThreadViewport = () => window.innerWidth >= 561 && window.innerWidth <= 1023;
```

Isso deixava tablets abrirem a conversa, mas excluía telefones reais como iPhone em `390px`. Ao tocar em uma conversa no mobile, o script até chamava `renderThread(...)`, mas `setCompactThreadOpen(true)` calculava `open = false`. Sem esse estado, o CSS mantinha a lista visível e a conversa continuava oculta.

## Correção

Ajustado o breakpoint da interação para cobrir todos os viewports de tela única até tablet:

```js
const isCompactThreadViewport = () => window.innerWidth <= 1023;
```

Com isso, ao tocar em uma conversa no mobile, o script aplica corretamente:

- `.messages-app--thread-open` no root de mensagens;
- `data-messages-mode="thread"`;
- `.messages-thread-is-open` no `body`;
- `.messages-thread-is-open` no `html`.

## Arquivos alterados

- `assets/js/pages/mensagens.js`
- `tests/e2e/stable-shell-scroll-contract.spec.js`

## Validação executada

```bash
node -c assets/js/pages/mensagens.js
node -c tests/e2e/stable-shell-scroll-contract.spec.js
node scripts/audit-desktop-shell-contracts.js
node node_modules/@playwright/test/cli.js test tests/e2e/stable-shell-scroll-contract.spec.js --project=desktop-chrome --list
```

Resultados:

- `Desktop base stability audit passed.`
- `Pages checked: 10`
- `Total: 25 tests in 1 file`

## Teste adicionado

Adicionado teste Playwright para mobile `390x844` validando que tocar em `.message-item[data-message-id="painting"]` abre a conversa e aplica os estados esperados no `html`, `body` e root da página de mensagens.

## Riscos restantes

A execução runtime completa do Playwright não foi feita neste ambiente porque o browser não está disponível. Validar no iPhone real:

1. Abrir `mensagens.html`.
2. Tocar em qualquer conversa.
3. Confirmar que a tela da conversa abre.
4. Tocar em voltar dentro da conversa.
5. Confirmar que a lista volta.
