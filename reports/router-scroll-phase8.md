# Fase 8 — Correção do scroll travado via DokeNavigate

## Base usada

`dokee-web(152).zip`.

## Causa raiz identificada

A navegação via `stable-shell-router` trocava o `.app-shell` e sincronizava `html/body`, mas não fazia uma higienização completa dos estados transitórios de rota. Classes de overlay/drawer/modal/filtro/busca podiam sobreviver à troca de HTML e algumas dessas classes controlam `overflow`, `height`, `position` ou travas visuais. Isso explica a diferença entre:

- carregar a página diretamente por URL/F5; e
- chegar nela via `window.DokeNavigate(...)` sem reload completo.

Também havia uma diferença importante de timing: scripts novos da rota destino eram carregados antes do `replaceShell`, ou seja, scripts autoexecutáveis podiam inicializar olhando para o DOM antigo. Isso aumenta a chance de estados incompletos ou inicializações divergentes entre navegação direta e navegação interna.

## Correção aplicada

### `assets/js/core/stable-shell-router.js`

1. Adicionado inventário explícito de classes transitórias de rota:
   - overlays;
   - drawers;
   - modais;
   - filtros;
   - buscas;
   - sidebar aberta;
   - estados de mensagens/pedidos/resultados que não devem atravessar rota.

2. Criado `clearTransientRouteState()` para:
   - remover classes temporárias do `body`;
   - limpar travas inline de scroll em `html` e `body`;
   - fechar scrims/backdrops conhecidos;
   - ocultar modais abertos herdados da rota anterior.

3. `syncBodyContract()` agora chama a higienização após aplicar o contrato do `body` da nova rota.

4. `resetScroll()` agora higieniza estados antes e depois do `requestAnimationFrame`, evitando que inicializadores assíncronos deixem scroll preso.

5. `ensureScripts(nextDoc)` foi movido para depois de `replaceShell(nextDoc, path)`, para scripts novos inicializarem contra o DOM novo, não contra o DOM antigo.

6. `window.DokeNavigate()` agora retorna a Promise da navegação, permitindo testes e chamadas controladas aguardarem a conclusão real.

## Teste Playwright criado

### `tests/e2e/stable-shell-scroll-contract.spec.js`

Valida as rotas:

- `/perfil.html`
- `/pedidos.html`
- `/mensagens.html`
- `/notificacoes.html`
- `/resultados.html`
- `/detalhe-anuncio.html`
- `/ajuda.html`

Em:

- desktop 1366x768
- tablet 820x1180
- mobile 390x844

Para cada rota, compara dois cenários:

1. carregamento direto por URL;
2. navegação interna a partir de `index.html` via `window.DokeNavigate(route)`.

Checagens principais:

- `scrollWidth <= clientWidth + 1`;
- `html/body` não podem manter `overflow` inline;
- `html/body` não podem bloquear `overflowY`;
- classes transitórias de overlay/drawer/modal/filtro não podem ficar presas;
- quando o documento é rolável, `window.scrollTo(0, 500)` precisa alterar `window.scrollY`.

## Script npm

Adicionado:

```bash
npm run test:router-scroll
```

Comando interno:

```bash
node node_modules/@playwright/test/cli.js test tests/e2e/stable-shell-scroll-contract.spec.js --project=desktop-chrome
```

## Validação executada neste ambiente

Executado com sucesso:

```bash
node -c assets/js/core/stable-shell-router.js
node scripts/audit-desktop-shell-contracts.js
node node_modules/@playwright/test/cli.js test tests/e2e/stable-shell-scroll-contract.spec.js --project=desktop-chrome --list
```

Resultado do audit:

```txt
Desktop base stability audit passed.
Pages checked: 10
```

Resultado do `--list`:

```txt
Total: 21 tests in 1 file
```

A execução real no browser não pôde ser concluída aqui porque o Chromium do Playwright não está instalado neste ambiente:

```txt
Executable doesn't exist at /home/oai/.cache/ms-playwright/chromium_headless_shell-1223/...
```

Na sua máquina, rode:

```bash
npx playwright install
npm run test:router-scroll
```

## Arquivos alterados

- `assets/js/core/stable-shell-router.js`
- `package.json`
- `tests/e2e/stable-shell-scroll-contract.spec.js`
- `reports/router-scroll-phase8.md`
