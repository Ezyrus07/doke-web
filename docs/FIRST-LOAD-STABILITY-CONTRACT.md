# First-load stability contract

Status: ativo a partir do Ciclo Global 146.

## Problema tratado

Quando uma página parece quebrada ao ser acessada pela navegação interna e fica correta após `F5`, a causa provável é instabilidade de lifecycle: troca parcial de rota, CSS/JS chegando em ordem diferente, ou shell sendo estabilizado após o primeiro paint.

## Decisão técnica

Enquanto os HTMLs/CSS desktop ainda não estiverem fechados página por página, a navegação interna por troca parcial de shell não deve ser o padrão.

O padrão seguro é carregamento nativo de documento completo. Isso garante que cada página receba seu próprio contrato de `<head>`, CSS, scripts e body classes antes de ser avaliada visualmente.

## Guardrail

- `instantShellNavigation` deve permanecer `false` por padrão.
- A navegação instantânea só pode ser religada por flag quando houver baseline visual/runtime suficiente.
- Correções de layout inicial não devem ser feitas página por página se o sintoma acontece em vários HTMLs.
- Não usar `style=""`, `!important` novo ou CSS temporário para mascarar instabilidade de carregamento.

## Validação

Comandos:

```bash
npm run audit:first-load-stability
```

Relatórios:

- `docs/validation/global-cycle-146-first-load-layout-stability-report.json`
- `docs/validation/global-cycle-147-native-navigation-stability-report.json`
