# Ciclo Global 62 — Active Contracts Index

## Objetivo

Consolidar uma fonte única para identificar quais documentos realmente guiam o projeto Doke hoje, evitando que relatórios históricos, arquivos de estágio, correções antigas ou documentos ambíguos sejam usados como contrato ativo por engano.

## Alterações

- Criado `docs/ACTIVE-CONTRACTS-INDEX.md`.
- Criado `scripts/audit-active-contracts-index.js`.
- Adicionado `npm run audit:active-contracts-index` ao `package.json`.
- Gerado relatório em `docs/validation/global-cycle-62-active-contracts-index-report.json`.

## Decisão técnica

Nenhum documento foi movido ou removido neste ciclo. O objetivo foi apenas criar o índice canônico e a auditoria que protege esse índice.

## Critérios de aceite

- O índice referencia os contratos essenciais.
- O índice separa contratos ativos de histórico.
- A auditoria valida a existência dos documentos obrigatórios.
- Nenhum HTML/CSS/JS de produto é alterado.
- Nenhum `!important`, `style=""`, arquivo `fix`, `hotfix`, `stage` ou `final` é criado.

## Próximo passo recomendado

Ciclo Global 63 — atualizar `docs/README.md`/registro de documentação para apontar o novo índice como primeira fonte de consulta, sem mover arquivos ainda.
