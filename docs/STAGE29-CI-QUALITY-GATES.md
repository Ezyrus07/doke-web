# Stage 29 — CI/CD Quality Gates

## Objetivo

Validar diretamente a árvore Git do candidato com gates estáticos, E2E determinístico e 105 guards visuais estruturais, mantendo integrações instáveis em uma lane diagnóstica explícita.

## Autoridades

- `.github/workflows/quality.yml`: gates bloqueantes.
- `.github/workflows/e2e-diagnostic.yml`: execução diagnóstica não bloqueante.
- `config/e2e-lanes.json`: partição única dos specs.
- `scripts/audit-e2e-lanes.js`: integridade da partição.
- `scripts/run-e2e-lane.js`: executor e relatório de cada lane.
- `tests/visual/visual-regression.manifest.json`: matriz visual versionada.

## Sequência bloqueante

1. Instalar dependências com `npm ci`.
2. Executar auditorias estáticas e de governança.
3. Auditar a partição E2E.
4. Executar a lane E2E bloqueante.
5. Executar os 105 guards visuais estruturais, com captura por página/viewport e sem confundir baseline pixel desatualizada com quebra estrutural.
6. Publicar relatórios e evidências vinculados a `github.sha`.

Não há `continue-on-error` nos gates bloqueantes, agregador ambíguo ou geração dinâmica de testes no runner.

## Diagnóstico

O workflow diagnóstico executa os specs classificados como dependentes de staging, contas reais ou integrações ainda não estabilizadas. O comando preserva o resultado no relatório JSON e no resumo do GitHub Actions mesmo quando a falha não bloqueia o PR.

## Plataforma visual

Os baselines oficiais foram produzidos no Windows; por isso o job visual usa `windows-latest`. A lane E2E bloqueante permanece em Ubuntu por não depender de snapshots de plataforma.

## Rollback

Reverter o commit do candidato restaura workflow, partição e contratos anteriores em conjunto. Não restaurar os workflows temporários do PR #5, pois eles reconstruíam material fora da árvore Git validada.
