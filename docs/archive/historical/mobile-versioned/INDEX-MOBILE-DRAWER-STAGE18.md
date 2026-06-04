# Stage 18 — Index Mobile Drawer

## Escopo
Melhoria do menu lateral mobile do `index.html`, sem alterar desktop.

## Arquivos alterados
- `index.html`
- `assets/css/components/navigation/home-mobile-drawer-stage18.css`

## Decisão técnica
O drawer antigo parecia um modal alto com muito espaço morto. A etapa 18 preserva as classes e o JS existentes, mas cria um contrato visual mais controlado para o menu mobile.

## O que mudou
- Painel lateral compacto com largura `min(84vw, 318px)`.
- Altura ancorada com margem segura superior/inferior.
- Overlay com blur e escurecimento mais claro.
- Header com perfil e botão de fechar.
- Conteúdo com scroll interno.
- Itens com alvo de toque confortável.
- Estado ativo mais equilibrado.
- Badge de notificações mais discreto.
- Bloqueio de scroll do body enquanto o drawer está aberto.

## Proteções
- CSS inteiro escopado em `@media (max-width: 1024px)`.
- Seletores presos em `body.home-index-shell`.
- Nenhuma alteração em JS ou desktop.
