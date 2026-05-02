# Stage 6 — Ataque controlado ao `chat-workspace-contract.css`

## Objetivo

Reduzir dívida de `!important` no contrato ativo de mensagens/comunidade sem redesenhar a página e sem mexer no shell global.

## Escopo aplicado

Arquivo atacado:

- `assets/css/components/internal/chat-workspace-contract.css`

Arquivos de cache-busting atualizados:

- `assets/css/pages/mensagens.css`
- `assets/css/pages/comunidade-interna.css`
- `mensagens.html`
- `comunidade-interna.html`

## Resultado

- `!important` antes no contrato: **867**
- `!important` depois no contrato: **545**
- Removidos: **322**
- Redução aproximada: **37.1%**

## Critério de segurança

Foram removidos `!important` apenas de propriedades visuais em seletores escopados por `body.messages-page-shell`, mantendo os `!important` de geometria crítica, shell/altura, grid, display, padding, overflow e regras compartilhadas com `body.community-room-shell`.

Propriedades tratadas como seguras nesta etapa:

- cor e fundo;
- borda, radius e sombra;
- tipografia;
- stroke/fill;
- gap;
- outline/opacity.

## Validação estática

- Contagem de chaves preservada: **252 abre / 252 fecha**.
- `tools/audit-css-debt.py` executado após a alteração.
- O contrato caiu para **545** ocorrências de `!important`.

## O que não foi feito

Não removi `!important` de regras estruturais como `display`, `grid-template-columns`, `height`, `min-height`, `max-height`, `padding`, `margin`, `overflow`, `position`, `inset`, `width` e `transform`. Essas regras ainda seguram a composição atual do `mensagens.html` e precisam de uma segunda etapa com validação visual.

## Risco

Baixo a moderado. A limpeza foi escopada, mas como o projeto ainda tem muitos contratos com `!important`, algum estilo visual da lista lateral de mensagens pode sofrer influência se houver CSS carregado depois com maior especificidade. A geometria principal foi preservada.

## Próximo alvo recomendado

Segunda passada no mesmo contrato, mas agora separando em blocos menores:

1. lista lateral de mensagens;
2. header/thread/composer;
3. mobile de mensagens;
4. regras comunitárias compartilhadas.

Depois disso, atacar `doke-shell-contract.css` apenas se houver critério global, porque ele afeta várias páginas.
