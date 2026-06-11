# CSS Cleanup Stage 50 — Internal foundation manifest

## Objetivo

Consolidar imports diretos das páginas internas sem apagar CSS físico e sem voltar a usar prioridade artificial.

## Mudança principal

Novo manifesto:

```txt
assets/css/pages/internal-foundation.css
```

Ele concentra a base compartilhada de páginas internas: app shell, header limpo, internal shell, headers/listas internas, actions, overlays, cards básicos, navegação mobile, avatar, UI system e responsive foundation/runtime.

## Páginas atualizadas

```txt
perfil.html
mensagens.html
pedidos.html
notificacoes.html
carteira.html
avaliacao.html
comunidade-interna.html
configuracoes.html
```

## Resultado direto por página

| Página | CSS direto após Stage 50 |
|---|---:|
| `perfil.html` | 11 |
| `mensagens.html` | 12 |
| `pedidos.html` | 9 |
| `notificacoes.html` | 3 |
| `carteira.html` | 4 |
| `avaliacao.html` | 4 |
| `comunidade-interna.html` | 6 |
| `configuracoes.html` | 3 |

## Validação estática

```txt
Links CSS quebrados em HTML: 0
Imports CSS quebrados: 0
CSS com chaves desbalanceadas: 0
!important em assets/css: 0
```

## Observação

Este stage não remove arquivos CSS físicos. Ele só reduz a dispersão de links diretos em HTML e cria uma base de manutenção mais previsível para páginas internas.

## Risco

Médio: a ordem de carregamento ficou mais padronizada. Pode haver mudanças visuais em páginas internas, mas a página específica ainda carrega seu CSS após `internal-foundation.css`, preservando autoridade local de composição.
