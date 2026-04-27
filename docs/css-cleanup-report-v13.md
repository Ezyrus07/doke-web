# CSS Cleanup Report — v13

## Alvo

`assets/css/core/`

## O que mudou

Esta etapa reorganizou o core ativo sem alterar o contrato visual. O objetivo foi tirar arquivos grandes da raiz de `core/` e criar manifests mais legíveis.

## Nova organização ativa

```txt
assets/css/core/
  index.css
  tokens.css
  base.css
  layout.css
  components.css
  mobile-ui-standard.css

  layout/
    index.css
    shell.css
    topbar.css
    responsive-base.css
    responsive-shell.css

  ui/
    patterns.css
    global-components.css

  mobile/
    ui-standard.css
```

## Decisão técnica

Os arquivos antigos `layout-shell.css`, `layout-topbar.css`, `layout-responsive.css`, `patterns.css` e o conteúdo antigo de `components.css` foram preservados no projeto, mas o fluxo principal agora passa pelos novos manifests. Isso reduz risco de regressão porque não apaga legado ainda.

## Próxima etapa recomendada

Auditar candidatos a legado em `core/`, especialmente:

```txt
primitives.css
shell-home.css
surfaces.css
surface-normalize.css
border-consolidation.css
```

Esses arquivos não aparecem no fluxo principal de `core/index.css` e precisam ser classificados antes de arquivar/remover.
