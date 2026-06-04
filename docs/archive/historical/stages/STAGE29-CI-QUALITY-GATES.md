# Stage 29 — CI/CD Quality Gates

## Objetivo

Criar uma esteira mínima de qualidade para impedir que regressões estruturais voltem a entrar no projeto sem serem detectadas.

## Arquivos adicionados

- `.github/workflows/quality.yml`
- `.github/pull_request_template.md`
- `scripts/audit-quality-pipeline.js`
- `docs/QUALITY-GATES.md`
- `docs/STAGE29-CI-QUALITY-GATES.md`

## O que o workflow roda

1. Instala dependências com `npm ci`.
2. Executa `npm run audit:all`.
3. Executa `npm run audit:quality-pipeline`.
4. Instala Chromium do Playwright.
5. Executa E2E smoke tests.
6. Executa visual regression guards.
7. Sobe relatório Playwright em caso de falha.

## Por que isso importa

A partir desta etapa, a arquitetura deixa de depender apenas de disciplina manual. O projeto passa a ter bloqueios automáticos para:

- CSS depreciado;
- contratos visuais quebrados;
- separação mobile/desktop;
- ausência de baseline visual;
- ausência de scripts críticos;
- regressões detectáveis por Playwright.

## Observação

O workflow exige que o repositório tenha dependências instaláveis via `npm ci`. Se ainda não existir `package-lock.json`, gere com:

```bash
npm install
```

Depois commit o `package-lock.json`.
