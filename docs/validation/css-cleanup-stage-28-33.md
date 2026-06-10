# CSS Cleanup Stage 28–33

## Objetivo

Reduzir mais uma camada ativa de CSS com `!important` em componentes compartilhados e patterns, sem criar novos arquivos de remendo.

## Arquivos saneados

- `assets/css/components/cards/worker-card.css`
- `assets/css/components/ui-surface/buttons-close.css`
- `assets/css/components/cards/recommendation-card.css`
- `assets/css/patterns/responsive-layout-guards.css`
- `assets/css/components/search/search-autocomplete.css`
- `assets/css/components/search/search-bar.css`

## Decisão arquitetural

- `worker-card.css` voltou a ser componente de card de vídeo/worker, sem controlar layout amplo de página.
- `recommendation-card.css` passou a cuidar apenas da anatomia do card de recomendação.
- `buttons-close.css` passou a cuidar apenas de cabeçalhos simples de modais/superfícies e botões de fechar.
- `responsive-layout-guards.css` virou guarda responsiva pequena para overflow/single-column, não contrato visual de página.
- `search-autocomplete.css` passou a cuidar apenas da anatomia do dropdown/autocomplete.
- `search-bar.css` passou a cuidar apenas da anatomia do search pill.

## Resultado mensurável

Comparado ao Stage 27:

- `worker-card.css`: 378 linhas / 64 `!important` -> 120 linhas / 0 `!important`
- `buttons-close.css`: 146 linhas / 59 `!important` -> 141 linhas / 0 `!important`
- `recommendation-card.css`: 192 linhas / 55 `!important` -> 163 linhas / 0 `!important`
- `responsive-layout-guards.css`: 147 linhas / 54 `!important` -> 119 linhas / 0 `!important`
- `search-autocomplete.css`: 242 linhas / 52 `!important` -> 196 linhas / 0 `!important`
- `search-bar.css`: 219 linhas / 50 `!important` -> 203 linhas / 0 `!important`

Totais no zip resultante:

- `!important` total em `assets/css`: 17.154
- `!important` ativo na cascata transitiva do `index.html`: 325
- CSS com chaves desbalanceadas: 0

## Riscos assumidos

Pode haver perda visual em:

- workers no index/resultados;
- modais e botões de fechar;
- cards de recomendação mobile;
- busca/autocomplete/dropdown;
- guards responsivos em mensagens, comunidade, detalhe, pagamento e carteira.

A perda visual é aceitável nesta fase se a página continuar abrindo, com conteúdo visível, sem tela branca e sem scroll travado.
