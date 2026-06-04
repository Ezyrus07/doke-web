# Ajuste global: header mobile, avatar, filtros e seleção

## Objetivo
Transformar o trabalho feito inicialmente em `pedidos.html` em contrato reutilizável para páginas com ações contextuais.

## Arquivos de componente
- `assets/css/components/avatar.css`
- `assets/css/components/navigation/header-mobile.css`
- `assets/css/components/internal/filter-select-standard.css`

## Páginas atualizadas nesta entrega
- `index.html`
- `pedidos.html`
- `notificacoes.html`
- `mensagens.html`
- `resultados.html`

## Decisões
- Pessoa/usuário/profissional/fallback com iniciais usa avatar circular.
- Header mobile não recebe fundo, blur ou sombra própria.
- Botões do header continuam com superfície individual, pois são ações clicáveis.
- Filtros e Selecionar usam a mesma superfície branca/card.
- O botão interno `Limpar filtros` do painel Selecionar fica oculto para evitar duplicidade funcional.
