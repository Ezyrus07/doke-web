# CSS Architecture Audit

## Objetivo aplicado
- separar camadas em `core`, `components` e `pages`
- reduzir acoplamento por múltiplos `<link>` por página
- consolidar imports sem alterar a ordem crítica de cascata
- retirar folhas órfãs/temporárias da árvore ativa

## Estrutura ativa após reorganização
- `assets/css/core/`
  - `index.css` -> manifesto base da aplicação
  - `tokens.css`, `base.css`, `layout.css`
- `assets/css/components/`
  - `index.css` -> manifesto de componentes reutilizáveis
  - `ui.css` -> antigo `core/components.css`
  - `cards/`, `shell/`, `tabs/`
- `assets/css/pages/`
  - um entrypoint por página ativa
  - páginas complexas importam suas dependências locais internamente

## Decisões arquiteturais
1. `core/components.css` foi descontinuado como origem e virou ponte de compatibilidade.
2. Componentes reutilizáveis foram centralizados em `assets/css/components/index.css`.
3. As páginas agora carregam `core/index.css` + um stylesheet de página, em vez de 5-9 folhas independentes no HTML.
4. CSS órfão ou experimental saiu de `assets/css` e foi para `archive/legacy-css`.

## Riscos controlados
- Mantida a cascata original via `@import` interno.
- Nenhuma regra ativa foi apagada sem antes verificar ausência de referência em HTML/imports.
- A ponte `core/components.css` reduz risco para referências legadas fora das páginas auditadas.

## Próximo passo recomendado
- fazer uma segunda passada de deduplicação semântica dentro de `pedidos.css`, `notificacoes.css`, `perfil.css` e `home-refresh.css`, quebrando blocos compartilhados em componentes menores.
