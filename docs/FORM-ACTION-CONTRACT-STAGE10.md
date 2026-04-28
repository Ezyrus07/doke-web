# Stage 10 — Form / Action Contract — Safe Revision

## Correção aplicada

A primeira versão do Stage 10 foi agressiva demais: ela aplicava seletores globais em desktop para `button`, `.btn`, botões de ícone, chips e campos. Isso podia reduzir símbolos, botões e controles que já tinham contratos próprios no desktop.

Esta revisão muda a estratégia:

- desktop não recebe normalização visual ampla;
- tamanhos, raios, largura e alvos de toque ficam restritos a `@media (max-width: 760px)`;
- foco acessível permanece global, mas sem alterar geometria;
- botões e ícones desktop voltam a ser controlados pelos arquivos originais de cada componente/topbar/card;
- mobile mantém alvo mínimo de toque e prevenção de zoom em inputs no iPhone.

## Arquivo oficial

```txt
assets/css/components/forms-actions/form-action-contract-stage10.css
```

## Regra daqui para frente

Não criar contratos globais com `button`, `.btn`, `.badge`, `input` ou `[class$="__close"]` fora de breakpoint mobile ou sem escopo explícito de componente.

Quando uma página desktop precisar de ajuste visual, o ajuste deve ficar no componente específico, não no contrato global de ações.
