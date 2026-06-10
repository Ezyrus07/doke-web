# CSS Cleanup Stage 45 — Comunidade

## Escopo
- `comunidade.html`
- `comunidade-interna.html`

## Objetivo
Remover dependências diretas de contratos antigos de shell/header/rail/tablet/mobile e zerar `!important` ativo nessas duas páginas.

## Resultado
```json
[
  {
    "html": "comunidade.html",
    "direct_css": 26,
    "active_css": 90,
    "active_important": 0
  },
  {
    "html": "comunidade-interna.html",
    "direct_css": 24,
    "active_css": 77,
    "active_important": 0
  }
]
```

## Total global de !important em assets/css
`10629`

## CSS com chaves desbalanceadas
`0`

## Arquivos alterados
- `assets/css/pages/comunidade-interna.css`
- `comunidade-interna.html`
- `comunidade.html`
