# Correção — scroll vertical travado após DokeNavigate

Base utilizada: `dokee-web(155).zip`.

## Causa raiz

O problema vinha de estado transitório sobrevivendo entre rotas internas. A troca via roteador não é equivalente a um F5: o documento (`html`/`body`) continua vivo, então classes e estilos inline de overlays, modais, filtros, drawer, lightbox e estados de swap podiam permanecer após a troca de HTML.

O ponto mais grave encontrado no fallback de navegação (`assets/js/core/app.js`) era `PRESERVED_BODY_ATTRS = ["style"]`. Isso preservava `style` do `body` entre rotas. Se alguma página/modal deixasse `overflow`, `height`, `position` ou propriedades parecidas no `body`, a página seguinte herdava o bloqueio. Com F5, esse estado desaparecia, por isso o scroll voltava.

Também havia limpeza insuficiente de classes temporárias no `html`, especialmente classes como `is-media-lightbox-open`, `is-shell-swapping`, estados de overlay/drawer e outras que podem acionar regras CSS de `overflow: hidden`.

## Correção aplicada

### `assets/js/core/stable-shell-router.js`

- Expandido o contrato de classes transitórias removidas em cada navegação.
- A limpeza agora remove classes tanto de `document.documentElement` quanto de `document.body`.
- A limpeza de locks inline foi ampliada para `html`, `body`, `.app-shell`, `.page`, `.page__content` e `.page__content-inner`.
- Incluídas propriedades adicionais de trava: `bottom`, `touch-action`, `overscroll-behavior`, `overscroll-behavior-x` e `overscroll-behavior-y`.
- Adicionado `assertDocumentOwnsScroll(path)` para garantir que páginas normais voltem a permitir scroll do documento após a navegação.
- A limpeza roda no `resetScroll()` e também no `finally` da navegação.

### `assets/js/core/app.js`

- Removida preservação do atributo `style` do `body` entre rotas.
- Adicionada limpeza equivalente de classes transitórias e locks inline para o fallback/roteador legado.
- Adicionado `assertDocumentScrollContract()` para restaurar o scroll do documento em páginas que não são intencionalmente full-screen.
- A limpeza roda após sincronizar o body da nova rota, durante reset de scroll e no fechamento do ciclo de navegação.

## Arquivos alterados

- `assets/js/core/stable-shell-router.js`
- `assets/js/core/app.js`
- `tests/e2e/stable-shell-scroll-contract.spec.js`
- `reports/router-scroll-correction-20260601.md`

## Validação executada

Comandos executados no ambiente:

```bash
node -c assets/js/core/stable-shell-router.js
node -c assets/js/core/app.js
node scripts/audit-desktop-shell-contracts.js
node node_modules/@playwright/test/cli.js test tests/e2e/stable-shell-scroll-contract.spec.js --project=desktop-chrome --list
```

Resultado:

- Sintaxe JS válida.
- `Desktop base stability audit passed. Pages checked: 10`.
- Playwright listou 24 testes no arquivo de scroll.

## Teste Playwright reforçado

O teste de scroll agora também verifica:

- classes transitórias presas no `body`;
- classes transitórias presas no `html`;
- sequência real de navegação `index -> perfil -> pedidos -> mensagens -> resultados -> detalhe-anuncio -> ajuda`, sem voltar para F5 entre cada rota.

## Testes não executados

A execução runtime completa com browser não foi concluída neste ambiente porque o Chromium fica bloqueado pelo ambiente (`ERR_BLOCKED_BY_ADMINISTRATOR`). Execute localmente:

```bash
npm run test:router-scroll
npm run test:layout-contract
```

## Riscos restantes

- `mensagens.html` e `comunidade-interna.html` têm comportamento full-screen/intencionalmente interno. A correção não força scroll do documento nelas para não quebrar o layout de chat.
- Existem CSS legados com `overflow: hidden !important`; eles agora dependem menos de estado preso, mas ainda devem ser tratados em rodada futura de limpeza CSS.
