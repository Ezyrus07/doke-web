# Frontend Stage 1 — limpeza e correções de overflow

## Escopo aplicado

- Movidos relatórios `RELATORIO-*.md` da raiz para `docs/reports/`.
- Removidos arquivos de raiz sem owner claro: `sedD9I9BO` e `teste.html`.
- Corrigida duplicação estrutural de `.service-card__tags` no `index.html`.
- Criado reforço no contrato compartilhado de cards para evitar texto vertical, sobreposição de CTA e overflow de metadados.
- Ajustado contrato de métricas/reviews do perfil para impedir labels quebrando letra por letra.
- Ajustado contrato de `mensagens.html` para melhorar largura da coluna azul, header do thread e densidade dos itens laterais.

## Arquivos funcionais alterados

- `index.html`
- `mensagens.html`
- `perfil.html`
- `assets/css/components/cards/card-grid-contract.css`
- `assets/css/components/internal/chat-workspace-contract.css`
- `assets/css/pages/mensagens.css`
- `assets/css/pages/perfil-reviews-page.css`

## Observação

Essa etapa não inicia migração para `src/` e não altera shell global. O objetivo foi cortar dívida óbvia e estabilizar componentes com owner correto antes da revisão responsiva ampla.
