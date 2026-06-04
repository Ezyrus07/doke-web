# Ciclo Global 40 — comunidade.html data controller

## Objetivo

Preparar `comunidade.html` para futura integração com dados reais sem alterar visual, CSS, shell ou comportamento aprovado.

## Alterações

- Adicionados hooks data-ready na raiz da página de comunidades.
- Adicionados hooks para listas de comunidades continuadas, descoberta e ranking.
- Adicionados `data-community-id` e `data-card-kind="community"` nos cards já existentes.
- Criado `assets/js/pages/comunidade-data-controller.js`.
- Criado `scripts/audit-comunidade-data-controller.js`.

## Contrato do controller

O controller apenas prepara estado e emite eventos. Ele não renderiza layout novo e não busca backend diretamente.

Eventos emitidos:

- `doke:communities-data-ready`
- `doke:communities-data-error`

## Restrições preservadas

- Nenhuma alteração visual intencional.
- Nenhum `!important` novo.
- Nenhum `style=""` novo.
- Nenhum arquivo `fix`, `hotfix`, `stage`, `final` ou `novo`.
- Nenhuma alteração em shell/sidebar/header/body para corrigir problema local.

## Validação

Comando:

```bash
npm run audit:comunidade-data-controller
```
