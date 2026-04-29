# Bottom nav removal + avatar hardening

## Objetivo

Remover a estrutura do bottom nav mobile que reapareceu no projeto e reforçar o contrato global de avatares.

## Alterações

- Removido o import de `assets/css/components/navigation/bottom-nav.css` dos HTMLs principais.
- Removidos os blocos `<nav class="bottom-nav" data-bottom-nav ...>` dos HTMLs principais.
- Neutralizado `assets/css/components/navigation/bottom-nav.css` para impedir que imports antigos ressuscitem o componente.
- Removidas regras relacionadas a bottom nav de `assets/css/core/responsive-audit.css`.
- Reforçado `assets/css/components/avatar.css` para manter avatares de pessoa/usuário/profissional sempre circulares.
- Preservadas imagens de conteúdo/capa/anúncio fora do contrato de avatar.

## Regra de arquitetura

- Pessoa, usuário, profissional, conversa, comentário e fallback com iniciais: avatar circular.
- Conteúdo, capa, mídia, anúncio e thumbnail: componente de mídia, não avatar.
- Bottom nav removido: não recriar variação local em HTML, CSS de página ou CSS mobile.
