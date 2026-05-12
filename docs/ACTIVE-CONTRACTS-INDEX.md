# Active Contracts Index — Doke

Este documento é o índice principal dos contratos ativos do frontend do Doke. Ele existe para evitar que documentação histórica, relatórios de ciclo ou arquivos de correção virem fonte de verdade por acidente.

## Source of truth

Use este índice para decidir quais documentos guiam mudanças atuais no projeto. Documentos com nomes como `STAGE`, `FIX`, `HOTFIX`, `FINAL`, `PROMPT`, `REBUILD`, `REDESIGN`, `PARITY`, `NORMALIZATION` ou relatórios de ciclos antigos são histórico, a menos que estejam explicitamente listados aqui como contrato ativo.

## Governance

| Área | Documento ativo | Uso |
|---|---|---|
| Governança frontend | [FRONTEND-GOVERNANCE.md](FRONTEND-GOVERNANCE.md) | Regras de mudança, limites técnicos e critérios de responsabilidade. |
| Checklist de alteração | [FRONTEND-CHANGE-CHECKLIST.md](FRONTEND-CHANGE-CHECKLIST.md) | Checklist antes/depois de mexer em HTML, CSS ou JS. |
| Organização global | [GLOBAL-ORGANIZATION-PLAN.md](GLOBAL-ORGANIZATION-PLAN.md) | Divisão entre `core`, `components`, `patterns` e `pages`. |
| Arquivos ativos | [ACTIVE-FILES.md](ACTIVE-FILES.md) | Referência auxiliar para arquivos em uso. |

## Architecture and layout

| Área | Documento ativo | Uso |
|---|---|---|
| Layout global | [GLOBAL-LAYOUT-CONTRACT.md](GLOBAL-LAYOUT-CONTRACT.md) | Contrato de shell, largura, container, sidebar, topbar e responsividade base. |
| CSS responsivo | [CSS-RESPONSIVE-SYSTEM.md](CSS-RESPONSIVE-SYSTEM.md) | Regras de responsividade e limites de layout. |
| Rotas e páginas | [PAGE-ROUTE-MAP.md](PAGE-ROUTE-MAP.md) | Mapa de páginas, rotas e contexto de navegação. |
| Organização de arquivos | [FILES-ORGANIZATION.md](FILES-ORGANIZATION.md) | Critérios para localização de HTML, CSS, JS, docs e assets. |

## Components and design system

| Área | Documento ativo | Uso |
|---|---|---|
| Base de componentes | [GLOBAL-COMPONENTS-BASE-CONTRACT.md](GLOBAL-COMPONENTS-BASE-CONTRACT.md) | Contratos globais de botão, chip, badge, input, rating, seção e modal. |
| Sistema visual | [DESIGN-SYSTEM-GUIDE.md](DESIGN-SYSTEM-GUIDE.md) | Direção visual, consistência, tokens e linguagem de interface. |
| Componentes UI | [UI-COMPONENT-CONTRACTS.md](UI-COMPONENT-CONTRACTS.md) | Contratos reutilizáveis de UI. |
| Componentes frontend | [FRONTEND_COMPONENT_CONTRACTS.md](FRONTEND_COMPONENT_CONTRACTS.md) | Contratos complementares de componentes. |
| Surface/card base | [SURFACE-CONTRACT.md](SURFACE-CONTRACT.md) | Base para superfícies/cards quando aplicável. |

## Data-ready and backend preparation

| Área | Documento ativo | Uso |
|---|---|---|
| Data-ready | [DATA-READY-CONTRACTS.md](DATA-READY-CONTRACTS.md) | Hooks, listas, cards e renderização futura via dados. |
| Backend/data | [DATA-BACKEND-CONTRACTS.md](DATA-BACKEND-CONTRACTS.md) | Contratos de integração com backend. |
| API | [API-CONTRACTS.md](API-CONTRACTS.md) | Limites e contratos para APIs. |
| Mock boundary | [MOCK-DATA-BOUNDARIES.md](MOCK-DATA-BOUNDARIES.md) | Separação entre mocks, providers e UI. |
| List states | [LIST-STATE-CONTRACTS.md](LIST-STATE-CONTRACTS.md) | Estados `loading`, `empty`, `error`, `ready` para listas. |
| Page data orchestration | [PAGE-DATA-ORCHESTRATION-MAP.md](PAGE-DATA-ORCHESTRATION-MAP.md) | Mapa de orquestração de dados por página. |
| Modelo de dados draft | [DATA-MODEL-DRAFT.md](DATA-MODEL-DRAFT.md) | Referência provisória para entidades e estruturas de dados. |

## Page and route contracts

| Área | Documento ativo | Uso |
|---|---|---|
| Perfil data-readiness | [PERFIL-DATA-READINESS-MAP.md](PERFIL-DATA-READINESS-MAP.md) | Mapa do perfil para dados, owner/visitor/client e seções dinâmicas. |
| Comunicação data-readiness | [COMMUNICATION-DATA-READINESS-MAP.md](COMMUNICATION-DATA-READINESS-MAP.md) | Mapa de mensagens, comunidade e comunidade interna. |
| Inventário de assets por página | [GLOBAL-PAGE-ASSET-INVENTORY.md](GLOBAL-PAGE-ASSET-INVENTORY.md) | Mapa de CSS/JS carregados por página. |
| Decisões de docs em revisão | [DOCS-ACTIVE-REVIEW-DECISION-MAP.md](DOCS-ACTIVE-REVIEW-DECISION-MAP.md) | Mapa auxiliar de documentação ainda em revisão. |
| Páginas gerais | [PAGES-MAP.md](PAGES-MAP.md) | Mapa auxiliar de páginas. |

## Quality gates

| Área | Documento ativo | Uso |
|---|---|---|
| Entrega | [DELIVERY-CHECKLIST.md](DELIVERY-CHECKLIST.md) | Critérios para entregar mudanças. |
| Performance e SEO | [PERFORMANCE-SEO-CHECKLIST.md](PERFORMANCE-SEO-CHECKLIST.md) | Core Web Vitals, SEO, performance e renderização. |
| Segurança | [SECURITY-CHECKLIST.md](SECURITY-CHECKLIST.md) | Checklist de segurança e privacidade. |
| CSS legado | [DEPRECATED-CSS.md](DEPRECATED-CSS.md) | Referência sobre CSS depreciado quando existir. |

## Rules for future work

1. Antes de mexer, confirme qual contrato ativo governa a mudança.
2. Não use relatórios de ciclo como fonte de verdade se houver contrato ativo equivalente.
3. Não transforme visual provisório em contrato global, especialmente nas páginas que ainda serão redesenhadas.
4. Componentes reutilizáveis devem ficar em `assets/css/components` ou `assets/js/components`.
5. Composições maiores devem ficar em `patterns`.
6. CSS de página deve cuidar só do layout específico da página.
7. Todo bloco que futuramente receber dados deve usar estrutura data-ready previsível.
8. Nenhum `!important`, `style=""`, `fix`, `hotfix`, `stage`, `final` ou arquivo visual temporário deve ser introduzido como solução.

## Current audit

A validade deste índice é protegida por:

```bash
npm run audit:active-contracts-index
```
