# Surface Contract Validation

## Static coverage

| fluxo | arquivo | superfície | contrato global carregado |
|---|---|---|---|
| solicitar-transferencia | carteira.html | `.wallet-modal__card` | ✅ |
| solicitar-orcamento | detalhe-anuncio.html | `.detail-modal__card` | ✅ |
| adicionar-endereco | index.html | `.home-address-modal__dialog` | ✅ |
| enderecos-salvos-localizacao | index.html | `.ui-modal__dialog` | ✅ |
| nova-cobranca | mensagens.html | `.charge-modal__surface` | ✅ |
| criar-comunidade | comunidade.html | `.community-action-modal__dialog--create` | ✅ |
| entrar-por-codigo | comunidade.html | `.community-action-modal__dialog--code` | ✅ |
| resumo-pedido | pedidos.html | `.orders-sidepanel` | ✅ |
| filtros-resultados | resultados.html | `.results-filters .results-panel` | ✅ |
| cards-midias | index.html | `.before-after-preview__dialog / .worker-preview__stage` | ✅ |

## Playwright

O script `tools/validate-surface-contract.js` foi incluído para medir `position`, `width`, `centerDelta`, `overflowX`, `outsideX`, `outsideY` e gerar screenshots por viewport. Nesta sandbox, a execução automática não pôde ser concluída porque o Chromium local bloqueou navegação/renderização (`ERR_BLOCKED_BY_ADMINISTRATOR`) e o download do browser do Playwright falhou por DNS. O script fica pronto para rodar localmente no projeto com Playwright instalado.

Comando sugerido:

```bash
npx -p playwright node tools/validate-surface-contract.js
```