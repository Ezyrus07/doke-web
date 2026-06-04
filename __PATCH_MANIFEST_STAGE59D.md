# Patch Manifest — Stage 59D

## Tipo

Microetapa de deleção controlada de unused candidates.

## Arquivos adicionados pelo patch

- `RODAR_STAGE59D_DELETE_COMUNIDADE_NOTIFICACOES.cmd`
- `DELETE_STAGE59D_COMUNIDADE_NOTIFICACOES.txt`
- `reports/stage59d-unused-assets-domain-pass.md`
- `__PATCH_MANIFEST_STAGE59D.md`

## Arquivos que o script remove

- `assets/css/pages/comunidade/image-cover-redesign.css`
- `assets/css/pages/comunidade/mobile-interaction-contract.css`
- `assets/css/pages/comunidade/mobile-rescue.css`
- `assets/css/pages/notificacoes/mobile-interaction-contract.css`

## Áreas preservadas

- shell
- navigation
- header
- sidebar
- router
- home
- mensagens
- detalhe-anuncio
- perfil
- JS core sensível

## Resultado esperado

- unused candidates: `92 -> 88` se a Stage 59C já tiver sido aplicada
- `audit:frontend`: 0 críticos
- `audit:duplicate-assets`: 0 grupos / 0 arquivos duplicados
- `audit:important-reduction-plan`: passed

## Observação

Este patch não entrega ZIP completo do projeto. Ele adiciona apenas manifesto, relatório, lista de deleção e script CMD idempotente.
