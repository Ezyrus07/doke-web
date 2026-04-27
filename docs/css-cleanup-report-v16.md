# CSS Cleanup v16 — before-after-workers-preview

## Alvo

`assets/css/components/before-after-workers-preview.css`

## Mudança

O arquivo deixou de ser um monólito de aproximadamente 51 KB e passou a ser um manifesto que importa módulos menores por responsabilidade.

## Nova estrutura

```txt
assets/css/components/before-after-workers-preview.css
assets/css/components/before-after-workers-preview/
  before-after-shell.css
  before-after-media.css
  before-after-sidebar.css
  before-after-responsive.css
  before-after-single-media.css
  before-after-comments-v5.css
  workers-modal.css
  shared-publication-polish.css
  mobile-interaction-contract.css
  README.md
```

## Estratégia

A ordem da cascata foi preservada. Nenhuma regra visual foi removida nesta etapa. O objetivo foi tornar o componente auditável antes de qualquer deduplicação.

## Arquivo legado preservado

```txt
archive/css-legacy/components-v16/before-after-workers-preview.css
```

## Próximo passo recomendado

Auditar os módulos gerados e mover regras realmente globais para `ui-surface/` ou para contratos de card/mídia, mantendo apenas regras específicas de Workers e Antes/Depois nesta área.
