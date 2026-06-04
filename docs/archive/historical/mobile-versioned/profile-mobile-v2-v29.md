# Doke v29 — Perfil Mobile v2 híbrido

## Escopo
Aplicado em `meuperfil-page.css`, somente para `body[data-page="perfil"]` em telas até 720px.

## Decisão de arquitetura
A implementação não troca o bottom nav global nem cria um layout paralelo. Ela melhora densidade e acabamento do card principal usando as classes existentes:

- `.dp-card`
- `.dp-cover`
- `.dp-avatarWrap`
- `.dp-info`
- `.dp-stats`
- `.dp-actionsRow`
- `.dp-tabs`

## O que foi refinado
- capa mais baixa;
- avatar menor e mais premium;
- card do perfil mais compacto;
- estatísticas em faixa interna;
- botão principal preenchido e ações secundárias outline;
- tabs mobile mais leves;
- menor sobra final na página.

## O que não foi alterado
- desktop;
- JS de perfil;
- bottom nav global;
- estrutura HTML.
