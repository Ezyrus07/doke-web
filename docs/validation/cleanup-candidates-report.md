# Auditoria de limpeza do repositório Doke

Auditoria somente leitura. Nenhum arquivo foi removido ou movido.

Gerado em: 2026-05-26T00:30:51.220Z

## Resumo executivo

| Métrica | Valor |
|---|---:|
| Arquivos candidatos analisados | 840 |
| Tamanho total dos candidatos | 108.4 MB |
| Remoção potencial baixa fricção | 54.6 MB |
| Movimentação potencial para archive | 5.55 MB |
| Revisão manual potencial | 330.7 KB |
| Grupos de duplicados por hash | 14 |

## Distribuição por recomendação

| Recomendação | Arquivos |
|---|---:|
| remover | 107 |
| mover para archive | 31 |
| revisar manualmente | 15 |
| manter | 687 |

## Distribuição por risco

| Risco | Arquivos |
|---|---:|
| baixo | 637 |
| médio | 203 |
| alto | 0 |

## Candidatos prioritários

A tabela abaixo mostra os 80 candidatos mais relevantes. A lista completa está em `docs/validation/cleanup-candidates-report.csv` e `docs/validation/cleanup-candidates-report.json`.

| Caminho | Tamanho | Modificado | Git | Ref. HTML/CSS/JS | Script/teste | Regenerável | Recomendação | Risco | Justificativa |
|---|---:|---|---|---|---|---|---|---|---|
| reports/css-responsive-conflicts-before-cleanup.json | 24.6 MB | 2026-05-25 13:32:01 | não | não | não | sim | remover | baixo | Artefato gerado por auditoria em reports e não usado por teste. |
| reports/css-responsive-conflicts-after-cleanup.json | 24.5 MB | 2026-05-25 13:32:01 | não | não | não | sim | remover | baixo | Artefato gerado por auditoria em reports e não usado por teste. |
| reports/responsive-baseline-audit-before-card-contract.json | 2.06 MB | 2026-05-25 11:14:02 | não | não | não | sim | remover | baixo | Artefato gerado por auditoria em reports e não usado por teste. |
| component_audit_data.json | 1.36 MB | 2026-05-11 12:42:01 | sim | não | sim | sim | remover | baixo | JSON grande e stale de auditoria na raiz; scripts existentes já o tratam como artefato a eliminar, não como fonte ativa. |
| reports/responsive-baseline-audit-before-card-contract.csv | 776.3 KB | 2026-05-25 11:14:02 | não | não | não | sim | remover | baixo | Artefato gerado por auditoria em reports e não usado por teste. |
| reports/overflow-text-clipping-audit-before.json | 147.2 KB | 2026-05-25 13:20:50 | não | não | não | sim | remover | baixo | Artefato gerado por auditoria em reports e não usado por teste. |
| reports/overflow-text-clipping-audit-current.json | 126.5 KB | 2026-05-25 14:37:03 | não | não | não | sim | remover | baixo | Artefato gerado por auditoria em reports e não usado por teste. |
| reports/overflow-text-clipping-before-after.json | 117.6 KB | 2026-05-25 13:20:50 | não | não | não | sim | remover | baixo | Artefato gerado por auditoria em reports e não usado por teste. |
| reports/overflow-text-clipping-audit-after.json | 117.0 KB | 2026-05-25 13:20:50 | não | não | não | sim | remover | baixo | Artefato gerado por auditoria em reports e não usado por teste. |
| reports/responsive-baseline-audit-before-card-contract.md | 107.9 KB | 2026-05-25 11:14:02 | não | não | não | sim | remover | baixo | Artefato gerado por auditoria em reports e não usado por teste. |
| reports/overflow-text-clipping-audit-before.csv | 65.8 KB | 2026-05-25 13:20:50 | não | não | não | sim | remover | baixo | Artefato gerado por auditoria em reports e não usado por teste. |
| docs/validation/css-stage12-inventory.json | 65.1 KB | 2026-04-29 16:04:34 | sim | sim | não | sim | remover | baixo | Relatório de auditoria parece regenerável e não é usado por scripts. |
| reports/overflow-text-clipping-audit-current.csv | 59.4 KB | 2026-05-25 14:37:03 | não | não | não | sim | remover | baixo | Artefato gerado por auditoria em reports e não usado por teste. |
| reports/overflow-text-clipping-audit-after.csv | 54.9 KB | 2026-05-25 13:20:50 | não | não | não | sim | remover | baixo | Artefato gerado por auditoria em reports e não usado por teste. |
| reports/overflow-text-clipping-audit-before.md | 48.6 KB | 2026-05-25 13:20:50 | não | não | não | sim | remover | baixo | Artefato gerado por auditoria em reports e não usado por teste. |
| reports/overflow-text-clipping-audit-current.md | 45.0 KB | 2026-05-25 14:37:03 | não | não | não | sim | remover | baixo | Artefato gerado por auditoria em reports e não usado por teste. |
| reports/header-responsive-parity-before-after.json | 42.7 KB | 2026-05-25 12:04:11 | não | não | não | sim | remover | baixo | Artefato gerado por auditoria em reports e não usado por teste. |
| reports/overflow-text-clipping-audit-after.md | 41.9 KB | 2026-05-25 13:20:50 | não | não | não | sim | remover | baixo | Artefato gerado por auditoria em reports e não usado por teste. |
| docs/validation/css-contract-static-report.json | 38.8 KB | 2026-04-29 16:04:34 | sim | sim | não | sim | remover | baixo | Relatório de auditoria parece regenerável e não é usado por scripts. |
| docs/reports/frontend-stage5-import-graph.txt | 24.7 KB | 2026-05-02 14:38:11 | sim | não | não | sim | remover | baixo | Relatório de auditoria parece regenerável e não é usado por scripts. |
| sedD9I9BO | 16.0 KB | 2026-05-01 12:35:47 | sim | não | não | não | remover | baixo | Arquivo temporário gerado por sed; só aparece em documentação/auditoria histórica, não como dependência runtime. |
| reports/header-rail-alignment-before-after.csv | 11.9 KB | 2026-05-25 17:22:09 | não | não | não | sim | remover | baixo | Artefato gerado por auditoria em reports e não usado por teste. |
| reports/header-responsive-parity-before-after.csv | 11.7 KB | 2026-05-25 12:04:11 | não | não | não | sim | remover | baixo | Artefato gerado por auditoria em reports e não usado por teste. |
| docs/reports/frontend-stage5-radius-literals.csv | 11.3 KB | 2026-05-02 14:38:11 | sim | não | não | sim | remover | baixo | Relatório de auditoria parece regenerável e não é usado por scripts. |
| docs/reports/frontend-stage5-important-map.csv | 10.1 KB | 2026-05-02 14:38:11 | sim | não | não | sim | remover | baixo | Relatório de auditoria parece regenerável e não é usado por scripts. |
| docs/reports/frontend-stage5-shell-touch-map.csv | 9.84 KB | 2026-05-02 14:38:11 | sim | não | não | sim | remover | baixo | Relatório de auditoria parece regenerável e não é usado por scripts. |
| docs/validation/css-stage12-inventory.md | 9.30 KB | 2026-04-29 16:04:34 | sim | sim | não | sim | remover | baixo | Relatório de auditoria parece regenerável e não é usado por scripts. |
| reports/detail-index-visual-parity-followup.json | 7.32 KB | 2026-05-25 16:00:00 | não | não | não | sim | remover | baixo | Artefato gerado por auditoria em reports e não usado por teste. |
| reports/header-responsive-parity-before-after.md | 6.19 KB | 2026-05-25 12:04:11 | não | não | não | sim | remover | baixo | Artefato gerado por auditoria em reports e não usado por teste. |
| docs/validation/global-cycle-80-product-pages-suite-report.json | 5.84 KB | 2026-05-12 17:30:58 | sim | não | não | sim | remover | baixo | Relatório de auditoria parece regenerável e não é usado por scripts. |
| docs/reports/frontend-stage5-css-debt-controlled.md | 5.38 KB | 2026-05-02 14:38:11 | sim | não | não | sim | remover | baixo | Relatório de auditoria parece regenerável e não é usado por scripts. |
| reports/detalhe-anuncio-index-card-cleanup-before-after.json | 4.46 KB | 2026-05-25 15:21:58 | não | não | não | sim | remover | baixo | Artefato gerado por auditoria em reports e não usado por teste. |
| docs/validation/global-cycle-109-114-structural-debt-suite-report.json | 4.33 KB | 2026-05-12 18:22:33 | sim | não | não | sim | remover | baixo | Relatório de auditoria parece regenerável e não é usado por scripts. |
| reports/detail-index-visual-parity-followup.md | 3.77 KB | 2026-05-25 16:00:00 | não | não | não | sim | remover | baixo | Artefato gerado por auditoria em reports e não usado por teste. |
| docs/validation/surface-contract-report.md | 3.70 KB | 2026-04-29 16:04:34 | sim | sim | não | sim | remover | baixo | Relatório de auditoria parece regenerável e não é usado por scripts. |
| reports/responsive-priority-fix-before-after.md | 3.62 KB | 2026-05-25 14:38:30 | não | não | não | sim | remover | baixo | Artefato gerado por auditoria em reports e não usado por teste. |
| reports/css-responsive-conflicts-cleanup-before-after.md | 3.56 KB | 2026-05-25 13:32:01 | não | não | não | sim | remover | baixo | Artefato gerado por auditoria em reports e não usado por teste. |
| docs/reports/frontend-stage2-tokens-and-contracts.md | 3.46 KB | 2026-05-02 14:03:03 | sim | não | não | sim | remover | baixo | Relatório de auditoria parece regenerável e não é usado por scripts. |
| docs/validation/global-cycle-90-product-pages-suite-report.json | 3.44 KB | 2026-05-12 17:36:36 | sim | não | não | sim | remover | baixo | Relatório de auditoria parece regenerável e não é usado por scripts. |
| reports/detail-publications-two-column-after.json | 3.38 KB | 2026-05-25 16:40:15 | não | não | não | sim | remover | baixo | Artefato gerado por auditoria em reports e não usado por teste. |
| reports/detalhe-anuncio-index-card-cleanup-before-after.md | 3.36 KB | 2026-05-25 15:21:58 | não | não | não | sim | remover | baixo | Artefato gerado por auditoria em reports e não usado por teste. |
| reports/professional-responsive-polish-before-after.md | 3.19 KB | 2026-05-25 13:58:58 | não | não | não | sim | remover | baixo | Artefato gerado por auditoria em reports e não usado por teste. |
| reports/detail-index-visual-parity-followup.csv | 2.98 KB | 2026-05-25 16:00:00 | não | não | não | sim | remover | baixo | Artefato gerado por auditoria em reports e não usado por teste. |
| docs/reports/frontend-stage4-responsive-page-audit.md | 2.72 KB | 2026-05-02 14:25:02 | sim | não | não | sim | remover | baixo | Relatório de auditoria parece regenerável e não é usado por scripts. |
| docs/reports/frontend-stage5-orphan-css-candidates.txt | 2.51 KB | 2026-05-02 14:38:11 | sim | não | não | sim | remover | baixo | Relatório de auditoria parece regenerável e não é usado por scripts. |
| reports/detail-index-card-visual-parity.md | 2.28 KB | 2026-05-25 15:45:00 | não | não | não | sim | remover | baixo | Artefato gerado por auditoria em reports e não usado por teste. |
| reports/responsive-card-contract-before-after.md | 2.25 KB | 2026-05-25 11:14:02 | não | não | não | sim | remover | baixo | Artefato gerado por auditoria em reports e não usado por teste. |
| docs/reports/frontend-stage6-chat-contract-important-reduction.md | 2.21 KB | 2026-05-02 14:47:28 | sim | não | não | sim | remover | baixo | Relatório de auditoria parece regenerável e não é usado por scripts. |
| docs/reports/frontend-stage7-messages-regression-fix.md | 2.08 KB | 2026-05-02 14:52:04 | sim | não | não | sim | remover | baixo | Relatório de auditoria parece regenerável e não é usado por scripts. |
| reports/mobile-card-distribution-fix.json | 2.02 KB | 2026-05-25 19:33:55 | não | não | não | sim | remover | baixo | Artefato gerado por auditoria em reports e não usado por teste. |
| reports/detalhe-anuncio-index-card-cleanup-before-after.csv | 1.83 KB | 2026-05-25 15:21:58 | não | não | não | sim | remover | baixo | Artefato gerado por auditoria em reports e não usado por teste. |
| reports/overflow-text-clipping-before-after.md | 1.76 KB | 2026-05-25 13:20:50 | não | não | não | sim | remover | baixo | Artefato gerado por auditoria em reports e não usado por teste. |
| reports/responsive-priority-fix-before-after.json | 1.71 KB | 2026-05-25 14:38:30 | não | não | não | sim | remover | baixo | Artefato gerado por auditoria em reports e não usado por teste. |
| docs/reports/relatorio-largura-header.md | 1.65 KB | 2026-05-02 13:51:09 | sim | não | não | sim | remover | baixo | Relatório de auditoria parece regenerável e não é usado por scripts. |
| reports/css-responsive-conflicts-cleanup-before-after.csv | 1.60 KB | 2026-05-25 13:32:01 | não | não | não | sim | remover | baixo | Artefato gerado por auditoria em reports e não usado por teste. |
| docs/validation/global-cycle-73-adicionar-cartao-boundary-report.json | 1.60 KB | 2026-05-12 17:26:39 | sim | não | não | sim | remover | baixo | Relatório de auditoria parece regenerável e não é usado por scripts. |
| docs/validation/global-cycle-3-components-base-report.md | 1.55 KB | 2026-05-11 21:51:43 | sim | não | não | sim | remover | baixo | Relatório de auditoria parece regenerável e não é usado por scripts. |
| reports/responsive-priority-fix-before-after.csv | 1.53 KB | 2026-05-25 14:38:30 | não | não | não | sim | remover | baixo | Artefato gerado por auditoria em reports e não usado por teste. |
| docs/validation/global-cycle-71-finalizar-pedido-boundary-report.json | 1.49 KB | 2026-05-12 17:26:39 | sim | não | não | sim | remover | baixo | Relatório de auditoria parece regenerável e não é usado por scripts. |
| docs/reports/frontend-stage3-search-filter-contract.md | 1.47 KB | 2026-05-02 14:08:11 | sim | não | não | sim | remover | baixo | Relatório de auditoria parece regenerável e não é usado por scripts. |
| reports/header-rail-alignment-before-after.md | 1.42 KB | 2026-05-25 17:22:09 | não | não | não | sim | remover | baixo | Artefato gerado por auditoria em reports e não usado por teste. |
| docs/reports/relatorio-largura-header-v3.md | 1.35 KB | 2026-05-02 13:51:09 | sim | não | não | sim | remover | baixo | Relatório de auditoria parece regenerável e não é usado por scripts. |
| reports/mobile-card-distribution-fix.md | 1.30 KB | 2026-05-25 19:33:55 | não | não | não | sim | remover | baixo | Artefato gerado por auditoria em reports e não usado por teste. |
| docs/reports/relatorio-largura-header-v2.md | 1.26 KB | 2026-05-02 13:51:09 | sim | não | não | sim | remover | baixo | Relatório de auditoria parece regenerável e não é usado por scripts. |
| docs/reports/relatorio-header-scroll-v4.md | 1.24 KB | 2026-05-02 13:51:09 | sim | não | não | sim | remover | baixo | Relatório de auditoria parece regenerável e não é usado por scripts. |
| docs/validation/mobile-app-shell-static-report.md | 1.21 KB | 2026-05-01 14:13:38 | sim | não | não | sim | remover | baixo | Relatório de auditoria parece regenerável e não é usado por scripts. |
| docs/reports/frontend-stage1-cleanup-and-overflow.md | 1.12 KB | 2026-05-02 13:51:08 | sim | não | não | sim | remover | baixo | Relatório de auditoria parece regenerável e não é usado por scripts. |
| docs/validation/global-cycle-147-native-navigation-stability-report.json | 1.03 KB | 2026-05-12 19:51:29 | sim | não | não | sim | remover | baixo | Relatório de auditoria parece regenerável e não é usado por scripts. |
| docs/reports/frontend-stage1-manifest.txt | 1.00 KB | 2026-05-02 13:51:09 | sim | não | não | sim | remover | baixo | Relatório de auditoria parece regenerável e não é usado por scripts. |
| reports/detail-publications-two-column-fix.md | 1004 B | 2026-05-25 16:40:15 | não | não | não | sim | remover | baixo | Artefato gerado por auditoria em reports e não usado por teste. |
| reports/mobile-card-distribution-fix.csv | 944 B | 2026-05-25 19:33:55 | não | não | não | sim | remover | baixo | Artefato gerado por auditoria em reports e não usado por teste. |
| reports/detail-index-card-visual-parity.csv | 887 B | 2026-05-25 15:45:00 | não | não | não | sim | remover | baixo | Artefato gerado por auditoria em reports e não usado por teste. |
| docs/validation/stage36-mobile-base-stability-report.md | 867 B | 2026-05-01 17:57:04 | sim | não | não | sim | remover | baixo | Relatório de auditoria parece regenerável e não é usado por scripts. |
| docs/reports/relatorio-header-scroll-v5.md | 806 B | 2026-05-02 13:51:09 | sim | não | não | sim | remover | baixo | Relatório de auditoria parece regenerável e não é usado por scripts. |
| docs/validation/global-cycle-9-media-card-ownership-report.md | 711 B | 2026-05-11 21:53:04 | sim | não | não | sim | remover | baixo | Relatório de auditoria parece regenerável e não é usado por scripts. |
| docs/reports/relatorio-header-agenda-nav-v11.md | 688 B | 2026-05-02 13:51:08 | sim | não | não | sim | remover | baixo | Relatório de auditoria parece regenerável e não é usado por scripts. |
| reports/overflow-text-clipping-before-after.csv | 674 B | 2026-05-25 13:20:50 | não | não | não | sim | remover | baixo | Artefato gerado por auditoria em reports e não usado por teste. |
| docs/reports/relatorio-header-nav-v10.md | 651 B | 2026-05-02 13:51:09 | sim | não | não | sim | remover | baixo | Relatório de auditoria parece regenerável e não é usado por scripts. |
| docs/reports/relatorio-sidebar-collapsed-v12.md | 603 B | 2026-05-02 13:51:09 | sim | não | não | sim | remover | baixo | Relatório de auditoria parece regenerável e não é usado por scripts. |
| docs/reports/frontend-stage2-manifest.txt | 597 B | 2026-05-02 14:03:03 | sim | não | não | sim | remover | baixo | Relatório de auditoria parece regenerável e não é usado por scripts. |

