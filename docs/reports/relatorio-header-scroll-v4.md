# Doke — Header Buttons + Single Scroll Contract v4

## Objetivo
Padronizar os botões do header/toolbar em todos os HTMLs principais e remover a barra de rolagem duplicada no desktop.

## Arquivo principal alterado
- `assets/css/components/shell/doke-shell-contract.css`

## HTMLs com cache atualizado
- `index.html`
- `resultados.html`
- `pedidos.html`
- `comunidade.html`
- `perfil.html`
- `mensagens.html`
- `notificacoes.html`
- `carteira.html`
- `configuracoes.html`

## Contratos aplicados
- Botões quadrados do header: `48px × 48px`, raio `18px`, borda, sombra e ícone de `18px`.
- Botões pill do header: altura `48px`, raio `18px`, espaçamento interno e estados ativos padronizados.
- Perfil do header: altura `54px`, avatar circular `38px`, identidade e pontos no mesmo padrão.
- Agenda preservada como ação verde oficial.
- Scroll desktop: `html` passa a ser o dono do scroll vertical; `app-shell`, `page`, `page__content` e `page__content-inner` não criam rolagem vertical concorrente.
- Sidebar mantém rolagem funcional em telas baixas, mas sem exibir uma segunda scrollbar visual.

## Observação técnica
A solução foi feita no contrato global carregado por último. Não foram adicionadas margens locais nem correções específicas por HTML.
