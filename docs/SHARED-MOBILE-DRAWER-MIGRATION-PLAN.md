# Plano de migração — drawer mobile compartilhado

## Contexto

O arquivo `assets/js/ui/mobile-drawer.js` está fisicamente dentro de `pages/home`, mas já é carregado por várias páginas que não são a home. Isso cria ownership incorreto: um comportamento compartilhado de navegação mobile fica parecendo dependência específica do `index.html`.

Este documento não executa a migração. Ele registra o plano seguro para uma migração futura sem quebrar runtime visual.

## Caminho atual

```txt
assets/js/ui/mobile-drawer.js
```

## Caminho proposto

```txt
assets/js/ui/mobile-drawer.js
```

Justificativa: o drawer é comportamento de UI compartilhado. Ele não pertence a `pages/home`, nem deve ir para `components` CSS/HTML. `assets/js/ui/` já existe e é o lugar mais adequado para runtime visual compartilhado que não é controller nem service de domínio.

## Páginas consumidoras atuais

```txt
index.html
mensagens.html
comunidade-interna.html
comunidade.html
configuracoes.html
notificacoes.html
pedidos.html
```

## Regras para migração futura

1. Não alterar shell/sidebar/header/body/wrappers globais como parte da migração.
2. Não mudar comportamento visual do drawer no mesmo ciclo da migração de caminho.
3. Preservar ordem relativa dos scripts em cada página.
4. Atualizar todos os imports em um único ciclo controlado.
5. Rodar auditoria antes e depois.
6. Não remover o arquivo antigo sem validar que nenhuma página ainda o referencia.
7. Se necessário, manter alias temporário documentado por apenas um ciclo, sem usar nomes `fix`, `hotfix`, `stage`, `novo`, `ajuste` ou `redesign`.

## Critérios de aceite da migração futura

- `assets/js/ui/mobile-drawer.js` existe.
- Nenhum HTML referencia `assets/js/ui/mobile-drawer.js`.
- Todas as páginas consumidoras continuam carregando o drawer com `defer` ou `type="module"`.
- A auditoria `audit:shared-mobile-drawer-migration-plan` é substituída ou evoluída para validar migração executada.
- Nenhum CSS visual é alterado no ciclo de migração.

## Status

```txt
planned-not-executed
```
