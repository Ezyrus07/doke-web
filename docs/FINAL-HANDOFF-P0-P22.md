# Doke Web — Handoff final P0–P22

## Estado da rodada

Esta rodada consolidou o projeto de P0 até P22, com foco em contratos globais, consistência visual, shell responsivo, formulários, selects, overlays, fluxo operacional e guards de regressão.

## Princípio de fechamento

A partir deste ponto, não é recomendado continuar com lotes cegos. O próximo trabalho deve partir de prints reais do Live Server.

## Entregas principais

### Visual/componentes

- Fechamento de CTA/card em `detalhe-anuncio` e perfil.
- Contratos de cards e rails revisados.
- Botões de fechar centralizados em autoridade global.
- Inputs/search padronizados.
- Campos de formulário migrados para `.doke-input`, `.doke-textarea`, `.doke-select`.
- Auth forms migrados para contrato global.
- Selects custom de `tornar-profissional` e `anunciar-servico` migrados para `DokeUiSelect`.

### Shell/header/responsivo

- Header/shell/mobile auditados.
- Overflow de tablet vertical corrigido.
- Contrato anti-regressão de tablet vertical adicionado.
- Scripts operacionais bloqueantes corrigidos com `defer`.

### Fluxo operacional

- Teste de pedidos/chat corrigido para refletir fluxo real:
  - pedido criado;
  - conversa bloqueada;
  - aceite profissional;
  - conversa liberada;
  - mensagem enviada;
  - notificações geradas.

### Auditorias/guards

- `audit:global-css-design-system` passa.
- `audit:global-structural-debt` passa.
- `audit:operational-script-loading` passa.
- `test:tablet-shell-overflow-contract` passa.
- `audit:release-candidate` adicionado como guard final estático.

## Dívidas conhecidas que não devem ser resolvidas cegamente

| Dívida | Motivo para não mexer agora |
|---|---|
| Muitos `!important` | Já mapeados; remoção exige baseline visual por página. |
| CSS possivelmente morto | Pode ser usado por JS, router ou estados dinâmicos. |
| Seletores duplicados em CSS ativo | Exige validação visual e ordem de cascade. |
| Screenshots via Live Server | Ambiente atual bloqueou `127.0.0.1`; validar localmente. |

## Próximo passo correto

1. Abrir o ZIP completo no Live Server.
2. Testar os breakpoints do checklist `docs/FINAL-LIVE-SERVER-QA-CHECKLIST.md`.
3. Enviar prints apenas dos problemas reais.
4. Corrigir cirurgicamente por causa raiz.

## Comandos recomendados antes de entregar para teste manual

```bash
npm run audit:release-candidate
npm run audit:global-structural-debt
npm run audit:global-css-design-system
npm run test:tablet-shell-overflow-contract
npm run test:operational-flow-contract
npm run test:component-consistency-contract
npm run test:card-cta-contract
npm run audit:agent-governance
```
