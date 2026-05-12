# Ciclo Global 25 — Service-card baseline gate

## Objetivo

Criar uma barreira de segurança antes de remover os `!important` sensíveis restantes de `assets/css/components/cards/service-card.css`.

Os ciclos anteriores reduziram grupos seguros do `service-card`, mas os `!important` restantes controlam geometria sensível: grid desktop, mídia, body/footer e layout mobile. Remover esse bloco sem baseline visual real pode quebrar `index.html`, `resultados.html` e `perfil.html`.

## Decisão técnica

Neste ciclo **não removemos CSS**.

Criamos uma auditoria que registra o estado atual e impede que a próxima etapa avance no escuro.

## Novo comando

```bash
npm run audit:service-card-baseline
```

## Arquivo criado

```txt
scripts/audit-service-card-baseline.js
```

A auditoria verifica:

- se `index.html`, `resultados.html` e `perfil.html` carregam o contrato de `service-card` via manifesto/import;
- se grids de cards carregam o pattern correto;
- se ações/favoritos têm import compatível;
- quantos `!important` sensíveis ainda existem no `service-card.css`;
- se há sinais mínimos de preparação data-ready nas páginas auditadas.

## Resultado atual

```txt
index.html: 6 CSS, 45 JS, 2 service-card elements, 3 grids, 2 data hooks
resultados.html: 6 CSS, 37 JS, 2 data hooks
perfil.html: 46 CSS, 38 JS, 2 data hooks
service-card.css: 34 !important restantes
```

## Distribuição dos `!important` restantes

```txt
desktop-card-layout: 5
desktop-media-sizing: 7
desktop-body-layout: 7
mobile-card-layout: 4
mobile-media-sizing: 6
mobile-body-layout: 5
```

## Critério de aceite

- auditoria `audit:service-card-baseline` passa;
- nenhuma alteração visual foi feita;
- nenhuma remoção agressiva de `!important` foi feita;
- o próximo ciclo só deve remover regras sensíveis com validação visual real.

## Próxima recomendação

Parar temporariamente a limpeza agressiva do `service-card.css` e avançar para outro contrato global com menor risco, ou preparar baseline visual real com screenshots antes/depois.

Próximos caminhos seguros:

1. `Ciclo Global 26 — data-ready hooks em cards/listas`, sem mudar visual;
2. `Ciclo Global 26 — visual baseline real do service-card`, se houver ambiente Playwright/screenshot estável;
3. `Ciclo Global 26 — imports duplicados seguros em páginas estáveis`.
