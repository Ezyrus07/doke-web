# Ciclo Global 24 — Service Card Important Risk Map

## Objetivo

Mapear os `!important` restantes em `assets/css/components/cards/service-card.css` antes de remover regras sensíveis.

## Resultado

- Total restante: **34** ocorrências de `!important`.
- Decisão: **não remover mais neste ciclo**.

## Motivo

As regras restantes controlam geometria sensível do card:

- layout desktop do card;
- sizing da mídia desktop;
- grid/body desktop;
- layout mobile do card;
- sizing da mídia mobile;
- grid/body mobile.

Remover isso sem screenshot antes/depois pode quebrar `index.html`, `resultados.html` e `perfil.html`.

## Distribuição

- desktop-card-layout: 5
- desktop-media-sizing: 7
- desktop-body-layout: 7
- mobile-card-layout: 4
- mobile-media-sizing: 6
- mobile-body-layout: 5
- unknown: 0

## Próximo passo recomendado

**Ciclo Global 25 — baseline visual do service-card** em:

1. `index.html`
2. `resultados.html`
3. `perfil.html`

Depois disso, remover os próximos `!important` por grupo pequeno, começando por desktop card layout ou mobile body layout, somente se a comparação visual confirmar equivalência.

## Critérios de aceite para o próximo ciclo

- Não alterar HTML provisório.
- Não mexer em shell/sidebar/header/body.
- Gerar screenshots ou checklist visual antes/depois.
- Não remover mídia/grid sem validação visual.
- Manter card preparado para dados reais, sem acoplar CSS a conteúdo mockado.
