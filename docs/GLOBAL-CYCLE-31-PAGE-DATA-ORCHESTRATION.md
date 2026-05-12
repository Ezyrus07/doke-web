# Ciclo Global 31 — Page Data Orchestration Map

## Objetivo

Criar um mapa técnico para preparar cada HTML do Doke para dados reais/scripts, sem alterar o visual atual e sem consolidar telas provisórias como contratos globais.

## Arquivo criado

- `assets/js/services/page-data-orchestrator.js`

Esse serviço centraliza o plano de dados por página e delega a busca ao `repository-boundary` quando uma página estiver pronta para consumir dados.

## O que ele não faz

- Não manipula DOM.
- Não usa `fetch`.
- Não acessa Supabase/Firebase diretamente.
- Não lê `localStorage`/`sessionStorage`.
- Não renderiza HTML.

## Responsabilidade

- `repository-boundary`: fronteira de dados.
- `page-data-orchestrator`: plano de página e chamada de dados por página.
- `renderers`: montagem dos cards/componentes.
- `pages/controllers`: orquestração real da tela.

## Páginas em evolução

Estas páginas devem receber estrutura data-ready sem congelar o visual provisório:

- `carteira.html`
- `detalhe-anuncio.html`
- `resultados.html`
- `finalizar-pedido.html`
- `pagamento.html`
- `configuracoes.html`
- `comunidade-interna.html`
- `avaliacao.html`
- `adicionar-cartao.html`

## Auditoria

Novo comando:

```bash
npm run audit:page-data-orchestration
```

Ele gera:

- `docs/PAGE-DATA-ORCHESTRATION-MAP.md`
- `docs/validation/global-cycle-31-page-data-orchestration-report.json`

## Critérios de aceite

- O orquestrador existe.
- O orquestrador não acessa DOM/backend diretamente.
- Todas as páginas principais têm plano de dados.
- O relatório por HTML é gerado.
- Nenhuma alteração visual foi feita.
