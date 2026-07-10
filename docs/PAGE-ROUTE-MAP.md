# Doke — Page Route Map

Mapa operacional das rotas principais cobertas pelos contratos de integração.

| Página | Fluxo canônico | Responsabilidade |
| --- | --- | --- |
| `index.html` | `doke-search-flow` | Descoberta inicial de serviços, profissionais e conteúdo |
| `resultados.html` | `doke-search-flow` | Resultados, filtros e descoberta contextual |
| `pedidos.html` | `doke-order-flow` | Acompanhamento e decisão sobre pedidos |
| `mensagens.html` | `doke-message-flow` | Conversas vinculadas aos fluxos do marketplace |
| `comunidade.html` | `doke-community-flow` | Descoberta e acesso às comunidades |
| `perfil.html` | `doke-profile-flow` | Perfil público e superfícies de reputação |
| `carteira.html` | `doke-wallet-flow` | Saldo, recebíveis e movimentações |
| `notificacoes.html` | `doke-settings-flow` | Central de eventos e prioridades do usuário |
| `configuracoes.html` | `doke-settings-flow` | Preferências, conta e segurança |

## Contratos compartilhados

As páginas acima devem carregar, diretamente ou por seus manifestos CSS, os contratos de shell móvel, UI, domínio, layout e fluxos. O JavaScript do shell móvel permanece uma dependência explícita no HTML.