## Atenção especial solicitada

- `component_audit_data.json`: remover / risco baixo. JSON grande e stale de auditoria na raiz; scripts existentes já o tratam como artefato a eliminar, não como fonte ativa. Tamanho: 1.36 MB. Versionado: sim.
- `sedD9I9BO`: remover / risco baixo. Arquivo temporário gerado por sed; só aparece em documentação/auditoria histórica, não como dependência runtime. Tamanho: 16.0 KB. Versionado: sim.
- `docs/validation/*`: 200 candidatos, 11.8 MB.
- `docs/reports/*`: 29 candidatos, 89.2 KB.
- `docs/visual-baseline/*`: 27 candidatos, 5.53 MB.
- `archive/css-legacy/*`: 15 candidatos, 330.7 KB.

## Duplicados por hash

| Grupo | Arquivos |
|---:|---|
| 1 | `assets/css/components/before-after-workers-preview/mobile-interaction-contract.css`<br>`assets/css/pages/comunidade/mobile-interaction-contract.css`<br>`assets/css/pages/mensagens/mobile-interaction-contract.css`<br>`assets/css/pages/notificacoes/mobile-interaction-contract.css` |
| 2 | `assets/img/auth/carpinteira.png`<br>`assets/img/auth/pintor-hero.png`<br>`assets/img/workers/worker-eletrica.png`<br>`assets/img/workers/worker-pintura.png` |
| 3 | `assets/img/auth/carpenter-cutout.png`<br>`assets/img/auth-carpenter-cutout.png`<br>`assets/img/workers/worker-limpeza.png` |
| 4 | `assets/img/auth/marceneira-hero.png`<br>`assets/img/auth/pintor.png`<br>`assets/img/workers/worker-cozinha.png` |
| 5 | `assets/css/components/avatar.css`<br>`assets/css/components/identity/avatar.css` |
| 6 | `assets/css/components/index.css`<br>`assets/css/components/profile/index.css` |
| 7 | `assets/css/components/navigation/mobile-bottom-nav-system.css`<br>`assets/css/components/navigation/mobile-bottom-nav.css` |
| 8 | `assets/css/pages/home/index.css`<br>`assets/css/pages/index.css` |
| 9 | `assets/img/auth/painter-cutout.png`<br>`assets/img/auth-painter-cutout.png` |
| 10 | `assets/js/core/supabase-config.example.js`<br>`assets/js/supabase-config.example.js` |
| 11 | `docs/CRITICAL-PAGE-SNAPSHOT-CHECKLIST.md`<br>`docs/GLOBAL-CYCLE-53-CRITICAL-PAGE-SNAPSHOT-CHECKLIST.md` |
| 12 | `reports/overflow-text-clipping-audit-current.csv`<br>`reports/overflow-text-clipping-audit.csv` |
| 13 | `reports/overflow-text-clipping-audit-current.json`<br>`reports/overflow-text-clipping-audit.json` |
| 14 | `reports/overflow-text-clipping-audit-current.md`<br>`reports/overflow-text-clipping-audit.md` |

