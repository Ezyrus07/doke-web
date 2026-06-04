# Stage 11 — Responsive Interaction Guard

## Objetivo

Adicionar uma camada leve de JS responsivo sem alterar contratos visuais de desktop.

## Arquivos criados

- `assets/js/ui/responsive-interaction-guard-stage11.js`
- `assets/css/core/responsive-runtime-stage11.css`

## O que faz

- Calcula `--doke-js-vh` com base na altura real da viewport.
- Calcula `--doke-runtime-bottom-nav-height` no mobile para melhorar o espaço seguro inferior.
- Marca `html.doke-js-mobile` e `html.doke-js-desktop` sem alterar layout desktop.
- Define `type="button"` em botões sem tipo para evitar submits acidentais.
- Garante `aria-label="Fechar"` em botões de fechamento já existentes.
- Sincroniza estado ativo do bottom nav pelo arquivo HTML atual.
- Melhora foco de regiões horizontais no mobile.

## Escopo de segurança

- CSS novo fica protegido por `@media (max-width: 760px)`.
- JS não muda largura, altura, grid, card, topbar ou ícone de desktop.
- JS não substitui lógica existente de modal, filtro, preview de vídeo ou comentários.

## Próxima etapa sugerida

Stage 12 deve ser limpeza de CSS legado/duplicado com inventário, sem remoção cega.
