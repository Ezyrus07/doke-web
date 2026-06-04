# Ciclo Global 36 — Perfil data hooks mínimos

## Objetivo

Preparar `perfil.html` para futura integração com dados reais sem alterar visual, CSS ou comportamento atual.

## Escopo

Este ciclo adiciona apenas atributos semânticos/data-ready em regiões que futuramente serão renderizadas ou atualizadas por script:

- identidade do perfil;
- serviços/anúncios;
- Workers;
- publicações;
- avaliações;
- sobre;
- portfólio;
- conquistas;
- certificados;
- FAQ.

## Decisão técnica

O `perfil.html` continua sendo uma página crítica e não foi redesenhado. Os hooks foram adicionados para criar pontos de integração futuros sem transformar o visual atual em contrato definitivo.

## Regras respeitadas

- Sem alteração visual intencional.
- Sem `!important` novo.
- Sem `style=""` novo.
- Sem arquivo `fix`, `hotfix`, `stage`, `final` ou `novo`.
- Sem alteração em shell/sidebar/header/body.

## Auditoria

Comando criado:

```bash
npm run audit:perfil-data-hooks
```

Relatório gerado:

```txt
docs/validation/global-cycle-36-perfil-data-hooks-report.json
```
