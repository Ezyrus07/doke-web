# Padronização de Avatares

## Decisão visual

- Perfil de pessoa, usuário, profissional, comentário, mensagem e fallback com iniciais usam avatar circular.
- Imagem de conteúdo, capa, mídia, thumb de anúncio ou comunidade pode continuar com canto arredondado quando não representa uma pessoa.

## Arquivo criado

- `assets/css/components/avatar.css`

## HTMLs atualizados

O contrato foi carregado nos HTMLs principais e nas telas de auth com o caminho relativo correto.

## Classes cobertas

- `.avatar`
- `.home-side-meta__avatar`
- `.home-mobile-hero__avatar`
- `.home-mobile-drawer__avatar`
- `.orders-page-header__hero-avatar`
- `.settings-mobile-header__avatar`
- `.service-card__avatar`
- `.order-card__avatar`
- `.message-item__avatar`
- `.messages-thread__avatar`
- `.community-message__avatar`
- `.community-member__avatar`
- `.community-leaders__avatar`
- `.detail-summary__avatar`
- `.detail-host__avatar`
- `.detail-booking__avatar`
- `.profile-avatar`
- `.profile-edit-media__avatar`
- `.avatar-large`
- `.before-after-preview__avatar`
- `.before-after-preview__mini-avatar`
- `.worker-preview__mini-avatar`
- `.pro-card__avatar`

## Observação

O arquivo não usa `!important`. Ele é carregado depois dos contratos principais para vencer variações antigas por ordem de cascata, sem criar remendo local por página.
