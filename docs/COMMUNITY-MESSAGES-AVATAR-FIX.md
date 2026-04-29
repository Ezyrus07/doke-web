# Correção cirúrgica: comunidade, mensagens e avatares

## Escopo

Correção não cumulativa para os problemas observados em prints:

- ações duplicadas em `comunidade.html` no desktop;
- card “Continue de onde parou” vazando o botão no mobile/tablet;
- `mensagens.html` com sidebar/thread disputando largura em tablet;
- avatares de mensagens e profissional (`GP`) ainda aparecendo como thumbnail arredondada em alguns pontos.

## Arquivos alterados

- `assets/css/components/avatar.css`
- `assets/css/core/responsive-audit.css`
- `comunidade.html`
- `mensagens.html`
- `detalhe-anuncio.html`

## Decisões

1. Ações compactas da comunidade ficam ocultas no desktop e aparecem só no mobile.
2. O card de continuidade da comunidade passa a quebrar layout em telas pequenas, com botão ocupando linha própria quando necessário.
3. Mensagens recebe grid mais controlado em desktop/tablet para evitar que a thread seja cortada.
4. Avatar de pessoa/profissional é reforçado como círculo, inclusive em imagens (`img.message-item__avatar`) e fallbacks com iniciais (`GP`).

## Observação

Não houve alteração de JS nem redesenho visual amplo. A correção atua na cascata e nos breakpoints para estabilizar o comportamento já existente.
