# Desktop Phase Entry Contract

## Status

Contrato de entrada para a próxima fase visual desktop. Este documento não declara desktop concluído; ele define condições mínimas para iniciar a validação visual com segurança.

## Critérios de entrada

- Manter `index.html` como baseline aprovado para densidade visual, rails, cards e ritmo.
- Não alterar shell, sidebar, header ou rail global para corrigir componente local sem prova de causa raiz.
- Rodar os gates globais antes de qualquer mudança visual ampla.
- Validar cada alteração em 1366x768, 820x1180 e 390x844 antes de consolidar.

## Guardrails

- Não usar `!important` como primeira solução.
- Não criar CSS universal para apagar variantes legítimas.
- Não remover CSS ativo sem prova de substituição e rollback definido.
- Preservar acessibilidade, áreas de toque e navegação por teclado.

## Próximo uso

Usar este contrato como gate antes de consolidar desktop/header/cards com browser real.
