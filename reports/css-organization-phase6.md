# Fase 6 — Limpeza de nomes e organização CSS sem alterar comportamento

## Escopo executado

Esta fase fez um diff pequeno e controlado, limitado ao domínio `perfil.html`.

Objetivo técnico: trocar nomes de arquivos CSS com semântica de remendo por nomes baseados em responsabilidade real, sem alterar a ordem de cascata e sem apagar comportamento.

## Arquivos renomeados/reorganizados

| Antes | Depois | Motivo |
|---|---|---|
| `assets/css/pages/perfil-header-rail-parity.css` | `assets/css/pages/perfil/header-rail.css` | O arquivo não é uma "parity" genérica; ele controla o contrato de trilho/header específico do perfil. |
| `assets/css/pages/perfil/mobile-owner-media-polish.css` | `assets/css/pages/perfil/owner-media-mobile.css` | O arquivo não é um "polish" visual solto; ele define o contrato mobile da mídia do owner no perfil. |

## HTML alterado

`perfil.html` passou a carregar:

```html
<link rel="stylesheet" href="assets/css/pages/perfil/header-rail.css?v=20260601-profile-header-rail-v1">
<link rel="stylesheet" href="assets/css/pages/perfil/owner-media-mobile.css?v=20260601-owner-media-mobile-v1" />
```

## Garantias de não alteração visual intencional

- O conteúdo CSS dos arquivos foi preservado.
- A posição dos imports no `perfil.html` foi preservada.
- A ordem relativa de cascata foi preservada.
- Não houve mudança em shell, sidebar, header global, body ou wrappers globais.
- Não houve remoção de regras CSS.
- Não houve criação de arquivo `fix`, `hotfix`, `final`, `adjustment`, `match`, `parity`, `rescue` ou `polish`.

## Validação estática

- `assets/css/pages/perfil/header-rail.css`: 253 `{` e 253 `}`.
- `assets/css/pages/perfil/owner-media-mobile.css`: 24 `{` e 24 `}`.
- `node scripts/audit-desktop-shell-contracts.js`: passou.

Resultado:

```txt
Desktop base stability audit passed.
Pages checked: 10
```

## CSS suspeitos ainda presentes nas páginas obrigatórias

A limpeza não removeu estes arquivos porque eles têm escopo global ou impacto visual amplo. Eles precisam de validação Playwright antes de qualquer remoção/renomeação adicional.

| Página | CSS suspeitos ainda carregados |
|---|---|
| `index.html` | `home/tablet-final-authority.css`, `shell/ipad-safari-scroll-rescue.css` |
| `perfil.html` | `patterns/responsive-polish.css`, `shell/ipad-safari-scroll-rescue.css` |
| `pedidos.html` | `patterns/responsive-polish.css`, `pedidos/mobile-longterm-normalization.css`, `layout/professional-responsive-polish-contract.css`, `shell/ipad-safari-scroll-rescue.css` |
| `mensagens.html` | `patterns/responsive-polish.css`, `layout/professional-responsive-polish-contract.css`, `shell/ipad-safari-scroll-rescue.css` |
| `notificacoes.html` | `patterns/responsive-polish.css`, `layout/professional-responsive-polish-contract.css`, `shell/ipad-safari-scroll-rescue.css` |
| `comunidade.html` | `patterns/responsive-polish.css`, `shell/ipad-safari-scroll-rescue.css` |
| `resultados.html` | `shell/ipad-safari-scroll-rescue.css` |
| `detalhe-anuncio.html` | `layout/professional-responsive-polish-contract.css`, `shell/ipad-safari-scroll-rescue.css` |
| `ajuda.html` | `shell/ipad-safari-scroll-rescue.css` |

## Arquivos antigos que devem ser removidos no repositório

Como esta entrega é um pacote de arquivos alterados, a extração do ZIP não remove arquivos antigos automaticamente. Depois de aplicar os novos arquivos e validar, remova do repositório:

```txt
assets/css/pages/perfil-header-rail-parity.css
assets/css/pages/perfil/mobile-owner-media-polish.css
```

## Próximo passo recomendado

A próxima fase deve ser a auditoria do JavaScript de navegação interna:

- `assets/js/core/stable-shell-router.js`
- `assets/js/components/mobile-app-shell.js`
- inicializadores que rodam após troca de rota

Essa auditoria deve vir antes da correção do bug de scroll travado para evitar novo remendo.
