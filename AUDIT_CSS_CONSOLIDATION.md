# Auditoria CSS - Relatório Consolidado

**Data:** 9 de Junho de 2026
**Status:** CRÍTICA - Dívida técnica em 15 principais áreas

---

## 🚨 Achados Críticos

### **150 `!important` Rules Distribuídas em 3 Arquivos**

| Arquivo                            | Count   | Status     |
| ---------------------------------- | ------- | ---------- |
| `responsive-layout-guards.css`     | 48      | Stage 14   |
| `remaining-pages.css`              | 35      | Stage 8    |
| `marketplace-responsive-stack.css` | 67      | Phase 4    |
| **TOTAL**                          | **150** | ⚠️ CRÍTICA |

**Raiz:** 3 estágios de refatoração sem consolidação entre eles.

---

## 📊 TOP 15 Consolidações Necessárias

### 1. **[CRÍTICA]** Autoridade de Largura de Página em 7 Camadas

- **Problema:** Variáveis `--doke-shared-page-width`, `--doke-current-page-rail`, `--doke-header-rail`, `--doke-page-rail`
- **Arquivos:** `tokens.css`, `page-responsive-contract.css`, `app-header.css` (+ 4 mais)
- **Impacto:** Difícil de manter, fácil criar bugs
- **Solução:** Unificar em `tokens.css`, remover fallbacks desnecessários

### 2. **[CRÍTICA]** 3 Arquivos Competindo por Controle Responsivo

- **Problema:** `responsive-layout-guards.css`, `remaining-pages.css`, `marketplace-responsive-stack.css` fazem overrides similares
- **Count:** 150 `!important` distribuídos
- **Solução:** Consolidar em arquivo único: `responsive-mobile-tablet-contract.css`

### 3. **[ALTA]** 14 Breakpoints Inconsistentes em 20+ Arquivos

- **Problema:** 360px, 420px, 520px, 560px, 640px, 760px, 820px, 900px, 980px, 1024px, 1080px, 1120px, 1180px, 1200px...
- **Solução:** Criar `core/breakpoints.css` com definição única

### 4. **[ALTA]** app-shell.css em Duas Localizações

- **Problema:** `pages/app-shell.css` é só bridge para `components/shell/app-shell.css`
- **Solução:** Remover arquivo de bridge, clarificar autoridade

### 5. **[ALTA]** 16 Arquivos de 'home' Poderiam Ser 5-6

- **Arquivos:**
  - `tablet-shell-rail.css` (100 lines)
  - `tablet-safari-layout.css` (2.500 lines!!!)
  - `tablet-responsive-layout.css` (1.800 lines)
  - `home-overlays.css` (50 lines)
  - `home-refresh.css` (30 lines)
  - `home-ux-popovers.css` (40 lines)
- **Consolidação:** `home-tablet.css` + `home.css`
- **Redução:** 70% dos arquivos

### 6. **[ALTA]** Variáveis CSS em 3 Namespaces Diferentes

- **Problema:**
  - `--doke-*` (tokens.css)
  - `--responsive-layout-*` (responsive-layout-guards.css)
  - `--stage8-*` (remaining-pages.css)
- **Solução:** Unificar namespace em `tokens.css`

### 7. **[ALTA]** Página Configurações com 3 Subpastas Competindo

- **Arquivos:** `configuracoes.css`, `mobile-settings-index.css`, `mobile-header-drawer.css`
- **Consolidação:** Todos em `configuracoes.css` com seções @media claras

### 8. **[MÉDIA]** Grid Pattern Repetido 50+ Vezes

- **Padrão:** `grid-template-columns: repeat(2, minmax(0, 1fr))`
- **Localização:** 15+ arquivos
- **Solução:** Criar `core/grid-utilities.css` com variáveis CSS

### 9. **[MÉDIA]** Header Height em 5 Arquivos Diferentes

- **Arquivos:** `app-header.css`, `internal-page-header.css`, `internal-shell.css`, `app-topbar.css`, + páginas
- **Solução:** Criar `app-header-contract.css`

### 10. **[MÉDIA]** Sidebar Width: 5 Valores Diferentes

- **Valores:** 260px, 280px, 320px, 360px, 382px (sem coordenação)
- **Solução:** Criar `rail-contract.css`

### 11. **[MÉDIA]** `overflow: hidden|auto|scroll` em 20+ Lugares

- **Padrão:** Adicionado para "consertar" bugs, não remover conflitos
- **Princípio AGENTS.md:** "Corrija a causa raiz, não o sintoma"

### 12. **[MÉDIA]** `min-width: 0` e `min-height: 0` Repetidos 40+ Vezes

- **Indicativo:** Problemas em sizing de flex/grid
- **Solução:** Revisar arquitetura de flex/grid

### 13. **[MÉDIA]** `height: 100dvh` vs `height: 100%` Sem Contrato

- **Problema:** Uso inconsistente em configuracoes.css e outras páginas
- **Solução:** Criar `height-contract.css`

### 14. **[MÉDIA]** `display: grid` ⬌ `display: flex` Alternando

- **Localização:** `tablet-responsive-layout.css`, `tablet-safari-layout.css`
- **Problema:** Modelo de layout muda por breakpoint, risco de bugs

### 15. **[BAIXA]** Especificidade Escalação com `body.page-shell` + `!important`

- **Padrão:** `body.payment-page-shell .payment-summary { position: static !important; }`
- **Princípio:** Remover conflito base em vez de sobrescrever

