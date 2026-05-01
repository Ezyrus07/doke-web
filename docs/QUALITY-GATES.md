# Doke Quality Gates

Este documento define o mínimo para aceitar mudanças no projeto sem regredir arquitetura, mobile, desktop ou contratos visuais.

## Regra central

Nenhuma página deve criar um padrão local para componentes compartilhados. Botões, inputs, cards, modais, drawers, popovers, header, search, bottom nav, listas e estados de página devem usar contratos globais.

## Gates obrigatórios

### 1. Auditorias estáticas

Antes de entregar qualquer alteração:

```bash
npm run audit:all
npm run audit:quality-pipeline
```

Essas auditorias protegem:

- contratos frontend;
- classes canônicas de UI;
- cards de domínio;
- layout/listas/estados;
- fluxos de produto;
- rotas/páginas;
- mocks;
- backend/data contracts;
- auth/session/permissions;
- shell desktop/mobile;
- baseline visual;
- pipeline de qualidade.

### 2. Mudança visual

Qualquer mudança visual precisa de validação em mobile e desktop. Quando possível:

```bash
npm run visual:qa
```

Mudanças visuais globais só devem ser feitas se o impacto for intencional e documentado.

### 3. Fronteira mobile/desktop

Mobile e desktop não podem compartilhar regra estrutural sem media query explícita.

Não fazer:

```css
.doke-page-shell { padding-top: 32px; }
```

Fazer:

```css
@media (max-width: 760px) { ... }
@media (min-width: 761px) { ... }
```

### 4. CSS depreciado

Arquivos e padrões marcados como depreciados não devem ser reintroduzidos em páginas principais.

### 5. PRs

Todo Pull Request deve informar:

- tipo de mudança;
- screenshots quando houver UI;
- auditorias rodadas;
- riscos conhecidos.

## Ordem de validação recomendada

1. `npm run audit:all`
2. `npm run audit:quality-pipeline`
3. `npm run test:e2e`
4. `npm run test:visual`

## Política de contenção

Se uma alteração global quebrar desktop ou mobile, a prioridade é conter regressão antes de avançar com novas features.
