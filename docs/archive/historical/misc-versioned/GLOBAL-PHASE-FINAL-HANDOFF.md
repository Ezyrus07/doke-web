# Handoff final da fase global estrutural

## Status

A fase global estrutural está pronta para transição controlada para a Fase Desktop, com dívida técnica conhecida e mapeada. Isso não significa que o projeto está visualmente finalizado, nem que o responsivo foi iniciado.

## O que está pronto

- Contratos documentais principais estão indexados e auditáveis.
- Páginas principais têm contrato mínimo de estado `loading / empty / error / ready`.
- Fluxos transacionais principais têm data boundary/controller mínimo.
- Scripts externos das páginas auditadas foram normalizados para evitar bloqueio quando dentro do escopo das auditorias.
- Drawer mobile compartilhado foi migrado para ownership mais coerente em `assets/js/ui/mobile-drawer.js`.
- Comandos globais de auditoria estão registrados em `docs/GLOBAL-AUDIT-COMMANDS.md`.

## Pendências globais conhecidas

- Volume alto de `!important` fora de `service-card` ainda existe e não deve ser removido em massa.
- Volume de imports CSS ainda é alto e deve ser reduzido por página/componente durante a Fase Desktop.
- Alguns estados de ação ainda precisam de refinamento visual quando cada HTML desktop for aprovado.
- Páginas com HTML/CSS provisório continuam provisórias; os contratos adicionados não tornam o visual atual definitivo.
- Redução real de JS deve continuar por responsabilidade e runtime, não por exclusão automática.

## Guardrails para a Fase Desktop

- Desktop primeiro; responsivo depois do desktop aprovado.
- Uma página por vez.
- Baseline antes/depois para qualquer alteração visual relevante.
- Não mexer em shell, sidebar, header, body ou wrappers globais para corrigir problema local.
- Não criar CSS paralelo de correção rápida.
- Regras compartilhadas devem ir para `components` ou `patterns`; CSS de página deve ficar restrito ao layout específico.
- Não usar `!important` novo nem `style=""` como solução visual.

## Próximo passo recomendado

Iniciar a Fase Desktop por página, começando por diagnóstico técnico e baseline da página escolhida. A recomendação técnica é começar por uma página marketplace de alta influência visual, mas a entrada deve ser feita com plano de arquivos, critérios de aceite e rollback claro.
