# Visual QA Baseline

Esta pasta guarda o contrato de validação visual do Doke.

## Objetivo

Evitar regressões como:

- header mobile ficando sticky sem decisão de produto;
- input mobile/desktop duplicado ou sumido;
- desktop recebendo CSS mobile;
- sidebar desktop quebrando;
- cards explodindo de tamanho;
- bottom nav inconsistente;
- scroll duplo.

## Como usar

1. Rode o site localmente na raiz do projeto.
2. Rode `npm run visual:baseline` para gerar ou atualizar screenshots de referência.
3. Rode `npm run visual:qa` antes de continuar novas reformas visuais.
4. Se uma mudança visual for intencional, atualize a baseline e registre o motivo no PR/commit.

## Regra de governança

Mudança visual global só deve ser feita depois de passar por screenshots desktop e mobile das páginas principais.
