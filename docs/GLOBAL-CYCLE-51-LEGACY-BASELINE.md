# Ciclo Global 51 — Baseline dos CSS legados restantes

Este relatório mapeia os CSS com nomes de legado/remendo/camada provisória e define o que precisa de baseline visual antes de qualquer remoção ou migração.

## Resumo

- CSS analisados: **356**
- HTMLs analisados: **21**
- CSS suspeitos: **25**
- `!important` dentro dos suspeitos: **9471**

## Classificação

- **bloquear até baseline visual:** 7
- **migrar antes de remover:** 1
- **arquivar/remover só após busca global:** 13
- **candidato a remoção após verificação de referência:** 4

## Arquivos bloqueados ou com migração necessária

| Arquivo | !important | Páginas | Domínio | Decisão | Baseline necessário |
|---|---:|---:|---|---|---|
| `assets/css/pages/perfil-reference-hero.css` | 4522 | 0 | misto/baixo-uso | bloquear até baseline visual | baseline visual da página consumidora antes/depois |
| `assets/css/pages/mensagens/desktop-redesign.css` | 1945 | 0 | misto/baixo-uso | bloquear até baseline visual | baseline visual da página consumidora antes/depois |
| `assets/css/pages/comunidade-interna/channel-message-parity.css` | 1016 | 0 | misto/baixo-uso | bloquear até baseline visual | baseline visual da página consumidora antes/depois |
| `assets/css/pages/home/index-final-refinement.css` | 962 | 0 | misto/baixo-uso | bloquear até baseline visual | baseline visual da página consumidora antes/depois |
| `assets/css/pages/perfil-mobile-reference-hotfix.css` | 245 | 0 | misto/baixo-uso | bloquear até baseline visual | baseline visual da página consumidora antes/depois |
| `assets/css/pages/comunidade-interna/compact-final-adjustments.css` | 71 | 0 | misto/baixo-uso | bloquear até baseline visual | baseline visual da página consumidora antes/depois |
| `assets/css/pages/comunidade-interna/final-room-layout.css` | 2 | 0 | misto/baixo-uso | bloquear até baseline visual | baseline visual da página consumidora antes/depois |
| `assets/css/pages/perfil-budget-modal/final-polish-success.css` | 22 | 1 | perfil | migrar antes de remover | validar que não há import direto/transitivo nem referência textual antes de remover |
| `assets/css/pages/pedidos/mobile-longterm-normalization.css` | 207 | 0 | misto/baixo-uso | arquivar/remover só após busca global | validar que não há import direto/transitivo nem referência textual antes de remover |
| `assets/css/pages/mensagens/community-parity.css` | 192 | 0 | misto/baixo-uso | arquivar/remover só após busca global | validar que não há import direto/transitivo nem referência textual antes de remover |
| `assets/css/pages/search-results/preview-parity.css` | 76 | 0 | misto/baixo-uso | arquivar/remover só após busca global | validar que não há import direto/transitivo nem referência textual antes de remover |
| `assets/css/pages/search-results/final-parity.css` | 57 | 0 | misto/baixo-uso | arquivar/remover só após busca global | validar que não há import direto/transitivo nem referência textual antes de remover |
| `assets/css/pages/search-results/workers-index-parity.css` | 55 | 0 | misto/baixo-uso | arquivar/remover só após busca global | validar que não há import direto/transitivo nem referência textual antes de remover |
| `assets/css/pages/search-results/final-normalization.css` | 34 | 0 | misto/baixo-uso | arquivar/remover só após busca global | validar que não há import direto/transitivo nem referência textual antes de remover |
| `assets/css/pages/mensagens/final-standardization.css` | 29 | 0 | misto/baixo-uso | arquivar/remover só após busca global | validar que não há import direto/transitivo nem referência textual antes de remover |
| `assets/css/pages/comunidade-interna/internal-modal-legacy.css` | 13 | 0 | misto/baixo-uso | arquivar/remover só após busca global | validar que não há import direto/transitivo nem referência textual antes de remover |
| `assets/css/pages/detalhe-anuncio/detail-legacy.css` | 11 | 0 | misto/baixo-uso | arquivar/remover só após busca global | validar que não há import direto/transitivo nem referência textual antes de remover |
| `assets/css/pages/search-results/index-parity.css` | 7 | 0 | misto/baixo-uso | arquivar/remover só após busca global | validar que não há import direto/transitivo nem referência textual antes de remover |
| `assets/css/pages/notificacoes/selection-parity.css` | 3 | 0 | misto/baixo-uso | arquivar/remover só após busca global | validar que não há import direto/transitivo nem referência textual antes de remover |
| `assets/css/pages/comunidade/image-cover-redesign.css` | 1 | 0 | misto/baixo-uso | arquivar/remover só após busca global | validar que não há import direto/transitivo nem referência textual antes de remover |
| `assets/css/pages/configuracoes/final-responsive-pass.css` | 1 | 0 | misto/baixo-uso | arquivar/remover só após busca global | validar que não há import direto/transitivo nem referência textual antes de remover |

## Candidatos a remoção futura

| Arquivo | !important | Páginas | Domínio | Decisão | Validação |
|---|---:|---:|---|---|---|
| `assets/css/components/surface-contract-final.css` | 0 | 0 | misto/baixo-uso | candidato a remoção após verificação de referência | baseline visual da página consumidora antes/depois |
| `assets/css/components/ui/doke-legacy-bridge.css` | 0 | 0 | misto/baixo-uso | candidato a remoção após verificação de referência | baseline visual da página consumidora antes/depois |
| `assets/css/pages/comunidade/internal-modal-legacy.css` | 0 | 0 | misto/baixo-uso | candidato a remoção após verificação de referência | baseline visual da página consumidora antes/depois |
| `assets/css/pages/notificacoes/pedidos-parity.css` | 0 | 0 | misto/baixo-uso | candidato a remoção após verificação de referência | baseline visual da página consumidora antes/depois |

## Próxima decisão técnica

1. Não remover os bloqueados sem baseline visual real.
2. Priorizar baseline de `index.html`, `resultados.html` e `perfil.html`, porque eles concentram marketplace e cards reutilizáveis.
3. Páginas em evolução devem receber estrutura e data-hooks, mas não visual definitivo.
4. A próxima limpeza segura deve ser feita somente em arquivos sem import ativo e sem `!important`.
