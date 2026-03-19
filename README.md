# Doke — Base Visual Oficial

Este pacote foi criado para servir como nova fundação visual do Doke, sem depender do legado anterior.

## O que existe no ZIP

- `index.html`
  - Showcase principal com shell fixo, componentes e estados visuais.
- `templates/page-base.html`
  - Template limpo para começar novas páginas.
- `assets/css/tokens.css`
  - Variáveis oficiais de cor, espaçamento, raio, sombra e dimensões do shell.
- `assets/css/base.css`
  - Reset, tipografia, grids utilitários e base global.
- `assets/css/layout.css`
  - Sidebar fixa, header fixo, área de conteúdo e comportamento responsivo.
- `assets/css/components.css`
  - Botões, inputs, filtros, stats, community cards, order cards, skeleton e empty state.
- `assets/js/app.js`
  - Interações mínimas para menu mobile e chips de filtro.


## Como usar no projeto

1. Comece pelo `templates/page-base.html`.
2. Duplique esse arquivo para criar cada nova página crítica.
3. Mantenha sempre a mesma ordem dos CSS:
   1. `tokens.css`
   2. `base.css`
   3. `layout.css`
   4. `components.css`
4. Não copie CSS legado antigo para dentro desta base.
5. Se precisar criar novos componentes, use os tokens existentes primeiro.

## Decisões visuais

- **Shell fixo:** sidebar e topbar são estruturais e não devem recarregar visualmente.
- **Paleta:** azul como base de confiança e verde como apoio de ação/sucesso.
- **Hover:** leve, curto e sem exagero de escala.
- **Cards:** borda suave, fundo branco translúcido, sombra controlada.
- **Inputs e filtros:** linguagem visual única para busca, seleção e chips.
- **Estados:** skeleton e empty state já definidos para reduzir improviso.

## Componentes já prontos

- Botões primário, secundário, ghost, soft e danger
- Input padrão
- Searchbox
- Select padrão
- Chips/filtros
- Cards de comunidade
- Cards de pedido
- Stat cards
- Empty state
- Skeleton card
- Tabela base

## Regras para não contaminar a nova base

- Não criar outro shell paralelo.
- Não duplicar CSS global por página.
- Não misturar múltiplos arquivos com o mesmo papel.
- Não aplicar estilos inline estruturais além de ajustes pequenos de demo.
- Não reaproveitar JS legado de navegação/autenticação dentro desta camada visual.

## Próximo passo recomendado

Reconstruir primeiro as páginas mais críticas em cima desta base:

1. `pedidos.html`
2. `comunidade.html`
3. `perfil.html`
4. `mensagens.html`

## Auth e Supabase

- O projeto agora sai com auth local por padrao para facilitar demo e layout.
- Para ativar Supabase, preencha `assets/js/supabase-config.js` com `url` e `anonKey` e troque `enabled` para `true`.
- Existe um modelo pronto em `assets/js/supabase-config.example.js`.
- O runtime do Supabase ja esta incluido via CDN oficial nas paginas de auth e no shell principal.

