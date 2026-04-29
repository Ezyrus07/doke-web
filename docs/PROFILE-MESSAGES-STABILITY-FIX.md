# Profile and Messages Stability Fix

## Objetivo
Corrigir inconsistências visuais após a padronização:

1. Avatares de perfil/mensagem herdando raio e padding quadrado de CSS local.
2. `perfil.html` renderizando o hero/avatar de maneira diferente entre primeira abertura e reload.
3. `mensagens.html` mantendo scrolls concorrentes e aparência menos estável no desktop.

## Decisão técnica
- Pessoas, profissionais, mensagens e fallbacks com iniciais usam avatar circular.
- Imagens de conteúdo/mídia/capa continuam podendo usar rounded square.
- `mensagens.html` em desktop passa a se comportar como app de chat: viewport travado e scroll interno apenas na lista/conversa.
- O perfil recebeu guardrails tardios para avatar/hero, evitando variação de offset e shape entre loads.

## Arquivos afetados
- `assets/css/components/avatar.css`
- `assets/css/core/responsive-audit.css`
- HTMLs principais: cache-bust dos CSS alterados.
