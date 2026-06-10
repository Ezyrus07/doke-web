# Próximo plano de execução — estabilização sem remendo

## Ordem recomendada
1. **Index Stability real:** resolver divergência entre HTML estático, estado `data-state` e renderização dinâmica.
2. **Contrato de card/rail:** escolher componente canônico para anúncios/serviços da home e impedir que pages alterem anatomia.
3. **HTMLs mais fáceis:** `carteira.html`, `configuracoes.html`, `pagamento/pagamentos.html`, `finalizar-pedido.html`, `avaliacao.html`, `adicionar-cartao.html`. Corrigir visual + limpar CSS relacionado no mesmo ciclo.
4. **HTMLs complexos:** `perfil.html`, `mensagens.html`, `resultados.html`, `detalhe-anuncio.html`, depois da base estar estável.

## Critério de aceite do próximo patch
- `index.html` deve exibir `Destaques para você` igual no primeiro paint e após carregamento.
- Nenhum `!important` novo.
- Nenhum arquivo com nome de remendo.
- Nenhuma regra de página alterando anatomia interna de card compartilhado.
- Relatório indicando se o DOM final usa `.doke-ad-card`, `.service-card` ou ambos.
- Validação mínima: mobile 390x844 e tablet 820x1180; se Playwright não rodar, validar manualmente no Live Server.
