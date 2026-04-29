# Doke — Frontend Change Checklist

Use este checklist antes de qualquer alteração visual, estrutural ou responsiva.

## 1. Escopo

- [ ] A alteração tem objetivo claro?
- [ ] A mudança é visual, estrutural, funcional ou responsiva?
- [ ] Existe risco de afetar outras páginas?
- [ ] A página/componente já tem padrão existente?

## 2. Arquitetura CSS

- [ ] A regra pertence a `core/`, `components/`, `patterns/` ou `pages/`?
- [ ] Evitei criar CSS local para componente global?
- [ ] Evitei duplicar botão, card, modal, painel, header ou bottom nav?
- [ ] Não criei arquivo com nome temporário como `fix`, `stage`, `final`, `rescue` ou `polish`?

## 3. Tokens

- [ ] Usei tokens de `assets/css/core/tokens.css`?
- [ ] Evitei valores soltos repetidos para cor, sombra, radius e spacing?
- [ ] Preservei aliases legados quando necessário?

## 4. Componentes

### Botões

- [ ] Usei `assets/css/components/actions/action-button.css`?
- [ ] Estados `hover`, `focus-visible`, `disabled`, `aria-expanded` e `aria-pressed` estão consistentes?
- [ ] O botão funciona em mobile sem ficar espremido?

### Cards

- [ ] Usei `assets/css/components/cards/card-system.css`?
- [ ] O card respeita `min-width: 0`?
- [ ] Texto longo quebra corretamente?
- [ ] Botões internos não vazam no mobile?

### Header

- [ ] Usei os contratos compartilhados de header?
- [ ] O visual segue o padrão do `index.html`?
- [ ] O header não foi recriado em CSS de página?

### Bottom nav

- [ ] Usei `aria-current="page"` no item ativo?
- [ ] Existe exatamente um ativo na página?
- [ ] Safe-area e largura mobile estão preservadas?

### Painéis mobile

- [ ] Usei `assets/css/components/panels/mobile-panel.css`?
- [ ] O painel respeita viewport?
- [ ] O painel tem scroll interno quando necessário?
- [ ] Não há containers duplicados?

## 5. Acessibilidade

- [ ] Botões têm nome acessível?
- [ ] Ícones decorativos usam `aria-hidden="true"` quando necessário?
- [ ] Controles expansíveis usam `aria-expanded`?
- [ ] Controles de alternância usam `aria-pressed` quando fizer sentido?
- [ ] Estado ativo de navegação usa `aria-current="page"`?
- [ ] Foco visível está preservado?

## 6. Responsividade

Testar pelo menos:

- [ ] 390px mobile
- [ ] 768px tablet
- [ ] 1366px desktop

Quando possível, testar também:

- [ ] 320px
- [ ] 360px
- [ ] 414px
- [ ] 1024px

Verificar:

- [ ] Sem overflow horizontal.
- [ ] Sem texto cortado.
- [ ] Sem botão espremido.
- [ ] Sem card vazando.
- [ ] Sem modal fora da tela.
- [ ] Sem painel mobile passando do viewport.
- [ ] Bottom nav não cobre conteúdo crítico.
- [ ] Header alinhado no desktop e mobile.

## 7. JavaScript e comportamento

- [ ] Não removi `data-*` sem entender dependência JS.
- [ ] Não alterei ids usados por `aria-controls` sem atualizar o botão correspondente.
- [ ] Busca, filtros, seleção, agenda e menus continuam abrindo/fechando corretamente.
- [ ] Estados ativos não dependem apenas de classe visual quando existe atributo ARIA apropriado.

## 8. Revisão final

- [ ] Não adicionei `!important` sem justificativa forte.
- [ ] Não aumentei especificidade desnecessariamente.
- [ ] Não criei regra global ampla demais.
- [ ] Não alterei visual de páginas não relacionadas sem intenção.
- [ ] Documentei decisão relevante se a mudança mexeu em padrão global.

## 9. Critério de aprovação

Uma alteração só deve ser considerada pronta quando:

- mantém o visual atual ou melhora sem destoar;
- reduz duplicação;
- usa o componente certo;
- funciona em mobile e desktop;
- não cria nova dívida técnica.
