# CSS Cleanup Stage 36 — Mensagens

## Objetivo
Reduzir a cascata ativa de `mensagens.html`, removendo dependências antigas de shell/tablet/mobile e eliminando `!important` da cascata ativa da página.

## Estratégia
- Tirar `mensagens.html` de contratos globais antigos que já foram substituídos pela nova estrutura `layout/`.
- Manter a página com dependências específicas de mensagens, composer, overlays e chat.
- Remover prioridade artificial dos arquivos que ainda ficam ativos na rota de mensagens.

## Resultado
- `!important` ativo em `mensagens.html`: `7631 -> 0`.
- `!important` total em `assets/css`: `15548 -> 13647`.
- CSS com chaves desbalanceadas: `0`.

## Arquivos com prioridade removida na cascata ativa
- `assets/css/components/internal/chat-workspace-contract.css`
- `assets/css/components/overlays/financial-modal-system.css`
- `assets/css/pages/mensagens/tablet-shell-alignment.css`
- `assets/css/components/media-lightbox.css`
- `assets/css/pages/mensagens/tablet-portrait-thread-contract.css`
- `assets/css/pages/mensagens/mobile-thread-layout.css`
- `assets/css/pages/mensagens/community-layout-contract.css`
- `assets/css/pages/mensagens/mobile-header-drawer.css`
- `assets/css/patterns/chat-screen-fill.css`
- `assets/css/pages/mensagens/message-boot.css`
- `assets/css/components/overlays/mobile-overlay-system.css`
- `assets/css/pages/mensagens/base-layout.css`
- `assets/css/components/chat-composer.css`
- `assets/css/pages/mensagens/page-foundation-contract.css`

## Risco
Alto risco visual em `mensagens.html`, especialmente desktop/tablet/mobile, chat workspace, composer, overlays, modais e lista/conversa. A etapa prioriza previsibilidade estrutural acima de acabamento visual.
