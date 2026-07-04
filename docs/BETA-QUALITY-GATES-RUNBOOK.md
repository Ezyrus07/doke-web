# Beta Quality Gates Runbook

## Objetivo

Bloquear release candidate enquanto não existir evidência mínima de Acessibilidade, Performance e SEO.

## Acessibilidade

Critérios mínimos:

- navegação por teclado sem armadilhas conhecidas;
- títulos de página compreensíveis;
- labels ou nomes acessíveis em campos e botões críticos;
- estados de erro e loading compreensíveis;
- foco visível em fluxos críticos.

## Performance

Critérios mínimos:

- mock continua padrão;
- providers API não ativam por padrão;
- sem assets visuais novos neste gate;
- budgets de Core Web Vitals documentados antes do beta.

## SEO

Critérios mínimos:

- rotas públicas com title/description coerentes;
- páginas de resultado, detalhe e perfis com intenção indexável documentada;
- páginas privadas/admin não devem ser tratadas como superfície SEO.

## Validação

```bash
npm run audit:beta-quality-gates
npm run validate:beta-quality-gates:dry-run
npm run validate:beta-quality-gates
npm run validate:beta-quality-gates:report
```
