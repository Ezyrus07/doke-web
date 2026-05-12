# Communication data-readiness map — Doke

## Objetivo

Mapear `mensagens.html`, `comunidade.html` e `comunidade-interna.html` antes de qualquer integração com dados reais. Essas páginas são complexas, têm muitos estados de UI e não devem ser redesenhadas ou alteradas visualmente sem baseline.

Este ciclo é somente diagnóstico e preparação. Nenhum visual foi alterado.

## Resultado executivo

| Página | CSS | JS | Imports quebrados | Estado data-ready | Risco |
|---|---:|---:|---:|---|---|
| `mensagens.html` | 42 | 33 | 0 | Bom ponto de partida | Alto |
| `comunidade.html` | 39 | 32 | 0 | Parcialmente preparada | Alto |
| `comunidade-interna.html` | 47 | 31 | 0 | Precisa de hooks mínimos | Crítico |

## `mensagens.html`

### Recursos futuros

- conversas
- mensagens
- pedidos vinculados
- contatos
- anexos
- presença/online

### Hooks existentes úteis

- `data-messages-page`
- `data-messages-thread`
- `data-messages-orders-list`
- `data-messages-contacts-list`
- `data-message-id`
- `data-messages-empty`
- `data-messages-search-input`

### Diagnóstico

A página já tem uma base data-ready melhor que as outras duas, mas carrega muitos CSS/JS. Antes de conectar dados reais, precisa separar ownership de:

- lista de conversas
- thread ativa
- composer
- anexos/lightbox
- filtros/busca
- presença/online

### Próxima ação segura

Criar contrato de dados para `conversation`, `message`, `attachment` e `presence`, depois adicionar controller sem alterar visual.

## `comunidade.html`

### Recursos futuros

- comunidades
- destaques
- rankings
- filtros
- solicitações/entrada por código

### Hooks existentes úteis

- `data-page="comunidade"`
- `data-community-grid`
- `data-community-card`
- `data-community-empty`
- `data-community-search`
- `data-community-filter`

### Diagnóstico

A página já tem busca/filtro e cards identificáveis, mas ainda precisa de contrato mais claro para ranking, destaque e entrada por código. Como você pretende ajustar a página visualmente, o ideal é não consolidar visual agora.

### Próxima ação segura

Adicionar controller leve de discovery de comunidades e mocks separados, sem alterar layout.

## `comunidade-interna.html`

### Recursos futuros

- comunidade atual
- canais
- membros
- mensagens/posts
- anexos
- moderação

### Hooks existentes úteis

- `data-page="comunidade-interna"`
- `data-community-room`
- `data-community-internal`

### Lacunas atuais

Ainda faltam hooks claros para:

- listas de canais
- itens de canal
- mensagens/posts
- composer
- estados empty/loading/error

### Diagnóstico

É a página de maior risco do grupo. Ela mistura lógica de comunidade e conversa, então qualquer mudança sem contrato pode quebrar o layout ou duplicar padrões já existentes em `mensagens.html`.

### Próxima ação segura

Antes de redesign, adicionar hooks mínimos para canais, mensagens/posts, composer e empty states. Não consolidar CSS visual ainda.

## Ordem recomendada

1. `comunidade.html` controller leve de discovery.
2. `mensagens.html` contrato de conversation/message.
3. `comunidade-interna.html` hooks mínimos antes de controller.
4. Depois mapear CSS/JS duplicado entre `mensagens` e `comunidade-interna`.

## Critérios de aceite para os próximos ciclos

- Não alterar visual sem baseline.
- Não criar CSS temporário.
- Não usar `!important` novo.
- Não acoplar controller ao DOM rígido.
- Não acessar Supabase/Firebase diretamente em página.
- Dados devem passar por repository boundary/provider.
