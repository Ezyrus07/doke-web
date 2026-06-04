# Índice de contratos ativos

Este arquivo é o ponto de entrada para agentes humanos, ChatGPT, Codex e qualquer automação que trabalhar no Doke.

## Contratos obrigatórios

- `AGENTS.md`: regras práticas para alterações no projeto.
- `PROJECT-RULES.md`: princípios de organização, CSS, HTML e evolução futura.
- `docs/DOKE_AGENT_CONSTITUTION.md`: contrato operacional de alto nível para agentes.
- `docs/ARCHITECTURE.md`: mapa vivo da arquitetura frontend.
- `docs/CSS_AUTHORITY_MAP.md`: autoridade entre core, components, patterns e pages.
- `docs/GLOBAL-LAYOUT-CONTRACT.md`: autoridade de shell, header, rail, largura e scroll.
- `docs/DESIGN-SYSTEM-GUIDE.md`: tokens, componentes, ritmo visual e consistência.
- `docs/FRONTEND-GOVERNANCE.md`: processo de mudança e critérios de aceite.
- `docs/SURFACE-CONTRACT.md`: contrato de superfícies visuais, cards, modais e estados.
- `docs/BASELINE-VISUAL-APPROVED.md`: baseline visual que refatorações devem preservar.
- `docs/DATA-READY-CONTRACTS.md`: preparação para dados reais, renderers e controllers.
- `docs/VALIDATION.md`: comandos e matriz mínima de validação.

## Regra de precedência

Se houver conflito entre documento histórico e documento ativo, vence esta ordem:

1. `docs/DOKE_AGENT_CONSTITUTION.md`
2. `AGENTS.md`
3. `PROJECT-RULES.md`
4. contratos vivos em `docs/`
5. código runtime atual

Documentos de fase, relatórios gerados e arquivos em `reports/` não são fonte de verdade permanente.

## Política para novos documentos

Não criar novo documento permanente para cada etapa. Primeiro atualizar um contrato vivo existente. Só criar documento novo quando a responsabilidade não couber em nenhum contrato atual.
