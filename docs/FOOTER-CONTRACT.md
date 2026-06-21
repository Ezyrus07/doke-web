# Doke footer contract

## Regra de produto

O rodape completo da Doke deve aparecer apenas em paginas de descoberta, entrada publica ou conteudo institucional. Paginas operacionais do app devem terminar no proprio conteudo ou em CTAs internos, sem rodape grande.

## Aplicacao atual

### Deve ter rodape completo

- `index.html` — pagina inicial/landing e principal ponto de descoberta.
- `resultados.html` — busca/descoberta de servicos.
- `detalhe-anuncio.html` — detalhe publico de servico.
- `perfil.html` — perfil profissional publico.
- `perfil-cliente.html` — perfil publico de cliente.

### Candidatas futuras

Nenhuma pagina adicional deve receber rodape completo sem nova revisao de papel de produto.

### Nao deve receber rodape completo

- `pedidos.html`
- `mensagens.html`
- `notificacoes.html`
- `comunidade.html`
- `comunidade-interna.html`
- `carteira.html`
- `configuracoes.html`
- `meu-perfil.html`
- `perfil-profissional.html`
- `avaliacao.html`
- `avaliacao-profissional.html`
- `pagamento-profissional.html`
- `tornar-profissional.html`
- `anunciar-servico.html`
- `novidades.html`
- `ajuda.html`

Motivo: essas telas fazem parte do fluxo interno do app, painel, configuracao, pagamento, suporte ou execucao de tarefa. Um rodape grande nesses contextos aumenta ruido e piora conclusao da acao.

## Regra visual

Nas paginas publicas com rodape, o rodape deve assumir o fim visual da pagina. Quando houver sobra vertical no fim da viewport, a area escura deve preencher essa sobra, evitando faixa azul/clara abaixo do footer.

`index.html` usa o contrato historico `.home-footer`. As paginas publicas internas usam o contrato compartilhado `.doke-public-footer` em `assets/css/components/footer/public-footer.css`.
