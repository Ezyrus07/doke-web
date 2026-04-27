# CSS Cleanup Report v9

## Alvo
Continuação da refatoração do `perfil.css`.

## Alterações
- Extraído o bloco de modais sociais/de edição do perfil para `assets/css/pages/perfil-edit-modal.css`.
- `perfil.css` deixou de carregar diretamente regras de:
  - modal de seguidores;
  - modal de edição do perfil;
  - cards de seguidores dentro do modal;
  - regras responsivas específicas desses modais.
- `perfil.html` agora carrega `perfil-edit-modal.css` logo após `perfil.css`, antes dos módulos de publicações/reviews/ajustes.

## Motivo técnico
O `perfil.css` ainda concentrava UI de página e UI de overlay no mesmo arquivo. Isso dificultava manutenção e aumentava o risco de mexer no layout principal e afetar modais.

## Resultado
- `perfil.css`: ~40.2 KB -> ~28.5 KB.
- Novo módulo `perfil-edit-modal.css`: ~11.8 KB.
- A cascata visual foi preservada pela ordem de carregamento no HTML.

## Risco
Baixo a médio. A mudança é majoritariamente movimentação de CSS, sem alteração intencional de aparência.