---

## 📁 Estrutura Atual vs. Recomendada

### Estrutura Atual (Problemas)

```
assets/css/
├── core/
│   ├── base.css
│   ├── layout.css → imports layout/index.css
│   ├── tokens.css (240+ variáveis)
│   ├── responsive-*.css
│   └── ui/
├── components/
│   ├── shell/ (app-shell.css CANONICO)
│   ├── layout/
│   └── ... (20+ folders)
├── pages/
│   ├── app-shell.css (BRIDGE ONLY - redundante!)
│   ├── home/ (16 arquivos!)
│   ├── configuracoes/ (3 subpastas)
│   ├── perfil/
│   └── ... (30+ files)
└── patterns/
    ├── responsive-layout-guards.css (48 !important)
    ├── remaining-pages.css (35 !important)
    ├── marketplace-responsive-stack.css (67 !important)
    └── ... (13 mais)
```

### Estrutura Recomendada

```
assets/css/
├── core/
│   ├── base.css (HTML resets)
│   ├── tokens.css (Design system unificado)
│   ├── breakpoints.css (Unified media queries)
│   ├── layout-contract.css (Page width, gutter)
│   ├── header-contract.css (Header heights)
│   ├── rail-contract.css (Sidebar widths)
│   ├── grid-utilities.css (Common grid patterns)
│   └── height-contract.css (Viewport vs content)
├── components/
│   ├── shell/ (CANONICAL - app-shell, header, nav)
│   ├── layout/ (Cards, containers, sections)
│   ├── ui/ (Buttons, forms, etc)
│   └── internal/ (Internal page components)
├── pages/
│   ├── home.css (consolidado)
│   ├── perfil.css
│   ├── pedidos.css
│   └── ... (1 file per page)
└── patterns/
    ├── responsive-mobile-tablet.css (consolidado)
    ├── service-card-grid.css
    └── ... (shared patterns ONLY)
```

---

## 📈 Estimativas de Impacto

| Métrica                 | Atual                     | Esperado  | Redução |
| ----------------------- | ------------------------- | --------- | ------- |
| Total CSS Files         | 87                        | 55-60     | 30-35%  |
| `!important` Rules      | 150                       | 10-20     | 85-90%  |
| Bundle Size             | 100%                      | 70-80%    | 20-30%  |
| Media Query Duplication | 14 breakpoints × 20 files | 1 arquivo | 95%     |
| maintainability         | ⚠️ Difícil                | ✅ Fácil  | 🔼 Alto |

---

## 🗺️ Plano de Implementação (10-15 dias)

### **Fase 1: Fundação (2-3 dias)** - Consolidações #1, #4

1. Resolver conflitos de autoridade
2. Unificar width/page contracts

### **Fase 2: Reduce !important (3-4 dias)** - Consolidações #2, #3, #6

1. Consolidar 3 arquivos de override
2. Unificar breakpoints
3. Unificar variáveis CSS

### **Fase 3: Páginas (2-3 dias)** - Consolidações #5, #7, #8

1. Consolidar home/ de 16 → 5-6 arquivos
2. Consolidar configuracoes/ de 3 → 1
3. Extrair grid utilities

### **Fase 4: Cleanup (2-3 dias)** - Consolidações #9, #10, #12, #13, #14

1. Criar header-contract
2. Criar rail-contract
3. Revisar min-width/min-height
4. Revisar display switches

### **Fase 5: Auditoria Final (1-2 dias)** - Consolidações #11, #15

1. Revisar overflow rules
2. Remover especificidade desnecessária
3. Testes finais

---

## ✅ Checklist de Validação

### Antes da Consolidação

- [ ] Executar Playwright tests (mobile, tablet, desktop)
- [ ] Screenshots baseline de cada página
- [ ] Documentar autoridade CSS atual

### Durante

- [ ] Seguir princípios AGENTS.md: **Corrija raiz, não sintoma**
- [ ] Remover `!important` APÓS remover conflitos
- [ ] 1 consolidação = 1 commit
- [ ] Atualizar comments de autoridade

### Depois

- [ ] Teste full (todos breakpoints)
- [ ] Visual regression: antes/depois
- [ ] Medir redução de bundle
- [ ] Documentar nova estrutura

---

## 🎯 Princípios Confirmados (AGENTS.md)

✅ **Confirmado seguir:**

1. ✅ Corrija a causa raiz, não apenas o sintoma visual
2. ✅ Prefira consolidar regra existente a criar nova camada CSS
3. ✅ Mudanças pequenas e validadas são melhores que refatorações grandes
4. ✅ Toda regra global precisa ter responsabilidade clara
5. ✅ Não use `!important` como primeira solução

---

## 📄 Documentação Gerada

- **JSON Completo:** `AUDIT_CSS_CONSOLIDATION.json` (detalhes técnicos)
- **Este Markdown:** Sumário executivo
- **Arquivos Afetados:** 30-40 consolidações específicas com linhas

---

## 🚀 Próximos Passos

1. **Revisar este relatório** com o time
2. **Priorizar Fase 1** (fundação) se houver bugs de layout
3. **Agendur Sprint de Refatoração** se houver tempo dedicado
4. **Seguir ordem de implementação** - nunca pule fases
5. **Documentar cada decisão** para referência futura

---

**Status:** CRÍTICA - Ação recomendada dentro de 2 sprints
**Risco se não executar:** Crescimento continuado de dívida técnica
