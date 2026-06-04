# Ciclo Global 49 — Community Pattern Migration

## Objetivo

Migrar o CSS de modal/composição da comunidade que ainda estava preso em arquivos com nome `internal-modal-legacy.css` para patterns explícitos, sem redesenhar as páginas.

## Arquivos novos

- `assets/css/patterns/community-request-modal.css`
- `assets/css/patterns/community-room-layout.css`

## Manifests alterados

- `assets/css/pages/comunidade.css`
- `assets/css/pages/comunidade-interna.css`

## Decisão técnica

Os arquivos legacy originais foram mantidos no projeto por compatibilidade histórica, mas deixaram de ser importados pelos manifests principais. A remoção física deve acontecer em ciclo próprio, depois de validação visual.

## Responsabilidades após o ciclo

- `community-request-modal.css`: modal de solicitação/entrada de comunidade compartilhado.
- `community-room-layout.css`: layout da sala interna, canais, chat, mensagens, membros e composer.
- `comunidade.css` e `comunidade-interna.css`: continuam como manifests de página.

## Validação

Comando criado:

```bash
npm run audit:community-pattern-migration
```

Valida que:

- os patterns existem;
- `comunidade.css` não importa mais `internal-modal-legacy.css`;
- `comunidade-interna.css` não importa mais `internal-modal-legacy.css`;
- os manifests apontam para os patterns novos;
- os patterns possuem os seletores principais esperados.

## Observação

Este ciclo migra regras existentes. Não há intenção de mudança visual. Alguns `!important` ainda existem no pattern de room layout porque já existiam no arquivo anterior e protegem o shell da página interna. Eles devem ser reduzidos em ciclos futuros com baseline visual.