## Política de limpeza proposta

### O que fica na raiz

- `package.json`, arquivos de configuração, HTMLs de entrada, diretórios `assets/`, `auth/`, `backend/`, `src/`, `scripts/`, `tests/`, `supabase/`, `.github/` e documentação ativa mínima.
- Nenhum relatório gerado, snapshot ou JSON de auditoria deve ficar solto na raiz.

### O que vai para `docs/archive`

- Documentos históricos de validação que não são contratos ativos.
- Relatórios antigos de ciclos já encerrados, quando ainda forem úteis para rastreabilidade.
- Baselines visuais antigos que não são consumidos por teste automatizado.

### O que pode ser removido após aprovação

- Arquivos temporários sem extensão/nome estranho, como `sedD9I9BO`.
- JSON/CSV/MD regeneráveis por script e não referenciados por testes.
- Relatórios em `reports/` e `docs/validation/` que são saída de auditorias e não fonte canônica.

### O que deve ser mantido por testes

- Snapshots e baselines usados por `tests/`, `scripts/` ou `package.json`.
- `reports/responsive-index-baseline.json` enquanto os contratos responsivos dependem dele.
- Arquivos em allowlist documentada.

### MB potencialmente liberados

- Remoção direta recomendada: **54.6 MB**.
- Movimentação para archive: **5.55 MB**.
- Revisão manual antes de qualquer ação: **330.7 KB**.

## Observações de segurança

- Esta auditoria não apaga arquivos.
- A detecção de referência é textual; arquivos usados dinamicamente podem não ser capturados.
- Qualquer arquivo com risco médio deve passar por revisão manual antes de remoção.
- Para limpar de verdade, crie um PR separado com commits pequenos: `archive`, depois `remove`, depois `test`.