# Global Phase Final Handoff

## Status

A fase global está pronta para transição controlada para validação visual desktop, com dívida conhecida documentada. Não há declaração de conclusão visual ampla sem screenshots locais.

## O que está pronto

- Contratos globais de componentes foram aplicados em lotes pequenos e auditáveis.
- Estados globais de página, loading, empty e error estão mapeados nas páginas principais.
- Duplicações claras de renderer e referências obsoletas foram reduzidas.
- Gates de governança e design system podem ser executados como baseline de segurança.

## Pendências globais conhecidas

- Validar screenshots reais em 1366x768, 820x1180 e 390x844.
- Reduzir CSS ativo de alto risco apenas após comparação visual.
- Refinar estados de ação/submit em páginas com fluxo real.
- Conferir header, rail, cards compostos e drawers com browser local.

## Guardrails para a Fase Desktop

- Não mexer no `index.html` baseline sem evidência visual.
- Não fazer padronização cega entre componentes semanticamente diferentes.
- Não remover classes locais antes de confirmar consumidores JS/CSS.
- Cada alteração deve ter rollback por família.

## Próximo passo recomendado

Instalar dependências locais, rodar Playwright/Live Server e corrigir divergências comprovadas por screenshot e estilo computado.
