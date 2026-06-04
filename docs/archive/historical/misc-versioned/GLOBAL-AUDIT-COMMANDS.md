# Global audit commands

Este arquivo registra os comandos de auditoria usados para fechar a fase global estrutural sem iniciar reforma visual, desktop ou responsivo.

## Baseline documental

```bash
npm run audit:active-contracts-index
npm run audit:docs-primary-index
```

## Produto e páginas principais

```bash
npm run audit:product-pages
```

## Dívida estrutural global

```bash
npm run audit:global-structural-debt
```

## CSS e design system

```bash
npm run audit:global-css-design-system
```

## Data-ready e estados

```bash
npm run audit:global-data-ready-states
npm run audit:global-state-completion
```

## Fechamento global anterior

```bash
npm run audit:global-completion
```

## Gate final da fase global

```bash
npm run audit:global-final-readiness
```

## Regras de uso

- Não usar estes comandos como autorização para redesign automático.
- Não iniciar responsivo antes do desktop HTML/CSS aprovado.
- Não remover `!important` ou consolidar imports CSS sem baseline visual específico.
- Não considerar dívida conhecida como bloqueio absoluto para a Fase Desktop quando a gate final declarar `passed-with-known-debt`.
