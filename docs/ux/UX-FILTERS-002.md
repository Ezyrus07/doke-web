# UX-FILTERS-002 — Chips removíveis e contagem agrupada

## Status

- Frente: UX;
- Sublote: `UX-FILTERS-002`;
- Dependência imediata: `UX-FILTERS-001` / PR #70;
- Issue: #71;
- Base confirmada: `b2609b0f51b23bc8b2e55853ed86f27507b3809a`;
- Superfície piloto: `resultados.html`;
- Backend alterado: não;
- Dados remotos alterados: não;
- Staging ou produção acessados: não;
- Merge autorizado: não.

## Objetivo

Transformar a lista passiva de filtros aplicados em uma apresentação acionável, acessível e derivada exclusivamente do snapshot canônico `applied` criado pelo UX-FILTERS-001.

```text
applied snapshot
→ grupos semânticos
→ chips removíveis
→ contagem única
→ commit explícito
→ uma nova busca
```

## Causa raiz

O renderer legado de Resultados produz:

```html
<span class="results-active-chip">...</span>
```

Consequências:

- não existe remoção individual;
- a pessoa precisa reabrir todo o painel;
- categoria, localização, qualidade e disponibilidade não são distinguidas;
- o botão Filtros não informa quantos critérios estão aplicados;
- desktop e mobile não compartilham uma ação de remoção;
- o renderer assíncrono pode substituir qualquer melhoria aplicada antes da resposta.

## Autoridade

```text
Doke.searchFilterPresentation
version: 20260805-ux-filters-002-v1
contract: search-filter-presentation-v1
```

Responsabilidades:

- derivar apresentação somente de `snapshot.applied`;
- não ler o draft como estado aplicado;
- construir grupos e chips determinísticos;
- remover um chip através de `Doke.searchFilterStateInstallation.commit()`;
- sincronizar contagem em todos os botões `[data-results-filters-open]`;
- recuperar a apresentação quando o renderer legado reescrever o container;
- publicar somente metadata sanitizada.

## Grupos

Ordem estável:

```text
Categoria
Localização
Qualidade
Disponibilidade
```

### Categoria

Uma categoria corresponde a um chip. Remover uma categoria preserva as demais.

### Localização

```text
Estado
Cidade
Bairro
```

Dependências:

```text
remover Estado
→ remove Estado + Cidade + Bairro

remover Cidade
→ preserva Estado
→ remove Cidade + Bairro

remover Bairro
→ preserva Estado + Cidade
```

Isso impede combinações impossíveis como uma cidade aplicada sem o estado que fornece suas opções.

### Qualidade

A avaliação mínima é apresentada como, por exemplo:

```text
Nota mínima 4,8
```

### Disponibilidade

Inclui:

- Com garantia;
- Atendimento emergencial;
- Online ou remoto;
- Disponível hoje.

## Semântica da remoção

Uma remoção externa aos filtros segue:

```text
ler snapshot aplicado
→ detectar draft pendente
→ cancelar draft sem busca
→ derivar próximo snapshot
→ escrever controles do formulário
→ chamar commit uma vez
→ renderer executa uma busca
```

Invariante:

```text
um clique de remoção
→ exatamente um state.commit()
→ exatamente um evento marcado de change
→ exatamente uma busca
```

A apresentação não chama repository, service ou backend diretamente.

## Concorrência com o renderer legado

`search-results.js` ainda escreve chips passivos após renderizar uma resposta. O novo módulo observa somente o container `[data-results-active-chips]`.

```text
renderer legado substitui filhos
→ marker canônico desaparece
→ MutationObserver agenda render
→ chips canônicos são restaurados
```

Não há observer global do documento.

## Acessibilidade

Cada chip é um `<button type="button">` com:

```text
aria-label="Remover filtro <rótulo>"
```

Também são preservados:

- foco visível;
- acionamento nativo por Enter e Espaço;
- grupos nomeados;
- contagem anunciada pelo rótulo do botão Filtros;
- contraste em forced colors;
- ausência de animação obrigatória.

## Responsividade

Desktop e mobile consomem o mesmo snapshot e os mesmos botões.

Em telas compactas, os grupos formam uma região horizontal rolável, sem esconder overflow globalmente e sem bloquear zoom.

## Privacidade

Eventos publicados:

```text
doke:search-filter-presentation
doke:search-filter-chip-removed
```

Detalhes permitidos:

- chave técnica do filtro;
- grupo;
- contagem;
- revisão;
- versão;
- source.

Não são publicados:

- cidade;
- bairro;
- estado;
- categoria digitada;
- query;
- account ID;
- URL completa.

## Arquivos

```text
assets/js/pages/search-filter-presentation.js
assets/css/pages/search-filter-presentation.css
resultados.html
scripts/test-ux-filters-002-filter-presentation.js
.github/workflows/ux-filters-002-removable-chips.yml
docs/ux/UX-FILTERS-002.md
```

## Testes

Cobertura determinística:

- API, grupos e labels congelados;
- ordem de grupos;
- contagem total;
- ausência de chip para `searchType`;
- remoção unitária de categoria;
- cascata de Estado;
- cascata de Cidade;
- remoção isolada de Bairro;
- remoção de avaliação;
- remoção de boolean;
- um único `state.commit()`;
- cancelamento de draft antes da remoção;
- recuperação após overwrite legado;
- entrega estática de CSS e JS;
- ordem de scripts;
- foco visível, forced colors e reduced motion;
- ausência de `eval`, `new Function`, script injection e `!important`;
- regressões completas da stack UX.

## Rollback

1. remover a referência ao CSS em `resultados.html`;
2. remover a referência ao JavaScript em `resultados.html`;
3. remover módulo, stylesheet, teste, workflow e documento;
4. manter UX-FILTERS-001 intacto.

Nenhum dado, schema ou endpoint precisa ser revertido.

## Fora de escopo

- novos critérios de filtro;
- alteração de ranking;
- mudança no repository ou search service;
- analytics remoto;
- redesign da Home;
- pagamentos, carteira, pedidos, mensagens, KYC ou Trust & Safety.

## Próximo sublote

```text
UX-RESULTS-001
→ composição completa da página Resultados
→ estados, resumo, paginação e seções relacionadas
→ integração progressiva dos cards canônicos
```
