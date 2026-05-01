# Stage 34 — Breakpoints e isolamento mobile/desktop

Esta etapa não muda design. Ela cria um contrato explícito de fronteira responsiva para reduzir regressões entre mobile e desktop.

## Contrato criado

- `assets/css/components/shell/responsive-boundary.css`

## Breakpoints oficiais

- Mobile: até `760px`
- Desktop: a partir de `761px`
- Tablet/intermediário: `761px` até `1024px`
- Desktop amplo: a partir de `1440px`

## Regras protegidas

- Desktop chrome não aparece no mobile.
- Mobile shell/bottom nav não aparecem no desktop.
- A grade desktop é neutralizada no mobile.
- O padding artificial do mobile não vaza para desktop.
- Breakpoints passam a ter um arquivo de contrato explícito.

## Próximo passo

Stage 35 deve corrigir a base desktop página por página, sem alterar o mobile.
